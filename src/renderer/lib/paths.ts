/** Last segment of a path. Tolerant of either separator so worktree
 *  paths and repo roots render correctly on both POSIX and Windows. */
export function lastPathSegment(p: string): string {
  const trimmed = p.replace(/[/\\]+$/, '')
  const idx = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  return idx >= 0 ? trimmed.slice(idx + 1) : trimmed
}
