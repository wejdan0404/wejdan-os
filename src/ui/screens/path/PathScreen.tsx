import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import { useStableNavigate } from '../../shell/navigate'
import {
  currentSeason,
  dayKey,
  daysBetween,
  goalProgress,
  kMaxActiveProjects,
  makeProject,
  openInbox,
  parseDayKey,
  projectNextStep,
  projectProgress,
  type DomainId,
  type DomainState,
  type Goal,
  type Milestone,
  type Project,
} from '../../../domain'
import { Bidi, MetaLine } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { CheckCircle } from '../../components/CheckCircle'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { ProgressArc } from '../../components/ProgressArc'
import { SegmentedControl } from '../../components/SegmentedControl'
import { Screen } from '../../components/Screen'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { Icon } from '../../icons/Icon'
import { dur, ease } from '../../motion'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import { capacityMessage, dayLabel, domainName, ExpandCard, SectionHead, StarDivider, StatusTag, stepTaskOn } from './pathKit'
import { countLabel, NOUNS } from '../../lib/plural'
import styles from './Path.module.css'
import { WeekPriorities } from '../me/WeekPriorities'

const OPEN_STATUSES = new Set(['active', 'waiting', 'paused'])
const PROJECT_DOMAINS: DomainId[] = ['career', 'learning', 'ielts', 'driving', 'money', 'home', 'admin', 'digital', 'health', 'people', 'joy']

/** «الربع الأول · أكتوبر–ديسمبر» — calendar quarter of today. */
function quarterLine(d: Date): string {
  const q = Math.floor(d.getMonth() / 3)
  const names = ['الربع الأول', 'الربع الثاني', 'الربع الثالث', 'الربع الرابع']
  const m = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { month: 'long' })
  const a = m.format(new Date(d.getFullYear(), q * 3, 1))
  const b = m.format(new Date(d.getFullYear(), q * 3 + 2, 1))
  return `${names[q]} · ${a}–${b}`
}

export default function PathScreen() {
  const s = useLife()
  const store = useStore()
  const today = useToday()
  const toast = useToast()
  const navigate = useStableNavigate()
  const reduce = useReducedMotion()

  const season = currentSeason(s)
  const open = useMemo(
    () => s.projects.filter((p) => OPEN_STATUSES.has(p.status)).sort((a, b) => (a.status === 'active' ? -1 : 0) - (b.status === 'active' ? -1 : 0) || a.sortOrder - b.sortOrder),
    [s.projects],
  )
  const ideaProjects = s.projects.filter((p) => p.status === 'idea')
  const inboxIdeas = openInbox(s).filter((i) => i.kind === 'idea' || i.kind === 'potential_project')
  const done = s.projects.filter((p) => p.status === 'done')
  const goals = [...s.goals].sort((a, b) => a.sortOrder - b.sortOrder)
  const hasIelts = s.habits.some((h) => h.domain === 'ielts' && h.status !== 'archived')
  const hasDriving = s.weeklyTasks.some((w) => w.domain === 'driving' && w.active)

  const [expanded, setExpanded] = useState<string | null>(null)
  const expandedId = expanded ?? open[0]?.id ?? null
  const [adding, setAdding] = useState(false)
  const [seasonSheet, setSeasonSheet] = useState(false)
  const [domainsSheet, setDomainsSheet] = useState(false)
  const [goalSheet, setGoalSheet] = useState<Goal | 'new' | null>(null)
  // In-flight guard: a fast double tap on «حطيها لليوم» can't add two tasks (QA area 3 #3).
  const busy = useRef(new Set<string>())
  const [, bump] = useState(0)

  // season facts
  const grow = season ? (Object.entries(season.states) as [DomainId, string][]).filter(([, v]) => v === 'grow').map(([k]) => domainName(k)) : []
  const weekNo = season ? Math.max(1, Math.floor(daysBetween(parseDayKey(season.startDate), today) / 7) + 1) : 0
  const totalWeeks = season?.plannedEndDate ? Math.max(1, Math.ceil(daysBetween(parseDayKey(season.startDate), parseDayKey(season.plannedEndDate)) / 7)) : null
  const seasonPct = totalWeeks ? Math.min(1, weekNo / totalWeeks) : null

  const putToday = async (p: Project) => {
    const step = projectNextStep(p)
    if (!step || busy.current.has(p.id)) return
    busy.current.add(p.id)
    bump((n) => n + 1)
    try {
      const r = await store.planProjectStep(p.id, step.id, dayKey(today))
      if (!r) return
      if (!r.created) {
        toast({ message: 'موجودة بيومك من قبل' })
        return
      }
      toast({ message: 'انضافت ليومك', actionLabel: 'تراجع', onAction: () => void store.deleteTask(r.task.id) })
    } finally {
      busy.current.delete(p.id)
      bump((n) => n + 1)
    }
  }

  const ideaToProject = async (id: string) => {
    // An explicit «حوّليها لمشروع» makes a real project (active while there's room) — QA area 3 #13.
    const activeCount = s.projects.filter((p) => p.status === 'active').length
    const projectStatus = activeCount < kMaxActiveProjects ? 'active' : 'waiting'
    const { result: p, undo } = await store.convertInboxWithUndo(id, 'project', { projectStatus })
    const pid = p && 'id' in p ? p.id : null
    const message = projectStatus === 'active' ? 'صارت مشروع نشط — اختاري مجاله من «التفاصيل»' : 'صارت مشروع «منتظر» — عندك مشاريع نشطة كفاية'
    toast(
      undo
        ? {
            message,
            actionLabel: 'تراجع',
            onAction: () => {
              void store.undoDelete(undo.token)
              // Don't leave her on «ما لقينا المشروع» (QA area 3 #12).
              if (pid && window.location.hash.includes(pid)) navigate('/path')
            },
          }
        : { message },
    )
    if (pid) navigate(`/path/project/${pid}`)
  }

  const archiveIdea = async (id: string) => {
    await store.archiveInbox(id)
    toast({ message: 'انأرشفت', actionLabel: 'تراجع', onAction: () => void store.updateInbox(id, { archived: false }) })
  }

  const empty = open.length === 0 && ideaProjects.length === 0 && inboxIdeas.length === 0 && goals.length === 0

  return (
    <Screen title="مساري" eyebrow={<span>{quarterLine(today)}</span>} aurora>
      <div className={styles.stack}>
        {/* Season */}
        <section aria-label="الموسم" className={styles.season}>
          {season ? (
            <>
              <div className={styles.seasonHead}>
                <h2 className={styles.seasonTitle}>
                  <Bidi>{season.titleAr}</Bidi>
                </h2>
                <span className={styles.seasonWeek}>
                  {totalWeeks ? (
                    <>
                      الأسبوع <span className={styles.num}>{Math.min(weekNo, totalWeeks)}</span> من <span className={styles.num}>{totalWeeks}</span>
                    </>
                  ) : (
                    <>
                      الأسبوع <span className={styles.num}>{weekNo}</span>
                    </>
                  )}
                </span>
              </div>
              {seasonPct != null && (
                <div className={styles.track} aria-hidden="true">
                  <motion.div
                    className={styles.fill}
                    initial={reduce ? false : { scaleX: 0 }}
                    animate={{ scaleX: seasonPct }}
                    transition={{ duration: dur.gentle, ease: ease.standard }}
                  />
                </div>
              )}
              <p className={styles.seasonNote}>
                {grow.length > 0 ? (
                  <>
                    ننمّي: <MetaLine parts={grow} /> — والباقي نحافظ عليه بهدوء.
                  </>
                ) : (
                  'ما اخترتي مجالات تنمّينها هالموسم للحين. اختاري من «مجالاتك» — وعاداتها تطلع لك باقتراحات اليوم.'
                )}
              </p>
              <button type="button" className={styles.seasonLink} onClick={() => setDomainsSheet(true)}>
                مجالاتك
              </button>
            </>
          ) : (
            <>
              <h2 className={styles.seasonTitle}>ما فيه موسم شغّال</h2>
              <p className={styles.seasonNote}>الموسم يحدد وش تركّزين عليه ووش تحافظين عليه بهدوء لكم أسبوع.</p>
              <div className={styles.actions}>
                <Button onClick={() => setSeasonSheet(true)}>ابدئي موسم</Button>
              </div>
            </>
          )}
        </section>

        <WeekPriorities />

        <StarDivider />

        {/* Projects */}
        <section aria-label="المشاريع" className={styles.stack} style={{ gap: 'var(--space-3)' }}>
          <SectionHead
            title="المشاريع"
            action={
              <button type="button" className={styles.linkBtn} onClick={() => setAdding(true)}>
                مشروع جديد
              </button>
            }
          />
          {open.length === 0 ? (
            empty ? null : (
              <p className={`${styles.hint} ${styles.padded}`}>
                ما عندك مشروع نشط. حوّلي فكرة لمشروع، أو أضيفي واحد جديد.
              </p>
            )
          ) : (
            <div className={styles.projects}>
              {open.map((p) => {
                const next = projectNextStep(p)
                const doneSteps = p.steps.filter((x) => x.done).length
                return (
                  <ExpandCard
                    key={p.id}
                    id={p.id}
                    title={p.titleAr}
                    subtitle={next && expandedId !== p.id ? <>الجاية: <Bidi>{next.titleAr}</Bidi></> : domainName(p.domain)}
                    status={p.status}
                    open={expandedId === p.id}
                    onToggle={() => setExpanded(expandedId === p.id ? '' : p.id)}
                  >
                    {next ? (
                      <div className={styles.next}>
                        <span className={styles.nextLabel}>الخطوة الجاية</span>
                        <span className={styles.nextTitle}>
                          <Bidi>{next.titleAr}</Bidi>
                        </span>
                        <span className={styles.nextMeta}>
                          <span className={styles.num}>{next.durationMin}</span> د
                        </span>
                      </div>
                    ) : (
                      <div className={styles.next}>
                        <span className={styles.nextLabel}>الخطوة الجاية</span>
                        <span className={styles.nextTitle}>{p.steps.length ? 'خلّصتي كل الخطوات' : 'ما فيه خطوات للحين'}</span>
                      </div>
                    )}
                    <dl className={styles.facts}>
                      {p.dueDate && (
                        <>
                          <dt>الموعد</dt>
                          <dd>{dayLabel(p.dueDate)}</dd>
                        </>
                      )}
                      {p.steps.length > 0 && (
                        <>
                          <dt>الخطوات</dt>
                          <dd>
                            خلّصتي <span className={styles.num}>{doneSteps}</span> من <span className={styles.num}>{p.steps.length}</span>
                          </dd>
                        </>
                      )}
                      {p.notes && (
                        <>
                          <dt>ملاحظة</dt>
                          <dd data-note="">
                            <Bidi>{p.notes}</Bidi>
                          </dd>
                        </>
                      )}
                    </dl>
                    <div className={styles.actions}>
                      {next &&
                        (stepTaskOn(s.tasks, p, next, dayKey(today)) ? (
                          <Button variant="secondary" onClick={() => navigate('/today')} aria-label="الخطوة على يومك — افتحي اليوم">
                            على يومك ✓
                          </Button>
                        ) : (
                          <Button onClick={() => void putToday(p)} disabled={busy.current.has(p.id)}>
                            حطيها لليوم
                          </Button>
                        ))}
                      <Button variant="secondary" onClick={() => navigate(`/path/project/${p.id}`)}>
                        افتحي المشروع
                      </Button>
                    </div>
                  </ExpandCard>
                )
              })}
            </div>
          )}
        </section>

        {/* Goals */}
        <InsetGroupedList
          header="الأهداف"
          headerAction={
            <button type="button" className={styles.linkBtn} onClick={() => setGoalSheet('new')}>
              هدف جديد
            </button>
          }
        >
          {goals.length === 0 ? (
            <ListRow title="ما فيه أهداف للحين" subtitle="الهدف يعطيك اتجاه — والمشاريع والعادات هي الشغل اليومي." muted />
          ) : (
            goals.map((g) => {
              const v = goalProgress(g)
              const next = g.milestones.find((m) => !m.done)
              return (
                <ListRow
                  key={g.id}
                  leading={<ProgressArc value={v} size={36} label={v >= 1 ? 'مكتمل' : `تقدّم ${Math.round(v * 100)}٪`} />}
                  title={<Bidi>{g.titleAr}</Bidi>}
                  subtitle={next ? <>الجاية: <Bidi>{next.titleAr}</Bidi></> : g.targetNote ? <Bidi>{g.targetNote}</Bidi> : domainName(g.domain)}
                  chevron
                  onClick={() => setGoalSheet(g)}
                />
              )
            })
          )}
        </InsetGroupedList>

        {/* Tracks */}
        <InsetGroupedList header="مساراتك">
          <ListRow
            leading={<Icon name="book" size={22} />}
            title={<Bidi>IELTS</Bidi>}
            subtitle={hasIelts ? <Bidi>يوميًا 30–45 د · مهارة لكل يوم</Bidi> : 'خطة يومية خفيفة — فعّليها إذا تبين'}
            chevron
            onClick={() => navigate('/path/ielts')}
          />
          <ListRow
            leading={<Icon name="walk" size={22} />}
            title="رخصة القيادة"
            subtitle={hasDriving ? <Bidi>فيديوهات 3 مرات + تدريب مرة بالأسبوع</Bidi> : 'خطة أسبوعية مرنة — فعّليها إذا تبين'}
            chevron
            onClick={() => navigate('/path/driving')}
          />
        </InsetGroupedList>

        <StarDivider star={false} />

        {/* Ideas */}
        {!empty && (
        <InsetGroupedList header="الأفكار" footer={ideaProjects.length + inboxIdeas.length > 0 ? 'اضغطي «…» على الفكرة عشان تحوّلينها لمشروع أو تأرشفينها.' : undefined}>
          {ideaProjects.length + inboxIdeas.length === 0 ? (
            <ListRow title="ما فيه أفكار محفوظة" subtitle="أي فكرة تكتبينها من «+» بنوع «فكرة» تطلع هنا." muted />
          ) : (
            <>
              {ideaProjects.map((p) => (
                <ListRow key={p.id} title={<Bidi>{p.titleAr}</Bidi>} subtitle={domainName(p.domain)} chevron onClick={() => navigate(`/path/project/${p.id}`)} />
              ))}
              {inboxIdeas.map((i) => (
                <ListRow
                  key={i.id}
                  title={<Bidi>{i.title}</Bidi>}
                  subtitle={i.kind === 'potential_project' ? 'مشروع محتمل · من الوارد' : 'فكرة · من الوارد'}
                  trailingActions={[{ key: 'archive', label: 'أرشفي', tone: 'neutral', onAction: () => void archiveIdea(i.id) }]}
                  leadingActions={[{ key: 'project', label: 'مشروع', tone: 'accent', onAction: () => void ideaToProject(i.id) }]}
                  menu={[
                    { key: 'project', label: 'حوّليها لمشروع', onSelect: () => void ideaToProject(i.id) },
                    { key: 'archive', label: 'أرشفيها', onSelect: () => void archiveIdea(i.id) },
                  ]}
                />
              ))}
            </>
          )}
        </InsetGroupedList>
        )}

        {done.length > 0 && (
          <InsetGroupedList header="خلصت">
            {done.map((p) => (
              <ListRow
                key={p.id}
                title={<Bidi>{p.titleAr}</Bidi>}
                subtitle={`${countLabel(p.steps.length, NOUNS.step)} · ${Math.round(projectProgress(p) * 100)}%`}
                trailing={<StatusTag status="done" />}
                chevron
                onClick={() => navigate(`/path/project/${p.id}`)}
              />
            ))}
          </InsetGroupedList>
        )}

        {empty && <EmptyState title="مسارك يبدأ بفكرة وحدة" body="اكتبي مشروع صغير له نتيجة وحدة، وأول خطوة فيه." action={<Button onClick={() => setAdding(true)}>أضيفي مشروع</Button>} />}
      </div>

      <NewProjectSheet open={adding} onClose={() => setAdding(false)} onCreated={(id) => navigate(`/path/project/${id}`)} />
      <NewSeasonSheet open={seasonSheet} onClose={() => setSeasonSheet(false)} />
      <DomainsSheet open={domainsSheet} onClose={() => setDomainsSheet(false)} />
      <GoalSheet goal={goalSheet} onClose={() => setGoalSheet(null)} />
    </Screen>
  )
}

function NewProjectSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const store = useStore()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [domain, setDomain] = useState<DomainId>('career')
  const [firstStep, setFirstStep] = useState('')
  const [status, setStatus] = useState<'active' | 'idea'>('active')

  const reset = () => {
    setTitle('')
    setFirstStep('')
    setStatus('active')
  }

  const save = async (force = false) => {
    const t = title.trim()
    if (!t) return
    const id = store.newId('prj')
    const steps = firstStep.trim() ? [{ id: store.newId('stp'), titleAr: firstStep.trim(), titleEn: firstStep.trim(), actionId: null, done: false, doneDate: null, durationMin: 30 }] : []
    const p = makeProject({ id, domain, titleAr: t, titleEn: t, status, steps, sortOrder: Date.now() % 100000 })
    const v = await store.upsertProject(p, force)
    if (v.length > 0) {
      toast({ message: capacityMessage(v), actionLabel: 'فعّليه', onAction: () => void save(true).then(() => undefined) })
      return
    }
    reset()
    onClose()
    toast({ message: status === 'active' ? 'انضاف المشروع' : 'انحفظت الفكرة', actionLabel: 'تراجع', onAction: () => void store.deleteProject(id) })
    onCreated(id)
  }

  return (
    <Sheet open={open} onClose={onClose} title="مشروع جديد" detents={['large']}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label className={styles.field}>
          <span className={styles.label}>وش النتيجة اللي تبينها؟</span>
          <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلًا: دراسة حالة للبورتفوليو" autoFocus />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>أول خطوة (اختياري)</span>
          <input className={styles.input} value={firstStep} onChange={(e) => setFirstStep(e.target.value)} placeholder="خطوة صغيرة تقدرين تبدينها" />
        </label>
        <div className={styles.row2}>
          <label className={styles.field}>
            <span className={styles.label}>المجال</span>
            <select className={styles.select} value={domain} onChange={(e) => setDomain(e.target.value as DomainId)}>
              {PROJECT_DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {domainName(d)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>الحالة</span>
            <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'idea')}>
              <option value="active">نشط</option>
              <option value="idea">فكرة بس</option>
            </select>
          </label>
        </div>
        <Button type="submit" size="large" block disabled={!title.trim()}>
          احفظي
        </Button>
      </form>
    </Sheet>
  )
}

function NewSeasonSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const save = async () => {
    const t = title.trim()
    if (!t) return
    await store.startNewSeason(t, t)
    setTitle('')
    onClose()
    toast({ message: 'بدأ موسم جديد' })
  }
  return (
    <Sheet open={open} onClose={onClose} title="موسم جديد" detents={['medium']}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label className={styles.field}>
          <span className={styles.label}>اسم الموسم</span>
          <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلًا: موسم الأساس" autoFocus />
        </label>
        <p className={styles.hint}>بعدها تختارين من «مجالاتك» وش تنمّين ووش تحافظين عليه، ومتى ما بغيتي.</p>
        <Button type="submit" size="large" block disabled={!title.trim()}>
          ابدئي
        </Button>
      </form>
    </Sheet>
  )
}

const STATE_SEGMENTS = [
  { value: 'grow', label: 'نمو' },
  { value: 'maintain', label: 'حفاظ' },
  { value: 'rest', label: 'راحة' },
] as const

/**
 * Her domains and their state this season — changeable any time (QA #1). «راحة» domains don't
 * appear in today's suggestions; «نمو» and «حفاظ» do. Over-capacity asks before forcing.
 */
function DomainsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useLife()
  const store = useStore()
  const toast = useToast()
  const [pending, setPending] = useState<{ id: DomainId; st: DomainState } | null>(null)
  const domains = [...s.domains].filter((d) => d.enabled && !d.sensitive).sort((a, b) => a.sortOrder - b.sortOrder)

  const change = async (id: DomainId, st: DomainState, force = false) => {
    const v = await store.setDomainState(id, st, force)
    if (v.length > 0 && !force) {
      setPending({ id, st })
      return
    }
    setPending(null)
    toast({
      message:
        st === 'rest'
          ? `«${domainName(id)}» ترتاح — عاداتها ما تطلع باقتراحات اليوم، واللي أضفتيه ليومك يبقى`
          : `«${domainName(id)}» ${st === 'grow' ? 'للنمو' : 'للحفاظ'} — عاداتها تطلع لك باقتراحات اليوم`,
    })
  }

  return (
    <Sheet open={open} onClose={onClose} title="مجالاتك" detents={['large']}>
      <div className={styles.form}>
        <p className={styles.hint}>
          «نمو» = تركيزك هالموسم · «حفاظ» = نسخة صغيرة تكفي · «راحة» = ما يطلع لك شي منه. تقدرين تغيّرينها متى ما بغيتي.
        </p>
        <ul className={styles.domainList} role="list">
          {domains.map((d) => {
            const name = domainName(d.id) || d.nameAr
            return (
              <li key={d.id} className={styles.domainRow}>
                <span className={styles.domainName}>
                  <Bidi>{name}</Bidi>
                </span>
                <SegmentedControl label={`حالة ${name}`} segments={STATE_SEGMENTS} value={d.state} onChange={(v) => void change(d.id, v)} />
                {/* The capacity question sits right under the row she tapped — never off-screen (QA area 3 #7). */}
                {pending?.id === d.id && (
                  <div className={styles.warn} role="alert" ref={(el) => el?.scrollIntoView?.({ block: 'nearest' })}>
                    <p>عندك مجالات نمو كفاية — الأريح تخلين واحد منها للحفاظ. تبين تكملين على أي حال؟</p>
                    <div className={styles.actions}>
                      <Button onClick={() => void change(pending.id, pending.st, true)}>كمّلي</Button>
                      <Button variant="plain" onClick={() => setPending(null)}>
                        خلاص لا
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </Sheet>
  )
}

/** Create / edit a goal with its milestones (QA area 3 #9). */
function GoalSheet({ goal, onClose }: { goal: Goal | 'new' | null; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const today = useToday()
  const open = goal != null
  const editing = goal && goal !== 'new' ? goal : null
  const [key, setKey] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [domain, setDomain] = useState<DomainId>('career')
  const [targetNote, setTargetNote] = useState('')
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [newMs, setNewMs] = useState('')
  const [armed, setArmed] = useState(false)
  // Load the goal once per opening.
  const k = editing ? editing.id : goal === 'new' ? 'new' : null
  if (k !== key) {
    setKey(k)
    setTitle(editing?.titleAr ?? '')
    setDomain(editing?.domain ?? 'career')
    setTargetNote(editing?.targetNote ?? '')
    setMilestones(editing?.milestones ?? [])
    setNewMs('')
    setArmed(false)
  }

  const addMs = () => {
    const t = newMs.trim()
    if (!t) return
    setMilestones((m) => [...m, { id: store.newId('ms'), quarter: 1, titleAr: t, titleEn: t, done: false, doneDate: null, rewardJoyId: null }])
    setNewMs('')
  }

  const save = async () => {
    const t = title.trim()
    if (!t) return
    const g: Goal = editing
      ? { ...editing, titleAr: t, titleEn: editing.titleEn === editing.titleAr ? t : editing.titleEn, domain, targetNote: targetNote.trim(), milestones }
      : { id: store.newId('goal'), domain, titleAr: t, titleEn: t, targetNote: targetNote.trim(), milestones, linkedHabitIds: [], linkedProjectIds: [], sortOrder: Date.now() % 100000 }
    await store.upsertGoal(g)
    onClose()
    toast(editing ? { message: 'انحفظ الهدف' } : { message: 'انضاف الهدف', actionLabel: 'تراجع', onAction: () => void store.deleteGoal(g.id) })
  }

  const remove = async () => {
    if (!editing) return
    if (!armed) {
      setArmed(true)
      return
    }
    const tok = await store.deleteGoal(editing.id)
    onClose()
    toast(tok ? { message: `انحذف «${editing.titleAr}»`, actionLabel: 'تراجع', onAction: () => void store.undoDelete(tok.token) } : { message: 'انحذف الهدف' })
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'الهدف' : 'هدف جديد'} detents={['large']}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label className={styles.field}>
          <span className={styles.label}>وش الهدف؟</span>
          <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلًا: أكون جاهزة لاختبار IELTS" />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>المجال</span>
          <select className={styles.select} value={domain} onChange={(e) => setDomain(e.target.value as DomainId)}>
            {PROJECT_DOMAINS.map((d) => (
              <option key={d} value={d}>
                {domainName(d)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>كيف تعرفين إنك وصلتي؟ (اختياري)</span>
          <input className={styles.input} value={targetNote} onChange={(e) => setTargetNote(e.target.value)} placeholder="بكلماتك" />
        </label>
        <fieldset className={styles.field} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className={styles.label}>المعالم</legend>
          {milestones.map((m, i) => (
            <div key={m.id} className={styles.milestone}>
              <CheckCircle
                checked={m.done}
                size={24}
                label={`معلم: ${m.titleAr}`}
                onChange={(v) => setMilestones((all) => all.map((x, j) => (j === i ? { ...x, done: v, doneDate: v ? dayKey(today) : null } : x)))}
              />
              <span style={{ flex: 1 }}>
                <Bidi>{m.titleAr}</Bidi>
              </span>
              <button type="button" className={styles.iconBtn} aria-label={`احذفي المعلم «${m.titleAr}»`} onClick={() => setMilestones((all) => all.filter((_, j) => j !== i))}>
                <Icon name="close" size={18} />
              </button>
            </div>
          ))}
          <div className={styles.milestone}>
            <input
              className={styles.input}
              value={newMs}
              onChange={(e) => setNewMs(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addMs()
                }
              }}
              placeholder="معلم جديد…"
              aria-label="معلم جديد"
            />
            <Button variant="secondary" onClick={addMs} disabled={!newMs.trim()}>
              أضيفي
            </Button>
          </div>
        </fieldset>
        <Button type="submit" size="large" block disabled={!title.trim()}>
          احفظي
        </Button>
        {editing && (
          <button type="button" className={styles.dangerBtn} data-armed={armed || undefined} onClick={() => void remove()}>
            {armed ? 'متأكدة؟ اضغطي مرة ثانية للحذف' : 'احذفي الهدف'}
          </button>
        )}
      </form>
    </Sheet>
  )
}
