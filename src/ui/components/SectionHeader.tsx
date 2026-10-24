import type { ReactNode } from 'react'
import styles from './SectionHeader.module.css'

/** Section title with the identity's Star Dotted Line as the divider. */
export function SectionHeader({ title, action, divider = true }: { title: string; action?: ReactNode; divider?: boolean }) {
  return (
    <div className={styles.head}>
      <h2 className={styles.title}>{title}</h2>
      {divider && <span className={styles.thread} aria-hidden="true" />}
      {action}
    </div>
  )
}
