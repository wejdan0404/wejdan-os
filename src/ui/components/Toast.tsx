import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon, type IconName } from '../icons/Icon'
import { dur, ease, springs } from '../motion'
import styles from './Toast.module.css'

export interface ToastOptions {
  message: string
  /** e.g. «تراجع» — shows an undo-style action. */
  actionLabel?: string
  onAction?: () => void
  /**
   * The action's icon, so it always says what the action does: «تراجع» → the undo arrow; any other
   * action (e.g. «فعّليه») → a check by default. Pass `null` for a text-only action.
   */
  actionIcon?: IconName | null
  /** ms; default 3500, 5000 when an action is present (time to undo). */
  duration?: number
}

interface ToastState extends ToastOptions {
  id: number
}

const ToastContext = createContext<(o: ToastOptions) => void>(() => {})

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const seq = useRef(0)
  const show = useCallback((o: ToastOptions) => setToast({ ...o, id: ++seq.current }), [])
  const done = useCallback(() => setToast(null), [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      {createPortal(<ToastView toast={toast} onDone={done} />, document.body)}
    </ToastContext.Provider>
  )
}

type Placement = 'dock' | 'top'

/** Controls the toast may never lie over: buttons, links, inputs and ARIA widgets. */
const CONTROLS =
  'button, a[href], input, select, textarea, summary, [role="button"], [role="checkbox"], [role="switch"], [role="tab"], [role="radio"], [role="menuitem"], [tabindex]:not([tabindex="-1"])'
const GAP = 8
const MAX_DOCKED_HOLD = 240

/** The closest position:fixed ancestor (or the element itself): what is docked to the screen, not to a scroller. */
function dockedAncestor(el: HTMLElement): HTMLElement | null {
  for (let n: HTMLElement | null = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
    if (getComputedStyle(n).position === 'fixed') return n
  }
  return null
}

interface Placed {
  placement: Placement
  /** px from the viewport's bottom edge to the toast's bottom edge; `null` = the CSS default (safe area + gap). */
  bottom: number | null
  /** px from the viewport's bottom edge to the top of the toast's band: the screens end here (see AppShell). */
  reserve: number
}

/**
 * Where the toast goes. It floats clear of every control that is docked to the screen — the tab bar
 * (+ safe area), the + button, a sheet's own controls — so none is ever covered, replaced or made inert
 * while it shows. It starts at the bottom edge and steps up past whatever it would touch (measured
 * live, so no screen has to register anything).
 * The screens above it are given the band it occupies (`reserve`): their scrollports end at the toast's
 * top edge, so list rows scroll beneath nothing, and a sticky footer / CTA dock rides just above the toast.
 * If there is no free band (a sheet packed edge to edge) it falls back to a banner under the status bar.
 */
function placeToast(region: HTMLElement): Placed {
  const vw = window.innerWidth
  const vh = window.innerHeight
  region.style.removeProperty('--toast-bottom')
  const cs0 = getComputedStyle(region)
  const base = parseFloat(cs0.paddingBottom) || GAP
  const h = region.querySelector<HTMLElement>('[data-toast]')?.offsetHeight || 56
  const margin = parseFloat(cs0.paddingInlineStart) || 20
  const w = Math.min(420, vw - margin * 2)
  const x0 = (vw - w) / 2
  const x1 = x0 + w

  // docked controls within reach of the toast (lower 60% of the screen), each with the box to clear
  const held: { top: number; bottom: number; hold: number }[] = []
  for (const el of document.querySelectorAll<HTMLElement>(CONTROLS)) {
    if (region.contains(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0 || r.bottom < vh * 0.4 || r.top > vh || r.right < x0 || r.left > x1) continue
    if (el.closest('[inert], [hidden]')) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.pointerEvents === 'none' || cs.display === 'none') continue
    const dock = dockedAncestor(el)
    if (!dock) continue
    const dr = dock.getBoundingClientRect()
    const useDock = dr.height > 0 && dr.height <= MAX_DOCKED_HOLD && dr.width >= r.width
    held.push({ top: r.top, bottom: r.bottom, hold: useDock ? Math.min(dr.top, r.top) : r.top })
  }

  let bottom = base
  for (let i = 0; i < 24; i++) {
    const top = vh - bottom - h
    const edge = vh - bottom
    const hits = held.filter((c) => c.bottom > top && c.top < edge)
    if (!hits.length) break
    bottom = Math.max(...hits.map((c) => vh - c.hold)) + GAP
  }
  if (bottom + h > vh - 96) return { placement: 'top', bottom: null, reserve: 0 }
  return { placement: 'dock', bottom: bottom === base ? null : Math.round(bottom), reserve: Math.round(bottom + h + GAP) }
}

/** Undo actions get the undo arrow; every other action a check (unless the caller names one). */
export function actionIconOf(o: Pick<ToastOptions, 'actionLabel' | 'actionIcon'>): IconName | null {
  if (o.actionIcon !== undefined) return o.actionIcon
  return (o.actionLabel ?? 'تراجع') === 'تراجع' ? 'undo' : 'check'
}

function ToastView({ toast, onDone }: { toast: ToastState | null; onDone: () => void }) {
  const reduce = useReducedMotion()
  const regionRef = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<Placement>('dock')

  const place = useCallback(() => {
    const region = regionRef.current
    if (!region) return
    const p = placeToast(region)
    if (p.bottom === null) region.style.removeProperty('--toast-bottom')
    else region.style.setProperty('--toast-bottom', `${p.bottom}px`)
    setPlacement((cur) => (cur === p.placement ? cur : p.placement))
    // a sheet makes the app behind it inert and steps it back: nothing to reserve then
    const reserve = p.placement === 'dock' && !document.body.hasAttribute('data-sheet') ? p.reserve : 0
    const root = document.documentElement
    if (reserve > 0) {
      root.style.setProperty('--toast-reserve', `${reserve}px`)
      document.body.setAttribute('data-toast-reserve', '')
    } else {
      root.style.removeProperty('--toast-reserve')
      document.body.removeAttribute('data-toast-reserve')
    }
  }, [])

  // placed before paint, then kept clear while it shows: a sheet or route opening / closing, a footer
  // sliding in, a keyboard or a resize all move what the toast must stay clear of.
  useLayoutEffect(() => {
    if (!toast) return
    place()
    const iv = window.setInterval(place, 200)
    const mo = new MutationObserver(place)
    mo.observe(document.body, { attributes: true, attributeFilter: ['data-sheet'] })
    window.addEventListener('resize', place)
    window.visualViewport?.addEventListener('resize', place)
    return () => {
      window.clearInterval(iv)
      mo.disconnect()
      document.documentElement.style.removeProperty('--toast-reserve')
      document.body.removeAttribute('data-toast-reserve')
      window.removeEventListener('resize', place)
      window.visualViewport?.removeEventListener('resize', place)
    }
  }, [toast, place])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(onDone, toast.duration ?? (toast.onAction ? 5000 : 3500))
    return () => window.clearTimeout(t)
  }, [toast, onDone])

  const fromY = placement === 'dock' ? 12 : -16
  return (
    // exempt from the sheet's inert backdrop so «تراجع» stays reachable while a sheet is up
    <div ref={regionRef} className={styles.region} data-placement={placement} role="status" aria-live="polite" data-inert-exempt="">
      <AnimatePresence mode="popLayout">
        {toast && (
          <motion.div
            key={toast.id}
            className={styles.toast}
            data-toast=""
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: fromY, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: fromY / 2, transition: { duration: dur.quick, ease: ease.exit } }}
            transition={springs.smooth}
            onClick={onDone}
          >
            <span className={styles.message}>{toast.message}</span>
            {toast.onAction && (
              <button
                type="button"
                className={styles.action}
                onClick={(e) => {
                  e.stopPropagation()
                  toast.onAction?.()
                  onDone()
                }}
              >
                {actionIconOf(toast) && <Icon name={actionIconOf(toast)!} size={18} data-icon={actionIconOf(toast)!} />}
                {toast.actionLabel ?? 'تراجع'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
