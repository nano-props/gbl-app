#!/usr/bin/env bun
// Gracefully quit a running Goblin.app, force-killing if it doesn't respond.
// macOS-only (uses AppleScript + pgrep); on other platforms this is a no-op,
// since the install flow it serves only runs on macOS.
import { $ } from 'bun'
import { setTimeout as sleep } from 'node:timers/promises'

const APP_NAME = 'Goblin'

// Match only the packaged binary launched by launchd/Finder. A loose
// pattern like `${APP_NAME}.app` would also match unrelated shells and
// tools whose argv happens to contain the path to Goblin.app.
const BINARY_PATH_FRAGMENT = `/${APP_NAME}.app/Contents/MacOS/`

async function isRunning(): Promise<boolean> {
  // pgrep exits 0 when a match is found, 1 when not. Any other code is an
  // actual error (e.g. pgrep missing) — treat as "not running" to avoid
  // blocking the install flow.
  const r = await $`pgrep -f ${BINARY_PATH_FRAGMENT}`.quiet().nothrow()
  return r.exitCode === 0
}

export async function closeRunningApp(): Promise<void> {
  if (process.platform !== 'darwin') return
  if (!(await isRunning())) return

  console.log(`${APP_NAME} is running, attempting graceful quit...`)

  // osascript may fail if the app just exited; fall through to the wait loop.
  await $`osascript -e ${`quit app "${APP_NAME}"`}`.quiet().nothrow()

  for (let i = 0; i < 10; i++) {
    if (!(await isRunning())) {
      console.log(`${APP_NAME} quit.`)
      return
    }
    await sleep(500)
  }

  if (await isRunning()) {
    console.log(`Forcing ${APP_NAME} to quit...`)
    await $`pkill -9 -f ${BINARY_PATH_FRAGMENT}`.quiet().nothrow()
    await sleep(1000)
  }
}

if (import.meta.main) await closeRunningApp()
