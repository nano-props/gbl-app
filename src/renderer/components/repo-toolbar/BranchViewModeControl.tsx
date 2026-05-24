import { FolderTree, GitBranch, ListTree, type LucideIcon } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '#/renderer/components/ui/toggle-group.tsx'
import { Tip } from '#/renderer/components/Tip.tsx'
import { useT } from '#/renderer/stores/i18n.ts'
import { BRANCH_VIEW_MODE_OPTIONS } from '#/renderer/components/repo-toolbar/branch-view-mode-options.ts'
import type { BranchViewMode } from '#/renderer/stores/repos/types.ts'
import { segmentedItemClass } from '#/renderer/components/repo-toolbar/segmented-control.ts'

interface Props {
  value: BranchViewMode
  disabled?: boolean
  onChange: (viewMode: BranchViewMode) => void
}

const BRANCH_VIEW_MODE_ICONS = {
  all: ListTree,
  worktrees: FolderTree,
  'no-worktree': GitBranch,
} satisfies Record<BranchViewMode, LucideIcon>

export function BranchViewModeControl({ value, disabled = false, onChange }: Props) {
  const t = useT()

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as BranchViewMode)
      }}
      disabled={disabled}
      aria-label={t('branches.filter-label')}
      variant="outline"
      size="sm"
      className="shrink-0"
    >
      {BRANCH_VIEW_MODE_OPTIONS.map((option) => {
        const Icon = BRANCH_VIEW_MODE_ICONS[option.id]
        const label = t(option.tooltipKey)
        const selected = option.id === value
        return (
          <Tip key={option.id} label={label}>
            <ToggleGroupItem
              value={option.id}
              aria-label={label}
              className={segmentedItemClass(selected)}
            >
              <Icon />
            </ToggleGroupItem>
          </Tip>
        )
      })}
    </ToggleGroup>
  )
}
