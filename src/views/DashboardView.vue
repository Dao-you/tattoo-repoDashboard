<template>
  <main class="dashboard">
    <div class="header">
      <h1>PR Dashboard</h1>
      <button type="button" class="refresh-btn" @click="loadPrs">重新整理</button>
    </div>

    <p v-if="loading" class="state-text">載入 PR 資料中...</p>

    <div v-else-if="error" class="state-card error">
      <p>{{ error }}</p>
      <button type="button" class="retry-btn" @click="loadPrs">重試</button>
    </div>

    <p v-else-if="!cards.length" class="state-card">目前沒有 PR 資料。</p>

    <section v-else class="grid">
      <PrCard v-for="card in cards" :key="card.id" :pr="card" />
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import PrCard from '../components/PrCard.vue'
import { fetchPullRequests } from '../services/githubApi'

const loading = ref(false)
const error = ref('')
const cards = ref([])

async function loadPrs() {
  loading.value = true
  error.value = ''

  try {
    cards.value = await fetchPullRequests()
  } catch (err) {
    cards.value = []
    error.value = err instanceof Error ? err.message : '資料讀取失敗，請稍後再試。'
  } finally {
    loading.value = false
  }
}

onMounted(loadPrs)
</script>

<style scoped>
.dashboard {
  width: min(1200px, 100%);
  margin: 0 auto;
  padding: 1.5rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

h1 {
  margin: 0;
  font-size: 1.25rem;
}

.refresh-btn,
.retry-btn {
  border: none;
  border-radius: 0.6rem;
  background: #2563eb;
  color: #fff;
  padding: 0.45rem 0.8rem;
  cursor: pointer;
}

.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

.state-text,
.state-card {
  border-radius: 0.8rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  padding: 1rem;
  color: #334155;
}

.state-card.error {
  border-color: #fecaca;
  background-color: #fef2f2;
}

@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1440px) {
  .grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
