<template>
  <div class="ci-badges" aria-label="CI statuses">
    <a
      v-for="item in displayItems"
      :key="item.name"
      :href="item.url || '#'"
      class="ci-item"
      :title="item.name"
      target="_blank"
      rel="noreferrer"
    >
      <span class="ci-icon">{{ workflowIcon(item.name, item) }}</span>
      <span class="ci-name">{{ item.name }}</span>
    </a>
    <span v-if="items.length === 0" class="empty">-</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  items: Array<{ name: string; status: string; conclusion: string | null; url: string | null }>;
}>();

const displayItems = computed(() => [...props.items].reverse());

function workflowIcon(name: string, item: { status: string; conclusion: string | null }) {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('prepare')) return '🐙';
  if (lowerName.includes('analyze')) return '🎯';
  if (lowerName.includes('android')) return '🤖';
  if (lowerName.includes('ios') || lowerName.includes('iso')) return '🍎';

  return statusIcon(item);
}

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
  display:inline-flex;
  align-items:center;
  width:1.45rem;
  height:1.45rem;
  border-radius:8px;
  text-decoration:none;
  background:#17203d;
  border:1px solid #30406f;
  font-size:.8rem;
  overflow:hidden;
  white-space:nowrap;
  transition:width .2s ease, padding .2s ease, background-color .2s ease;
}

.ci-item:hover,
.ci-item:focus-visible {
  width:min(12rem, 100%);
  padding:0 .45rem;
  background:#1f2b50;
}

.ci-icon {
  width:1.45rem;
  flex:0 0 1.45rem;
  text-align:center;
  font-size:1rem;
}

.ci-name {
  opacity:0;
  max-width:0;
  transition:opacity .18s ease, max-width .2s ease;
}

.ci-item:hover .ci-name,
.ci-item:focus-visible .ci-name {
  opacity:1;
  max-width:9rem;
}
.empty { font-size:.78rem; color:#94a3b8; }
</style>
