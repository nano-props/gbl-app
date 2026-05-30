import { useEffect } from 'react'
import { flushWindowFlushers } from '#/renderer/lib/window-flush-registry.ts'

export function useWindowLifecycle(windowKey: string) {
  useEffect(() => {
    window.goblin.notifyWindowReady?.(windowKey)
  }, [windowKey])

  useEffect(() => {
    return window.goblin.onWindowFlushRequest?.(windowKey, async () => flushWindowFlushers())
  }, [windowKey])
}
