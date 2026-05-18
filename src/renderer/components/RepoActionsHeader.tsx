// Repo-level chrome buttons. Two actions sit here, both unrelated to
// any single branch:
//
//   Refresh — re-runs git ops to rebuild the local snapshot (branches,
//             status, log) from the current on-disk state. Used as a
//             manual nudge when the user knows external changes have
//             happened (a CLI commit in another window, a worktree
//             switch outside the app) and doesn't want to wait for the
//             background fetch / file watcher.
//
//   Fetch   — `git fetch --all --prune` on origin. Network-bound, so
//             cancellable; while in flight the button swaps to a red
//             X that aborts the underlying git child. Without that a
//             stuck SSH connection would lock the UI for the full
//             network timeout (~90s).
//
// Branch-scoped operations (Checkout / Pull / Push / Open in Ghostty
// / Open in GitHub) live in `BranchActionsMenu` on each branch row,
// not here — those need a branch context to be meaningful.

import { useState } from 'react'
import { CloudDownload, RotateCw, X } from 'lucide-react'
import { useReposStore, type RepoState } from '#/renderer/stores/repos.ts'
import { useT } from '#/renderer/stores/i18n.ts'
import { Tip } from '#/renderer/components/Tip.tsx'
import { Button } from '#/renderer/components/ui/button.tsx'

interface Props {
  repo: RepoState
}

export function RepoActionsHeader({ repo }: Props) {
  const t = useT()
  const setLastResult = useReposStore((s) => s.setLastResult)
  const refreshAll = useReposStore((s) => s.refreshAll)
  const refreshSnapshot = useReposStore((s) => s.refreshSnapshot)
  const clearFetchFailed = useReposStore((s) => s.clearFetchFailed)
  const [fetchBusy, setFetchBusy] = useState(false)
  const [refreshBusy, setRefreshBusy] = useState(false)

  async function handleRefresh() {
    if (refreshBusy) return
    setRefreshBusy(true)
    try {
      await refreshAll(repo.id)
    } finally {
      setRefreshBusy(false)
    }
  }

  async function handleFetch() {
    if (fetchBusy) return
    setFetchBusy(true)
    try {
      const result = await window.gbl.fetch(repo.id)
      if (!result.ok && result.message === 'cancelled') return
      setLastResult(repo.id, result)
      // Fetch can move the upstream pointer (origin's refs change), so
      // the snapshot needs to re-read ahead/behind counts. It doesn't
      // touch the working tree, so status is intentionally not
      // re-fetched here — the badge stays correct.
      await refreshSnapshot(repo.id)
      if (result.ok) clearFetchFailed(repo.id)
    } finally {
      setFetchBusy(false)
    }
  }

  function handleCancel() {
    void window.gbl.abort(repo.id).catch(() => {
      /* preload already logs; the in-flight git fetch will resolve as
       * cancelled even if the abort signal didn't reach the child. */
    })
  }

  // Both buttons carry their label inline — earlier revisions used
  // size="icon" with two refresh-like glyphs (RefreshCcw / RefreshCw)
  // that read as the same icon at 14px and made the user guess which
  // was which. The labels remove that ambiguity at the cost of a
  // little extra width; tooltips still elaborate on what each does.
  return (
    <div className="flex items-center gap-1">
      <Tip label={t('action.refreshTitle')}>
        <Button variant="ghost" onClick={handleRefresh} disabled={refreshBusy}>
          <RotateCw className={refreshBusy ? 'animate-spin' : ''} />
          {t('action.refresh')}
        </Button>
      </Tip>
      {fetchBusy ? (
        <Tip label={t('action.cancelTitle', { op: t('action.fetch') })}>
          <Button variant="destructive-soft" onClick={handleCancel}>
            <X />
            {t('action.cancel')}
          </Button>
        </Tip>
      ) : (
        <Tip label={t('action.fetchTitle')}>
          <Button variant="ghost" onClick={handleFetch}>
            <CloudDownload />
            {t('action.fetch')}
          </Button>
        </Tip>
      )}
    </div>
  )
}
