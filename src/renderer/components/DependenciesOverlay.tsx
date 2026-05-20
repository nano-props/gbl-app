import { Code2, GitBranch, GitPullRequest, Terminal } from 'lucide-react'
import { Modal } from '#/renderer/components/Modal.tsx'
import { Badge } from '#/renderer/components/ui/badge.tsx'
import { useT } from '#/renderer/stores/i18n.ts'
import type { BadgeVariant } from '#/renderer/components/ui/badge.tsx'

interface Props {
  open: boolean
  onClose: () => void
}

const DEPENDENCIES = [
  {
    id: 'git',
    Icon: GitBranch,
    badgeVariant: 'warning',
    badgeKey: 'dependencies.required',
    titleKey: 'dependencies.git.title',
    commandKey: 'dependencies.git.command',
    bodyKey: 'dependencies.git.body',
  },
  {
    id: 'gh',
    Icon: GitPullRequest,
    badgeVariant: 'brand',
    badgeKey: 'dependencies.optional',
    titleKey: 'dependencies.gh.title',
    commandKey: 'dependencies.gh.command',
    bodyKey: 'dependencies.gh.body',
  },
  {
    id: 'ghostty',
    Icon: Terminal,
    badgeVariant: 'brand',
    badgeKey: 'dependencies.optional',
    titleKey: 'dependencies.ghostty.title',
    commandKey: 'dependencies.ghostty.command',
    bodyKey: 'dependencies.ghostty.body',
  },
  {
    id: 'vscode',
    Icon: Code2,
    badgeVariant: 'brand',
    badgeKey: 'dependencies.optional',
    titleKey: 'dependencies.vscode.title',
    commandKey: 'dependencies.vscode.command',
    bodyKey: 'dependencies.vscode.body',
  },
] satisfies {
  id: string
  Icon: typeof GitBranch
  badgeVariant: BadgeVariant
  badgeKey: string
  titleKey: string
  commandKey: string
  bodyKey: string
}[]

export function DependenciesOverlay({ open, onClose }: Props) {
  const t = useT()
  return (
    <Modal open={open} title={t('dependencies.title')} onClose={onClose} widthClass="sm:max-w-2xl">
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">{t('dependencies.intro')}</p>
        <ul className="divide-y divide-border border-y border-border">
          {DEPENDENCIES.map((dependency) => (
            <DependencyRow key={dependency.id} dependency={dependency} />
          ))}
        </ul>
      </div>
    </Modal>
  )
}

function DependencyRow({ dependency }: { dependency: (typeof DEPENDENCIES)[number] }) {
  const t = useT()
  const Icon = dependency.Icon
  return (
    <li className="grid min-h-11 grid-cols-[1.25rem_7.5rem_minmax(0,1fr)_auto] items-center gap-3 px-1 py-2">
      <span className="flex size-5 items-center justify-center text-muted-foreground">
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">{t(dependency.titleKey)}</div>
        <div className="font-mono text-xs text-muted-foreground">{t(dependency.commandKey)}</div>
      </div>
      <p className="min-w-0 truncate text-xs leading-relaxed text-muted-foreground" title={t(dependency.bodyKey)}>
        {t(dependency.bodyKey)}
      </p>
      <Badge variant={dependency.badgeVariant}>{t(dependency.badgeKey)}</Badge>
    </li>
  )
}
