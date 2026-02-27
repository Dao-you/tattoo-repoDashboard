<template>
  <section class="dashboard-view">
    <header class="dashboard-header">
      <h1>Dashboard</h1>
      <div class="dashboard-meta">
        <span class="status" :class="{ updating: isUpdating }">
          {{ isUpdating ? '更新中' : '已更新' }}
        </span>
        <span class="last-updated">最後更新時間：{{ lastUpdatedLabel }}</span>
      </div>
    </header>

    <p v-if="pollingError" class="error-banner" role="status">
      {{ pollingError }}
    </p>

    <div class="card-grid">
      <article v-for="item in sortedItems" :key="item.id" class="card">
        <h2>{{ item.title }}</h2>
        <p>{{ item.description }}</p>
        <small>最後活動：{{ formatDate(item.updatedAt) }}</small>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

type DashboardItem = {
  id: string | number;
  title: string;
  description?: string;
  updatedAt: string | number | Date;
};

const items = ref<DashboardItem[]>([]);
const isUpdating = ref(false);
const pollingError = ref('');
const lastSuccessfulSyncAt = ref<Date | null>(null);
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const sortedItems = computed(() => {
  return [...items.value].sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });
});

const lastUpdatedLabel = computed(() => {
  if (!lastSuccessfulSyncAt.value) {
    return '尚未更新';
  }
  return formatDate(lastSuccessfulSyncAt.value);
});

function formatDate(value: string | number | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '時間未知';
  }
  return date.toLocaleString();
}

async function fetchDashboardItems(): Promise<DashboardItem[]> {
  const response = await fetch('/api/dashboard');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = (await response.json()) as DashboardItem[];
  return data;
}

async function refreshData(): Promise<void> {
  isUpdating.value = true;

  try {
    const latestItems = await fetchDashboardItems();

    items.value = [...latestItems].sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });

    lastSuccessfulSyncAt.value = new Date();
    pollingError.value = '';
  } catch (error) {
    console.error('Polling refresh failed:', error);
    pollingError.value = '資料更新失敗，已保留上次成功資料。請稍後再試。';
  } finally {
    isUpdating.value = false;
  }
}

onMounted(async () => {
  await refreshData();

  refreshTimer = setInterval(() => {
    void refreshData();
  }, 30_000);
});

onUnmounted(() => {
  if (!refreshTimer) {
    return;
  }

  clearInterval(refreshTimer);
  refreshTimer = null;
});
</script>

<style scoped>
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.dashboard-meta {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.status {
  font-weight: 600;
}

.status.updating {
  color: #2563eb;
}

.error-banner {
  margin: 0 0 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid #fca5a5;
  border-radius: 0.5rem;
  background: #fef2f2;
  color: #991b1b;
}

.card-grid {
  display: grid;
  gap: 1rem;
}

.card {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}
</style>
