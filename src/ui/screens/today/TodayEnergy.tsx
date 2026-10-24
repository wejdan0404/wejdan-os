import { motion } from 'framer-motion'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import type { EnergyMode } from '../../../domain'
import { springs } from '../../motion'
import seg from '../../components/SegmentedControl.module.css'
import row from '../../components/EnergySegmented.module.css'
import local from './Today.module.css'

const SEGMENTS: { value: EnergyMode; label: string }[] = [
  { value: 'red', label: 'قليلة' },
  { value: 'yellow', label: 'متوسطة' },
  { value: 'green', label: 'زينة' },
]

/**
 * Today's energy check. Nothing is selected until she answers (`value` null) —
 * the suggestions just use a normal day meanwhile, and we never answer for her.
 */
export function TodayEnergy({ value, onChange }: { value: EnergyMode | null; onChange: (v: EnergyMode) => void }) {
  const id = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  // a11y #17: arrows only move focus (roving); Space/Enter (a click) commits — each commit re-plans the day
  const [roving, setRoving] = useState<number | null>(null)
  const focusIndex = roving ?? (value == null ? SEGMENTS.length - 1 : SEGMENTS.findIndex((s) => s.value === value))
  const onKey = (e: KeyboardEvent, i: number) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    let next = i
    if (e.key === 'ArrowRight') next = rtl ? i - 1 : i + 1
    else if (e.key === 'ArrowLeft') next = rtl ? i + 1 : i - 1
    else return
    e.preventDefault()
    next = (next + SEGMENTS.length) % SEGMENTS.length
    setRoving(next)
    refs.current[next]?.focus()
  }
  return (
    <div className={row.row}>
      <span className={row.label} id={`${id}-label`}>
        {value == null ? 'كيف طاقتك اليوم؟' : 'طاقتي اليوم'}
      </span>
      <div className={row.control}>
        <div role="radiogroup" aria-labelledby={`${id}-label`} className={seg.track}>
          {SEGMENTS.map((s, i) => {
            const active = s.value === value
            return (
              <button
                key={s.value}
                ref={(el) => {
                  refs.current[i] = el
                }}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={i === focusIndex ? 0 : -1}
                className={`${seg.segment} ${local.energyTap}`}
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
                {active && <motion.span layoutId={`today-energy-${id}`} className={seg.thumb} transition={springs.snappy} />}
                <span className={seg.label}>{s.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
