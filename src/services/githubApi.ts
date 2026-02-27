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
};

const API_BASE = 'https://api.github.com';
const OWNER = 'NTUT-NPC';
const REPO = 'tattoo';
const MAX_PRS = 12;
const TOKEN_COOKIE_NAME = 'github_api_token';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getTokenFromCookie(): string {
  if (typeof document === 'undefined') return '';

  const cookie = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${TOKEN_COOKIE_NAME}=`));

  if (!cookie) return '';

  const rawValue = cookie.slice(TOKEN_COOKIE_NAME.length + 1);

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

export function getSavedGithubToken(): string {
  return getTokenFromCookie();
}

export function saveGithubToken(token: string) {
  if (typeof document === 'undefined') return;

  const normalizedToken = token.trim();

  if (!normalizedToken) {
    document.cookie = `${TOKEN_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }

  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(normalizedToken)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

async function request(path: string) {
  const token = getTokenFromCookie();
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

function normalizeCiStates(checkRuns: any[] = [], statuses: any[] = []) {
  const checks = checkRuns.map((run) => ({
    name: run.name,
    status: run.status,
    conclusion: run.conclusion,
    url: run.html_url,
  }));

  const commitStatuses = statuses.map((state) => ({
    name: state.context,
    status: state.state,
    conclusion: state.state,
    url: state.target_url,
  }));

  return [...checks, ...commitStatuses]
    .filter((item) => item.name)
    .slice(0, 4);
}

export async function fetchPrCards(): Promise<PullRequestCard[]> {
  const pulls = await request(
    `/repos/${OWNER}/${REPO}/pulls?state=open&sort=updated&direction=desc&per_page=${MAX_PRS}`,
  );

  const cards = await Promise.all(
    pulls.map(async (pr: any) => {
      const [commits, issueComments, reviewComments] = await Promise.all([
        request(`/repos/${OWNER}/${REPO}/pulls/${pr.number}/commits?per_page=100`),
        request(`/repos/${OWNER}/${REPO}/issues/${pr.number}/comments?per_page=100`),
        request(`/repos/${OWNER}/${REPO}/pulls/${pr.number}/comments?per_page=100`),
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

      const mergedComments = [...issueComments, ...reviewComments].sort(
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
      const [checks, statuses] = await Promise.all([
        request(`/repos/${OWNER}/${REPO}/commits/${sha}/check-runs`),
        request(`/repos/${OWNER}/${REPO}/commits/${sha}/status`),
      ]);

      const { buildNumber } = parseBuildNumberFromComments(issueComments);

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
        ciStates: normalizeCiStates(checks.check_runs, statuses.statuses),
      } as PullRequestCard;
    }),
  );

  return cards.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
