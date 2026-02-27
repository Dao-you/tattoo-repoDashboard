<template>
  <div class="ci-badges" aria-label="CI statuses">
    <a
      v-for="item in items"
      :key="item.name"
      :href="item.url || '#'"
      class="ci-item"
      :title="item.name"
      target="_blank"
      rel="noreferrer"
    >
      {{ statusIcon(item) }}
    </a>
    <span v-if="items.length === 0" class="empty">-</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  items: Array<{ name: string; status: string; conclusion: string | null; url: string | null }>;
}>();

function statusIcon(item: { status: string; conclusion: string | null }) {
  if (item.status === 'in_progress' || item.status === 'queued' || item.status === 'pending') return '🟡';
  if (item.conclusion === 'success' || item.status === 'success') return '🟢';
  if (item.conclusion === 'failure' || item.status === 'failure' || item.status === 'error') return '🔴';
  if (item.conclusion === 'cancelled') return '⚪';
  return '🔵';
}
</script>

<style scoped>
.ci-badges { display:flex; align-items:center; gap: .3rem; }
.ci-item {
  display:grid;
  place-items:center;
  width:1.45rem;
  height:1.45rem;
  border-radius:999px;
  text-decoration:none;
  background:#17203d;
  border:1px solid #30406f;
  font-size:.8rem;
}
.empty { font-size:.78rem; color:#94a3b8; }
</style>
