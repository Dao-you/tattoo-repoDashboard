<template>
  <article class="pr-card" :class="{ cinematic: cinematic }">
    <header class="top">
      <div class="pr-head">
        <div class="pr-meta">
          <a :href="pr.url" target="_blank" rel="noreferrer" class="pr-no">#{{ pr.number }}</a>
        </div>
        <span v-if="statusLabel" class="review-status" :class="statusClass">{{ statusLabel }}</span>
      </div>
      <span class="build" :class="{ missing: !pr.buildNumber }">CI #{{ pr.buildNumber ?? 'N/A' }}</span>
    </header>

    <h2 class="title" :title="pr.title">
      <a :href="pr.url" target="_blank" rel="noreferrer" class="title-link">{{ pr.title }}</a>
    </h2>

    <div class="summary">
      <a
        :href="pr.author.url"
        target="_blank"
        rel="noreferrer"
        class="line-item"
        :title="`Owner: ${pr.author.login}`"
      >
        <span class="type-icon" aria-hidden="true">👤</span>
        <img :src="pr.author.avatarUrl" :alt="pr.author.login" class="avatar" />
        <span>{{ pr.author.login }}</span>
      </a>
      <div class="line-item" v-if="activityDisplayMode === 'separate' && pr.latestCommit">
        <span class="type-icon" aria-hidden="true">🧾</span>
        <img :src="pr.latestCommit.authorAvatarUrl" :alt="pr.latestCommit.authorLogin" class="avatar" />
        <span>{{ pr.latestCommit.authorLogin }}</span>
      </div>
      <div class="line-item" v-if="activityDisplayMode === 'separate' && pr.latestComment">
        <span class="type-icon" aria-hidden="true">💬</span>
        <img :src="pr.latestComment.authorAvatarUrl" :alt="pr.latestComment.authorLogin" class="avatar" />
        <span>{{ pr.latestComment.authorLogin }}</span>
      </div>
      <div class="line-item" v-if="activityDisplayMode === 'latest' && latestActivity">
        <span class="type-icon" aria-hidden="true">{{ latestActivity.type === 'commit' ? '🧾' : '💬' }}</span>
        <img :src="latestActivity.authorAvatarUrl" :alt="latestActivity.authorLogin" class="avatar" />
        <span>{{ latestActivity.authorLogin }}</span>
      </div>
      <div class="line-item issue-pill" v-if="pr.linkedIssue">Issue #{{ pr.linkedIssue }}</div>
      <div class="line-item dim">{{ formatDate(pr.updatedAt) }}</div>
    </div>

    <section class="bottom">
      <CiStatusBadges :items="pr.ciStates" />
    </section>

    <section v-if="cinematic" class="detail-panel">
      <h3 class="detail-heading">更多細節</h3>
      <div class="detail-content">
        <p class="detail-text">更新時間：{{ formatDate(pr.updatedAt) }}</p>
        <a
          v-if="activityDisplayMode === 'separate' && pr.latestCommit"
          :href="pr.latestCommit.url"
          target="_blank"
          rel="noreferrer"
          class="detail-link"
          :title="pr.latestCommit.message"
        >
          最新 commit：{{ pr.latestCommit.message }}
        </a>
        <a
          v-if="activityDisplayMode === 'separate' && pr.latestComment"
          :href="pr.latestComment.url"
          target="_blank"
          rel="noreferrer"
          class="detail-link"
          :title="pr.latestComment.body"
        >
          最新留言：{{ truncate(pr.latestComment.body.replace(/\n/g, ' '), 200) }}
        </a>
        <a
          v-if="activityDisplayMode === 'latest' && latestActivity"
          :href="latestActivity.url"
          target="_blank"
          rel="noreferrer"
          class="detail-link"
          :title="latestActivity.preview"
        >
          最新動態（{{ latestActivity.type === 'commit' ? '提交' : '留言' }}）：
          {{ truncate(latestActivity.preview.replace(/\n/g, ' '), 200) }}
        </a>
        <div v-if="pr.ciStates.length" class="detail-ci-list">
          <template v-for="item in pr.ciStates" :key="item.name">
            <a
              v-if="item.url"
              class="detail-link ci-link"
              :href="item.url"
              target="_blank"
              rel="noreferrer"
            >
              {{ item.name }} · {{ item.conclusion ?? item.status }}
            </a>
            <span v-else class="detail-text">{{ item.name }} · {{ item.conclusion ?? item.status }}</span>
          </template>
        </div>
      </div>
    </section>

    <div v-if="cinematic && showEffect" class="cinematic-overlay" aria-live="polite">

      <p v-if="effect === 'new_pr'" class="effect-title">🚀 New PR arrived</p>
      <p v-else-if="effect === 'ci_complete'" class="effect-title">CI 全部完成</p>
      <p v-else-if="effect === 'merged'" class="effect-title">🔀 Merged to mainline</p>

      <div v-if="effect === 'ci_complete'" class="ci-result-list">
        <span
          v-for="item in ciSummary"
          :key="`${item.name}-${item.result}`"
          class="ci-result"
          :class="item.result"
        >
          {{ item.result === 'success' ? '✅' : '❌' }}
        </span>
      </div>

      <div v-else-if="effect === 'merged'" class="merge-line" aria-hidden="true">
        <span>⎇</span>
        <span>⇢</span>
        <span>main</span>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="cinematic && showEffect && effect === 'ci_complete'"
        class="cinematic-confetti"
        aria-hidden="true"
      >
        <span v-for="item in confettiStyles" :key="item.key" class="confetti" :style="item.style" />
      </div>
    </Teleport>
  </article>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue';
import type { PullRequestCard } from '../services/githubApi';
import { truncate } from '../utils/parsers.ts';
import CiStatusBadges from './CiStatusBadges.vue';

type ShowcaseEffect = 'new_pr' | 'ci_complete' | 'merged';

const props = withDefaults(
  defineProps<{
    pr: PullRequestCard;
    activityDisplayMode?: 'separate' | 'latest';
    cinematic?: boolean;
    effect?: ShowcaseEffect;
    ciSummary?: Array<{ name: string; result: 'success' | 'failure' }>;
    showEffect?: boolean;
  }>(),
  {
    activityDisplayMode: 'separate',
    cinematic: false,
    effect: 'new_pr',
    ciSummary: () => [],
    showEffect: true,
  },
);

const { pr, activityDisplayMode } = toRefs(props);
const confettiStyles = Array.from({ length: 18 }, (_, index) => ({
  key: index,
  style: {
    left: `${(index / 18) * 100}%`,
    animationDelay: `${((index % 6) * 0.1).toFixed(2)}s`,
    animationDuration: `${(1.2 + (index % 5) * 0.2).toFixed(2)}s`,
  },
}));

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '未知時間' : date.toLocaleString();
}

function toTimestamp(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

const latestActivity = computed(() => {
  const commit = pr.value.latestCommit;
  const comment = pr.value.latestComment;

  if (!commit && !comment) return null;
  if (!commit && comment) {
    return {
      type: 'comment' as const,
      authorLogin: comment.authorLogin,
      authorAvatarUrl: comment.authorAvatarUrl,
      url: comment.url,
      preview: comment.body,
    };
  }
  if (commit && !comment) {
    return {
      type: 'commit' as const,
      authorLogin: commit.authorLogin,
      authorAvatarUrl: commit.authorAvatarUrl,
      url: commit.url,
      preview: commit.message,
    };
  }

  const commitTs = toTimestamp(commit.authoredAt);
  const commentTs = toTimestamp(comment.updatedAt);

  if (commentTs >= commitTs) {
    return {
      type: 'comment' as const,
      authorLogin: comment.authorLogin,
      authorAvatarUrl: comment.authorAvatarUrl,
      url: comment.url,
      preview: comment.body,
    };
  }

  return {
    type: 'commit' as const,
    authorLogin: commit.authorLogin,
    authorAvatarUrl: commit.authorAvatarUrl,
    url: commit.url,
    preview: commit.message,
  };
});

const statusLabelMap = {
  draft: 'draft',
  'pending review': 'pending review',
  'ci failed': 'ci failed',
  approved: 'approved',
} as const;

const statusClassMap = {
  draft: 'is-draft',
  'pending review': 'is-pending-review',
  'ci failed': 'is-ci-failed',
  approved: 'is-approved',
} as const;

const statusLabel = computed(() => {
  const status = pr.value.reviewStatus;
  if (!status) return '';
  if (status === 'approved') {
    return `${Math.max(1, pr.value.approvedCount)} ${statusLabelMap.approved}`;
  }
  return statusLabelMap[status] ?? '';
});

const statusClass = computed(() => {
  const status = pr.value.reviewStatus;
  if (!status) return '';
  return statusClassMap[status] ?? '';
});
</script>

<style scoped>
.pr-card {
  background:#0f172a;
  border:1px solid #253560;
  border-radius:12px;
  padding:.75rem;
  display:flex;
  flex-direction:column;
  gap:.5rem;
  min-height: 236px;
  min-width: 240px;
  box-shadow:0 8px 18px rgba(0,0,0,.24);
}
.top { display:flex; justify-content:space-between; align-items:center; }
.pr-head { display: flex; align-items: center; gap: .45rem; }
.pr-meta { display:flex; flex-direction:column; gap:.2rem; }
.pr-no { font-weight:800; color:#93c5fd; text-decoration:none; font-size:1rem; }
.review-status {
  font-size: .74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .01em;
  border-radius: 999px;
  padding: .1rem .45rem;
  border: 1px solid transparent;
  line-height: 1.2;
  display: inline-flex;
  align-items: center;
}
.review-status.is-draft { color: #d1d5db; background: #374151; border-color: #4b5563; }
.review-status.is-pending-review { color: #fde68a; background: #422006; border-color: #854d0e; }
.review-status.is-ci-failed { color: #fecaca; background: #450a0a; border-color: #7f1d1d; }
.review-status.is-approved { color: #bbf7d0; background: #052e16; border-color: #166534; }
.build { font-weight:700; color:#fde68a; background:#422006; padding:.1rem .45rem; border-radius:999px; font-size:.74rem; }
.build.missing { color:#cbd5e1; background:#334155; }
.title {
  margin:0;
  font-size:.95rem;
  line-height:1.25;
  color:#f8fafc;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.title-link { color: inherit; text-decoration: none; }
.title-link:hover { text-decoration: underline; }
.summary { display:flex; gap:.45rem; flex-wrap:wrap; }
.line-item { display:flex; align-items:center; gap:.3rem; font-size:.74rem; color:#cbd5e1; background:#18233f; border:1px solid #2b3f72; border-radius:999px; padding:.12rem .38rem; max-width:100%; }
.summary a.line-item { text-decoration:none; }
.type-icon { font-size:.72rem; line-height:1; }
.line-item.dim { color:#94a3b8; }
.issue-pill { color:#a5b4fc; border-color:#4856a1; }
.avatar { width:16px; height:16px; border-radius:999px; border:1px solid #334155; }
.bottom { display:flex; justify-content:flex-end; align-items:center; gap:.4rem; margin-top:auto; }
.detail-panel { border-top:1px solid #233154; padding-top:.4rem; }
.detail-heading { margin: 0; font-size: .82rem; color: #93c5fd; }
.detail-content { display:flex; flex-direction:column; gap:.3rem; margin-top:.4rem; }
.detail-link { color:#e2e8f0; text-decoration:none; font-size:.78rem; }
.detail-text { margin: 0; font-size: .8rem; color: #cbd5e1; }
.detail-ci-list { display: flex; flex-direction: column; gap: .3rem; }
.ci-link { color: #bfdbfe; }

.pr-card.cinematic {
  height: min(80vh, 680px);
  max-height: min(80vh, 680px);
  justify-content: flex-start;
  border-color: #60a5fa;
  box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.5), 0 20px 45px rgba(15, 23, 42, 0.7);
  container-type: inline-size;
  font-size: clamp(1rem, 0.8rem + 0.7vw, 1.45rem);
  padding: clamp(1rem, 1.2vw, 1.6rem);
  gap: clamp(.75rem, 1.1vw, 1.2rem);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.pr-card.cinematic .top,
.pr-card.cinematic .title,
.pr-card.cinematic .summary,
.pr-card.cinematic .bottom,
.pr-card.cinematic .detail-panel,
.pr-card.cinematic .cinematic-overlay {
  flex-shrink: 0;
}

.pr-card.cinematic .pr-no { font-size: clamp(1.2rem, 1rem + 1.4vw, 2rem); }
.pr-card.cinematic .build { font-size: clamp(.92rem, .72rem + .7vw, 1.25rem); padding: .22em .7em; }
.pr-card.cinematic .review-status { font-size: clamp(.92rem, .72rem + .7vw, 1.25rem); padding: .22em .7em; }
.pr-card.cinematic .title { font-size: clamp(1.25rem, .95rem + 1.7vw, 2.35rem); line-height: 1.2; }
.pr-card.cinematic .line-item { font-size: clamp(.9rem, .72rem + .6vw, 1.2rem); padding: .2em .72em; }
.pr-card.cinematic .type-icon { font-size: 1em; }
.pr-card.cinematic .avatar { width: clamp(20px, 1.4em, 28px); height: clamp(20px, 1.4em, 28px); }
.pr-card.cinematic .detail-heading { font-size: clamp(.92rem, .74rem + .5vw, 1.15rem); }
.pr-card.cinematic .detail-link { font-size: clamp(.92rem, .74rem + .5vw, 1.14rem); }
.pr-card.cinematic .detail-text { font-size: clamp(.9rem, .72rem + .5vw, 1.14rem); }
.pr-card.cinematic .detail-content {
  max-height: clamp(120px, 22vh, 280px);
  overflow-y: auto;
  padding-right: .3rem;
}

.cinematic-overlay {
  position: relative;
  margin-top: 0;
  border-radius: 12px;
  border: 1px solid #2b3f72;
  background: rgba(15, 23, 42, 0.92);
  padding: .8rem;
  display: grid;
  gap: .5rem;
  overflow: hidden;
}

.pr-card.cinematic .cinematic-overlay {
  order: -1;
}

.effect-title {
  position: relative;
  z-index: 1;
  margin: 0;
  color: #dbeafe;
  font-weight: 700;
  letter-spacing: .01em;
  font-size: clamp(1.15rem, 1rem + 1vw, 1.9rem);
}

.ci-result-list {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: .4rem;
}

.cinematic-confetti {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 85;
}

.confetti {
  --size: 10px;
  position: absolute;
  bottom: -1rem;
  width: var(--size);
  height: calc(var(--size) * 1.8);
  border-radius: 2px;
  background: linear-gradient(180deg, #fbbf24, #f43f5e);
  animation-name: confetti-cannon;
  animation-timing-function: ease-out;
  animation-iteration-count: infinite;
}

.confetti:nth-child(2n) { background: linear-gradient(180deg, #60a5fa, #34d399); }
.confetti:nth-child(3n) { background: linear-gradient(180deg, #a78bfa, #38bdf8); }

.ci-result {
  font-size: clamp(1.8rem, 1.2rem + 1.8vw, 3rem);
  display: inline-flex;
  animation: pop .55s ease both;
}

.ci-result.failure { filter: drop-shadow(0 0 5px rgba(239, 68, 68, 0.4)); }
.ci-result.success { filter: drop-shadow(0 0 5px rgba(34, 197, 94, 0.4)); }

.merge-line {
  display: flex;
  align-items: center;
  gap: .5rem;
  color: #a5b4fc;
  font-size: clamp(1.15rem, 1rem + .8vw, 1.8rem);
  font-weight: 700;
}

@keyframes pop {
  from { opacity: 0; transform: scale(.5) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes confetti-cannon {
  0% { transform: translateY(0) rotate(0deg); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: translateY(-42vh) translateX(48px) rotate(380deg); opacity: 0; }
}

@media (max-width: 640px) {
  .pr-card {
    min-width: 0;
  }
}
</style>
