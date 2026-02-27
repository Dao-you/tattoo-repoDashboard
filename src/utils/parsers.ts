const BUILD_NUMBER_PATTERNS = [
  /\*\*Build Number:\*\*\s*(\d+)/i,
  /\bbuild\s*#\s*(\d+)\b/i,
  /\bbuild\s*(\d+)\b/i,
  /\bci[-\s#:]*(\d+)\b/i,
  /\bworkflow[-\s#:]*(\d+)\b/i,
  /\bpipeline[-\s#:]*(\d+)\b/i,
];

const ISSUE_PATTERNS = [
  /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)\b/i,
  /\b(?:issue|ticket)\s+#?(\d+)\b/i,
  /\b([A-Z][A-Z0-9]+-\d+)\b/,
];

export function parseBuildNumberFromText(text = ''): string | null {
  for (const pattern of BUILD_NUMBER_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function parseBuildNumberFromComments(comments: Array<{ body?: string }> = []) {
  for (let index = comments.length - 1; index >= 0; index -= 1) {
    const comment = comments[index];
    const buildNumber = parseBuildNumberFromText(comment.body ?? '');
    if (buildNumber) return { buildNumber, sourceComment: comment };
  }
  return { buildNumber: null, sourceComment: null };
}

export function parseLinkedIssue({ title = '', body = '' } = {}) {
  const text = `${title}\n${body}`;

  for (const pattern of ISSUE_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}
