function ellipsizeLeftText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  if (maxChars <= 0) return ''
  if (maxChars === 1) return '…'
  return `…${text.slice(-(maxChars - 1))}`
}

export function ellipsizeLeftPath(path: string, maxChars: number): string {
  const budget = Number.isFinite(maxChars) ? Math.max(0, Math.floor(maxChars)) : 0
  if (path.length <= budget) return path
  if (budget <= 0) return ''

  const parts = path.split('/')
  if (parts.length < 2) return ellipsizeLeftText(path, budget)

  for (let suffixCount = parts.length - 1; suffixCount >= 1; suffixCount -= 1) {
    const suffix = parts.slice(-suffixCount).join('/')
    const candidate = `…/${suffix}`
    if (candidate.length <= budget) return candidate
  }

  const file = parts.at(-1) ?? path
  return ellipsizeLeftText(`/${file}`, budget)
}
