// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { useAppOverlays } from '#/renderer/hooks/useAppOverlays.ts'

let container: HTMLDivElement | null = null
let root: Root | null = null
const reactActEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }

function Harness() {
  const overlays = useAppOverlays()

  return (
    <>
      <button id="open-settings-about" type="button" onClick={() => overlays.openSettings('about')}>
        open settings about
      </button>
      <button id="close-settings" type="button" onClick={overlays.closeSettings}>
        close settings
      </button>
      <button id="open-clone" type="button" onClick={overlays.openCloneRepo}>
        open clone
      </button>
      <button id="open-repo" type="button" onClick={overlays.openRepoPathDialog}>
        open repo
      </button>
      <button id="close-all" type="button" onClick={overlays.closeAllOverlays}>
        close all
      </button>
      <output id="settings-open">{overlays.state.settings.open ? 'open' : 'closed'}</output>
      <output id="settings-page">{overlays.state.settings.page}</output>
      <output id="clone-open">{overlays.state.clone.open ? 'open' : 'closed'}</output>
      <output id="open-repo-open">{overlays.state.openRepo.open ? 'open' : 'closed'}</output>
      <output id="any-open">{overlays.anyOpen ? 'open' : 'closed'}</output>
    </>
  )
}

beforeEach(() => {
  reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  container?.remove()
  root = null
  container = null
  reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = false
})

describe('useAppOverlays', () => {
  test('tracks overlay state centrally and resets all overlays together', () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    act(() => {
      root!.render(<Harness />)
    })

    click('#open-settings-about')
    click('#open-clone')
    click('#open-repo')
    expect(text('#settings-open')).toBe('open')
    expect(text('#settings-page')).toBe('about')
    expect(text('#clone-open')).toBe('open')
    expect(text('#open-repo-open')).toBe('open')
    expect(text('#any-open')).toBe('open')

    click('#close-all')
    expect(text('#settings-open')).toBe('closed')
    expect(text('#settings-page')).toBe('general')
    expect(text('#clone-open')).toBe('closed')
    expect(text('#open-repo-open')).toBe('closed')
    expect(text('#any-open')).toBe('closed')
  })
})

function click(selector: string) {
  const element = container?.querySelector(selector)
  if (!(element instanceof HTMLButtonElement)) throw new Error(`Missing button: ${selector}`)
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function text(selector: string): string {
  const element = container?.querySelector(selector)
  if (!(element instanceof HTMLOutputElement)) throw new Error(`Missing output: ${selector}`)
  return element.textContent ?? ''
}
