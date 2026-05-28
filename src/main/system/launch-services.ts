import { execa } from 'execa'

const APP_LOOKUP_TIMEOUT_MS = 5_000

export async function resolveApplicationPath(appName: string, signal?: AbortSignal): Promise<string | null> {
  const script = `
    on run argv
      set appName to item 1 of argv
      return POSIX path of (path to application appName)
    end run
  `
  const result = await execa('/usr/bin/osascript', ['-e', script, appName], {
    timeout: APP_LOOKUP_TIMEOUT_MS,
    forceKillAfterDelay: 500,
    cancelSignal: signal,
    reject: false,
  })
  if (result.failed || result.exitCode !== 0) return null
  const resolved = result.stdout.trim()
  return resolved ? resolved : null
}

export async function hasApplication(appName: string, signal?: AbortSignal): Promise<boolean> {
  return (await resolveApplicationPath(appName, signal)) !== null
}
