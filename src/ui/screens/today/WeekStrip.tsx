import type { WeekAheadEntry } from '../../../domain'
import { parseDayKey } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Glyph } from './Glyph'
import styles from './WeekStrip.module.css'

const weekdayName = (key: string): string => new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { weekday: 'long' }).format(parseDayKey(key))

/** «هذا الأسبوع» — what is coming, as quiet cards. Informational: tapping opens it, nothing is added. */
export function WeekStrip({ entries, onOpen }: { entries: readonly WeekAheadEntry[]; onOpen: (e: WeekAheadEntry) => void }) {
  if (entries.length === 0) return null
  return (
    <section className={styles.wrap} aria-label="هذا الأسبوع">
      <h2 className={styles.head}>هذا الأسبوع</h2>
      <ul className={styles.grid}>
        {entries.map((e) => (
          <li key={`${e.kind}:${e.id}`}>
            <button type="button" className={styles.card} onClick={() => onOpen(e)}>
              <span className={styles.icon}>
                <Glyph name={e.kind === 'project' ? 'link' : 'sun'} size={18} />
              </span>
              <span className={styles.text}>
                <span className={styles.title}>
                  <Bidi>{e.title}</Bidi>
                </span>
                <span className={styles.meta}>
                  {e.dueDate ? `قبل ${weekdayName(e.dueDate)}` : 'هذا الأسبوع'}
                  {e.minutes > 0 ? <> · <bdi>{e.minutes}</bdi> د</> : null}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
