import { useMemo } from 'react'
import { bestTimeWindow, systemBurden, weekCount } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { useLife, useToday } from '../../state/LifeStore'
import { hhmm } from './meKit'
import styles from './me.module.css'

/** «الأنماط» — patterns in words, not scores. At most one number per row. */
export default function InsightsScreen() {
  const s = useLife()
  const today = useToday()
  const habits = useMemo(() => s.habits.filter((h) => h.status === 'active'), [s])

  const rows = useMemo(
    () =>
      habits.map((h) => {
        const wc = weekCount(h, s.logs, today, s.settings.weekStartsOn)
        const win = bestTimeWindow({ logs: s.logs, itemId: h.id, today })
        return { h, wc, win }
      }),
    [habits, s.logs, today, s.settings.weekStartsOn],
  )
  const burden = useMemo(() => systemBurden({ logs: s.logs, reviews: s.weeklyReviews, today, weekStartsOn: s.settings.weekStartsOn }), [s, today])
  const withTime = rows.filter((r) => r.win)

  if (habits.length === 0) {
    return (
      <Screen title="الأنماط" backLabel="أنا">
        <EmptyState title="الأنماط تطلع مع الوقت" body="سجّلي عاداتك كم يوم، ونوريك وش الأوقات اللي تمشي فيها الأمور معك." />
      </Screen>
    )
  }

  return (
    <Screen title="الأنماط" backLabel="أنا">
      <p className={`${styles.lede} ${styles.pad}`}>نقرأ سجلك عشان نخدمك — مو عشان نقيّمك.</p>

      <InsetGroupedList header="هالأسبوع" footer="النقطة الملوّنة = مرة سجّلتيها. اللي ما انسجلت مو فشل، بس معلومة تساعدنا نعدّل الخطة.">
        {rows.map(({ h, wc }) => (
          <ListRow
            key={h.id}
            title={<Bidi>{h.titleAr}</Bidi>}
            subtitle={wc.planned === 0 ? 'ما كانت مخططة هالأسبوع' : wc.done === 0 ? 'لسا ما بدأت هالأسبوع' : wc.done >= wc.planned ? 'كمّلتي المخطط' : 'ماشية بهدوء'}
            trailing={
              wc.planned > 0 ? (
                <span className={styles.weekDots} role="img" aria-label={`${wc.done} من ${wc.planned} هالأسبوع`}>
                  {Array.from({ length: Math.min(wc.planned, 7) }, (_, i) => (
                    <span key={i} className={styles.weekDot} data-done={i < wc.done || undefined} />
                  ))}
                </span>
              ) : undefined
            }
          />
        ))}
      </InsetGroupedList>

      <InsetGroupedList header="أوقاتك" footer={withTime.length ? 'الوقت اللي غالبًا تسوين فيه العادة — ممكن تحطين التذكير قريب منه.' : 'نحتاج كم تسجيل أكثر عشان نعرف أوقاتك.'}>
        {withTime.length === 0 ? (
          <ListRow muted title="لسا بدري" subtitle="بعد 3 تسجيلات للعادة يبان وقتها" />
        ) : (
          withTime.map(({ h, win }) => (
            <ListRow
              key={h.id}
              title={<Bidi>{h.titleAr}</Bidi>}
              trailing={
                <bdi dir="ltr" className={styles.trail}>
                  {hhmm(win!.start)}–{hhmm(win!.end)}
                </bdi>
              }
            />
          ))
        )}
      </InsetGroupedList>

      <InsetGroupedList header="وقتك مع التطبيق" footer="لو التطبيق صار ياخذ وقت أكثر من اللازم، خففي — الهدف يخدمك.">
        <ListRow title="تسجيلات هالأسبوع" trailing={<span className={`${styles.trailStrong} num`}>{burden.logCount}</span>} />
        {burden.reviewMinutes != null && <ListRow title="وقت المراجعة الأسبوعية" trailing={<span className={styles.trail}>{burden.reviewMinutes} د</span>} />}
      </InsetGroupedList>
    </Screen>
  )
}
