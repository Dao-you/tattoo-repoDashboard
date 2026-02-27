<template>
  <main class="dashboard">
    <header class="header">
      <div>
        <h1>
          Tattoo PR Dashboard
          <span class="refresh-ring" role="status" aria-live="polite" aria-label="下次更新倒數">
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
        </h1>
        <p>Open PR snapshots from <code>NTUT-NPC/tattoo</code> · refresh every {{ refreshIntervalSec }}s</p>
      </div>
      <div class="meta">
        <button
          type="button"
          class="settings-btn"
          :aria-label="showTokenPanel ? '關閉 Token 設定' : '開啟 Token 設定'"
          @click="showTokenPanel = !showTokenPanel"
        >
          ⚙
        </button>
        <span class="token-state" :class="{ active: hasTokenSaved }">
          {{ hasTokenSaved ? 'Token 已啟用' : '匿名模式' }}
        </span>
        <span :class="['chip', isUpdating ? 'updating' : 'ok']">{{ isUpdating ? '更新中' : '已同步' }}</span>
        <span class="time">{{ lastUpdatedText }}</span>
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
      <div v-for="pr in prs" :key="pr.id" class="card-slot" :data-pr-id="pr.id">
        <PrCard :pr="pr" />
      </div>
    </section>

    <Teleport to="body">
      <section v-if="showcase" class="showcase-mask" aria-live="polite">
        <div class="showcase-confetti" aria-hidden="true">
          <span v-for="item in confettiStyles" :key="item.key" class="confetti" :style="item.style" />
        </div>

        <div ref="showcaseCardRef" class="showcase-card" :class="showcasePhase">
          <PrCard
            :pr="showcase.pr"
            cinematic
            :effect="showcase.type"
            :ci-summary="showcase.ciSummary ?? []"
          />
        </div>
      </section>
    </Teleport>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import PrCard from '../components/PrCard.vue';
import {
  fetchPrCards,
  fetchPullRequestMergeState,
  hasSavedGithubToken,
  saveGithubToken,
  validateGithubToken,
  type PullRequestCard,
} from '../services/githubApi.ts';

const REFRESH_INTERVAL_MS = 30_000;
const DEFAULT_REFRESH_INTERVAL_SEC = REFRESH_INTERVAL_MS / 1000;
const MIN_REFRESH_INTERVAL_SEC = 5;
const MAX_REFRESH_INTERVAL_SEC = 300;
const REFRESH_INTERVAL_STORAGE_KEY = 'tattoo-dashboard-refresh-interval-sec';
const MAX_SHOWCASE_QUEUE = 6;
const MAX_REFRESH_EVENTS = 5;
const CONFETTI_COUNT = 18;

const prs = ref<PullRequestCard[]>([]);
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

type ShowcaseEvent = {
  type: 'new_pr' | 'ci_complete' | 'merged';
  pr: PullRequestCard;
  ciSummary?: Array<{ name: string; result: 'success' | 'failure' }>;
  shouldReturnToCard: boolean;
};

const showcase = ref<ShowcaseEvent | null>(null);
const showcasePhase = ref<'enter' | 'idle'>('enter');
const showcaseCardRef = ref<HTMLElement | null>(null);
const showcaseQueue: ShowcaseEvent[] = [];
let showcasePlaying = false;

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

const confettiStyles = Array.from({ length: CONFETTI_COUNT }, (_, index) => {
  const left = (index / CONFETTI_COUNT) * 100;
  const delay = ((index % 6) * 0.1).toFixed(2);
  const duration = (1.3 + (index % 5) * 0.18).toFixed(2);

  return {
    key: index,
    style: {
      left: `${left}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
    },
  };
});

function isPendingStatus(item: PullRequestCard['ciStates'][number]): boolean {
  return item.status === 'in_progress' || item.status === 'queued' || item.status === 'pending';
}

function isSuccessStatus(item: PullRequestCard['ciStates'][number]): boolean {
  return item.conclusion === 'success' || item.status === 'success';
}

function detectShowcaseEvents(previousCards: PullRequestCard[], nextCards: PullRequestCard[]): ShowcaseEvent[] {
  const prevMap = new Map(previousCards.map((item) => [item.id, item]));
  const nextMap = new Map(nextCards.map((item) => [item.id, item]));

  const newPrEvents: ShowcaseEvent[] = nextCards
    .filter((item) => !prevMap.has(item.id))
    .map((item) => ({ type: 'new_pr', pr: item, shouldReturnToCard: true }));

  const ciCompleteEvents: ShowcaseEvent[] = nextCards
    .filter((item) => {
      const old = prevMap.get(item.id);
      if (!old) return false;
      const hadPending = old.ciStates.some(isPendingStatus);
      const hasPendingNow = item.ciStates.some(isPendingStatus);
      return hadPending && !hasPendingNow && item.ciStates.length > 0;
    })
    .map((item) => ({
      type: 'ci_complete' as const,
      pr: item,
      shouldReturnToCard: true,
      ciSummary: item.ciStates.map((state) => ({
        name: state.name,
        result: isSuccessStatus(state) ? 'success' : 'failure',
      })),
    }));

  const mergedCandidates = previousCards.filter((item) => !nextMap.has(item.id));
  const mergedEvents: ShowcaseEvent[] = mergedCandidates.map((item) => ({
    type: 'merged',
    pr: item,
    shouldReturnToCard: false,
  }));

  return [...newPrEvents, ...ciCompleteEvents, ...mergedEvents].slice(0, MAX_REFRESH_EVENTS);
}

async function filterVerifiedMergedEvents(events: ShowcaseEvent[]): Promise<ShowcaseEvent[]> {
  const mergedChecks = await Promise.all(
    events
      .filter((item) => item.type === 'merged')
      .map(async (item) => ({
        event: item,
        mergeState: await fetchPullRequestMergeState(item.pr.number),
      })),
  );

  const verifiedMerged = new Set(
    mergedChecks.filter((item) => item.mergeState.merged).map((item) => item.event.pr.id),
  );

  return events.filter((event) => event.type !== 'merged' || verifiedMerged.has(event.pr.id));
}

function enqueueShowcases(events: ShowcaseEvent[]) {
  if (events.length === 0) return;

  const remainingCapacity = Math.max(0, MAX_SHOWCASE_QUEUE - showcaseQueue.length);
  if (remainingCapacity === 0) return;

  showcaseQueue.push(...events.slice(0, remainingCapacity));
  if (!showcasePlaying) {
    void playShowcaseQueue();
  }
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function animateShowcaseExit(event: ShowcaseEvent): Promise<void> {
  const element = showcaseCardRef.value;
  if (!element) return;

  const fromRect = element.getBoundingClientRect();
  element.style.top = `${fromRect.top}px`;
  element.style.left = `${fromRect.left}px`;
  element.style.width = `${fromRect.width}px`;
  element.style.height = `${fromRect.height}px`;
  element.style.transform = 'none';
  element.style.transition = 'none';
  void element.offsetHeight;

  const target = event.shouldReturnToCard
    ? document.querySelector<HTMLElement>(`.card-slot[data-pr-id="${event.pr.id}"]`)
    : null;

  element.style.transition = 'all .75s cubic-bezier(0.22, 1, 0.36, 1)';

  if (target) {
    const targetRect = target.getBoundingClientRect();
    element.style.top = `${targetRect.top}px`;
    element.style.left = `${targetRect.left}px`;
    element.style.width = `${targetRect.width}px`;
    element.style.height = `${targetRect.height}px`;
    element.style.opacity = '0.2';
  } else {
    element.style.top = `${window.innerHeight + 120}px`;
    element.style.opacity = '0';
    element.style.transform = 'scale(0.86)';
  }

  await wait(800);
  element.removeAttribute('style');
}

async function playShowcaseQueue() {
  showcasePlaying = true;

  while (showcaseQueue.length > 0) {
    const event = showcaseQueue.shift();
    if (!event) continue;

    showcase.value = event;
    showcasePhase.value = 'enter';
    await nextTick();
    await wait(900);
    showcasePhase.value = 'idle';
    await wait(1600);
    await animateShowcaseExit(event);
    showcase.value = null;
    await nextTick();
    await wait(220);
  }

  showcasePlaying = false;
}

async function executeRefreshCycle() {
  isUpdating.value = true;

  try {
    const previousCards = [...prs.value];
    const nextCards = await fetchPrCards();
    const detectedEvents = detectShowcaseEvents(previousCards, nextCards);
    const finalEvents = await filterVerifiedMergedEvents(detectedEvents);

    prs.value = nextCards;
    enqueueShowcases(finalEvents);
    lastUpdatedAt.value = new Date();
    error.value = '';
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
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  if (countdownTimer) clearInterval(countdownTimer);
});
</script>

<style scoped>
.dashboard { max-width: 1200px; margin: 0 auto; padding: .75rem; }
.header { display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; margin-bottom:1rem; }
.header h1 { margin:0; color:#f8fafc; display: flex; align-items: baseline; gap: .55rem; flex-wrap: wrap; }
.refresh-ring {
  width: 2.2rem;
  height: 2.2rem;
  display: inline-grid;
  place-items: center;
  position: relative;
  color: #bfdbfe;
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
  font-size: .72rem;
  font-weight: 700;
  line-height: 1;
}
.header p { margin:.3rem 0 0; color:#94a3b8; }
code { color:#93c5fd; }
.meta { display:flex; flex-direction:column; align-items:flex-end; gap:.35rem; position: relative; }
.settings-btn { width: 30px; height: 30px; border-radius: 999px; border: 1px solid #334155; background: #0f172a; color: #cbd5e1; cursor: pointer; font-size: 1rem; line-height: 1; }
.token-state { font-size: .75rem; color: #94a3b8; }
.token-state.active { color: #86efac; }
.chip { font-weight:700; border-radius:999px; padding:.2rem .6rem; font-size:.8rem; }
.chip.ok { background:#052e16; color:#86efac; }
.chip.updating { background:#172554; color:#93c5fd; }
.time { color:#cbd5e1; font-size:.82rem; }
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
.card-slot { min-width: 0; }

.showcase-mask {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(3px);
  z-index: 70;
  pointer-events: none;
}

.showcase-card {
  position: fixed;
  top: 50%;
  left: 50%;
  width: min(95vw, 1120px);
  max-height: 92vh;
  transform: translate(-50%, -50%);
  transform-origin: center;
}

.showcase-card.enter {
  animation: card-drop-in .9s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.showcase-confetti {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.confetti {
  --size: 10px;
  position: absolute;
  bottom: -1rem;
  width: var(--size);
  height: calc(var(--size) * 1.8);
  border-radius: 2px;
  background: linear-gradient(180deg, #fbbf24, #f43f5e);
  animation-name: cannon;
  animation-timing-function: ease-out;
  animation-iteration-count: infinite;
}

.confetti:nth-child(2n) { background: linear-gradient(180deg, #60a5fa, #34d399); }
.confetti:nth-child(3n) { background: linear-gradient(180deg, #a78bfa, #38bdf8); }

@keyframes card-drop-in {
  from { transform: translate(-50%, -135%); }
  to { transform: translate(-50%, -50%); }
}

@keyframes cannon {
  0% { transform: translateY(0) rotate(0deg); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: translateY(-36vh) translateX(48px) rotate(380deg); opacity: 0; }
}

@media (max-width: 950px) and (orientation: landscape) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 760px) {
  .showcase-card { width: min(96vw, 1120px); }
}

@media (max-width: 640px) {
  .header { flex-direction:column; }
  .meta { align-items:flex-start; }
  .token-panel { margin-left: 0; }
}
</style>
