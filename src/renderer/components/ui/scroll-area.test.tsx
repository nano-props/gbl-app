// @vitest-environment jsdom

import { act, forwardRef, type ComponentPropsWithoutRef, type ComponentRef, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, test, vi } from 'vitest'

vi.mock('radix-ui', () => {
  const Root = forwardRef<
    HTMLDivElement,
    ComponentPropsWithoutRef<'div'> & { type?: string; scrollHideDelay?: number }
  >(function Root({ scrollHideDelay: _scrollHideDelay, type: _type, ...props }, ref) {
    return <div ref={ref} {...props} />
  })
  const Viewport = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(function Viewport(props, ref) {
    return <div ref={ref} data-testid="viewport" {...props} />
  })
  const Scrollbar = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'> & { orientation?: 'vertical' | 'horizontal' }>(
    function Scrollbar({ orientation, ...props }, ref) {
      return <div ref={ref} data-testid={`scrollbar-${orientation ?? 'vertical'}`} data-orientation={orientation} {...props} />
    },
  )
  const Thumb = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(function Thumb(props, ref) {
    return <div ref={ref} data-testid="thumb" {...props} />
  })
  const Corner = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(function Corner(props, ref) {
    return <div ref={ref} {...props} />
  })

  return {
    ScrollArea: { Root, Viewport, Scrollbar, Thumb, Corner },
  }
})

import { ScrollArea } from '#/renderer/components/ui/scroll-area.tsx'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ScrollArea', () => {
  test('uses default thumb hit area unless compact mode is requested', async () => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root: Root = createRoot(container)

    try {
      await render(root, <ScrollArea type="always">{renderContent()}</ScrollArea>)
      const defaultThumb = container.querySelector<HTMLElement>('[data-testid="thumb"]')
      expect(defaultThumb?.className).toContain('before:min-h-11')
      expect(defaultThumb?.className).toContain('before:min-w-11')

      await render(
        root,
        <ScrollArea type="always" scrollbarMode="compact">
          {renderContent()}
        </ScrollArea>,
      )
      const compactThumb = container.querySelector<HTMLElement>('[data-testid="thumb"]')
      expect(compactThumb?.className).not.toContain('before:min-h-11')
      expect(compactThumb?.className).not.toContain('before:min-w-11')
    } finally {
      await act(async () => root.unmount())
      container.remove()
    }
  })
})

async function render(root: Root, node: ReactNode) {
  await act(async () => {
    root.render(node)
  })
}

function renderContent() {
  return <div style={{ height: 200 }}>content</div>
}
