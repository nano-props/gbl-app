import path from 'node:path'
import { isSafeBranchName } from '#/shared/refnames.ts'

export const MAX_IPC_PATH_LENGTH = 4096
export const MAX_IPC_BRANCH_LENGTH = 1024

export function isValidAbsolutePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_IPC_PATH_LENGTH &&
    !value.includes('\0') &&
    path.isAbsolute(value)
  )
}

export function isValidCwd(value: unknown): value is string {
  return isValidAbsolutePath(value)
}

export function isValidBranch(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value.length <= MAX_IPC_BRANCH_LENGTH && isSafeBranchName(value)
  )
}

export function isValidOptionalBranch(value: unknown): value is string | undefined {
  return value === undefined || isValidBranch(value)
}
