import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import type { RepoState } from '#/renderer/stores/repos/types.ts'
import { Button } from '#/renderer/components/ui/button.tsx'
import { ScrollArea } from '#/renderer/components/ui/scroll-area.tsx'
import { useBranchActionItems, type BranchActionItem } from '#/renderer/hooks/useBranchActionItems.ts'
import { setBranchActionShortcutHandler } from '#/renderer/keyboard/branch-action-shortcuts.ts'
import type { BranchInfo } from '#/renderer/types.ts'

interface Props {
  repo: RepoState
  branch: BranchInfo
}

export function BranchActionBar({ repo, branch }: Props) {
  const { busy, patchItems, mainItems, destructiveItems, dialogs } = useBranchActionItems(repo, branch)
  const visibleItems = [...patchItems, ...mainItems, ...destructiveItems].filter((item) => item.visible)
  const visibleItemsRef = useRef(visibleItems)
  visibleItemsRef.current = visibleItems

  useEffect(() => {
    return setBranchActionShortcutHandler((action) => {
      const item = visibleItemsRef.current.find((item) => item.id === action)
      if (!item || item.disabled) return
      item.onSelect()
    })
  }, [])

  return (
    <>
      <ScrollArea orientation="horizontal" className="min-w-0 flex-1">
        <div className="flex w-max min-w-full items-center justify-end gap-1 py-1">
          {visibleItems.map((item) => (
            <BranchActionButton key={item.id} item={item} busy={busy} />
          ))}
        </div>
      </ScrollArea>

      {dialogs}
    </>
  )
}

function BranchActionButton({ item, busy }: { item: BranchActionItem; busy: BranchActionItem['id'] | null }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={item.disabled}
      onClick={item.onSelect}
      title={item.title}
      aria-label={item.ariaLabel ?? item.title ?? item.label}
      aria-busy={busy === item.id ? true : undefined}
      className={item.destructive ? 'text-danger hover:bg-danger-surface hover:text-danger' : undefined}
    >
      {busy === item.id ? <Loader2 className="animate-spin" /> : item.icon}
      {item.label}
    </Button>
  )
}
