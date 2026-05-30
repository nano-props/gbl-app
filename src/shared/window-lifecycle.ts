export const WINDOW_LIFECYCLE_READY_CHANNEL = 'goblin:window-lifecycle-ready'
export const WINDOW_LIFECYCLE_FLUSH_DONE_CHANNEL = 'goblin:window-lifecycle-flush-done'

export function windowFlushRequestChannel(windowKey: string): string {
  return `goblin:window-flush-request:${windowKey}`
}

export interface WindowFlushResult {
  ok: boolean
  errors: string[]
}
