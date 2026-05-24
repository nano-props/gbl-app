// @vitest-environment jsdom

import { describe, expect, test } from 'vitest'
import { terminalThemeForCurrentDocument } from '#/renderer/components/terminal/terminal-theme.ts'

describe('terminal theme', () => {
  test('returns a fresh theme object for each read', () => {
    document.documentElement.setAttribute('data-theme', 'light')

    const first = terminalThemeForCurrentDocument()
    const second = terminalThemeForCurrentDocument()
    first.background = '#000000'

    expect(second.background).toBe('#fbfbfd')
    expect(second.white).toBe('#6e6e73')
    expect(second.brightWhite).toBe('#1d1d1f')
    expect(terminalThemeForCurrentDocument().background).toBe('#fbfbfd')
  })

  test('resolves dark theme from html data-theme', () => {
    document.documentElement.setAttribute('data-theme', 'dark')

    expect(terminalThemeForCurrentDocument()).toMatchObject({
      background: '#111113',
      foreground: '#f5f5f7',
    })
  })
})
