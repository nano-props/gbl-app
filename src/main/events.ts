import type { BrowserWindow } from 'electron'
import type { RpcEvent } from '#/shared/rpc.ts'
import { broadcastToSurfaceCapability, sendToRegisteredWindow } from '#/main/window-registry.ts'

export function broadcastRpcEvent(event: RpcEvent): void {
  broadcastToSurfaceCapability('rpcBroadcast', 'goblin:event', [event])
}

export function sendRpcEvent(win: BrowserWindow | null | undefined, event: RpcEvent): void {
  sendToRegisteredWindow(win, 'goblin:event', [event])
}
