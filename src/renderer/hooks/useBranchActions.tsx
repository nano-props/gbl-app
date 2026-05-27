import { useState } from 'react'
import { Trans } from 'react-i18next'
import { useReposStore } from '#/renderer/stores/repos/store.ts'
import type { RepoState } from '#/renderer/stores/repos/types.ts'
import { useT } from '#/renderer/stores/i18n.ts'
import { ConfirmDialog } from '#/renderer/components/ConfirmDialog.tsx'
import { ConfirmCheckbox } from '#/renderer/components/ConfirmCheckbox.tsx'
import { tildify } from '#/renderer/lib/paths.ts'
import type { BranchInfo, ExecResult } from '#/renderer/types.ts'
import { PROTECTED_BRANCHES } from '#/shared/git-types.ts'
import { rpc } from '#/renderer/rpc.ts'
import {
  branchActionDisplayPhase,
  branchActionBusyItemId,
  cancelableBranchActionItemId,
  isBranchActionBlocked,
  type BranchActionItemId,
} from '#/renderer/hooks/branch-action-state.ts'
import { useAsyncPending } from '#/renderer/hooks/useAsyncPending.ts'

export type { BranchActionItemId } from '#/renderer/hooks/branch-action-state.ts'

const SILENT_SUCCESS_OPS = new Set<BranchActionItemId>(['remote', 'terminal', 'editor'])
type LocalBranchActionItemId = 'copyPatch' | 'remote' | 'terminal' | 'editor'

export interface BranchActionCapabilities {
  isCurrent: boolean
  checkedOutInAnotherWorktree: boolean
  canRemoveWorktree: boolean
  isRegularBranch: boolean
  canCopyPatch: boolean
  canPull: boolean
  canPush: boolean
  canOpenRemote: boolean
  canOpenTerminal: boolean
  canOpenEditor: boolean
}

interface RemoveConfirm {
  branch: string
  path: string
}

export function getBranchActionCapabilities(repo: RepoState, branch: BranchInfo): BranchActionCapabilities {
  const isCurrent = branch.name === repo.data.currentBranch
  const checkedOutInAnotherWorktree = !!branch.worktreePath && !isCurrent
  const canRemoveWorktree = checkedOutInAnotherWorktree && !branch.worktreeIsPrimary
  const isProtected = PROTECTED_BRANCHES.has(branch.name)
  const isRegularBranch = !isCurrent && !branch.worktreePath && !isProtected
  const changedStatus = branch.worktreePath ? repo.data.status.find((wt) => wt.path === branch.worktreePath) : null
  const canCopyPatch = !!branch.worktreePath && (changedStatus?.entries.length ?? 0) > 0
  return {
    isCurrent,
    checkedOutInAnotherWorktree,
    canRemoveWorktree,
    isRegularBranch,
    canCopyPatch,
    canPull: !!branch.tracking,
    canPush: repo.remote.hasRemotes === true,
    canOpenRemote: repo.remote.hasBrowserRemote === true || repo.remote.hasGitHubRemote === true,
    canOpenTerminal: !!branch.worktreePath,
    canOpenEditor: !!branch.worktreePath,
  }
}

export function useBranchActions(repo: RepoState, branch: BranchInfo) {
  const t = useT()
  const setLastResult = useReposStore((s) => s.setLastResult)
  const runBranchAction = useReposStore((s) => s.runBranchAction)
  const cancelBranchAction = useReposStore((s) => s.cancelBranchAction)
  const branchActionBusy = isBranchActionBlocked(repo)
  const branchBusyAction = branchActionBusyItemId(repo, branch.name)
  const branchActionPhase = branchActionDisplayPhase(repo, branch.name)
  const cancelableBranchAction = cancelableBranchActionItemId(repo, branch.name)
  const {
    pending: pendingLocalAction,
    hasPending: hasPendingLocalAction,
    run: runPendingLocalAction,
  } = useAsyncPending<LocalBranchActionItemId>()
  const [pushConfirm, setPushConfirm] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [forceDeleteConfirm, setForceDeleteConfirm] = useState<string | null>(null)
  const [removeConfirm, setRemoveConfirm] = useState<RemoveConfirm | null>(null)
  const [forceRemoveConfirm, setForceRemoveConfirm] = useState<RemoveConfirm | null>(null)
  const [removeAlsoDeletes, setRemoveAlsoDeletes] = useState(true)
  const [deleteAlsoUpstream, setDeleteAlsoUpstream] = useState(false)
  const [removeAlsoUpstream, setRemoveAlsoUpstream] = useState(false)
  const hasUpstream = !!branch.tracking && !branch.trackingGone

  function runUiAction(
    op: LocalBranchActionItemId,
    fn: () => Promise<ExecResult>,
    options?: { handleResult?: (result: ExecResult) => boolean },
  ) {
    if (branchActionBusy || hasPendingLocalAction()) return
    const pending = runPendingLocalAction(op, async () => {
      const token = repo.instanceToken
      let result: ExecResult
      try {
        result = await fn()
      } catch (err) {
        result = { ok: false, message: err instanceof Error ? err.message : String(err) }
      }
      if (!result.ok && result.message === 'cancelled') return
      if (options?.handleResult?.(result)) return
      const skipSuccessToast = result.ok && SILENT_SUCCESS_OPS.has(op)
      if (!skipSuccessToast) setLastResult(repo.id, result, token)
    })
    if (pending) return Promise.resolve(pending).then(() => undefined)
  }

  async function runRepoAction(
    action: Parameters<typeof runBranchAction>[1],
    options?: { deferResultMessages?: string[]; handleResult?: (result: ExecResult) => boolean },
  ) {
    if (branchActionBusy || hasPendingLocalAction()) return
    const result = await runBranchAction(repo.id, action, {
      token: repo.instanceToken,
      deferResultMessages: options?.deferResultMessages,
    })
    if (!result || (!result.ok && result.message === 'cancelled')) return
    options?.handleResult?.(result)
  }

  function copyPatch() {
    if (!branch.worktreePath) return
    const worktreePath = branch.worktreePath
    return runUiAction('copyPatch', async () => {
      const result = await rpc.repo.patch.mutate({ cwd: repo.id, worktreePath })
      if (!result.ok) return { ok: false, message: result.message }
      if (!result.message) return { ok: false, message: 'status.copy-patch-empty' }
      try {
        await navigator.clipboard.writeText(result.message)
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : String(err) }
      }
      return { ok: true, message: 'status.copy-patch-ok' }
    })
  }

  function checkout() {
    return runRepoAction({ kind: 'checkout', branch: branch.name })
  }

  function pull() {
    if (cancelableBranchAction === 'pull' && branchActionPhase !== null) {
      cancelBranchAction(repo.id, { token: repo.instanceToken })
      return
    }
    return runRepoAction({ kind: 'pull', branch: branch.name, worktreePath: branch.worktreePath })
  }

  function push() {
    if (cancelableBranchAction === 'push' && branchActionPhase !== null) {
      cancelBranchAction(repo.id, { token: repo.instanceToken })
      return
    }
    if (branchActionBusy || hasPendingLocalAction()) return
    if (PROTECTED_BRANCHES.has(branch.name)) {
      setPushConfirm(branch.name)
      return
    }
    return runRepoAction({ kind: 'push', branch: branch.name })
  }

  function openTerminal() {
    if (!branch.worktreePath) return
    const worktreePath = branch.worktreePath
    return runUiAction('terminal', () => rpc.repo.openTerminal.mutate({ path: worktreePath }))
  }

  function openEditor() {
    if (!branch.worktreePath) return
    const worktreePath = branch.worktreePath
    return runUiAction('editor', () => rpc.repo.openEditor.mutate({ path: worktreePath }))
  }

  function openRemote() {
    return runUiAction('remote', () => rpc.repo.openRemote.mutate({ cwd: repo.id, branch: branch.name }))
  }

  function requestDeleteBranch() {
    if (branchActionBusy || hasPendingLocalAction()) return
    setDeleteAlsoUpstream(false)
    setDeleteConfirm(branch.name)
  }

  function requestRemoveWorktree() {
    if (branchActionBusy || hasPendingLocalAction() || !branch.worktreePath) return
    setRemoveAlsoDeletes(!PROTECTED_BRANCHES.has(branch.name))
    setRemoveAlsoUpstream(false)
    setRemoveConfirm({ branch: branch.name, path: branch.worktreePath })
  }

  function deleteBranch(target: string, force = false, alsoDeleteUpstream = false) {
    return runRepoAction(
      { kind: 'deleteBranch', branch: target, force, alsoDeleteUpstream },
      {
        deferResultMessages: force ? [] : ['error.branch-not-fully-merged'],
        handleResult: (result) => {
          if (!force && !result.ok && result.message === 'error.branch-not-fully-merged') {
            setForceDeleteConfirm(target)
            return true
          }
          return false
        },
      },
    )
  }

  function removeWorktree(
    target: RemoveConfirm,
    alsoDeleteBranch: boolean,
    forceDeleteBranch: boolean,
    alsoDeleteUpstream = false,
  ) {
    return runRepoAction(
      {
        kind: 'removeWorktree',
        branch: target.branch,
        worktreePath: target.path,
        alsoDeleteBranch,
        forceDeleteBranch,
        alsoDeleteUpstream,
      },
      {
        deferResultMessages: alsoDeleteBranch && !forceDeleteBranch ? ['error.cannot-remove-unpushed-worktree'] : [],
        handleResult: (result) => {
          if (
            !result.ok &&
            result.message === 'error.cannot-remove-unpushed-worktree' &&
            alsoDeleteBranch &&
            !forceDeleteBranch
          ) {
            setForceRemoveConfirm(target)
            return true
          }
          return false
        },
      },
    )
  }

  const capabilities = getBranchActionCapabilities(repo, branch)
  const removeConfirmProtected = removeConfirm ? PROTECTED_BRANCHES.has(removeConfirm.branch) : false

  const dialogs = (
    <>
      <ConfirmDialog
        open={pushConfirm !== null}
        title={pushConfirm ? t('action.confirm-push-protected-title', { branch: pushConfirm }) : ''}
        message={
          pushConfirm ? (
            <Trans
              i18nKey="action.confirm-push-protected-body"
              values={{ branch: pushConfirm }}
              components={{ branch: <b className="text-foreground" /> }}
            />
          ) : (
            ''
          )
        }
        confirmLabel={t('action.confirm-push-confirm')}
        destructive
        onCancel={() => setPushConfirm(null)}
        onConfirm={() => {
          const target = pushConfirm
          setPushConfirm(null)
          if (target) void runRepoAction({ kind: 'push', branch: target })
        }}
      />
      <ConfirmDialog
        open={deleteConfirm !== null}
        title={deleteConfirm ? t('action.confirm-delete-branch-title', { branch: deleteConfirm }) : ''}
        message={
          deleteConfirm ? (
            <div className="space-y-3">
              <Trans
                i18nKey="action.confirm-delete-branch-body"
                values={{ branch: deleteConfirm }}
                components={{ branch: <b className="text-foreground" /> }}
              />
              {hasUpstream && (
                <ConfirmCheckbox checked={deleteAlsoUpstream} onCheckedChange={setDeleteAlsoUpstream} destructive>
                  {t('action.confirm-delete-branch-also-delete-upstream', { tracking: branch.tracking! })}
                </ConfirmCheckbox>
              )}
            </div>
          ) : (
            ''
          )
        }
        confirmLabel={t('action.confirm-delete-branch-confirm')}
        destructive
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => {
          const target = deleteConfirm
          const upstream = deleteAlsoUpstream
          setDeleteConfirm(null)
          if (target) void deleteBranch(target, false, upstream)
        }}
      />
      <ConfirmDialog
        open={forceDeleteConfirm !== null}
        title={
          forceDeleteConfirm ? t('action.confirm-force-delete-standalone-title', { branch: forceDeleteConfirm }) : ''
        }
        message={
          forceDeleteConfirm ? (
            <div className="space-y-3">
              <Trans
                i18nKey="action.confirm-force-delete-standalone-body"
                values={{ branch: forceDeleteConfirm }}
                components={{ branch: <b className="text-foreground" /> }}
              />
              {hasUpstream && (
                <ConfirmCheckbox checked={deleteAlsoUpstream} onCheckedChange={setDeleteAlsoUpstream} destructive>
                  {t('action.confirm-delete-branch-also-delete-upstream', { tracking: branch.tracking! })}
                </ConfirmCheckbox>
              )}
            </div>
          ) : (
            ''
          )
        }
        confirmLabel={t('action.confirm-force-delete-standalone-confirm')}
        destructive
        onCancel={() => setForceDeleteConfirm(null)}
        onConfirm={() => {
          const target = forceDeleteConfirm
          const upstream = deleteAlsoUpstream
          setForceDeleteConfirm(null)
          if (target) void deleteBranch(target, true, upstream)
        }}
      />
      <ConfirmDialog
        open={removeConfirm !== null}
        title={removeConfirm ? t('action.confirm-remove-worktree-title', { branch: removeConfirm.branch }) : ''}
        message={
          removeConfirm ? (
            <div className="space-y-3">
              <Trans
                i18nKey="action.confirm-remove-worktree-body"
                values={{ path: tildify(removeConfirm.path) }}
                components={{ path: <b className="text-foreground" /> }}
              />
              <ConfirmCheckbox
                checked={removeAlsoDeletes}
                disabled={removeConfirmProtected}
                describedBy={removeConfirmProtected ? 'remove-worktree-protected-hint' : undefined}
                onCheckedChange={setRemoveAlsoDeletes}
                destructive
                title={removeConfirmProtected ? t('action.confirm-remove-worktree-protected-hint') : undefined}
              >
                {t('action.confirm-remove-worktree-also-delete-branch', { branch: removeConfirm.branch })}
              </ConfirmCheckbox>
              {removeConfirmProtected && (
                <div id="remove-worktree-protected-hint" className="text-xs text-muted-foreground">
                  {t('action.confirm-remove-worktree-protected-hint')}
                </div>
              )}
              {removeAlsoDeletes && hasUpstream && !removeConfirmProtected && (
                <ConfirmCheckbox checked={removeAlsoUpstream} onCheckedChange={setRemoveAlsoUpstream} destructive>
                  {t('action.confirm-delete-branch-also-delete-upstream', { tracking: branch.tracking! })}
                </ConfirmCheckbox>
              )}
            </div>
          ) : (
            ''
          )
        }
        confirmLabel={t('action.confirm-remove-worktree-confirm')}
        destructive
        onCancel={() => setRemoveConfirm(null)}
        onConfirm={() => {
          const target = removeConfirm
          const alsoDelete = removeAlsoDeletes
          const upstream = removeAlsoUpstream
          setRemoveConfirm(null)
          if (target) void removeWorktree(target, alsoDelete, false, upstream)
        }}
      />
      <ConfirmDialog
        open={forceRemoveConfirm !== null}
        title={
          forceRemoveConfirm ? t('action.confirm-force-delete-branch-title', { branch: forceRemoveConfirm.branch }) : ''
        }
        message={
          forceRemoveConfirm ? (
            <div className="space-y-3">
              <span>{t('action.confirm-force-delete-branch-body', { branch: forceRemoveConfirm.branch })}</span>
              {hasUpstream && (
                <ConfirmCheckbox checked={removeAlsoUpstream} onCheckedChange={setRemoveAlsoUpstream} destructive>
                  {t('action.confirm-delete-branch-also-delete-upstream', { tracking: branch.tracking! })}
                </ConfirmCheckbox>
              )}
            </div>
          ) : (
            ''
          )
        }
        confirmLabel={t('action.confirm-force-delete-branch-confirm')}
        destructive
        onCancel={() => setForceRemoveConfirm(null)}
        onConfirm={() => {
          const target = forceRemoveConfirm
          const upstream = removeAlsoUpstream
          setForceRemoveConfirm(null)
          if (target) void removeWorktree(target, true, true, upstream)
        }}
      />
    </>
  )

  return {
    blocked: branchActionBusy || pendingLocalAction !== null,
    busyAction: pendingLocalAction ?? branchBusyAction,
    capabilities,
    actions: {
      copyPatch,
      checkout,
      pull,
      push,
      openTerminal,
      openEditor,
      openRemote,
      requestDeleteBranch,
      requestRemoveWorktree,
    },
    dialogs,
  }
}
