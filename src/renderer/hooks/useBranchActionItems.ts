import { ArrowDown, ArrowUp, ClipboardCopy, ExternalLink, GitBranch, GitPullRequest, Trash2 } from 'lucide-react'
import { createElement, type ReactNode } from 'react'
import { GitHubOutlineIcon } from '#/renderer/components/GitHubOutlineIcon.tsx'
import { GitLabLogoIcon } from '#/renderer/components/GitLabLogoIcon.tsx'
import type { RepoBranchState, RepoState } from '#/renderer/stores/repos/types.ts'
import { useT } from '#/renderer/stores/i18n.ts'
import { useSettingsStore } from '#/renderer/stores/settings.ts'
import { EditorAppIcon, TerminalAppIcon } from '#/renderer/components/ExternalAppIcon/index.tsx'
import { useBranchActions, type BranchActionItemId } from '#/renderer/hooks/useBranchActions.tsx'
import { branchActionDisplayPhase, cancelableBranchActionItemId } from '#/renderer/hooks/branch-action-state.ts'
import { branchPullRequestBelongsToBranch } from '#/shared/git-types.ts'
import type { BrowserRemoteProvider } from '#/renderer/types.ts'

export interface BranchActionItem {
  id: BranchActionItemId
  label: string
  title?: string
  ariaLabel?: string
  disabled: boolean
  busy?: boolean
  cancelable?: boolean
  visible: boolean
  destructive?: boolean
  shortcut?: string
  icon: ReactNode
  onSelect: () => void | Promise<void>
}

export interface BranchActionItemGroups {
  patchItems: BranchActionItem[]
  mainItems: BranchActionItem[]
  destructiveItems: BranchActionItem[]
  dialogs: ReactNode
}

export function branchBrowserRemoteProvider(repo: RepoState, branch: RepoBranchState): BrowserRemoteProvider | undefined {
  const providers = repo.remote.remoteProviders
  if (branch.tracking && providers) {
    const remoteName = Object.keys(providers)
      .filter((remote) => branch.tracking === remote || branch.tracking!.startsWith(`${remote}/`))
      .sort((a, b) => b.length - a.length)[0]
    if (remoteName) return providers[remoteName]
  }
  return repo.remote.browserRemoteProvider
}

function browserRemoteIcon(provider: BrowserRemoteProvider | undefined) {
  if (provider === 'github') return GitHubOutlineIcon
  if (provider === 'gitlab') return GitLabLogoIcon
  return ExternalLink
}

export function useBranchActionItems(repo: RepoState, branch: RepoBranchState): BranchActionItemGroups {
  const t = useT()
  const terminalApp = useSettingsStore((s) => s.terminalApp)
  const resolvedTerminalApp = useSettingsStore((s) => s.resolvedTerminalApp)
  const terminalAvailable = useSettingsStore((s) => s.terminalAvailable)
  const editorApp = useSettingsStore((s) => s.editorApp)
  const resolvedEditorApp = useSettingsStore((s) => s.resolvedEditorApp)
  const editorAvailable = useSettingsStore((s) => s.editorAvailable)
  const { blocked, busyAction, capabilities, actions, dialogs } = useBranchActions(repo, branch)
  const disabled = blocked
  const busy = (id: BranchActionItemId) => busyAction === id
  const phase = branchActionDisplayPhase(repo, branch.name)
  const cancelableAction = cancelableBranchActionItemId(repo, branch.name)
  const cancelable = (id: BranchActionItemId) => cancelableAction === id
  const disabledFor = (id: BranchActionItemId) => disabled && !cancelable(id)
  const titleFor = (id: BranchActionItemId, title?: string) => (cancelable(id) ? t('action.cancel') : title)
  const branchActionLabel = (
    id: BranchActionItemId,
    idleKey: string,
    loadingKey: string,
    queuedKey?: string,
  ): string => {
    if (!busy(id)) return t(idleKey)
    if (phase === 'queued' && queuedKey) return t(queuedKey)
    return t(loadingKey)
  }
  const pullRequest =
    branch.pullRequest && branchPullRequestBelongsToBranch(branch, branch.pullRequest) ? branch.pullRequest : undefined
  const remoteIcon = pullRequest ? GitPullRequest : browserRemoteIcon(branchBrowserRemoteProvider(repo, branch))

  const patchItems: BranchActionItem[] = capabilities.canCopyPatch
    ? [
        {
          id: 'copyPatch',
          label: t('status.copy-patch'),
          title: t('status.copy-patch-title'),
          ariaLabel: t('status.copy-patch-title'),
          disabled,
          busy: busy('copyPatch'),
          visible: true,
          icon: createElement(ClipboardCopy),
          onSelect: actions.copyPatch,
        },
      ]
    : []

  const mainItems: BranchActionItem[] = [
    {
      id: 'checkout',
      label: branchActionLabel('checkout', 'action.checkout', 'action.checkout-loading'),
      disabled: disabledFor('checkout'),
      busy: busy('checkout'),
      visible: !capabilities.isCurrent && !capabilities.checkedOutInAnotherWorktree,
      shortcut: '↩',
      icon: createElement(GitBranch),
      onSelect: actions.checkout,
    },
    {
      id: 'pull',
      label: branchActionLabel('pull', 'action.pull', 'action.pull-loading', 'action.pull-queued'),
      title: titleFor('pull'),
      disabled: disabledFor('pull'),
      busy: busy('pull'),
      cancelable: cancelable('pull'),
      visible: capabilities.canPull,
      shortcut: 'P',
      icon: createElement(ArrowDown),
      onSelect: actions.pull,
    },
    {
      id: 'push',
      label: branchActionLabel('push', 'action.push', 'action.push-loading', 'action.push-queued'),
      title: titleFor('push'),
      disabled: disabledFor('push'),
      busy: busy('push'),
      cancelable: cancelable('push'),
      visible: capabilities.canPush,
      shortcut: '⇧P',
      icon: createElement(ArrowUp),
      onSelect: actions.push,
    },
    ...(capabilities.canOpenTerminal && terminalAvailable
      ? [
          {
            id: 'terminal' as const,
            label: t('worktrees.open-in-terminal-label'),
            disabled: disabledFor('terminal'),
            busy: busy('terminal'),
            visible: true,
            shortcut: 'G',
            icon: createElement(TerminalAppIcon, { pref: resolvedTerminalApp ?? terminalApp }),
            onSelect: actions.openTerminal,
          },
        ]
      : []),
    ...(capabilities.canOpenEditor && editorAvailable
      ? [
          {
            id: 'editor' as const,
            label: t('worktrees.open-in-editor-label'),
            disabled: disabledFor('editor'),
            busy: busy('editor'),
            visible: true,
            shortcut: 'V',
            icon: createElement(EditorAppIcon, { pref: resolvedEditorApp ?? editorApp }),
            onSelect: actions.openEditor,
          },
        ]
      : []),
    {
      id: 'remote',
      label: pullRequest ? t('action.remote-pr', { n: pullRequest.number }) : t('action.remote'),
      disabled: disabledFor('remote'),
      busy: busy('remote'),
      visible: capabilities.canOpenRemote,
      shortcut: '⇧G',
      icon: createElement(remoteIcon),
      onSelect: actions.openRemote,
    },
  ]

  const destructiveItems: BranchActionItem[] = [
    ...(capabilities.canRemoveWorktree
      ? [
          {
            id: 'removeWorktree' as const,
            label: branchActionLabel(
              'removeWorktree',
              'action.remove-worktree',
              'action.remove-worktree-removing-title',
            ),
            disabled: disabledFor('removeWorktree'),
            busy: busy('removeWorktree'),
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
            label: branchActionLabel('deleteBranch', 'action.delete-branch', 'action.delete-branch-deleting-title'),
            disabled: disabledFor('deleteBranch'),
            busy: busy('deleteBranch'),
            visible: true,
            destructive: true,
            icon: createElement(Trash2),
            onSelect: actions.requestDeleteBranch,
          },
        ]
      : []),
  ]

  return { patchItems, mainItems, destructiveItems, dialogs }
}
