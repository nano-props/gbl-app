import type { ReactNode } from 'react'
import { ScrollArea } from '#/renderer/components/ui/scroll-area.tsx'

interface SettingsContentFrameProps {
  title: string
  topInset?: number
  children: ReactNode
}

export function SettingsContentFrame({ title, topInset = 0, children }: SettingsContentFrameProps) {
  return (
    <section className="flex min-w-0 flex-1 flex-col bg-card" style={{ paddingTop: topInset }}>
      <header className="flex h-14 shrink-0 items-center border-b border-separator px-5">
        <div className="truncate text-sm font-semibold leading-tight text-foreground">{title}</div>
      </header>
      <ScrollArea className="min-h-0 flex-1 bg-muted/20" viewportClassName="h-full">
        <div className="space-y-5 px-5 py-4">{children}</div>
      </ScrollArea>
    </section>
  )
}
