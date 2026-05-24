import type { ITheme } from '@xterm/xterm'

type TerminalThemeMode = 'light' | 'dark'

const LIGHT_TERMINAL_THEME: ITheme = {
  background: '#fbfbfd',
  foreground: '#1d1d1f',
  cursor: '#1d1d1f',
  selectionBackground: 'rgba(0, 122, 255, 0.22)',
  black: '#000000',
  red: '#d70015',
  green: '#1f7f37',
  yellow: '#a45a00',
  blue: '#0066cc',
  magenta: '#af52de',
  cyan: '#007c89',
  white: '#6e6e73',
  brightBlack: '#6e6e73',
  brightRed: '#ff3b30',
  brightGreen: '#34c759',
  brightYellow: '#ff9500',
  brightBlue: '#007aff',
  brightMagenta: '#bf5af2',
  brightCyan: '#32ade6',
  brightWhite: '#1d1d1f',
}

const DARK_TERMINAL_THEME: ITheme = {
  background: '#111113',
  foreground: '#f5f5f7',
  cursor: '#f5f5f7',
  selectionBackground: 'rgba(10, 132, 255, 0.32)',
  black: '#1c1c1e',
  red: '#ff453a',
  green: '#30d158',
  yellow: '#ffd60a',
  blue: '#0a84ff',
  magenta: '#bf5af2',
  cyan: '#64d2ff',
  white: '#d1d1d6',
  brightBlack: '#8e8e93',
  brightRed: '#ff6961',
  brightGreen: '#32d74b',
  brightYellow: '#ffdf5d',
  brightBlue: '#409cff',
  brightMagenta: '#da8fff',
  brightCyan: '#70d7ff',
  brightWhite: '#ffffff',
}

export function terminalThemeForCurrentDocument(): ITheme {
  return terminalThemeForMode(currentTerminalThemeMode())
}

export function observeTerminalTheme(onTheme: (theme: ITheme) => void): () => void {
  const observer = new MutationObserver(() => onTheme(terminalThemeForCurrentDocument()))
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

function terminalThemeForMode(mode: TerminalThemeMode): ITheme {
  return { ...(mode === 'dark' ? DARK_TERMINAL_THEME : LIGHT_TERMINAL_THEME) }
}

function currentTerminalThemeMode(): TerminalThemeMode {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}
