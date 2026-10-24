import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { TimeField } from '../../components/TimeField'
import { clock12, fromClock12 } from './format'
import styles from './reminders.module.css'

const ROW = 38
const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)
const PERIODS: ('ص' | 'م')[] = ['ص', 'م']

/** Rounds to the wheel's 5-minute grid. */
export const snap5 = (minute: number): number => Math.min(1435, Math.round(minute / 5) * 5)

interface ColProps<T extends string | number> {
  values: readonly T[]
  value: T
  render: (v: T) => string
  onPick: (v: T) => void
}

function Col<T extends string | number>({ values, value, render, onPick }: ColProps<T>) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const reduce = useReducedMotion()
  const idx = values.indexOf(value)

  useEffect(() => {
    const el = ref.current
    if (el && Math.abs(el.scrollTop - idx * ROW) > 1) el.scrollTop = idx * ROW
  }, [idx])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onScroll = () => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const el = ref.current
      if (!el) return
      const i = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / ROW)))
      if (values[i] !== value) onPick(values[i]!)
    }, 90)
  }

  return (
    <div ref={ref} className={styles.col} onScroll={onScroll} data-col="">
      {values.map((v, i) => (
        <button
          key={String(v)}
          type="button"
          tabIndex={-1}
          className={styles.cell}
          data-selected={v === value || undefined}
          onClick={() => {
            onPick(v)
            ref.current?.scrollTo?.({ top: i * ROW, behavior: reduce ? 'auto' : 'smooth' })
          }}
        >
          {render(v)}
        </button>
      ))}
    </div>
  )
}

/**
 * Hour · minute (in 5s) · ص/م wheel. The wheel is the sighted, touch presentation; the same value is
 * reachable by keyboard / screen reader through the existing TimeField selects (hidden until focused).
 */
export function TimeWheel({ minute, onChange, label }: { minute: number; onChange: (minute: number) => void; label: string }) {
  const m = snap5(minute)
  const c = clock12(m)
  const mm = Number(c.mm)
  const set = (h: number, mi: number, p: 'ص' | 'م') => onChange(fromClock12(h, mi, p))
  return (
    <div>
      <div className={styles.wheel} dir="ltr" aria-hidden="true">
        <span className={styles.band} />
        <Col values={HOURS} value={c.h} render={(v) => String(v)} onPick={(h) => set(h, mm, c.period)} />
        <span className={styles.colon}>:</span>
        <Col values={MINUTES} value={mm} render={(v) => String(v).padStart(2, '0')} onPick={(v) => set(c.h, v, c.period)} />
        <Col values={PERIODS} value={c.period} render={(v) => v} onPick={(p) => set(c.h, mm, p)} />
      </div>
      <div className={styles.srTime}>
        <TimeField label={label} minute={m} onChange={onChange} />
      </div>
    </div>
  )
}
