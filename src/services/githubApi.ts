import { parseBuildNumberFromComments, parseLinkedIssue } from '../utils/parsers.ts';

export type PullRequestCard = {
  id: number;
  number: number;
  title: string;
  url: string;
  updatedAt: string;
  author: { login: string; avatarUrl: string; url: string };
  latestCommit: {
    sha: string;
    message: string;
    authorLogin: string;
    authorAvatarUrl: string;
    authoredAt: string;
    url: string;
  } | null;
  latestComment: {
    body: string;
    createdAt: string;
    updatedAt: string;
    authorLogin: string;
    authorAvatarUrl: string;
    url: string;
  } | null;
  linkedIssue: string | null;
  buildNumber: string | null;
  ciStates: Array<{ name: string; status: string; conclusion: string | null; url: string | null }>;
  reviewStatus: 'draft' | 'pending review' | 'ci failed' | 'approved' | null;
  approvedCount: number;
};

const API_BASE = 'https://api.github.com';
const OWNER = 'NTUT-NPC';
const REPO = 'tattoo';
const MAX_PRS = 12;
const TOKEN_STORAGE_KEY = 'github_api_token';

function getTokenFromStorage(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? '';
}

export function hasSavedGithubToken(): boolean {
  return Boolean(getTokenFromStorage());
}

export function saveGithubToken(token: string) {
  if (typeof window === 'undefined') return;

  const normalizedToken = token.trim();

  if (!normalizedToken) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, normalizedToken);
}

function isLikelyGithubToken(value: string): boolean {
  return /^(gh[pousr]_|github_pat_).{10,}$/.test(value);
}

export function validateGithubToken(token: string): { valid: boolean; message: string } {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return { valid: false, message: 'Token 不能為空。' };
  }

  if (!isLikelyGithubToken(normalizedToken)) {
    return {
      valid: false,
      message: 'Token 格式看起來不正確，請確認是否完整貼上 GitHub Personal Access Token。',
    };
  }

  return { valid: true, message: '格式檢查通過。' };
}

async function request(path: string) {
  const token = getTokenFromStorage();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { headers });

  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status}: ${path}`);
  }

  return response.json();
}

export async function fetchPullRequestMergeState(number: number): Promise<{ merged: boolean; state: string }> {
  const pr = await request(`/repos/${OWNER}/${REPO}/pulls/${number}`);
  return {
    merged: Boolean(pr.merged_at),
    state: pr.state ?? 'unknown',
  };
}

function normalizeCiStates(checkRuns: any[] = []) {
  return checkRuns
    .filter((run) => run?.name && run?.app?.slug === 'github-actions')
    .map((run) => ({
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      url: run.html_url,
    }))
    .slice(0, 4);
}

function isFailedCiState(item: { status: string; conclusion: string | null }) {
  const status = item.status?.toLowerCase?.() ?? '';
  const conclusion = item.conclusion?.toLowerCase?.() ?? '';
  return status === 'failure' || conclusion === 'failure' || conclusion === 'timed_out' || conclusion === 'cancelled';
}

function inferReviewStatus(params: {
  draft: boolean;
  ciStates: Array<{ status: string; conclusion: string | null }>;
  reviews: any[];
}): PullRequestCard['reviewStatus'] {
  if (params.draft) {
    return 'draft';
  }

  if (params.ciStates.some((item) => isFailedCiState(item))) {
    return 'ci failed';
  }

  const latestReviewsByAuthor = new Map<string, string>();
  params.reviews.forEach((review) => {
    const login = review.user?.login;
    if (!login) return;

    latestReviewsByAuthor.set(login, review.state ?? '');
  });

  const latestStates = [...latestReviewsByAuthor.values()];
  const hasChangesRequested = latestStates.includes('CHANGES_REQUESTED');
  const hasApproved = latestStates.includes('APPROVED');

  if (hasApproved && !hasChangesRequested) {
    return 'approved';
  }

  return 'pending review';
}

function getApprovedCount(reviews: any[]): number {
  const latestReviewsByAuthor = new Map<string, string>();
  reviews.forEach((review) => {
    const login = review.user?.login;
    if (!login) return;

    latestReviewsByAuthor.set(login, review.state ?? '');
  });

  return [...latestReviewsByAuthor.values()].filter((state) => state === 'APPROVED').length;
}

function isBotActor(user: any): boolean {
  const login = user?.login?.toLowerCase?.() ?? '';
  const userType = user?.type?.toLowerCase?.() ?? '';

  return userType === 'bot' || login.endsWith('[bot]');
}

export async function fetchPrCards(): Promise<PullRequestCard[]> {
  const pulls = await request(
    `/repos/${OWNER}/${REPO}/pulls?state=open&sort=updated&direction=desc&per_page=${MAX_PRS}`,
  );

  const cards = await Promise.all(
    pulls.map(async (pr: any) => {
      const [commits, issueComments, reviewComments, reviews] = await Promise.all([
        request(`/repos/${OWNER}/${REPO}/pulls/${pr.number}/commits?per_page=100`),
        request(`/repos/${OWNER}/${REPO}/issues/${pr.number}/comments?per_page=100`),
        request(`/repos/${OWNER}/${REPO}/pulls/${pr.number}/comments?per_page=100`),
        request(`/repos/${OWNER}/${REPO}/pulls/${pr.number}/reviews?per_page=100`),
      ]);

      const latestCommitRaw = commits.at(-1) ?? null;
      const latestCommit = latestCommitRaw
        ? {
            sha: latestCommitRaw.sha,
            message: latestCommitRaw.commit?.message ?? '',
            authoredAt: latestCommitRaw.commit?.author?.date ?? pr.updated_at,
            authorLogin: latestCommitRaw.author?.login ?? latestCommitRaw.commit?.author?.name ?? 'unknown',
            authorAvatarUrl: latestCommitRaw.author?.avatar_url ?? pr.user.avatar_url,
            url: latestCommitRaw.html_url,
          }
        : null;

      const mergedComments = [...issueComments, ...reviewComments]
        .filter((comment) => !isBotActor(comment?.user))
        .sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        );
      const latestCommentRaw = mergedComments[0] ?? null;
      const latestComment = latestCommentRaw
        ? {
            body: latestCommentRaw.body ?? '',
            createdAt: latestCommentRaw.created_at,
            updatedAt: latestCommentRaw.updated_at,
            authorLogin: latestCommentRaw.user?.login ?? 'unknown',
            authorAvatarUrl: latestCommentRaw.user?.avatar_url ?? pr.user.avatar_url,
            url: latestCommentRaw.html_url,
          }
        : null;

      const sha = latestCommit?.sha ?? pr.head.sha;
      const checks = await request(`/repos/${OWNER}/${REPO}/commits/${sha}/check-runs`);

      const { buildNumber } = parseBuildNumberFromComments(issueComments);

      const ciStates = normalizeCiStates(checks.check_runs);

      return {
        id: pr.id,
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        updatedAt: pr.updated_at,
        author: {
          login: pr.user.login,
          avatarUrl: pr.user.avatar_url,
          url: pr.user.html_url,
        },
        latestCommit,
        latestComment,
        linkedIssue: parseLinkedIssue({ title: pr.title, body: pr.body }),
        buildNumber,
        ciStates,
        reviewStatus: inferReviewStatus({ draft: Boolean(pr.draft), ciStates, reviews }),
        approvedCount: getApprovedCount(reviews),
      } as PullRequestCard;
    }),
  );

  return cards.sort((a, b) => {
    const aDraftRank = a.reviewStatus === 'draft' ? 1 : 0;
    const bDraftRank = b.reviewStatus === 'draft' ? 1 : 0;
    if (aDraftRank !== bDraftRank) {
      return aDraftRank - bDraftRank;
    }

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}
