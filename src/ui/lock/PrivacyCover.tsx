import { useEffect } from 'react'
import { WMark } from '../components/WMark'
import { T } from './copy'
import s from './lock.module.css'

/**
 * Neutral cover for the app-switcher snapshot: while the page is hidden (or being put away) a plain
 * W screen sits on top. Toggled synchronously on `visibilitychange`/`pagehide`, before the OS snapshots.
 */
export function PrivacyCover() {
  useEffect(() => {
    const root = document.documentElement
    const on = () => root.setAttribute('data-vault-cover', '')
    const off = () => root.removeAttribute('data-vault-cover')
    const vis = () => (document.visibilityState === 'hidden' ? on() : off())
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('pagehide', on)
    window.addEventListener('pageshow', off)
    return () => {
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('pagehide', on)
      window.removeEventListener('pageshow', off)
      off()
    }
  }, [])
  return (
    <div className={s.cover} role="img" aria-label={T.coverLabel} data-vault-cover-el="">
      <WMark size={96} />
    </div>
  )
}
