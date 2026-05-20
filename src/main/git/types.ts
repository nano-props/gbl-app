// Re-export shared git types so existing imports under `#/main/git/types.ts`
// keep working without each main module having to learn the new shared
// path. New code should import from `#/shared/git-types.ts` directly.

export type {
  BranchInfo,
  WorktreeInfo,
  StatusEntry,
  WorktreeStatus,
  LogEntry,
  ExecResult,
  PullRequestInfo,
} from '#/shared/git-types.ts'
