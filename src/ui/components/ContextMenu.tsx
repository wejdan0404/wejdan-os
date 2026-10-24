import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { dur, ease, springs } from '../motion'
import styles from './ContextMenu.module.css'

export interface MenuItem {
  key: string
  label: string
  icon?: ReactNode
  destructive?: boolean
  onSelect: () => void
}

export interface ContextMenuProps {
  items: MenuItem[]
  /** Content, or a render function that receives `open` so a visible «…» button can open the same menu. */
  children: ReactNode | ((open: () => void) => ReactNode)
  /** Accessible name for the "more actions" affordance. */
  label: string
}

const LONG_PRESS_MS = 450
const MOVE_TOLERANCE = 8

/** Long-press (or right-click / Shift+F10) opens an iOS-style menu anchored to the element. */
export function ContextMenu({ items, children, label }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<number>()
  const start = useRef<{ x: number; y: number } | null>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [pressing, setPressing] = useState(false)
  // The menu layer (portal + presence) only exists once this row's menu has been opened;
  // a long list of rows otherwise carried one idle portal each.
  const [mounted, setMounted] = useState(false)
  const reduce = useReducedMotion()
  // a11y #10: remember where focus was, and put it back when the menu closes
  const returnTo = useRef<Element | null>(null)

  const openMenu = useCallback(() => {
    returnTo.current = document.activeElement
    if (ref.current) setRect(ref.current.getBoundingClientRect())
    setMounted(true)
    setPressing(false)
  }, [])

  const cancel = () => {
    window.clearTimeout(timer.current)
    start.current = null
    setPressing(false)
  }

  const onPointerDown = (e: RPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    start.current = { x: e.clientX, y: e.clientY }
    setPressing(true)
    timer.current = window.setTimeout(openMenu, LONG_PRESS_MS)
  }
  const onPointerMove = (e: RPointerEvent) => {
    if (!start.current) return
    if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > MOVE_TOLERANCE) cancel()
  }

  return (
    <>
      <div
        ref={ref}
        className={styles.target}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => {
          e.preventDefault()
          cancel()
          openMenu()
        }}
        onKeyDown={(e) => {
          if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
            e.preventDefault()
            openMenu()
          }
        }}
        // press feedback: same 0.97 scale and timing as before, as a plain CSS transition
        style={{
          transform: pressing && !reduce ? 'scale(0.97)' : undefined,
          transition: `transform ${LONG_PRESS_MS}ms cubic-bezier(${ease.standard.join(',')})`,
        }}
      >
        {typeof children === 'function' ? children(openMenu) : children}
        <span className="visually-hidden">{label}</span>
      </div>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {rect && (
              <Menu
                rect={rect}
                source={ref.current}
                items={items}
                onClose={() => {
                  setRect(null)
                  const back = returnTo.current
                  returnTo.current = null
                  window.requestAnimationFrame(() => {
                    // don't steal focus from a sheet or screen the chosen action just opened
                    const now = document.activeElement
                    const lost = !now || now === document.body || !!now.closest('[role="menu"]')
                    if (lost && back instanceof HTMLElement && back.isConnected && !back.closest('[inert]')) back.focus({ preventScroll: true })
                  })
                }}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}

function Menu({ rect, source, items, onClose }: { rect: DOMRect; source: HTMLElement | null; items: MenuItem[]; onClose: () => void }) {
  const menuRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  // iOS lifts the pressed row above the blur as a preview: an inert DOM snapshot of the target.
  useEffect(() => {
    const host = previewRef.current
    if (!host || !source) return
    const clone = source.cloneNode(true) as HTMLElement
    clone.removeAttribute('id')
    clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'))
    clone.style.transform = 'none'
    host.replaceChildren(clone)
  }, [source])
  useEffect(() => {
    menuRef.current?.querySelector('button')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    // a route change (link, back swipe, deep link, programmatic navigate) never leaves the menu floating
    const onRoute = () => onClose()
    window.addEventListener('keydown', onKey)
    window.addEventListener('hashchange', onRoute)
    window.addEventListener('popstate', onRoute)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('hashchange', onRoute)
      window.removeEventListener('popstate', onRoute)
    }
  }, [onClose])

  const vh = window.innerHeight
  const menuH = items.length * 48 + 8
  const below = rect.bottom + 8 + menuH < vh - 24
  const top = below ? rect.bottom + 8 : Math.max(24, rect.top - menuH - 8)
  const origin = below ? 'top' : 'bottom'

  return (
    <div className={styles.layer}>
      <motion.div
        className={styles.backdrop}
        // Close on a NEW press only: after a long-press the lifting finger's pointerup/click lands
        // here and must not close the menu (iOS keeps it open until the next tap — QA area 2 #7).
        onPointerDown={(e) => {
          e.preventDefault()
          onClose()
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: dur.base }}
      />
      <motion.div
        ref={previewRef}
        className={styles.preview}
        aria-hidden="true"
        {...{ inert: '' }}
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        initial={{ scale: 1 }}
        animate={{ scale: reduce ? 1 : 1.03 }}
        exit={{ scale: 1, opacity: 0, transition: { duration: dur.quick } }}
        transition={springs.snappy}
      />
      <motion.div
        ref={menuRef}
        role="menu"
        className={styles.menu}
        style={{ top, insetInlineStart: 'var(--page-margin)', transformOrigin: `${origin} right` }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: reduce ? 1 : 0.85, transition: { duration: dur.quick, ease: ease.exit } }}
        transition={springs.snappy}
      >
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            role="menuitem"
            className={styles.item}
            data-destructive={it.destructive || undefined}
            onClick={() => {
              onClose()
              it.onSelect()
            }}
          >
            <span>{it.label}</span>
            {it.icon}
          </button>
        ))}
      </motion.div>
    </div>
  )
}
