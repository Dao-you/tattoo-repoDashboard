import {
  parseBuildNumberFromComments,
  parseLinkedIssue,
} from '../utils/parsers.js';

const DEFAULT_BASE_URL = 'https://api.github.com';
const DEFAULT_BATCH_SIZE = 3;
const DEFAULT_TTL_MS = 60 * 1000;

function pickToken(explicitToken) {
  if (explicitToken) {
    return explicitToken;
  }

  if (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_GITHUB_TOKEN) {
    return import.meta.env.VITE_GITHUB_TOKEN;
  }

  if (typeof process !== 'undefined' && process?.env?.VITE_GITHUB_TOKEN) {
    return process.env.VITE_GITHUB_TOKEN;
  }

  return null;
}

function buildHeaders(token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function createCache({ ttlMs = DEFAULT_TTL_MS } = {}) {
  const map = new Map();

  return {
    get(key) {
      const item = map.get(key);
      if (!item) return null;
      if (Date.now() - item.timestamp > ttlMs) {
        map.delete(key);
        return null;
      }
      return item.value;
    },
    set(key, value) {
      map.set(key, { value, timestamp: Date.now() });
      return value;
    },
    clear() {
      map.clear();
    },
  };
}

async function runInBatches(items, worker, batchSize = DEFAULT_BATCH_SIZE) {
  const results = [];

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const batchResults = await Promise.all(batch.map(worker));
    results.push(...batchResults);
  }

  return results;
}

export function createGithubApiClient({
  owner,
  repo,
  token,
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = fetch,
  cacheTtlMs = DEFAULT_TTL_MS,
} = {}) {
  if (!owner || !repo) {
    throw new Error('createGithubApiClient requires both owner and repo.');
  }

  if (typeof fetchImpl !== 'function') {
    throw new Error('A valid fetch implementation is required.');
  }

  const resolvedToken = pickToken(token);
  const headers = buildHeaders(resolvedToken);
  const cache = createCache({ ttlMs: cacheTtlMs });

  async function request(path, { cacheKey, fallbackToUnauthed = true } = {}) {
    if (cacheKey) {
      const hit = cache.get(cacheKey);
      if (hit) return hit;
    }

    const url = `${baseUrl}${path}`;
    const response = await fetchImpl(url, { headers });

    if ((response.status === 401 || response.status === 403) && headers.Authorization && fallbackToUnauthed) {
      const unauthedResponse = await fetchImpl(url, {
        headers: buildHeaders(null),
      });

      if (!unauthedResponse.ok) {
        throw new Error(`GitHub API request failed (${unauthedResponse.status}): ${path}`);
      }

      const unauthedData = await unauthedResponse.json();
      if (cacheKey) cache.set(cacheKey, unauthedData);
      return unauthedData;
    }

    if (!response.ok) {
      throw new Error(`GitHub API request failed (${response.status}): ${path}`);
    }

    const data = await response.json();
    if (cacheKey) cache.set(cacheKey, data);
    return data;
  }

  function getPullRequests() {
    return request(
      `/repos/${owner}/${repo}/pulls?state=open&sort=updated&direction=desc`,
      { cacheKey: 'pulls:open:updated' },
    );
  }

  function getPullRequestCommits(prNumber) {
    return request(`/repos/${owner}/${repo}/pulls/${prNumber}/commits`, {
      cacheKey: `pr:${prNumber}:commits`,
    });
  }

  function getPullRequestIssueComments(prNumber) {
    return request(`/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
      cacheKey: `pr:${prNumber}:issue-comments`,
    });
  }

  function getPullRequestReviewComments(prNumber) {
    return request(`/repos/${owner}/${repo}/pulls/${prNumber}/comments`, {
      cacheKey: `pr:${prNumber}:review-comments`,
    });
  }

  async function getCommitChecksAndStatus(sha) {
    const [checkRunsResponse, statusResponse] = await Promise.all([
      request(`/repos/${owner}/${repo}/commits/${sha}/check-runs`, {
        cacheKey: `commit:${sha}:check-runs`,
      }),
      request(`/repos/${owner}/${repo}/commits/${sha}/status`, {
        cacheKey: `commit:${sha}:status`,
      }),
    ]);

    return {
      checkRuns: checkRunsResponse?.check_runs ?? [],
      status: statusResponse,
    };
  }

  function isBotActor(user) {
    const login = user?.login?.toLowerCase?.() ?? '';
    const userType = user?.type?.toLowerCase?.() ?? '';

    return userType === 'bot' || login.endsWith('[bot]');
  }

  async function hydratePullRequest(pr, { includeReviewComments = false } = {}) {
    const prNumber = pr.number;
    const [commits, issueComments, reviewComments] = await Promise.all([
      getPullRequestCommits(prNumber),
      getPullRequestIssueComments(prNumber),
      includeReviewComments ? getPullRequestReviewComments(prNumber) : Promise.resolve([]),
    ]);

    const latestCommit = commits.at(-1) ?? null;
    const latestComment = [...issueComments, ...reviewComments]
      .filter((comment) => !isBotActor(comment?.user))
      .sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at))
      .at(-1) ?? null;

    const targetSha = latestCommit?.sha ?? pr.head?.sha;
    const checkPayload = targetSha ? await getCommitChecksAndStatus(targetSha) : null;
    const parsedBuild = parseBuildNumberFromComments(issueComments);

    return {
      prNumber,
      title: pr.title,
      updatedAt: pr.updated_at,
      latestCommit,
      latestComment,
      linkedIssue: parseLinkedIssue({ title: pr.title, body: pr.body }),
      buildNumber: parsedBuild.buildNumber,
      ciStates: normalizeCiStates(checkPayload),
    };
  }

  function normalizeCiStates(checkPayload) {
    if (!checkPayload) return [];

    const runStates = (checkPayload.checkRuns ?? []).map((run) => ({
      source: 'check-run',
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      url: run.html_url,
    }));

    const statusStates = (checkPayload.status?.statuses ?? []).map((status) => ({
      source: 'status',
      name: status.context,
      status: status.state,
      conclusion: status.state,
      url: status.target_url,
    }));

    return [...runStates, ...statusStates];
  }

  async function getPullRequestViewModels({
    visiblePrNumbers,
    includeReviewComments = false,
    batchSize = DEFAULT_BATCH_SIZE,
  } = {}) {
    const pulls = await getPullRequests();
    const selectedPulls = Array.isArray(visiblePrNumbers) && visiblePrNumbers.length > 0
      ? pulls.filter((pr) => visiblePrNumbers.includes(pr.number))
      : pulls;

    return runInBatches(
      selectedPulls,
      (pr) => hydratePullRequest(pr, { includeReviewComments }),
      batchSize,
    );
  }

  return {
    getPullRequests,
    getPullRequestCommits,
    getPullRequestIssueComments,
    getPullRequestReviewComments,
    getCommitChecksAndStatus,
    getPullRequestViewModels,
    hydratePullRequest,
    cache,
    hasAuthToken: Boolean(resolvedToken),
  };
}
