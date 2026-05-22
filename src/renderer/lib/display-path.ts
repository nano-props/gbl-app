export function splitDisplayPath(path: string): { dir: string; file: string } {
  const slash = path.lastIndexOf('/')
  if (slash === -1) return { dir: '', file: path }
  return { dir: path.slice(0, slash), file: path.slice(slash + 1) }
}

export function compactDisplayDir(dir: string): string {
  const parts = dir.split('/')
  if (parts.length <= 3) return dir
  return `${parts[0]}/…/${parts.slice(-2).join('/')}`
}
