import { motion, useReducedMotion } from 'framer-motion'
import { Fragment } from 'react'
import { Bidi } from '../../components/Bidi'
import { STAR_PATH } from '../../components/StarMark'
import { springs } from '../../motion'
import styles from './RoutineThread.module.css'

export interface ThreadStep {
  id: string
  label: string
  state: 'done' | 'current' | 'todo'
}

/**
 * The Star Dotted Line as a routine progress thread:
 * a star = step done (evidence), a ring = the step she's on, a dot = still ahead.
 */
export function RoutineThread({ steps, label }: { steps: ThreadStep[]; label: string }) {
  const reduce = useReducedMotion()
  if (steps.length === 0) return null
  const shown = steps.length > WINDOW ? windowAround(steps) : steps
  return (
    <div className={styles.wrap} role="group" aria-label={label}>
      <div className={styles.line}>
        {shown.map((s, i) => (
          <Fragment key={s.id}>
            {i > 0 && <span className={styles.dots} data-state={shown[i - 1].state === 'done' ? (s.state === 'todo' ? 'mid' : 'done') : 'todo'} aria-hidden="true" />}
            {s.state === 'done' ? (
              <motion.svg
                className={styles.star}
                viewBox="-1 -1 2 2"
                role="img"
                aria-label={`${s.label} — خلصت`}
                initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={springs.pop}
              >
                <path d={STAR_PATH} />
              </motion.svg>
            ) : s.state === 'current' ? (
              <span className={styles.ring} role="img" aria-label={`${s.label} — الحين`} />
            ) : (
              <span className={styles.dot} role="img" aria-label={`${s.label} — باقي`} />
            )}
          </Fragment>
        ))}
      </div>
      <div className={styles.labels} style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }} aria-hidden="true">
        {shown.map((s, i) => (
          <span
            key={s.id}
            className={styles.label}
            data-current={s.state === 'current' || undefined}
            data-edge={i === 0 ? 'start' : i === shown.length - 1 ? 'end' : undefined}
          >
            <Bidi>{s.label}</Bidi>
          </span>
        ))}
      </div>
    </div>
  )
}

/** At most four steps on Today (boards): longer routines show a window around the step she's on. */
const WINDOW = 4

function windowAround(steps: ThreadStep[]): ThreadStep[] {
  const cur = steps.findIndex((s) => s.state !== 'done')
  const at = cur < 0 ? steps.length - 1 : cur
  // one step behind (so a finished step still shows its star), the current one, and what's next
  const start = Math.max(0, Math.min(at - 1, steps.length - WINDOW))
  return steps.slice(start, start + WINDOW)
}
