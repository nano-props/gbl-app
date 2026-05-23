import { ArrowDown, ArrowUp, ClipboardCopy, GitBranch, GitPullRequest, Trash2 } from 'lucide-react'
import { createElement, type ReactNode } from 'react'
import { GitHubOutlineIcon } from '#/renderer/components/GitHubOutlineIcon.tsx'
import type { RepoState } from '#/renderer/stores/repos/types.ts'
import { useT } from '#/renderer/stores/i18n.ts'
import { useSettingsStore } from '#/renderer/stores/settings.ts'
import { EditorAppIcon, TerminalAppIcon } from '#/renderer/components/ExternalAppIcon/index.tsx'
import { useBranchActions, type BranchUiAction } from '#/renderer/hooks/useBranchActions.tsx'
import type { BranchInfo } from '#/renderer/types.ts'

export interface BranchActionItem {
  id: BranchUiAction
  label: string
  title?: string
  ariaLabel?: string
  disabled: boolean
  visible: boolean
  destructive?: boolean
  shortcut?: string
  icon: ReactNode
  onSelect: () => void
}

export interface BranchActionItemGroups {
  busy: BranchUiAction | null
  patchItems: BranchActionItem[]
  mainItems: BranchActionItem[]
  destructiveItems: BranchActionItem[]
  dialogs: ReactNode
}

export function useBranchActionItems(repo: RepoState, branch: BranchInfo): BranchActionItemGroups {
  const t = useT()
  const terminalApp = useSettingsStore((s) => s.terminalApp)
  const terminalAvailable = useSettingsStore((s) => s.terminalAvailable)
  const editorApp = useSettingsStore((s) => s.editorApp)
  const editorAvailable = useSettingsStore((s) => s.editorAvailable)
  const { busy, capabilities, actions, dialogs } = useBranchActions(repo, branch)
  const githubIcon = branch.pullRequest ? GitPullRequest : GitHubOutlineIcon

  const patchItems: BranchActionItem[] = capabilities.canCopyPatch
    ? [
        {
          id: 'copyPatch',
          label: t('status.copy-patch'),
          title: t('status.copy-patch-title'),
          ariaLabel: t('status.copy-patch-title'),
          disabled: !!busy,
          visible: true,
          icon: createElement(ClipboardCopy),
          onSelect: actions.copyPatch,
        },
      ]
    : []

  const mainItems: BranchActionItem[] = [
    {
      id: 'checkout',
      label: t('action.checkout'),
      disabled: !!busy,
      visible: !capabilities.isCurrent && !capabilities.checkedOutInAnotherWorktree,
      shortcut: '↩',
      icon: createElement(GitBranch),
      onSelect: actions.checkout,
    },
    {
      id: 'pull',
      label: t('action.pull'),
      disabled: !!busy,
      visible: capabilities.canPull,
      shortcut: 'P',
      icon: createElement(ArrowDown),
      onSelect: actions.pull,
    },
    {
      id: 'push',
      label: t('action.push'),
      disabled: !!busy,
      visible: true,
      shortcut: '⇧P',
      icon: createElement(ArrowUp),
      onSelect: actions.push,
    },
    ...(capabilities.canOpenTerminal && terminalAvailable
      ? [
          {
            id: 'terminal' as const,
            label: t('worktrees.open-in-terminal-label'),
            disabled: !!busy,
            visible: true,
            shortcut: 'G',
            icon: createElement(TerminalAppIcon, { pref: terminalApp }),
            onSelect: actions.openTerminal,
          },
        ]
      : []),
    ...(capabilities.canOpenEditor && editorAvailable
      ? [
          {
            id: 'editor' as const,
            label: t('worktrees.open-in-editor-label'),
            disabled: !!busy,
            visible: true,
            shortcut: 'V',
            icon: createElement(EditorAppIcon, { pref: editorApp }),
            onSelect: actions.openEditor,
          },
        ]
      : []),
    {
      id: 'github',
      label: branch.pullRequest ? t('action.github-pr', { n: branch.pullRequest.number }) : t('action.github'),
      disabled: !!busy,
      visible: true,
      shortcut: '⇧G',
      icon: createElement(githubIcon),
      onSelect: actions.openGitHub,
    },
  ]

  const destructiveItems: BranchActionItem[] = [
    ...(capabilities.canRemoveWorktree
      ? [
          {
            id: 'removeWorktree' as const,
            label: t('action.remove-worktree'),
            disabled: !!busy,
            visible: true,
            destructive: true,
            icon: createElement(Trash2),
            onSelect: actions.requestRemoveWorktree,
          },
        ]
      : []),
    ...(capabilities.isRegularBranch
      ? [
          {
            id: 'deleteBranch' as const,
            label: t('action.delete-branch'),
            disabled: !!busy,
            visible: true,
            destructive: true,
            icon: createElement(Trash2),
            onSelect: actions.requestDeleteBranch,
          },
        ]
      : []),
  ]

  return { busy, patchItems, mainItems, destructiveItems, dialogs }
}
