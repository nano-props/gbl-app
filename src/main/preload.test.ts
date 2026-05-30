import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, test, vi } from 'vitest'

function loadPreload(options: { invoke?: (channel: string, ...args: unknown[]) => Promise<unknown> } = {}) {
  const exposed: Record<string, any> = {}
  const invocations: Array<{ channel: string; args: unknown[] }> = []
  const ipcRenderer = {
    invoke: vi.fn((channel: string, ...args: unknown[]) => {
      invocations.push({ channel, args })
      return options.invoke?.(channel, ...args) ?? Promise.resolve({ ok: true, data: 'ok' })
    }),
    on: vi.fn(),
    off: vi.fn(),
  }
  const code = readFileSync(path.join(import.meta.dirname, '../preload/preload.cjs'), 'utf8')
  const sandbox = {
    console,
    process: { argv: [] },
    require: (name: string) => {
      if (name !== 'electron') throw new Error(`unexpected require: ${name}`)
      return {
        contextBridge: {
          exposeInMainWorld: (key: string, api: unknown) => {
            exposed[key] = api
          },
        },
        ipcRenderer,
        webUtils: { getPathForFile: vi.fn() },
      }
    },
  }
  vm.runInNewContext(code, sandbox, { filename: 'preload.cjs' })
  return { goblin: exposed.goblin, invocations, ipcRenderer }
}

describe('preload goblin bridge', () => {
  test('forwards RPC request ids to the main process', async () => {
    const { goblin, invocations } = loadPreload()

    await goblin.invokeRpc({ path: 'repo.status', input: { cwd: '/repo' }, requestId: 'rpc_test_1' })

    expect(invocations[0]).toEqual({
      channel: 'goblin:rpc',
      args: [{ path: 'repo.status', input: { cwd: '/repo' }, requestId: 'rpc_test_1' }],
    })
  })

  test('uses a transport control channel for RPC aborts', async () => {
    const { goblin, invocations } = loadPreload()

    await goblin.abortRpc('rpc_test_1')

    expect(invocations[0]).toEqual({
      channel: 'goblin:rpc-abort',
      args: [{ requestId: 'rpc_test_1' }],
    })
  })

  test('logs failed RPC calls with the request path', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { goblin } = loadPreload({
      invoke: () => Promise.resolve({ ok: false, error: { message: 'boom' } }),
    })

    await expect(
      goblin.invokeRpc({ path: 'repo.status', input: { cwd: '/repo' }, requestId: 'rpc_test_1' }),
    ).rejects.toThrow('boom')

    expect(warn.mock.calls[0]?.[0]).toBe('[rpc] repo.status failed')
    expect((warn.mock.calls[0]?.[1] as Error | undefined)?.message).toBe('boom')
    warn.mockRestore()
  })

  test('shares a single goblin:event ipc listener across subscribers', () => {
    const { goblin, ipcRenderer } = loadPreload()
    const cb1 = vi.fn()
    const cb2 = vi.fn()

    const off1 = goblin.onEvent(cb1)
    const off2 = goblin.onEvent(cb2)

    expect(ipcRenderer.on).toHaveBeenCalledTimes(1)
    expect(ipcRenderer.on).toHaveBeenCalledWith('goblin:event', expect.any(Function))

    const listener = ipcRenderer.on.mock.calls[0]?.[1] as ((event: unknown, payload: unknown) => void) | undefined
    listener?.(null, { type: 'theme-changed' })
    expect(cb1).toHaveBeenCalledWith({ type: 'theme-changed' })
    expect(cb2).toHaveBeenCalledWith({ type: 'theme-changed' })

    off1()
    expect(ipcRenderer.off).not.toHaveBeenCalled()

    off2()
    expect(ipcRenderer.off).toHaveBeenCalledTimes(1)
    expect(ipcRenderer.off).toHaveBeenCalledWith('goblin:event', listener)
  })

  test('continues delivering goblin:event when one subscriber throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { goblin, ipcRenderer } = loadPreload()
    const cb1 = vi.fn(() => {
      throw new Error('boom')
    })
    const cb2 = vi.fn()

    goblin.onEvent(cb1)
    goblin.onEvent(cb2)

    const listener = ipcRenderer.on.mock.calls[0]?.[1] as ((event: unknown, payload: unknown) => void) | undefined
    listener?.(null, { type: 'theme-changed' })

    expect(cb1).toHaveBeenCalledWith({ type: 'theme-changed' })
    expect(cb2).toHaveBeenCalledWith({ type: 'theme-changed' })
    expect(warn).toHaveBeenCalledWith('[ipc] goblin:event subscriber failed', expect.any(Error))
    expect((warn.mock.calls[0]?.[1] as Error | undefined)?.message).toBe('boom')
    warn.mockRestore()
  })
})
