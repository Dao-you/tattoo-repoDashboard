import { mapApiPrToCard } from '../utils/parsers'

const MOCK_RESPONSE = [
  {
    id: 128,
    title: 'refactor: split CI summary widget into reusable component',
    latestCommit: {
      authorId: 'mia-chen',
      avatar: 'https://i.pravatar.cc/80?img=5',
      message: 'chore: move status map to constants and add tests',
    },
    buildNumber: 'build-4216',
    latestComment: '我已經更新 lint 設定，麻煩再幫我看一下 screenshot。',
    issueNumber: 902,
    ciStatuses: {
      lint: 'success',
      test: 'success',
      build: 'running',
      deploy: 'pending',
    },
  },
  {
    id: 131,
    title: 'feat: add pagination for pull request dashboard',
    latestCommit: {
      authorId: 'tim-lin',
      avatar: 'https://i.pravatar.cc/80?img=12',
      message: 'feat: support page size selector and persist query state',
    },
    buildNumber: 'build-4220',
    latestComment: '可以補上 mobile 版 spacing 調整嗎？',
    issueNumber: 917,
    ciStatuses: {
      lint: 'success',
      test: 'failed',
      build: 'failed',
      deploy: 'blocked',
    },
  },
  {
    id: 133,
    title: 'fix: fallback to cached contributors when GitHub API throttles',
    latestCommit: {
      authorId: 'amy-wu',
      avatar: 'https://i.pravatar.cc/80?img=32',
      message: 'fix: guard undefined contributors and log warning detail',
    },
    buildNumber: 'build-4222',
    latestComment: '這個版本看起來穩定，可以準備 merge。',
    issueNumber: 925,
    ciStatuses: {
      lint: 'success',
      test: 'success',
      build: 'success',
      deploy: 'success',
    },
  },
]

export async function fetchPullRequests() {
  await new Promise((resolve) => setTimeout(resolve, 700))

  return MOCK_RESPONSE.map(mapApiPrToCard)
}
