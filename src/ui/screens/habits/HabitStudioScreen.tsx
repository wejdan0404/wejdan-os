import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  anchor,
  EVERY_DAY,
  makeHabit,
  PRAYER_ANCHORS,
  schedule,
  type CapacityViolation,
  type CueAnchor,
  type DomainId,
  type Habit,
  type PrayerAnchor,
  type Priority,
  type Slot,
} from '../../../domain'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { Screen } from '../../components/Screen'
import { SegmentedControl } from '../../components/SegmentedControl'
import { Sheet } from '../../components/Sheet'
import { TimeField } from '../../components/TimeField'
import { useToast } from '../../components/Toast'
import { useStack } from '../../shell/stack'
import { useLife, useStore } from '../../state/LifeStore'
import { useDomainWake, type WakeOutcome } from './DomainWakeSheet'
import { Flower, FLOWER_AR, flowerForDomain } from '../../components/flowers'
import styles from './habits.module.css'
import { quoted, cueLabel, WEEKDAY_SHORT, weekOrder } from './shared'

type AnchorKind = 'wake' | 'prayer' | 'fixedTime' | 'slot'
const ANCHOR_KINDS: { value: AnchorKind; label: string }[] = [
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

/** «كل يوم» · «يوم واحد» · «يومين» · «3 أيام». */
export const daysCountAr = (n: number): string => (n === 7 ? 'كل يوم' : n === 1 ? 'يوم واحد' : n === 2 ? 'يومين' : `${n} أيام`)

function FormSection({ header, footer, children }: { header: string; footer?: string; children: ReactNode }) {
  return (
    <section className={styles.formSection}>
      <h2 className={styles.formSectionHead}>{header}</h2>
      <div className={styles.formCard}>{children}</div>
      {footer && <p className={styles.formSectionFoot}>{footer}</p>}
    </section>
  )
}

export function Stepper({ value, onChange, min = 1, max = 180, step = 5, unit = 'د', label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string; label: string }) {
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button type="button" className={styles.stepperBtn} aria-label="أقل" disabled={value <= min} onClick={() => onChange(Math.max(min, value - (value <= step ? 1 : step)))}>
        −
      </button>
      <span className={styles.stepperValue} aria-live="polite">
        {value} {unit}
      </span>
      <button type="button" className={styles.stepperBtn} aria-label="أكثر" disabled={value >= max} onClick={() => onChange(Math.min(max, value < step ? value + 1 : value + step))}>
        +
      </button>
    </div>
  )
}

export default function HabitStudioScreen() {
  const params = new URLSearchParams(useLocation().search)
  const editId = params.get('habit')
  const store = useStore()
  const s = useLife()
  const toast = useToast()
  const stack = useStack()
  const navigate = useNavigate()
  const base = editId ? (s.habits.find((h) => h.id === editId) ?? null) : null

  const domains = useMemo(() => s.domains.filter((d) => d.enabled && !d.sensitive).sort((a, b) => a.sortOrder - b.sortOrder), [s.domains])

  const [title, setTitle] = useState(base?.titleAr ?? '')
  const [domain, setDomain] = useState<DomainId>(base?.domain ?? domains[0]?.id ?? 'health')
  const a0 = base?.schedule.anchor
  const [kind, setKind] = useState<AnchorKind>(a0 ? (a0.type === 'sleep' ? 'slot' : (a0.type as AnchorKind)) : 'wake')
  const [prayer, setPrayer] = useState<PrayerAnchor>(a0?.prayer ?? 'asr')
  const [minute, setMinute] = useState<number>(a0?.minute ?? 7 * 60)
  const [slot, setSlot] = useState<Slot>(a0?.slot ?? 'anytime')
  const [days, setDays] = useState<number[]>(base?.schedule.weekdays ?? [...EVERY_DAY])
  const [minText, setMinText] = useState(base?.minimumText ?? '')
  const [minMin, setMinMin] = useState(base?.minimumDurationMin ?? 5)
  const [normalText, setNormalText] = useState(base?.normalText ?? '')
  const [normalMin, setNormalMin] = useState(base?.durationMin ?? 15)
  const [bonusText, setBonusText] = useState(base?.bonusText ?? '')
  const [priority, setPriority] = useState<Priority>(base?.priority ?? 'recommended')
  const [error, setError] = useState<{ field: 'name' | 'days'; text: string } | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const daysRef = useRef<HTMLDivElement>(null)
  /** Shows the message next to its field and brings the field into view (QA area 2 #5). */
  const fail = (field: 'name' | 'days', text: string) => {
    setError({ field, text })
    const el = field === 'name' ? nameRef.current : daysRef.current
    el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    if (field === 'name') nameRef.current?.focus({ preventScroll: true })
  }
  const [violations, setViolations] = useState<CapacityViolation[] | null>(null)
  const [pending, setPending] = useState<Habit | null>(null)

  const cue: CueAnchor =
    kind === 'wake'
      ? anchor({ type: 'wake', offsetMin: 10 })
      : kind === 'prayer'
        ? anchor({ type: 'prayer', prayer, offsetMin: 10 })
        : kind === 'fixedTime'
          ? anchor({ type: 'fixedTime', minute })
          : anchor({ type: 'slot', slot })

  const build = (): Habit | null => {
    const t = title.trim()
    if (t === '') {
      fail('name', 'اكتبي اسم العادة')
      return null
    }
    if (days.length === 0) {
      fail('days', 'اختاري يوم واحد على الأقل')
      return null
    }
    const fields: Partial<Habit> = {
      titleAr: t,
      domain,
      cue: cueLabel(cue),
      schedule: schedule(days.slice().sort(), cue),
      minimumText: minText.trim(),
      minimumDurationMin: Math.min(minMin, normalMin),
      normalText: normalText.trim(),
      durationMin: normalMin,
      bonusText: bonusText.trim(),
      priority,
    }
    return base
      ? { ...base, ...fields }
      : makeHabit({ id: `h_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, domain, titleAr: t, titleEn: '', ...fields })
  }

  const { wake, sheet: wakeSheet } = useDomainWake()
  const domainName = (id: DomainId) => s.domains.find((d) => d.id === id)?.nameAr ?? ''
  const finish = (h: Habit, note?: string) => {
    toast({ message: note ?? (base ? 'انحفظت التعديلات' : `انضافت ${quoted(h.titleAr)}`) })
    stack?.goBack()
  }
  /** After saving: wake her habit's resting domain within the cap, or ask her (never silently over). */
  const settle = async (h: Habit, note?: string) => {
    const o: WakeOutcome = await wake([h])
    if (o === 'kept') finish(h, `انحفظت — ومجال «${domainName(h.domain)}» باقي مرتاح؛ غيّريه من «مجالاتك» في مساري وقت ما تبين`)
    else if (o === 'paused') finish(h, 'انحفظت موقّفة — شغّليها وقت ما يخف يومك')
    else finish(h, note)
  }

  const save = async () => {
    setError(null)
    const h = build()
    if (!h) return
    const v = await store.upsertHabit(h)
    if (v.length > 0) {
      setPending(h)
      setViolations(v)
      return
    }
    await settle(h)
  }

  const resolve = async (mode: 'paused' | 'force') => {
    if (!pending) return
    const h = mode === 'paused' ? { ...pending, status: 'paused' as const } : pending
    await store.upsertHabit(h, true)
    setViolations(null)
    await settle(h, mode === 'paused' ? 'انحفظت موقّفة — شغّليها وقت ما يخف يومك' : undefined)
  }

  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))

  return (
    <Screen
      title={base ? 'عدّلي العادة' : 'عادة جديدة'}
      backLabel="رجوع"
      actions={
        <Button variant="plain" onClick={() => void save()}>
          احفظي
        </Button>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <div className={styles.cta} style={{ display: 'flex', justifyContent: 'flex-end', marginBlockEnd: 'var(--space-2)' }}>
          <Button type="button" variant="plain" onClick={() => navigate(`/studio?mode=wizard${editId ? `&habit=${editId}` : ''}`, { replace: true })}>
            خطوة خطوة
          </Button>
        </div>
        <FormSection header="العادة">
          <div className={styles.form}>
            <label className={styles.field}>
              <span className={styles.label}>الاسم</span>
              <input
                ref={nameRef}
                className={styles.input}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (error?.field === 'name') setError(null)
                }}
                placeholder="مثلًا: مشي هادي"
                autoComplete="off"
                aria-invalid={error?.field === 'name' || undefined}
                aria-describedby={error?.field === 'name' ? 'studio-name-error' : undefined}
              />
              {error?.field === 'name' && (
                <span id="studio-name-error" className={styles.error} role="alert">
                  {error.text}
                </span>
              )}
            </label>
            <div className={styles.field}>
              <span className={styles.label} id="studio-domain">المجال · ولكل مجال وردته</span>
              <div className={styles.flowerPicker} role="radiogroup" aria-labelledby="studio-domain">
                {domains.map((d) => {
                  const on = d.id === domain
                  return (
                    <button
                      key={d.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={styles.flowerOption}
                      data-on={on || undefined}
                      onClick={() => setDomain(d.id)}
                    >
                      <Flower kind={flowerForDomain(d.id)} stage={4} size={40} decorative />
                      <span className={styles.flowerOptionName}>{d.nameAr}</span>
                      <span className={styles.flowerOptionFlower}>{FLOWER_AR[flowerForDomain(d.id)]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className={styles.field}>
              <span className={styles.label}>أهميتها</span>
              <SegmentedControl label="أهمية العادة" segments={PRIORITY_CHOICES} value={priority} onChange={setPriority} />
            </div>
          </div>
        </FormSection>

        <FormSection header="متى" footer={`بتطلع لك: ${cueLabel(cue)} · ${daysCountAr(days.length)}`}>
          <div className={styles.form}>
            <SegmentedControl label="ربطها بـ" segments={ANCHOR_KINDS} value={kind} onChange={setKind} />
            {kind === 'prayer' && (
              <div className={styles.chips} role="radiogroup" aria-label="الصلاة">
                {PRAYER_ANCHORS.map((p) => (
                  <Chip key={p} role="radio" selected={prayer === p} onClick={() => setPrayer(p)}>
                    بعد {PRAYER_AR[p]}
                  </Chip>
                ))}
              </div>
            )}
            {kind === 'fixedTime' && (
              <div className={styles.field}>
                <span className={styles.label} aria-hidden="true">الساعة</span>
                <TimeField label="وقت العادة" selectClassName={styles.input} minute={minute} onChange={setMinute} />
              </div>
            )}
            {kind === 'slot' && (
              <div className={styles.chips} role="radiogroup" aria-label="الفترة">
                {SLOT_CHOICES.map((c) => (
                  <Chip key={c.value} role="radio" selected={slot === c.value} onClick={() => setSlot(c.value)}>
                    {c.label}
                  </Chip>
                ))}
              </div>
            )}
            <div className={styles.field} ref={daysRef}>
              <span className={styles.label} id="studio-days">الأيام</span>
              <div className={styles.chips} role="group" aria-labelledby="studio-days">
                {weekOrder(s.settings.weekStartsOn).map((d) => (
                  <Chip
                    key={d}
                    selected={days.includes(d)}
                    onClick={() => {
                      toggleDay(d)
                      if (error?.field === 'days') setError(null)
                    }}
                  >
                    {WEEKDAY_SHORT[d]}
                  </Chip>
                ))}
              </div>
              {error?.field === 'days' && (
                <span className={styles.error} role="alert">
                  {error.text}
                </span>
              )}
            </div>
          </div>
        </FormSection>

        <FormSection header="الأحجام" footer="النسخة الصغيرة تنحسب كاملة — هي اللي تحمي العادة في الأيام الثقيلة.">
          <div className={styles.form}>
            <label className={styles.field}>
              <span className={styles.label}>النسخة الصغيرة</span>
              <input className={styles.input} value={minText} onChange={(e) => setMinText(e.target.value)} placeholder="مثلًا: 10 دقايق مشي حول البيت" />
            </label>
            <Stepper label="مدة النسخة الصغيرة" value={minMin} onChange={setMinMin} max={normalMin} />
            <label className={styles.field}>
              <span className={styles.label}>العادية</span>
              <input className={styles.input} value={normalText} onChange={(e) => setNormalText(e.target.value)} placeholder="مثلًا: 20 دقيقة مشي" />
            </label>
            <Stepper
              label="مدة العادية"
              value={normalMin}
              onChange={(v) => {
                const n = Math.max(v, 1)
                setNormalMin(n)
                setMinMin((m) => Math.min(m, n)) // the small version never outgrows the normal one
              }}
            />
            <label className={styles.field}>
              <span className={styles.label}>
                زيادة لو ودّك <span className={styles.optional}>(اختياري)</span>
              </span>
              <input className={styles.input} value={bonusText} onChange={(e) => setBonusText(e.target.value)} placeholder="مثلًا: 30 دقيقة مع بودكاست" />
            </label>
          </div>
        </FormSection>

        <div className={styles.cta}>
          <Button type="submit" size="large" block>
            احفظي العادة
          </Button>
        </div>
      </form>

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
