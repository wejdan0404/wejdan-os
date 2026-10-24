import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { calmDay, kCalmMinimumCount, kCalmRestPreview, type PlanItem } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { CheckCircle } from '../../components/CheckCircle'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { Icon } from '../../icons/Icon'
import { dur, ease } from '../../motion'
import styles from './CalmDay.module.css'
import { FreeJoyCard } from './FreeJoyCard'
import { Glyph } from './Glyph'
import { dateLine, greetingFor, isolate } from './lib'
import { useTodayModel } from './useTodayModel'

/** يوم هادئ — the low-energy version of today: a few small things, a joy, and what rests. Read-only until she touches it. */
export default function CalmDayScreen() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const { s, today, view, isDone, isSkipped, actions } = useTodayModel()
  const accepted = view.plan.items.filter((i) => i.tier !== 'chain')
  const calm = calmDay(accepted, view.suggestions)
  const name = s.settings.displayName?.trim() ?? ''
  const doneCount = calm.minimum.filter(isDone).length
  const shownCount = calm.minimum.length
  const allDone = shownCount > 0 && doneCount === shownCount
  const fade = (i: number) => (reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: dur.slow, ease: ease.enter, delay: i * 0.05 } })

  const row = (it: PlanItem, opts: { add?: boolean; muted?: boolean } = {}) => {
    const done = isDone(it)
    return (
      <ListRow
        key={it.id}
        leading={opts.add ? undefined : <CheckCircle checked={done} onChange={(v) => (v ? void actions.complete(it, 'minimum') : actions.uncomplete(it))} label={`خلّصت: ${it.title.ar}`} />}
        title={<Bidi>{it.title.ar}</Bidi>}
        subtitle={isSkipped(it) ? 'تخطّيتيها اليوم' : done ? 'خلصت' : <Bidi>{it.minimumText.trim() || 'النسخة الصغيرة تكفي'}</Bidi>}
        muted={done || opts.muted}
        onClick={() => navigate(`/today/item/${encodeURIComponent(it.id)}`)}
        trailing={
          opts.add ? (
            <button type="button" className={styles.add} onClick={(e) => { e.stopPropagation(); void actions.accept(it, 'minimum') }} aria-label={`أضيفي ${it.title.ar} لليوم`}>
              + أضيفيه
            </button>
          ) : undefined
        }
      />
    )
  }

  return (
    <Screen title="يوم هادئ" compactTitle="يوم هادئ" backLabel="اليوم" subtitle={`${greetingFor(new Date(), name)} · ${dateLine(today)}`}>
      <motion.section className={styles.hero} {...fade(0)} aria-label="يوم هادئ">
        <p className={styles.heroBody}>ثلاث أشياء صغيرة ومتعة لك — هذا يكفي تمامًا. الباقي يرتاح اليوم بدون ما ينقص شي.</p>
        {view.energy !== 'red' && <p className={styles.heroNote}>طاقتك اليوم مو «قليلة»، بس النسخة الهادئة موجودة لو احتجتيها.</p>}
      </motion.section>

      {(calm.minimum.length > 0 || calm.fill.length > 0) && (
        <motion.div {...fade(1)}>
          <InsetGroupedList header={`الحد الأدنى فقط · ${doneCount} من ${shownCount || kCalmMinimumCount}`} footer={calm.fill.length > 0 ? 'ما ينضاف شي ليومك إلا لما تختارينه.' : undefined}>
            {calm.minimum.map((it) => row(it))}
            {calm.fill.map((it) => row(it, { add: true }))}
          </InsetGroupedList>
        </motion.div>
      )}

      {allDone && <p className={styles.line} role="status">يكفي اليوم — ارتاحي.</p>}

      {calm.joy && (
        <motion.div {...fade(2)}>
          <FreeJoyCard
            item={calm.joy}
            done={isDone(calm.joy)}
            onChange={(v) => (v ? void actions.complete(calm.joy!, 'normal') : actions.uncomplete(calm.joy!))}
          />
        </motion.div>
      )}

      {calm.extra.length > 0 && (
        <InsetGroupedList header="باقي اللي اخترتيه">{calm.extra.map((it) => row(it, { muted: true }))}</InsetGroupedList>
      )}

      <motion.section className={styles.rest} {...fade(3)} aria-label="اللي يرتاح اليوم">
        <span className={styles.restIcon}>
          <Glyph name="moon" size={20} />
        </span>
        <p className={styles.restText}>
          {calm.rest.length > 0 && (
            <>
              {calm.rest.slice(0, kCalmRestPreview).map((r, i, a) => (
                <span key={r.id}>
                  <Bidi>{isolate(r.title.ar)}</Bidi>
                  {i < a.length - 1 ? '، ' : ''}
                </span>
              ))}
              {calm.rest.length > kCalmRestPreview ? ' وغيرها' : ''} ترتاح اليوم.{' '}
            </>
          )}
          يوم هادئ مو تراجع — ولا شي يرجع للصفر.
        </p>
      </motion.section>

      <button type="button" className={styles.help} onClick={() => navigate('/help')}>
        <Icon name="shield" size={18} />
        <span>إذا الأمور ثقيلة جدًا: المساعدة موجودة</span>
      </button>
    </Screen>
  )
}
