import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDays, todayView, type EveningChoice, type PlanItem, type TaskItem } from '../../../domain'
import { Bidi, MetaLine } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { Screen } from '../../components/Screen'
import { StarMark } from '../../components/StarMark'
import { useToast } from '../../components/Toast'
import { WMark } from '../../components/WMark'
import { dur, ease, springs } from '../../motion'
import { useStack } from '../../shell/stack'
import { isolate, metaParts, thingsCount } from './lib'
import styles from './Evening.module.css'
import { useTodayModel } from './useTodayModel'

type Open = { kind: 'item'; item: PlanItem } | { kind: 'task'; task: TaskItem }

const CHOICES: { value: EveningChoice; label: string; hint: string }[] = [
  { value: 'tomorrow', label: 'بكرة', hint: 'تنتقل لبكرة' },
  { value: 'later', label: 'بعدين', hint: 'تروح لـ«بعدين»' },
  { value: 'letGo', label: 'خلّيها', hint: 'نتركها اليوم بس — ما تنحذف' },
]

/** نقفل اليوم — what she did (as evidence), and a calm decision for each open thing. */
export default function EveningScreen() {
  const navigate = useNavigate()
  const stack = useStack()
  const reduce = useReducedMotion()
  const toast = useToast()
  const { s, store, today, view, logs, isDone, isSkipped } = useTodayModel()
  const [decided, setDecided] = useState<Record<string, EveningChoice>>({})
  const [closed, setClosed] = useState(false)

  const dayItems = view.plan.items.filter((i) => i.tier !== 'chain')
  const doneCount = [...logs.values()].filter((l) => l.level !== 'skipped').length + view.tasks.filter((t) => t.status === 'done').length
  const open: Open[] = [
    ...dayItems.filter((i) => !isDone(i) && !isSkipped(i)).map((item) => ({ kind: 'item' as const, item })),
    ...view.tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').map((task) => ({ kind: 'task' as const, task })),
  ]
  const keyOf = (o: Open) => (o.kind === 'item' ? o.item.id : o.task.id)
  const pending = open.filter((o) => !decided[keyOf(o)])

  const tomorrow = addDays(today, 1)
  const tomorrowFirst = useMemo(() => {
    const t = todayView(s, tomorrow).plan.items.filter((i) => i.tier !== 'chain')
    return t.sort((a, b) => (a.startMinute ?? 1e4) - (b.startMinute ?? 1e4))[0] ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, tomorrow.toDateString()])

  const decide = async (o: Open, choice: EveningChoice) => {
    const key = keyOf(o)
    setDecided((d) => ({ ...d, [key]: choice }))
    try {
      if (o.kind === 'task') {
        const prev = { status: o.task.status, dueDate: o.task.dueDate, postponedTo: o.task.postponedTo }
        await store.eveningDecision({ taskId: o.task.id }, choice)
        toast({
          message: confirmation(choice, o.task.title, true),
          actionLabel: 'تراجع',
          onAction: () => {
            void store.updateTask(o.task.id, prev)
            setDecided(({ [key]: _, ...rest }) => rest)
          },
        })
        return
      }
      const item = o.item
      await store.eveningDecision({ planItemId: item.id }, choice)
      toast({
        message: confirmation(choice, item.title.ar),
        actionLabel: 'تراجع',
        onAction: () => {
          void undoChoice(item, choice)
          setDecided(({ [key]: _, ...rest }) => rest)
        },
      })
    } catch {
      setDecided(({ [key]: _, ...rest }) => rest)
      toast({ message: 'ما قدرنا نحفظ اختيارك. جرّبي مرة ثانية.' })
    }
  }

  const undoChoice = async (item: PlanItem, choice: EveningChoice) => {
    if (choice === 'later') await store.restoreFromLater(item.id)
    else if (choice === 'tomorrow') {
      await store.undoMoveToDate(item.id, tomorrow, today, true)
    } else {
      const log = store.getSnapshot().logs.find((l) => l.itemId === item.itemId && l.level === 'skipped' && l.date === view.date)
      if (log) await store.undo(log.id, true)
    }
  }

  const finish = () => {
    setClosed(true)
    window.setTimeout(() => (stack ? stack.goBack() : navigate('/today')), reduce ? 400 : 1600)
  }

  if (closed) {
    return (
      <Screen title="نقفل اليوم" backLabel="اليوم" inlineTitle>
        <motion.div className={styles.closing} initial={reduce ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: dur.slow, ease: ease.enter }}>
          <WMark size={64} glow />
          <p className={styles.closingTitle}>سكّرنا يومك</p>
          <p className={styles.closingBody}>تصبحين على خير — بكرة يوم جديد.</p>
        </motion.div>
      </Screen>
    )
  }

  return (
    <Screen title="نقفل اليوم" backLabel="اليوم" subtitle="دقيقتين نرتّب فيها بكرة، وبعدها ارتاحي.">
      <section className={styles.summary} aria-label="اللي خلّصتيه">
        <div className={styles.stars} aria-hidden="true">
          {Array.from({ length: Math.min(doneCount, 3) }).map((_, i) => (
            <motion.span key={i} initial={reduce ? false : { scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...springs.pop, delay: 0.08 * i }}>
              <StarMark size={i === 0 ? 18 : 12} color="var(--action-default)" glow={i === 0} />
            </motion.span>
          ))}
        </div>
        <p className={styles.summaryTitle}>{doneCount === 0 ? 'يوم خفيف' : `خلّصتي ${thingsCount(doneCount)} اليوم`}</p>
        <p className={styles.summaryBody}>{doneCount === 0 ? 'والراحة بعد تنحسب. ما فيه شي يرجع للصفر.' : 'كل وحدة منها مسجّلة لك.'}</p>
      </section>

      {open.length > 0 && (
        <section className={styles.openList} aria-label="اللي باقي">
          <h2 className={styles.kicker}>اللي باقي — وش نسوي فيه؟</h2>
          <p className={styles.legend}>بكرة: تنتقل لبكرة · بعدين: تروح لـ«بعدين» · خلّيها: نتركها اليوم بس، ما تنحذف</p>
          <div className={styles.group}>
            <AnimatePresence initial={false}>
              {pending.map((o, idx) => {
                const title = o.kind === 'item' ? o.item.title.ar : o.task.title
                return (
                  <motion.div
                    key={keyOf(o)}
                    layout={!reduce}
                    className={styles.row}
                    data-last={idx === pending.length - 1 || undefined}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, transition: { duration: dur.base, ease: ease.exit } }}
                  >
                    <div className={styles.rowText}>
                      <span className={styles.rowTitle}>
                        <Bidi>{title}</Bidi>
                      </span>
                      <span className={styles.rowMeta}>{o.kind === 'item' ? <MetaLine parts={metaParts(o.item)} /> : 'مهمة'}</span>
                    </div>
                    <div className={styles.choices} role="group" aria-label={`وش نسوي في ${title}؟`}>
                      {CHOICES.map((c) => (
                        <button key={c.value} type="button" className={styles.choice} data-kind={c.value} onClick={() => void decide(o, c.value)} aria-label={`${c.label}: ${c.hint}`}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            {pending.length === 0 && (
              <motion.p className={styles.allSet} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
                <StarMark size={12} color="var(--action-default)" /> كل شي له مكانه.
              </motion.p>
            )}
          </div>
        </section>
      )}

      {tomorrowFirst && (
        <section className={styles.tomorrow} aria-label="أول خطوة بكرة">
          <h2 className={styles.kicker}>أول خطوة بكرة</h2>
          <p className={styles.tomorrowTitle}>
            <Bidi>{tomorrowFirst.title.ar}</Bidi>
          </p>
        </section>
      )}

      <div className={styles.actions}>
        <Button block size="large" onClick={finish}>
          {pending.length > 0 ? 'خلاص، باقيها تستنى' : 'تصبحين على خير'}
        </Button>
      </div>
    </Screen>
  )
}

function confirmation(choice: EveningChoice, title: string, task = false): string {
  const t = isolate(title)
  if (choice === 'tomorrow') return `انتقلت لبكرة: ${t}`
  if (choice === 'later') return `راحت لـ«بعدين»: ${t}`
  return task ? `تركناها اليوم ورجعت للوارد: ${t}` : `تركناها اليوم: ${t}`
}
