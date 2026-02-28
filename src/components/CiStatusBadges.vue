<template>
  <div class="ci-badges" aria-label="CI statuses">
    <a
      v-for="item in displayItems"
      :key="item.name"
      :href="item.url || '#'"
      class="ci-item"
      :class="statusClass(item)"
      :title="item.name"
      target="_blank"
      rel="noreferrer"
    >
      <span class="ci-icon" aria-hidden="true">
        <svg v-if="workflowType(item.name) === 'prepare'" viewBox="0 0 24 24" class="icon-svg" role="img">
          <path
            fill="currentColor"
            d="M12 .5a12 12 0 0 0-3.79 23.39c.6.1.82-.26.82-.58v-2.04c-3.34.72-4.04-1.42-4.04-1.42-.55-1.37-1.33-1.73-1.33-1.73-1.08-.73.08-.72.08-.72 1.2.09 1.82 1.2 1.82 1.2 1.06 1.82 2.8 1.29 3.48.99.1-.77.42-1.29.76-1.59-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.22-3.22-.12-.3-.53-1.54.12-3.2 0 0 1-.33 3.3 1.23a11.42 11.42 0 0 1 6 0c2.3-1.56 3.3-1.23 3.3-1.23.65 1.66.24 2.9.12 3.2.76.84 1.22 1.9 1.22 3.22 0 4.62-2.81 5.64-5.5 5.93.43.38.82 1.1.82 2.23v3.31c0 .32.22.69.83.58A12 12 0 0 0 12 .5Z"
          />
        </svg>

        <svg v-else-if="workflowType(item.name) === 'analyze'" viewBox="0 0 24 24" class="icon-svg" role="img">
          <path
            fill="currentColor"
            d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8V2Zm0 4a6 6 0 1 0 6 6h-2a4 4 0 1 1-4-4V6Zm0 4a2 2 0 1 0 2 2h2a4 4 0 1 1-4-4v2Zm8-8-4 4h2v2h2V6h2l-2-2Z"
          />
        </svg>

        <svg v-else-if="workflowType(item.name) === 'android'" viewBox="0 0 24 24" class="icon-svg" role="img">
          <path
            fill="currentColor"
            d="m16.45 5.1 1.27-2.2a.5.5 0 1 0-.87-.5l-1.3 2.26a8.95 8.95 0 0 0-7.1 0L7.15 2.4a.5.5 0 1 0-.87.5l1.27 2.2A7.02 7.02 0 0 0 5 10.5h14a7.02 7.02 0 0 0-2.55-5.4ZM8.5 8.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Zm7 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM5 11.5v6a1.5 1.5 0 0 0 3 0v-6H5Zm11 0v6a1.5 1.5 0 0 0 3 0v-6h-3Zm-9 0v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7H7Z"
          />
        </svg>

        <svg v-else-if="workflowType(item.name) === 'ios'" viewBox="0 0 24 24" class="icon-svg" role="img">
          <path
            fill="currentColor"
            d="M15.1 2c.06 1.24-.4 2.43-1.18 3.3-.88.97-2.24 1.72-3.45 1.62-.14-1.2.43-2.45 1.2-3.26.84-.9 2.3-1.62 3.43-1.66ZM20.27 17.29c-.5 1.13-.75 1.63-1.39 2.64-.9 1.42-2.17 3.19-3.75 3.2-1.41.01-1.77-.92-3.68-.9-1.9.01-2.3.92-3.7.9-1.58-.01-2.79-1.6-3.69-3.02-2.53-3.95-2.79-8.58-1.23-10.96 1.1-1.69 2.84-2.67 4.47-2.67 1.66 0 2.7.91 4.06.91 1.32 0 2.13-.91 4.05-.91 1.45 0 2.99.79 4.08 2.15-3.56 1.95-2.98 7.04.78 8.66Z"
          />
        </svg>

        <svg v-else viewBox="0 0 24 24" class="icon-svg" role="img">
          <circle cx="12" cy="12" r="7" fill="currentColor" />
        </svg>
      </span>
      <span class="ci-name">{{ item.name }}</span>
    </a>
    <span v-if="items.length === 0" class="empty">-</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type CiItem = { name: string; status: string; conclusion: string | null; url: string | null };

const props = defineProps<{ items: CiItem[] }>();

const displayItems = computed(() => [...props.items].reverse());

function workflowType(name: string): 'prepare' | 'analyze' | 'android' | 'ios' | 'unknown' {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('prepare')) return 'prepare';
  if (lowerName.includes('analyze')) return 'analyze';
  if (lowerName.includes('android')) return 'android';
  if (lowerName.includes('ios') || lowerName.includes('iso')) return 'ios';
  return 'unknown';
}

function statusClass(item: CiItem) {
  if (item.status === 'in_progress' || item.status === 'queued' || item.status === 'pending') return 'is-pending';
  if (item.conclusion === 'success' || item.status === 'success') return 'is-success';
  if (item.conclusion === 'failure' || item.status === 'failure' || item.status === 'error') return 'is-failure';
  if (item.conclusion === 'cancelled') return 'is-cancelled';
  return 'is-default';
}
</script>

<style scoped>
.ci-badges { display:flex; flex-wrap:wrap; align-items:center; gap: .3rem; }
.ci-item {
  display:inline-flex;
  align-items:center;
  gap:.3rem;
  flex:0 0 auto;
  max-width:min(11rem, 100%);
  height:1.45rem;
  border-radius:8px;
  text-decoration:none;
  background:#17203d;
  border:1px solid #30406f;
  overflow:visible;
  white-space:nowrap;
  padding:0 .45rem 0 0;
  transition:background-color .2s ease, border-color .2s ease, box-shadow .2s ease;
}

.ci-item:hover,
.ci-item:focus-visible {
  background:#1f2b50;
  border-color:#445b95;
  box-shadow:0 0 0 1px rgba(96, 165, 250, .2);
}

.ci-icon {
  width:1.45rem;
  height:1.45rem;
  flex:0 0 1.45rem;
  display:grid;
  place-items:center;
}

.icon-svg {
  width:.95rem;
  height:.95rem;
}

.ci-item.is-pending { color:#facc15; }
.ci-item.is-success { color:#22c55e; }
.ci-item.is-failure { color:#ef4444; }
.ci-item.is-cancelled { color:#cbd5e1; }
.ci-item.is-default { color:#60a5fa; }

.ci-name {
  display:inline-block;
  font-size:.72rem;
  max-width:8.3rem;
  overflow:hidden;
  text-overflow:ellipsis;
}
.empty { font-size:.78rem; color:#94a3b8; }
</style>
