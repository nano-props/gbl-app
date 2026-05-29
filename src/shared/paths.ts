export function tildifyPath(path: string, home: string): string {
  if (!home) return path
  if (path === home) return '~'
  if (path.startsWith(home + '/') || path.startsWith(home + '\\')) return '~' + path.slice(home.length)
  return path
}

export function untildifyPath(path: string, home: string): string {
  if (!home) return path
  if (path === '~') return home
  if (path.startsWith('~/') || path.startsWith('~\\')) return home + path.slice(1)
  return path
}
