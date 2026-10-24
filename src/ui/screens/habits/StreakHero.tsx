import type { ForgivingStreak, WeekDay } from '../../../domain'
import { graceLeftThisWeek } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Icon } from '../../icons/Icon'
import { ArcIcon } from '../../components/streak/streakIcons'
import { DOT_LABEL, WeekDots } from '../../components/streak/WeekDots'
import { compensationLine, streakTitle } from '../../lib/streakText'
import styles from './streakHero.module.css'

export interface StreakHeroProps {
  /** null = the flexible streak is off (momentum only). */
  streak: ForgivingStreak | null
  /** `momentumWord(...)` — «ماشي زين». */
  momentumText: string
  days: WeekDay[]
  onOpenSettings: () => void
}

/** Momentum sentence from this week's dots — only says what is true. */
function momentumLine(days: WeekDay[]): string {
  const done = days.filter((d) => d.state === 'done').length
  const past = days.filter((d) => d.state === 'done' || d.state === 'rest').length
  if (done === 0) return 'الأسبوع لسا في أوله، وأي يوم تبدين فيه يحسب.'
  return done * 2 >= past ? 'خلّصتيها أغلب أيام هالأسبوع.' : 'بدأتيها هالأسبوع، وكل يوم يحسب.'
}

/**
 * The habit's one hero. Streak on: «الستريك المرن» + «{n} أيام متتالية» + what is left of the weekly
 * compensation. Streak off: «الزخم» + the momentum word, no numbers. A missed day inside the allowance is a
 * dashed «يوم تعويض», never red; past the allowance it resets calmly («يوم جديد»).
 */
export function StreakHero({ streak, momentumText, days, onOpenSettings }: StreakHeroProps) {
  const on = streak != null
  const legend: { state: 'done' | 'compensation' | 'rest'; show: boolean }[] = [
    { state: 'done', show: true },
    { state: 'compensation', show: on },
    { state: 'rest', show: !on },
  ]
  return (
    <section className={styles.hero} aria-label={on ? 'الستريك المرن' : 'الزخم'}>
      <span className={styles.glow} aria-hidden="true" />
      <span className={styles.overline}>
        {on && <ArcIcon size={14} />}
        {on ? 'الستريك المرن' : 'الزخم'}
      </span>
      {on ? (
        streak.length > 0 ? (
          <>
            <h2 className={styles.title}>
              <Bidi>{streakTitle(streak.length)}</Bidi>
            </h2>
            <p className={styles.sub}>{compensationLine(graceLeftThisWeek(streak))}</p>
          </>
        ) : (
          <>
            <h2 className={styles.title}>يوم جديد</h2>
            <p className={styles.sub}>أي يوم تنجزينه يبدأ سلسلة جديدة.</p>
          </>
        )
      ) : (
        <>
          <h2 className={styles.title}>{momentumText}</h2>
          <p className={styles.sub}>{momentumLine(days)}</p>
        </>
      )}
      <WeekDots days={days} />
      <ul className={styles.legend} aria-label="الرموز">
        {legend
          .filter((l) => l.show)
          .map((l) => (
            <li key={l.state} className={styles.legendItem}>
              <span className={styles.key} data-state={l.state} aria-hidden="true">
                {l.state === 'done' && <Icon name="check" size={12} />}
                {l.state === 'rest' && <span className={styles.keyDash} />}
              </span>
              {DOT_LABEL[l.state]}
            </li>
          ))}
      </ul>
      {on ? (
        <p className={styles.note}>يوم التعويض يحفظ سلسلتك، وما عليك أي حساب.</p>
      ) : (
        <button type="button" className={styles.link} onClick={onOpenSettings}>
          <span>تبين ستريك مرن؟ شغّليه من الإعدادات</span>
          <Icon name="chevron" size={16} />
        </button>
      )}
    </section>
  )
}
