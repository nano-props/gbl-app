import { PanelLeft, PanelTop, type LucideIcon } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '#/renderer/components/ui/toggle-group.tsx'
import { Tip } from '#/renderer/components/Tip.tsx'
import { useT } from '#/renderer/stores/i18n.ts'
import type { RepoWorkspaceLayout } from '#/renderer/stores/repos/types.ts'
import { cn } from '#/renderer/lib/cn.ts'
import { WORKSPACE_LAYOUTS } from '#/shared/workspace-layout.ts'

interface Props {
  value: RepoWorkspaceLayout
  onChange: (layout: RepoWorkspaceLayout) => void
}

const WORKSPACE_LAYOUT_TOOLTIP_KEYS = {
  'top-bottom': 'workspace.layout-tooltip.top-bottom',
  'left-right': 'workspace.layout-tooltip.left-right',
} satisfies Record<RepoWorkspaceLayout, string>

const WORKSPACE_LAYOUT_OPTIONS = WORKSPACE_LAYOUTS.map((id) => ({
  id,
  tooltipKey: WORKSPACE_LAYOUT_TOOLTIP_KEYS[id],
}))

const WORKSPACE_LAYOUT_ICONS = {
  'top-bottom': PanelTop,
  'left-right': PanelLeft,
} satisfies Record<RepoWorkspaceLayout, LucideIcon>

export function WorkspaceLayoutControl({ value, onChange }: Props) {
  const t = useT()

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as RepoWorkspaceLayout)
      }}
      aria-label={t('workspace.layout-label')}
      className="shrink-0 rounded-md bg-muted/50 p-0.5"
    >
      {WORKSPACE_LAYOUT_OPTIONS.map((option) => {
        const Icon = WORKSPACE_LAYOUT_ICONS[option.id]
        const label = t(option.tooltipKey)
        const selected = option.id === value
        return (
          <Tip key={option.id} label={label}>
            <ToggleGroupItem
              value={option.id}
              aria-label={label}
              className={cn(
                'size-6 min-w-0 rounded-sm border p-0 shadow-none',
                selected
                  ? '!border-border !bg-background !text-foreground shadow-xs hover:!bg-background hover:!text-foreground data-[state=on]:!bg-background data-[state=on]:!text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
                '[&_svg:not([class*=size-])]:size-3.5',
              )}
            >
              <Icon />
            </ToggleGroupItem>
          </Tip>
        )
      })}
    </ToggleGroup>
  )
}
