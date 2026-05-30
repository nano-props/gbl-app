import type { IpcMainInvokeEvent, WebContents } from 'electron'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const trustedWebContentsIds = new Set<number>()
const trustedAppUrls = new Set<string>()

export function registerTrustedAppPath(filePath: string): void {
  trustedAppUrls.add(normalizeTrustedAppPath(filePath))
}

export function registerTrustedWebContents(webContents: WebContents): void {
  trustedWebContentsIds.add(webContents.id)
  webContents.once('destroyed', () => {
    trustedWebContentsIds.delete(webContents.id)
  })
}

export function registerTrustedAppUrl(value: string): void {
  const normalized = normalizeTrustedAppUrl(value)
  if (normalized) trustedAppUrls.add(normalized)
}

export function isTrustedAppUrl(value: string): boolean {
  const normalized = normalizeTrustedAppUrl(value)
  return normalized ? trustedAppUrls.has(normalized) : false
}

export function isTrustedIpcEvent(event: IpcMainInvokeEvent): boolean {
  return (
    trustedWebContentsIds.has(event.sender.id) && event.senderFrame !== null && isTrustedAppUrl(event.senderFrame.url)
  )
}

function normalizeTrustedAppPath(filePath: string): string {
  const url = pathToFileURL(path.resolve(filePath))
  url.search = ''
  url.hash = ''
  return url.toString()
}

function normalizeTrustedAppUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol === 'file:') return normalizeTrustedAppPath(fileURLToPath(url))
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      url.pathname = normalizeTrustedHttpPath(url.pathname)
      url.search = ''
      url.hash = ''
      return url.toString()
    }
    return null
  } catch {
    return null
  }
}

function normalizeTrustedHttpPath(pathname: string): string {
  if (pathname === '/') return pathname
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}
