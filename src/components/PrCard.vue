<template>
  <article class="pr-card">
    <header class="header-row">
      <span class="pr-id">{{ formatPrId(pr.id) }}</span>
      <span class="build">{{ pr.buildNumber }}</span>
    </header>

    <h2 class="title">{{ truncateText(pr.title, 110) }}</h2>

    <section class="section">
      <p class="label">Latest commit</p>
      <AvatarTextRow
        :avatar="pr.latestCommit.avatar"
        :author-id="pr.latestCommit.authorId"
        :message="pr.latestCommit.message"
      />
    </section>

    <section class="section">
      <p class="label">Latest comment</p>
      <p class="content">{{ truncateText(pr.latestComment) }}</p>
    </section>

    <section class="meta-row">
      <span>Issue {{ formatIssue(pr.issueNumber) }}</span>
    </section>

    <section class="section">
      <p class="label">CI status</p>
      <StatusIcons :statuses="pr.ciStatuses" />
    </section>
  </article>
</template>

<script setup>
import AvatarTextRow from './AvatarTextRow.vue'
import StatusIcons from './StatusIcons.vue'
import { formatIssue, formatPrId, truncateText } from '../utils/formatters'

defineProps({
  pr: {
    type: Object,
    required: true,
  },
})
</script>

<style scoped>
.pr-card {
  background-color: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.9rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.06);
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pr-id {
  color: #0f172a;
  font-weight: 700;
}

.build {
  color: #334155;
  font-size: 0.8125rem;
  background: #f1f5f9;
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
}

.title {
  margin: 0;
  font-size: 1rem;
  line-height: 1.4;
  color: #0f172a;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.label {
  margin: 0;
  font-size: 0.75rem;
  color: #64748b;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.content,
.meta-row {
  margin: 0;
  color: #334155;
  font-size: 0.875rem;
}
</style>
