<template>
  <article class="pr-card">
    <header class="top">
      <a :href="pr.url" target="_blank" rel="noreferrer" class="pr-no">#{{ pr.number }}</a>
      <span class="build" :class="{ missing: !pr.buildNumber }">CI #{{ pr.buildNumber ?? 'N/A' }}</span>
    </header>

    <h2 class="title" :title="pr.title">{{ truncate(pr.title, 66) }}</h2>

    <div class="summary">
      <div class="line-item" v-if="pr.latestCommit">
        <span class="type-icon" aria-hidden="true">🧾</span>
        <img :src="pr.latestCommit.authorAvatarUrl" :alt="pr.latestCommit.authorLogin" class="avatar" />
        <span>{{ pr.latestCommit.authorLogin }}</span>
      </div>
      <div class="line-item" v-if="pr.latestComment">
        <span class="type-icon" aria-hidden="true">💬</span>
        <img :src="pr.latestComment.authorAvatarUrl" :alt="pr.latestComment.authorLogin" class="avatar" />
        <span>{{ pr.latestComment.authorLogin }}</span>
      </div>
      <div class="line-item issue-pill" v-if="pr.linkedIssue">Issue #{{ pr.linkedIssue }}</div>
      <div class="line-item dim">{{ formatDate(pr.updatedAt) }}</div>
    </div>

    <section class="bottom">
      <CiStatusBadges :items="pr.ciStates" />
    </section>

    <details class="detail-panel">
      <summary>展開細節</summary>
      <div class="detail-content">
        <a
          v-if="pr.latestCommit"
          :href="pr.latestCommit.url"
          target="_blank"
          rel="noreferrer"
          class="detail-link"
          :title="pr.latestCommit.message"
        >
          commit: {{ truncate(pr.latestCommit.message, 92) }}
        </a>
        <a
          v-if="pr.latestComment"
          :href="pr.latestComment.url"
          target="_blank"
          rel="noreferrer"
          class="detail-link"
          :title="pr.latestComment.body"
        >
          comment: {{ truncate(pr.latestComment.body.replace(/\n/g, ' '), 92) }}
        </a>
      </div>
    </details>
  </article>
</template>

<script setup lang="ts">
import type { PullRequestCard } from '../services/githubApi';
import { truncate } from '../utils/parsers.ts';
import CiStatusBadges from './CiStatusBadges.vue';

defineProps<{ pr: PullRequestCard }>();

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '未知時間' : date.toLocaleString();
}
</script>

<style scoped>
.pr-card { background:#0f172a; border:1px solid #253560; border-radius:12px; padding:.75rem; display:flex; flex-direction:column; gap:.5rem; box-shadow:0 8px 18px rgba(0,0,0,.24); }
.top { display:flex; justify-content:space-between; align-items:center; }
.pr-no { font-weight:800; color:#93c5fd; text-decoration:none; font-size:1rem; }
.build { font-weight:700; color:#fde68a; background:#422006; padding:.1rem .45rem; border-radius:999px; font-size:.74rem; }
.build.missing { color:#cbd5e1; background:#334155; }
.title { margin:0; font-size:.95rem; line-height:1.25; color:#f8fafc; }
.summary { display:flex; gap:.45rem; flex-wrap:wrap; }
.line-item { display:flex; align-items:center; gap:.3rem; font-size:.74rem; color:#cbd5e1; background:#18233f; border:1px solid #2b3f72; border-radius:999px; padding:.12rem .38rem; max-width:100%; }
.type-icon { font-size:.72rem; line-height:1; }
.line-item.dim { color:#94a3b8; }
.issue-pill { color:#a5b4fc; border-color:#4856a1; }
.avatar { width:16px; height:16px; border-radius:999px; border:1px solid #334155; }
.bottom { display:flex; justify-content:flex-end; align-items:center; gap:.4rem; margin-top:auto; }
.detail-panel { border-top:1px solid #233154; padding-top:.4rem; }
.detail-panel summary { cursor:pointer; font-size:.74rem; color:#93c5fd; }
.detail-content { display:flex; flex-direction:column; gap:.3rem; margin-top:.4rem; }
.detail-link { color:#e2e8f0; text-decoration:none; font-size:.78rem; }
</style>
