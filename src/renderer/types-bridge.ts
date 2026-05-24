// Re-exports for store/component imports. Centralizes bridge types so
// stores don't need to redeclare them.

export type {
  ThemePref,
  ResolvedTheme,
  ThemeState,
  LangPref,
  Lang,
  TerminalPref,
  EditorPref,
  WorkspaceLayout,
  I18nPayload,
  SessionState,
  SettingsSnapshot,
  GlobalShortcutState,
  CloneRepoResult,
  CommitMeta,
  CommitFileStat,
  CommitDetail,
  MenuAction,
} from '#/shared/rpc.ts'
