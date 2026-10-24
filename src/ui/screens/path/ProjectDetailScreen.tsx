import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  dayKey,
  makeProjectStep,
  projectNextStep,
  tasksOfProject,
  PROJECT_STATUSES,
  type DomainId,
  type Project,
  type ProjectStatus,
  type ProjectStep,
  type TaskItem,
} from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { CheckCircle } from '../../components/CheckCircle'
import { Chip } from '../../components/Chip'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { ProgressArc } from '../../components/ProgressArc'
import { Screen } from '../../components/Screen'
import { Sheet } from '../../components/Sheet'
import { StarDottedLine } from '../../components/StarDottedLine'
import { useToast } from '../../components/Toast'
import { useStack } from '../../shell/stack'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import { capacityMessage, dayLabel, domainName, parseLocaleNumber, STATUS_AR, stepTaskOn, useRouteTail } from './pathKit'
import styles from './Path.module.css'
import { LinkedNotes } from '../notes/LinkedNotes'

const PICKABLE: ProjectStatus[] = PROJECT_STATUSES.filter((s) => s !== 'archived')
const PROJECT_DOMAINS: DomainId[] = ['career', 'learning', 'ielts', 'driving', 'money', 'home', 'admin', 'digital', 'health', 'people', 'joy']

const TASK_STATUS_AR: Record<TaskItem['status'], string> = {
  inbox: 'بالوارد',
  planned: 'مخططة',
  in_progress: 'شغّالة عليها',
  done: 'خلصت',
  postponed: 'بعدين',
  cancelled: 'ملغاة',
}

/** Notes autosave this long after she stops typing (QA area 3 #10). */
const NOTES_DEBOUNCE_MS = 600

export default function ProjectDetailScreen() {
  const id = useRouteTail()
  const s = useLife()
  const store = useStore()
  const today = useToday()
  const toast = useToast()
  const stack = useStack()
  const navigate = useNavigate()
  const p = s.projects.find((x) => x.id === id) ?? null

  const [notes, setNotes] = useState(p?.notes ?? '')
  const [newStep, setNewStep] = useState('')
  const [armed, setArmed] = useState(false)
  const [editStep, setEditStep] = useState<ProjectStep | null>(null)
  const [putting, setPutting] = useState(false)
  useEffect(() => setNotes(p?.notes ?? ''), [p?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), 4000)
    return () => window.clearTimeout(t)
  }, [armed])

  // ---- notes autosave: debounced while typing, flushed on leave / app hide -----------
  const pendingNotes = useRef<string | null>(null)
  const flushNotes = useRef<() => void>(() => {})
  flushNotes.current = () => {
    const v = pendingNotes.current
    if (v == null || !p) return
    pendingNotes.current = null
    if ((s.projects.find((x) => x.id === p.id)?.notes ?? '') !== v) void store.patchProject(p.id, { notes: v })
  }
  useEffect(() => {
    if (pendingNotes.current == null) return
    const t = window.setTimeout(() => flushNotes.current(), NOTES_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [notes])
  useEffect(() => {
    const onHide = () => flushNotes.current()
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
      flushNotes.current()
    }
  }, [])

  if (!p) {
    return (
      <Screen title="المشروع" backLabel="مساري" inlineTitle>
        <EmptyState title="ما لقينا المشروع" body="يمكن انحذف أو انتقل. ارجعي لمساري وشوفي القائمة." />
      </Screen>
    )
  }

  const save = async (next: Project, force = false): Promise<boolean> => {
    const v = await store.upsertProject(next, force)
    if (v.length > 0) {
      toast({ message: capacityMessage(v), actionLabel: 'فعّليه', onAction: () => void store.upsertProject(next, true) })
      return false
    }
    return true
  }

  const setStatus = async (st: ProjectStatus) => {
    if (st === p.status) return
    const prev = p.status
    if (await save({ ...p, status: st })) {
      // Undo patches only the status of the project as it is THEN (QA area 3 #5).
      toast({ message: `صار «${STATUS_AR[st]}»`, actionLabel: 'تراجع', onAction: () => void store.patchProject(p.id, { status: prev }) })
    }
  }

  // Step ↔ «حطيها لليوم» task stay in sync (QA area 3 #3).
  const toggleStep = (stepId: string, doneNow: boolean) => void store.markProjectStep(p.id, stepId, doneNow)

  const moveStep = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= p.steps.length) return
    const steps = [...p.steps]
    ;[steps[i], steps[j]] = [steps[j]!, steps[i]!]
    void store.patchProject(p.id, { steps })
  }

  const removeStep = async (stepId: string) => {
    const tok = await store.deleteProjectStep(p.id, stepId)
    if (tok) toast({ message: 'انحذفت الخطوة', actionLabel: 'تراجع', onAction: () => void store.undoDelete(tok.token) })
  }

  const addStep = () => {
    const t = newStep.trim()
    if (!t) return
    void store.patchProject(p.id, { steps: [...p.steps, makeProjectStep({ id: store.newId('stp'), titleAr: t, titleEn: t })] })
    setNewStep('')
  }

  const setDue = (v: string) => void store.patchProject(p.id, { dueDate: v || null })
  const setDomain = (d: DomainId) => void store.patchProject(p.id, { domain: d })

  const next = projectNextStep(p)
  const onToday = next ? stepTaskOn(s.tasks, p, next, dayKey(today)) : undefined
  const putToday = async () => {
    if (!next || putting) return
    if (onToday) {
      toast({ message: 'موجودة بيومك من قبل' })
      return
    }
    setPutting(true)
    try {
      const r = await store.planProjectStep(p.id, next.id, dayKey(today))
      if (!r) return
      toast(r.created ? { message: 'انضافت ليومك', actionLabel: 'تراجع', onAction: () => void store.deleteTask(r.task.id) } : { message: 'موجودة بيومك من قبل' })
    } finally {
      setPutting(false)
    }
  }

  const tasks = tasksOfProject(s, p.id).filter((t) => t.status !== 'cancelled')
  const doneCount = p.steps.filter((x) => x.done).length

  const remove = async () => {
    if (!armed) {
      setArmed(true)
      return
    }
    const token = await store.deleteProject(p.id)
    stack?.goBack()
    if (token) toast({ message: `انحذف «${p.titleAr}»`, actionLabel: 'تراجع', onAction: () => void store.undoDelete(token.token) })
  }

  return (
    <Screen title={p.titleAr} backLabel="مساري" subtitle={domainName(p.domain)}>
      <div className={styles.stack}>
        {/* Toggle buttons (aria-pressed) in a labelled group — valid semantics (QA area 3 #18). */}
        <div className={styles.chips} role="group" aria-label="حالة المشروع">
          {PICKABLE.map((st) => (
            <Chip key={st} tone={st === p.status ? 'accent' : 'neutral'} selected={st === p.status} onClick={() => void setStatus(st)}>
              {STATUS_AR[st]}
            </Chip>
          ))}
        </div>

        <section className={styles.hero} aria-label="الخطوة الجاية">
          <span className={styles.nextLabel}>الخطوة الجاية</span>
          <h2 className={styles.heroTitle}>{next ? <Bidi>{next.titleAr}</Bidi> : p.steps.length ? 'خلّصتي كل الخطوات' : 'أضيفي أول خطوة تحت'}</h2>
          {p.steps.length > 0 && <StarDottedLine total={Math.min(p.steps.length, 12)} done={Math.min(doneCount, 12)} label={`خلّصتي ${doneCount} من ${p.steps.length}`} />}
          {next && (
            <div className={styles.actions}>
              {onToday ? (
                <Button variant="secondary" onClick={() => navigate('/today')} aria-label="الخطوة على يومك — افتحي اليوم">
                  على يومك ✓
                </Button>
              ) : (
                <Button onClick={() => void putToday()} disabled={putting}>
                  حطيها لليوم
                </Button>
              )}
              <Button variant="secondary" onClick={() => toggleStep(next.id, true)}>
                خلّصتها
              </Button>
            </div>
          )}
        </section>

        <InsetGroupedList header="الخطوات" footer={p.steps.length > 1 ? 'رتّبي بالأسهم، أو اضغطي مطوّل على الخطوة.' : undefined}>
          {p.steps.map((st, i) => (
            <ListRow
              key={st.id}
              leading={<CheckCircle checked={st.done} onChange={(v) => toggleStep(st.id, v)} label={`خطوة: ${st.titleAr}`} size={24} />}
              title={<Bidi>{st.titleAr}</Bidi>}
              subtitle={st.done && st.doneDate ? `خلصت ${dayLabel(st.doneDate)}` : <Bidi>{`${st.durationMin} د`}</Bidi>}
              muted={st.done}
              trailing={
                <span className={styles.stepActions}>
                  <button type="button" className={styles.iconBtn} aria-label={`طلّعي «${st.titleAr}» فوق`} disabled={i === 0} onClick={() => moveStep(i, -1)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6" /></svg>
                  </button>
                  <button type="button" className={styles.iconBtn} aria-label={`نزّلي «${st.titleAr}» تحت`} disabled={i === p.steps.length - 1} onClick={() => moveStep(i, 1)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                </span>
              }
              trailingActions={[{ key: 'del', label: 'احذفي', tone: 'destructive', onAction: () => void removeStep(st.id) }]}
              menu={[
                { key: 'edit', label: 'عدّليها', onSelect: () => setEditStep(st) },
                { key: 'up', label: 'طلّعيها فوق', onSelect: () => moveStep(i, -1) },
                { key: 'down', label: 'نزّليها تحت', onSelect: () => moveStep(i, 1) },
                { key: 'del', label: 'احذفي الخطوة', destructive: true, onSelect: () => void removeStep(st.id) },
              ]}
            />
          ))}
          {/* the add-step field is one more row of the list (valid list semantics for VoiceOver) */}
          <div role="listitem">
          <form
            className={styles.addRow}
            onSubmit={(e) => {
              e.preventDefault()
              addStep()
            }}
          >
            <input className={styles.input} value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="خطوة جديدة…" aria-label="خطوة جديدة" />
            <Button type="submit" variant="secondary" disabled={!newStep.trim()}>
              أضيفي
            </Button>
          </form>
          </div>
        </InsetGroupedList>

        <InsetGroupedList header="التفاصيل" asList={false}>
          <div className={styles.cardBody} style={{ paddingBlockStart: 'var(--space-4)' }}>
            <label className={styles.field}>
              <span className={styles.label}>المجال</span>
              <select className={styles.select} value={p.domain} onChange={(e) => setDomain(e.target.value as DomainId)}>
                {(PROJECT_DOMAINS.includes(p.domain) ? PROJECT_DOMAINS : [p.domain, ...PROJECT_DOMAINS]).map((d) => (
                  <option key={d} value={d}>
                    {domainName(d)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>الموعد (اختياري)</span>
              <input type="date" className={styles.input} value={p.dueDate ?? ''} onChange={(e) => setDue(e.target.value)} dir="ltr" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>ملاحظات</span>
              <textarea
                className={styles.textarea}
                value={notes}
                onChange={(e) => {
                  pendingNotes.current = e.target.value
                  setNotes(e.target.value)
                }}
                onBlur={() => flushNotes.current()}
                placeholder="أي شي تبين تتذكرينه عن المشروع"
              />
            </label>
          </div>
        </InsetGroupedList>

        {tasks.length > 0 && (
          <InsetGroupedList header="مهام المشروع">
            {tasks.map((t) => (
              <ListRow
                key={t.id}
                leading={
                  <CheckCircle
                    checked={t.status === 'done'}
                    size={24}
                    label={`مهمة: ${t.title}`}
                    onChange={(v) => {
                      if (v) {
                        const prev = t.status
                        void store.completeTask(t.id)
                        toast({ message: 'خلصت', actionLabel: 'تراجع', onAction: () => void store.updateTask(t.id, { status: prev, completedAt: null }) })
                      } else void store.updateTask(t.id, { status: 'planned', completedAt: null })
                    }}
                  />
                }
                title={<Bidi>{t.title}</Bidi>}
                subtitle={[TASK_STATUS_AR[t.status], t.dueDate ? dayLabel(t.dueDate) : null].filter(Boolean).join(' · ')}
                muted={t.status === 'done'}
              />
            ))}
          </InsetGroupedList>
        )}

        {p.steps.length > 0 && (
          <div className={styles.pad} style={{ display: 'flex', justifyContent: 'center' }}>
            <ProgressArc value={doneCount / p.steps.length} size={72} label={`التقدّم: ${doneCount} من ${p.steps.length}`} />
          </div>
        )}

        <LinkedNotes kind="project" id={p.id} />

        <div className={styles.danger}>
          <button type="button" className={styles.dangerBtn} data-armed={armed || undefined} onClick={() => void remove()}>
            {armed ? 'متأكدة؟ اضغطي مرة ثانية للحذف' : 'احذفي المشروع'}
          </button>
          {armed && <p className={styles.hint} style={{ textAlign: 'center' }}>تقدرين تتراجعين خلال ثواني بعد الحذف.</p>}
        </div>
      </div>

      <EditStepSheet project={p} step={editStep} onClose={() => setEditStep(null)} />
    </Screen>
  )
}

/** Edit a step's title and minutes (QA area 3 #20 — generic licence steps all said «30 د»). */
function EditStepSheet({ project, step, onClose }: { project: Project; step: ProjectStep | null; onClose: () => void }) {
  const store = useStore()
  const [key, setKey] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState('')
  if ((step?.id ?? null) !== key) {
    setKey(step?.id ?? null)
    setTitle(step?.titleAr ?? '')
    setMinutes(step ? String(step.durationMin) : '')
  }
  const m = parseLocaleNumber(minutes)
  const minutesOk = Number.isFinite(m) && m >= 1 && m <= 600
  const save = () => {
    if (!step || !title.trim() || !minutesOk) return
    const t = title.trim()
    void store.patchProject(project.id, {
      steps: (store.getSnapshot().projects.find((x) => x.id === project.id)?.steps ?? project.steps).map((x) =>
        x.id === step.id ? { ...x, titleAr: t, titleEn: x.titleEn === x.titleAr ? t : x.titleEn, durationMin: Math.round(m) } : x,
      ),
    })
    onClose()
  }
  return (
    <Sheet open={step != null} onClose={onClose} title="عدّلي الخطوة" detents={['medium', 'large']}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <label className={styles.field}>
          <span className={styles.label}>الخطوة</span>
          <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>كم دقيقة تقريبًا؟</span>
          <input className={`${styles.input} ${styles.num}`} inputMode="numeric" dir="ltr" value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-invalid={!minutesOk || undefined} />
          {!minutesOk && <p className={styles.fieldError}>اكتبي رقم بين 1 و600 دقيقة.</p>}
        </label>
        <Button type="submit" size="large" block disabled={!title.trim() || !minutesOk}>
          احفظي
        </Button>
      </form>
    </Sheet>
  )
}
