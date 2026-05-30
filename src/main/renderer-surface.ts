// Bridge between the window shell and the surface registry.
//
// This module is intentionally tiny: attaching a renderer surface means
// "apply trusted shell policy" + "register the surface identity/capabilities".

import type { BrowserWindow } from 'electron'
import {
  registerRendererWindowSurface,
  unregisterRendererWindowSurface,
  type RendererSurfaceSpec,
} from '#/main/window-registry.ts'
import { configureTrustedRendererWindow } from '#/main/window-shell.ts'

interface AttachRendererSurfaceWindowOptions {
  logLabel: string
  surface: RendererSurfaceSpec
}

export function attachRendererSurfaceWindow(
  win: BrowserWindow,
  { logLabel, surface }: AttachRendererSurfaceWindowOptions,
): void {
  configureTrustedRendererWindow(win, logLabel)
  registerRendererWindowSurface(win, surface)
}

export function detachRendererSurfaceWindow(win: BrowserWindow, surface: RendererSurfaceSpec): void {
  unregisterRendererWindowSurface(surface, win)
}
