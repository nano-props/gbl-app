import { ipcMain, type BrowserWindow, type IpcMainEvent } from 'electron'
import {
  WINDOW_LIFECYCLE_FLUSH_DONE_CHANNEL,
  WINDOW_LIFECYCLE_READY_CHANNEL,
  windowFlushRequestChannel,
  type WindowFlushResult,
} from '#/shared/window-lifecycle.ts'
import { registeredRendererSurfaceByWebContentsId } from '#/main/window-registry.ts'

const DEFAULT_READY_TIMEOUT_MS = 2000
const DEFAULT_FLUSH_TIMEOUT_MS = 1500

const readyWcIdsByWindowKey = new Map<string, Set<number>>()
const readyWaiters = new Map<string, Array<() => void>>()
const pendingFlushes = new Map<
  string,
  {
    wcId: number
    resolve: (result: WindowFlushResult) => void
    timer: ReturnType<typeof setTimeout>
  }
>()

function lifecycleInstanceKey(windowKey: string, wcId: number): string {
  return `${windowKey}:${wcId}`
}

function pendingFlushKey(windowKey: string, requestId: string): string {
  return `${windowKey}:${requestId}`
}

function ensureReadySet(windowKey: string): Set<number> {
  const set = readyWcIdsByWindowKey.get(windowKey)
  if (set) return set
  const next = new Set<number>()
  readyWcIdsByWindowKey.set(windowKey, next)
  return next
}

function isTrusted(windowKey: string, wcId: number): boolean {
  const surface = registeredRendererSurfaceByWebContentsId(wcId)
  return surface?.windowKey === windowKey && surface.capabilities.lifecycle
}

ipcMain.on(WINDOW_LIFECYCLE_READY_CHANNEL, (event: IpcMainEvent, payload?: { windowKey?: string }) => {
  const windowKey = typeof payload?.windowKey === 'string' ? payload.windowKey : ''
  if (!windowKey || !isTrusted(windowKey, event.sender.id)) {
    console.warn('[window-lifecycle] ready ignored from untrusted wc', windowKey || '<unknown>', event.sender.id)
    return
  }
  ensureReadySet(windowKey).add(event.sender.id)
  const key = lifecycleInstanceKey(windowKey, event.sender.id)
  const waiters = readyWaiters.get(key)
  if (!waiters) return
  readyWaiters.delete(key)
  for (const waiter of waiters) waiter()
})

ipcMain.on(
  WINDOW_LIFECYCLE_FLUSH_DONE_CHANNEL,
  (
    event: IpcMainEvent,
    payload?: { windowKey?: string; requestId?: string; result?: WindowFlushResult },
  ) => {
    const windowKey = typeof payload?.windowKey === 'string' ? payload.windowKey : ''
    const requestId = typeof payload?.requestId === 'string' ? payload.requestId : ''
    if (!windowKey || !requestId || !isTrusted(windowKey, event.sender.id)) {
      console.warn('[window-lifecycle] flush ack ignored from untrusted wc', windowKey || '<unknown>', event.sender.id)
      return
    }
    const pending = pendingFlushes.get(pendingFlushKey(windowKey, requestId))
    if (!pending || pending.wcId !== event.sender.id) return
    clearTimeout(pending.timer)
    pendingFlushes.delete(pendingFlushKey(windowKey, requestId))
    pending.resolve(payload?.result ?? { ok: true, errors: [] })
  },
)

export function forgetWindowLifecycle(windowKey: string, wcId: number): void {
  readyWcIdsByWindowKey.get(windowKey)?.delete(wcId)
  const waitersKey = lifecycleInstanceKey(windowKey, wcId)
  const waiters = readyWaiters.get(waitersKey)
  readyWaiters.delete(waitersKey)
  if (waiters) for (const waiter of waiters) waiter()
  if ((readyWcIdsByWindowKey.get(windowKey)?.size ?? 0) === 0) readyWcIdsByWindowKey.delete(windowKey)
}

async function awaitWindowReady(windowKey: string, wcId: number, timeoutMs: number): Promise<void> {
  if (readyWcIdsByWindowKey.get(windowKey)?.has(wcId)) return
  await new Promise<void>((resolve) => {
    const key = lifecycleInstanceKey(windowKey, wcId)
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      const list = readyWaiters.get(key)
      if (list) {
        const index = list.indexOf(finish)
        if (index >= 0) list.splice(index, 1)
        if (list.length === 0) readyWaiters.delete(key)
      }
      resolve()
    }
    const waiters = readyWaiters.get(key) ?? []
    waiters.push(finish)
    readyWaiters.set(key, waiters)
    const timer = setTimeout(finish, timeoutMs)
  })
}

export async function flushWindowLifecycle(
  win: BrowserWindow,
  windowKey: string,
  options?: { readyTimeoutMs?: number; flushTimeoutMs?: number },
): Promise<WindowFlushResult> {
  const wc = win.webContents
  if (wc.isDestroyed()) return { ok: true, errors: [] }
  await awaitWindowReady(windowKey, wc.id, options?.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS)
  if (wc.isDestroyed()) return { ok: true, errors: [] }
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return new Promise<WindowFlushResult>((resolve) => {
    const key = pendingFlushKey(windowKey, requestId)
    const timer = setTimeout(() => {
      pendingFlushes.delete(key)
      resolve({ ok: true, errors: [] })
    }, options?.flushTimeoutMs ?? DEFAULT_FLUSH_TIMEOUT_MS)
    pendingFlushes.set(key, { wcId: wc.id, resolve, timer })
    try {
      wc.send(windowFlushRequestChannel(windowKey), requestId)
    } catch {
      clearTimeout(timer)
      pendingFlushes.delete(key)
      resolve({ ok: true, errors: [] })
    }
  })
}
