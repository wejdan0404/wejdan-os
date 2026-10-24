import type { CompletionLevel, PlanItem } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { SegmentedControl } from '../../components/SegmentedControl'
import { LEVEL_LABEL } from './lib'
import styles from './LevelStrip.module.css'

type Level = Exclude<CompletionLevel, 'skipped'>
const SEGMENTS = (['minimum', 'normal', 'bonus'] as const).map((value) => ({ value, label: LEVEL_LABEL[value] }))
const FALLBACK: Record<Level, string> = {
  minimum: 'النسخة الصغيرة — تنحسب لك كاملة',
  normal: 'زي العادة',
  bonus: 'لو عندك حماس زيادة اليوم',
}
export const levelOf = (it: PlanItem): Level => (it.suggestedLevel === 'skipped' ? 'normal' : it.suggestedLevel)
export const levelText = (it: PlanItem, l: Level): string =>
  ({ minimum: it.minimumText, normal: it.normalText, bonus: it.bonusText })[l].trim() || FALLBACK[l]

/** Collapsed level chip for a plan row (trailing slot) + the inline picker shown under the row. */
export function LevelChip({ level, open, onToggle }: { level: Level; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={styles.chip}
      aria-expanded={open}
      aria-label={`حجم الخطوة: ${LEVEL_LABEL[level]} — اضغطي للتغيير`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
    >
      {LEVEL_LABEL[level]}
    </button>
  )
}

export function LevelPicker({ item, onChange }: { item: PlanItem; onChange: (l: Level) => void }) {
  const level = levelOf(item)
  return (
    <div className={styles.picker}>
      <SegmentedControl label="حجم الخطوة" segments={SEGMENTS} value={level} onChange={onChange} />
      <p className={styles.text}>
        <Bidi>{levelText(item, level)}</Bidi>
      </p>
    </div>
  )
}
