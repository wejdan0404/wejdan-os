import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { daysBetween, habitRestingOf, habitStrengthOf, parseDayKey, seasonIsCurrent, type Habit } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { SegmentedControl } from '../../components/SegmentedControl'
import { StarMark } from '../../components/StarMark'
import { Flower, flowerForDomain, FLOWER_STAGE_AR, STAGE_OF, type FlowerStage } from '../../components/flowers'
import { useLife, useToday } from '../../state/LifeStore'
import styles from './garden.module.css'
import { RESTING_AR } from './shared'

type View = 'garden' | 'list'
const VIEWS = [
  { value: 'garden', label: 'حديقتي' },
  { value: 'list', label: 'قائمة' },
] as const

type Bloom = { habit: Habit; stage: FlowerStage; domainAr: string; resting: boolean }

/** «حديقتي» — every habit is its category's flower, growing with its strength. */
export default function GardenScreen() {
  const navigate = useNavigate()
  const s = useLife()
  const today = useToday()
  const [view, setView] = useState<View>('garden')

  const blooms = useMemo<Bloom[]>(() => {
    const names = new Map(s.domains.map((d) => [d.id, d.nameAr]))
    return s.habits
      .filter((h) => h.status === 'active' && h.domain !== 'aquarium')
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((h) => {
        const st = habitStrengthOf(s, h.id, today)
        return { habit: h, stage: STAGE_OF[st?.stage ?? 'seed'], domainAr: names.get(h.domain) ?? '', resting: habitRestingOf(s, h.id, today) }
      })
  }, [s, today])

  // beds of three, tallest flowers first so the garden reads calmly
  const beds = useMemo(() => {
    const sorted = [...blooms].sort((a, b) => b.stage - a.stage)
    const rows: Bloom[][] = []
    for (let i = 0; i < sorted.length; i += 3) rows.push(sorted.slice(i, i + 3))
    return rows
  }, [blooms])

  if (blooms.length === 0) {
    return (
      <Screen title="حديقتي" backLabel="عاداتي">
        <EmptyState
          title="حديقتك تنتظر أول بذرة"
          body="كل عادة تضيفينها تصير وردة من تصنيفها، وتكبر معك على مهلها."
          action={<Button onClick={() => navigate('/studio')}>أضيفي عادة</Button>}
        />
      </Screen>
    )
  }

  const season = s.seasons.find(seasonIsCurrent)
  const seasonWeek = season ? Math.max(1, Math.floor(daysBetween(parseDayKey(season.startDate), today) / 7) + 1) : 0

  return (
    <Screen
      title="حديقتي"
      backLabel="عاداتي"
      subtitle="كل عادة وردة من تصنيفها، تكبر معك على مهلها."
      eyebrow={
        <>
          <span>
            {season && (
              <>
                <Bidi>{season.titleAr}</Bidi> · الأسبوع <span className="num">{seasonWeek}</span>
              </>
            )}
          </span>
          {/* board: the compact view switch shares the eyebrow row */}
          <span className={styles.switch}>
            <SegmentedControl label="طريقة العرض" segments={VIEWS} value={view} onChange={(v) => setView(v as View)} />
          </span>
        </>
      }
    >

      {view === 'garden' && (
        <section className={styles.bed} aria-label="حوض الورد">
          {beds.map((row, i) => (
            <div key={i} className={styles.row}>
              {row.map((b) => (
                <button
                  key={b.habit.id}
                  type="button"
                  className={styles.plant}
                  onClick={() => navigate(`/habits/${b.habit.id}`)}
                  aria-label={`${b.habit.titleAr} · ${b.domainAr} · ${b.resting ? RESTING_AR : FLOWER_STAGE_AR[b.stage]}`}
                >
                  <span className={b.resting ? styles.resting : undefined}>
                    <Flower kind={flowerForDomain(b.habit.domain)} stage={b.stage} size={96} decorative />
                  </span>
                  <span className={styles.plantName} aria-hidden="true">
                    {b.stage === 5 && !b.resting && <StarMark size={10} className={styles.plantStar} />}
                    <Bidi>{b.habit.titleAr}</Bidi>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </section>
      )}

      {view === 'list' && (
      <InsetGroupedList footer="النجمة تطلع بس للعادة اللي صارت متجذرة — إنجاز حقيقي، مو زينة.">
        {blooms.map((b) => (
          <ListRow
            key={b.habit.id}
            leading={
              <span className={b.resting ? styles.resting : undefined}>
                <Flower kind={flowerForDomain(b.habit.domain)} stage={b.stage} size={32} decorative />
              </span>
            }
            // board: one line per flower — «الاسم · التصنيف · المرحلة»
            title={
              <span className={styles.line}>
                <span className={styles.lineName}>
                  <Bidi>{b.habit.titleAr}</Bidi>
                </span>
                <span className={styles.lineMeta}>
                  {' · '}
                  <Bidi>{b.domainAr}</Bidi> · {b.resting ? RESTING_AR : FLOWER_STAGE_AR[b.stage]}
                </span>
              </span>
            }
            trailing={
              b.stage === 5 && !b.resting ? (
                <span className={styles.rooted}>
                  <StarMark size={12} label="إنجاز" />
                  متجذرة
                </span>
              ) : undefined
            }
            onClick={() => navigate(`/habits/${b.habit.id}`)}
          />
        ))}
      </InsetGroupedList>
      )}
    </Screen>
  )
}
