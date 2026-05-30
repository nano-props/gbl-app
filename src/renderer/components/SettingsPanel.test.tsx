// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { SettingsPanel } from '#/renderer/components/SettingsPanel.tsx'
import { useSettingsStore } from '#/renderer/stores/settings.ts'

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastMocks.success,
    error: toastMocks.error,
  },
}))

let container: HTMLDivElement | null = null
let root: Root | null = null
const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
const testWindow = window as unknown as { goblin?: unknown }
const sendTestNotification = vi.fn(async () => true)
const invokeRpc = vi.fn(async ({ path, input }: { path: string; input?: unknown }) => {
  if (path === 'credentials.set') {
    return { githubTokenConfigured: true, secureStorageAvailable: true }
  }
  if (path === 'credentials.clear') {
    return { githubTokenConfigured: false, secureStorageAvailable: true }
  }
  if (path === 'settings.get') {
    return {
      fetchIntervalSec: 60,
      terminalNotificationsEnabled: false,
      shortcutsDisabled: false,
      globalShortcutDisabled: false,
      swapCloseShortcuts: false,
      toggleDetailOnActionBarBlankClick: false,
      globalShortcut: 'CommandOrControl+Shift+G',
      globalShortcutRegistered: true,
      terminalApp: 'auto',
      editorApp: 'auto',
      session: {
        openRepos: [],
        activeRepo: null,
        detailCollapsed: true,
        detailFocusMode: false,
        workspaceLayout: { left: ['sidebar'], center: ['repo'], right: ['detail'] },
        detailPaneSizes: [50, 50],
      },
      recentRepos: [],
    }
  }
  if (path === 'credentials.get') {
    return { githubTokenConfigured: false, secureStorageAvailable: true }
  }
  if (path === 'externalApps.get' || path === 'externalApps.refresh') {
    return {
      terminal: {
        pref: 'auto',
        resolved: null,
        available: false,
        appAvailability: { ghostty: false, terminal: false },
        detectedAt: 0,
      },
      editor: {
        pref: 'auto',
        resolved: null,
        available: false,
        appAvailability: { vscode: false, cursor: false, windsurf: false },
        detectedAt: 0,
      },
    }
  }
  if (path === 'settings.setTerminalApp' || path === 'settings.setEditorApp') return input ?? null
  return null
})

beforeEach(() => {
  reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true
  sendTestNotification.mockClear()
  toastMocks.success.mockClear()
  toastMocks.error.mockClear()
  invokeRpc.mockClear()
  testWindow.goblin = {
    homeDir: '/Users/tester',
    pathForFile: () => '',
    invokeRpc,
    abortRpc: async () => true,
    onEvent: () => () => {},
    terminal: {
      open: vi.fn(),
      restart: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      close: vi.fn(),
      pruneRepo: vi.fn(),
      notifyBell: vi.fn(),
      sendTestNotification,
      setBadge: vi.fn(),
      onOutput: vi.fn(() => () => {}),
      onExit: vi.fn(() => () => {}),
    },
  }
  useSettingsStore.setState({
    githubTokenConfigured: false,
    secureStorageAvailable: true,
  })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  container?.remove()
  root = null
  container = null
  document.body.innerHTML = ''
  delete testWindow.goblin
  reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = false
})

describe('SettingsPanel', () => {
  test('can trigger a test terminal notification from settings', async () => {
    render(<SettingsPanel open page="general" onPageChange={() => {}} onClose={() => {}} />)

    await act(async () => {
      buttonByText('settings.terminal-notifications-test-button').click()
      await Promise.resolve()
    })

    expect(sendTestNotification).toHaveBeenCalledTimes(1)
    expect(toastMocks.success).toHaveBeenCalledWith('settings.terminal-notifications-test-sent')
  })

  test('shows an error toast when the test notification is blocked', async () => {
    sendTestNotification.mockResolvedValueOnce(false)
    render(<SettingsPanel open page="general" onPageChange={() => {}} onClose={() => {}} />)

    await act(async () => {
      buttonByText('settings.terminal-notifications-test-button').click()
      await Promise.resolve()
    })

    expect(toastMocks.error).toHaveBeenCalledWith(
      'settings.terminal-notifications-test-failed',
      { description: 'settings.terminal-notifications-test-failed-hint' },
    )
  })

  test('shows a plain GitHub token input with a visibility toggle', async () => {
    useSettingsStore.setState({
      githubTokenConfigured: true,
      secureStorageAvailable: true,
    })
    render(<SettingsPanel open page="apps" onPageChange={() => {}} onClose={() => {}} />)

    const input = document.body.querySelector('#settings-github-token')
    if (!(input instanceof HTMLInputElement)) throw new Error('Missing GitHub token input')
    expect(document.body.textContent?.includes('settings.github.save')).toBe(false)

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      if (!setValue) throw new Error('Missing input value setter')
      setValue.call(input, 'ghp_test')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const showButton = document.body.querySelector('button[aria-label="settings.github.show-token"]')
    if (!(showButton instanceof HTMLButtonElement)) throw new Error('Missing token visibility button')

    expect(showButton.disabled).toBe(false)

    await act(async () => {
      showButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      showButton.click()
    })

    expect(input.type).toBe('text')

    await act(async () => {
      input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
      await Promise.resolve()
    })

    expect(input.value).toBe('ghp_test')
  })

  test('commits a dirty GitHub token when leaving the apps tab', async () => {
    render(<SettingsPanel open page="apps" onPageChange={() => {}} onClose={() => {}} />)

    const input = document.body.querySelector('#settings-github-token')
    if (!(input instanceof HTMLInputElement)) throw new Error('Missing GitHub token input')

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      if (!setValue) throw new Error('Missing input value setter')
      setValue.call(input, 'ghp_test')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await act(async () => {
      root!.render(<SettingsPanel open page="general" onPageChange={() => {}} onClose={() => {}} />)
      await Promise.resolve()
    })

    expect(invokeRpc).toHaveBeenCalledWith(expect.objectContaining({
      path: 'credentials.set',
      input: { token: 'ghp_test' },
    }))
  })

  test('shows a clear action when a GitHub token is configured', async () => {
    useSettingsStore.setState({
      githubTokenConfigured: true,
      secureStorageAvailable: true,
    })
    render(<SettingsPanel open page="apps" onPageChange={() => {}} onClose={() => {}} />)

    await act(async () => {
      buttonByText('settings.github.clear').click()
      await Promise.resolve()
    })

    expect(invokeRpc).toHaveBeenCalledWith(expect.objectContaining({
      path: 'credentials.clear',
    }))
  })

  test('does not save a dirty token when clearing an existing token', async () => {
    useSettingsStore.setState({
      githubTokenConfigured: true,
      secureStorageAvailable: true,
    })
    render(<SettingsPanel open page="apps" onPageChange={() => {}} onClose={() => {}} />)

    const input = document.body.querySelector('#settings-github-token')
    if (!(input instanceof HTMLInputElement)) throw new Error('Missing GitHub token input')

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      if (!setValue) throw new Error('Missing input value setter')
      setValue.call(input, 'ghp_new_value')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const clearButton = buttonByText('settings.github.clear')
    await act(async () => {
      clearButton.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
      input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
      clearButton.click()
      await Promise.resolve()
    })

    expect(invokeRpc).not.toHaveBeenCalledWith(expect.objectContaining({
      path: 'credentials.set',
      input: { token: 'ghp_new_value' },
    }))
    expect(invokeRpc).toHaveBeenCalledWith(expect.objectContaining({
      path: 'credentials.clear',
    }))
  })
})

function render(element: React.ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => {
    root!.render(element)
  })
}

function buttonByText(text: string): HTMLButtonElement {
  const buttons = Array.from(document.body.querySelectorAll('button'))
  const match = buttons.find((button) => button.textContent?.includes(text))
  if (!(match instanceof HTMLButtonElement)) throw new Error(`Missing button with text: ${text}`)
  return match
}
