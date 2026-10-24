import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { useStableNavigate } from '../../shell/navigate'
import { addDays, dayGroupOf, dayKey, daySummary, hasOwnRoutineProducts, needsMonthPlan, parseDayKey, postponedTasks, routineSkippedToday, skippedRoutineLogs, weekAhead, weeklyMomentum, type CompletionLevel, type PlanItem, type TaskItem, type WeekAheadEntry } from '../../../domain'
import { Bidi, MetaLine } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { CheckCircle } from '../../components/CheckCircle'
import { HeroNextStep } from '../../components/HeroNextStep'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { PaydayCard } from '../../components/PaydayCard'
import { PostponeSheet } from '../../components/PostponeSheet'
import { Screen } from '../../components/Screen'
import { StarMark } from '../../components/StarMark'
import { WMark } from '../../components/WMark'
import { Icon } from '../../icons/Icon'
import { dur, ease } from '../../motion'
import { restartSkippedRoutine } from '../habits/shared'
import { DayReady } from './DayReady'
import { FreeJoyCard } from './FreeJoyCard'
import { Glyph } from './Glyph'
import { LevelChip, LevelPicker, levelOf } from './LevelStrip'
import { WeekStrip } from './WeekStrip'
import { LaterSheet } from './LaterSheet'
import { DOMAIN_LABEL, clock, dateLine, domainGlyph, greetingFor, isolate, metaParts, minutesText, previewSuggestions, stepsLeft, thingsCount } from './lib'
import { RoutineThread, type ThreadStep } from './RoutineThread'
import styles from './Today.module.css'
import { TodayEnergy } from './TodayEnergy'
import { useTodayModel } from './useTodayModel'
import { SearchButton } from '../notes/SearchSheet'
import { QuickAddSheet } from './QuickAddSheet'
import { TodayReminderBanner } from '../reminders/TodayReminderBanner'

/** Minutes since the logical day began: after midnight but before the 04:30 flip still counts as "tonight". */
const logicalMinute = (d: Date): number => {
  const m = d.getHours() * 60 + d.getMinutes()
  return m < 4 * 60 + 30 ? m + 24 * 60 : m
}

export default function TodayScreen() {
  const navigate = useStableNavigate()
  const reduce = useReducedMotion()
  const { s, store, today, view, answered, sparks, isDone, isSkipped, actions } = useTodayModel()
  const displayName = s.settings.displayName?.trim() ?? ''
  const [postpone, setPostpone] = useState<PlanItem | null>(null)
  const [laterOpen, setLaterOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const now = new Date()
  const nowMin = logicalMinute(now)

  const parkedTasks = useMemo(() => postponedTasks(s), [s])
  const needsPlan = useMemo(() => needsMonthPlan(s, today), [s, today])

  // ---- what is on her day --------------------------------------------------------------
  const chainAccepted = view.plan.items.filter((i) => i.tier === 'chain')
  const chainSuggested = view.suggestions.filter((x) => x.item.tier === 'chain').map((x) => x.item)
  const slotSkipped = (slot: 'am' | 'pm') => routineSkippedToday(s, today, slot)
  const routine = pickRoutine(chainAccepted, nowMin, isDone, slotSkipped)
  const routineOffer = routine == null ? pickRoutine(chainSuggested, nowMin, () => false, slotSkipped) : null
  // skipped in full today → one calm line, not an offer and not an open routine
  const routineSkipped = routine?.skipped ? routine : routineOffer?.skipped ? routineOffer : null
  // No products of her own yet → invite her to add them (the generic ones are suggestions, never her routine).
  const productsInvite =
    routine == null &&
    routineOffer == null &&
    !hasOwnRoutineProducts(s.products) &&
    s.products.some((p) => p.placeholder && p.slot !== 'weekly') &&
    s.settings.pausedRoutineSlots.length < 2
  const day = view.plan.items.filter((i) => i.tier !== 'chain')
  // free joy: her accepted joy, else today's suggested one — a card of its own, not a list row
  const joyItem = day.find((i) => i.tier === 'joy') ?? view.suggestions.find((x) => x.group === 'joy')?.item ?? null
  const open = day.filter((i) => !isDone(i) && !isSkipped(i))
  const hero = pickHero(open, nowMin)
  const list = day.filter((i) => i !== hero && i.tier !== 'joy')
  const coreRows = list.filter((i) => dayGroupOf(i.tier) === 'core')
  const maintainRows = list.filter((i) => dayGroupOf(i.tier) !== 'core')
  const summary = daySummary(view.plan, isDone)
  const momentum = useMemo(() => weeklyMomentum(s, today), [s, today])
  const week = useMemo(() => weekAhead(s, today, view.thisWeek), [s, today, view.thisWeek])
  const tasks = view.tasks
  const suggestions = view.suggestions.filter((x) => x.item.tier !== 'chain' && x.item.tier !== 'joy')
  const preview = previewSuggestions(suggestions)
  const laterCount = view.later.length + parkedTasks.length
  // a routine she added counts as her day (the empty card must not show next to it)
  const isEmpty = day.length === 0 && tasks.length === 0 && chainAccepted.length === 0
  const chainOpen = chainAccepted.filter((i) => !isDone(i) && !isSkipped(i))
  const allDone = !isEmpty && open.length === 0 && chainOpen.length === 0 && tasks.every((t) => t.status === 'done')
  const evening = nowMin >= 17 * 60

  const joyDone = joyItem != null && isDone(joyItem)
  const showJoyCard = joyItem != null && joyItem.id !== hero?.id
  const openWeek = useCallback((e: WeekAheadEntry) => navigate(e.kind === 'project' ? `/path/project/${encodeURIComponent(e.id)}` : `/today/item/${encodeURIComponent(e.id)}`), [navigate])

  // Rows are memoised (55+ on a full day); they report events by id and we act on the
  // latest item here, so a bailed-out row never runs an action with a stale item.
  const latest = useRef({ day, tasks, actions, navigate, store })
  latest.current = { day, tasks, actions, navigate, store }
  const onRowEvent = useCallback((e: RowEvent, id: string) => {
    const { day: items, actions: a, navigate: nav } = latest.current
    const it = items.find((x) => x.id === id)
    if (!it) return
    if (e === 'open') nav(`/today/item/${encodeURIComponent(it.id)}`)
    else if (e === 'complete') void a.complete(it)
    else if (e === 'uncomplete') a.uncomplete(it)
    else if (e === 'later') void a.later(it)
    else if (e === 'postpone') setPostpone(it)
    else if (e === 'skip') void a.skip(it)
    else if (e === 'remove') void a.remove(it)
  }, [])
  const onLevel = useCallback((id: string, level: CompletionLevel) => {
    void latest.current.store.setPlannedLevel(id, level)
  }, [])
  const onTaskEvent = useCallback((e: TaskEvent, id: string) => {
    const { tasks: ts, actions: a } = latest.current
    const t = ts.find((x) => x.id === id)
    if (!t) return
    if (e === 'done') void a.completeTask(t)
    else if (e === 'undone') void a.uncompleteTask(t)
    else if (e === 'later') void a.postponeTask(t)
    else void a.taskToInbox(t)
  }, [])

  const planRow = (it: PlanItem, i: number) => (
    <PlanRow key={it.id} it={it} index={i} done={isDone(it)} skipped={isSkipped(it)} reduce={!!reduce} metaKey={metaKey(it)} level={levelOf(it)} onEvent={onRowEvent} onLevel={onLevel} />
  )

  return (
    <Screen
      title={greetingFor(now, displayName)}
      revealTitle
      compactTitle="اليوم"
      eyebrow={
        <>
          <span className={styles.eyebrowStart}>
            <WMark size={32} />
            <span>{dateLine(today)}</span>
          </span>
          {sparks > 0 ? (
            <button type="button" className={styles.sparks} onClick={() => navigate('/joy/reward')} aria-label={`شراراتك: ${sparks}`}>
              <StarMark size={12} color="var(--action-default)" />
              <span className={styles.num}>{sparks}</span>
            </button>
          ) : null}
        </>
      }
      aurora
      actions={
        <>
          <SearchButton />
          {/* quick add lives in the header on Today (the floating + would sit over rows' trailing controls) */}
          <button type="button" className={styles.headerBtn} onClick={() => setAddOpen(true)} aria-label="إضافة سريعة">
            <Icon name="plus" size={24} />
          </button>
        </>
      }
    >
      <TodayReminderBanner />

      <TodayEnergy value={answered ? view.energy : null} onChange={(e) => void store.setEnergy(e)} />

      {answered && view.energy === 'red' && (
        <button type="button" className={styles.briefLink} onClick={() => navigate('/today/calm')}>
          <Glyph name="moon" size={20} />
          <span>النسخة الهادئة من يومك</span>
          <Icon name="chevron" size={18} />
        </button>
      )}

      {!answered && nowMin >= 4 * 60 + 30 && nowMin < 13 * 60 && (
        <button type="button" className={styles.briefLink} onClick={() => navigate('/brief')}>
          <Glyph name="sun" size={20} />
          <span>موجز الصباح جاهز — نرتّب يومك على قد طاقتك</span>
          <Icon name="chevron" size={18} />
        </button>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {hero ? (
          <motion.div key={`hero-${hero.id}`} initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: dur.base, ease: ease.enter }}>
            <HeroNextStep
              eyebrow={hero.startMinute != null ? `خطوتك الجاية · ${clock(hero.startMinute)}` : 'خطوتك الجاية'}
              title={isolate(hero.title.ar)}
              // one meta line like the boards («بعد الفطور · 15 د · النسخة الصغيرة تكفي»); the reason lives behind «ليش اليوم؟»
              meta={<MetaLine parts={[hero.startMinute != null ? null : metaParts(hero)[0], hero.estimatedMin > 0 ? minutesText(hero.estimatedMin) : null, hero.suggestedLevel === 'minimum' ? 'النسخة الصغيرة تكفي' : 'أي نسخة تنحسب لك']} />}
              layoutId={`item-${hero.id}`}
              primaryLabel={hero.estimatedMin >= 10 ? 'يلا نبدأ' : 'خلّصتها'}
              onPrimary={() => (hero.estimatedMin >= 10 ? navigate(`/focus/${encodeURIComponent(hero.id)}`) : void actions.complete(hero))}
              secondaryLabel="ليش اليوم؟"
              onSecondary={() => navigate(`/today/item/${encodeURIComponent(hero.id)}`)}
              onOpen={() => navigate(`/today/item/${encodeURIComponent(hero.id)}`)}
            />
          </motion.div>
        ) : isEmpty ? (
          <motion.section key="empty" className={styles.calm} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-label="يومك فاضي">
            <span className={styles.calmEyebrow}>يومك فاضي للحين</span>
            <p className={styles.calmTitle}>ما فيه شي لازم.</p>
            <p className={styles.calmBody}>اختاري اللي يناسب طاقتك — ما ينضاف شي ليومك إلا لما تختارينه.</p>
            <div className={styles.calmActions}>
              <Button onClick={() => navigate('/brief')}>رتّبي يومك</Button>
            </div>
          </motion.section>
        ) : allDone ? (
          <motion.section key="done" className={styles.calm} data-done initial={reduce ? false : { opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} aria-label="خلّصتي يومك">
            <span className={styles.calmEyebrow}>
              <StarMark size={12} color="var(--action-default)" glow /> خلّصتي اللي اخترتيه
            </span>
            <p className={styles.calmTitle}>يومك كمل.</p>
            <p className={styles.calmBody}>{evening ? 'دقيقتين نقفل فيها اليوم ونرتّب بكرة؟' : 'الباقي من يومك لك — بدون شروط.'}</p>
            {evening && (
              <div className={styles.calmActions}>
                <Button variant="secondary" onClick={() => navigate('/evening')}>
                  نقفل اليوم
                </Button>
              </div>
            )}
          </motion.section>
        ) : null}
      </AnimatePresence>

      {summary.total > 0 && <DayReady summary={summary} momentum={momentum} energy={answered ? view.energy : null} busyShown={view.load.busy && !isEmpty && !allDone} routineLeft={routine && !routine.skipped && routine.left > 0 ? `${routine.title}: ${stepsLeft(routine.left)}` : null} />}

      {needsPlan && (
        <div className={styles.payday}>
          <PaydayCard daysLeft={0} onPlan={() => navigate('/me/money')} />
        </div>
      )}

      {view.load.busy && !isEmpty && !allDone && (
        <p className={styles.busy} role="status">
          يومك مليان شوي{view.load.overByMin > 0 ? <> — أكثر من وقتك بـ<bdi>{minutesText(view.load.overByMin)}</bdi></> : null}. لو تبين، أجّلي شي لـ«بعدين»؛ ما نحرّك شي بدونك.
        </p>
      )}

      {routine && !routine.skipped && (
        <section className={styles.routine} aria-label={routine.title}>
          <div className={styles.routineHead}>
            <h2 className={styles.routineTitle}>
              {routine.title} · {stepsLeft(routine.left)}
            </h2>
            <button type="button" className={styles.link} onClick={() => navigate(`/routine/${routine.slot}`)}>
              افتحيه
            </button>
          </div>
          <RoutineThread steps={routine.steps} label={`${routine.title}: ${stepsLeft(routine.left)}`} />
        </section>
      )}

      {routineSkipped && (
        <InsetGroupedList>
          <ListRow
            muted
            leading={
              <span className={styles.glyph}>
                <Glyph name={routineSkipped.slot === 'am' ? 'sun' : 'moon'} size={20} />
              </span>
            }
            title={`${routineSkipped.title} — تخطّيتيه اليوم`}
            subtitle="بكرة نرجع له"
            trailing={
              <button
                type="button"
                className={styles.link}
                onClick={() => void restartSkippedRoutine(store, skippedRoutineLogs(s, today, routineSkipped.slot))}
                aria-label={`رجّعي ${routineSkipped.title} لليوم`}
              >
                رجّعيه لليوم
              </button>
            }
          />
        </InsetGroupedList>
      )}

      {routineOffer && !routineOffer.skipped && (
        <InsetGroupedList>
          <ListRow
            leading={
              <span className={styles.accentIcon}>
                <Glyph name={routineOffer.slot === 'am' ? 'sun' : 'moon'} size={20} />
              </span>
            }
            title={`${routineOffer.title} — لو تبينه`}
            subtitle="من منتجاتك، خطوة خطوة"
            onClick={() => navigate(`/routine/${routineOffer.slot}`)}
            trailing={
              <button
                type="button"
                className={styles.addPill}
                onClick={(e) => {
                  e.stopPropagation()
                  void actions.acceptRoutine(routineOffer.steps.map((x) => x.id), routineOffer.title)
                }}
                aria-label={`أضيفي ${routineOffer.title} ليومك`}
              >
                + أضيفيه
              </button>
            }
          />
        </InsetGroupedList>
      )}

      {productsInvite && (
        <InsetGroupedList>
          <ListRow
            leading={
              <span className={styles.accentIcon}>
                <Glyph name="sun" size={20} />
              </span>
            }
            title="أضيفي منتجاتك"
            subtitle="روتين الصبح والمسا يتكوّن من منتجاتك أنتِ"
            chevron
            onClick={() => navigate('/me/products')}
          />
        </InsetGroupedList>
      )}

      {coreRows.length > 0 && (
        <InsetGroupedList header={`الأساسيات · ${coreRows.length + (hero && dayGroupOf(hero.tier) === 'core' ? 1 : 0)}`}>
          <AnimatePresence initial={false}>{coreRows.map((it, i) => planRow(it, i))}</AnimatePresence>
        </InsetGroupedList>
      )}

      {maintainRows.length > 0 && (
        <InsetGroupedList header={`الصيانة · ${maintainRows.length + (hero && dayGroupOf(hero.tier) === 'maintain' ? 1 : 0)}`}>
          <AnimatePresence initial={false}>{maintainRows.map((it, i) => planRow(it, i))}</AnimatePresence>
        </InsetGroupedList>
      )}

      {showJoyCard && joyItem && (
        <FreeJoyCard item={joyItem} done={joyDone} onChange={(v) => (v ? void actions.complete(joyItem, 'normal') : actions.uncomplete(joyItem))} />
      )}

      {tasks.length > 0 && (
        <InsetGroupedList header="مهامك">
          <AnimatePresence initial={false}>
            {tasks.map((t) => (
              <TaskRow key={t.id} t={t} today={dayKey(today)} onEvent={onTaskEvent} />
            ))}
          </AnimatePresence>
        </InsetGroupedList>
      )}

      {suggestions.length > 0 && (
        <InsetGroupedList
          header="اقتراحات — أنتِ تختارين"
          headerAction={
            preview.more ? (
              <button type="button" className={styles.link} onClick={() => navigate('/brief')}>
                الكل
              </button>
            ) : undefined
          }
          footer={isEmpty ? undefined : 'ما ينضاف شي ليومك إلا لما تختارينه.'}
        >
          {preview.shown.map((sg) => (
            <ListRow
              key={sg.item.id}
              title={<Bidi>{sg.item.title.ar}</Bidi>}
              subtitle={<MetaLine parts={metaParts(sg.item)} />}
              menu={[{ key: 'why', label: 'ليش مقترحة؟', icon: <Icon name="more" size={20} />, onSelect: () => navigate(`/today/item/${encodeURIComponent(sg.item.id)}`) }]}
              trailing={
                <button type="button" className={styles.addPill} onClick={() => void actions.accept(sg.item)} aria-label={`أضيفي ${sg.item.title.ar} لليوم`}>
                  + أضيفيه
                </button>
              }
            />
          ))}
        </InsetGroupedList>
      )}

      <InsetGroupedList>
        <ListRow
          leading={
            <span className={styles.accentIcon}>
              <Icon name="later" size={20} />
            </span>
          }
          title="بعدين"
          trailing={<span className={styles.count}>{laterCount === 0 ? 'فاضي' : `${thingsCount(laterCount)} ${laterCount === 1 || laterCount > 10 ? 'محفوظ' : 'محفوظة'}`}</span>}
          chevron
          onClick={() => setLaterOpen(true)}
        />
        {evening && !allDone && (
          <ListRow
            leading={
              <span className={styles.accentIcon}>
                <Icon name="moon" size={20} />
              </span>
            }
            title="نقفل اليوم"
            subtitle="دقيقتين نرتّب فيها بكرة"
            chevron
            onClick={() => navigate('/evening')}
          />
        )}
      </InsetGroupedList>

      <WeekStrip entries={week} onOpen={openWeek} />

      {view.showHelpLink && (
        <button type="button" className={styles.helpLink} onClick={() => navigate('/help')}>
          يومك ثقيل؟ المساعدة قريبة منك
        </button>
      )}

      <PostponeSheet
        open={!!postpone}
        itemTitle={postpone?.title.ar ?? ''}
        minDate={dayKey(addDays(today, 1))}
        onClose={() => setPostpone(null)}
        onChoose={(c) => {
          const it = postpone
          setPostpone(null)
          if (!it) return
          if (c.kind === 'tomorrow') void actions.moveTo(it, addDays(today, 1), 'بكرة')
          else if (c.kind === 'date') void actions.moveTo(it, parseDayKey(c.date), null)
          else if (c.kind === 'inbox') void actions.toInbox(it)
          else void actions.later(it)
        }}
      />

      <QuickAddSheet open={addOpen} onClose={() => setAddOpen(false)} />

      <LaterSheet
        open={laterOpen}
        onClose={() => setLaterOpen(false)}
        items={view.later}
        tasks={parkedTasks}
        onRestore={(i) => void actions.restore(i)}
        onDrop={(i) => void actions.dropLater(i)}
        onPlanTask={(t) => void store.planTask(t.id, dayKey(today), t.time)}
      />
    </Screen>
  )
}

type RowEvent = 'open' | 'complete' | 'uncomplete' | 'later' | 'postpone' | 'skip' | 'remove'
type TaskEvent = 'done' | 'undone' | 'later' | 'inbox'

/** What a plan row shows; when this is unchanged the row can skip re-rendering. */
const metaKey = (it: PlanItem): string => metaParts(it).map((p) => p ?? '').join('\u0001')

interface PlanRowProps {
  it: PlanItem
  index: number
  done: boolean
  skipped: boolean
  reduce: boolean
  metaKey: string
  level: Exclude<CompletionLevel, 'skipped'>
  onEvent: (e: RowEvent, id: string) => void
  onLevel: (id: string, level: CompletionLevel) => void
}

const PlanRow = memo(
  function PlanRow({ it, index: i, done, skipped, reduce, level, onEvent, onLevel }: PlanRowProps) {
    const [pick, setPick] = useState(false)
    const ev = (e: RowEvent) => () => onEvent(e, it.id)
    return (
      <motion.div
        layout={!reduce}
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.enter, delay: Math.min(i, 6) * 0.04 } }}
        exit={{ opacity: 0, height: 0, transition: { duration: dur.base, ease: ease.exit } }}
        role="none"
      >
        <ListRow
          leading={
            <CheckCircle checked={done} onChange={(v) => onEvent(v ? 'complete' : 'uncomplete', it.id)} label={`خلّصت: ${it.title.ar}`} />
          }
          onClick={ev('open')}
          title={<Bidi>{it.title.ar}</Bidi>}
          muted={done || skipped}
          subtitle={skipped ? 'تخطّيتيها اليوم' : done ? 'خلصت' : <MetaLine parts={metaParts(it)} />}
          trailing={
            done || skipped ? null : (
              <span className={styles.trail}>
                <LevelChip level={level} open={pick} onToggle={() => setPick((v) => !v)} />
                <span className={styles.glyph}>
                  <Glyph name={domainGlyph(it.domain)} size={18} label={DOMAIN_LABEL[it.domain]} />
                </span>
              </span>
            )
          }
          leadingActions={done ? [] : [{ key: 'done', label: 'إنجاز', tone: 'accent', icon: <Icon name="check" size={20} />, onAction: ev('complete') }]}
          trailingActions={
            done
              ? []
              : [
                  { key: 'later', label: 'بعدين', tone: 'neutral', icon: <Icon name="later" size={20} />, onAction: ev('later') },
                  { key: 'remove', label: 'شيليها', tone: 'destructive', icon: <Icon name="trash" size={20} />, onAction: ev('remove') },
                ]
          }
          menu={[
            ...(done
              ? [{ key: 'undo', label: 'ما خلصت', icon: <Icon name="undo" size={20} />, onSelect: ev('uncomplete') }]
              : [
                  { key: 'done', label: 'إنجاز', icon: <Icon name="check" size={20} />, onSelect: ev('complete') },
                  { key: 'later', label: 'بعدين…', icon: <Icon name="later" size={20} />, onSelect: ev('postpone') },
                  { key: 'skip', label: 'تخطّيها اليوم', icon: <Icon name="close" size={20} />, onSelect: ev('skip') },
                ]),
            { key: 'remove', label: 'شيليها من اليوم', destructive: true, icon: <Icon name="trash" size={20} />, onSelect: ev('remove') },
          ]}
        />
        {pick && !done && !skipped && <LevelPicker item={it} onChange={(l) => onLevel(it.id, l)} />}
      </motion.div>
    )
  },
  (a, b) =>
    a.it.id === b.it.id &&
    a.it.title.ar === b.it.title.ar &&
    a.it.domain === b.it.domain &&
    a.metaKey === b.metaKey &&
    a.index === b.index &&
    a.done === b.done &&
    a.skipped === b.skipped &&
    a.reduce === b.reduce &&
    a.level === b.level &&
    a.it.minimumText === b.it.minimumText &&
    a.it.normalText === b.it.normalText &&
    a.it.bonusText === b.it.bonusText &&
    a.onEvent === b.onEvent &&
    a.onLevel === b.onLevel,
)

const TaskRow = memo(function TaskRow({ t, today, onEvent }: { t: TaskItem; today: string; onEvent: (e: TaskEvent, id: string) => void }) {
  const done = t.status === 'done'
  const overdue = t.dueDate != null && t.dueDate < today
  const ev = (e: TaskEvent) => () => onEvent(e, t.id)
  return (
    <div role="none">
      <ListRow
        leading={
          <CheckCircle checked={done} onChange={(v) => onEvent(v ? 'done' : 'undone', t.id)} label={`خلّصت: ${t.title}`} />
        }
        title={<Bidi>{t.title}</Bidi>}
        muted={done}
        subtitle={done ? 'خلصت' : <MetaLine parts={[t.time != null ? clock(t.time) : null, overdue ? 'من قبل' : null, 'مهمة']} />}
        leadingActions={done ? [] : [{ key: 'done', label: 'إنجاز', tone: 'accent', icon: <Icon name="check" size={20} />, onAction: ev('done') }]}
        trailingActions={done ? [] : [{ key: 'later', label: 'بعدين', tone: 'neutral', icon: <Icon name="later" size={20} />, onAction: ev('later') }]}
        menu={
          done
            ? [{ key: 'undo', label: 'ما خلصت', icon: <Icon name="undo" size={20} />, onSelect: ev('undone') }]
            : [
                { key: 'done', label: 'إنجاز', icon: <Icon name="check" size={20} />, onSelect: ev('done') },
                { key: 'later', label: 'بعدين', icon: <Icon name="later" size={20} />, onSelect: ev('later') },
                { key: 'inbox', label: 'رجّعيها للوارد', icon: <Icon name="inbox" size={20} />, onSelect: ev('inbox') },
              ]
        }
      />
    </div>
  )
})

/** The next open item: the first one whose time hasn't passed, else the earliest open one. */
function pickHero(open: PlanItem[], nowMin: number): PlanItem | null {
  if (open.length === 0) return null
  const core = open.filter((i) => i.tier !== 'joy')
  const pool = core.length > 0 ? core : open
  const upcoming = pool.filter((i) => i.startMinute == null || i.startMinute >= nowMin - 30)
  return (upcoming[0] ?? pool[0]) ?? null
}

interface RoutinePick {
  title: string
  slot: 'am' | 'pm'
  steps: ThreadStep[]
  left: number
  /** She skipped this whole routine today — a calm finished state, never an offer (QA N4). */
  skipped?: boolean
}

/** Morning routine until it's done or it's past 3pm, then the evening one. */
function pickRoutine(items: PlanItem[], nowMin: number, isDone: (i: PlanItem) => boolean, isSkippedSlot: (slot: 'am' | 'pm') => boolean): RoutinePick | null {
  const build = (section: 'morningChain' | 'eveningChain'): RoutinePick | null => {
    const its = items.filter((i) => i.section === section).sort((a, b) => (a.startMinute ?? 0) - (b.startMinute ?? 0))
    const seen = new Set<string>()
    const uniq = its.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)))
    if (uniq.length === 0) return null
    const slot = section === 'morningChain' ? 'am' : 'pm'
    if (isSkippedSlot(slot)) return { title: slot === 'am' ? 'روتين الصبح' : 'روتين المسا', slot, steps: [], left: 0, skipped: true }
    const firstOpen = uniq.findIndex((i) => !isDone(i))
    const steps: ThreadStep[] = uniq.map((i, idx) => ({
      id: i.id,
      label: i.title.ar,
      state: isDone(i) ? 'done' : idx === firstOpen ? 'current' : 'todo',
    }))
    return {
      title: section === 'morningChain' ? 'روتين الصبح' : 'روتين المسا',
      slot: section === 'morningChain' ? 'am' : 'pm',
      steps,
      left: steps.filter((x) => x.state !== 'done').length,
    }
  }
  const am = build('morningChain')
  const pm = build('eveningChain')
  if (am && (am.left > 0 && nowMin < 15 * 60)) return am
  if (pm && nowMin >= 15 * 60) return pm
  return am ?? pm
}
