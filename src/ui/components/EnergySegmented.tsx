import { SegmentedControl } from './SegmentedControl'
import styles from './EnergySegmented.module.css'

export type Energy = 'low' | 'medium' | 'good'

const SEGMENTS = [
  { value: 'low', label: 'قليلة' },
  { value: 'medium', label: 'متوسطة' },
  { value: 'good', label: 'زينة' },
] as const

/**
 * Inline energy check — a quiet control, not a card. `value={null}` until she answers:
 * nothing is pre-selected (QA #8), the label asks instead.
 */
export function EnergySegmented({ value, onChange }: { value: Energy | null; onChange: (v: Energy) => void }) {
  return (
    <div className={styles.row}>
      <span className={styles.label} id="energy-label">
        {value == null ? 'كيف طاقتك اليوم؟' : 'طاقتي اليوم'}
      </span>
      <div className={styles.control}>
        <SegmentedControl label="طاقتي اليوم" segments={SEGMENTS} value={value} onChange={onChange} commitOnArrow={false} />
      </div>
    </div>
  )
}
