import { Button } from './Button'
import { StarMark } from './StarMark'
import { countWords, NOUNS } from '../lib/plural'
import styles from './PaydayCard.module.css'

export interface PaydayCardProps {
  /** Days until payday; 0 = today. */
  daysLeft: number
  /** Her payday (day of month), shown in the body; omitted → a generic line. */
  paydayDay?: number
  onPlan?: () => void
}

/** Salary day: a calm card — one number at most. */
export function PaydayCard({ daysLeft, paydayDay, onPlan }: PaydayCardProps) {
  const today = daysLeft === 0
  return (
    <section className={styles.card} aria-labelledby="payday-title">
      <span className={styles.eyebrow}>
        {today && <StarMark size={10} color="var(--brand-primary)" />}
        يوم الراتب
      </span>
      <h2 id="payday-title" className={styles.title}>
        {today ? 'شهر جديد يبدأ اليوم' : daysLeft === 1 ? 'الراتب بكرة' : <>باقي {countWords(daysLeft, NOUNS.day)} على الراتب</>}
      </h2>
      <p className={styles.body}>
        {today ? (
          'دقيقتين نرتّب فيها الشهر: الفواتير، والادخار، واللي تبينه.'
        ) : paydayDay != null ? (
          <>
            الشهر يبدأ يوم <span className="num">{paydayDay}</span> — كل شي بعدها يمشي على راحتك.
          </>
        ) : (
          'الشهر يبدأ يوم الراتب — كل شي بعدها يمشي على راحتك.'
        )}
      </p>
      {today && onPlan && (
        <Button variant="secondary" onClick={onPlan}>
          رتّبي الشهر
        </Button>
      )}
    </section>
  )
}
