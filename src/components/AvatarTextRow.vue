<template>
  <div class="avatar-text-row">
    <img class="avatar" :src="avatar" :alt="`${authorId} avatar`" />
    <div class="text-block">
      <p class="author">{{ authorId }}</p>
      <p class="message">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  avatar: {
    type: String,
    required: true,
  },
  authorId: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
})
</script>

<style scoped>
.avatar-text-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  object-fit: cover;
}

.text-block {
  min-width: 0;
}

.author {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}

.message {
  margin: 0.1rem 0 0;
  color: #475569;
  font-size: 0.8125rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
