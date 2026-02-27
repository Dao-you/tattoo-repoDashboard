<template>
  <ul class="status-list">
    <li v-for="item in normalizedStatuses" :key="item.label" class="status-item" :title="`${item.label}: ${item.state}`">
      <span class="icon">{{ item.icon }}</span>
      <span class="label">{{ item.label }}</span>
    </li>
  </ul>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  statuses: {
    type: Object,
    required: true,
  },
})

const stateIcons = {
  success: '🟢',
  failed: '🔴',
  running: '🟡',
  pending: '⚪',
  blocked: '⚫',
}

const normalizedStatuses = computed(() => {
  const labels = ['lint', 'test', 'build', 'deploy']
  return labels.map((label) => {
    const state = props.statuses[label] || 'pending'
    return {
      label,
      state,
      icon: stateIcons[state] || '⚪',
    }
  })
})
</script>

<style scoped>
.status-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.75rem;
  color: #475569;
}

.icon {
  font-size: 1rem;
}

.label {
  text-transform: capitalize;
}
</style>
