import { useState } from 'react'
import { addHazardItem, hazardWeekCount, logHazardWatch, removeHazardItem, safeLink, setHazardWeeklyGoal, startOfWeek, updateHazardItem, type HazardItem } from '../../../../domain'
import { Bidi } from '../../../components/Bidi'
import { Button } from '../../../components/Button'
import { Sheet } from '../../../components/Sheet'
import { StarDottedLine } from '../../../components/StarDottedLine'
import { useLife, useStore, useToday } from '../../../state/LifeStore'
import { SectionHead } from '../pathKit'
import { latinDigits, useDo, useIeltsDriving } from './fKit'
import pathStyles from '../Path.module.css'
import styles from './PathF.module.css'

/** «إدراك المخاطر» — a place for HER links and notes (no clips are bundled). */
export function HazardCard() {
  const s = useLife()
  const today = useToday()
  const d = useIeltsDriving()
  const store = useStore()
  const run = useDo()
  const [sheet, setSheet] = useState(false)
  const weekStart = startOfWeek(today, s.settings.weekStartsOn)
  const n = hazardWeekCount(d.hazardLog, weekStart)
  const goal = d.hazardWeeklyGoal
  const first = d.hazards[0] ?? null

  return (
    <>
      <SectionHead title="إدراك المخاطر" />
      <section className={styles.card} aria-label="إدراك المخاطر">
        <p className={styles.cardSub}>شوفي مقطع طريق من مصدر تثقين فيه، وسمّي الخطر بصوت قبل ما يظهر.</p>
        {d.hazards.length === 0 ? (
          <p className={styles.callout}>ما أضفتي شي للحين. أضيفي رابط أو ملاحظة من مصدر تثقين فيه — المقاطع نضيفها لما نتأكد من المصدر.</p>
        ) : (
          <>
            <p className={styles.cardSub}>{goal ? `هذا الأسبوع: ${n} من ${goal}` : `هذا الأسبوع: ${n}`}</p>
            {goal ? <StarDottedLine total={Math.min(goal, 14)} done={Math.min(n, goal)} label={`مشاهدات هالأسبوع: ${Math.min(n, goal)} من ${goal}`} /> : null}
          </>
        )}
        <div className={styles.actions}>
          {first && (
            <Button
              onClick={() => void run(logHazardWatch(store, first.id), 'انحسبت مشاهدة اليوم')}
              aria-label={`سجّلي مشاهدة: ${first.title || 'ملاحظتك'}`}
            >
              سجّلي مشاهدة
            </Button>
          )}
          <Button variant="secondary" onClick={() => setSheet(true)}>{d.hazards.length ? 'مقاطعك وملاحظاتك' : 'أضيفي رابط أو ملاحظة'}</Button>
        </div>
      </section>
      <HazardSheet open={sheet} onClose={() => setSheet(false)} />
    </>
  )
}

function HazardSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore()
  const run = useDo()
  const s = useLife()
  const today = useToday()
  const d = useIeltsDriving()
  const [editing, setEditing] = useState<HazardItem | 'new' | null>(null)
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')
  const [goalTxt, setGoalTxt] = useState('')
  const [k, setK] = useState<string | null>(null)
  const key = editing === null ? null : editing === 'new' ? 'new' : editing.id
  if (key !== k) {
    setK(key)
    setTitle(editing && editing !== 'new' ? editing.title : '')
    setLink(editing && editing !== 'new' ? editing.link : '')
    setNote(editing && editing !== 'new' ? editing.note : '')
  }
  const linkBad = link.trim() !== '' && safeLink(link) === ''
  const can = (title.trim() || link.trim() || note.trim()) && !linkBad
  const save = async () => {
    if (!can) return
    const inp = { title, link, note }
    const ok = editing && editing !== 'new' ? await run(updateHazardItem(store, editing.id, inp), 'انحفظ') : await run(addHazardItem(store, inp), 'انضاف')
    if (ok) setEditing(null)
  }
  const goalNum = latinDigits(goalTxt).trim() ? Number(latinDigits(goalTxt)) : null
  const weekCount = (id: string) => d.hazardLog.filter((w) => w.itemId === id && hazardWeekCount([w], startOfWeek(today, s.settings.weekStartsOn)) > 0).length

  return (
    <Sheet open={open} onClose={() => { setEditing(null); onClose() }} title={editing ? (editing === 'new' ? 'جديد' : 'عدّلي') : 'مقاطعك وملاحظاتك'} detents={['large']}>
      {editing ? (
        <form className={pathStyles.form} onSubmit={(e) => { e.preventDefault(); void save() }}>
          <label className={pathStyles.field}>
            <span className={pathStyles.label}>العنوان</span>
            <input className={pathStyles.input} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </label>
          <label className={pathStyles.field}>
            <span className={pathStyles.label}>الرابط (اختياري)</span>
            <input className={pathStyles.input} dir="ltr" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" aria-invalid={linkBad ? true : undefined} />
          </label>
          {linkBad && <p className={pathStyles.fieldError} role="alert">الرابط لازم يبدأ بـ https:// أو http://</p>}
          <label className={pathStyles.field}>
            <span className={pathStyles.label}>ملاحظة (اختياري)</span>
            <textarea className={pathStyles.textarea} value={note} onChange={(e) => setNote(e.target.value)} placeholder="وش تبين تلاحظين فيه؟" />
          </label>
          <Button type="submit" size="large" block disabled={!can}>احفظي</Button>
          <Button variant="plain" block onClick={() => setEditing(null)}>رجوع للقائمة</Button>
          {editing !== 'new' && <Button variant="plain" block onClick={() => { void run(removeHazardItem(store, editing.id), 'انحذف'); setEditing(null) }}>احذفي</Button>}
        </form>
      ) : (
        <div className={styles.sheetList}>
          <Button block onClick={() => setEditing('new')}>أضيفي رابط أو ملاحظة</Button>
          {d.hazards.length === 0 && <p className={styles.callout}>فاضي — أضيفي من مصدر تثقين فيه. المقاطع نضيفها لما نتأكد من المصدر.</p>}
          {d.hazards.map((h) => (
            <div key={h.id} className={styles.card} style={{ marginInline: 0 }}>
              <h3 className={styles.cardTitle}><Bidi>{h.title || h.link || h.note.slice(0, 40)}</Bidi></h3>
              {h.note && h.title && <p className={styles.cardSub}><Bidi>{h.note}</Bidi></p>}
              {h.link && <a className={styles.link} href={safeLink(h.link)} target="_blank" rel="noopener noreferrer" dir="ltr">{new URL(h.link).host}</a>}
              <p className={styles.cardSub}>مشاهدات هالأسبوع: <bdi>{weekCount(h.id)}</bdi></p>
              <div className={styles.actions}>
                <Button variant="secondary" onClick={() => void run(logHazardWatch(store, h.id), 'انحسبت مشاهدة اليوم')}>سجّلي مشاهدة</Button>
                <Button variant="plain" onClick={() => setEditing(h)}>عدّلي</Button>
              </div>
            </div>
          ))}
          <form className={pathStyles.form} onSubmit={(e) => { e.preventDefault(); void run(setHazardWeeklyGoal(store, goalNum && goalNum > 0 ? goalNum : null), goalNum ? 'انحفظ هدف الأسبوع' : 'شلنا هدف الأسبوع') }}>
            <label className={pathStyles.field}>
              <span className={pathStyles.label}>هدف الأسبوع (اختياري){d.hazardWeeklyGoal ? ` — الحالي ${d.hazardWeeklyGoal}` : ''}</span>
              <input className={`${pathStyles.input} ${pathStyles.num}`} inputMode="numeric" dir="ltr" value={goalTxt} onChange={(e) => setGoalTxt(e.target.value.replace(/[^0-9٠-٩]/g, ''))} placeholder="عدد المشاهدات" />
            </label>
            <Button type="submit" variant="secondary">احفظي الهدف</Button>
          </form>
        </div>
      )}
    </Sheet>
  )
}
