export function truncateText(text, limit = 90) {
  if (!text) return '-'
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}

export function formatPrId(id) {
  return `#${id}`
}

export function formatIssue(issueNumber) {
  return issueNumber ? `#${issueNumber}` : '無'
}
