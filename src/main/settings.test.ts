import { afterEach, expect, mock, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

let tmp: string | null = null

afterEach(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true })
  tmp = null
})

test('flushSettings drains writes queued during an in-flight flush', async () => {
  tmp = mkdtempSync(path.join(os.tmpdir(), 'gbl-settings-test-'))
  mock.module('electron', () => ({ app: { getPath: () => tmp! } }))
  const settings = await import('#/main/settings.ts')
  const writeFile = fs.writeFile.bind(fs)
  let writes = 0
  ;(fs as unknown as { writeFile: typeof fs.writeFile }).writeFile = async (...args) => {
    writes += 1
    if (writes === 1) await settings.setFetchInterval(300)
    return writeFile(...args)
  }

  try {
    await settings.setThemePref('dark')
    const flushed = await settings.flushSettings()
    expect(flushed).toBe(true)
  } finally {
    ;(fs as unknown as { writeFile: typeof fs.writeFile }).writeFile = writeFile
  }

  const saved = JSON.parse(readFileSync(path.join(tmp, 'settings.json'), 'utf-8')) as { fetchIntervalSec: number }
  expect(writes).toBe(2)
  expect(saved.fetchIntervalSec).toBe(300)
})

test('flushSettings reports earlier failures in a chained flush', async () => {
  tmp = mkdtempSync(path.join(os.tmpdir(), 'gbl-settings-test-'))
  mock.module('electron', () => ({ app: { getPath: () => tmp! } }))
  const settings = await import('#/main/settings.ts')
  const writeFile = fs.writeFile.bind(fs)
  const warn = console.warn
  let writes = 0
  console.warn = () => {}
  ;(fs as unknown as { writeFile: typeof fs.writeFile }).writeFile = async (...args) => {
    writes += 1
    if (writes === 1) {
      await settings.setFetchInterval(301)
      throw new Error('disk full')
    }
    return writeFile(...args)
  }

  try {
    await settings.setThemePref('light')
    const flushed = await settings.flushSettings()
    expect(flushed).toBe(false)
  } finally {
    ;(fs as unknown as { writeFile: typeof fs.writeFile }).writeFile = writeFile
    console.warn = warn
  }

  const saved = JSON.parse(readFileSync(path.join(tmp, 'settings.json'), 'utf-8')) as {
    theme: string
    fetchIntervalSec: number
  }
  expect(writes).toBe(2)
  expect(saved.theme).toBe('light')
  expect(saved.fetchIntervalSec).toBe(301)
})
