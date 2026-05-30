import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  whenReady: vi.fn(() => Promise.resolve()),
  attachRendererSurfaceWindow: vi.fn(),
  detachRendererSurfaceWindow: vi.fn(),
  flushWindowLifecycle: vi.fn(() => Promise.resolve({ ok: true, errors: [] })),
  forgetWindowLifecycle: vi.fn(),
  getAuxWindow: vi.fn(() => null),
  isAuxWindowOpen: vi.fn(() => false),
  closeAuxWindow: vi.fn(() => Promise.resolve()),
  surfaceSupportsCapability: vi.fn(() => true),
}))

vi.mock('electron', () => ({
  app: {
    whenReady: mocks.whenReady,
  },
}))

vi.mock('#/main/renderer-surface.ts', () => ({
  attachRendererSurfaceWindow: mocks.attachRendererSurfaceWindow,
  detachRendererSurfaceWindow: mocks.detachRendererSurfaceWindow,
}))

vi.mock('#/main/window-lifecycle.ts', () => ({
  flushWindowLifecycle: mocks.flushWindowLifecycle,
  forgetWindowLifecycle: mocks.forgetWindowLifecycle,
}))

vi.mock('#/main/window-registry.ts', () => ({
  getAuxWindow: mocks.getAuxWindow,
  isAuxWindowOpen: mocks.isAuxWindowOpen,
  closeAuxWindow: mocks.closeAuxWindow,
  surfaceSupportsCapability: mocks.surfaceSupportsCapability,
}))

function makeWindow() {
  const listeners = new Map<string, Array<(...args: any[]) => void>>()
  const on = vi.fn((event: string, handler: (...args: any[]) => void) => {
    const list = listeners.get(event) ?? []
    list.push(handler)
    listeners.set(event, list)
  })
  const emit = (event: string, ...args: any[]) => {
    for (const handler of listeners.get(event) ?? []) handler(...args)
  }
  const win = {
    webContents: {
      id: 1,
      isDestroyed: () => false,
      isLoading: () => false,
      send: vi.fn(),
      once: vi.fn(),
    },
    isDestroyed: () => false,
    isVisible: () => true,
    isMinimized: () => false,
    show: vi.fn(),
    focus: vi.fn(),
    restore: vi.fn(),
    on,
    close: vi.fn(() => {
      const closeEvent = {
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true
        },
      }
      emit('close', closeEvent)
      if (!closeEvent.defaultPrevented) emit('closed')
    }),
  } as any
  return win
}

describe('standalone page window controller', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  test('bounds a hanging onBeforeClose hook and still closes the window', async () => {
    const { createStandalonePageWindow } = await import('#/main/standalone-page-window.ts')
    const win = makeWindow()
    const controller = createStandalonePageWindow({
      surface: {
        kind: 'aux',
        windowKey: 'settings',
        capabilities: { lifecycle: true, pageRouting: true },
      },
      logLabel: 'settings-window',
      defaultPage: 'general',
      createWindow: () => win,
      loadWindow: async () => {},
      lifecycle: {
        onBeforeClose: () => new Promise<void>(() => {}),
        beforeCloseTimeoutMs: 25,
      },
    })

    await controller.openWindow('general')
    win.close()
    await vi.advanceTimersByTimeAsync(25)

    expect(win.close).toHaveBeenCalledTimes(2)
    expect(mocks.detachRendererSurfaceWindow).toHaveBeenCalledWith(win, {
      kind: 'aux',
      windowKey: 'settings',
      capabilities: { lifecycle: true, pageRouting: true },
    })
    expect(mocks.forgetWindowLifecycle).toHaveBeenCalledWith('settings', 1)
  })
})
