import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../icons/Icon'
import { StarDottedLine } from '../components/StarDottedLine'
import { Bidi } from '../components/Bidi'
import { T } from './copy'
import s from './lock.module.css'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const INERT_MARK = 'data-lockpage-inert'
let overlays = 0
let rootOpener: HTMLElement | null = null

/**
 * Makes [node] a real modal dialog while it is mounted: everything else under <body> is inert (so Tab and screen-reader
 * browsing cannot leave it), Tab/Shift+Tab cycle inside, Escape calls [onEscape] (only when nothing is on top of it and
 * it is safe), and focus goes back to what opened it. Elements the page itself opted out (toasts) stay reachable.
 */
function useModalDialog(ref: React.RefObject<HTMLElement | null>, active: boolean, onEscape?: () => void) {
  const escRef = useRef(onEscape)
  escRef.current = onEscape
  // the element that opened the FIRST overlay of a chain (setup → recovery code swap pages; focus returns to the original opener)
  useState(() => {
    if (active && overlays === 0 && typeof document !== 'undefined') rootOpener = document.activeElement as HTMLElement | null
  })
  useEffect(() => {
    const node = ref.current
    if (!active || !node) return
    overlays++
    const host = node.parentElement === document.body ? node : (node.closest('body > *') as HTMLElement | null)
    const marked: HTMLElement[] = []
    for (const el of Array.from(document.body.children)) {
      if (!(el instanceof HTMLElement) || el === host || el.tagName === 'SCRIPT') continue
      if (el.hasAttribute('data-inert-exempt') || el.hasAttribute('inert')) continue
      el.setAttribute('inert', '')
      el.setAttribute(INERT_MARK, '')
      marked.push(el)
    }
    const items = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest('[inert],[hidden]'))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // a sheet opened from here answers Escape first
        if (document.body.dataset.sheet !== undefined) return
        if (escRef.current) {
          e.preventDefault()
          escRef.current()
        }
        return
      }
      if (e.key !== 'Tab') return
      const list = items()
      if (list.length === 0) {
        e.preventDefault()
        node.focus()
        return
      }
      const first = list[0]!
      const last = list[list.length - 1]!
      const cur = document.activeElement
      if (!node.contains(cur)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && (cur === first || cur === node)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && cur === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      for (const el of marked) {
        el.removeAttribute('inert')
        el.removeAttribute(INERT_MARK)
      }
      overlays--
      window.setTimeout(() => {
        const o = rootOpener
        if (overlays === 0 && o?.isConnected && !o.closest('[inert]')) o.focus?.()
      }, 0)
    }
  }, [ref, active])
}

/**
 * Full-screen page used by setup, recovery, unlock, picker. `portal` lifts it over the running app (setup from
 * Settings) and makes it a modal dialog: role=dialog + aria-modal, focus trap, inert background, focus returned on close.
 */
export function LockPage({ children, glow, portal, label, onEscape }: { children: ReactNode; glow?: boolean; portal?: boolean; label?: string; onEscape?: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = ref.current
    const target = node?.querySelector<HTMLElement>('[data-autofocus]')
    if (target) target.focus()
    else if (portal) node?.focus()
  }, [portal])
  useModalDialog(ref, !!portal, onEscape)
  const node = portal ? (
    <div ref={ref} className={`${s.root} ${glow ? s.rootGlow : ''}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
      <div className={s.page}>{children}</div>
    </div>
  ) : (
    <div ref={ref} className={`${s.root} ${glow ? s.rootGlow : ''}`} role="main" aria-label={label}>
      <div className={s.page}>{children}</div>
    </div>
  )
  return portal ? createPortal(node, document.body) : node
}

export function BackRow({ label, onClick, end }: { label: string; onClick: () => void; end?: ReactNode }) {
  return (
    <div className={s.top}>
      <button type="button" className={s.backBtn} onClick={onClick}>
        <Icon name="chevron" size={20} />
        <span>{label}</span>
      </button>
      {end}
    </div>
  )
}

/** «الخطوة 1 من 2» + the Star Dotted Line. */
export function Steps({ n }: { n: 1 | 2 }) {
  return (
    <div className={s.steps}>
      <span>
        <Bidi>{T.stepOf(n)}</Bidi>
      </span>
      <StarDottedLine total={2} done={n - 1} label={T.stepOf(n)} />
    </div>
  )
}
