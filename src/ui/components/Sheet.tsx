import { AnimatePresence, animate, motion, useDragControls, useMotionValue, useReducedMotion, type PanInfo } from 'framer-motion'
import { useEffect, useId, useRef, useState, type KeyboardEvent as RKeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../icons/Icon'
import { dur, ease, springs } from '../motion'
import styles from './Sheet.module.css'

export type Detent = 'medium' | 'large'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  /** Detents the sheet may rest at; the first one is the initial. */
  detents?: Detent[]
  /** iOS nav-row header (boards): a text «إلغاء» at the start instead of the ✕ disc. */
  cancelLabel?: string
  /** Trailing header action (e.g. a submit «احفظي» tied to the sheet's form). Implies the nav row. */
  action?: ReactNode
  /** The content brings its own cancel and heading (Search): no ✕, the title only names the dialog. */
  bare?: boolean
  children: ReactNode
}

const detentHeight = (d: Detent) => (d === 'large' ? 0.92 : 0.52)

// ---- modality (a11y #2) -------------------------------------------------------------------------
// Open sheets, bottom → top. While any is up, every other child of <body> is inert (the app, lower
// sheets, menus); the toast region opts out with data-inert-exempt so «تراجع» stays reachable.
const layers: HTMLElement[] = []
const MANAGED = 'data-sheet-inert'

function applyModality() {
  const top = layers[layers.length - 1] ?? null
  for (const el of Array.from(document.body.children)) {
    if (!(el instanceof HTMLElement) || el.tagName === 'SCRIPT') continue
    const managed = el.hasAttribute(MANAGED)
    const shouldInert = !!top && el !== top && !el.hasAttribute('data-inert-exempt')
    if (shouldInert && !el.hasAttribute('inert')) {
      el.setAttribute('inert', '')
      el.setAttribute(MANAGED, '')
    } else if (!shouldInert && managed) {
      el.removeAttribute('inert')
      el.removeAttribute(MANAGED)
    }
  }
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** iOS bottom sheet: grabber, medium/large detents, drag to resize or dismiss. */
export function Sheet({ open, onClose, title, detents = ['medium', 'large'], cancelLabel, action, bare, children }: SheetProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <SheetBody onClose={onClose} title={title} detents={detents} cancelLabel={cancelLabel} action={action} bare={bare}>
          {children}
        </SheetBody>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function SheetBody({ onClose, title, detents, cancelLabel, action, bare, children }: Omit<SheetProps, 'open'> & { detents: Detent[] }) {
  const navRow = !bare && (cancelLabel != null || action != null)
  const reduce = useReducedMotion()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  // captured during the first render — before the background turns inert (which drops its focus)
  const [opener] = useState(() => (typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null))
  const controls = useDragControls()
  const [detent, setDetent] = useState<Detent>(detents[0])
  // the header grows with text size (200% zoom), so the scrollable content is sized from its real height
  const handleRef = useRef<HTMLDivElement>(null)
  const [handleH, setHandleH] = useState(64)
  useEffect(() => {
    const el = handleRef.current
    if (!el) return
    const measure = () => setHandleH(Math.max(44, Math.ceil(el.getBoundingClientRect().height)))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const maxH = vh * detentHeight('large')
  const offsetFor = (d: Detent) => maxH - vh * detentHeight(d)
  const y = useMotionValue(maxH)

  useEffect(() => {
    animate(y, offsetFor(detent), reduce ? { duration: dur.quick } : springs.sheet)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detent])

  // the page behind steps back while any sheet is up
  useEffect(() => {
    const b = document.body
    const n = Number(b.dataset.sheetCount ?? 0) + 1
    b.dataset.sheetCount = String(n)
    b.dataset.sheet = ''
    return () => {
      const m = Number(b.dataset.sheetCount ?? 1) - 1
      b.dataset.sheetCount = String(m)
      if (m <= 0) delete b.dataset.sheet
    }
  }, [])

  // modal: background inert while this is the top sheet
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layers.push(layer)
    applyModality()
    return () => {
      const i = layers.indexOf(layer)
      if (i >= 0) layers.splice(i, 1)
      applyModality()
    }
  }, [])

  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const prev = opener
    panelRef.current?.focus()
    // only the top sheet answers Escape (a nested sheet must not close the one under it too)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && layers[layers.length - 1] === layerRef.current) onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      // after the background is un-inerted, give focus back to what opened the sheet
      window.setTimeout(() => {
        if (prev?.isConnected && !prev.closest('[inert]')) prev.focus?.()
      }, 0)
    }
  }, [])

  // Tab and Shift+Tab cycle inside the sheet
  const onPanelKeyDown = (e: RKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !panelRef.current) return
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest('[inert],[hidden]'))
    if (items.length === 0) {
      e.preventDefault()
      panelRef.current.focus()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const current = y.get()
    const fling = info.velocity.y
    const order: Detent[] = ['large', 'medium']
    const available = order.filter((d) => detents.includes(d))
    if (fling > 900 || current > offsetFor('medium') + vh * 0.12 || (fling > 300 && detent === available[available.length - 1])) {
      onClose()
      return
    }
    if (fling < -300 && detents.includes('large')) {
      setDetent('large')
      animate(y, offsetFor('large'), springs.sheet)
      return
    }
    // snap to nearest detent
    const nearest = available.reduce((a, b) => (Math.abs(offsetFor(a) - current) < Math.abs(offsetFor(b) - current) ? a : b))
    setDetent(nearest)
    animate(y, offsetFor(nearest), springs.sheet)
  }

  return (
    <div className={styles.layer} ref={layerRef}>
      <motion.div
        className={styles.backdrop}
        aria-hidden="true"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: dur.slow, ease: ease.standard }}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={styles.panel}
        style={{ y, height: maxH }}
        exit={{ y: maxH, transition: reduce ? { duration: dur.quick } : { duration: dur.slow, ease: ease.exit } }}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: maxH }}
        dragElastic={{ top: 0.04, bottom: 0.3 }}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        onKeyDown={onPanelKeyDown}
      >
        <div ref={handleRef} className={styles.handleZone} data-bare={bare || undefined} onPointerDown={(e) => controls.start(e)}>
          <span className={styles.grabber} aria-hidden="true" />
          {navRow ? (
            <div className={styles.navRow}>
              {/* every sheet can be closed without a gesture (VoiceOver, Switch Control, keyboard) */}
              <button type="button" className={styles.navCancel} onPointerDown={(e) => e.stopPropagation()} onClick={onClose}>
                {cancelLabel ?? 'إلغاء'}
              </button>
              {title && (
                <h2 id={titleId} className={styles.navTitle}>
                  {title}
                </h2>
              )}
              <span className={styles.navAction} onPointerDown={(e) => e.stopPropagation()}>
                {action}
              </span>
            </div>
          ) : (
            <>
              {title && (
                <h2 id={titleId} className={bare ? 'visually-hidden' : styles.title}>
                  {title}
                </h2>
              )}
              {!bare && (
                // every sheet can be closed without a gesture (VoiceOver, Switch Control, keyboard)
                <button
                  type="button"
                  className={styles.close}
                  aria-label="سكّري"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={onClose}
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </>
          )}
        </div>
        <div className={styles.content} style={{ maxHeight: maxH - offsetFor(detent) - handleH }}>
          {children}
        </div>
      </motion.div>
    </div>
  )
}
