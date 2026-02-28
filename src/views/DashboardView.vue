<template>
  <main class="dashboard">
    <header class="header">
      <div class="header-main">
        <h1>Tattoo PR Dashboard</h1>
        <p><code>NTUT-NPC/tattoo</code> · {{ refreshIntervalSec }}s refresh</p>
      </div>
      <div class="meta" role="status" aria-live="polite">
        <span class="refresh-ring" aria-label="下次更新倒數">
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <circle class="refresh-ring-track" cx="20" cy="20" r="16" />
            <circle
              class="refresh-ring-progress"
              cx="20"
              cy="20"
              r="16"
              :style="{ strokeDashoffset: `${refreshRingDashOffset}px` }"
            />
          </svg>
          <span class="refresh-ring-number">{{ refreshCountdownSec }}</span>
        </span>
        <span :class="['chip', isUpdating ? 'updating' : 'ok']">{{ isUpdating ? '更新中' : '已同步' }}</span>
        <span class="token-state" :class="{ active: hasTokenSaved }">
          {{ hasTokenSaved ? 'Token ON' : '匿名' }}
        </span>
        <span class="time">{{ lastUpdatedText }}</span>
        <button
          type="button"
          class="settings-btn"
          :aria-label="showTokenPanel ? '關閉 Token 設定' : '開啟 Token 設定'"
          @click="showTokenPanel = !showTokenPanel"
        >
          ⚙
        </button>
      </div>
    </header>

    <section v-if="showTokenPanel" class="token-panel">
      <label for="refresh-interval" class="token-label">更新頻率（秒）</label>
      <div class="token-controls refresh-controls">
        <input
          id="refresh-interval"
          v-model.number="refreshIntervalInput"
          type="number"
          :min="MIN_REFRESH_INTERVAL_SEC"
          :max="MAX_REFRESH_INTERVAL_SEC"
          step="1"
        />
        <button type="button" @click="applyRefreshInterval">套用更新頻率</button>
      </div>
      <p class="token-hint">可設定 {{ MIN_REFRESH_INTERVAL_SEC }} - {{ MAX_REFRESH_INTERVAL_SEC }} 秒。</p>

      <label for="github-token" class="token-label">GitHub API Token（選填）</label>
      <div class="token-controls">
        <input
          id="github-token"
          v-model="tokenInput"
          type="password"
          placeholder="貼上新 token（不會自動回填已儲存值）"
          autocomplete="off"
          spellcheck="false"
        />
        <button type="button" @click="saveToken">儲存 Token</button>
        <button type="button" class="secondary" @click="clearToken">清除</button>
      </div>
      <p class="token-hint">{{ tokenMessage }}</p>
    </section>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="grid">
      <div
        v-for="pr in prs"
        :key="pr.id"
        class="card-slot"
        :data-pr-id="pr.id"
        @click="openPrDetails(pr, $event)"
      >
        <PrCard :pr="pr" />
      </div>
    </section>

    <Teleport to="body">
      <section
        v-if="selectedPr"
        class="detail-mask"
        aria-live="polite"
        @click.self="closePrDetails"
      >
        <div class="detail-card-wrap">
          <button type="button" class="close-btn" aria-label="關閉詳細資訊" @click="closePrDetails">✕</button>
          <PrCard :pr="selectedPr" cinematic :show-effect="false" />
        </div>
      </section>
    </Teleport>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import PrCard from '../components/PrCard.vue';
import { fetchPrCards, hasSavedGithubToken, saveGithubToken, validateGithubToken, type PullRequestCard } from '../services/githubApi.ts';

const REFRESH_INTERVAL_MS = 30_000;
const DEFAULT_REFRESH_INTERVAL_SEC = REFRESH_INTERVAL_MS / 1000;
const MIN_REFRESH_INTERVAL_SEC = 5;
const MAX_REFRESH_INTERVAL_SEC = 300;
const REFRESH_INTERVAL_STORAGE_KEY = 'tattoo-dashboard-refresh-interval-sec';

const prs = ref<PullRequestCard[]>([]);
const selectedPr = ref<PullRequestCard | null>(null);
const error = ref('');
const isUpdating = ref(false);
const lastUpdatedAt = ref<Date | null>(null);
const showTokenPanel = ref(false);
const hasTokenSaved = ref(false);
const tokenInput = ref('');
const tokenMessage = ref('目前未設定 token，將使用匿名請求。');
const refreshIntervalSec = ref(DEFAULT_REFRESH_INTERVAL_SEC);
const refreshIntervalInput = ref(DEFAULT_REFRESH_INTERVAL_SEC);
const refreshCountdownSec = ref(DEFAULT_REFRESH_INTERVAL_SEC);
let timer: ReturnType<typeof setInterval> | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let nextRefreshAt: number | null = null;

let refreshInFlight: Promise<void> | null = null;
let refreshQueued = false;

const lastUpdatedText = computed(() =>
  lastUpdatedAt.value ? `最後更新：${lastUpdatedAt.value.toLocaleString()}` : '尚未更新',
);
const refreshRingDashOffset = computed(() => {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const safeInterval = Math.max(1, refreshIntervalSec.value);
  const progress = Math.min(1, Math.max(0, refreshCountdownSec.value / safeInterval));

  return circumference * (1 - progress);
});

function readRefreshIntervalFromStorage() {
  const raw = window.localStorage.getItem(REFRESH_INTERVAL_STORAGE_KEY);
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return DEFAULT_REFRESH_INTERVAL_SEC;
  if (parsed < MIN_REFRESH_INTERVAL_SEC || parsed > MAX_REFRESH_INTERVAL_SEC) {
    return DEFAULT_REFRESH_INTERVAL_SEC;
  }

  return parsed;
}

function scheduleNextRefreshCountdown() {
  nextRefreshAt = Date.now() + refreshIntervalSec.value * 1000;
  refreshCountdownSec.value = refreshIntervalSec.value;
}

function updateRefreshCountdown() {
  if (!nextRefreshAt) {
    refreshCountdownSec.value = refreshIntervalSec.value;
    return;
  }

  const diffSec = Math.max(0, Math.ceil((nextRefreshAt - Date.now()) / 1000));
  refreshCountdownSec.value = diffSec;
}

function restartRefreshTimer() {
  if (timer) clearInterval(timer);

  scheduleNextRefreshCountdown();
  timer = setInterval(async () => {
    await refresh();
    scheduleNextRefreshCountdown();
  }, refreshIntervalSec.value * 1000);
}

async function executeRefreshCycle() {
  isUpdating.value = true;

  try {
    prs.value = await fetchPrCards();
    lastUpdatedAt.value = new Date();
    error.value = '';

    if (selectedPr.value) {
      const latest = prs.value.find((item) => item.id === selectedPr.value?.id) ?? null;
      selectedPr.value = latest;
    }
  } catch (e) {
    console.error(e);
    error.value = '資料更新失敗，先顯示上一版資料。請稍後再試。';
  } finally {
    isUpdating.value = false;
  }
}

async function refresh() {
  if (refreshInFlight) {
    refreshQueued = true;
    return refreshInFlight;
  }

  refreshInFlight = executeRefreshCycle();

  try {
    await refreshInFlight;
  } finally {
    refreshInFlight = null;
    if (refreshQueued) {
      refreshQueued = false;
      void refresh();
    }
  }
}

function openPrDetails(pr: PullRequestCard, event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (target?.closest('a, button')) return;
  selectedPr.value = pr;
}

function closePrDetails() {
  selectedPr.value = null;
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && selectedPr.value) {
    closePrDetails();
  }
}

async function saveToken() {
  const validation = validateGithubToken(tokenInput.value);
  if (!validation.valid) {
    tokenMessage.value = validation.message;
    return;
  }

  saveGithubToken(tokenInput.value);
  tokenInput.value = '';
  hasTokenSaved.value = hasSavedGithubToken();
  tokenMessage.value = '已儲存 token 至 localStorage，後續請求會使用此 token。';
  await refresh();
}

async function clearToken() {
  tokenInput.value = '';
  saveGithubToken('');
  hasTokenSaved.value = false;
  tokenMessage.value = '已清除 token，後續改為匿名請求。';
  await refresh();
}

function applyRefreshInterval() {
  if (!Number.isInteger(refreshIntervalInput.value)) {
    tokenMessage.value = '更新頻率需為整數秒。';
    return;
  }

  if (refreshIntervalInput.value < MIN_REFRESH_INTERVAL_SEC || refreshIntervalInput.value > MAX_REFRESH_INTERVAL_SEC) {
    tokenMessage.value = `更新頻率需介於 ${MIN_REFRESH_INTERVAL_SEC}-${MAX_REFRESH_INTERVAL_SEC} 秒。`;
    return;
  }

  refreshIntervalSec.value = refreshIntervalInput.value;
  window.localStorage.setItem(REFRESH_INTERVAL_STORAGE_KEY, String(refreshIntervalSec.value));
  restartRefreshTimer();
  tokenMessage.value = `已套用更新頻率：每 ${refreshIntervalSec.value} 秒更新一次。`;
}

onMounted(async () => {
  refreshIntervalSec.value = readRefreshIntervalFromStorage();
  refreshIntervalInput.value = refreshIntervalSec.value;

  hasTokenSaved.value = hasSavedGithubToken();
  tokenMessage.value = hasTokenSaved.value
    ? '偵測到已儲存 token（內容隱藏）。'
    : '目前未設定 token，將使用匿名請求。';

  await refresh();
  restartRefreshTimer();
  countdownTimer = setInterval(updateRefreshCountdown, 1000);
  updateRefreshCountdown();
  window.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  if (countdownTimer) clearInterval(countdownTimer);
  window.removeEventListener('keydown', handleEscape);
});
</script>

<style scoped>
.dashboard { max-width: 1200px; margin: 0 auto; padding: .75rem; }
.header-main { min-width: 0; }
.header { display:flex; justify-content:space-between; gap:1rem; align-items:center; margin-bottom:1rem; }
.header-main h1 { margin:0; color:#f8fafc; font-size: 1.45rem; }
.header-main p { margin:.2rem 0 0; color:#94a3b8; font-size: .9rem; }
.refresh-ring {
  width: 2rem;
  height: 2rem;
  display: inline-grid;
  place-items: center;
  position: relative;
  color: #bfdbfe;
  flex: 0 0 auto;
}

.refresh-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.refresh-ring-track,
.refresh-ring-progress {
  fill: none;
  stroke-width: 3;
}

.refresh-ring-track { stroke: #1e293b; }

.refresh-ring-progress {
  stroke: #60a5fa;
  stroke-linecap: round;
  stroke-dasharray: 100.53px;
  transition: stroke-dashoffset .25s linear;
}

.refresh-ring-number {
  position: absolute;
  font-size: .68rem;
  font-weight: 700;
  line-height: 1;
}
code { color:#93c5fd; }
.meta { display:flex; flex-wrap: wrap; justify-content: flex-end; align-items:center; gap:.4rem; }
.settings-btn { width: 30px; height: 30px; border-radius: 999px; border: 1px solid #334155; background: #0f172a; color: #cbd5e1; cursor: pointer; font-size: 1rem; line-height: 1; }
.token-state { font-size: .72rem; color: #94a3b8; background: #0f172a; border: 1px solid #334155; padding: .2rem .45rem; border-radius: 999px; }
.token-state.active { color: #86efac; }
.chip { font-weight:700; border-radius:999px; padding:.2rem .6rem; font-size:.8rem; }
.chip.ok { background:#052e16; color:#86efac; }
.chip.updating { background:#172554; color:#93c5fd; }
.time { color:#cbd5e1; font-size:.78rem; padding: .2rem .45rem; background: #0f172a; border: 1px solid #334155; border-radius: 999px; }
.token-panel { margin: -0.3rem 0 .9rem auto; width: min(560px, 100%); border: 1px solid #2b3f72; border-radius: 10px; background: #111a33; padding: .7rem; }
.token-label { display: block; margin-bottom: .45rem; color: #cbd5e1; font-size: .88rem; }
.token-controls { display: flex; gap: .5rem; flex-wrap: wrap; }
.token-controls input { flex: 1; min-width: 240px; background: #020617; border: 1px solid #334155; color: #e2e8f0; border-radius: 8px; padding: .45rem .55rem; }
.refresh-controls input { max-width: 190px; min-width: 0; }
.token-controls button { background: #1d4ed8; color: #dbeafe; border: 1px solid #2563eb; border-radius: 8px; padding: .42rem .62rem; font-weight: 600; cursor: pointer; }
.token-controls button.secondary { background: #1e293b; color: #cbd5e1; border-color: #334155; }
.token-hint { margin: .45rem 0 0; font-size: .8rem; color: #cbd5e1; }
.error { border:1px solid #dc2626; color:#fecaca; background:#3f1119; border-radius:10px; padding:.6rem .8rem; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:.65rem; }
.card-slot { min-width: 0; cursor: zoom-in; }

.detail-mask {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(3px);
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.detail-card-wrap {
  width: min(95vw, 1120px);
  max-height: 92vh;
  position: relative;
}

.close-btn {
  position: absolute;
  top: .6rem;
  right: .6rem;
  z-index: 2;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid #475569;
  background: rgba(15, 23, 42, .92);
  color: #e2e8f0;
  cursor: pointer;
}

@media (max-width: 950px) and (orientation: landscape) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 760px) {
  .detail-card-wrap { width: min(96vw, 1120px); }
}

@media (max-width: 640px) {
  .dashboard { padding: .55rem; }
  .header { flex-direction:column; align-items:stretch; gap: .45rem; margin-bottom: .7rem; }
  .header-main h1 { font-size: 1.08rem; line-height: 1.2; }
  .header-main p { display: none; }
  .meta { justify-content:flex-start; gap: .3rem; }
  .meta .time,
  .meta .token-state { display: none; }
  .refresh-ring { width: 1.7rem; height: 1.7rem; }
  .chip { font-size: .72rem; padding: .16rem .42rem; }
  .settings-btn { width: 28px; height: 28px; }
  .token-panel { margin-left: 0; }
}
</style>
