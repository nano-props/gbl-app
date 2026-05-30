#!/usr/bin/env bun
import { watch } from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..')
const rendererDevHost = process.env.GOBLIN_RENDERER_DEV_HOST?.trim() || '127.0.0.1'
const rendererDevPort = parsePort(process.env.GOBLIN_RENDERER_DEV_PORT) ?? 5173
const rendererDevUrl = `http://${rendererDevHost}:${rendererDevPort}/`
const viteArgs = [localBin('vite'), '--host', rendererDevHost, '--port', String(rendererDevPort), '--strictPort']
const electronArgs = [localBin('electron'), '.']
const watchedPaths = ['src/main', 'src/preload', 'src/shared', 'vite.config.ts'].map((target) => path.join(repoRoot, target))

let shuttingDown = false
let viteExited = false
let electronProc: Bun.Subprocess | null = null
let restartPending = false
let restartTimer: ReturnType<typeof setTimeout> | null = null
let watchers: ReturnType<typeof watch>[] = []

const viteProc = Bun.spawn(viteArgs, {
  cwd: repoRoot,
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
  env: process.env,
})

log(`starting Vite dev server at ${rendererDevUrl}`)

void viteProc.exited.then((code) => {
  viteExited = true
  if (!shuttingDown) void shutdown(code)
})

await waitForDevServer()
log('renderer dev server ready; launching Electron')
electronProc = launchElectron()

watchers = watchedPaths.map((target) =>
  watch(target, { recursive: true }, () => {
    if (shuttingDown) return
    if (restartTimer) clearTimeout(restartTimer)
    restartTimer = setTimeout(() => {
      restartTimer = null
      void restartElectron()
    }, 120)
  }),
)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown(0)
  })
}

process.on('exit', () => {
  for (const watcher of watchers) watcher.close()
  if (!viteExited) viteProc.kill()
  electronProc?.kill()
})

function localBin(name: string): string {
  return path.join(repoRoot, 'node_modules', '.bin', `${name}${process.platform === 'win32' ? '.cmd' : ''}`)
}

function log(message: string): void {
  console.log(`[dev] ${message}`)
}

function parsePort(value: string | undefined): number | null {
  if (!value) return null
  const port = Number(value)
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null
}

async function waitForDevServer(): Promise<void> {
  while (!viteExited) {
    try {
      const response = await fetch(rendererDevUrl)
      if (response.ok) return
    } catch {}
    await Bun.sleep(150)
  }
  throw new Error('Vite dev server exited before becoming ready')
}

function launchElectron(): Bun.Subprocess {
  const proc = Bun.spawn(electronArgs, {
    cwd: repoRoot,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...process.env, GOBLIN_RENDERER_DEV_URL: rendererDevUrl },
  })
  void proc.exited.then((code) => {
    if (shuttingDown) return
    if (electronProc !== proc) return
    if (restartPending) {
      restartPending = false
      electronProc = launchElectron()
      return
    }
    void shutdown(code)
  })
  return proc
}

async function restartElectron(): Promise<void> {
  if (!electronProc || restartPending) return
  restartPending = true
  log('main/preload/shared config changed; restarting Electron')
  electronProc.kill()
}

async function shutdown(code: number): Promise<never> {
  if (shuttingDown) process.exit(code)
  shuttingDown = true
  if (restartTimer) clearTimeout(restartTimer)
  for (const watcher of watchers) watcher.close()
  electronProc?.kill()
  if (!viteExited) viteProc.kill()
  const pending = [viteProc.exited]
  if (electronProc) pending.push(electronProc.exited)
  await Promise.allSettled(pending)
  process.exit(code)
}
