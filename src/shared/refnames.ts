export function validateBranchName(branch: string): { ok: true } | { ok: false } {
  if (
    branch.length === 0 ||
    branch === 'HEAD' ||
    branch.startsWith('-') ||
    branch.startsWith('/') ||
    branch.endsWith('/') ||
    branch.endsWith('.') ||
    branch.includes('//') ||
    branch.includes('..') ||
    branch.includes('@{') ||
    /[\u0000-\u0020\u007f~^:?*[\\]/.test(branch)
  ) {
    return { ok: false }
  }

  for (const part of branch.split('/')) {
    if (!part || part.startsWith('.') || part.endsWith('.lock')) return { ok: false }
  }

  return { ok: true }
}

export function isSafeBranchName(branch: string): boolean {
  return validateBranchName(branch).ok
}
