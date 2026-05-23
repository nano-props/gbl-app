import { useRef, useState } from 'react'
import { repoBranchActionKindFromReason } from '#/renderer/stores/repos/branch-actions.ts'
import { operationBusy } from '#/renderer/stores/repos/operations.ts'
import { useReposStore } from '#/renderer/stores/repos/store.ts'
import type { RepoState } from '#/renderer/stores/repos/types.ts'
import { useT } from '#/renderer/stores/i18n.ts'
import { ConfirmDialog } from '#/renderer/components/ConfirmDialog.tsx'
import { tildify } from '#/renderer/lib/paths.ts'
import type { BranchInfo, ExecResult } from '#/renderer/types.ts'
import { PROTECTED_BRANCHES } from '#/shared/git-types.ts'
import { rpc } from '#/renderer/rpc.ts'

export type BranchUiAction =
  | 'copyPatch'
  | 'checkout'
  | 'pull'
  | 'push'
  | 'createWorktree'
  | 'github'
  | 'terminal'
  | 'editor'
  | 'deleteBranch'
  | 'removeWorktree'

const SILENT_SUCCESS_OPS = new Set<BranchUiAction>(['github', 'terminal', 'editor'])

interface RemoveConfirm {
  branch: string
  path: string
}

export function useBranchActions(repo: RepoState, branch: BranchInfo) {
  const t = useT()
  const setLastResult = useReposStore((s) => s.setLastResult)
  const runBranchAction = useReposStore((s) => s.runBranchAction)
  const branchActionBusy = operationBusy(repo.ops.branchAction, { includeSilent: true })
  const branchActionBusyKind = branchActionBusy ? repoBranchActionKindFromReason(repo.ops.branchAction.reason) : null
  const localUiBusyRef = useRef<BranchUiAction | null>(null)
  const [localUiBusy, setLocalUiBusy] = useState<BranchUiAction | null>(null)
  const [pushConfirm, setPushConfirm] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [forceDeleteConfirm, setForceDeleteConfirm] = useState<string | null>(null)
  const [removeConfirm, setRemoveConfirm] = useState<RemoveConfirm | null>(null)
  const [forceRemoveConfirm, setForceRemoveConfirm] = useState<RemoveConfirm | null>(null)
  const [removeAlsoDeletes, setRemoveAlsoDeletes] = useState(true)

  async function runUiAction(
    op: BranchUiAction,
    fn: () => Promise<ExecResult>,
    options?: { handleResult?: (result: ExecResult) => boolean },
  ) {
    if (localUiBusyRef.current || branchActionBusy) return
    localUiBusyRef.current = op
    setLocalUiBusy(op)
    const token = repo.instanceToken
    try {
      const result = await fn()
      if (!result.ok && result.message === 'cancelled') return
      if (options?.handleResult?.(result)) return
      const skipSuccessToast = result.ok && SILENT_SUCCESS_OPS.has(op)
      if (!skipSuccessToast) setLastResult(repo.id, result, token)
    } finally {
      localUiBusyRef.current = null
      setLocalUiBusy(null)
    }
  }

  async function runRepoAction(
    op: Extract<BranchUiAction, 'checkout' | 'pull' | 'push' | 'deleteBranch' | 'removeWorktree'>,
    action: Parameters<typeof runBranchAction>[1],
    options?: { deferResultMessages?: string[]; handleResult?: (result: ExecResult) => boolean },
  ) {
    if (localUiBusyRef.current || branchActionBusy) return
    localUiBusyRef.current = op
    setLocalUiBusy(op)
    try {
      const result = await runBranchAction(repo.id, action, {
        token: repo.instanceToken,
        deferResultMessages: options?.deferResultMessages,
      })
      if (!result || (!result.ok && result.message === 'cancelled')) return
      options?.handleResult?.(result)
    } finally {
      localUiBusyRef.current = null
      setLocalUiBusy(null)
    }
  }

  function copyPatch() {
    if (!branch.worktreePath) return
    const worktreePath = branch.worktreePath
    void runUiAction('copyPatch', async () => {
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
    void runRepoAction('checkout', { kind: 'checkout', branch: branch.name })
  }

  function pull() {
    void runRepoAction('pull', { kind: 'pull', branch: branch.name, worktreePath: branch.worktreePath })
  }

  function push() {
    if (localUiBusyRef.current || branchActionBusy) return
    if (PROTECTED_BRANCHES.has(branch.name)) {
      setPushConfirm(branch.name)
      return
    }
    void runRepoAction('push', { kind: 'push', branch: branch.name })
  }

  function openTerminal() {
    if (!branch.worktreePath) return
    const worktreePath = branch.worktreePath
    void runUiAction('terminal', () => rpc.repo.openTerminal.mutate({ path: worktreePath }))
  }

  function openEditor() {
    if (!branch.worktreePath) return
    const worktreePath = branch.worktreePath
    void runUiAction('editor', () => rpc.repo.openEditor.mutate({ path: worktreePath }))
  }

  function openGitHub() {
    void runUiAction('github', () => rpc.repo.openGitHub.mutate({ cwd: repo.id, branch: branch.name }))
  }

  function requestDeleteBranch() {
    if (localUiBusyRef.current || branchActionBusy) return
    setDeleteConfirm(branch.name)
  }

  function requestRemoveWorktree() {
    if (localUiBusyRef.current || branchActionBusy || !branch.worktreePath) return
    setRemoveAlsoDeletes(!PROTECTED_BRANCHES.has(branch.name))
    setRemoveConfirm({ branch: branch.name, path: branch.worktreePath })
  }

  function deleteBranch(target: string, force = false) {
    void runRepoAction(
      'deleteBranch',
      { kind: 'deleteBranch', branch: target, force },
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

  function removeWorktree(target: RemoveConfirm, alsoDeleteBranch: boolean, forceDeleteBranch: boolean) {
    void runRepoAction(
      'removeWorktree',
      {
        kind: 'removeWorktree',
        branch: target.branch,
        worktreePath: target.path,
        alsoDeleteBranch,
        forceDeleteBranch,
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

  const isCurrent = branch.name === repo.data.currentBranch
  const checkedOutInAnotherWorktree = !!branch.worktreePath && !isCurrent
  const canRemoveWorktree = checkedOutInAnotherWorktree && !branch.worktreeIsPrimary
  const isProtected = PROTECTED_BRANCHES.has(branch.name)
  const isRegularBranch = !isCurrent && !branch.worktreePath && !isProtected
  const changedStatus = branch.worktreePath ? repo.data.status.find((wt) => wt.path === branch.worktreePath) : null
  const canCopyPatch = !!branch.worktreePath && (changedStatus?.entries.length ?? 0) > 0
  const removeConfirmProtected = removeConfirm ? PROTECTED_BRANCHES.has(removeConfirm.branch) : false

  const dialogs = (
    <>
      <ConfirmDialog
        open={pushConfirm !== null}
        title={pushConfirm ? t('action.confirm-push-protected-title', { branch: pushConfirm }) : ''}
        message={
          pushConfirm ? (
            <span>
              {t('action.confirm-push-protected-body.before')}
              <b className="text-foreground">{pushConfirm}</b>
              {t('action.confirm-push-protected-body.after')}
            </span>
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
          if (target) void runRepoAction('push', { kind: 'push', branch: target })
        }}
      />
      <ConfirmDialog
        open={deleteConfirm !== null}
        title={deleteConfirm ? t('action.confirm-delete-branch-title', { branch: deleteConfirm }) : ''}
        message={
          deleteConfirm ? (
            <span>
              {t('action.confirm-delete-branch-body.before')}
              <b className="text-foreground">{deleteConfirm}</b>
              {t('action.confirm-delete-branch-body.after')}
            </span>
          ) : (
            ''
          )
        }
        confirmLabel={t('action.confirm-delete-branch-confirm')}
        destructive
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => {
          const target = deleteConfirm
          setDeleteConfirm(null)
          if (target) deleteBranch(target)
        }}
      />
      <ConfirmDialog
        open={forceDeleteConfirm !== null}
        title={
          forceDeleteConfirm ? t('action.confirm-force-delete-standalone-title', { branch: forceDeleteConfirm }) : ''
        }
        message={
          forceDeleteConfirm ? (
            <span>
              {t('action.confirm-force-delete-standalone-body.before')}
              <b className="text-foreground">{forceDeleteConfirm}</b>
              {t('action.confirm-force-delete-standalone-body.after')}
            </span>
          ) : (
            ''
          )
        }
        confirmLabel={t('action.confirm-force-delete-standalone-confirm')}
        destructive
        onCancel={() => setForceDeleteConfirm(null)}
        onConfirm={() => {
          const target = forceDeleteConfirm
          setForceDeleteConfirm(null)
          if (target) deleteBranch(target, true)
        }}
      />
      <ConfirmDialog
        open={removeConfirm !== null}
        title={removeConfirm ? t('action.confirm-remove-worktree-title', { branch: removeConfirm.branch }) : ''}
        message={
          removeConfirm ? (
            <div className="space-y-3">
              <span>
                {t('action.confirm-remove-worktree-body.before')}
                <b className="text-foreground">{tildify(removeConfirm.path)}</b>
                {t('action.confirm-remove-worktree-body.after')}
              </span>
              <label
                className={
                  removeConfirmProtected
                    ? 'flex items-center gap-2 text-muted-foreground select-none cursor-not-allowed'
                    : 'flex items-center gap-2 text-foreground cursor-pointer select-none'
                }
                title={removeConfirmProtected ? t('action.confirm-remove-worktree-protected-hint') : undefined}
              >
                <input
                  type="checkbox"
                  checked={removeAlsoDeletes}
                  disabled={removeConfirmProtected}
                  aria-describedby={removeConfirmProtected ? 'remove-worktree-protected-hint' : undefined}
                  onChange={(e) => setRemoveAlsoDeletes(e.target.checked)}
                  className="h-4 w-4 accent-destructive disabled:opacity-50"
                />
                <span>{t('action.confirm-remove-worktree-also-delete-branch', { branch: removeConfirm.branch })}</span>
              </label>
              {removeConfirmProtected && (
                <div id="remove-worktree-protected-hint" className="text-xs text-muted-foreground">
                  {t('action.confirm-remove-worktree-protected-hint')}
                </div>
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
          setRemoveConfirm(null)
          if (target) removeWorktree(target, alsoDelete, false)
        }}
      />
      <ConfirmDialog
        open={forceRemoveConfirm !== null}
        title={
          forceRemoveConfirm ? t('action.confirm-force-delete-branch-title', { branch: forceRemoveConfirm.branch }) : ''
        }
        message={
          forceRemoveConfirm ? (
            <span>{t('action.confirm-force-delete-branch-body', { branch: forceRemoveConfirm.branch })}</span>
          ) : (
            ''
          )
        }
        confirmLabel={t('action.confirm-force-delete-branch-confirm')}
        destructive
        onCancel={() => setForceRemoveConfirm(null)}
        onConfirm={() => {
          const target = forceRemoveConfirm
          setForceRemoveConfirm(null)
          if (target) removeWorktree(target, true, true)
        }}
      />
    </>
  )

  return {
    busy: localUiBusy ?? branchActionBusyKind,
    capabilities: {
      isCurrent,
      checkedOutInAnotherWorktree,
      canRemoveWorktree,
      isRegularBranch,
      canCopyPatch,
      canPull: !!branch.tracking,
      canOpenTerminal: !!branch.worktreePath,
      canOpenEditor: !!branch.worktreePath,
    },
    actions: {
      copyPatch,
      checkout,
      pull,
      push,
      openTerminal,
      openEditor,
      openGitHub,
      requestDeleteBranch,
      requestRemoveWorktree,
    },
    dialogs,
  }
}
