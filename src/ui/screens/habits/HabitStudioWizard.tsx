import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  actionTitle,
  applyPrefill,
  cueOf,
  domainForAction,
  draftFromHabit,
  emptyDraft,
  evidenceHabitOptions,
  firstBlockingStep,
  habitFromDraft,
  PRAYER_ANCHORS,
  prefillFromAction,
  STEP_FIELDS,
  stepHasValue,
  undoPrefill,
  validateStep,
  WIZARD_STEP_IDS,
  type Action,
  type CapacityViolation,
  type CueKind,
  type DomainId,
  type Habit,
  type PrayerAnchor,
  type Priority,
  type Slot,
  type WizardDraft,
  type WizardKey,
  type WizardStepId,
} from '../../../domain'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { Flower, FLOWER_AR, flowerForDomain } from '../../components/flowers'
import { Icon } from '../../icons/Icon'
import { Screen } from '../../components/Screen'
import { SegmentedControl } from '../../components/SegmentedControl'
import { Sheet } from '../../components/Sheet'
import { TimeField } from '../../components/TimeField'
import { useToast } from '../../components/Toast'
import { springs } from '../../motion'
import { useStack } from '../../shell/stack'
import { useLife, useStore } from '../../state/LifeStore'
import { useDomainWake, type WakeOutcome } from './DomainWakeSheet'
import { daysCountAr, Stepper } from './HabitStudioScreen'
import styles from './habits.module.css'
import { cueLabel, quoted, WEEKDAY_SHORT, weekOrder } from './shared'
import w from './studioWizard.module.css'

const STEP_TEXT: Record<WizardStepId, { title: string; help: string }> = {
  goal: { title: 'الهدف', help: 'الهدف يوجّه العادة، وما يظهر كمهمة يومية.' },
  behavior: { title: 'السلوك', help: 'فعل واضح تقدرين تشوفينه: وش بالضبط تسوين؟' },
  versions: { title: 'النسخ: أدنى · عادي · إضافي', help: 'الأدنى يُحسب إنجازًا كاملًا. خليه صغير لدرجة يصعب ترفضينه.' },
  cue: { title: 'الإشارة', help: 'بعد شي تسوينه أصلًا كل يوم — أو وقت أو مكان ثابت.' },
  prep: { title: 'التحضير', help: 'قلّلي الخطوات قبل البداية.' },
  joy: { title: 'ربط بمتعة', help: 'شي تحبينه يصاحب العادة — من خريطة متعتك.' },
  ifThen: { title: 'خطة إذا… فإني', help: 'وش العائق المتوقع؟ وش تسوين وقتها؟' },
  friction: { title: 'صعّبي المُغري', help: 'اللي يسرق الوقت: خليه أبعد بخطوة.' },
  reminder: { title: 'التذكير', help: 'أقل عدد تنبيهات ممكن. السلسلة غالبًا تكفي.' },
}
const SHORT_TITLE = (id: WizardStepId) => STEP_TEXT[id].title.split(':')[0]!

const ANCHOR_KINDS: { value: CueKind; label: string }[] = [
  { value: 'wake', label: 'بعد الصحيان' },
  { value: 'prayer', label: 'مع صلاة' },
  { value: 'fixedTime', label: 'ساعة محددة' },
  { value: 'slot', label: 'فترة' },
]
const PRAYER_AR: Record<PrayerAnchor, string> = { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' }
const SLOT_CHOICES: { value: Slot; label: string }[] = [
  { value: 'morning', label: 'الصبح' },
  { value: 'afternoon', label: 'العصر' },
  { value: 'evening', label: 'المسا' },
  { value: 'night', label: 'الليل' },
  { value: 'anytime', label: 'أي وقت' },
]
const PRIORITY_CHOICES: { value: Priority; label: string }[] = [
  { value: 'core', label: 'أساسية' },
  { value: 'recommended', label: 'مهمة' },
  { value: 'optional', label: 'لو فيه وقت' },
]
const CAPACITY_AR: Record<CapacityViolation['rule'], (v: CapacityViolation) => string> = {
  coreHabits: (v) => `صار عندك ${v.count} عادات في مجالات تركيزك (النمو)، والأريح ${v.max} بالكثير.`,
  growDomains: (v) => `صار عندك ${v.count} مجالات نمو، والأريح ${v.max} بالكثير.`,
  maintainDomains: (v) => `صار عندك ${v.count} مجالات تحافظين عليها، والأريح ${v.max} بالكثير.`,
  activeProjects: (v) => `صار عندك ${v.count} مشاريع شغّالة، والأريح ${v.max} بالكثير.`,
  activeCourses: (v) => `صار عندك ${v.count} كورسات شغّالة، والأريح ${v.max}.`,
}

interface Prefilled {
  actionId: string
  title: string
  keys: Set<WizardKey>
  previous: Partial<WizardDraft>
}

export default function HabitStudioWizard() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const editId = params.get('habit')
  const store = useStore()
  const s = useLife()
  const toast = useToast()
  const stack = useStack()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const base = editId ? (s.habits.find((h) => h.id === editId) ?? null) : null
  const domains = useMemo(() => s.domains.filter((d) => d.enabled && !d.sensitive).sort((a, b) => a.sortOrder - b.sortOrder), [s.domains])
  const options = useMemo(() => evidenceHabitOptions(s.actions, { includeSensitive: s.settings.cycleModule }), [s.actions, s.settings.cycleModule])
  const lang = s.settings.language

  const [draft, setDraft] = useState<WizardDraft>(() => (base ? draftFromHabit(base) : emptyDraft(domains[0]?.id ?? 'health')))
  const [cur, setCur] = useState(0)
  const [visited, setVisited] = useState<Set<number>>(() => new Set())
  const [error, setError] = useState<{ step: WizardStepId; text: string } | null>(null)
  const [pre, setPre] = useState<Prefilled | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [violations, setViolations] = useState<CapacityViolation[] | null>(null)
  const [pending, setPending] = useState<Habit | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const cardRefs = useRef<(HTMLLIElement | null)[]>([])
  const { wake, sheet: wakeSheet } = useDomainWake()

  const set = <K extends WizardKey>(k: K, v: WizardDraft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }))
    if (error && STEP_FIELDS[error.step].includes(k)) setError(null)
  }

  const prefillWith = (a: Action) => {
    const p = prefillFromAction(a, lang, draft.domain)
    const { draft: next, previous } = applyPrefill(draft, p)
    // keep the same domain pick when the library's domain is one she has turned off
    if (!domains.some((d) => d.id === next.domain)) next.domain = draft.domain
    setDraft(next)
    setPre({ actionId: a.actionId, title: actionTitle(a, lang), keys: new Set(p.keys), previous })
    setPickerOpen(false)
    setQuery('')
  }
  // deep link from the evidence library: /studio?action=BODY-02
  const wantedAction = params.get('action')
  const appliedRef = useRef(false)
  useEffect(() => {
    if (appliedRef.current || !wantedAction || base) return
    const a = options.find((x) => x.actionId === wantedAction)
    if (!a) return
    appliedRef.current = true
    prefillWith(a)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedAction, options, base])

  const undoPre = () => {
    if (!pre) return
    setDraft((d) => ({ ...undoPrefill(d, pre.previous), actionId: base?.actionId ?? null }))
    setPre(null)
  }

  const cue = cueOf(draft)
  const domainName = (id: DomainId) => s.domains.find((d) => d.id === id)?.nameAr ?? ''

  const go = (i: number) => {
    setVisited((v) => new Set(v).add(cur))
    const next = Math.min(WIZARD_STEP_IDS.length - 1, Math.max(0, i))
    setCur(next)
    requestAnimationFrame(() => cardRefs.current[next]?.scrollIntoView?.({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }))
  }
  const failAt = (step: WizardStepId, text: string) => {
    setError({ step, text })
    go(WIZARD_STEP_IDS.indexOf(step))
    if (step === 'behavior') setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 0)
  }
  const next = () => {
    const id = WIZARD_STEP_IDS[cur]!
    const e = validateStep(id, draft)
    if (e) return failAt(id, e)
    go(cur + 1)
  }

  const finish = (h: Habit, note?: string, isNew = !base) => {
    toast({
      message: note ?? (base ? 'انحفظت التعديلات' : `انضافت ${quoted(h.titleAr)}`),
      ...(isNew && h.status === 'active' && note == null ? { actionLabel: 'تراجع', onAction: () => void store.deleteHabit(h.id) } : {}),
    })
    stack?.goBack()
  }
  const settle = async (h: Habit, note?: string) => {
    const o: WakeOutcome = await wake([h])
    if (o === 'kept') finish(h, `انحفظت — ومجال «${domainName(h.domain)}» باقي مرتاح؛ غيّريه من «مجالاتك» في مساري وقت ما تبين`)
    else if (o === 'paused') finish(h, 'انحفظت موقّفة — شغّليها وقت ما يخف يومك')
    else finish(h, note)
  }

  const build = (asDraft: boolean): Habit | null => {
    const blocking = firstBlockingStep(draft)
    if (blocking) {
      failAt(blocking, validateStep(blocking, draft)!)
      return null
    }
    const id = base?.id ?? `h_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
    return habitFromDraft(draft, base, { id, cueText: cueLabel(cue), status: asDraft ? 'paused' : undefined })
  }
  const save = async (asDraft: boolean) => {
    setError(null)
    const h = build(asDraft)
    if (!h) return
    const v = await store.upsertHabit(h)
    if (v.length > 0) {
      setPending(h)
      setViolations(v)
      return
    }
    if (asDraft) finish(h, 'انحفظت كمسودة — موقّفة لين تشغّلينها')
    else await settle(h)
  }
  const resolve = async (mode: 'paused' | 'force') => {
    if (!pending) return
    const h = mode === 'paused' ? { ...pending, status: 'paused' as const } : pending
    await store.upsertHabit(h, true)
    setViolations(null)
    await settle(h, mode === 'paused' ? 'انحفظت موقّفة — شغّليها وقت ما يخف يومك' : undefined)
  }

  const suggested = (k: WizardKey): ReactNode => (pre?.keys.has(k) ? <span className={w.suggestedMark}>مقترح</span> : null)

  const summary = (id: WizardStepId): string => {
    const empty = 'اختياري'
    switch (id) {
      case 'goal': return draft.goal.trim() || empty
      case 'behavior': return draft.title.trim() ? `${draft.title.trim()} · ${domainName(draft.domain)}` : 'الاسم مطلوب'
      case 'versions': return draft.minText.trim() || draft.normalText.trim() || empty
      case 'cue': return `${cueLabel(cue)} · ${daysCountAr(draft.days.length)}`
      case 'prep': return draft.frictionDown.trim() || empty
      case 'joy': return draft.joyPairing.trim() || empty
      case 'ifThen': return draft.ifThen.trim() || empty
      case 'friction': return draft.frictionUp.trim() || empty
      case 'reminder': return draft.reminderOn ? 'تنبيه واحد وقت العادة' : 'بدون تذكير — السلسلة تكفي'
    }
  }
  const stepHasPrefill = (id: WizardStepId) => STEP_FIELDS[id].some((k) => pre?.keys.has(k))

  const textArea = (k: 'goal' | 'frictionDown' | 'joyPairing' | 'ifThen' | 'frictionUp', label: string, placeholder: string) => (
    <label className={styles.field}>
      <span className={styles.label}>
        {label}
        {suggested(k)}
      </span>
      <textarea className={styles.textarea} value={draft[k]} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} rows={3} />
    </label>
  )

  const editor = (id: WizardStepId): ReactNode => {
    switch (id) {
      case 'goal':
        return textArea('goal', 'هدفك من العادة', 'مثلًا: أحس بنشاط أكثر في أيام الدراسة')
      case 'behavior':
        return (
          <>
            <label className={styles.field}>
              <span className={styles.label}>
                الاسم
                {suggested('title')}
              </span>
              <input
                ref={nameRef}
                className={styles.input}
                value={draft.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="مثلًا: مشي هادي"
                autoComplete="off"
                aria-invalid={error?.step === 'behavior' || undefined}
                aria-describedby={error?.step === 'behavior' ? 'wiz-error' : undefined}
              />
              {error?.step === 'behavior' && (
                <span id="wiz-error" className={styles.error} role="alert">
                  {error.text}
                </span>
              )}
            </label>
            <div className={styles.field}>
              <span className={styles.label} id="wiz-domain">
                المجال · ولكل مجال وردته
                {suggested('domain')}
              </span>
              <div className={styles.flowerPicker} role="radiogroup" aria-labelledby="wiz-domain">
                {domains.map((d) => {
                  const on = d.id === draft.domain
                  return (
                    <button key={d.id} type="button" role="radio" aria-checked={on} className={styles.flowerOption} data-on={on || undefined} onClick={() => set('domain', d.id)}>
                      <Flower kind={flowerForDomain(d.id)} stage={4} size={40} decorative />
                      <span className={styles.flowerOptionName}>{d.nameAr}</span>
                      <span className={styles.flowerOptionFlower}>{FLOWER_AR[flowerForDomain(d.id)]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>أهميتها{suggested('priority')}</span>
              <SegmentedControl label="أهمية العادة" segments={PRIORITY_CHOICES} value={draft.priority} onChange={(v) => set('priority', v)} />
            </div>
          </>
        )
      case 'versions':
        return (
          <>
            <label className={styles.field}>
              <span className={styles.label}>
                أدنى — النسخة الصغيرة{suggested('minText')}
              </span>
              <input className={styles.input} value={draft.minText} onChange={(e) => set('minText', e.target.value)} placeholder="مثلًا: 10 دقايق مشي حول البيت" />
            </label>
            <Stepper label="مدة النسخة الصغيرة" value={draft.minMin} onChange={(v) => set('minMin', v)} max={draft.normalMin} />
            <label className={styles.field}>
              <span className={styles.label}>
                عادي{suggested('normalText')}
              </span>
              <input className={styles.input} value={draft.normalText} onChange={(e) => set('normalText', e.target.value)} placeholder="مثلًا: 20 دقيقة مشي" />
            </label>
            <Stepper
              label="مدة العادية"
              value={draft.normalMin}
              onChange={(v) => {
                const n = Math.max(v, 1)
                setDraft((d) => ({ ...d, normalMin: n, minMin: Math.min(d.minMin, n) })) // the small version never outgrows the normal one
              }}
            />
            <label className={styles.field}>
              <span className={styles.label}>
                إضافي <span className={styles.optional}>(اختياري)</span>
                {suggested('bonusText')}
              </span>
              <input className={styles.input} value={draft.bonusText} onChange={(e) => set('bonusText', e.target.value)} placeholder="مثلًا: 30 دقيقة مع بودكاست" />
            </label>
          </>
        )
      case 'cue':
        return (
          <>
            <SegmentedControl label="ربطها بـ" segments={ANCHOR_KINDS} value={draft.cueKind} onChange={(v) => set('cueKind', v)} />
            {draft.cueKind === 'prayer' && (
              <div className={styles.chips} role="radiogroup" aria-label="الصلاة">
                {PRAYER_ANCHORS.map((p) => (
                  <Chip key={p} role="radio" selected={draft.prayer === p} onClick={() => set('prayer', p)}>
                    بعد {PRAYER_AR[p]}
                  </Chip>
                ))}
              </div>
            )}
            {draft.cueKind === 'fixedTime' && (
              <div className={styles.field}>
                <span className={styles.label} aria-hidden="true">الساعة</span>
                <TimeField label="وقت العادة" selectClassName={styles.input} minute={draft.minute} onChange={(m) => set('minute', m)} />
              </div>
            )}
            {draft.cueKind === 'slot' && (
              <div className={styles.chips} role="radiogroup" aria-label="الفترة">
                {SLOT_CHOICES.map((c) => (
                  <Chip key={c.value} role="radio" selected={draft.slot === c.value} onClick={() => set('slot', c.value)}>
                    {c.label}
                  </Chip>
                ))}
              </div>
            )}
            <div className={styles.field}>
              <span className={styles.label} id="wiz-days">الأيام</span>
              <div className={styles.chips} role="group" aria-labelledby="wiz-days">
                {weekOrder(s.settings.weekStartsOn).map((d) => (
                  <Chip key={d} selected={draft.days.includes(d)} onClick={() => set('days', draft.days.includes(d) ? draft.days.filter((x) => x !== d) : [...draft.days, d])}>
                    {WEEKDAY_SHORT[d]}
                  </Chip>
                ))}
              </div>
              {error?.step === 'cue' && (
                <span className={styles.error} role="alert">
                  {error.text}
                </span>
              )}
            </div>
            <p className={styles.hint}>بتطلع لك: {cueLabel(cue)} · {daysCountAr(draft.days.length)}</p>
          </>
        )
      case 'prep':
        return textArea('frictionDown', 'وش تجهّزين قبل؟', 'مثلًا: الحذاء جنب الباب')
      case 'joy':
        return textArea('joyPairing', 'وش يصاحبها؟', 'مثلًا: قائمة أغاني ما أسمعها إلا وقت العادة')
      case 'ifThen':
        return textArea('ifThen', 'إذا … فإني …', 'مثلًا: إذا تعبت، أكتفي بالنسخة الصغيرة')
      case 'friction':
        return textArea('frictionUp', 'وش تبعّدين؟', 'مثلًا: التطبيقات المشتتة في صفحة ثانية')
      case 'reminder':
        return (
          <div className={w.radioRow} role="radiogroup" aria-label="التذكير">
            <button type="button" role="radio" aria-checked={!draft.reminderOn} className={w.radio} onClick={() => set('reminderOn', false)}>
              بدون تذكير — السلسلة تكفي
            </button>
            <button type="button" role="radio" aria-checked={draft.reminderOn} className={w.radio} onClick={() => set('reminderOn', true)}>
              تنبيه واحد وقت العادة
            </button>
          </div>
        )
    }
  }

  const q = query.trim()
  const shown = useMemo(() => {
    if (!q) return options
    const hay = (a: Action) => `${actionTitle(a, lang)} ${a.nameEn} ${a.nameAr}`.toLowerCase()
    return options.filter((a) => hay(a).includes(q.toLowerCase()))
  }, [options, q, lang])

  const last = WIZARD_STEP_IDS.length - 1
  const quickUrl = `/studio?mode=quick${editId ? `&habit=${editId}` : ''}`

  return (
    <Screen title={base ? 'عدّلي العادة' : 'عادة جديدة'} backLabel="رجوع">
      <div className={w.top}>
        <p className={styles.hint} style={{ margin: 0 }}>نصمّم العادة خطوة خطوة — واضحة، سهلة البداية، وممتعة.</p>
        <div className={w.progressRow}>
          <span className={w.progressText}>
            الخطوة <bdi>{cur + 1}</bdi> من <bdi>{WIZARD_STEP_IDS.length}</bdi>
          </span>
          <button type="button" className={w.switchLink} onClick={() => navigate(quickUrl, { replace: true })}>
            نموذج سريع
          </button>
        </div>
        <div
          className={w.bar}
          role="progressbar"
          aria-label="خطوات العادة"
          aria-valuemin={1}
          aria-valuemax={WIZARD_STEP_IDS.length}
          aria-valuenow={cur + 1}
          aria-valuetext={`الخطوة ${cur + 1} من ${WIZARD_STEP_IDS.length}`}
        >
          {WIZARD_STEP_IDS.map((id, i) => (
            <span key={id} className={w.seg} aria-hidden="true">
              <motion.span className={w.segFill} initial={false} animate={{ scaleX: i <= cur ? 1 : 0 }} transition={reduce ? { duration: 0 } : springs.smooth} />
            </span>
          ))}
        </div>
      </div>

      {pre ? (
        <div className={w.suggest} role="status">
          <div>
            <span className={w.suggestTitle}>مقترح من مكتبة الأدلة</span>
            <bdi>{pre.title}</bdi> — عبّأنا الحقول، عدّلي اللي تبين.
          </div>
          <Button variant="plain" onClick={undoPre}>
            تراجعي عن التعبئة
          </Button>
        </div>
      ) : (
        !base &&
        options.length > 0 && (
          <div className={w.suggest}>
            <div>
              <span className={w.suggestTitle}>ابدئي من مكتبة الأدلة</span>
              اختاري عادة جاهزة ونعبّي الحقول لك — وتعدّلين عليها.
            </div>
            <Button variant="secondary" onClick={() => setPickerOpen(true)}>
              تصفّحي الاقتراحات
            </Button>
          </div>
        )
      )}

      <ol className={w.list}>
        {WIZARD_STEP_IDS.map((id, i) => {
          const open = i === cur
          const done = !open && (visited.has(i) || i < cur) && stepHasValue(id, draft)
          return (
            <li key={id} ref={(el) => (cardRefs.current[i] = el)} className={w.card} data-open={open || undefined} data-done={done || undefined}>
              <button type="button" className={w.head} aria-expanded={open} aria-controls={`wiz-body-${id}`} onClick={() => (open ? undefined : go(i))}>
                <span className={w.badge} aria-hidden="true">
                  {done ? <Icon name="check" size={16} /> : <bdi>{i + 1}</bdi>}
                </span>
                <span className={w.headText}>
                  <span className={w.headTitle}>{STEP_TEXT[id].title}</span>
                  {!open && <span className={w.headValue}>{summary(id)}</span>}
                </span>
                {!open && stepHasPrefill(id) && <span className={`${w.suggestedMark} ${w.chip}`}>مقترح</span>}
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    key="body"
                    id={`wiz-body-${id}`}
                    role="region"
                    aria-label={STEP_TEXT[id].title}
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={reduce ? { duration: 0 } : springs.smooth}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className={w.body}>
                      <p className={w.help}>{STEP_TEXT[id].help}</p>
                      {editor(id)}
                      <div className={w.nav}>
                        {i > 0 && (
                          <Button variant="plain" onClick={() => go(i - 1)}>
                            السابق
                          </Button>
                        )}
                        {i < last ? (
                          <Button size="large" onClick={next}>
                            التالي: {SHORT_TITLE(WIZARD_STEP_IDS[i + 1]!)}
                          </Button>
                        ) : (
                          <Button size="large" onClick={() => void save(false)}>
                            احفظي العادة
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ol>

      <div className={w.foot}>
        {cur < last && (
          <Button size="large" block onClick={() => void save(false)}>
            احفظي العادة
          </Button>
        )}
        <Button variant="plain" block onClick={() => void save(true)}>
          احفظيها كمسودة
        </Button>
        <p className={w.footNote}>الاسم والأيام هم المطلوبين — الباقي تكمّلينه وقت ما تبين. المسودة تنحفظ موقّفة.</p>
      </div>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="مكتبة الأدلة" detents={['large']}>
        <div className={w.pickSearch}>
          <input className={styles.input} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="دوّري: مشي، نوم، IELTS…" aria-label="بحث في الاقتراحات" />
        </div>
        {shown.length === 0 ? (
          <p className={styles.hint} style={{ paddingInline: 'var(--space-4)' }}>ما لقينا شي بهالاسم — جرّبي كلمة ثانية.</p>
        ) : (
          <ul className={w.pickList}>
            {shown.map((a) => (
              <li key={a.actionId}>
                <button type="button" className={w.pickRow} onClick={() => prefillWith(a)}>
                  <span>
                    <bdi>{actionTitle(a, lang)}</bdi>
                    <span className={w.pickMeta}>{domainName(domainForAction(a) ?? draft.domain)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <Sheet open={violations != null} onClose={() => setViolations(null)} title="يومك بيصير مليان" detents={['medium']}>
        <div className={styles.form}>
          {violations?.map((v) => (
            <p key={v.rule} className={styles.proposal}>
              {CAPACITY_AR[v.rule](v)}
            </p>
          ))}
          <p className={styles.hint}>القليل الثابت أحسن. تقدرين تحفظينها موقّفة وتشغّلينها لما يخف يومك، أو تكمّلين كذا.</p>
          <Button onClick={() => void resolve('paused')}>احفظيها موقّفة</Button>
          <Button variant="secondary" onClick={() => void resolve('force')}>
            كمّلي كذا
          </Button>
          <Button variant="plain" onClick={() => setViolations(null)}>
            رجوع للتعديل
          </Button>
        </div>
      </Sheet>
      {wakeSheet}
    </Screen>
  )
}
