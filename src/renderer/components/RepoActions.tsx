// Right-aligned operation buttons in the repo header. All ops act on
// the *selected* branch (which defaults to current branch on first load),
// not the current branch — this matches how gbl CLI works: the user
// navigates to a row and then acts on it.
//
// `busy` gates simultaneous ops: while one is running every button
// dims, so a user hammering Pull then Push doesn't queue them up.
//
// Network ops (pull/push/fetch) are cancellable: while one is running
// the matching button morphs into "Cancel", and clicking it sends an
// abort to main which kills the underlying git child process. Without
// this a stuck SSH connection would lock the UI for the full network
// timeout (90s).

import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, GitBranch, Loader2, RefreshCw, X } from 'lucide-react'
import { useReposStore, type RepoState } from '#/renderer/stores/repos.ts'
import { useT } from '#/renderer/stores/i18n.ts'
import { ConfirmDialog } from '#/renderer/components/ConfirmDialog.tsx'
import { Tip } from '#/renderer/components/Tip.tsx'
import { cn } from '#/renderer/lib/cn.ts'

const PROTECTED_BRANCHES = new Set(['main', 'master', 'develop', 'trunk'])

type Op = 'checkout' | 'pull' | 'push' | 'fetch' | 'github'
const CANCELLABLE_OPS = new Set<Op>(['pull', 'push', 'fetch'])

interface Props {
  repo: RepoState
}

export function RepoActions({ repo }: Props) {
  const t = useT()
  const refreshSnapshot = useReposStore((s) => s.refreshSnapshot)
  const refreshStatus = useReposStore((s) => s.refreshStatus)
  const setLastResult = useReposStore((s) => s.setLastResult)
  const clearFetchFailed = useReposStore((s) => s.clearFetchFailed)
  const [busy, setBusy] = useState<Op | null>(null)
  const [pushConfirm, setPushConfirm] = useState<string | null>(null)

  const branch = repo.selectedBranch ?? repo.currentBranch
  const branchInfo = repo.branches.find((b) => b.name === branch)

  async function run(op: Op, fn: () => Promise<{ ok: boolean; message: string }>) {
    if (busy) return
    setBusy(op)
    try {
      const result = await fn()
      // Cancellation isn't a failure to surface as a red toast — the
      // user explicitly asked for it. Skip the toast and the snapshot
      // refresh (the underlying repo state didn't change).
      if (!result.ok && result.message === 'cancelled') {
        return
      }
      setLastResult(repo.id, result)
      // Mutating ops change branch state — refresh the snapshot. GitHub
      // open is read-only on the repo so it skips the refresh.
      if (op !== 'github') {
        await refreshSnapshot(repo.id)
        if (repo.rightTab === 'status') await refreshStatus(repo.id)
      }
      // Manual fetch success clears the background-fetch failure badge
      // — the user just confirmed the remote is reachable.
      if (op === 'fetch' && result.ok) {
        clearFetchFailed(repo.id)
      }
    } finally {
      setBusy(null)
    }
  }

  // Abort the current network op. Main kills the git child; the in-
  // flight `run()` resolves with `{ ok:false, message:'cancelled' }` so
  // the toast shows the cancel rather than mistaking it for a real
  // error.
  function handleCancel() {
    void window.gbl.abort(repo.id)
  }

  const noBranch = !branch
  const isCurrent = branch === repo.currentBranch
  const inOtherWorktree = !!branchInfo?.worktreePath && !isCurrent
  const checkoutTitle = isCurrent
    ? t('action.checkoutCurrent')
    : inOtherWorktree
      ? t('action.checkoutInWorktree', { path: branchInfo?.worktreePath ?? '' })
      : t('action.checkoutTitle', { branch })

  function handlePush() {
    if (!branch) return
    if (PROTECTED_BRANCHES.has(branch)) {
      setPushConfirm(branch)
      return
    }
    void run('push', () => window.gbl.push(repo.id, branch))
  }

  /** Reusable spec for each action button so the cancel-in-progress
   *  swap is consistent. */
  interface BtnSpec {
    op: Op
    label: string
    title: string
    icon: ReactNode
    disabled: boolean
    onClick: () => void
  }
  const specs: BtnSpec[] = [
    {
      op: 'checkout',
      label: t('action.checkout'),
      title: checkoutTitle,
      icon: <GitBranch size={14} />,
      disabled: noBranch || isCurrent || inOtherWorktree || !!busy,
      onClick: () => run('checkout', () => window.gbl.checkout(repo.id, branch)),
    },
    {
      op: 'pull',
      label: t('action.pull'),
      title: branchInfo?.tracking
        ? t('action.pullFrom', { tracking: branchInfo.tracking })
        : t('action.pullNoUpstream'),
      icon: <ArrowDown size={14} />,
      disabled: noBranch || !branchInfo?.tracking || (!!busy && busy !== 'pull'),
      onClick: () => run('pull', () => window.gbl.pull(repo.id, branch, branchInfo?.worktreePath)),
    },
    {
      op: 'push',
      label: t('action.push'),
      title: t('action.pushTitle', { branch }),
      icon: <ArrowUp size={14} />,
      disabled: noBranch || (!!busy && busy !== 'push'),
      onClick: handlePush,
    },
    {
      op: 'fetch',
      label: t('action.fetch'),
      title: t('action.fetchTitle'),
      icon: <RefreshCw size={14} />,
      disabled: !!busy && busy !== 'fetch',
      onClick: () => run('fetch', () => window.gbl.fetch(repo.id)),
    },
    {
      op: 'github',
      label: t('action.github'),
      title: t('action.githubTitle'),
      icon: <ExternalLink size={14} />,
      disabled: !!busy,
      onClick: () => run('github', () => window.gbl.openGitHub(repo.id)),
    },
  ]

  return (
    <div className="flex items-center gap-1.5">
      {specs.map((spec) => {
        const isBusy = busy === spec.op
        const cancellable = CANCELLABLE_OPS.has(spec.op)
        if (isBusy && cancellable) {
          return (
            <ActionBtn
              key={spec.op}
              icon={
                <span className="relative inline-flex w-3.5 h-3.5">
                  <Loader2 size={14} className="absolute inset-0 animate-spin text-ink-3" />
                  <X size={10} className="absolute inset-0 m-auto" />
                </span>
              }
              label={t('action.cancel')}
              disabled={false}
              onClick={handleCancel}
              title={t('action.cancelTitle', { op: spec.label })}
              tone="danger"
            />
          )
        }
        return (
          <ActionBtn
            key={spec.op}
            icon={isBusy ? <Loader2 size={14} className="animate-spin" /> : spec.icon}
            label={spec.label}
            disabled={spec.disabled}
            onClick={spec.onClick}
            title={spec.title}
          />
        )
      })}

      <ConfirmDialog
        open={pushConfirm !== null}
        title={pushConfirm ? t('action.confirmPushProtectedTitle', { branch: pushConfirm }) : ''}
        message={
          pushConfirm ? (
            <span>
              {t('action.confirmPushProtectedBody.before')}
              <b className="text-ink">{pushConfirm}</b>
              {t('action.confirmPushProtectedBody.after')}
            </span>
          ) : (
            ''
          )
        }
        confirmLabel={t('action.confirmPushConfirm')}
        destructive
        onCancel={() => setPushConfirm(null)}
        onConfirm={() => {
          const target = pushConfirm
          setPushConfirm(null)
          if (target) void run('push', () => window.gbl.push(repo.id, target))
        }}
      />
    </div>
  )
}

interface ActionBtnProps {
  icon: ReactNode
  label: string
  disabled?: boolean
  onClick: () => void
  title?: string
  /** Visual treatment. `danger` is used for the in-progress "Cancel" swap. */
  tone?: 'default' | 'danger'
}

function ActionBtn({ icon, label, disabled, onClick, title, tone = 'default' }: ActionBtnProps) {
  // We deliberately avoid the native `disabled` attribute: a disabled
  // <button> doesn't dispatch pointer events, which means Radix
  // Tooltip can't see hover, and the user loses the explanation of
  // *why* the button is disabled — exactly when the explanation
  // matters most.
  //
  // Instead, we mark the button visually disabled and use
  // `aria-disabled` for AT, with an onClick guard short-circuiting
  // the action. Hover still flows to Radix Tooltip.
  const btn = (
    <button
      type="button"
      onClick={(e) => {
        if (disabled) {
          e.preventDefault()
          return
        }
        onClick()
      }}
      aria-disabled={disabled}
      aria-label={title ?? label}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs shadow-sm',
        tone === 'danger'
          ? 'border-[rgb(var(--color-danger-rgb)/0.4)] bg-[rgb(var(--color-danger-rgb)/0.08)] text-danger hover:bg-[rgb(var(--color-danger-rgb)/0.14)] cursor-pointer'
          : disabled
            ? 'border-line-2 bg-surface text-ink-4 cursor-not-allowed opacity-60'
            : 'border-line-2 bg-surface text-ink-2 hover:text-ink hover:bg-bg-deep cursor-pointer',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
  return title ? <Tip label={title}>{btn}</Tip> : btn
}
