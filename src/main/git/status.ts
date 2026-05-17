import { git } from '#/main/git/helper.ts'
import { parseStatus } from '#/main/git/parsers.ts'
import type { StatusEntry } from '#/main/git/types.ts'

export async function getWorkingStatus(cwd: string): Promise<StatusEntry[]> {
  try {
    // -z: NUL-terminated entries with quoting disabled. Without this,
    // filenames containing spaces, quotes, or unicode get backslash-
    // escaped and double-quoted (e.g. `"file name.txt"`), which the LF
    // parser leaves as literal quotes in the output. -z gives us the
    // raw bytes and uses NUL between entries.
    const output = await git(cwd, ['status', '--porcelain', '-z'])
    return parseStatus(output)
  } catch {
    return []
  }
}
