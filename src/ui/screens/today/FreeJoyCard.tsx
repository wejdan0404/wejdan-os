import type { PlanItem } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { CheckCircle } from '../../components/CheckCircle'
import { Glyph } from './Glyph'
import styles from './DayReady.module.css'

/** The day's free joy — «لك بدون شروط». Checking it logs the joy; it never joins her plan by itself. */
export function FreeJoyCard({ item, done, onChange }: { item: PlanItem; done: boolean; onChange: (v: boolean) => void }) {
  return (
    <section className={styles.joy} aria-label="متعة حرة" data-done={done || undefined}>
      <span className={styles.joyIcon}>
        <Glyph name="heart" size={20} />
      </span>
      <div className={styles.joyText}>
        <span className={styles.joyKicker}>متعة حرة</span>
        <span className={styles.joyTitle}>
          <Bidi>{item.title.ar}</Bidi>
          {item.estimatedMin > 0 ? <> · <bdi>{item.estimatedMin}</bdi> د</> : null}
        </span>
        <span className={styles.joySub}>لك بدون شروط — ما تحتاجين تستحقينها</span>
      </div>
      <CheckCircle checked={done} onChange={onChange} label={`خلّصت: ${item.title.ar}`} />
    </section>
  )
}
