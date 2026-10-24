import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { dur, ease } from '../motion'
import { STAR_PATH } from './StarMark'
import styles from './ProgressArc.module.css'

export interface ProgressArcProps {
  /** 0…1 */
  value: number
  size?: number
  stroke?: number
  /** Accessible description, e.g. «3 من 5». */
  label: string
  children?: ReactNode
}

/** Open arc echoing the W's crescent: the gap sits on the left, like the mark. A star lands when complete. */
export function ProgressArc({ value, size = 64, stroke = 3, label, children }: ProgressArcProps) {
  const reduce = useReducedMotion()
  const v = Math.max(0, Math.min(1, value))
  const r = (size - stroke) / 2 - 4
  const c = size / 2
  const gap = 70 // degrees, centred on 180° (left)
  const startDeg = 180 + gap / 2
  const endDeg = 180 - gap / 2 + 360
  const pt = (deg: number) => {
    const a = (deg * Math.PI) / 180
    return [c + r * Math.cos(a), c + r * Math.sin(a)] as const
  }
  const [sx, sy] = pt(startDeg)
  const [ex, ey] = pt(endDeg)
  const d = `M ${sx} ${sy} A ${r} ${r} 0 1 1 ${ex} ${ey}`
  const done = v >= 1

  return (
    <div className={styles.wrap} style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <path d={d} fill="none" stroke="var(--border-subtle)" strokeWidth={stroke} strokeLinecap="round" />
        <motion.path
          d={d}
          fill="none"
          stroke="var(--action-default)"
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: v, opacity: v === 0 ? 0 : 1 }}
          transition={reduce ? { duration: 0 } : { duration: dur.gentle, ease: ease.standard }}
        />
        {done && (
          <motion.path
            d={STAR_PATH}
            fill="var(--brand-primary)"
            initial={reduce ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: dur.base, ease: ease.enter, delay: reduce ? 0 : dur.gentle }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            transform={`translate(${ex} ${ey}) scale(${stroke * 1.6})`}
          />
        )}
      </svg>
      {children && <div className={styles.center}>{children}</div>}
    </div>
  )
}
