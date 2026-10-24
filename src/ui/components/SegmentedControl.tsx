import { motion } from 'framer-motion'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { springs } from '../motion'
import styles from './SegmentedControl.module.css'

export interface Segment<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string> {
  segments: readonly Segment<T>[]
  /** `null` = nothing chosen yet (no thumb; the first segment takes focus). */
  value: T | null
  onChange: (value: T) => void
  label: string
  /** Arrow keys select as they move (radio pattern, default). Set false where a change is costly
   *  (energy re-plans the day): arrows only move focus, Space/Enter commits (a11y #17). */
  commitOnArrow?: boolean
}

/** iOS-style segmented control with a sliding thumb. Arrow keys follow RTL reading order. */
export function SegmentedControl<T extends string>({ segments, value, onChange, label, commitOnArrow = true }: SegmentedControlProps<T>) {
  const id = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  // roving focus when arrows don't commit
  const [roving, setRoving] = useState<number | null>(null)

  const onKey = (e: KeyboardEvent, i: number) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    let next = i
    if (e.key === 'ArrowRight') next = rtl ? i - 1 : i + 1
    else if (e.key === 'ArrowLeft') next = rtl ? i + 1 : i - 1
    else return
    e.preventDefault()
    next = (next + segments.length) % segments.length
    if (commitOnArrow) onChange(segments[next].value)
    else setRoving(next)
    refs.current[next]?.focus()
  }

  return (
    <div role="radiogroup" aria-label={label} className={styles.track}>
      {segments.map((s, i) => {
        const active = s.value === value
        const focusable =
          roving != null && !commitOnArrow
            ? roving === i
            : active || (value == null && i === 0) || (value != null && !segments.some((x) => x.value === value) && i === 0)
        return (
          <button
            key={s.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={focusable ? 0 : -1}
            className={styles.segment}
            data-active={active || undefined}
            onClick={() => {
              setRoving(null)
              onChange(s.value)
            }}
            onBlur={(e) => {
              if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node | null)) setRoving(null)
            }}
            onKeyDown={(e) => onKey(e, i)}
          >
            {active && <motion.span layoutId={`seg-${id}`} className={styles.thumb} transition={springs.snappy} />}
            <span className={styles.label}>{s.label}</span>
          </button>
        )
      })}
    </div>
  )
}
