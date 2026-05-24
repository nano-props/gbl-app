import {
  appendRepoEvent,
  errorEvent,
  replaceRepo,
  resultEvent,
  updateIfFresh,
} from '#/renderer/stores/repos/helpers.ts'
import type { ReposGet, ReposSet } from '#/renderer/stores/repos/types.ts'
import { rpc } from '#/renderer/rpc.ts'

export function createCommitActions(set: ReposSet, get: ReposGet) {
  return {
    async openCommit(id: string, hash: string) {
      const repoBefore = get().repos[id]
      if (!repoBefore) return
      const token = repoBefore.instanceToken
      set((s) => {
        const repo = s.repos[id]
        if (!repo || repo.instanceToken !== token) return s
        const nextRepo = replaceRepo(repo, (r) => {
          r.ui.commitDetail = { phase: 'opening', hash }
        })
        return {
          repos: { ...s.repos, [id]: nextRepo },
          detailCollapsed: s.activeId === id ? false : s.detailCollapsed,
        }
      })
      try {
        const detail = await rpc.repo.commit.query({ cwd: id, hash })
        updateIfFresh(set, id, token, (r) => {
          if (r.ui.commitDetail.phase !== 'opening' || r.ui.commitDetail.hash !== hash) return
          r.ui.commitDetail = detail ? { phase: 'open', detail } : { phase: 'idle' }
        })
      } catch (err) {
        console.warn('[openCommit] failed', err)
        updateIfFresh(set, id, token, (r) => {
          if (r.ui.commitDetail.phase !== 'opening' || r.ui.commitDetail.hash !== hash) return
          r.ui.commitDetail = { phase: 'idle' }
          r.events = appendRepoEvent(r.events, errorEvent(err instanceof Error ? err.message : String(err)))
        })
      }
    },

    closeCommit(id: string) {
      set((s) => {
        const cur = s.repos[id]
        if (!cur || cur.ui.commitDetail.phase === 'idle') return s
        return {
          repos: {
            ...s.repos,
            [id]: replaceRepo(cur, (repo) => {
              repo.ui.commitDetail = { phase: 'idle' }
            }),
          },
        }
      })
    },

    setLastResult(id: string, result: { ok: boolean; message: string }, token: number) {
      set((s) => {
        const repo = s.repos[id]
        if (!repo) return s
        if (repo.instanceToken !== token) return s
        return {
          repos: {
            ...s.repos,
            [id]: replaceRepo(repo, (r) => {
              r.events = appendRepoEvent(r.events, resultEvent(result))
            }),
          },
        }
      })
    },

    clearEvents(id: string, eventIds: number[]) {
      if (eventIds.length === 0) return
      const ids = new Set(eventIds)
      set((s) => {
        const repo = s.repos[id]
        if (!repo) return s
        const events = repo.events.filter((event) => !ids.has(event.id))
        if (events.length === repo.events.length) return s
        return {
          repos: {
            ...s.repos,
            [id]: replaceRepo(repo, (r) => {
              r.events = events
            }),
          },
        }
      })
    },

    clearFetchFailed(id: string, token: number) {
      set((s) => {
        const repo = s.repos[id]
        if (!repo || !repo.remote.fetchFailed) return s
        if (repo.instanceToken !== token) return s
        return {
          repos: {
            ...s.repos,
            [id]: replaceRepo(repo, (r) => {
              r.remote.fetchFailed = false
              r.remote.fetchError = null
            }),
          },
        }
      })
    },
  }
}
