export function mapApiPrToCard(pr) {
  return {
    id: pr.id,
    title: pr.title,
    latestCommit: pr.latestCommit,
    buildNumber: pr.buildNumber,
    latestComment: pr.latestComment,
    issueNumber: pr.issueNumber,
    ciStatuses: pr.ciStatuses,
  }
}
