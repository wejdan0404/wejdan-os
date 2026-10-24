import { motion, useReducedMotion } from 'framer-motion'
import type { WeekDay, WeekDayState } from '../../../domain'
import { dur, ease } from '../../motion'
import { Icon } from '../../icons/Icon'
import { ArcIcon } from './streakIcons'
import styles from './WeekDots.module.css'

const DAY_AR: Record<number, string> = { 1: 'اثنين', 2: 'ثلاثاء', 3: 'أربعاء', 4: 'خميس', 5: 'جمعة', 6: 'سبت', 7: 'أحد' }
export const DOT_LABEL: Record<WeekDayState, string> = {
  done: 'منجز',
  compensation: 'يوم تعويض',
  today: 'اليوم',
  upcoming: 'جاي',
  rest: 'راحة',
}

/**
 * Seven days of this week (first = her week start, RTL so it starts at the inline start). Each state is a
 * shape AND a word for assistive tech — never colour alone: done = filled + check · compensation = dashed
 * ring + arc · today = ring + centre dot · upcoming = hairline ring · rest = a neutral dash.
 */
export function WeekDots({ days }: { days: WeekDay[] }) {
  const reduce = useReducedMotion()
  return (
    <ul className={styles.row} aria-label="هالأسبوع">
      {days.map((d, i) => (
        <li key={d.key} className={styles.cell}>
          <motion.span
            className={styles.dot}
            data-state={d.state}
            role="img"
            aria-label={`${DAY_AR[d.weekday]}: ${DOT_LABEL[d.state]}`}
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: dur.base, ease: ease.enter, delay: reduce ? 0 : i * 0.02 }}
          >
            {d.state === 'done' && <Icon name="check" size={18} />}
            {d.state === 'compensation' && <ArcIcon size={16} />}
            {d.state === 'today' && <span className={styles.centre} />}
            {d.state === 'rest' && <span className={styles.dash} />}
          </motion.span>
          <span className={styles.label} data-today={d.state === 'today' || undefined} aria-hidden="true">
            {DAY_AR[d.weekday]}
          </span>
        </li>
      ))}
    </ul>
  )
}
