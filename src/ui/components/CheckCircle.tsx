import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { dur, ease, springs } from '../motion'
import { StarMark } from './StarMark'
import styles from './CheckCircle.module.css'

export interface CheckCircleProps {
  checked: boolean
  onChange: (next: boolean) => void
  /** Accessible name, e.g. the item title. */
  label: string
  size?: number
  /** Ordered steps (routine): the empty ring carries the step number, so number and check are one control. */
  index?: number
}

/** How long the evidence star stays after she completes something (identity: it flashes once, then the row rests). */
const STAR_FLASH_MS = 1400

/**
 * Completion control. The check draws itself, the ring settles 0.95 → 1,
 * and one star (evidence of the completion she just logged) flashes once. No confetti,
 * and no persistent stars on done rows — a screen never piles up stars.
 */
export function CheckCircle({ checked, onChange, label, size = 28, index }: CheckCircleProps) {
  const reduce = useReducedMotion()
  const [flash, setFlash] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const toggle = () => {
    const next = !checked
    if (next) {
      setFlash(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setFlash(false), STAR_FLASH_MS)
    } else {
      setFlash(false)
    }
    onChange(next)
  }
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={styles.hit}
      onClick={toggle}
    >
      <motion.span
        className={styles.ring}
        data-checked={checked || undefined}
        style={{ width: size, height: size }}
        animate={checked && !reduce ? { scale: [0.95, 1] } : { scale: 1 }}
        transition={{ duration: dur.base, ease: ease.standard }}
      >
        {index != null && !checked && (
          <span className={styles.index} aria-hidden="true">
            {index}
          </span>
        )}
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} aria-hidden="true" className={index != null && !checked ? styles.hiddenCheck : undefined}>
          <motion.path
            d="m5.5 12.5 4.25 4.25L18.5 7.5"
            fill="none"
            stroke="var(--on-action)"
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={reduce ? { duration: 0 } : { duration: dur.slow, ease: ease.enter, delay: checked ? 0.04 : 0 }}
          />
        </svg>
      </motion.span>
      <AnimatePresence>
        {checked && flash && (
          <StarMark
            key="star"
            size={9}
            color="var(--brand-primary)"
            className={styles.star}
            initial={reduce ? false : { scale: 0, opacity: 0, rotate: -45 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.6, opacity: 0, transition: { duration: dur.slow } }}
            transition={{ ...springs.pop, delay: reduce ? 0 : 0.16 }}
          />
        )}
      </AnimatePresence>
    </button>
  )
}
