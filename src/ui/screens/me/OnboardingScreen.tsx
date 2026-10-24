import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { applyLifeMap, lifeMapFromDomains, makeProduct, type DomainState, type Habit, type LifeMap, type ProductSlot } from '../../../domain'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { SegmentedControl } from '../../components/SegmentedControl'
import { WMark } from '../../components/WMark'
import { dur, ease } from '../../motion'
import { useLife, useStore } from '../../state/LifeStore'
import { ensureDomainsVisible } from '../../lib/domains'
import { MeIcon, newId } from './meKit'
import me from './me.module.css'
import { TimeField } from '../../components/TimeField'
import { Icon } from '../../icons/Icon'
import styles from './Onboarding.module.css'
import { OnboardingRestore } from './OnboardingRestore'
import { LifeMapStep } from './LifeMapStep'
import { onboardingExtraSteps } from './onboardingExtraSteps'
import { clearOnboardingDraft, loadOnboardingDraft, saveOnboardingDraft, takeIntendedRoute } from '../../state/onboardingResume'

/** welcome → name → wake → life map → (extra steps, e.g. joy map) → products → starter habits → privacy. */
const STEP_IDS = ['welcome', 'name', 'wake', 'map', ...onboardingExtraSteps.map((e) => `x:${e.id}`), 'products', 'starters', 'privacy'] as const
const STEPS = STEP_IDS.length - 1
const TIER_OK = (v: unknown): v is DomainState => v === 'grow' || v === 'maintain' || v === 'rest'
/** First run — warm, short, everything optional; ends with onboardingDone. */
export default function OnboardingScreen() {
  const s = useLife()
  const store = useStore()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  // done (or a refresh after finishing) → straight into the app
  const done = s.settings.onboardingDone
  useEffect(() => {
    if (!done) return
    clearOnboardingDraft()
    navigate(takeIntendedRoute(), { replace: true })
  }, [done, navigate])
  // a reload mid-way resumes the same step with what she already typed
  const [draft] = useState(() => loadOnboardingDraft())
  const [step, setStep] = useState(() => Math.min(STEPS, Math.max(0, draft?.step ?? 0)))
  const id = STEP_IDS[step]!
  const extra = id.startsWith('x:') ? onboardingExtraSteps.find((e) => `x:${e.id}` === id) : undefined
  const [name, setName] = useState(draft?.name ?? s.settings.displayName)
  const [wake, setWake] = useState(draft?.wake ?? s.settings.wakeMinute)
  const [sleep, setSleep] = useState(draft?.sleep ?? s.settings.sleepMinute)
  const candidates = useMemo(() => s.domains.filter((d) => d.enabled && !d.sensitive && d.id !== 'joy'), [s.domains])
  const [map, setMap] = useState<LifeMap>(() => {
    const now = lifeMapFromDomains(candidates)
    if (draft?.map) {
      const m: LifeMap = { ...now }
      for (const d of candidates) {
        const v = draft.map[d.id]
        if (TIER_OK(v)) m[d.id] = v
      }
      return m
    }
    if (draft) {
      // an older draft only knew the grow picks
      const m: LifeMap = { ...now }
      for (const d of candidates) m[d.id] = (draft.grow as string[]).includes(d.id) ? 'grow' : now[d.id] === 'grow' ? 'maintain' : now[d.id]
      return m
    }
    return now
  })
  const grow = useMemo(() => candidates.filter((d) => map[d.id] === 'grow').map((d) => d.id), [candidates, map])
  const [prodName, setProdName] = useState('')
  const [prodSlot, setProdSlot] = useState<ProductSlot>('am')
  const [added, setAdded] = useState<{ name: string; slot: ProductSlot }[]>(() => (draft?.added ?? []) as { name: string; slot: ProductSlot }[])
  const [busy, setBusy] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)
  // optional starter habits from the evidence library — nothing preselected
  const [starters, setStarters] = useState<Habit[]>([])
  const [picked, setPicked] = useState<string[]>(() => draft?.picked ?? [])
  useEffect(() => {
    if (done) return
    saveOnboardingDraft({ step, name, wake, sleep, grow, map: map as Record<string, string>, added, picked })
  }, [done, step, name, wake, sleep, grow, map, added, picked])
  useEffect(() => {
    let alive = true
    store
      .starterHabits()
      .then((h) => alive && setStarters(h))
      .catch(() => alive && setStarters([]))
    return () => {
      alive = false
    }
  }, [store])

  const next = () => setStep((x) => Math.min(STEPS, x + 1))
  const prev = () => setStep((x) => Math.max(0, x - 1))

  const finish = async () => {
    setBusy(true)
    try {
      await applyLifeMap(store, candidates, map)
      for (const e of onboardingExtraSteps) await e.finish?.()
      const chosenStarters = starters.filter((h) => picked.includes(h.id))
      await store.addStarterHabits(chosenStarters)
      // a picked habit must actually show up — wake its domain if it was resting (grow ones are set above)
      await ensureDomainsVisible(store, s, chosenStarters.map((h) => h.domain).filter((d) => !grow.includes(d)))
      const order = { am: 100, pm: 100, weekly: 100 } as Record<ProductSlot, number>
      for (const p of added) {
        await store.upsertProduct(makeProduct({ id: newId('prd'), name: p.name, category: 'other', slot: p.slot, order: order[p.slot]++ }))
      }
      await store.updateSettings({ ...s.settings, displayName: name.trim().slice(0, 40), wakeMinute: wake, sleepMinute: sleep, onboardingDone: true })
      clearOnboardingDraft()
    } finally {
      setBusy(false)
    }
  }

  // QA N2: the backup path is its own screen of the flow — nothing is written until she picks one
  if (restoreOpen) {
    return (
      <main className={styles.root} data-step={step}>
        <OnboardingRestore onClose={() => setRestoreOpen(false)} />
      </main>
    )
  }

  const v = {
    in: { opacity: 0, y: reduce ? 0 : 16 },
    on: { opacity: 1, y: 0, transition: { duration: dur.slow, ease: ease.enter } },
    out: { opacity: 0, y: reduce ? 0 : -8, transition: { duration: dur.base, ease: ease.exit } },
  }

  return (
    <main className={styles.root} data-step={step}>
      {step > 0 && (
        <div className={styles.top}>
          <button type="button" className={styles.back} onClick={prev} aria-label="رجوع">
            رجوع
          </button>
          <div
            className={styles.dots}
            role="progressbar"
            aria-label="خطوات البداية"
            aria-valuemin={1}
            aria-valuemax={STEPS}
            aria-valuenow={step}
            aria-valuetext={`الخطوة ${step} من ${STEPS}`}
          >
            {Array.from({ length: STEPS }, (_, i) => (
              <span key={i} className={styles.dot} data-on={i < step || undefined} aria-hidden="true" />
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.main key={step} className={styles.body} variants={v} initial="in" animate="on" exit="out">
          {id === 'welcome' && (
            <div className={styles.welcome}>
              <div className={styles.mark}>
                <WMark size={96} glow />
              </div>
              <h1 className={styles.display}>أهلًا فيك</h1>
              <p className={styles.lede}>مساحتك الشخصية: يومك، مشاريعك، روتينك — على قد طاقتك، وبدون ضغط.</p>
              <ul className={styles.points}>
                <li>
                  <Icon name="check" size={16} style={{ color: 'var(--brand-primary)' }} />
                  نسخة صغيرة تكفي، وتنحسب لك كاملة.
                </li>
                <li>
                  <Icon name="check" size={16} style={{ color: 'var(--brand-primary)' }} />
                  ما يتحرك شي بخطتك إلا بموافقتك.
                </li>
                <li>
                  <MeIcon name="lock" size={14} style={{ color: 'var(--brand-primary)' }} />
                  كل شي محفوظ على جهازك بس.
                </li>
              </ul>
            </div>
          )}

          {id === 'name' && (
            <div className={styles.step}>
              <h1 className={styles.h1}>وش نسمّيك؟</h1>
              <p className={styles.lede}>نستخدمه بالتحية بس. تقدرين تخلينه فاضي.</p>
              <label className={me.field}>
                <span className={me.fieldLabel}>اسمك</span>
                <input className={me.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك أو اسم تحبينه" autoComplete="given-name" enterKeyHint="next" />
              </label>
            </div>
          )}

          {id === 'wake' && (
            <div className={styles.step}>
              <h1 className={styles.h1}>متى يبدأ يومك؟</h1>
              <p className={styles.lede}>نرتّب الاقتراحات حول وقت صحيانك ونومك. تقريبي يكفي.</p>
              <div className={me.field}>
                <span className={me.fieldLabel} aria-hidden="true">تصحين عادة</span>
                <TimeField label="تصحين عادة" selectClassName={`${me.input} ${me.ltrInput}`} minute={wake} onChange={setWake} />
              </div>
              <div className={me.field}>
                <span className={me.fieldLabel} aria-hidden="true">تنامين عادة</span>
                <TimeField label="تنامين عادة" selectClassName={`${me.input} ${me.ltrInput}`} minute={sleep} onChange={setSleep} />
              </div>
            </div>
          )}

          {id === 'map' && <LifeMapStep domains={candidates} map={map} onChange={setMap} />}

          {extra && <extra.Component />}

          {id === 'products' && (
            <div className={styles.step}>
              <h1 className={styles.h1}>منتجاتك (اختياري)</h1>
              <p className={styles.lede}>اكتبي منتجات العناية اللي تستخدمينها، وتطلع لك بروتين الصبح والمسا بالترتيب. تقدرين تسوينها بعدين من «منتجاتي».</p>
              <form
                className={styles.prodForm}
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!prodName.trim()) return
                  setAdded((x) => [...x, { name: prodName.trim(), slot: prodSlot }])
                  setProdName('')
                }}
              >
                <input className={me.input} value={prodName} onChange={(e) => setProdName(e.target.value)} placeholder="مثلًا: غسول …" aria-label="اسم المنتج" />
                <SegmentedControl<ProductSlot>
                  label="وقت المنتج"
                  segments={[
                    { value: 'am', label: 'الصبح' },
                    { value: 'pm', label: 'المسا' },
                    { value: 'weekly', label: 'أسبوعي' },
                  ]}
                  value={prodSlot}
                  onChange={setProdSlot}
                />
                <Button type="submit" variant="secondary" disabled={!prodName.trim()}>
                  أضيفيه
                </Button>
              </form>
              {added.length > 0 && (
                <ol className={styles.prodList}>
                  {added.map((p, i) => (
                    <li key={`${p.name}_${i}`}>
                      <bdi>{p.name}</bdi>
                      <span>{p.slot === 'am' ? 'الصبح' : p.slot === 'pm' ? 'المسا' : 'أسبوعي'}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {id === 'starters' && (
            <div className={styles.step}>
              <h1 className={styles.h1}>عادات تبدين فيها (اختياري)</h1>
              <p className={styles.lede}>كل وحدة لها نسخة صغيرة تكفي. اختاري اللي يناسبك، أو خليها وتضيفينها بعدين من «عاداتي».</p>
              {starters.length > 0 ? (
                <div className={me.chips} role="group" aria-label="عادات تبدين فيها">
                  {starters.map((h) => {
                    const on = picked.includes(h.id)
                    return (
                      <Chip key={h.id} selected={on} onClick={() => setPicked((x) => (on ? x.filter((y) => y !== h.id) : [...x, h.id]))}>
                        <bdi>{h.titleAr}</bdi>
                      </Chip>
                    )
                  })}
                </div>
              ) : (
                <p className={styles.hint}>نجهّز الاقتراحات…</p>
              )}
              {picked.length > 4 && <p className={styles.hint}>اخترتي {picked.length} — البداية بعادتين أو ثلاث أخف عليك.</p>}
            </div>
          )}

          {id === 'privacy' && (
            <div className={styles.step}>
              <div className={styles.mark}>
                <MeIcon name="lock" size={40} style={{ color: 'var(--brand-primary)' }} />
              </div>
              <h1 className={styles.h1}>كل شي على جهازك</h1>
              <ul className={styles.points}>
                <li>
                  <MeIcon name="shield" size={16} style={{ color: 'var(--brand-primary)' }} />
                  ما فيه حساب ولا سيرفر ولا مزامنة.
                </li>
                <li>
                  <MeIcon name="export" size={16} style={{ color: 'var(--brand-primary)' }} />
                  تقدرين تصدّرين نسخة من «الإعدادات» متى ما بغيتي.
                </li>
                <li>
                  <MeIcon name="bell" size={16} style={{ color: 'var(--brand-primary)' }} />
                  التذكيرات مطفية — تشغّلينها إذا بغيتي.
                </li>
              </ul>
            </div>
          )}
        </motion.main>
      </AnimatePresence>

      <footer className={styles.footer}>
        {step === 0 && (
          <>
            <Button size="large" block onClick={next}>
              يلا نبدأ
            </Button>
            {/* QA N2: after «احذفي كل شي» (or on a new phone) the backup is reachable from here */}
            <Button variant="plain" block onClick={() => setRestoreOpen(true)}>
              عندي نسخة احتياطية
            </Button>
          </>
        )}
        {step > 0 && step < STEPS && (
          <>
            <Button size="large" block onClick={next}>
              {(id === 'products' && added.length === 0) || (id === 'starters' && picked.length === 0) || (extra?.isEmpty?.(s) ?? false) ? 'تخطّي' : 'التالي'}
            </Button>
          </>
        )}
        {step === STEPS && (
          <Button size="large" block onClick={() => void finish()} disabled={busy}>
            {busy ? 'نجهّز يومك…' : `يلا${name.trim() ? `، ${name.trim()}` : ''} — ابدئي يومك`}
          </Button>
        )}
      </footer>
    </main>
  )
}
