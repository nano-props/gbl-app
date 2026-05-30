import { useEffect, useState } from 'react'
import { parseWindowPageHash } from '#/shared/window-page.ts'

interface UseWindowPageStateOptions<TPage extends string> {
  windowKey: string
  defaultPage: TPage
  isPage: (value: string | null | undefined) => value is TPage
  syncHash?: boolean
}

export function useWindowPageState<TPage extends string>({
  windowKey,
  defaultPage,
  isPage,
  syncHash = true,
}: UseWindowPageStateOptions<TPage>) {
  const [page, setPage] = useState<TPage>(() => parseWindowPageHash(window.location.hash, isPage, defaultPage))

  useEffect(() => {
    if (!syncHash) return
    window.location.hash = page
  }, [page, syncHash])

  useEffect(() => {
    return window.goblin.onWindowPageSet?.(windowKey, (nextPage) => {
      if (isPage(nextPage)) setPage(nextPage)
    })
  }, [isPage, windowKey])

  return [page, setPage] as const
}
