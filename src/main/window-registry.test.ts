import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getFocusedWindow: vi.fn(() => null),
}))
let nextWebContentsId = 1

vi.mock('electron', () => ({
  BrowserWindow: {
    getFocusedWindow: mocks.getFocusedWindow,
  },
}))

function makeWindow() {
  const webContents = { id: nextWebContentsId++, isDestroyed: () => false, send: vi.fn() }
  return {
    isDestroyed: () => false,
    once: vi.fn(),
    close: vi.fn(),
    webContents,
  } as any
}

describe('window registry', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    nextWebContentsId = 1
  })

  test('tracks main and auxiliary windows and resolves focused registered window', async () => {
    const registry = await import('#/main/window-registry.ts')
    const main = makeWindow()
    const settings = makeWindow()

    registry.registerMainWindow(main)
    registry.registerAuxWindow('settings', settings)

    expect(registry.getMainWindow()).toBe(main)
    expect(registry.getAuxWindow('settings')).toBe(settings)
    expect(registry.allRegisteredWindows()).toEqual([main, settings])
    expect(registry.isRegisteredRendererSurfaceId(main.webContents.id)).toBe(true)
    expect(registry.isRegisteredRendererSurfaceId(settings.webContents.id)).toBe(true)
    expect(registry.registeredWindowByWebContentsId(settings.webContents.id)).toBe(settings)
    expect(registry.registeredRendererSurfaceByWebContentsId(main.webContents.id)).toEqual({
      kind: 'main',
      windowKey: 'main',
      capabilities: {
        lifecycle: false,
        rpcBroadcast: true,
        themeSync: true,
        pageRouting: false,
      },
    })
    expect(registry.registeredRendererSurfaceByWebContentsId(settings.webContents.id)).toEqual({
      kind: 'aux',
      windowKey: 'settings',
      capabilities: {
        lifecycle: false,
        rpcBroadcast: true,
        themeSync: true,
        pageRouting: false,
      },
    })
    expect(registry.allRegisteredSurfaces()).toEqual([
      {
        kind: 'main',
        windowKey: 'main',
        capabilities: {
          lifecycle: false,
          rpcBroadcast: true,
          themeSync: true,
          pageRouting: false,
        },
        webContentsId: main.webContents.id,
        window: main,
      },
      {
        kind: 'aux',
        windowKey: 'settings',
        capabilities: {
          lifecycle: false,
          rpcBroadcast: true,
          themeSync: true,
          pageRouting: false,
        },
        webContentsId: settings.webContents.id,
        window: settings,
      },
    ])

    mocks.getFocusedWindow.mockReturnValue(settings)
    expect(registry.getFocusedRegisteredWindow()).toBe(settings)
    expect(registry.focusedRegisteredSurface()).toEqual({
      kind: 'aux',
      windowKey: 'settings',
      capabilities: {
        lifecycle: false,
        rpcBroadcast: true,
        themeSync: true,
        pageRouting: false,
      },
      webContentsId: settings.webContents.id,
      window: settings,
    })
  })

  test('closes an auxiliary window by key', async () => {
    const registry = await import('#/main/window-registry.ts')
    const settings = makeWindow()
    settings.close = vi.fn(function () {
      const closedListener = settings.once.mock.calls.find(([event]: [string]) => event === 'closed')?.[1]
      if (typeof closedListener === 'function') closedListener()
    })

    registry.registerAuxWindow('settings', settings)
    await registry.closeAuxWindow('settings')

    expect(settings.close).toHaveBeenCalled()
  })

  test('broadcasts to every registered window', async () => {
    const registry = await import('#/main/window-registry.ts')
    const main = makeWindow()
    const settings = makeWindow()

    registry.registerMainWindow(main)
    registry.registerAuxWindow('settings', settings)
    registry.broadcastToRegisteredWindows('goblin:event', [{ type: 'theme-changed' }])

    expect(main.webContents.send).toHaveBeenCalledWith('goblin:event', { type: 'theme-changed' })
    expect(settings.webContents.send).toHaveBeenCalledWith('goblin:event', { type: 'theme-changed' })
  })

  test('can broadcast only to matching surfaces', async () => {
    const registry = await import('#/main/window-registry.ts')
    const main = makeWindow()
    const settings = makeWindow()

    registry.registerMainWindow(main)
    registry.registerAuxWindow('settings', settings, { capabilities: { lifecycle: true } })
    registry.broadcastToRegisteredSurfaces('goblin:event', [{ type: 'settings-write-error' }], {
      predicate: (surface) => surface.kind === 'aux',
    })

    expect(main.webContents.send).not.toHaveBeenCalled()
    expect(settings.webContents.send).toHaveBeenCalledWith('goblin:event', { type: 'settings-write-error' })
  })

  test('filters surfaces by capability', async () => {
    const registry = await import('#/main/window-registry.ts')
    const main = makeWindow()
    const settings = makeWindow()

    registry.registerMainWindow(main)
    registry.registerAuxWindow('settings', settings, { capabilities: { lifecycle: true, pageRouting: true } })

    expect(registry.surfaceSupportsCapability(main.webContents.id, 'pageRouting')).toBe(false)
    expect(registry.surfaceSupportsCapability(settings.webContents.id, 'pageRouting')).toBe(true)
    expect(registry.allRegisteredSurfacesWithCapability('lifecycle')).toEqual([
      {
        kind: 'aux',
        windowKey: 'settings',
        capabilities: {
          lifecycle: true,
          rpcBroadcast: true,
          themeSync: true,
          pageRouting: true,
        },
        webContentsId: settings.webContents.id,
        window: settings,
      },
    ])
  })
})
