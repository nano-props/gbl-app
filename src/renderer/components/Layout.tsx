import type { HTMLAttributes, ReactNode } from 'react'
import { ScrollArea } from '#/renderer/components/ui/scroll-area.tsx'
import { cn } from '#/renderer/lib/cn.ts'
import { DEFAULT_WORKSPACE_LAYOUT, workspaceLayoutAxis } from '#/shared/workspace-layout.ts'
import type { RepoWorkspaceLayout } from '#/renderer/stores/repos/types.ts'

interface ShellProps {
  children: ReactNode
}

interface RepoWorkspaceProps extends ShellProps {
  layout?: RepoWorkspaceLayout
  detailCollapsed?: boolean
}

interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  variant?: 'plain' | 'repo' | 'detail'
}

interface PaneProps {
  children: ReactNode
  border?: boolean
  layout?: RepoWorkspaceLayout
}

interface ToolbarTitleProps {
  title: ReactNode
  description?: ReactNode
  after?: ReactNode
}

interface EmptyStateProps {
  icon?: ReactNode
  title: ReactNode
  body?: ReactNode
  tone?: 'neutral' | 'success'
}

export function Toolbar({ children, className, variant = 'plain', ...props }: ToolbarProps) {
  return (
    <div
      className={cn(
        'flex h-9 shrink-0 items-center border-b border-separator',
        variant === 'repo' && 'gap-3 bg-card px-4',
        variant === 'detail' && 'min-w-0 justify-between gap-2 bg-muted px-2',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function ToolbarTitle({ title, description, after }: ToolbarTitleProps) {
  return (
    <div className="min-w-0 flex-1 flex items-center gap-2">
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <div className="shrink-0 truncate text-sm font-semibold text-foreground">{title}</div>
        {description && <div className="min-w-0 truncate text-xs text-muted-foreground">{description}</div>}
      </div>
      {after}
    </div>
  )
}

export function RepoWorkspace({
  children,
  layout = DEFAULT_WORKSPACE_LAYOUT,
  detailCollapsed = false,
}: RepoWorkspaceProps) {
  const axis = workspaceLayoutAxis(layout)
  return (
    <div
      className={cn(
        'grid min-h-0 flex-1',
        axis === 'columns'
          ? 'grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'
          : detailCollapsed
            // Matches the detail toolbar's `h-9`; border is included by global border-box sizing.
            ? 'grid-rows-[minmax(0,1fr)_2.25rem]'
            : 'grid-rows-[minmax(0,1fr)_minmax(0,1fr)]',
      )}
    >
      {children}
    </div>
  )
}

export function RepoWorkspacePane({ children, border = false, layout = DEFAULT_WORKSPACE_LAYOUT }: PaneProps) {
  const axis = workspaceLayoutAxis(layout)
  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden',
        border && (axis === 'columns' ? 'border-r border-separator' : 'border-b border-separator'),
      )}
    >
      {children}
    </div>
  )
}

export function ScrollPane({ children }: ShellProps) {
  return (
    <ScrollArea className="min-h-0 flex-1" viewportClassName="[&>div]:!block [&>div]:!min-w-0 [&>div]:!w-full">
      {children}
    </ScrollArea>
  )
}

export function EmptyState({ icon, title, body, tone = 'neutral' }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 text-center">
      <div>
        {icon && (
          <div
            className={cn(
              'mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full',
              tone === 'success' ? 'bg-success-surface text-success' : 'bg-muted text-muted-foreground',
            )}
          >
            {icon}
          </div>
        )}
        <div className="text-sm font-medium text-foreground">{title}</div>
        {body && <div className="mt-1 text-xs text-muted-foreground">{body}</div>}
      </div>
    </div>
  )
}
