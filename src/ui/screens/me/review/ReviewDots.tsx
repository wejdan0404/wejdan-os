import styles from './ReviewDots.module.css'

/**
 * Weekly-review progress: plain dots, not stars. The identity keeps the concave star for achievements
 * (max 3 per screen) — the one hero star lives on the done card, so the thread here never draws one.
 * Same RTL reading order and dotted thread as the shared StarDottedLine, which stays untouched.
 */
export function ReviewDots({ total, done, label }: { total: number; done: number; label: string }) {
  return (
    <div className={styles.line} role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={styles.step}>
          <span className={styles.dot} data-done={i < done || undefined} data-next={i === done || undefined} />
        </span>
      ))}
    </div>
  )
}
