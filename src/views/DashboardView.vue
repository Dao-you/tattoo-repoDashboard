<template>
  <main class="dashboard">
    <header class="header">
      <div>
        <h1>Tattoo PR Dashboard</h1>
        <p>Open PR snapshots from <code>NTUT-NPC/tattoo</code> · refresh every 30s</p>
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
      <PrCard v-for="pr in prs" :key="pr.id" :pr="pr" />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import PrCard from '../components/PrCard.vue';
import {
  fetchPrCards,
  hasSavedGithubToken,
  saveGithubToken,
  validateGithubToken,
  type PullRequestCard,
} from '../services/githubApi.ts';

const prs = ref<PullRequestCard[]>([]);
const error = ref('');
const isUpdating = ref(false);
const lastUpdatedAt = ref<Date | null>(null);
const showTokenPanel = ref(false);
const hasTokenSaved = ref(false);
const tokenInput = ref('');
const tokenMessage = ref('目前未設定 token，將使用匿名請求。');
let timer: ReturnType<typeof setInterval> | null = null;

const lastUpdatedText = computed(() =>
  lastUpdatedAt.value ? `最後更新：${lastUpdatedAt.value.toLocaleString()}` : '尚未更新',
);

async function refresh() {
  isUpdating.value = true;
  try {
    prs.value = await fetchPrCards();
    lastUpdatedAt.value = new Date();
    error.value = '';
  } catch (e) {
    console.error(e);
    error.value = '資料更新失敗，先顯示上一版資料。請稍後再試。';
  } finally {
    isUpdating.value = false;
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

onMounted(async () => {
  hasTokenSaved.value = hasSavedGithubToken();
  tokenMessage.value = hasTokenSaved.value
    ? '偵測到已儲存 token（內容隱藏）。'
    : '目前未設定 token，將使用匿名請求。';

  await refresh();
  timer = setInterval(() => void refresh(), 30_000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.dashboard { max-width: 1200px; margin: 0 auto; padding: .75rem; }
.header { display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; margin-bottom:1rem; }
.header h1 { margin:0; color:#f8fafc; }
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
.token-controls button { background: #1d4ed8; color: #dbeafe; border: 1px solid #2563eb; border-radius: 8px; padding: .42rem .62rem; font-weight: 600; cursor: pointer; }
.token-controls button.secondary { background: #1e293b; color: #cbd5e1; border-color: #334155; }
.token-hint { margin: .45rem 0 0; font-size: .8rem; color: #cbd5e1; }
.error { border:1px solid #dc2626; color:#fecaca; background:#3f1119; border-radius:10px; padding:.6rem .8rem; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:.65rem; }

@media (max-width: 950px) and (orientation: landscape) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
  .header { flex-direction:column; }
  .meta { align-items:flex-start; }
  .token-panel { margin-left: 0; }
}
</style>
