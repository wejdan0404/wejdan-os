import { Bidi } from '../../../components/Bidi'
import { Button } from '../../../components/Button'
import type { ExperimentReadout } from '../../../../domain'
import styles from './review.module.css'

/**
 * Before / after for one experiment (shared by the weekly review and Insights).
 * Honest by construction: «إشارة، مو دليل». Decision buttons only once its days are over.
 */
export function ExperimentResultCard({
  readout,
  busy,
  onDecide,
  flat,
}: {
  readout: ExperimentReadout
  busy?: boolean
  onDecide?: (keep: boolean) => void
  /** Already inside a card (Insights): no second frame. */
  flat?: boolean
}) {
  const { experiment: e, result, ready, dayNumber, enoughData } = readout
  const col = (label: string, w: { planned: number; done: number; meanEnjoyment: number | null } | undefined) => (
    <div className={styles.expCol}>
      <span className={styles.expLabel}>{label}</span>
      <span className={styles.expBig}>
        <bdi dir="ltr" className="num">{w ? w.done : 0}</bdi> <span className={styles.expOf}>من</span> <bdi dir="ltr" className="num">{w ? w.planned : 0}</bdi>
      </span>
      <span className={styles.expSub}>أيام سجّلتيها</span>
      <span className={styles.expBig}>
        {w?.meanEnjoyment != null ? <bdi dir="ltr" className="num">{w.meanEnjoyment.toFixed(1)}</bdi> : <span className={styles.expOf}>—</span>}
      </span>
      <span className={styles.expSub}>{w?.meanEnjoyment != null ? 'المتعة من 5' : 'ما سجّلتي متعة'}</span>
    </div>
  )
  return (
    <section className={styles.expCard} data-flat={flat || undefined} aria-label="نتيجة التجربة">
      <h3 className={styles.expTitle}>
        <Bidi>{e.titleAr}</Bidi>
      </h3>
      {enoughData ? (
        <div className={styles.expGrid}>
          {col('قبل', result?.before)}
          {col('بعد', result?.after)}
        </div>
      ) : (
        <p className={styles.expNote}>لسا ما كفت الأيام عشان نقارن. كمّلي التسجيل وتكمل الصورة.</p>
      )}
      {!ready ? (
        <p className={styles.expNote}>
          اليوم <bdi dir="ltr" className="num">{dayNumber}</bdi> من <bdi dir="ltr" className="num">{e.lengthDays}</bdi> — القرار بعد ما تخلص الأيام.
        </p>
      ) : (
        <>
          <p className={styles.expNote}>تجربة شخصية قصيرة، إشارة مو دليل. أغلب المحفزات يخف أثرها مع الوقت، فنعيد القياس بعد شهر.</p>
          {onDecide && (
            <div className={styles.expActions}>
              <Button onClick={() => onDecide(true)} disabled={busy}>أثبّتها</Button>
              <Button variant="secondary" onClick={() => onDecide(false)} disabled={busy}>أرجّع القديم</Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
