import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { RepoState } from '#/renderer/stores/repos/types.ts'
import { Button } from '#/renderer/components/ui/button.tsx'
import { BranchActionsDropdown } from '#/renderer/components/BranchActionsMenu.tsx'
import { ScrollArea } from '#/renderer/components/ui/scroll-area.tsx'
import { useBranchActionItems, type BranchActionItem } from '#/renderer/hooks/useBranchActionItems.ts'
import { setBranchActionShortcutHandler } from '#/renderer/keyboard/branch-action-shortcuts.ts'
import { cn } from '#/renderer/lib/cn.ts'
import type { BranchInfo } from '#/renderer/types.ts'

interface Props {
  repo: RepoState
  branch: BranchInfo
  variant?: 'bar' | 'menu' | 'auto'
}

export function BranchActionBar({ repo, branch, variant = 'bar' }: Props) {
  const { busy, patchItems, mainItems, destructiveItems, dialogs } = useBranchActionItems(repo, branch)
  const visibleItems = [...patchItems, ...mainItems, ...destructiveItems].filter((item) => item.visible)
  // Register the global shortcut once; it reads from this ref so branch/action changes don't stale the handler.
  const visibleItemsRef = useRef(visibleItems)
  visibleItemsRef.current = visibleItems

  useEffect(() => {
    return setBranchActionShortcutHandler((action) => {
      const item = visibleItemsRef.current.find((item) => item.id === action)
      if (!item || item.disabled) return
      item.onSelect()
    })
  }, [])

  if (variant === 'menu') {
    return (
      <>
        <BranchActionsDropdown
          busy={busy}
          patchItems={patchItems}
          mainItems={mainItems}
          destructiveItems={destructiveItems}
        />

        {dialogs}
      </>
    )
  }

  if (variant === 'auto') {
    return (
      <>
        <BranchActionAuto
          busy={busy}
          visibleItems={visibleItems}
          patchItems={patchItems}
          mainItems={mainItems}
          destructiveItems={destructiveItems}
        />

        {dialogs}
      </>
    )
  }

  return (
    <>
      <BranchActionButtonScroller busy={busy} visibleItems={visibleItems} />

      {dialogs}
    </>
  )
}

function BranchActionAuto({
  busy,
  visibleItems,
  patchItems,
  mainItems,
  destructiveItems,
}: {
  busy: BranchActionItem['id'] | null
  visibleItems: BranchActionItem[]
  patchItems: BranchActionItem[]
  mainItems: BranchActionItem[]
  destructiveItems: BranchActionItem[]
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const measureRef = useRef<HTMLDivElement | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const layoutKey = visibleItems
    .map((item) => `${item.id}:${item.label}:${item.disabled}:${busy === item.id}`)
    .join('|')

  useLayoutEffect(() => {
    const update = () => {
      const container = containerRef.current
      const measure = measureRef.current
      if (!container || !measure) return
      const next = measure.scrollWidth > container.clientWidth + 1
      setCollapsed((current) => (current === next ? current : next))
    }
    update()

    const ResizeObserverCtor = globalThis.ResizeObserver
    if (!ResizeObserverCtor) {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }

    const observer = new ResizeObserverCtor(update)
    if (containerRef.current) observer.observe(containerRef.current)
    if (measureRef.current) observer.observe(measureRef.current)
    return () => observer.disconnect()
  }, [layoutKey])

  return (
    <div ref={containerRef} className="relative flex min-w-0 flex-1 justify-end">
      {collapsed ? (
        <BranchActionsDropdown
          busy={busy}
          patchItems={patchItems}
          mainItems={mainItems}
          destructiveItems={destructiveItems}
        />
      ) : (
        <BranchActionButtonScroller busy={busy} visibleItems={visibleItems} />
      )}
      <div ref={measureRef} aria-hidden="true" className="pointer-events-none invisible absolute right-0 top-0">
        <BranchActionButtonRow busy={busy} visibleItems={visibleItems} measure />
      </div>
    </div>
  )
}

function BranchActionButtonScroller({
  busy,
  visibleItems,
}: {
  busy: BranchActionItem['id'] | null
  visibleItems: BranchActionItem[]
}) {
  return (
    <ScrollArea orientation="horizontal" className="min-w-0 flex-1">
      <BranchActionButtonRow busy={busy} visibleItems={visibleItems} className="min-w-full" />
    </ScrollArea>
  )
}

function BranchActionButtonRow({
  busy,
  visibleItems,
  className,
  measure = false,
}: {
  busy: BranchActionItem['id'] | null
  visibleItems: BranchActionItem[]
  className?: string
  measure?: boolean
}) {
  return (
    <div className={cn('flex w-max items-center justify-end gap-1 py-1', className)}>
      {visibleItems.map((item) => (
        <BranchActionButton key={item.id} item={item} busy={busy} measure={measure} />
      ))}
    </div>
  )
}

function BranchActionButton({
  item,
  busy,
  measure = false,
}: {
  item: BranchActionItem
  busy: BranchActionItem['id'] | null
  measure?: boolean
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={measure || item.disabled}
      onClick={item.onSelect}
      title={item.title ?? item.label}
      aria-label={item.ariaLabel ?? item.title ?? item.label}
      aria-busy={busy === item.id ? true : undefined}
      className={item.destructive ? 'text-danger hover:bg-danger-surface hover:text-danger' : undefined}
    >
      {busy === item.id ? <Loader2 className="animate-spin" /> : item.icon}
      {item.label}
    </Button>
  )
}
