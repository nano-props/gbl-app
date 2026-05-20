// Commit-detail helpers — `git show` for a single commit. Used by the
// log view's "open diff" overlay.
//
// We split the call into two pieces:
//   - `getCommitMeta`      : header (subject, body, author, date, parents)
//   - `getCommitFileStats` : per-file numstat (additions/deletions/path)
//
// The full unified diff stays out of this module — it's expensive for
// large commits and we only show file-level stats in the UI. A future
// "view diff" tab can call `git show <hash> -- <path>` lazily.

import { git } from '#/main/git/helper.ts'

export interface CommitMeta {
  hash: string
  shortHash: string
  subject: string
  body: string
  author: string
  email: string
  date: string
  parents: string[]
}

export interface CommitFileStat {
  added: number
  deleted: number
  path: string
  /** True for binary files (numstat shows '-' for added/deleted there). */
  binary: boolean
}

export async function getCommitMeta(cwd: string, hash: string): Promise<CommitMeta | null> {
  try {
    // %x1f delimiters keep the subject body intact even when it contains
    // newlines or our other separators. %P is space-separated parents.
    const SEP = '\x1f'
    const format = ['%H', '%h', '%an', '%ae', '%aI', '%P', '%s', '%b'].join(SEP)
    const out = await git(cwd, ['show', '--no-patch', `--format=${format}`, hash])
    if (!out) return null
    const parts = out.split(SEP)
    return {
      hash: parts[0] ?? '',
      shortHash: parts[1] ?? '',
      author: parts[2] ?? '',
      email: parts[3] ?? '',
      date: parts[4] ?? '',
      parents: (parts[5] ?? '').split(' ').filter(Boolean),
      subject: parts[6] ?? '',
      // %b carries trailing newlines from git — trim so the renderer
      // doesn't show a wall of empty space below short commit messages.
      body: (parts[7] ?? '').trimEnd(),
    }
  } catch {
    return null
  }
}

export async function getCommitFileStats(cwd: string, hash: string): Promise<CommitFileStat[]> {
  try {
    // numstat columns: <added>\t<deleted>\t<path>. For binary files the
    // first two columns are '-'. `--no-renames` neutralizes git's rename
    // detection so the third column is always a clean path; without it
    // git emits either `n\tn\t{old} => {new}` or the brace-shortened
    // `src/{a => b}/file.txt`, neither of which is a usable file path
    // for the file list view.
    //
    // -z so a path containing a literal newline doesn't get split into
    // two records. With -z each record is NUL-terminated and quoting
    // is disabled — bytes are literal.
    const out = await git(cwd, ['show', '--numstat', '--no-renames', '--format=', '-z', hash])
    if (!out) return []
    const records = out.split('\0').filter((r) => r.length > 0)
    return records.map((record) => {
      const cols = record.split('\t')
      const added = cols[0] ?? '0'
      const deleted = cols[1] ?? '0'
      const path = cols.slice(2).join('\t')
      const binary = added === '-' || deleted === '-'
      return {
        added: binary ? 0 : parseInt(added, 10) || 0,
        deleted: binary ? 0 : parseInt(deleted, 10) || 0,
        path,
        binary,
      }
    })
  } catch {
    return []
  }
}
