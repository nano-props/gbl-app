// @vitest-environment jsdom

import { act } from 'react'
import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { TabTooltipLayer } from '#/renderer/components/repo-tabs/TabTooltipLayer.tsx'
import type { RepoTabSummary } from '#/renderer/components/repo-tabs/types.ts'

let container: HTMLDivElement | null = null
let root: Root | null = null
const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }

beforeEach(() => {
  reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true
  vi.useFakeTimers()
  const testWindow = globalThis as typeof globalThis & { goblin?: unknown }
  testWindow.goblin = {
    homeDir: '/Users/tester',
    pathForFile: () => '',
    invokeRpc: async () => null,
    abortRpc: async () => true,
    onEvent: () => () => {},
  }
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  container?.remove()
  root = null
  container = null
  document.body.innerHTML = ''
  const testWindow = globalThis as typeof globalThis & { goblin?: unknown }
  delete testWindow.goblin
  vi.useRealTimers()
  reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = false
})

describe('TabTooltipLayer', () => {
  test('shows all remotes in the repo tab tooltip', async () => {
    render(
      <TabTooltipLayer repos={[repo('goblin', '/Users/tester/Developer/goblin', [
        {
          name: 'origin',
          fetchUrl: 'https://github.com/nano-props/goblin.git',
          pushUrl: 'https://github.com/nano-props/goblin.git',
        },
        {
          name: 'upstream',
          fetchUrl: 'https://github.com/acme/goblin.git',
          pushUrl: 'git@github.com:acme/goblin.git',
        },
      ])]} delayMs={0}>
        <div data-repo-tab-tooltip-id="/Users/tester/Developer/goblin">goblin</div>
      </TabTooltipLayer>,
    )

    hoverTab('/Users/tester/Developer/goblin')
    await flushTimers()

    const text = document.body.textContent ?? ''
    expect(text).toContain('goblin')
    expect(text).toContain('~/Developer/goblin')
    expect(text).toContain('origin')
    expect(text).toContain('https://github.com/nano-props/goblin.git')
    expect(text).toContain('upstream')
    expect(text).toContain('https://github.com/acme/goblin.git')
    expect(text).toContain('git@github.com:acme/goblin.git')
  })

  test('shows a no-remotes hint when the repo has no remotes', async () => {
    render(
      <TabTooltipLayer repos={[repo('local-only', '/Users/tester/Developer/local-only', [])]} delayMs={0}>
        <div data-repo-tab-tooltip-id="/Users/tester/Developer/local-only">local-only</div>
      </TabTooltipLayer>,
    )

    hoverTab('/Users/tester/Developer/local-only')
    await flushTimers()

    expect(document.body.textContent).toContain('repo-tabs.tooltip.no-remotes')
  })
})

function repo(name: string, id: string, remoteDetails: RepoTabSummary['remoteDetails']): RepoTabSummary {
  return { id, name, remoteDetails }
}

function render(element: ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => {
    root!.render(element)
  })
}

function hoverTab(id: string) {
  const element = [...document.body.querySelectorAll('[data-repo-tab-tooltip-id]')].find(
    (candidate) => candidate.getAttribute('data-repo-tab-tooltip-id') === id,
  )
  if (!(element instanceof HTMLElement)) throw new Error(`Missing tab: ${id}`)
  element.getBoundingClientRect = () =>
    ({
      left: 12,
      top: 8,
      width: 120,
      height: 32,
      right: 132,
      bottom: 40,
      x: 12,
      y: 8,
      toJSON: () => ({}),
    }) as DOMRect
  act(() => {
    element.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
  })
}

async function flushTimers() {
  await act(async () => {
    vi.runAllTimers()
    await Promise.resolve()
  })
}
