import { ChevronDown, Loader2 } from 'lucide-react'
import type { RepoBranchState, RepoState } from '#/renderer/stores/repos/types.ts'
import { useT } from '#/renderer/stores/i18n.ts'
import { Button } from '#/renderer/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '#/renderer/components/ui/dropdown-menu.tsx'
import {
  useBranchActionItems,
  type BranchActionItem,
  type BranchActionItemGroups,
} from '#/renderer/hooks/useBranchActionItems.ts'
import { useAsyncPending } from '#/renderer/hooks/useAsyncPending.ts'

interface Props {
  repo: RepoState
  branch: RepoBranchState
}

export function BranchActionsMenu({ repo, branch }: Props) {
  const { patchItems, mainItems, destructiveItems, dialogs } = useBranchActionItems(repo, branch)

  return (
    <>
      <BranchActionsDropdown patchItems={patchItems} mainItems={mainItems} destructiveItems={destructiveItems} />

      {dialogs}
    </>
  )
}

export function BranchActionsDropdown({
  patchItems,
  mainItems,
  destructiveItems,
}: Pick<BranchActionItemGroups, 'patchItems' | 'mainItems' | 'destructiveItems'>) {
  const t = useT()
  const { pending: pendingAction, run } = useAsyncPending<BranchActionItem['id']>()
  const visiblePatchItems = patchItems.filter((item) => item.visible)
  const visibleMainItems = mainItems.filter((item) => item.visible)
  const visibleDestructiveItems = destructiveItems.filter((item) => item.visible)
  const visibleItems = [...visiblePatchItems, ...visibleMainItems, ...visibleDestructiveItems]
  const busyAction = pendingAction ?? visibleItems.find((item) => item.busy)?.id ?? null

  function runItem(item: BranchActionItem) {
    if (branchActionMenuItemDisabled(item, busyAction)) return
    void run(item.id, item.onSelect)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title={t('action.menu')}
          aria-label={t('action.menu')}
          aria-busy={busyAction ? true : undefined}
          className="data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {busyAction ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown />}
          {t('action.menu')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {visiblePatchItems.length > 0 && (
          <>
            {visiblePatchItems.map((item) => (
              <BranchActionMenuItem key={item.id} item={item} busy={busyAction} onSelect={() => runItem(item)} />
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        {visibleMainItems.map((item) => (
          <BranchActionMenuItem key={item.id} item={item} busy={busyAction} onSelect={() => runItem(item)} />
        ))}
        {visibleDestructiveItems.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {visibleDestructiveItems.map((item) => (
              <BranchActionMenuItem key={item.id} item={item} busy={busyAction} onSelect={() => runItem(item)} />
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BranchActionMenuItem({
  item,
  busy,
  onSelect,
}: {
  item: BranchActionItem
  busy: BranchActionItem['id'] | null
  onSelect: () => void
}) {
  return (
    <DropdownMenuItem
      disabled={branchActionMenuItemDisabled(item, busy)}
      title={item.title}
      onClick={onSelect}
      variant={item.destructive ? 'destructive' : 'default'}
      className={item.shortcut ? 'whitespace-nowrap' : undefined}
    >
      {busy === item.id || item.busy ? <Loader2 size={16} className="animate-spin" /> : item.icon}
      {item.label}
      {item.shortcut && <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>}
    </DropdownMenuItem>
  )
}

export function branchActionMenuItemDisabled(item: BranchActionItem, busy: BranchActionItem['id'] | null): boolean {
  return item.disabled || busy !== null
}
