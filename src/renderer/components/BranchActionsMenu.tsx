import { ChevronDown, Loader2 } from 'lucide-react'
import type { RepoState } from '#/renderer/stores/repos/types.ts'
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
import type { BranchInfo } from '#/renderer/types.ts'

interface Props {
  repo: RepoState
  branch: BranchInfo
}

export function BranchActionsMenu({ repo, branch }: Props) {
  const { busy, patchItems, mainItems, destructiveItems, dialogs } = useBranchActionItems(repo, branch)

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

export function BranchActionsDropdown({
  busy,
  patchItems,
  mainItems,
  destructiveItems,
}: Pick<BranchActionItemGroups, 'busy' | 'patchItems' | 'mainItems' | 'destructiveItems'>) {
  const t = useT()
  const visiblePatchItems = patchItems.filter((item) => item.visible)
  const visibleMainItems = mainItems.filter((item) => item.visible)
  const visibleDestructiveItems = destructiveItems.filter((item) => item.visible)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title={t('action.menu')}
          className="data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <ChevronDown />}
          {t('action.menu')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {visiblePatchItems.length > 0 && (
          <>
            {visiblePatchItems.map((item) => (
              <BranchActionMenuItem key={item.id} item={item} busy={busy} />
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        {visibleMainItems.map((item) => (
          <BranchActionMenuItem key={item.id} item={item} busy={busy} />
        ))}
        {visibleDestructiveItems.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {visibleDestructiveItems.map((item) => (
              <BranchActionMenuItem key={item.id} item={item} busy={busy} />
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BranchActionMenuItem({ item, busy }: { item: BranchActionItem; busy: BranchActionItem['id'] | null }) {
  return (
    <DropdownMenuItem
      disabled={item.disabled}
      onClick={item.onSelect}
      variant={item.destructive ? 'destructive' : 'default'}
      className={item.shortcut ? 'whitespace-nowrap' : undefined}
    >
      {busy === item.id ? <Loader2 className="animate-spin" /> : item.icon}
      {item.label}
      {item.shortcut && <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>}
    </DropdownMenuItem>
  )
}
