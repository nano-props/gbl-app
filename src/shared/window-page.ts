export function windowPageSetChannel(windowKey: string): string {
  return `goblin:window-page-set:${windowKey}`
}

export function parseWindowPageHash<TPage extends string>(
  hash: string,
  isPage: (value: string | null | undefined) => value is TPage,
  fallback: TPage,
): TPage {
  const page = hash.replace(/^#/, '')
  return isPage(page) ? page : fallback
}
