import { execa } from 'execa'
import path from 'node:path'
import { hasCommand } from '#/main/system/command.ts'

const GITHUB_CLI_TIMEOUT_MS = 5_000
export const GITHUB_CLI_EXTRA_PATHS = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin']

interface GitHubCliState {
  available: boolean
  version: string | null
  detectedAt: number
}

export function buildGitHubCliPath(currentPath = process.env.PATH): string {
  const values = [...(currentPath?.split(path.delimiter) ?? []), ...GITHUB_CLI_EXTRA_PATHS]
  const seen = new Set<string>()
  const directories: string[] = []
  for (const value of values) {
    const directory = value.trim()
    if (!directory || seen.has(directory)) continue
    seen.add(directory)
    directories.push(directory)
  }
  return directories.join(path.delimiter)
}

export async function probeGitHubCli(signal?: AbortSignal, detectedAt = Date.now()): Promise<GitHubCliState> {
  if (!hasCommand('gh', GITHUB_CLI_EXTRA_PATHS)) return { available: false, version: null, detectedAt }
  const result = await execa('gh', ['--version'], {
    timeout: GITHUB_CLI_TIMEOUT_MS,
    forceKillAfterDelay: 500,
    cancelSignal: signal,
    reject: false,
    env: {
      ...process.env,
      GH_PROMPT_DISABLED: '1',
      PATH: buildGitHubCliPath(),
    },
  })
  if (result.failed || result.exitCode !== 0) return { available: false, version: null, detectedAt }
  const version = result.stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) => line.length > 0)
  return { available: version !== undefined, version: version ?? null, detectedAt }
}
