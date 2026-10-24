import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'
const KEY = 'wejdan.theme'

const read = (): ThemePref => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

/** Keep the browser/status-bar colour in step with an explicit theme choice (the media-query
 *  metas in index.html only follow the system setting). */
function syncThemeColor(pref: ThemePref) {
  if (typeof document === 'undefined') return
  const dark = pref === 'dark' || (pref === 'system' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  // match the page's real ground (tokens decide it), so the browser/system bar never shows a
  // different colour from the page; fall back to the identity's surface colours
  let color = dark ? '#0E121C' : '#FFFFFF'
  try {
    const bg = getComputedStyle(document.body).backgroundColor
    if (bg && bg !== 'transparent' && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(bg)) color = bg
  } catch {
    /* keep the fallback */
  }
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"][data-dynamic]')
  if (!meta) {
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove())
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.dataset.dynamic = ''
    document.head.appendChild(meta)
  }
  meta.content = color
  // iOS standalone: 'default' = dark status-bar text for the light theme; 'black-translucent' keeps
  // white text over the dark theme. iOS reads it at launch, so this applies from the next open.
  const bar = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]')
  if (bar) bar.content = dark ? 'black-translucent' : 'default'
}

const ThemeCtx = createContext<{ pref: ThemePref; setPref: (p: ThemePref) => void }>({ pref: 'system', setPref: () => {} })
export const useTheme = () => useContext(ThemeCtx)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(read)
  useEffect(() => {
    const el = document.documentElement
    if (pref === 'system') delete el.dataset.theme
    else el.dataset.theme = pref
    syncThemeColor(pref)
    if (pref !== 'system') return
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const on = () => syncThemeColor('system')
    mq?.addEventListener?.('change', on)
    return () => mq?.removeEventListener?.('change', on)
  }, [pref])
  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p)
    try {
      localStorage.setItem(KEY, p)
    } catch {
      /* storage unavailable — keep in memory */
    }
  }, [])
  return <ThemeCtx.Provider value={{ pref, setPref }}>{children}</ThemeCtx.Provider>
}
