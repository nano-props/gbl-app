// Multi-repo state. Each opened directory is a Repo identified by its
// absolute path (the toplevel returned by `git rev-parse --show-toplevel`,
// so opening a subdirectory dedupes against an already-open root).
//
// `order` controls left sidebar tab order; `activeId` is the visible
// repo on the right. Per-repo data (branches, log, status, worktrees,
// commit detail) lives inside `repos[id]` so each tab keeps its own
// scroll/selection state when the user flips between them.
//
// Race-condition defenses
//   - `instanceToken`: every time a repo is created/reset we mint a new
//     token. Async writers capture the token at call time and bail when
//     they observe a different token in `set()` — this guards against
//     a stale snapshot from before close-and-reopen overwriting fresh
//     data, and against late commit-detail / log responses landing in
//     the wrong repo.
//   - selection guards: `refreshLog` captures the branch at call time
//     and discards if the user moved on; same idea for `openCommit`.
//   - `inFlightFetchById`: `backgroundFetch` won't double-fire for the
//     same repo, no matter how often `App.tsx`'s effect re-runs.

import { create } from 'zustand'
import { arrayMove } from '@dnd-kit/sortable'
import type { BranchInfo, LogEntry, WorktreeStatus } from '#/renderer/types.ts'
import type { CommitDetail } from '#/renderer/types-bridge.ts'
import { lastPathSegment } from '#/renderer/lib/paths.ts'

export type RightTab = 'branches' | 'log' | 'status'

export interface RepoState {
  /** Absolute repo root — also the unique id. */
  id: string
  name: string
  /** Bumped on every fresh open so async writers can detect close-and-reopen. */
  instanceToken: number
  branches: BranchInfo[]
  currentBranch: string
  selectedBranch: string | null
  /** Log/status are tab-specific — only fetched when the user opens that tab. */
  log: LogEntry[]
  /** Working-tree status grouped by worktree (main worktree first). */
  status: WorktreeStatus[]
  rightTab: RightTab
  /** When set, the log view shows the commit detail overlay. */
  openCommit: CommitDetail | null
  loading: boolean
  /** True while a periodic background fetch is running — header indicator. */
  fetching: boolean
  /** True if the most recent background fetch failed (network down,
   *  remote refused, etc). Cleared on next success. UI badges this. */
  fetchFailed: boolean
  /** Last fetch failure message — populated when fetchFailed flips
   *  true. Surfaced as the title of the red badge so the user can
   *  hover and read why fetch is failing instead of just seeing a
   *  red dot. */
  fetchError: string | null
  /** Last error from a refresh — surfaces as a banner. Translation key
   *  if known, otherwise raw message. UI passes through `t()`. */
  error: string | null
  /** Last operation result — surfaces as a transient toast. */
  lastResult: { ok: boolean; message: string } | null
}

interface ReposStore {
  repos: Record<string, RepoState>
  order: string[]
  activeId: string | null
  /** Hydration flag — true once boot session is restored, so we don't
   *  overwrite the saved session with an empty one before restore. */
  sessionReady: boolean
  /** Paths from the previous session that didn't probe successfully on
   *  hydrate (folder moved/deleted, external drive not mounted). The
   *  sidebar surfaces them so the user knows why their tabs didn't all
   *  come back, and offers a "forget" action to remove them from the
   *  saved session. */
  missingFromSession: string[]

  openRepo: (path: string) => Promise<{ ok: boolean; message?: string }>
  closeRepo: (id: string) => void
  setActive: (id: string) => void
  /** Reorder the sidebar so `fromId` lands at `toId`'s position, using
   *  the same shift semantics as dnd-kit's `arrayMove` (the rest of the
   *  list closes the gap; later items shift up if `from < to`, down if
   *  `from > to`). No-op if either id is unknown or they're identical. */
  reorderRepos: (fromId: string, toId: string) => void
  setRightTab: (id: string, tab: RightTab) => void
  selectBranch: (id: string, branch: string) => void
  cycleActive: (direction: 1 | -1) => void
  /** Keyboard-driven checkout of the active repo's selected branch.
   *  Centralizes the eligibility checks the keyboard hook used to do. */
  checkoutSelected: () => Promise<void>

  refreshSnapshot: (id: string, options?: { silent?: boolean }) => Promise<void>
  refreshLog: (id: string) => Promise<void>
  refreshStatus: (id: string) => Promise<void>
  refreshAll: (id: string) => Promise<void>
  backgroundFetch: (id: string) => Promise<void>

  openCommit: (id: string, hash: string) => Promise<void>
  closeCommit: (id: string) => void

  setLastResult: (id: string, result: { ok: boolean; message: string } | null) => void
  hydrateSession: (openRepos: string[], activeRepo: string | null) => Promise<void>
  /** Drop the "missing" indicator for paths that failed to restore — the
   *  user has acknowledged them. */
  dismissMissing: () => void
  /** Clear the fetchFailed flag — called by manual fetch success and
   *  by an explicit refresh, so a stale badge doesn't follow the user
   *  around forever. */
  clearFetchFailed: (id: string) => void
}

let nextInstanceToken = 1
const inFlightFetchById = new Map<string, Promise<void>>()

function emptyRepo(id: string, name: string): RepoState {
  return {
    id,
    name,
    instanceToken: nextInstanceToken++,
    branches: [],
    currentBranch: '',
    selectedBranch: null,
    log: [],
    status: [],
    rightTab: 'branches',
    openCommit: null,
    loading: false,
    fetching: false,
    fetchFailed: false,
    fetchError: null,
    error: null,
    lastResult: null,
  }
}

/** Apply `mutator` to the repo at `id` only if its instanceToken still
 *  matches the captured one. Returns true on success, false when the
 *  repo was closed/recreated since the caller captured the token. */
function updateIfFresh(
  state: ReposStore,
  set: (partial: Partial<ReposStore> | ((s: ReposStore) => Partial<ReposStore>)) => void,
  id: string,
  token: number,
  mutator: (repo: RepoState) => RepoState,
): boolean {
  const repo = state.repos[id]
  if (!repo || repo.instanceToken !== token) return false
  set({ repos: { ...state.repos, [id]: mutator(repo) } })
  return true
}

export const useReposStore = create<ReposStore>((set, get) => ({
  repos: {},
  order: [],
  activeId: null,
  sessionReady: false,
  missingFromSession: [],

  async openRepo(p) {
    let probe
    try {
      probe = await window.gbl.probe(p)
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'error.notGitRepo' }
    }
    if (!probe?.ok || !probe.root) {
      return { ok: false, message: 'error.notGitRepo' }
    }
    const id = probe.root
    const name = probe.name ?? lastPathSegment(id)

    set((s) => {
      if (s.repos[id]) return { activeId: id }
      return {
        repos: { ...s.repos, [id]: emptyRepo(id, name) },
        order: [...s.order, id],
        activeId: id,
      }
    })

    void window.gbl.recordRecent(id, name).catch(() => {
      /* recents are advisory; failure is fine */
    })
    void get().refreshSnapshot(id)
    return { ok: true }
  },

  closeRepo(id) {
    // Drop any in-flight fetch tracking so a new openRepo of the same
    // path doesn't think a fetch is already running.
    inFlightFetchById.delete(id)
    // Tell main to abort any cancellable network op for this repo —
    // otherwise a `git push` started right before the user closed the
    // tab keeps running for up to the network timeout, charged to a
    // tab that no longer exists. Fire-and-forget; failure is fine.
    void window.gbl.abort(id).catch(() => {
      /* main may have nothing to abort — ignore */
    })
    set((s) => {
      if (!s.repos[id]) return s
      const repos = { ...s.repos }
      delete repos[id]
      const order = s.order.filter((x) => x !== id)
      let activeId = s.activeId
      // Slide focus to the right neighbour; fall back to the left if
      // we just removed the rightmost tab.
      if (activeId === id) {
        const idx = s.order.indexOf(id)
        activeId = order[idx] ?? order[idx - 1] ?? null
      }
      return { repos, order, activeId }
    })
  },

  setActive(id) {
    set((s) => (s.repos[id] ? { activeId: id } : s))
  },

  reorderRepos(fromId, toId) {
    if (fromId === toId) return
    set((s) => {
      const from = s.order.indexOf(fromId)
      const to = s.order.indexOf(toId)
      if (from === -1 || to === -1) return s
      return { order: arrayMove(s.order, from, to) }
    })
  },

  cycleActive(direction) {
    const { order, activeId } = get()
    if (order.length === 0) return
    const idx = activeId ? order.indexOf(activeId) : 0
    const nextIdx = (idx + direction + order.length) % order.length
    const next = order[nextIdx]
    if (next) set({ activeId: next })
  },

  setRightTab(id, tab) {
    set((s) => {
      const repo = s.repos[id]
      if (!repo) return s
      return { repos: { ...s.repos, [id]: { ...repo, rightTab: tab, openCommit: null } } }
    })
    // Lazy-load tab content so the initial Branches view is fast.
    if (tab === 'log') void get().refreshLog(id)
    if (tab === 'status') void get().refreshStatus(id)
  },

  selectBranch(id, branch) {
    set((s) => {
      const repo = s.repos[id]
      if (!repo) return s
      return { repos: { ...s.repos, [id]: { ...repo, selectedBranch: branch } } }
    })
    // Refresh log against the new branch if the Log tab is showing.
    const repo = get().repos[id]
    if (repo?.rightTab === 'log') void get().refreshLog(id)
  },

  async checkoutSelected() {
    const state = get()
    const id = state.activeId
    if (!id) return
    const repo = state.repos[id]
    if (!repo || repo.rightTab !== 'branches') return
    const branch = repo.selectedBranch
    if (!branch || branch === repo.currentBranch) return
    const branchInfo = repo.branches.find((b) => b.name === branch)
    if (branchInfo?.worktreePath) return
    try {
      const result = await window.gbl.checkout(id, branch)
      get().setLastResult(id, result)
      await get().refreshSnapshot(id)
    } catch (err) {
      get().setLastResult(id, { ok: false, message: err instanceof Error ? err.message : String(err) })
    }
  },

  async refreshSnapshot(id, options) {
    const repoBefore = get().repos[id]
    if (!repoBefore) return
    const token = repoBefore.instanceToken
    const silent = options?.silent === true
    if (!silent) {
      updateIfFresh(get(), set, id, token, (r) => ({ ...r, loading: true, error: null }))
    }
    try {
      const snap = await window.gbl.snapshot(id)
      if (!snap) {
        updateIfFresh(get(), set, id, token, (r) => ({ ...r, loading: false, error: 'error.failedReadRepo' }))
        return
      }
      updateIfFresh(get(), set, id, token, (r) => {
        // Default selection: current branch on first load. Keep the
        // user's pick if it still exists, otherwise fall back so the
        // right pane never points at a stale name.
        let selected = r.selectedBranch
        if (!selected || !snap.branches.some((b) => b.name === selected)) {
          selected = snap.branches.find((b) => b.name === snap.current)?.name ?? snap.branches[0]?.name ?? null
        }
        return {
          ...r,
          branches: snap.branches,
          currentBranch: snap.current,
          selectedBranch: selected,
          loading: false,
        }
      })
      // If the user pressed ⌘2 (Log) while the snapshot was in flight,
      // their setRightTab fired a refreshLog that bailed out because
      // selectedBranch was still null. Now that we have it, backfill
      // the data they're actually looking at.
      //
      // Note: refreshAll also chains its own `await refreshLog(id)`
      // after this snapshot, so on the ⌘R path log will fetch twice.
      // That's a few-millisecond redundancy; not worth the state
      // machine to deduplicate, since the second fetch's result
      // overwrites the first identically and `updateIfFresh` keeps
      // both writes safe.
      const after = get().repos[id]
      if (after && after.instanceToken === token && after.rightTab === 'log' && after.log.length === 0) {
        void get().refreshLog(id)
      }
    } catch (err) {
      updateIfFresh(get(), set, id, token, (r) => ({
        ...r,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      }))
    }
  },

  async refreshLog(id) {
    const repoBefore = get().repos[id]
    if (!repoBefore) return
    const token = repoBefore.instanceToken
    const branch = repoBefore.selectedBranch ?? repoBefore.currentBranch
    if (!branch) return
    try {
      const log = await window.gbl.log(id, branch, 100)
      updateIfFresh(get(), set, id, token, (r) => {
        // Discard if the user moved to a different branch while we
        // were waiting — otherwise the previous branch's log would
        // overwrite the current one.
        const stillBranch = r.selectedBranch ?? r.currentBranch
        if (stillBranch !== branch) return r
        return { ...r, log }
      })
    } catch (err) {
      console.warn('[refreshLog] failed', err)
      updateIfFresh(get(), set, id, token, (r) => ({
        ...r,
        error: err instanceof Error ? err.message : String(err),
      }))
    }
  },

  async refreshStatus(id) {
    const repoBefore = get().repos[id]
    if (!repoBefore) return
    const token = repoBefore.instanceToken
    try {
      const status = await window.gbl.status(id)
      updateIfFresh(get(), set, id, token, (r) => ({ ...r, status }))
    } catch (err) {
      console.warn('[refreshStatus] failed', err)
      updateIfFresh(get(), set, id, token, (r) => ({
        ...r,
        error: err instanceof Error ? err.message : String(err),
      }))
    }
  },

  async refreshAll(id) {
    if (!get().repos[id]) return
    await get().refreshSnapshot(id)
    // Re-read rightTab after the snapshot resolves: the user can switch
    // tabs while ⌘R is in flight, and we want to load the data they're
    // looking at now, not the tab they were on when they pressed it.
    const after = get().repos[id]
    if (!after) return
    if (after.rightTab === 'log') await get().refreshLog(id)
    if (after.rightTab === 'status') await get().refreshStatus(id)
  },

  async backgroundFetch(id) {
    // Coalesce: if a fetch is already running for this repo, return its
    // promise. Switching active back and forth on a slow network used
    // to fire overlapping fetches.
    const existing = inFlightFetchById.get(id)
    if (existing) return existing

    const repoBefore = get().repos[id]
    if (!repoBefore) return
    const token = repoBefore.instanceToken
    updateIfFresh(get(), set, id, token, (r) => ({ ...r, fetching: true }))

    let work!: Promise<void>
    work = (async () => {
      try {
        const result = await window.gbl.fetch(id)
        if (!result.ok) {
          console.warn('[backgroundFetch] git fetch failed:', result.message)
          updateIfFresh(get(), set, id, token, (r) => ({
            ...r,
            fetchFailed: true,
            fetchError: result.message,
          }))
          return
        }
        // Success — clear the fail flag and refresh the snapshot.
        updateIfFresh(get(), set, id, token, (r) => ({ ...r, fetchFailed: false, fetchError: null }))
        await get().refreshSnapshot(id, { silent: true })
      } catch (err) {
        console.warn('[backgroundFetch] threw:', err)
        const message = err instanceof Error ? err.message : String(err)
        updateIfFresh(get(), set, id, token, (r) => ({
          ...r,
          fetchFailed: true,
          fetchError: message,
        }))
      } finally {
        updateIfFresh(get(), set, id, token, (r) => ({ ...r, fetching: false }))
        // Only clear the slot if it still refers to this run. Without
        // the identity check, a close + reopen + new fetch can land
        // before this finally runs, and we'd wipe the new run's entry.
        // `work` is the promise we just registered above — by the time
        // any awaited body resolves, the assignment below has run.
        if (inFlightFetchById.get(id) === work) inFlightFetchById.delete(id)
      }
    })()
    inFlightFetchById.set(id, work)
    return work
  },

  async openCommit(id, hash) {
    const repoBefore = get().repos[id]
    if (!repoBefore) return
    const token = repoBefore.instanceToken
    try {
      const detail = await window.gbl.commit(id, hash)
      updateIfFresh(get(), set, id, token, (r) => ({ ...r, openCommit: detail }))
    } catch (err) {
      console.warn('[openCommit] failed', err)
    }
  },

  closeCommit(id) {
    set((s) => {
      const cur = s.repos[id]
      if (!cur) return s
      return { repos: { ...s.repos, [id]: { ...cur, openCommit: null } } }
    })
  },

  setLastResult(id, result) {
    set((s) => {
      const repo = s.repos[id]
      if (!repo) return s
      return { repos: { ...s.repos, [id]: { ...repo, lastResult: result } } }
    })
  },

  async hydrateSession(openRepos, activeRepo) {
    // Probe in parallel; entries that are no longer git repos (folder
    // moved/deleted, external drive not mounted) get reported via
    // `missingFromSession` so the user sees a "couldn't reopen N repos"
    // notice in the sidebar instead of wondering where their tabs went.
    interface ProbeResult {
      input: string
      ok: { id: string; name: string } | null
    }
    const probes = await Promise.all(
      openRepos.map(async (p): Promise<ProbeResult> => {
        try {
          const probe = await window.gbl.probe(p)
          if (!probe?.ok || !probe.root) return { input: p, ok: null }
          return {
            input: p,
            ok: { id: probe.root, name: probe.name ?? lastPathSegment(probe.root) },
          }
        } catch (err) {
          console.warn(`[session] probe failed for ${p}:`, err)
          return { input: p, ok: null }
        }
      }),
    )
    const valid = probes.filter((x) => x.ok !== null).map((x) => x.ok!)
    const missing = probes.filter((x) => x.ok === null).map((x) => x.input)

    set((s) => {
      const repos = { ...s.repos }
      const order = [...s.order]
      for (const { id, name } of valid) {
        if (!repos[id]) {
          repos[id] = emptyRepo(id, name)
          order.push(id)
        }
      }
      const userPickedSomething = s.activeId !== null
      const wantActive =
        userPickedSomething && repos[s.activeId!]
          ? s.activeId
          : activeRepo && repos[activeRepo]
            ? activeRepo
            : (order[0] ?? null)
      return {
        repos,
        order,
        activeId: wantActive,
        sessionReady: true,
        missingFromSession: missing,
      }
    })

    for (const { id } of valid) void get().refreshSnapshot(id)
  },

  dismissMissing() {
    set({ missingFromSession: [] })
  },

  clearFetchFailed(id) {
    set((s) => {
      const repo = s.repos[id]
      if (!repo || !repo.fetchFailed) return s
      return { repos: { ...s.repos, [id]: { ...repo, fetchFailed: false, fetchError: null } } }
    })
  },
}))
