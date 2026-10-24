import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { celebrationsHistory, groupByMonth, parseDayKey, type Celebration, type CelebrationKind } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { StarMark } from '../../components/StarMark'
import { Icon, type IconName } from '../../icons/Icon'
import { dur, ease } from '../../motion'
import { countWords, nounFor, NOUNS, type NounForms } from '../../lib/plural'
import { useLife } from '../../state/LifeStore'
import styles from './Celebrations.module.css'

const MOMENT: NounForms = { one: 'لحظة', two: 'لحظتين', few: 'لحظات', many: 'لحظة', single: 'لحظة وحدة' }
const KIND_ICON: Record<CelebrationKind, IconName> = { milestone: 'path', comeback: 'recover', chapter: 'book', experiment: 'insights' }
const KIND_NOUN: Record<CelebrationKind, NounForms> = {
  milestone: { one: 'معلم', two: 'معلمين', few: 'معالم', many: 'معلم', single: 'معلم واحد' },
  comeback: { one: 'رجعة', two: 'رجعتين', few: 'رجعات', many: 'رجعة', single: 'رجعة وحدة' },
  chapter: { one: 'فصل', two: 'فصلين', few: 'فصول', many: 'فصل', single: 'فصل واحد' },
  experiment: { one: 'تجربة', two: 'تجربتين', few: 'تجارب', many: 'تجربة', single: 'تجربة وحدة' },
}

const fmtDay = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'short' })
const fmtMonth = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { month: 'long', year: 'numeric' })

function describe(c: Celebration): { title: string; sub: string } {
  const sparks = c.sparks > 0 ? `+${c.sparks} ${nounFor(c.sparks, NOUNS.spark)}` : ''
  switch (c.kind) {
    case 'milestone':
      return { title: `خلّصتي «${c.title}»`, sub: c.context }
    case 'comeback': {
      const gap = c.gapDays ? `بعد غياب ${countWords(c.gapDays, NOUNS.day)}` : ''
      return { title: c.title ? `رجعتي لـ «${c.title}»` : 'رجعتي لعادة', sub: [gap, sparks].filter(Boolean).join(' · ') }
    }
    case 'chapter':
      return { title: c.title ? `${c.context} · ${c.title}` : c.context, sub: ['سكّرتي الفصل', sparks].filter(Boolean).join(' · ') }
    case 'experiment':
      return { title: `جرّبتي «${c.title}»`, sub: [c.outcome === 'kept' ? 'أثبتّيها' : 'رجّعتي القديم', sparks].filter(Boolean).join(' · ') }
  }
}

/** «احتفالاتي» — a calm look back at what was worth celebrating. Derived from her data; nothing to maintain. */
export default function CelebrationsScreen() {
  const s = useLife()
  const reduce = useReducedMotion()
  const items = useMemo(
    () => celebrationsHistory({ goals: s.goals, habits: s.habits, logs: s.logs, sparkTxns: s.sparkTxns, weeklyReviews: s.weeklyReviews, experiments: s.experiments }),
    [s.goals, s.habits, s.logs, s.sparkTxns, s.weeklyReviews, s.experiments],
  )
  const groups = useMemo(() => groupByMonth(items), [items])
  const counts = (Object.keys(KIND_NOUN) as CelebrationKind[]).map((k) => ({ k, n: items.filter((i) => i.kind === k).length })).filter((x) => x.n > 0)
  const newest = items[0]?.id

  return (
    <Screen title="احتفالاتي" backLabel="مكافآتي">
      {items.length === 0 ? (
        <EmptyState title="لسا ما فيه احتفالات" body="أول رجعة بعد غياب، أو معلم تخلصينه، أو فصل تسكرينه يظهر هنا." />
      ) : (
        <>
          <motion.section
            className={styles.hero}
            aria-label="ملخص احتفالاتك"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur.slow, ease: ease.enter }}
          >
            <StarMark size={28} color="var(--brand-primary)" glow />
            <h2 className={styles.heroTitle}>
              عندك {countWords(items.length, MOMENT)} تستاهل
            </h2>
            <p className={styles.heroSub}>
              {counts.map((c, i) => (
                <span key={c.k}>
                  {i > 0 ? ' · ' : ''}
                  {countWords(c.n, KIND_NOUN[c.k])}
                </span>
              ))}
            </p>
          </motion.section>

          {groups.map((g) => (
            <InsetGroupedList key={g.month} header={fmtMonth.format(parseDayKey(`${g.month}-01`))}>
              {g.items.map((c) => {
                const d = describe(c)
                return (
                  <ListRow
                    key={c.id}
                    leading={
                      c.id === newest ? (
                        <span className={styles.tile} data-latest="" role="img" aria-label="الأحدث">
                          <StarMark size={14} color="var(--brand-primary)" />
                        </span>
                      ) : (
                        <span className={styles.tile} aria-hidden="true">
                          <Icon name={KIND_ICON[c.kind]} size={18} />
                        </span>
                      )
                    }
                    title={<Bidi>{d.title}</Bidi>}
                    subtitle={d.sub ? <Bidi>{d.sub}</Bidi> : undefined}
                    trailing={<bdi dir="ltr" className={styles.date}>{fmtDay.format(parseDayKey(c.date))}</bdi>}
                  />
                )
              })}
            </InsetGroupedList>
          ))}
        </>
      )}
    </Screen>
  )
}
