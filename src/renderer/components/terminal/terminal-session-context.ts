import { createContext, useContext } from 'react'
import type { TerminalSessionContextValue } from '#/renderer/components/terminal/types.ts'

export const TerminalSessionContext = createContext<TerminalSessionContextValue | null>(null)

export function useTerminalSessionContext(): TerminalSessionContextValue {
  const value = useContext(TerminalSessionContext)
  if (!value) throw new Error('Terminal session context is unavailable')
  return value
}
