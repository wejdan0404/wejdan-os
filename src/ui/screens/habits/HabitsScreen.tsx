import { useEffect, useMemo, useState } from 'react'
import { useStableNavigate } from '../../shell/navigate'
import {
  addDays,
  dateOnly,
  dayKey,
  habitRestingOf,
  forgivingStreakOf,
  habitStrengthOf,
  isDoneLevel,
  isPlannedOn,
  logsOn,
  momentumOf,
  parseDayKey,
  daysBetween,
  productsBySlot,
  seasonIsCurrent,
  todayView,
  weekday,
  type Habit,
  type LifeSnapshot,
} from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { Sheet } from '../../components/Sheet'
import { Icon } from '../../icons/Icon'
import { Flower, flowerForDomain, STAGE_OF } from '../../components/flowers'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import { countLabel, NOUNS } from '../../lib/plural'
import { useDomainWake } from './DomainWakeSheet'
import { StreakChip } from '../../components/streak/StreakChip'
import { streakChipText } from '../../lib/streakText'
import styles from './habits.module.css'
import { quoted, cueLabel, doneSteps, isStepDone, LIcon, momentumWord, SLOT_ROUTINE_AR, SLOTS, RESTING_AR, STAGE_AR, weekdaysLabel, WEEKDAY_SHORT, weekOrder } from './shared'

/** Arabic calendar one-letter day abbreviations (ح ن ث ر خ ج س). */
const WEEKDAY_LETTER: Record<number, string> = { 1: 'ن', 2: 'ث', 3: 'ر', 4: 'خ', 5: 'ج', 6: 'س', 7: 'ح' }

type Level = 0 | 1 | 2 | 3 | 4

interface DayCell {
  key: string
  wd: number
  level: Level | null // null = future
  isToday: boolean
}

/** One week (0 = this week, -1 = last…), one cell per day: share of planned habits done (no counts, no streaks). */
function weekCells(s: LifeSnapshot, today: Date, weeksBack = 0): DayCell[] {
  const t = dateOnly(today)
  const start = s.settings.weekStartsOn
  const offset = (weekday(t) - start + 7) % 7
  const first = addDays(t, -offset + weeksBack * 7)
  const active = s.habits.filter((h) => h.status === 'active')
  return weekOrder(start).map((wd, i) => {
    const d = addDays(first, i)
    const key = dayKey(d)
    if (d.getTime() > t.getTime()) return { key, wd, level: null, isToday: false }
    const planned = active.filter((h) => isPlannedOn(h.schedule, d))
    const logs = logsOn(s, d)
    const done = planned.filter((h) => {
      const l = logs.get(h.id)
      return l != null && isDoneLevel(l.level)
    }).length
    const r = planned.length === 0 ? 0 : done / planned.length
    const level: Level = r === 0 ? 0 : r < 0.34 ? 1 : r < 0.67 ? 2 : r < 1 ? 3 : 4
    return { key, wd, level, isToday: key === dayKey(t) }
  })
}

export default function HabitsScreen() {
  const navigate = useStableNavigate()
  const toast = useToast()
  const store = useStore()
  const s = useLife()
  const today = useToday()

  // three weeks, oldest on top (boards): the pattern reads at a glance, still no counts and no streaks
  const weeks = useMemo(() => [-2, -1, 0].map((w) => weekCells(s, today, w)), [s, today])
  const cells = weeks[2]
  const season = s.seasons.find(seasonIsCurrent)
  const seasonWeek = season ? Math.max(1, Math.floor(daysBetween(parseDayKey(season.startDate), today) / 7) + 1) : 0
  const view = useMemo(() => todayView(s, today), [s, today])
  const products = useMemo(() => productsBySlot(s), [s])
  const done = useMemo(() => doneSteps(s, today), [s, today])
  const [starterOpen, setStarterOpen] = useState(false)

  const active = s.habits.filter((h) => h.status === 'active').sort((a, b) => a.sortOrder - b.sortOrder)
  const paused = s.habits.filter((h) => h.status === 'paused')
  const stateOf = new Map(s.domains.map((d) => [d.id, d.state]))
  const grow = active.filter((h) => stateOf.get(h.domain) === 'grow')
  const maintain = active.filter((h) => stateOf.get(h.domain) === 'maintain')
  const other = active.filter((h) => !grow.includes(h) && !maintain.includes(h))

  const avgMomentum = active.length === 0 ? 0 : active.reduce((a, h) => a + momentumOf(s, h.id, today), 0) / active.length

  const skip = async (h: Habit) => {
    const log = await store.skipItem({ itemId: h.id, kind: 'habit' })
    toast({ message: `تخطّيتي ${quoted(h.titleAr)} اليوم — عادي`, actionLabel: 'تراجع', onAction: () => void store.undo(log.id) })
  }
  const tomorrow = async (h: Habit) => {
    const pi = view.plan.items.find((i) => i.itemId === h.id)
    if (!pi) {
      toast({ message: 'مو في يومك اليوم — ما تحتاج تأجيل' })
      return
    }
    await store.eveningDecision({ planItemId: pi.id }, 'tomorrow')
    toast({
      message: `${quoted(h.titleAr)} طلعت من اليوم — تلقينها بكرة`,
      actionLabel: 'تراجع',
      onAction: () => void store.undoMoveToDate(pi.id, addDays(today, 1)),
    })
  }
  const pause = async (h: Habit) => {
    await store.setHabitStatus(h.id, 'paused')
    toast({ message: `وقّفنا ${quoted(h.titleAr)} فترة`, actionLabel: 'تراجع', onAction: () => void store.setHabitStatus(h.id, 'active') })
  }

  const habitRow = (h: Habit) => {
    const st = habitStrengthOf(s, h.id, today)
    const resting = habitRestingOf(s, h.id, today)
    const stage = resting ? RESTING_AR : st ? STAGE_AR[st.stage] : STAGE_AR.seed
    // flexible streak on: a chip with the run («6 أيام»), or «تعويض اليوم» while a compensation day holds it;
    // off: no chip, and the caption carries the momentum word instead
    const streak = forgivingStreakOf(s, h.id, today)
    const chip =
      streak != null && streak.length > 0 ? (
        streak.holdingOnCompensation ? <StreakChip arc>تعويض اليوم</StreakChip> : <StreakChip>{streakChipText(streak.length)}</StreakChip>
      ) : undefined
    const caption = s.settings.forgivingStreak ? stage : resting ? RESTING_AR : momentumWord(momentumOf(s, h.id, today))
    return (
      <ListRow
        key={h.id}
        leading={
          // the habit's category flower at its strength stage — the text says the stage
          <span className={resting ? styles.resting : undefined}>
            <Flower kind={flowerForDomain(h.domain)} stage={STAGE_OF[st?.stage ?? 'seed']} size={44} decorative />
          </span>
        }
        title={<Bidi>{h.titleAr}</Bidi>}
        subtitle={`${cueLabel(h.schedule.anchor)} · ${caption}`}
        trailing={chip}
        chevron
        onClick={() => navigate(`/habits/${h.id}`)}
        trailingActions={[
          { key: 'skip', label: 'تخطّي', tone: 'neutral', icon: <LIcon name="skip" size={20} />, onAction: () => void skip(h) },
        ]}
        menu={[
          { key: 'skip', label: 'تخطّي اليوم', icon: <LIcon name="skip" size={20} />, onSelect: () => void skip(h) },
          { key: 'tomorrow', label: 'أجّليها لبكرة', icon: <Icon name="later" size={20} />, onSelect: () => void tomorrow(h) },
          { key: 'pause', label: 'وقّفيها فترة', icon: <LIcon name="pause" size={20} />, onSelect: () => void pause(h) },
          { key: 'edit', label: 'عدّليها', icon: <LIcon name="edit" size={20} />, onSelect: () => navigate(`/studio?habit=${h.id}`) },
        ]}
      />
    )
  }

  const gardenLink = (show: boolean) =>
    show && active.length > 0 ? (
      <button type="button" className={styles.gardenLink} onClick={() => navigate('/habits/garden')}>
        شوفي حديقتي
      </button>
    ) : undefined

  const routineRow = (slot: (typeof SLOTS)[number]) => {
    const list = products[slot].filter((p) => !p.placeholder)
    const n = list.filter((p) => isStepDone(done, p)).length
    const sub =
      list.length === 0 ? 'ما فيه منتجات' : n === 0 ? countLabel(list.length, NOUNS.step) : n === list.length ? 'خلصتيه اليوم' : `${n} من ${list.length} خلصت`
    return (
      <ListRow
        key={slot}
        leading={<Icon name={slot === 'am' ? 'sun' : slot === 'pm' ? 'moon' : 'drop'} size={22} />}
        title={SLOT_ROUTINE_AR[slot]}
        subtitle={sub}
        chevron
        onClick={() => navigate(`/routine/${slot}`)}
      />
    )
  }

  return (
    <Screen
      title="عاداتي"
      eyebrow={
        season ? (
          <span>
            <Bidi>{season.titleAr}</Bidi> · الأسبوع <span className="num">{seasonWeek}</span>
          </span>
        ) : undefined
      }
      subtitle="قليل وثابت أحسن من كثير ومتقطع."
      aurora
      actions={
        <button type="button" className={styles.headerPlus} aria-label="عادة جديدة" onClick={() => navigate('/studio')}>
          <Icon name="plus" size={22} />
        </button>
      }
    >
      <section className={styles.week} aria-label="أسبوعك">
        <div className={styles.weekHead}>
          <h2 className={styles.weekTitle}>أسبوعك</h2>
          {active.length > 0 && <span className={styles.weekMomentum}>الزخم: {momentumWord(avgMomentum)}</span>}
        </div>
        <div className={styles.cells} aria-hidden="true">
          {cells.map((c) => (
            // a11y #6: at large text the day names shrink to one letter so all 7 stay visible
            <span key={c.key} className={styles.cellLabel} data-today={c.isToday || undefined}>
              <span className={styles.dayName}>{WEEKDAY_SHORT[c.wd]}</span>
              <span className={styles.dayLetter}>{WEEKDAY_LETTER[c.wd]}</span>
            </span>
          ))}
        </div>
        {weeks.map((row, wi) => (
          <div key={wi} className={styles.cells} role={wi === 2 ? 'group' : undefined} aria-label={wi === 2 ? 'هالأسبوع' : undefined} aria-hidden={wi === 2 ? undefined : true}>
            {row.map((c) => (
              <span
                key={c.key}
                className={styles.cellBox}
                data-l={c.level ?? undefined}
                data-future={c.level == null || undefined}
                data-today={c.isToday || undefined}
                role={wi === 2 ? 'img' : undefined}
                aria-label={wi === 2 ? `${WEEKDAY_SHORT[c.wd]}: ${c.level == null ? 'لسا' : ['ولا شي', 'شوي', 'نص', 'أغلبها', 'كلها'][c.level]}` : undefined}
              />
            ))}
          </div>
        ))}
        <div className={styles.legend} aria-hidden="true">
          <span>أخف</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={styles.legendBox} data-l={l} />
          ))}
          <span>أنشط</span>
        </div>
      </section>

      {active.length === 0 && paused.length === 0 ? (
        <EmptyState
          title="ما عندك عادات للحين"
          body="ابدئي بعادة وحدة صغيرة — النسخة الصغيرة تكفي. فيه عادات جاهزة لها مصادر، أو سوّي وحدة من عندك."
          action={
            <div className={styles.emptyActions}>
              <Button onClick={() => setStarterOpen(true)}>اختاري من الجاهزة</Button>
              <Button variant="plain" onClick={() => navigate('/studio')}>
                عادة من عندك
              </Button>
            </div>
          }
        />
      ) : (
        <>
          {/* the habits lead (boards); «شوفي حديقتي» rides on the first group's header */}
          {grow.length > 0 && (
            <InsetGroupedList header="تركيزك هالموسم" headerAction={gardenLink(true)}>
              {grow.map(habitRow)}
            </InsetGroupedList>
          )}
          {maintain.length > 0 && (
            <InsetGroupedList header="نحافظ عليها بهدوء" headerAction={gardenLink(grow.length === 0)}>
              {maintain.map(habitRow)}
            </InsetGroupedList>
          )}
          {other.length > 0 && (
            <InsetGroupedList header="عادات ثانية" headerAction={gardenLink(grow.length === 0 && maintain.length === 0)} footer="أي نسخة صغيرة تنحسب لك. اضغطي مطوّل لخيارات أكثر.">
              {other.map(habitRow)}
            </InsetGroupedList>
          )}
          {paused.length > 0 && (
            <InsetGroupedList header="موقّفة فترة" footer="ما راح شي — ترجعين لها وقت ما تبين.">
              {paused.map((h) => (
                <ListRow
                  key={h.id}
                  leading={<LIcon name="pause" size={22} />}
                  title={<Bidi>{h.titleAr}</Bidi>}
                  subtitle={weekdaysLabel(h.schedule.weekdays)}
                  muted
                  menu={[{ key: 'open', label: 'التفاصيل', icon: <LIcon name="edit" size={20} />, onSelect: () => navigate(`/habits/${h.id}`) }]}
                  trailing={
                    <Button
                      variant="plain"
                      onClick={() => {
                        void store.setHabitStatus(h.id, 'active').then(() => toast({ message: `رجّعنا ${quoted(h.titleAr)}` }))
                      }}
                    >
                      رجّعيها
                    </Button>
                  }
                />
              ))}
            </InsetGroupedList>
          )}
        </>
      )}

      {s.settings.forgivingStreak && active.length > 0 && <p className={styles.streakFooter}>الستريك المرن شغّال · يومين تعويض بالأسبوع.</p>}

      <InsetGroupedList header="روتين العناية · من منتجاتي">
        {SLOTS.map(routineRow)}
        <ListRow leading={<LIcon name="products" size={22} />} title="منتجاتي" subtitle="كل منتج بوقته وترتيبه" chevron onClick={() => navigate('/me/products')} />
      </InsetGroupedList>
      <StarterSheet open={starterOpen} onClose={() => setStarterOpen(false)} />
    </Screen>
  )
}


/** Ready-made starter habits (evidence library) — she picks, nothing preselected. */
function StarterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const { wake, sheet: wakeSheet } = useDomainWake()
  const [options, setOptions] = useState<Habit[]>([])
  const [picked, setPicked] = useState<string[]>([])
  useEffect(() => {
    if (!open) return
    let alive = true
    setPicked([])
    store
      .starterHabits()
      .then((h) => alive && setOptions(h))
      .catch(() => alive && setOptions([]))
    return () => {
      alive = false
    }
  }, [open, store])

  const add = async () => {
    const chosen = options.filter((h) => picked.includes(h.id))
    await store.addStarterHabits(chosen)
    onClose()
    const added = store.getSnapshot().habits.filter((h) => chosen.some((c) => c.id === h.id))
    const o = await wake(added.length > 0 ? added : chosen)
    const what = chosen.length === 1 ? 'انضافت العادة' : `انضافت ${countLabel(chosen.length, NOUNS.habit)}`
    toast({
      message:
        o === 'kept'
          ? `${what} — بعض مجالاتها مرتاحة؛ غيّريها من «مجالاتك» في مساري وقت ما تبين`
          : o === 'paused'
            ? `${what} موقّفة — شغّليها وقت ما يخف يومك`
            : `${what} — تطلع لك باقتراحات اليوم`,
    })
  }

  return (
    <>
    {wakeSheet}
    <Sheet open={open} onClose={onClose} title="عادات جاهزة" detents={['medium', 'large']}>
      <div className={styles.starterBody}>
        <p className={styles.lede}>كل وحدة لها نسخة صغيرة تكفي ومصدر تقدرين تشوفينه.</p>
        <div className={styles.starterChips} role="group" aria-label="عادات جاهزة">
          {options.map((h) => {
            const on = picked.includes(h.id)
            return (
              <Chip key={h.id} selected={on} onClick={() => setPicked((x) => (on ? x.filter((y) => y !== h.id) : [...x, h.id]))}>
                <Bidi>{h.titleAr}</Bidi>
              </Chip>
            )
          })}
        </div>
        <Button size="large" block disabled={picked.length === 0} onClick={() => void add()}>
          {picked.length === 0 ? 'اختاري وحدة أو أكثر' : 'أضيفيها لعاداتي'}
        </Button>
      </div>
    </Sheet>
    </>
  )
}
