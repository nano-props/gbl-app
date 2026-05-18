// IPC handlers for git repo operations. Each handler validates that
// `cwd` is a string before passing to the git layer — the renderer is
// trusted (single preload bridge) but a malformed message shouldn't
// crash main.

import { ipcMain, dialog, shell, BrowserWindow, app } from 'electron'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { spawn, execFile } from 'node:child_process'
import { getMainWindow } from '#/main/window.ts'
import {
  checkoutBranch,
  deleteBranch,
  getBranches,
  getCurrentBranch,
  getLog,
  getRepoName,
  getRepoRoot,
  isGitRepo,
} from '#/main/git/branches.ts'
import { fetchAll, getGitHubUrl, getPullRequestUrl, pullBranch, pushBranch } from '#/main/git/remote.ts'
import { getWorkingStatus } from '#/main/git/status.ts'
import { getWorktreePatch } from '#/main/git/patch.ts'
import { resolveKnownWorktree, resolveRemovableWorktree } from '#/main/git/guards.ts'
import { getWorktrees, removeWorktree } from '#/main/git/worktrees.ts'
import { getCommitFileStats, getCommitMeta } from '#/main/git/log.ts'

/** Whether Ghostty.app exists in either of the two locations macOS users
 *  install GUI apps to. Probed on demand (not cached) so installing or
 *  removing Ghostty while Goblin is running takes effect immediately —
 *  cheap enough that an `existsSync` per call is fine. */
function isGhosttyInstalled(): boolean {
  const candidates = [path.join(app.getPath('home'), 'Applications/Ghostty.app'), '/Applications/Ghostty.app']
  return candidates.some((p) => existsSync(p))
}

function isUsableDirectory(p: string): boolean {
  if (!path.isAbsolute(p) || p.includes('\0')) return false
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

const GHOSTTY_BUNDLE_ID = 'com.mitchellh.ghostty'
const PROTECTED_BRANCHES = new Set(['main', 'master', 'develop', 'trunk'])
const GIT_HASH_RE = /^[0-9a-fA-F]{7,64}$/

/** Whether a Ghostty process is currently running. We ask System Events
 *  by bundle id rather than pgrep'ing a binary name — bundle id is the
 *  stable identifier and matches whatever Ghostty.app is installed. */
function isGhosttyRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const script = `tell application "System Events" to return (exists (first process whose bundle identifier is "${GHOSTTY_BUNDLE_ID}"))`
    execFile('/usr/bin/osascript', ['-e', script], (err, stdout) => {
      if (err) return resolve(false)
      resolve(stdout.trim() === 'true')
    })
  })
}

/** Open `dir` as a new window inside an already-running Ghostty,
 *  setting the initial working directory via Ghostty's scripting
 *  dictionary (see ghostty/macos/Ghostty.sdef). Caller must confirm
 *  Ghostty is running. */
function openInRunningGhostty(dir: string): Promise<void> {
  // The path is passed as argv (item 1 of argv), not interpolated,
  // so AppleScript string-escaping isn't a concern. `activate` is
  // last so a scripting failure doesn't pull Ghostty to the front
  // without actually opening anything.
  const script = `
    on run argv
      set dir to item 1 of argv
      tell application id "${GHOSTTY_BUNDLE_ID}"
        new window with configuration {initial working directory:dir}
        activate
      end tell
    end run
  `
  return new Promise((resolve, reject) => {
    execFile('/usr/bin/osascript', ['-e', script, dir], (err, _stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message))
      resolve()
    })
  })
}

/** Active AbortControllers keyed by repo id. Network ops (push/pull/fetch)
 *  register here so the renderer can cancel them. Only one network op per
 *  repo is allowed at a time (the UI's busy lock guarantees this); a new
 *  op aborts the previous one for safety. */
const activeOpControllers = new Map<string, AbortController>()

/** Wrap a network op so its AbortController is registered, then cleaned
 *  up regardless of success/failure/abort. Returns the underlying
 *  ExecResult plus a derived `cancelled` flag the renderer surfaces
 *  differently from a real error. */
async function runCancellable<T>(repoId: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  // If a previous op for this repo is somehow still in flight, abort it.
  // Belt-and-braces: the renderer's busy lock should already prevent this.
  activeOpControllers.get(repoId)?.abort()
  const ctrl = new AbortController()
  activeOpControllers.set(repoId, ctrl)
  try {
    return await fn(ctrl.signal)
  } finally {
    if (activeOpControllers.get(repoId) === ctrl) {
      activeOpControllers.delete(repoId)
    }
  }
}

export function wireRepoIpc(): void {
  // ---- Open dialog --------------------------------------------------------
  ipcMain.handle('repo:open-dialog', async () => {
    const win = getMainWindow() ?? BrowserWindow.getFocusedWindow()
    const opts: Electron.OpenDialogOptions = {
      properties: ['openDirectory'],
      title: 'Open Git Repository',
    }
    const result = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // ---- Repo metadata ------------------------------------------------------
  ipcMain.handle('repo:probe', async (_e, cwd: string) => {
    if (typeof cwd !== 'string' || !cwd) return { ok: false }
    const ok = await isGitRepo(cwd)
    if (!ok) return { ok: false }
    const root = await getRepoRoot(cwd)
    const name = await getRepoName(cwd)
    return { ok: true, root, name }
  })

  // ---- Snapshot of branches + current branch -----------------------------
  // Worktrees are queried internally so `getBranches` can mark which
  // branches are checked out elsewhere, but we don't return them — the
  // BranchList rows already carry per-branch worktree info, and the
  // dedicated Worktrees tab was retired.
  ipcMain.handle('repo:snapshot', async (_e, cwd: string) => {
    if (typeof cwd !== 'string' || !cwd) return null
    const worktrees = await getWorktrees(cwd)
    const branches = await getBranches(cwd, worktrees)
    const current = await getCurrentBranch(cwd)
    return { branches, current }
  })

  ipcMain.handle('repo:log', async (_e, cwd: string, branch: string, count?: number) => {
    if (typeof cwd !== 'string' || !cwd || typeof branch !== 'string') return []
    // Clamp count: a renderer (or compromised one) shouldn't be able to ask
    // for Number.MAX_SAFE_INTEGER commits and tie up the main process.
    const n = typeof count === 'number' && Number.isFinite(count) ? Math.floor(count) : 100
    const safeCount = Math.max(1, Math.min(1000, n))
    return getLog(cwd, branch, safeCount)
  })

  ipcMain.handle('repo:status', async (_e, cwd: string) => {
    if (typeof cwd !== 'string' || !cwd) return []
    return getWorkingStatus(cwd)
  })

  // ---- Patch (worktree → git apply --binary -friendly text) --------------
  // Caller passes a worktree path (NOT necessarily the repo root) so we
  // generate the patch against that specific worktree's HEAD. Returned
  // shape mirrors ExecResult so the renderer can surface git errors via
  // the existing toast machinery without needing a separate code path.
  ipcMain.handle('repo:patch', async (_e, cwd: string, worktreePath: string) => {
    if (typeof cwd !== 'string' || !cwd || typeof worktreePath !== 'string' || !worktreePath) {
      return { ok: false, message: 'error.invalidWorktreePath' }
    }
    try {
      const target = resolveKnownWorktree(await getWorktrees(cwd), worktreePath)
      if (!target.ok) return target
      const patch = await getWorktreePatch(target.path)
      return { ok: true, message: patch }
    } catch (err: unknown) {
      const e = err as { stderr?: string; message?: string }
      const msg = (typeof e.stderr === 'string' && e.stderr.trim()) || e.message || 'error.unknown'
      return { ok: false, message: msg }
    }
  })

  // ---- Commit detail ------------------------------------------------------
  ipcMain.handle('repo:commit', async (_e, cwd: string, hash: string) => {
    if (typeof cwd !== 'string' || !cwd || typeof hash !== 'string' || !hash) return null
    if (!GIT_HASH_RE.test(hash)) return null
    const [meta, files] = await Promise.all([getCommitMeta(cwd, hash), getCommitFileStats(cwd, hash)])
    if (!meta) return null
    return { meta, files }
  })

  // ---- Mutating operations ------------------------------------------------
  ipcMain.handle('repo:checkout', async (_e, cwd: string, branch: string) => {
    if (typeof cwd !== 'string' || typeof branch !== 'string' || !cwd || !branch) {
      return { ok: false, message: 'error.invalidArguments' }
    }
    return checkoutBranch(cwd, branch)
  })

  ipcMain.handle('repo:delete-branch', async (_e, cwd: string, branch: string) => {
    if (typeof cwd !== 'string' || typeof branch !== 'string' || !cwd || !branch) {
      return { ok: false, message: 'error.invalidArguments' }
    }
    const current = await getCurrentBranch(cwd)
    if (branch === current) return { ok: false, message: 'error.cannotDeleteCurrentBranch' }
    if (PROTECTED_BRANCHES.has(branch)) return { ok: false, message: 'error.cannotDeleteProtectedBranch' }
    const worktrees = await getWorktrees(cwd)
    if (worktrees.some((wt) => wt.branch === branch)) {
      return { ok: false, message: 'error.cannotDeleteCheckedOutBranch' }
    }
    return deleteBranch(cwd, branch)
  })

  ipcMain.handle('repo:remove-worktree', async (_e, cwd: string, branch: string, worktreePath: string) => {
    if (
      typeof cwd !== 'string' ||
      typeof branch !== 'string' ||
      typeof worktreePath !== 'string' ||
      !cwd ||
      !branch ||
      !worktreePath
    ) {
      return { ok: false, message: 'error.invalidArguments' }
    }
    const root = await getRepoRoot(cwd)
    const target = resolveRemovableWorktree(await getWorktrees(cwd), branch, worktreePath, root)
    if (!target.ok) return target
    return removeWorktree(cwd, target.path)
  })

  ipcMain.handle('repo:pull', async (_e, cwd: string, branch: string, worktreePath?: string) => {
    if (typeof cwd !== 'string' || typeof branch !== 'string' || !cwd || !branch) {
      return { ok: false, message: 'error.invalidArguments' }
    }
    let targetPath: string | undefined
    if (typeof worktreePath === 'string' && worktreePath) {
      const target = resolveKnownWorktree(await getWorktrees(cwd), worktreePath, branch)
      if (!target.ok) return target
      targetPath = target.path
    }
    return runCancellable(cwd, (signal) => pullBranch(cwd, branch, targetPath, signal))
  })

  ipcMain.handle('repo:push', async (_e, cwd: string, branch: string) => {
    if (typeof cwd !== 'string' || typeof branch !== 'string' || !cwd || !branch) {
      return { ok: false, message: 'error.invalidArguments' }
    }
    return runCancellable(cwd, (signal) => pushBranch(cwd, branch, signal))
  })

  ipcMain.handle('repo:fetch', async (_e, cwd: string) => {
    if (typeof cwd !== 'string' || !cwd) return { ok: false, message: 'error.invalidArguments' }
    return runCancellable(cwd, (signal) => fetchAll(cwd, signal))
  })

  // Cancel the in-flight network op for a repo, if any. No-op when
  // nothing is running. Returns true when something was actually
  // aborted so the renderer can give immediate visual feedback.
  ipcMain.handle('repo:abort', (_e, cwd: string) => {
    if (typeof cwd !== 'string' || !cwd) return false
    const ctrl = activeOpControllers.get(cwd)
    if (!ctrl) return false
    ctrl.abort()
    activeOpControllers.delete(cwd)
    return true
  })

  ipcMain.handle('repo:open-github', async (_e, cwd: string, branch?: string) => {
    // Prefer a PR-shaped URL when we know the branch: GitHub's
    // `/pull/new/{branch}` redirects to the existing open PR if one
    // exists, otherwise lands on the create-PR page. That covers
    // both "show me the PR for this branch" and "start a PR" with a
    // single URL. Fall back to the repo home for callers that don't
    // pass a branch (or the default branch, where a PR doesn't make
    // sense).
    const isDefaultBranch = branch === 'main' || branch === 'master' || branch === 'trunk'
    if (typeof branch === 'string' && branch && !isDefaultBranch) {
      const prUrl = await getPullRequestUrl(cwd, branch)
      if (prUrl) {
        void shell.openExternal(prUrl)
        return { ok: true, message: prUrl }
      }
    }
    const url = await getGitHubUrl(cwd)
    if (!url) return { ok: false, message: 'error.openGithubNoOrigin' }
    void shell.openExternal(url)
    return { ok: true, message: url }
  })

  // `showItemInFolder` reveals the path in Finder/Explorer without
  // launching it — strictly safer than `openPath`, which on macOS will
  // run any executable / .app / .command at the given path. Worktree
  // paths come from `git worktree list` which are always directories,
  // but defending against future callers / a malicious renderer is
  // cheap and worth it given the IPC bridge surface.
  ipcMain.handle('repo:open-in-finder', async (_e, p: string) => {
    if (typeof p !== 'string' || !p) return { ok: false, message: 'error.invalidPath' }
    shell.showItemInFolder(p)
    return { ok: true, message: p }
  })

  ipcMain.handle('repo:ghostty-installed', () => isGhosttyInstalled())

  // Open the given directory in Ghostty.
  //
  // If Ghostty is already running, we drive its AppleScript dictionary
  // (com.mitchellh.ghostty) to open a new window in the existing
  // instance with `initial working directory` set via a `new surface
  // configuration` record. This avoids spawning a second Ghostty.app
  // process every time.
  //
  // If Ghostty isn't running, fall back to `open -na Ghostty.app
  // --args --working-directory=<path>`. The cold-start path can't
  // use AppleScript (no process to talk to) and Ghostty parses
  // --args via ghostty_init(argc, argv) at launch — so -n is needed
  // to ensure the args are read instead of dropped on activation.
  //
  // Spawned children are detached + unref'd so quitting Goblin doesn't
  // bring the terminal down with it.
  ipcMain.handle('repo:open-in-ghostty', async (_e, p: string) => {
    if (typeof p !== 'string' || !p) return { ok: false, message: 'error.invalidPath' }
    if (!isUsableDirectory(p)) return { ok: false, message: 'error.invalidPath' }
    if (!isGhosttyInstalled()) return { ok: false, message: 'error.ghosttyNotInstalled' }

    const running = await isGhosttyRunning()
    if (running) {
      try {
        await openInRunningGhostty(p)
        return { ok: true, message: p }
      } catch (err) {
        console.warn('[ghostty] AppleScript open failed, falling back to launch', err)
      }
    }

    try {
      const child = spawn('open', ['-na', 'Ghostty.app', '--args', `--working-directory=${p}`], {
        detached: true,
        stdio: 'ignore',
      })
      child.unref()
      return { ok: true, message: p }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) }
    }
  })
}
