import { useState } from 'react'
import { recallQuestion } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { Icon } from '../../icons/Icon'
import styles from './FocusExtras.module.css'

/** «جرّبي أول ثم اسألي الذكاء الاصطناعي» — shown on study sessions. */
export function TryFirstTip() {
  return (
    <div className={styles.card}>
      <p className={styles.cardTitle}>جرّبي أول ثم اسألي الذكاء الاصطناعي</p>
      <p className={styles.cardBody}>اكتبي محاولتك ولو ناقصة — المحاولة قبل الجواب تثبّت الفهم.</p>
    </div>
  )
}

/**
 * The app cannot silence the phone (no Do Not Disturb control on the web), so this is an honest
 * reminder with her own confirmation, not a claim about the device.
 */
export function PhoneAway({ away, onChange }: { away: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={styles.card}>
      <p className={styles.cardTitle}>الجوال على جنب؟</p>
      <p className={styles.cardBody}>التطبيق ما يقدر يسكّت جوالك، فهذا تذكير: خلّيه صامت وبعيد عن إيدك.</p>
      <button type="button" className={styles.away} aria-pressed={away} onClick={() => onChange(!away)}>
        {away ? 'تمام، بعّدته' : 'بعّدته'}
      </button>
    </div>
  )
}

/** Appears only after she confirmed the phone is away. */
export function SilentPill() {
  return (
    <span className={styles.pill} role="status">
      <Icon name="bell" size={16} aria-hidden="true" />
      الإشعارات صامتة
    </span>
  )
}

/** Retrieval step after a study session: one question, optional answer, both exits complete the item. */
export function RecallStep({ title, minutes, busy, onSave, onSkip }: { title: string; minutes: number; busy: boolean; onSave: (answer: string) => void; onSkip: () => void }) {
  const [answer, setAnswer] = useState('')
  return (
    <div className={styles.recall}>
      <div>
        <p className={styles.minutes}>
          <bdi>{minutes}</bdi>
        </p>
        <p className={styles.minutesLabel}>دقيقة تركيز</p>
      </div>
      <p className={styles.cardTitle}>سؤال استرجاع سريع</p>
      <p className={styles.cardBody}>بدون ما تفتحين الملاحظات — الاسترجاع نفسه تمرين للذاكرة.</p>
      <p className={styles.question} id="recall-q">
        <Bidi>{recallQuestion(title)}</Bidi>
      </p>
      <textarea className={styles.answer} dir="auto" aria-labelledby="recall-q" value={answer} onChange={(e) => setAnswer(e.target.value)} />
      <p className={styles.cardBody}>بعدها قارني بملاحظاتك وشوفي وش فاتك.</p>
      <Button block size="large" disabled={busy} onClick={() => onSave(answer)}>
        حفظ وإنهاء
      </Button>
      <Button block variant="plain" disabled={busy} onClick={onSkip}>
        تخطّي السؤال
      </Button>
    </div>
  )
}
