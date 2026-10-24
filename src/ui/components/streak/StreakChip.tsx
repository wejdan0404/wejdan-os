import type { ReactNode } from 'react'
import { ArcIcon } from './streakIcons'
import styles from './StreakChip.module.css'

/** «6 أيام» on the Habits list; «تعويض اليوم» (with the arc) while a compensation day is holding the streak. */
export function StreakChip({ children, arc }: { children: ReactNode; arc?: boolean }) {
  return (
    <span className={styles.chip}>
      {arc && <ArcIcon size={12} />}
      <span>{children}</span>
    </span>
  )
}
