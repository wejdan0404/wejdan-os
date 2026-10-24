import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ROAD_CONFIRM_STAGE_ID, addRoadStage, addRoadStep, projectNextStep, removeRoadStage, removeRoadStep, renameRoadStage,
  roadProgress, safeLink, updateRoadStep, type RoadStage, type RoadStep,
} from '../../../../domain'
import { Bidi } from '../../../components/Bidi'
import { Button } from '../../../components/Button'
import { CheckCircle } from '../../../components/CheckCircle'
import { Chip } from '../../../components/Chip'
import { ListRow } from '../../../components/ListRow'
import { InsetGroupedList } from '../../../components/InsetGroupedList'
import { Sheet } from '../../../components/Sheet'
import { Switch } from '../../../components/Switch'
import { useLife, useStore } from '../../../state/LifeStore'
import { SectionHead } from '../pathKit'
import { useDo, useIeltsDriving } from './fKit'
import pathStyles from '../Path.module.css'
import styles from './PathF.module.css'

type StepEdit = { stage: RoadStage; step: RoadStep | null } | null

/** «طريق الرخصة»: the official path is confirmed by her; the app invents no procedure. */
export function RoadSection() {
  const s = useLife()
  const store = useStore()
  const run = useDo()
  const navigate = useNavigate()
  const d = useIeltsDriving()
  const p = roadProgress(d.road)
  const [stepEdit, setStepEdit] = useState<StepEdit>(null)
  const [stageSheet, setStageSheet] = useState<RoadStage | 'new' | null>(null)
  const licence = s.projects.find((x) => x.domain === 'driving' && x.status !== 'archived') ?? null
  const licenceNext = licence ? projectNextStep(licence) : null

  const toggle = (st: RoadStage, x: RoadStep, done: boolean) => void run(updateRoadStep(store, st.id, x.id, { done }), done ? 'علّمنا الخطوة' : 'رجّعنا الخطوة')

  return (
    <>
      <SectionHead title="طريق الرخصة" />
      <section className={styles.card} aria-label="طريق الرخصة">
        <p className={styles.cardSub}>
          {p.total > 0 ? `المرحلة ${p.current} من ${p.total} · خطوة وحدة في كل مرة` : 'ما فيه مراحل — أضيفي مرحلة'}
        </p>
        {d.road.map((st, i) => {
          const current = i + 1 === p.current && !p.allDone
          const doneAll = st.steps.length > 0 && st.steps.every((x) => x.done)
          return (
            <div key={st.id} className={styles.stage} role="group" aria-label={st.title}>
              <div className={styles.stageHead}>
                <span className={styles.stageNum} data-idle={!current && !doneAll ? true : undefined} aria-hidden="true">
                  <bdi>{i + 1}</bdi>
                </span>
                <h3 className={styles.stageTitle}>
                  <Bidi>{st.title}</Bidi>
                </h3>
                {st.id !== ROAD_CONFIRM_STAGE_ID && (
                  <button type="button" className={styles.iconBtn} aria-label={`تعديل المرحلة ${st.title}`} onClick={() => setStageSheet(st)}>
                    <Pencil />
                  </button>
                )}
              </div>
              {st.id === ROAD_CONFIRM_STAGE_ID && i === 0 && (
                <p className={styles.callout}>الخطوات وعدد الساعات والرسوم نأخذها من المصدر الرسمي ومدرسة القيادة — ما نكتبها من عندنا.</p>
              )}
              <ul className={styles.steps}>
                {st.steps.map((x) => (
                  <li key={x.id} className={styles.step}>
                    <CheckCircle checked={x.done} onChange={(v) => toggle(st, x, v)} label={x.title} size={28} />
                    <button type="button" className={styles.stepBody} onClick={() => setStepEdit({ stage: st, step: x })} aria-label={`تعديل: ${x.title}`}>
                      <span className={styles.stepTitle} data-done={x.done || undefined}>
                        <Bidi>{x.title}</Bidi>
                      </span>
                      {x.note && (
                        <span className={styles.stepNote}>
                          <Bidi>{x.note}</Bidi>
                        </span>
                      )}
                      {x.kind === 'official' && (
                        <span className={styles.chips}>
                          {x.verified ? (
                            <Chip tone="success" icon={undefined}>مؤكدة من المصدر</Chip>
                          ) : (
                            <Chip tone="neutral">ما تأكدت من المصدر</Chip>
                          )}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {st.steps.filter((x) => x.link).map((x) => (
                <a key={x.id} className={styles.link} href={safeLink(x.link)} target="_blank" rel="noopener noreferrer" dir="ltr">
                  {hostOf(x.link)}
                </a>
              ))}
              <div className={styles.actions}>
                <Button variant="plain" onClick={() => setStepEdit({ stage: st, step: null })}>
                  أضيفي خطوة
                </Button>
              </div>
            </div>
          )
        })}
        {d.road.length <= 1 && <p className={styles.cardSub}>باقي المراحل نضيفها لما نتأكد من المصدر.</p>}
        {p.unverified > 0 && <p className={styles.cardSub}>عندك {p.unverified} {p.unverified === 1 ? 'خطوة' : 'خطوات'} كتبتيها وما علّمتيها «مؤكدة» بعد.</p>}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => setStageSheet('new')}>
            أضيفي مرحلة
          </Button>
        </div>
      </section>

      {licence && (
        <InsetGroupedList header="مشروع الرخصة في مساري">
          <ListRow
            title={<Bidi>{licence.titleAr}</Bidi>}
            subtitle={licenceNext ? <>الجاية: <Bidi>{licenceNext.titleAr}</Bidi></> : 'خلّصتي كل الخطوات'}
            chevron
            onClick={() => navigate(`/path/project/${licence.id}`)}
          />
        </InsetGroupedList>
      )}

      <StepSheet edit={stepEdit} onClose={() => setStepEdit(null)} />
      <StageSheet stage={stageSheet} onClose={() => setStageSheet(null)} />
    </>
  )
}

const hostOf = (link: string): string => {
  try {
    return new URL(link).host
  } catch {
    return link
  }
}

function Pencil() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    </svg>
  )
}

function StepSheet({ edit, onClose }: { edit: StepEdit; onClose: () => void }) {
  const store = useStore()
  const run = useDo()
  const [key, setKey] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [link, setLink] = useState('')
  const [verified, setVerified] = useState(false)
  const k = edit ? `${edit.stage.id}:${edit.step?.id ?? 'new'}` : null
  if (k !== key) {
    setKey(k)
    setTitle(edit?.step?.title ?? '')
    setNote(edit?.step?.note ?? '')
    setLink(edit?.step?.link ?? '')
    setVerified(edit?.step?.verified ?? false)
  }
  const step = edit?.step ?? null
  const official = !step || step.kind === 'official'
  const linkBad = link.trim() !== '' && safeLink(link) === ''
  const save = async () => {
    if (!edit || !title.trim() || linkBad) return
    const ok = step
      ? await run(updateRoadStep(store, edit.stage.id, step.id, { title, note, link, verified }), 'انحفظت الخطوة')
      : await run(addRoadStep(store, edit.stage.id, { title, note, link, verified }), 'انضافت الخطوة')
    if (ok) onClose()
  }
  const del = async () => {
    if (!edit || !step) return
    await run(removeRoadStep(store, edit.stage.id, step.id), 'انحذفت الخطوة')
    onClose()
  }
  return (
    <Sheet open={edit != null} onClose={onClose} title={step ? 'عدّلي الخطوة' : 'خطوة جديدة'} detents={['large']}>
      <form className={pathStyles.form} onSubmit={(e) => { e.preventDefault(); void save() }}>
        <label className={pathStyles.field}>
          <span className={pathStyles.label}>الخطوة</span>
          <input className={pathStyles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="بكلماتك، من المصدر الرسمي" autoFocus />
        </label>
        <label className={pathStyles.field}>
          <span className={pathStyles.label}>ملاحظة (اختياري)</span>
          <textarea className={pathStyles.textarea} value={note} onChange={(e) => setNote(e.target.value)} placeholder="الرسوم، الساعات، أو أي تفصيل كما يظهر في المصدر" />
        </label>
        <label className={pathStyles.field}>
          <span className={pathStyles.label}>رابط المصدر (اختياري)</span>
          <input className={pathStyles.input} dir="ltr" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" aria-invalid={linkBad ? true : undefined} />
        </label>
        {linkBad && <p className={pathStyles.fieldError} role="alert">الرابط لازم يبدأ بـ https:// أو http://</p>}
        {official && (
          <div className={pathStyles.toggle}>
            <span>تأكدت من المصدر الرسمي</span>
            <Switch label="تأكدت من المصدر الرسمي" checked={verified} onChange={setVerified} />
          </div>
        )}
        {official && <p className={pathStyles.hint}>لين تأكدين، تبقى الخطوة معلّمة «ما تأكدت من المصدر».</p>}
        <Button type="submit" size="large" block disabled={!title.trim() || linkBad}>احفظي</Button>
        {step && <Button variant="plain" block onClick={() => void del()}>احذفي الخطوة</Button>}
      </form>
    </Sheet>
  )
}

function StageSheet({ stage, onClose }: { stage: RoadStage | 'new' | null; onClose: () => void }) {
  const store = useStore()
  const run = useDo()
  const [key, setKey] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const edit = stage && stage !== 'new' ? stage : null
  const k = stage == null ? null : edit ? edit.id : 'new'
  if (k !== key) {
    setKey(k)
    setTitle(edit?.title ?? '')
  }
  const save = async () => {
    if (!title.trim()) return
    const ok = edit ? await run(renameRoadStage(store, edit.id, title), 'انحفظت المرحلة') : await run(addRoadStage(store, title), 'انضافت المرحلة')
    if (ok) onClose()
  }
  const del = async () => {
    if (!edit) return
    await run(removeRoadStage(store, edit.id), 'انحذفت المرحلة')
    onClose()
  }
  return (
    <Sheet open={stage != null} onClose={onClose} title={edit ? 'عدّلي المرحلة' : 'مرحلة جديدة'} detents={['medium', 'large']}>
      <form className={pathStyles.form} onSubmit={(e) => { e.preventDefault(); void save() }}>
        <label className={pathStyles.field}>
          <span className={pathStyles.label}>اسم المرحلة</span>
          <input className={pathStyles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="من المصدر الرسمي" autoFocus />
        </label>
        <p className={pathStyles.hint}>سمّيها زي ما تظهر في المصدر الرسمي — وبعدها أضيفي خطواتها.</p>
        <Button type="submit" size="large" block disabled={!title.trim()}>احفظي</Button>
        {edit && <Button variant="plain" block onClick={() => void del()}>احذفي المرحلة وخطواتها</Button>}
      </form>
    </Sheet>
  )
}
