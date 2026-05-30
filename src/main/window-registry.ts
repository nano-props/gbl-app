// Registry of renderer-hosting BrowserWindows and their surface metadata.
//
// Important boundary:
// - This module owns *identity* and *capabilities* of each renderer surface.
// - It does NOT own window shell policy (navigation/open-handler), which
//   lives in window-shell.ts.
// - It does NOT own lifecycle protocol state, which lives in
//   window-lifecycle.ts.

import { BrowserWindow, type BrowserWindow as BrowserWindowType } from 'electron'

export interface RegisteredRendererSurfaceCapabilities {
  lifecycle: boolean
  rpcBroadcast: boolean
  themeSync: boolean
  pageRouting: boolean
}

export type RegisteredRendererSurfaceCapability = keyof RegisteredRendererSurfaceCapabilities

export interface RendererSurfaceSpec {
  kind: 'main' | 'aux'
  windowKey: string
  capabilities?: Partial<RegisteredRendererSurfaceCapabilities>
}

export interface RegisteredRendererSurface {
  kind: 'main' | 'aux'
  windowKey: string
  capabilities: RegisteredRendererSurfaceCapabilities
}

export interface RegisteredRendererSurfaceHandle extends RegisteredRendererSurface {
  webContentsId: number
  window: BrowserWindowType
}

let mainWindow: BrowserWindowType | null = null
const auxWindows = new Map<string, BrowserWindowType>()
const surfacesByWebContentsId = new Map<number, RegisteredRendererSurface>()

function defaultCapabilities(kind: RegisteredRendererSurface['kind']): RegisteredRendererSurfaceCapabilities {
  return {
    lifecycle: false,
    rpcBroadcast: true,
    themeSync: true,
    pageRouting: false,
  }
}

function resolveCapabilities(
  kind: RegisteredRendererSurface['kind'],
  capabilities?: Partial<RegisteredRendererSurfaceCapabilities>,
): RegisteredRendererSurfaceCapabilities {
  return { ...defaultCapabilities(kind), ...capabilities }
}

function registerSurface(win: BrowserWindowType, surface: RegisteredRendererSurface): void {
  surfacesByWebContentsId.set(win.webContents.id, surface)
}

function unregisterSurface(win?: BrowserWindowType | null): void {
  if (!win) return
  try {
    surfacesByWebContentsId.delete(win.webContents.id)
  } catch {}
}

export function registerMainWindow(
  win: BrowserWindowType,
  options?: { windowKey?: string; capabilities?: Partial<RegisteredRendererSurfaceCapabilities> },
): void {
  registerRendererWindowSurface(win, {
    kind: 'main',
    windowKey: options?.windowKey ?? 'main',
    capabilities: options?.capabilities,
  })
}

export function unregisterMainWindow(win?: BrowserWindowType): void {
  if (win && mainWindow !== win) return
  unregisterSurface(mainWindow ?? win)
  mainWindow = null
}

export function getMainWindow(): BrowserWindowType | null {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow
  unregisterSurface(mainWindow)
  mainWindow = null
  return null
}

export function isMainWindowOpen(): boolean {
  return getMainWindow() !== null
}

export function registerAuxWindow(
  windowKey: string,
  win: BrowserWindowType,
  options?: { capabilities?: Partial<RegisteredRendererSurfaceCapabilities> },
): void {
  registerRendererWindowSurface(win, {
    kind: 'aux',
    windowKey,
    capabilities: options?.capabilities,
  })
}

export function unregisterAuxWindow(windowKey: string, win?: BrowserWindowType): void {
  if (win) {
    const current = auxWindows.get(windowKey)
    if (current !== win) return
  }
  unregisterSurface(auxWindows.get(windowKey) ?? win)
  auxWindows.delete(windowKey)
}

export function getAuxWindow(windowKey: string): BrowserWindowType | null {
  const win = auxWindows.get(windowKey) ?? null
  if (!win || win.isDestroyed()) {
    unregisterSurface(win)
    auxWindows.delete(windowKey)
    return null
  }
  return win
}

export function isAuxWindowOpen(windowKey: string): boolean {
  return getAuxWindow(windowKey) !== null
}

export function closeAuxWindow(windowKey: string): Promise<void> {
  const win = getAuxWindow(windowKey)
  if (!win) return Promise.resolve()
  return new Promise((resolve) => {
    win.once('closed', () => resolve())
    win.close()
  })
}

export function allAuxWindows(): BrowserWindowType[] {
  const windows: BrowserWindowType[] = []
  for (const [windowKey, win] of auxWindows) {
    if (win.isDestroyed()) {
      auxWindows.delete(windowKey)
      continue
    }
    windows.push(win)
  }
  return windows
}

export function allRegisteredWindows(): BrowserWindowType[] {
  const windows = allAuxWindows()
  const main = getMainWindow()
  return main ? [main, ...windows] : windows
}

export function allRegisteredSurfaces(): RegisteredRendererSurfaceHandle[] {
  const handles: RegisteredRendererSurfaceHandle[] = []
  for (const win of allRegisteredWindows()) {
    const surface = surfacesByWebContentsId.get(win.webContents.id)
    if (!surface) continue
    handles.push({ ...surface, webContentsId: win.webContents.id, window: win })
  }
  return handles
}

export function allAuxSurfaces(): RegisteredRendererSurfaceHandle[] {
  return allRegisteredSurfaces().filter((surface) => surface.kind === 'aux')
}

export function allRegisteredSurfacesWithCapability(
  capability: RegisteredRendererSurfaceCapability,
): RegisteredRendererSurfaceHandle[] {
  return allRegisteredSurfaces().filter((surface) => surface.capabilities[capability])
}

export function isRegisteredRendererSurfaceId(webContentsId: number): boolean {
  return registeredRendererSurfaceByWebContentsId(webContentsId) !== null
}

export function registeredWindowByWebContentsId(webContentsId: number): BrowserWindowType | null {
  const main = getMainWindow()
  if (main?.webContents.id === webContentsId) return main
  return allAuxWindows().find((win) => win.webContents.id === webContentsId) ?? null
}

export function registeredRendererSurfaceByWebContentsId(webContentsId: number): RegisteredRendererSurface | null {
  const win = registeredWindowByWebContentsId(webContentsId)
  if (!win) {
    surfacesByWebContentsId.delete(webContentsId)
    return null
  }
  return surfacesByWebContentsId.get(webContentsId) ?? null
}

export function registeredSurfaceHandleByWebContentsId(webContentsId: number): RegisteredRendererSurfaceHandle | null {
  const surface = registeredRendererSurfaceByWebContentsId(webContentsId)
  const win = registeredWindowByWebContentsId(webContentsId)
  return surface && win ? { ...surface, webContentsId, window: win } : null
}

export function surfaceSupportsCapability(
  webContentsId: number,
  capability: RegisteredRendererSurfaceCapability,
): boolean {
  return registeredRendererSurfaceByWebContentsId(webContentsId)?.capabilities[capability] ?? false
}

export function focusedRegisteredSurface(): RegisteredRendererSurfaceHandle | null {
  const focused = getFocusedRegisteredWindow()
  if (!focused) return null
  return registeredSurfaceHandleByWebContentsId(focused.webContents.id)
}

export function getFocusedRegisteredWindow(): BrowserWindowType | null {
  const focused = BrowserWindow.getFocusedWindow()
  if (!focused || focused.isDestroyed()) return null
  if (focused === getMainWindow()) return focused
  return allAuxWindows().includes(focused) ? focused : null
}

export function sendToRegisteredWindow(
  win: BrowserWindowType | null | undefined,
  channel: string,
  args: unknown[] = [],
): void {
  if (!win) return
  try {
    if (!win.isDestroyed() && !win.webContents.isDestroyed()) win.webContents.send(channel, ...args)
  } catch (err) {
    console.warn('[window-registry] failed to send event to window', err)
  }
}

export function broadcastToRegisteredWindows(
  channel: string,
  args: unknown[] = [],
  options?: { excludeWindow?: BrowserWindowType | null | undefined },
): void {
  for (const win of allRegisteredWindows()) {
    if (options?.excludeWindow && options.excludeWindow === win) continue
    sendToRegisteredWindow(win, channel, args)
  }
}

export function sendToRegisteredSurface(
  surface: RegisteredRendererSurfaceHandle | null | undefined,
  channel: string,
  args: unknown[] = [],
): void {
  sendToRegisteredWindow(surface?.window, channel, args)
}

export function broadcastToRegisteredSurfaces(
  channel: string,
  args: unknown[] = [],
  options?: {
    excludeWebContentsId?: number
    predicate?: (surface: RegisteredRendererSurfaceHandle) => boolean
  },
): void {
  for (const surface of allRegisteredSurfaces()) {
    if (options?.excludeWebContentsId === surface.webContentsId) continue
    if (options?.predicate && !options.predicate(surface)) continue
    sendToRegisteredSurface(surface, channel, args)
  }
}

export function broadcastToSurfaceCapability(
  capability: RegisteredRendererSurfaceCapability,
  channel: string,
  args: unknown[] = [],
  options?: {
    excludeWebContentsId?: number
    predicate?: (surface: RegisteredRendererSurfaceHandle) => boolean
  },
): void {
  broadcastToRegisteredSurfaces(channel, args, {
    excludeWebContentsId: options?.excludeWebContentsId,
    predicate: (surface) => surface.capabilities[capability] && (!options?.predicate || options.predicate(surface)),
  })
}

export function registerRendererWindowSurface(
  win: BrowserWindowType,
  surface: RendererSurfaceSpec,
): void {
  if (surface.kind === 'main') {
    mainWindow = win
  } else {
    auxWindows.set(surface.windowKey, win)
  }
  registerSurface(win, {
    kind: surface.kind,
    windowKey: surface.windowKey,
    capabilities: resolveCapabilities(surface.kind, surface.capabilities),
  })
}

export function unregisterRendererWindowSurface(
  surface: RendererSurfaceSpec,
  win?: BrowserWindowType,
): void {
  if (surface.kind === 'main') {
    unregisterMainWindow(win)
    return
  }
  unregisterAuxWindow(surface.windowKey, win)
}
