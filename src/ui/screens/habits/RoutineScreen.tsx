import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { kProductsAmRoutineId, kProductsPmRoutineId, isRoutineSlotPaused, productsBySlot, productStepId, routineSkippedToday, skippedRoutineLogs, todayView, type Product, type ProductSlot } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { CheckCircle } from '../../components/CheckCircle'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { SegmentedControl } from '../../components/SegmentedControl'
import { StarDottedLine } from '../../components/StarDottedLine'
import { StarMark } from '../../components/StarMark'
import { useToast } from '../../components/Toast'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import styles from './habits.module.css'
import { isoText, doneSteps, restartSkippedRoutine, howTo, isStepDone, LIcon, productName, SLOT_AR, stepMinutes } from './shared'

const ROUTINE_ID: Partial<Record<ProductSlot, string>> = { am: kProductsAmRoutineId, pm: kProductsPmRoutineId }
const AR_COUNT = ['', 'وحدة', 'ثنتين', 'ثلاث', 'أربع', 'خمس', 'ست', 'سبع', 'ثمان', 'تسع', 'عشر']

function progressText(done: number, total: number): string {
  if (total === 0) return ''
  const n = (k: number) => AR_COUNT[k] ?? String(k)
  if (done === 0) return total === 1 ? 'خطوة وحدة — يلا نبدأ' : total === 2 ? 'خطوتين — يلا نبدأ' : `${n(total)} خطوات — يلا نبدأ`
  if (done === total) return 'خلصتي كل الخطوات'
  return `${done === 1 ? 'خطوة' : n(done)} من ${n(total)} خلصت`
}

export default function RoutineScreen() {
  const parts = useLocation().pathname.split('/')
  const initial = (['am', 'pm', 'weekly'].includes(parts[2]) ? parts[2] : 'am') as ProductSlot
  const [slot, setSlot] = useState<ProductSlot>(initial)
  const navigate = useNavigate()
  const toast = useToast()
  const store = useStore()
  const s = useLife()
  const today = useToday()

  // her products only — seeded suggestions never pose as her routine (QA #14)
  const list = useMemo(() => productsBySlot(s)[slot].filter((p) => !p.placeholder), [s, slot])
  const suggested = useMemo(() => s.products.filter((p) => p.placeholder && p.slot === slot).length, [s.products, slot])
  const done = useMemo(() => doneSteps(s, today), [s, today])
  const view = useMemo(() => todayView(s, today), [s, today])
  const doneCount = list.filter((p) => isStepDone(done, p)).length
  const minutes = list.reduce((a, p) => a + stepMinutes(p), 0)
  const isPaused = isRoutineSlotPaused(s, slot)
  // skipped in full today: a calm finished state, not «untouched» (QA N4)
  const skipped = routineSkippedToday(s, today, slot)
  const restart = () => void restartSkippedRoutine(store, skippedRoutineLogs(s, today, slot))

  const toggle = async (p: Product, next: boolean) => {
    const stepId = productStepId(p.id)
    if (next) {
      const r = await store.completeItem({ itemId: stepId, kind: 'routineStep' }, 'normal')
      toast({ message: `${isoText(productName(p))} — انحسبت`, actionLabel: 'تراجع', onAction: () => void store.undo(r.log.id) })
    } else {
      const l = [...s.logs].reverse().find((x) => x.itemId === stepId && x.level !== 'skipped')
      if (l) await store.undo(l.id, true)
    }
  }

  const remaining = list.filter((p) => !isStepDone(done, p))

  const skip = async () => {
    const logs = await Promise.all(remaining.map((p) => store.skipItem({ itemId: productStepId(p.id), kind: 'routineStep' })))
    toast({
      message: 'تخطّيتي الروتين اليوم — عادي',
      actionLabel: 'تراجع',
      onAction: () => void Promise.all(logs.map((l) => store.undo(l.id, true))),
    })
  }

  const later = async () => {
    const rid = ROUTINE_ID[slot]
    const items = view.plan.items.filter((i) => rid != null && i.routineId === rid && remaining.some((p) => productStepId(p.id) === i.itemId))
    if (items.length === 0) {
      toast({ message: 'الروتين مو في يومك اليوم — يظل هنا وقت ما تبين' })
      return
    }
    await Promise.all(items.map((i) => store.moveToLater(i.id)))
    toast({ message: 'راح لـ«بعدين» — يستناك هناك' })
  }

  const pause = async () => {
    await store.setRoutineSlotPaused(slot, true)
    toast({ message: 'وقّفنا الروتين مؤقتًا — منتجاتك باقية', actionLabel: 'تراجع', onAction: () => void resume() })
  }

  const resume = async () => {
    await store.setRoutineSlotPaused(slot, false)
  }

  const cta = doneCount === 0 ? 'ابدئي الروتين' : doneCount < list.length ? 'كمّلي الروتين' : null

  return (
    <Screen
      title="روتيني"
      backLabel="رجوع"
      subtitle="مبني من منتجاتك، بالترتيب اللي تحبينه"
      actions={
        <Button variant="plain" onClick={() => navigate('/me/products')}>
          منتجاتي
        </Button>
      }
    >

      <div className={styles.routineHead}>
        <SegmentedControl
          label="وقت الروتين"
          segments={[
            { value: 'am', label: SLOT_AR.am },
            { value: 'pm', label: SLOT_AR.pm },
            { value: 'weekly', label: SLOT_AR.weekly },
          ]}
          value={slot}
          onChange={(v) => {
            setSlot(v)
            navigate(`/routine/${v}`, { replace: true })
          }}
        />
        {list.length > 0 && !isPaused && !skipped && (
          // board: progress is the screen's one hero block — line of text, then the Star Dotted Line
          <div className={styles.progressCard}>
            <div className={styles.progressRow}>
              <strong>{progressText(doneCount, list.length)}</strong>
              <span>
                حوالي <Bidi>{`${minutes} د`}</Bidi>
              </span>
            </div>
            <StarDottedLine total={list.length} done={doneCount} label={progressText(doneCount, list.length)} />
          </div>
        )}
      </div>

      {isPaused ? (
        <div className={styles.pausedCard}>
          <LIcon name="pause" size={28} />
          <strong>الروتين موقّف مؤقتًا</strong>
          <span>منتجاتك محفوظة، بس ما تطلع في يومك لين ترجعينه.</span>
          <Button onClick={() => void resume()}>رجّعيه</Button>
        </div>
      ) : skipped ? (
        <div className={styles.pausedCard}>
          <strong>{slot === 'weekly' ? 'تخطّيتيها اليوم — نرجع لها بعدين' : 'تخطّيتيه اليوم — بكرة نرجع له'}</strong>
          <span>عادي — ما ينحسب عليك شي. ولو غيّرتي رايك تقدرين ترجّعينه.</span>
          <Button variant="plain" onClick={restart}>
            رجّعيه لليوم
          </Button>
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title={`ما فيه منتجات ${slot === 'weekly' ? 'أسبوعية' : `لل${SLOT_AR[slot].replace(/^ال/, '')}`}`}
          body={suggested ? 'أضيفي منتجاتك أو اختاري من الاقتراحات، وكل منتج يصير خطوة بالترتيب.' : 'أضيفي منتج ويصير خطوة في الروتين.'}
          action={<Button onClick={() => navigate('/me/products')}>{suggested ? 'اختاري منتجاتك' : 'أضيفي منتج'}</Button>}
        />
      ) : (
        <>
          <InsetGroupedList header={slot === 'weekly' ? 'مرة أو مرتين بالأسبوع' : 'الخطوات بالترتيب'}>
            {list.map((p, i) => {
              const isDone = isStepDone(done, p)
              return (
                <ListRow
                  key={p.id}
                  // board: one control per step — the ring carries the number, then the check
                  leading={<CheckCircle checked={isDone} index={i + 1} onChange={(v) => void toggle(p, v)} label={productName(p)} />}
                  title={<Bidi>{productName(p)}</Bidi>}
                  subtitle={howTo(p) || undefined}
                  muted={isDone}
                />
              )
            })}
          </InsetGroupedList>

          {/* board: the step controls and the CTA dock above the tab bar */}
          <div className={styles.dock}>
          {cta && (
            <div className={styles.controls}>
              <button type="button" className={styles.controlBtn} onClick={() => void skip()}>
                تخطّي
              </button>
              <button type="button" className={styles.controlBtn} onClick={() => void later()}>
                بعدين
              </button>
              <button type="button" className={styles.controlBtn} onClick={() => void pause()}>
                وقّفيه مؤقتًا
              </button>
            </div>
          )}

          <div className={styles.cta}>
            {cta ? (
              <Button size="large" block icon={<LIcon name="play" size={20} />} onClick={() => navigate(`/routine/${slot}/play`)}>
                {cta}
              </Button>
            ) : (
              <Button size="large" block variant="secondary" disabled icon={<StarMark size={16} color="var(--brand-primary)" />}>
                خلصتي الروتين
              </Button>
            )}
          </div>
          </div>
        </>
      )}
    </Screen>
  )
}
