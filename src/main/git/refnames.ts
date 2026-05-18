export function isSafeBranchName(branch: string): boolean {
  return (
    branch.length > 0 &&
    !branch.startsWith('-') &&
    !/\s/.test(branch) &&
    !branch.includes('\0') &&
    !branch.includes('..') &&
    !branch.includes('~') &&
    !branch.includes('^') &&
    !branch.includes(':') &&
    !branch.includes('\\')
  )
}
