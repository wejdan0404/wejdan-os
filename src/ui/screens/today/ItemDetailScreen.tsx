import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { evidenceUrl, isNotApplicable, snapshotAction, type CompletionLevel } from '../../../domain'
import { Bidi, MetaLine } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { SegmentedControl } from '../../components/SegmentedControl'
import { StarMark } from '../../components/StarMark'
import { Icon } from '../../icons/Icon'
import { springs } from '../../motion'
import { useStack } from '../../shell/stack'
import { Glyph } from './Glyph'
import { DOMAIN_LABEL, LEVEL_LABEL, clock, domainGlyph, findItem, isolate, metaParts } from './lib'
import styles from './ItemDetail.module.css'
import { useTodayModel } from './useTodayModel'

type Level = Exclude<CompletionLevel, 'skipped'>

/** Evidence kinds in words she reads (no raw «URL»/«DOI»). */
const SOURCE_KIND: Record<string, string> = { PMID: 'بحث منشور', DOI: 'بحث محكّم', URL: 'صفحة رسمية' }
const LEVELS: { value: Level; label: string }[] = [
  { value: 'minimum', label: LEVEL_LABEL.minimum },
  { value: 'normal', label: LEVEL_LABEL.normal },
  { value: 'bonus', label: LEVEL_LABEL.bonus },
]

/** «ليش اليوم؟» — the item's reason, its evidence, how big today, and what she can do with it. */
export default function ItemDetailScreen() {
  const navigate = useNavigate()
  const stack = useStack()
  const reduce = useReducedMotion()
  const id = decodeURIComponent(useLocation().pathname.split('/').pop() ?? '')
  const { s, store, view, isDone, isSkipped, logOf, actions } = useTodayModel()
  const found = findItem(view, id)
  const [localLevel, setLocalLevel] = useState<Level | null>(null)

  if (!found) {
    return (
      <Screen title="التفاصيل" backLabel="اليوم" inlineTitle>
        <EmptyState title="ما لقينا هالخطوة" body="يمكن انشالت من يومك أو تغيّر اليوم. ارجعي لليوم وشوفي اللي عندك." />
      </Screen>
    )
  }

  const { item, where } = found
  const done = isDone(item)
  const skipped = isSkipped(item)
  const level: Level = localLevel ?? (item.suggestedLevel === 'skipped' ? 'normal' : item.suggestedLevel)
  const fallback: Record<Level, string> = {
    minimum: 'النسخة الصغيرة — تنحسب لك كاملة',
    normal: 'زي العادة',
    bonus: 'لو عندك حماس زيادة اليوم',
  }
  const levelText = ({ minimum: item.minimumText, normal: item.normalText, bonus: item.bonusText }[level] || '').trim() || fallback[level]
  const action = item.actionId ? snapshotAction(s, item.actionId) : null
  const what = action ? (action.ar?.what ?? action.what) : null
  const dose = action ? (action.ar?.dose ?? action.dose) : null
  const why = action ? (action.ar?.why ?? action.why) : null
  const sources = action?.sources ?? []
  const back = () => (stack ? stack.goBack() : navigate(-1))

  const setLevel = (l: Level) => {
    setLocalLevel(l)
    if (where === 'plan') void store.setPlannedLevel(item.id, l)
  }

  return (
    <Screen title={isolate(item.title.ar)} backLabel="اليوم" subtitle={<MetaLine parts={[DOMAIN_LABEL[item.domain] ?? null, item.startMinute != null ? clock(item.startMinute) : null, ...metaParts(item).slice(1)]} />}>
      <motion.section
        layoutId={`item-${item.id}`}
        transition={springs.smooth}
        className={styles.reason}
        aria-label="ليش اليوم؟"
      >
        <span className={styles.eyebrow}>
          <Glyph name={domainGlyph(item.domain)} size={16} /> ليش اليوم؟
        </span>
        <p className={styles.reasonText}>
          <Bidi>{item.why.text.ar}</Bidi>
        </p>
        {item.extraWhy.map((w, i) => (
          <p key={i} className={styles.reasonExtra}>
            <Bidi>{w.text.ar}</Bidi>
          </p>
        ))}
        {done && (
          <motion.span className={styles.doneTag} initial={reduce ? false : { scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springs.pop}>
            <StarMark size={12} color="var(--action-default)" /> خلصت ومسجّلة
          </motion.span>
        )}
        {skipped && <span className={styles.doneTag}>تخطّيتيها اليوم — عادي</span>}
      </motion.section>

      {!done && !skipped && item.kind !== 'task' && (
        <InsetGroupedList header="قد إيش اليوم؟" footer="أي نسخة تنحسب لك. الصغيرة تكفي في الأيام الثقيلة.">
          <div className={styles.levelBox} role="listitem">
            <SegmentedControl label="حجم الخطوة" segments={LEVELS} value={level} onChange={setLevel} />
            {levelText && !isNotApplicable(levelText) && (
              <p className={styles.levelText}>
                <Bidi>{levelText}</Bidi>
              </p>
            )}
          </div>
        </InsetGroupedList>
      )}

      {(what || dose || sources.length > 0) && (
        <InsetGroupedList header="الدليل">
          {what && !isNotApplicable(what) && <ListRow title={<span className={styles.long}><Bidi>{what}</Bidi></span>} />}
          {dose && !isNotApplicable(dose) && <ListRow title="كم يكفي؟" subtitle={<span className={styles.long}><Bidi>{dose}</Bidi></span>} />}
          {why && !isNotApplicable(why) && <ListRow title="ليش تنفع" subtitle={<span className={styles.long}><Bidi>{why}</Bidi></span>} />}
          {sources.map((src) => (
            <ListRow
              key={`${src.type}-${src.id}`}
              leading={<StarMark size={12} color="var(--action-default)" label="مصدر متحقق منه" />}
              title={
                <bdi dir="ltr" className={styles.source}>
                  {src.title || src.id}
                </bdi>
              }
              subtitle={<MetaLine parts={[SOURCE_KIND[src.type] ?? 'مصدر', src.year != null ? String(src.year) : null]} />}
              chevron
              onClick={() => window.open(evidenceUrl(src), '_blank', 'noopener,noreferrer')}
            />
          ))}
        </InsetGroupedList>
      )}

      {item.kind === 'habit' && (
        <InsetGroupedList>
          <ListRow
            leading={
              <span className={styles.accent}>
                <Icon name="habits" size={20} />
              </span>
            }
            title="تعثّرت فيها؟"
            subtitle="نعدّل الخطة سوا — مو نلومك"
            chevron
            onClick={() => navigate(`/habits/${encodeURIComponent(item.itemId)}?recover=1`)}
          />
        </InsetGroupedList>
      )}

      <div className={styles.actions}>
        {where === 'suggestion' && (
          <Button
            block
            size="large"
            onClick={() => {
              void actions.accept(item, level).then(back)
            }}
          >
            + أضيفيها ليومك
          </Button>
        )}
        {where === 'later' && (
          <Button block size="large" onClick={() => void actions.restore(item).then(back)}>
            رجّعيها لليوم
          </Button>
        )}
        {where === 'plan' && !done && !skipped && (
          <>
            <Button block size="large" onClick={() => void actions.complete(item, level).then(back)}>
              خلّصتها
            </Button>
            <div className={styles.row2}>
              {item.estimatedMin >= 5 && (
                <Button variant="secondary" block onClick={() => navigate(`/focus/${encodeURIComponent(item.id)}`)}>
                  جلسة تركيز
                </Button>
              )}
              <Button variant="secondary" block onClick={() => void actions.later(item).then(back)}>
                بعدين
              </Button>
            </div>
            <Button variant="plain" block onClick={() => void actions.skip(item).then(back)}>
              تخطّيها اليوم
            </Button>
          </>
        )}
        {where === 'plan' && (done || skipped) && logOf(item) && (
          <Button variant="secondary" block onClick={() => actions.uncomplete(item)}>
            {done ? 'ما خلصت؟ رجّعيها' : 'رجّعيها ليومك'}
          </Button>
        )}
      </div>
    </Screen>
  )
}
