import { useMemo } from 'react'
import { activeExperiment, bestTimeWindow, experimentReadout, momentumByDomain, returnSpeed, systemBurden, weekCount } from '../../../domain'
import { MomentumBars } from '../../components/charts/MomentumBars'
import { ReturnSpeedChart } from '../../components/charts/ReturnSpeedChart'
import { useToast } from '../../components/Toast'
import { useState } from 'react'
import { domainName } from '../path/pathKit'
import { ExperimentResultCard } from './review/ExperimentResultCard'
import { Bidi } from '../../components/Bidi'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import { hhmm } from './meKit'
import styles from './me.module.css'

/** «الأنماط» — patterns in words, not scores. At most one number per row. */
export default function InsightsScreen() {
  const s = useLife()
  const store = useStore()
  const toast = useToast()
  const [deciding, setDeciding] = useState(false)
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
  const momentum = useMemo(() => momentumByDomain({ domains: s.domains, habits: s.habits, logs: s.logs, today }), [s.domains, s.habits, s.logs, today])
  const back = useMemo(() => returnSpeed({ habits: s.habits, logs: s.logs, today, weekStartsOn: s.settings.weekStartsOn }), [s.habits, s.logs, today, s.settings.weekStartsOn])
  const backPoints = back.points.map((p, i, a) => ({ label: i === a.length - 1 ? 'هالأسبوع' : `أسبوع ${i + 1}`, days: p.days }))
  const hasBack = back.points.some((p) => p.days != null)
  const running = activeExperiment(s)
  const readout = running ? experimentReadout({ experiment: running, habits: s.habits, logs: s.logs, today }) : null
  const lastDone = [...s.experiments].filter((e) => (e.status === 'kept' || e.status === 'reverted') && e.endDate).sort((a, b) => (b.endDate! < a.endDate! ? -1 : 1))[0]
  const decide = async (keep: boolean) => {
    if (!running) return
    setDeciding(true)
    try {
      await store.finishExperiment(running.id, keep)
      toast({ message: keep ? 'ثبّتناها' : 'رجّعنا القديم' })
    } finally {
      setDeciding(false)
    }
  }

  if (habits.length === 0) {
    return (
      <Screen title="الأنماط" backLabel="أنا">
        <EmptyState title="الأنماط تطلع مع الوقت" body="سجّلي عاداتك كم يوم، ونوريك وش الأوقات اللي تمشي فيها الأمور معك." />
      </Screen>
    )
  }

  return (
    <Screen title="الأنماط" backLabel="أنا">
      <p className={`${styles.lede} ${styles.pad}`}>آخر 4 أسابيع · أرقام تساعدك تعدّلين التصميم، مو تحكم عليك.</p>

      <InsetGroupedList header="الزخم حسب المجال" footer="الزخم من 0 إلى 100: متوسط موزون لآخر الأيام. اليوم الفائت ينزله شوي، ما يرجعه للصفر.">
        {momentum.length === 0 ? (
          <ListRow muted title="لسا بدري" subtitle="لما تسجلين عاداتك يبان زخم كل مجال" />
        ) : (
          <div className={styles.chartCell}>
            <MomentumBars rows={momentum.map((m) => ({ id: m.domain, name: domainName(m.domain), value: m.value, resting: m.resting }))} />
          </div>
        )}
      </InsetGroupedList>

      <InsetGroupedList
        header="سرعة الرجوع"
        footer={hasBack ? 'كم يوم تاخذين عشان ترجعين بعد ما تفوّتين عادة. الأرقام = أيام، وأقل = أحسن. الخط تحت هو الصفر.' : 'نرسمها لما يصير فيه غياب ورجوع. نحتاج كم أسبوع.'}
      >
        {hasBack ? (
          <div className={styles.chartCell}>
            {back.trend === 'faster' && <p className={styles.chartNote}>ترجعين أسرع كل أسبوع.</p>}
            <ReturnSpeedChart points={backPoints} />
          </div>
        ) : (
          <ListRow muted title="لسا بدري" subtitle="أول رجعة بعد غياب تبان هنا" />
        )}
      </InsetGroupedList>

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

      <InsetGroupedList header="تجربة الأسبوع" footer={readout ? undefined : 'تبدأ من المراجعة الأسبوعية: نغيّر شي واحد بس ونقيس.'}>
        {readout ? (
          <div className={styles.chartCell}>
            <ExperimentResultCard flat readout={readout} busy={deciding} onDecide={(k) => void decide(k)} />
          </div>
        ) : (
          <ListRow
            muted={!lastDone}
            title={lastDone ? <Bidi>{lastDone.titleAr}</Bidi> : 'ما فيه تجربة شغّالة'}
            subtitle={lastDone ? (lastDone.status === 'kept' ? 'أثبتّيها' : 'رجّعتي القديم') : undefined}
          />
        )}
      </InsetGroupedList>

      <InsetGroupedList header="وقتك مع التطبيق" footer="لو التطبيق صار ياخذ وقت أكثر من اللازم، خففي — الهدف يخدمك.">
        <ListRow title="تسجيلات هالأسبوع" trailing={<span className={`${styles.trailStrong} num`}>{burden.logCount}</span>} />
        {burden.reviewMinutes != null && <ListRow title="وقت المراجعة الأسبوعية" trailing={<span className={styles.trail}>{burden.reviewMinutes} د</span>} />}
      </InsetGroupedList>
    </Screen>
  )
}
