import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { productsBySlot, productStepId, type ProductSlot } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { Screen } from '../../components/Screen'
import { StarDottedLine } from '../../components/StarDottedLine'
import { StarMark } from '../../components/StarMark'
import { dur, ease, springs } from '../../motion'
import { useStack } from '../../shell/stack'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import styles from './habits.module.css'
import { categoryAr, doneSteps, howTo, isStepDone, productName, SLOT_ROUTINE_AR } from './shared'

const AR_ORD = ['', 'الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة']

/** One step at a time: product, how-to, «خلصت» → a star lands on the thread. */
export default function RoutinePlayerScreen() {
  // Only am|pm|weekly are real slots; anything else (e.g. a route in transition) falls back to the morning.
  const rawSlot = useLocation().pathname.split('/')[2]
  const slot: ProductSlot = rawSlot === 'pm' || rawSlot === 'weekly' ? rawSlot : 'am'
  const reduce = useReducedMotion()
  const stack = useStack()
  const store = useStore()
  const s = useLife()
  const today = useToday()

  const list = useMemo(() => (productsBySlot(s)[slot] ?? []).filter((p) => !p.placeholder), [s, slot])
  const done = useMemo(() => doneSteps(s, today), [s, today])
  const firstOpen = useRef<number | null>(null)
  if (firstOpen.current == null && list.length > 0) {
    const i = list.findIndex((p) => !isStepDone(done, p))
    firstOpen.current = i < 0 ? list.length : i
  }
  const [index, setIndex] = useState(() => firstOpen.current ?? 0)
  const [busy, setBusy] = useState(false)

  const doneCount = list.filter((p) => isStepDone(done, p)).length
  const finished = index >= list.length
  // The star is evidence of a real achievement: at least one step actually done (QA area 2 #2).
  const achieved = doneCount > 0
  const allDone = doneCount === list.length
  const p = finished ? null : list[index]

  const advance = () => {
    let next = index + 1
    while (next < list.length && isStepDone(done, list[next])) next++
    setIndex(next)
  }
  const complete = async () => {
    if (!p || busy) return
    setBusy(true)
    if (!isStepDone(done, p)) await store.completeItem({ itemId: productStepId(p.id), kind: 'routineStep' }, 'normal')
    setBusy(false)
    advance()
  }
  const skip = async () => {
    if (!p || busy) return
    setBusy(true)
    await store.skipItem({ itemId: productStepId(p.id), kind: 'routineStep' })
    setBusy(false)
    advance()
  }

  if (list.length === 0) {
    return (
      <Screen title={SLOT_ROUTINE_AR[slot]} backLabel="روتيني" inlineTitle>
        <EmptyState title="ما فيه خطوات" body="أضيفي منتجات من منتجاتي وترجع هنا." />
      </Screen>
    )
  }

  return (
    <Screen title={SLOT_ROUTINE_AR[slot]} backLabel="روتيني" inlineTitle>
      <div className={styles.player}>
        <div className={styles.playerTop}>
          <StarDottedLine total={list.length} done={doneCount} />
          <span aria-live="polite">
            {finished ? (achieved ? (allDone ? 'خلصتي' : `${doneCount} من ${list.length}`) : 'تخطّيتيه') : `الخطوة ${AR_ORD[index + 1] ?? index + 1} من ${list.length}`}
          </span>
        </div>

        <div className={styles.stage}>
          <AnimatePresence mode="wait" initial={false}>
            {p ? (
              <motion.article
                key={p.id}
                className={styles.stepCard}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: -24, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.98, transition: { duration: dur.quick, ease: ease.exit } }}
                transition={reduce ? { duration: dur.quick } : springs.smooth}
              >
                <span className={styles.stepEyebrow}>{categoryAr(p.category)}</span>
                <h2 className={styles.stepName}>
                  <Bidi>{productName(p)}</Bidi>
                </h2>
                {howTo(p) && <p className={styles.stepHow}>{howTo(p)}</p>}
              </motion.article>
            ) : (
              <motion.div
                key="done"
                className={styles.doneStage}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: dur.base, ease: ease.enter }}
              >
                {achieved ? (
                  <>
                    <StarMark
                      size={56}
                      color="var(--brand-primary)"
                      glow
                      className={styles.doneStar}
                      initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={springs.pop}
                      label="انحسب"
                    />
                    <h2 className={styles.doneTitle}>{allDone ? `خلصتي ${SLOT_ROUTINE_AR[slot]}` : `سوّيتي ${doneCount} من ${list.length}`}</h2>
                    <p className={styles.doneBody}>كل خطوة سويتيها انحسبت لك.</p>
                  </>
                ) : (
                  <>
                    <h2 className={styles.doneTitle}>تخطّيتي {SLOT_ROUTINE_AR[slot]} اليوم</h2>
                    <p className={styles.doneBody}>عادي — ما ينحسب عليك شي، ونرجع له بكرة بهدوء.</p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={styles.playerActions}>
          {p ? (
            <>
              <Button size="large" block onClick={() => void complete()} disabled={busy}>
                خلصت
              </Button>
              <Button variant="plain" block onClick={() => void skip()} disabled={busy}>
                تخطّي هالخطوة
              </Button>
            </>
          ) : (
            <Button size="large" block onClick={() => stack?.goBack()}>
              رجوع لروتيني
            </Button>
          )}
        </div>
      </div>
    </Screen>
  )
}
