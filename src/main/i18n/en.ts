// English dictionary. Keep keys in sync with zh.ts and ko.ts.
//
// Style: terse, sentence case for buttons/menu items, period-terminated
// sentences for hints. Brand names (GBL / GitHub / Finder) are not
// translated.

export const en = {
  // ---- Menu (top-level) ---------------------------------------------------
  'menu.file': 'File',
  'menu.edit': 'Edit',
  'menu.view': 'View',
  'menu.window': 'Window',
  'menu.help': 'Help',

  // ---- Menu — App (macOS application menu) --------------------------------
  'menu.app.about': 'About {name}',
  'menu.app.services': 'Services',
  'menu.app.hide': 'Hide {name}',
  'menu.app.hideOthers': 'Hide Others',
  'menu.app.showAll': 'Show All',
  'menu.app.quit': 'Quit {name}',
  'menu.app.settings': 'Settings…',

  // ---- Menu — Window (macOS) ----------------------------------------------
  'menu.window.minimize': 'Minimize',
  'menu.window.zoom': 'Zoom',
  'menu.window.front': 'Bring All to Front',

  // ---- Menu — File --------------------------------------------------------
  'menu.file.openRepo': 'Open Repository…',
  'menu.file.closeTab': 'Close Tab',
  'menu.file.settings': 'Settings…',
  'menu.file.quit': 'Quit',

  // ---- Menu — Edit --------------------------------------------------------
  'menu.edit.cut': 'Cut',
  'menu.edit.copy': 'Copy',
  'menu.edit.paste': 'Paste',
  'menu.edit.selectAll': 'Select All',

  // ---- Menu — View --------------------------------------------------------
  'menu.view.branches': 'Branches',
  'menu.view.log': 'Log',
  'menu.view.status': 'Status',
  'menu.view.worktrees': 'Worktrees',
  'menu.view.refresh': 'Refresh',
  'menu.view.toggleTheme': 'Toggle Theme',
  'menu.view.toggleDevTools': 'Toggle Developer Tools',

  // ---- Menu — Window (gbl-specific) ---------------------------------------
  'menu.window.nextRepo': 'Next Repository',
  'menu.window.prevRepo': 'Previous Repository',

  // ---- Menu — Help --------------------------------------------------------
  'menu.help.shortcuts': 'Keyboard Shortcuts',

  // ---- Topbar -------------------------------------------------------------
  'topbar.open': 'Open',
  'topbar.recents': 'Recents',
  'topbar.recentsEmpty': 'No recent repositories.',
  'topbar.help': 'Keyboard shortcuts (?)',
  'topbar.settings': 'Settings (⌘,)',

  // ---- Sidebar ------------------------------------------------------------
  'sidebar.repos': 'Repositories',
  'sidebar.empty.before': 'Click ',
  'sidebar.empty.openLabel': 'Open',
  'sidebar.empty.after': ' in the toolbar to add a git repository.',
  'sidebar.close': 'Close',
  'sidebar.missingTitle': "Couldn't reopen {n} repository",
  'sidebar.missingDismiss': 'Dismiss',

  // ---- Empty state --------------------------------------------------------
  'empty.title': 'No repository open',
  // Body split into segments so React renders the bold/kbd parts as real
  // elements (no dangerouslySetInnerHTML).
  'empty.body.before': 'Click ',
  'empty.body.openLabel': 'Open',
  'empty.body.middle':
    ' in the toolbar above to add a git repository. You can keep multiple repositories open and switch between them in the sidebar. Press ',
  'empty.body.after': ' for shortcuts.',

  // ---- Right-side tabs ----------------------------------------------------
  'tab.branches': 'Branches',
  'tab.log': 'Log',
  'tab.status': 'Status',
  'tab.worktrees': 'Worktrees',
  'tab.fetching': 'fetch',
  'tab.fetchingTitle': 'Background fetch in progress',
  'tab.fetchFailed': 'fetch failed',
  'tab.fetchFailedTitle': 'Most recent background fetch failed — check network or remote.',

  // ---- Branches list ------------------------------------------------------
  'branches.empty': 'No branches found in this repository.',
  'branches.gone': 'gone',
  'branches.dirty': 'dirty',
  'branches.worktree': 'wt',
  'branches.noUpstream': 'No upstream',

  // ---- Log list -----------------------------------------------------------
  'log.empty': 'No commits to show.',
  'log.emptyForBranch': 'No commits to show for {branch}.',

  // ---- Status -------------------------------------------------------------
  'status.cleanTitle': 'Working tree is clean',
  'status.cleanBody': 'No changes to commit.',
  'status.staged': 'Staged',
  'status.stagedHint': 'Ready to commit',
  'status.unstaged': 'Unstaged',
  'status.unstagedHint': 'Modified in worktree',
  'status.untracked': 'Untracked',
  'status.untrackedHint': 'Not yet added',
  'status.label.untracked': 'untracked',
  'status.label.ignored': 'ignored',
  'status.label.added': 'added',
  'status.label.deleted': 'deleted',
  'status.label.modified': 'modified',
  'status.label.renamed': 'renamed',
  'status.label.copied': 'copied',
  'status.label.conflict': 'conflict',
  'status.label.changed': 'changed',

  // ---- Worktrees ----------------------------------------------------------
  'worktrees.empty': 'No worktrees registered.',
  'worktrees.detached': '(detached)',
  'worktrees.bare': 'bare',
  'worktrees.dirtyCount': '{n} dirty',
  'worktrees.reveal': 'Reveal',
  'worktrees.revealTitle': 'Reveal in Finder',
  'worktrees.openInGhosttyTitle': 'Open in Ghostty',

  // ---- Repo actions -------------------------------------------------------
  'action.checkout': 'Checkout',
  'action.pull': 'Pull',
  'action.push': 'Push',
  'action.fetch': 'Fetch',
  'action.github': 'GitHub',
  'action.checkoutCurrent': 'Already on this branch',
  'action.checkoutInWorktree': 'Already checked out in worktree at {path}',
  'action.checkoutTitle': 'Checkout {branch}',
  'action.pullFrom': 'Pull from {tracking}',
  'action.pullNoUpstream': 'No upstream',
  'action.pushTitle': 'Push {branch} to origin',
  'action.fetchTitle': 'git fetch --all --prune',
  'action.githubTitle': 'Open repo in browser',
  'action.resultOk': 'OK',
  'action.resultError': 'Error',
  'action.confirmPushProtectedTitle': 'Push to {branch}?',
  'action.confirmPushProtectedBody.before': 'You are about to push directly to ',
  'action.confirmPushProtectedBody.after': ', which usually deserves a pull request. Continue?',
  'action.confirmPushConfirm': 'Push anyway',
  'action.cancel': 'Cancel',
  'action.cancelTitle': 'Cancel {op}',

  // ---- Errors / banners ---------------------------------------------------
  'error.notGitRepo': 'Not a git repository',
  'error.failedReadRepo': 'Failed to read repository',
  'error.openGithubNoOrigin': 'No origin remote',
  'error.invalidPath': 'Invalid path',
  'error.renderCrashTitle': 'Something broke while rendering this view',
  'error.renderCrashUnknown': 'Unknown render error.',
  'error.tryAgain': 'Try again',
  'error.back': 'Back (Esc)',
  'error.settingsWriteTitle': 'Failed to save settings',

  // ---- Settings panel -----------------------------------------------------
  'settings.title': 'Settings',
  'settings.appearance': 'Appearance',
  'settings.theme.auto': 'Auto',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.lang': 'Language',
  'settings.lang.auto': 'Auto',
  'settings.lang.en': 'English',
  'settings.lang.zh': '中文',
  'settings.lang.ko': '한국어',
  'settings.lang.ja': '日本語',
  'settings.fetch': 'Auto-fetch',
  'settings.fetchHint':
    'Background `git fetch` for the active repository. Disable on slow networks.',
  'settings.fetch.off': 'Off',
  'settings.fetch.30s': '30 sec',
  'settings.fetch.1m': '1 min',
  'settings.fetch.5m': '5 min',
  'settings.fetch.15m': '15 min',
  'settings.recents': 'Recent repositories',
  'settings.recentsCount': '{n} entries',
  'settings.clearRecents': 'Clear all recents',
  'settings.clearRecentsConfirm': 'Click again to confirm',

  // ---- Help overlay -------------------------------------------------------
  'help.title': 'Keyboard shortcuts',
  'help.section.nav': 'Navigation',
  'help.section.views': 'Views',
  'help.section.actions': 'Actions',
  'help.row.nextBranch': 'Next branch / commit',
  'help.row.prevBranch': 'Previous branch / commit',
  'help.row.nextRepo': 'Next repository',
  'help.row.prevRepo': 'Previous repository',
  'help.row.viewBranches': 'Branches',
  'help.row.viewLog': 'Log',
  'help.row.viewStatus': 'Status',
  'help.row.viewWorktrees': 'Worktrees',
  'help.row.checkout': 'Checkout selected branch',
  'help.row.openRepo': 'Open repository',
  'help.row.closeRepo': 'Close current tab',
  'help.row.refresh': 'Refresh',
  'help.row.settings': 'Settings',
  'help.row.thisHelp': 'This help',
  'help.row.dismiss': 'Dismiss overlay',

  // ---- Generic dialog -----------------------------------------------------
  'dialog.cancel': 'Cancel',
  'dialog.close': 'Close (Esc)',

  // ---- Commit detail ------------------------------------------------------
  'commit.parent': 'parent',
  'commit.parents': 'parents',
  'commit.filesChanged': '{n} file changed',
  'commit.filesChangedPlural': '{n} files changed',
  'commit.empty': 'No file changes (merge or empty commit).',
  'commit.binary': 'binary',
} as const

export type DictKey = keyof typeof en
