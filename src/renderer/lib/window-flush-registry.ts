import type { WindowFlushResult } from '#/shared/window-lifecycle.ts'

export type WindowFlusher = () => Promise<void>

const flushers = new Set<WindowFlusher>()

export function registerWindowFlusher(fn: WindowFlusher): () => void {
  flushers.add(fn)
  return () => {
    flushers.delete(fn)
  }
}

export async function flushWindowFlushers(): Promise<WindowFlushResult> {
  const settled = await Promise.allSettled([...flushers].map((fn) => fn()))
  const errors: string[] = []
  for (const result of settled) {
    if (result.status === 'rejected') {
      errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason))
    }
  }
  return { ok: errors.length === 0, errors }
}
