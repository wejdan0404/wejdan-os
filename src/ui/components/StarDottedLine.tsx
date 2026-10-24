import { motion, useReducedMotion } from 'framer-motion'
import { springs } from '../motion'
import { StarMark } from './StarMark'
import styles from './StarDottedLine.module.css'

export interface StarDottedLineProps {
  total: number
  done: number
  label?: string
}

/**
 * Signature "Star Dotted Line": a thread of small dots, one per step.
 * Finished steps become stars (evidence); the thread reads in RTL order.
 */
export function StarDottedLine({ total, done, label }: StarDottedLineProps) {
  const reduce = useReducedMotion()
  return (
    <div className={styles.line} role="img" aria-label={label ?? `${done} من ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const isDone = i < done
        return (
          <span key={i} className={styles.step}>
            {isDone ? (
              <StarMark
                size={12}
                color="var(--brand-primary)"
                initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={springs.pop}
              />
            ) : (
              <motion.span className={styles.dot} data-next={i === done || undefined} layout />
            )}
          </span>
        )
      })}
    </div>
  )
}
