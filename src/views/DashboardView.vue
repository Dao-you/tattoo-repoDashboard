<template>
  <main class="dashboard">
    <header class="header">
      <div>
        <h1>Tattoo PR Dashboard</h1>
        <p>Open PR snapshots from <code>NTUT-NPC/tattoo</code> · refresh every 30s</p>
      </div>
      <div class="meta">
        <span :class="['chip', isUpdating ? 'updating' : 'ok']">{{ isUpdating ? '更新中' : '已同步' }}</span>
        <span class="time">{{ lastUpdatedText }}</span>
      </div>
    </header>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="grid">
      <PrCard v-for="pr in prs" :key="pr.id" :pr="pr" />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import PrCard from '../components/PrCard.vue';
import { fetchPrCards, type PullRequestCard } from '../services/githubApi.ts';

const prs = ref<PullRequestCard[]>([]);
const error = ref('');
const isUpdating = ref(false);
const lastUpdatedAt = ref<Date | null>(null);
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

onMounted(async () => {
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
.meta { display:flex; flex-direction:column; align-items:flex-end; gap:.35rem; }
.chip { font-weight:700; border-radius:999px; padding:.2rem .6rem; font-size:.8rem; }
.chip.ok { background:#052e16; color:#86efac; }
.chip.updating { background:#172554; color:#93c5fd; }
.time { color:#cbd5e1; font-size:.82rem; }
.error { border:1px solid #dc2626; color:#fecaca; background:#3f1119; border-radius:10px; padding:.6rem .8rem; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:.65rem; }

@media (max-width: 950px) and (orientation: landscape) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
  .header { flex-direction:column; }
  .meta { align-items:flex-start; }
}
</style>
