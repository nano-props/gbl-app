import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type FocusEvent, type KeyboardEvent } from 'react'
import { Button } from '#/renderer/components/ui/button.tsx'
import { setTerminalFocused } from '#/renderer/terminal-focus.ts'
import { useT } from '#/renderer/stores/i18n.ts'
import { terminalSessionKey } from '#/renderer/components/terminal/terminal-session-utils.ts'
import { useTerminalSessionContext } from '#/renderer/components/terminal/terminal-session-context.ts'
import type { TerminalDescriptor } from '#/renderer/components/terminal/types.ts'

interface TerminalSlotProps {
  repoRoot: string
  branch: string
  worktreePath: string
}

export function TerminalSlot({ repoRoot, branch, worktreePath }: TerminalSlotProps) {
  const t = useT()
  const slotRef = useRef<HTMLDivElement | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const context = useTerminalSessionContext()
  const { attach, detach, isTerminalFocusTarget, restart: restartSession, snapshot: getSnapshot, version } = context
  const key = terminalSessionKey(repoRoot, worktreePath)
  const descriptor = useMemo<TerminalDescriptor>(
    () => ({ key, repoRoot, branch, worktreePath }),
    [branch, key, repoRoot, worktreePath],
  )
  const snapshot = useMemo(() => getSnapshot(key), [getSnapshot, key, version])

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    attach(descriptor, host)
    return () => detach(key, host)
  }, [attach, descriptor, detach, key])

  useEffect(() => {
    if (snapshot.phase === 'ended') slotRef.current?.focus({ preventScroll: true })
  }, [snapshot.phase])

  const restart = useCallback(() => restartSession(key), [key, restartSession])
  const handleFocus = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      setTerminalFocused(snapshot.phase !== 'ended' && isTerminalFocusTarget(key, event.target))
    },
    [isTerminalFocusTarget, key, snapshot.phase],
  )
  const handleBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTerminalFocused(false)
  }, [])
  const handleKeyDownCapture = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (snapshot.phase === 'ended') {
        if (event.key !== 'Enter') return
        event.preventDefault()
        event.stopPropagation()
        restart()
      }
    },
    [restart, snapshot.phase],
  )

  return (
    <div
      ref={slotRef}
      className="goblin-terminal-slot"
      tabIndex={snapshot.phase === 'ended' ? 0 : -1}
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
      onKeyDownCapture={handleKeyDownCapture}
    >
      <div ref={hostRef} className="goblin-terminal-slot__host" />
      {snapshot.phase === 'ended' && (
        <div className="goblin-terminal-slot__ended-overlay">
          <span>
            {typeof snapshot.exitCode === 'number'
              ? t('terminal.session-ended-code', { code: String(snapshot.exitCode) })
              : t('terminal.session-ended')}
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            title={`${t('terminal.restart')} (${t('terminal.restart-shortcut')})`}
            onClick={restart}
          >
            <span>{t('terminal.restart')}</span>
            <kbd className="goblin-terminal-slot__shortcut">{t('terminal.restart-shortcut')}</kbd>
          </Button>
        </div>
      )}
      {(snapshot.phase === 'opening' || snapshot.phase === 'error') && (
        <div className="goblin-terminal-slot__status-overlay">
          <span>{snapshot.phase === 'opening' ? t('terminal.opening') : t(snapshot.message ?? 'error.unknown')}</span>
          {snapshot.phase === 'error' && (
            <Button type="button" size="sm" variant="secondary" onClick={restart}>
              {t('terminal.restart')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
