import type { ReposStore } from '#/renderer/stores/repos/types.ts'
import type { TerminalDescriptor } from '#/renderer/components/terminal/types.ts'

export function terminalSessionKey(repoRoot: string, worktreePath: string): string {
  return `${repoRoot}\0${worktreePath}`
}

export function isTerminalDescriptorLive(repos: ReposStore['repos'], descriptor: TerminalDescriptor): boolean {
  const repo = repos[descriptor.repoRoot]
  return !!repo?.data.branches.some((branch) => branch.worktreePath === descriptor.worktreePath)
}
