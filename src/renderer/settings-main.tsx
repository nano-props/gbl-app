import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SettingsWindowApp } from '#/renderer/SettingsWindowApp.tsx'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('root element missing')
createRoot(rootEl).render(
  <StrictMode>
    <SettingsWindowApp />
  </StrictMode>,
)
