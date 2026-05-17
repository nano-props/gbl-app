// Renderer-side i18n. Hydrate at boot pulls the dictionary; setPref
// writes through and the broadcast keeps every window in sync. The
// hook `useT()` returns a render-bound `t()` function so component
// re-renders when the dictionary changes.

import { create } from 'zustand'
import type { Lang, LangPref } from '#/renderer/types-bridge.ts'

export type { Lang, LangPref }
export type Dict = Record<string, string>

interface I18nState {
  lang: Lang
  pref: LangPref
  dict: Dict
  hydrate: () => Promise<void>
  setPref: (pref: LangPref) => Promise<void>
}

export const useI18nStore = create<I18nState>((set) => ({
  lang: 'en',
  pref: 'auto',
  dict: {},

  async hydrate() {
    const payload = await window.gbl.i18n.get()
    set({ lang: payload.lang, pref: payload.pref, dict: payload.dict })
    document.documentElement.setAttribute('lang', payload.lang)
    window.gbl.i18n.onChange((next) => {
      set({ lang: next.lang, pref: next.pref, dict: next.dict })
      document.documentElement.setAttribute('lang', next.lang)
    })
  },

  async setPref(pref) {
    const payload = await window.gbl.i18n.setPref(pref)
    if (payload) {
      set({ lang: payload.lang, pref: payload.pref, dict: payload.dict })
      document.documentElement.setAttribute('lang', payload.lang)
    }
  },
}))

/** Render-bound translator. Calls re-render when the dict updates so a
 *  language flip refreshes every visible string without manual wiring. */
export function useT() {
  const dict = useI18nStore((s) => s.dict)
  return (key: string, params?: Record<string, string | number>) => {
    const raw = dict[key] ?? key
    if (!params) return raw
    return raw.replace(/\{(\w+)\}/g, (m, name) => {
      const v = params[name]
      return v == null ? m : String(v)
    })
  }
}
