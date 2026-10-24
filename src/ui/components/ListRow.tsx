import { animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from 'framer-motion'
import { useRef, useState, type ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { springs } from '../motion'
import { ContextMenu, type MenuItem } from './ContextMenu'
import styles from './ListRow.module.css'

export interface SwipeAction {
  key: string
  label: string
  icon?: ReactNode
  tone?: 'accent' | 'neutral' | 'destructive' | 'success'
  onAction: () => void
}

export interface ListRowProps {
  title: ReactNode
  subtitle?: ReactNode
  leading?: ReactNode
  /** Accessory at the inline end (value text, chip, check). */
  trailing?: ReactNode
  chevron?: boolean
  onClick?: () => void
  /** Revealed from the leading edge (right in RTL) — e.g. «إنجاز». Full swipe fires the first. */
  leadingActions?: SwipeAction[]
  /** Revealed from the trailing edge (left in RTL) — e.g. «بعدين», «حذف». */
  trailingActions?: SwipeAction[]
  /** Long-press menu (also right-click / Shift+F10). */
  menu?: MenuItem[]
  /** Show a visible «…» button that opens `menu` (default: whenever there is a menu, so nothing
   *  is reachable by long-press only — a11y #11). */
  moreButton?: boolean
  muted?: boolean
}

const ACTION_W = 76

export function ListRow({ title, subtitle, leading, trailing, chevron, onClick, leadingActions = [], trailingActions = [], menu, moreButton, muted }: ListRowProps) {
  const reduce = useReducedMotion()
  const rowRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const dragged = useRef(false)
  const [open, setOpen] = useState<'leading' | 'trailing' | null>(null)
  const canSwipe = leadingActions.length + trailingActions.length > 0
  const leadW = leadingActions.length * ACTION_W
  const trailW = trailingActions.length * ACTION_W

  const isRtl = () => !!rowRef.current && getComputedStyle(rowRef.current).direction === 'rtl'
  // Physical x that reveals each side: in RTL leading = right edge → row moves left (−x).
  const leadSign = () => (isRtl() ? -1 : 1)

  const leadOpacity = useTransform(x, (v) => {
    const s = rowRef.current && getComputedStyle(rowRef.current).direction === 'rtl' ? -1 : 1
    return Math.max(0, Math.min(1, (v * s) / 40))
  })
  const trailOpacity = useTransform(x, (v) => {
    const s = rowRef.current && getComputedStyle(rowRef.current).direction === 'rtl' ? 1 : -1
    return Math.max(0, Math.min(1, (v * s) / 40))
  })

  const settle = (to: number, side: 'leading' | 'trailing' | null) => {
    animate(x, to, reduce ? { duration: 0 } : springs.smooth)
    setOpen(side)
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    // a drag (mouse especially) is followed by a click on the same element — swallow that one
    window.setTimeout(() => (dragged.current = false), 0)
    const ls = leadSign()
    const lead = info.offset.x * ls // >0 means revealing leading actions
    const vel = info.velocity.x * ls
    if (lead > 0 && leadingActions.length) {
      if (lead > Math.max(leadW * 1.6, 140)) {
        settle(0, null)
        leadingActions[0].onAction()
      } else settle(lead > leadW / 2 || vel > 500 ? leadW * ls : 0, lead > leadW / 2 || vel > 500 ? 'leading' : null)
      return
    }
    const trail = -lead
    if (trail > 0 && trailingActions.length) {
      if (trail > Math.max(trailW * 1.6, 160)) {
        settle(0, null)
        trailingActions[0].onAction()
      } else settle(trail > trailW / 2 || -vel > 500 ? -trailW * ls : 0, trail > trailW / 2 || -vel > 500 ? 'trailing' : null)
      return
    }
    settle(0, null)
  }

  const renderActions = (list: SwipeAction[], side: 'leading' | 'trailing', opacity: typeof leadOpacity) =>
    list.length > 0 && (
      <motion.div className={styles.actions} data-side={side} style={{ opacity }} aria-hidden={open !== side}>
        {list.map((a) => (
          <button
            key={a.key}
            type="button"
            tabIndex={open === side ? 0 : -1}
            className={styles.action}
            data-tone={a.tone ?? 'accent'}
            onClick={() => {
              settle(0, null)
              a.onAction()
            }}
          >
            {a.icon}
            <span>{a.label}</span>
          </button>
        ))}
      </motion.div>
    )

  // When the row is tappable, the TITLE is the button and its ::after stretches over the
  // whole row; leading/trailing sit above it, so an interactive leading (a check circle)
  // never ends up nested inside another button.
  const tap = onClick
    ? () => {
        if (dragged.current) return
        if (open) settle(0, null)
        else onClick()
      }
    : undefined
  const showMore = !!menu?.length && (moreButton ?? true)
  const content = (openMenu?: () => void) => (
    <>
      {leading && <span className={styles.leading}>{leading}</span>}
      <span className={styles.text}>
        <span className={styles.title} data-muted={muted || undefined}>
          {tap ? (
            <button type="button" className={styles.link} onClick={tap}>
              {title}
            </button>
          ) : (
            title
          )}
        </span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </span>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
      {showMore && openMenu && (
        <button
          type="button"
          className={styles.more}
          aria-label="خيارات"
          aria-haspopup="menu"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            openMenu()
          }}
        >
          <Icon name="more" size={20} />
        </button>
      )}
      {chevron && <Icon name="chevron" size={18} className={styles.chevron} />}
    </>
  )

  const row = (openMenu?: () => void) => (
    <motion.div
      className={styles.row}
      style={{ x }}
      drag={canSwipe ? 'x' : false}
      dragDirectionLock
      dragConstraints={{ left: -(leadW + trailW) * 2, right: (leadW + trailW) * 2 }}
      dragElastic={0.12}
      dragMomentum={false}
      onDragStart={() => (dragged.current = true)}
      onDragEnd={onDragEnd}
    >
      <div className={styles.inner} data-tappable={tap ? '' : undefined}>
        {content(openMenu)}
      </div>
    </motion.div>
  )

  const allActions = [...leadingActions, ...trailingActions]

  return (
    <div role="listitem" className={styles.wrap} ref={rowRef} data-has-leading={leading ? '' : undefined}>
      {renderActions(leadingActions, 'leading', leadOpacity)}
      {renderActions(trailingActions, 'trailing', trailOpacity)}
      {menu?.length ? (
        <ContextMenu items={menu} label="اضغطي مطوّل لخيارات أكثر">
          {(openMenu) => row(openMenu)}
        </ContextMenu>
      ) : (
        row()
      )}
      {allActions.length > 0 && (
        // a11y #12: swipe actions for keyboard / VoiceOver — hidden until one of them has focus,
        // then shown as a small toolbar over the row so the focused button is always visible.
        <span className={styles.kbActions}>
          {allActions.map((a) => (
            <button key={a.key} type="button" className={styles.kbAction} data-tone={a.tone ?? 'accent'} onClick={a.onAction}>
              {a.label}
            </button>
          ))}
        </span>
      )}
    </div>
  )
}
