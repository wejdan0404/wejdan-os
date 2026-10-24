import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  addDays, currentChapter, dayKey, isDoneLevel, postponedTasks, projectNextStep, seasonIsCurrent, startOfWeek,
  type SparkAward,
} from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Switch } from '../../components/Switch'
import { Button } from '../../components/Button'
import { Icon } from '../../icons/Icon'
import { Chip } from '../../components/Chip'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { SegmentedControl } from '../../components/SegmentedControl'
import { StarDottedLine } from '../../components/StarDottedLine'
import { StarMark } from '../../components/StarMark'
import { useToast } from '../../components/Toast'
import { dur, ease } from '../../motion'
import { useStack } from '../../shell/stack'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import { nounFor, NOUNS } from '../../lib/plural'
import styles from './WeeklyReview.module.css'
import me from './me.module.css'
import { clearReviewDraft, loadReviewDraft, saveReviewDraft } from './reviewDraft'

const QUESTIONS = ['وش خلّصتي؟', 'وش لسا مهم؟', 'وش تأجلينه دايم؟', 'وش نوقفه؟', 'أولوياتك الجاية؟', 'الخطة ناسبت طاقتك؟'] as const
type Fate = 'keep' | 'inbox' | 'drop'
type Fit = 'light' | 'right' | 'heavy'
const FIT_TEXT: Record<Fit, string | null> = { light: 'الخطة كانت أخف من طاقتي', right: null, heavy: 'الخطة كانت أثقل من طاقتي' }

export default function WeeklyReviewScreen() {
  const s = useLife()
  const store = useStore()
  const today = useToday()
  const toast = useToast()
  const navigate = useNavigate()
  const stack = useStack()
  const reduce = useReducedMotion()
  const started = useRef(Date.now())

  const weekStart = startOfWeek(today, s.settings.weekStartsOn)
  const weekKey = dayKey(weekStart)
  const existing = s.weeklyReviews.find((r) => r.id === weekKey)
  const season = s.seasons.find(seasonIsCurrent)

  // ---- candidate content -------------------------------------------------------------
  const winsSuggested = useMemo(() => {
    const end = dayKey(addDays(weekStart, 6))
    const titleOf = (id: string) =>
      s.habits.find((h) => h.id === id)?.titleAr ?? s.weeklyTasks.find((t) => t.id === id)?.titleAr ?? s.routines.find((r) => r.id === id)?.titleAr ?? null
    const seen = new Set<string>()
    const out: string[] = []
    for (const l of s.logs) {
      if (l.date < weekKey || l.date > end || !isDoneLevel(l.level)) continue
      const t = titleOf(l.itemId)
      if (t && !seen.has(t)) (seen.add(t), out.push(t))
    }
    for (const t of s.tasks) if (t.status === 'done' && t.completedAt && t.completedAt.slice(0, 10) >= weekKey && !seen.has(t.title)) (seen.add(t.title), out.push(t.title))
    return out.slice(0, 12)
  }, [s, weekKey, weekStart])
  const stillImportant = useMemo(
    () => [
      ...s.projects.filter((p) => p.status === 'active').map((p) => ({ id: `p:${p.id}`, title: p.titleAr, sub: projectNextStep(p)?.titleAr ?? 'مشروع' })),
      ...s.tasks.filter((t) => t.status === 'planned' || t.status === 'in_progress').map((t) => ({ id: `t:${t.id}`, title: t.title, sub: 'مهمة' })),
    ],
    [s],
  )
  const deferred = useMemo(() => [...postponedTasks(s).map((t) => ({ id: `t:${t.id}`, title: t.title })), ...s.later.map((p) => ({ id: `l:${p.id}`, title: p.title.ar }))], [s])
  const activeHabits = useMemo(() => s.habits.filter((h) => h.status === 'active'), [s])

  // ---- draft ---------------------------------------------------------------------------------
  // a review in progress resumes at the same step after a reload (kept per week on this device)
  const [draft] = useState(() => loadReviewDraft(weekKey))
  const [step, setStep] = useState(draft?.step ?? 0) // 0 = cover, 1..6 = questions, 7 = done
  const [wins, setWins] = useState<string[]>(draft?.wins ?? existing?.wins ?? [])
  const [winDraft, setWinDraft] = useState('')
  const [important, setImportant] = useState<Set<string>>(() => new Set(draft?.important ?? []))
  const [fates, setFates] = useState<Record<string, Fate>>(draft?.fates ?? {})
  const [pause, setPause] = useState<Set<string>>(() => new Set(draft?.pause ?? []))
  const [top3, setTop3] = useState<string[]>(draft?.top3 ?? existing?.top3 ?? [])
  const [topDraft, setTopDraft] = useState('')
  const [fit, setFit] = useState<Fit>(draft?.fit ?? 'right')
  const [title, setTitle] = useState(draft?.title ?? existing?.chapterTitle ?? '')
  useEffect(() => {
    if (step >= 1 && step <= 6) saveReviewDraft(weekKey, { step, wins, important: [...important], fates, pause: [...pause], top3, fit, title })
    else if (step === 7) clearReviewDraft(weekKey)
  }, [weekKey, step, wins, important, fates, pause, top3, fit, title])
  const [award, setAward] = useState<SparkAward | null>(null)
  const [saving, setSaving] = useState(false)

  const toggleIn = (set: Set<string>, id: string) => {
    const n = new Set(set)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  }
  const topCandidates = [
    ...stillImportant.filter((c) => important.has(c.id)).map((c) => c.title),
    ...s.projects.filter((p) => p.status === 'active').map((p) => projectNextStep(p)?.titleAr).filter((x): x is string => !!x),
  ].filter((v, i, a) => a.indexOf(v) === i)

  /** What the review changed, in her words, plus one way back (QA area 5 #18). */
  const [applied, setApplied] = useState<{ lines: string[]; revert: () => Promise<boolean> } | null>(null)

  const finish = async () => {
    setSaving(true)
    try {
      const lines: string[] = []
      const reverts: (() => Promise<boolean>)[] = []
      for (const [id, f] of Object.entries(fates)) {
        if (f === 'keep') continue
        if (id.startsWith('t:')) {
          const tid = id.slice(2)
          const prev = s.tasks.find((t) => t.id === tid)
          if (!prev) continue
          if (f === 'inbox') await store.returnTaskToInbox(tid)
          else await store.updateTask(tid, { status: 'cancelled' })
          lines.push(f === 'inbox' ? `«${prev.title}» رجعت للوارد` : `«${prev.title}» انشالت`)
          reverts.push(async () => !!(await store.updateTask(tid, { status: prev.status, dueDate: prev.dueDate, postponedTo: prev.postponedTo })))
        } else if (id.startsWith('l:')) {
          const lid = id.slice(2)
          const prev = s.later.find((p) => p.id === lid)
          if (f === 'drop') {
            const tok = await store.dropFromLater(lid)
            if (prev) lines.push(`«${prev.title.ar}» انشالت من «بعدين»`)
            if (tok) reverts.push(() => store.undoDelete(tok.token))
          }
        }
      }
      for (const hid of pause) {
        const prev = s.habits.find((h) => h.id === hid)
        await store.setHabitStatus(hid, 'paused')
        if (prev) {
          lines.push(`«${prev.titleAr}» وقفت فترة`)
          reverts.push(async () => (await store.setHabitStatus(hid, prev.status), true))
        }
      }
      const fitText = FIT_TEXT[fit]
      const a = await store.saveWeeklyReview({
        chapterTitle: title.trim(),
        wins,
        blockers: fitText ? [fitText] : [],
        top3: top3.slice(0, 3),
        experimentId: existing?.experimentId ?? null,
        durationSec: Math.round((Date.now() - started.current) / 1000),
      })
      setAward(a)
      if (reverts.length > 0) {
        const revert = async () => {
          const ok = (await Promise.all(reverts.map((r) => r().catch(() => false)))).every(Boolean)
          setApplied(null)
          toast({ message: ok ? 'رجّعنا كل شي مثل ما كان' : 'رجّعنا اللي نقدر — الباقي تلقينه بسجل التغييرات' })
          return ok
        }
        setApplied({ lines, revert })
        toast({
          message: lines.length === 1 ? 'طبّقنا قرارك' : `طبّقنا ${lines.length} قرارات`,
          actionLabel: 'تراجع',
          onAction: () => void revert(),
        })
      }
      setStep(7)
    } catch {
      toast({ message: 'ما انحفظت المراجعة — جربي مرة ثانية' })
    } finally {
      setSaving(false)
    }
  }

  const back = () => (stack ? stack.goBack() : navigate(-1))
  const variants = {
    in: { opacity: 0, x: reduce ? 0 : -16 },
    on: { opacity: 1, x: 0, transition: { duration: dur.slow, ease: ease.enter } },
    out: { opacity: 0, x: reduce ? 0 : 16, transition: { duration: dur.base, ease: ease.exit } },
  }

  // Step 0 is the ceremonial cover (boards, density 3–4): full-bleed Harlequin band fading into the
  // aurora ground, close + date chips over the pattern, one display title — no page title, no tab bar.
  if (step === 0) {
    const chapter = currentChapter(s, today)
    const weekday = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { weekday: 'long' }).format(today)
    return (
      <div className={styles.coverScreen}>
        <div className={styles.coverBand} aria-hidden="true" />
        <div className={styles.coverChrome}>
          <button type="button" className={styles.coverChip} onClick={back} aria-label="سكّري">
            <Icon name="close" size={18} />
          </button>
          <span className={styles.coverDate}>
            {weekday} · <span className="num">10</span> دقايق
          </span>
        </div>
        <section className={styles.coverContent} aria-labelledby="wr-title">
          <header className={styles.coverHead}>
            <span className={styles.coverEyebrow}>
              {chapter > 0 && (
                <>
                  الفصل <span className="num">{chapter}</span>
                  {season ? ' · ' : ''}
                </>
              )}
              {season ? <Bidi>{season.titleAr}</Bidi> : null}
            </span>
            <h1 id="wr-title" className={styles.coverTitle} tabIndex={-1} data-screen-title="">
              مراجعة الأسبوع
            </h1>
            <p className={styles.coverLede}>مو تقييم — نرتّب الجاي على قد طاقتك.</p>
          </header>
          <ol className={styles.qList}>
            {QUESTIONS.map((q, i) => (
              <li key={q}>
                <span className={styles.qNum}>{i + 1}</span>
                {q}
              </li>
            ))}
          </ol>
          <div className={styles.coverFoot}>
            <Button size="large" block className={styles.coverCta} onClick={() => setStep(1)}>
              {existing ? 'عدّلي مراجعة هالأسبوع' : 'يلا نبدأ'}
            </Button>
            <span className={styles.coverNote}>
              <StarMark size={12} color="#bedaf7" />
              تنتهي بـ <span className="num">5</span> {nounFor(5, NOUNS.spark)}
            </span>
          </div>
        </section>
      </div>
    )
  }

  return (
    <Screen title="المراجعة الأسبوعية" compactTitle="المراجعة" backLabel="أنا" inlineTitle={step > 0 && step < 7}>
      {step > 0 && step < 7 && (
        <div className={styles.progress}>
          <StarDottedLine total={6} done={step - 1} label={`السؤال ${step} من 6`} />
          <span className={styles.stepCount}>
            <span className="num">{step}</span> من <span className="num">6</span>
          </span>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} variants={variants} initial="in" animate="on" exit="out" className={styles.stage}>
          {step > 0 && step < 7 && <h2 className={styles.question}>{QUESTIONS[step - 1]}</h2>}
          {step === 1 && (
            <div className={styles.q}>
              <p className={me.lede + ' ' + me.pad}>اختاري اللي تبين تتذكرينه — حتى الصغير ينحسب.</p>
              {winsSuggested.length > 0 && (
                <div className={`${me.chips} ${me.pad}`}>
                  {winsSuggested.map((w) => (
                    <Chip key={w} selected={wins.includes(w)} onClick={() => setWins((x) => (x.includes(w) ? x.filter((y) => y !== w) : [...x, w]))}>
                      <Bidi>{w}</Bidi>
                    </Chip>
                  ))}
                </div>
              )}
              <AddLine value={winDraft} onChange={setWinDraft} placeholder="شي ثاني خلّصتيه؟" onAdd={() => (setWins((x) => [...x, winDraft.trim()]), setWinDraft(''))} />
              {wins.filter((w) => !winsSuggested.includes(w)).length > 0 && (
                <InsetGroupedList>
                  {wins
                    .filter((w) => !winsSuggested.includes(w))
                    .map((w) => (
                      <ListRow key={w} leading={<StarMark size={12} color="var(--brand-primary)" />} title={<Bidi>{w}</Bidi>} trailingActions={[{ key: 'x', label: 'شيليها', tone: 'destructive', onAction: () => setWins((x) => x.filter((y) => y !== w)) }]} />
                    ))}
                </InsetGroupedList>
              )}
            </div>
          )}

          {step === 2 && (
            <div className={styles.q}>
              <p className={me.lede + ' ' + me.pad}>علّمي اللي لسا يهمك — نرشّح منها أولويات الأسبوع الجاي.</p>
              {stillImportant.length === 0 ? (
                <p className={me.note}>ما فيه مشاريع أو مهام مفتوحة الحين.</p>
              ) : (
                <InsetGroupedList>
                  {stillImportant.map((c) => (
                    <ListRow key={c.id} title={<Bidi>{c.title}</Bidi>} subtitle={<Bidi>{c.sub}</Bidi>} trailing={<Switch checked={important.has(c.id)} onChange={() => setImportant((x) => toggleIn(x, c.id))} label={`لسا مهم: ${c.title}`} />} />
                  ))}
                </InsetGroupedList>
              )}
            </div>
          )}

          {step === 3 && (
            <div className={styles.q}>
              <p className={me.lede + ' ' + me.pad}>اللي ينأجّل كل مرة غالبًا يحتاج قرار — خليه، رجّعيه للوارد، أو شيليه بهدوء.</p>
              {deferred.length === 0 ? (
                <p className={me.note}>ما فيه شي مؤجّل — حلو.</p>
              ) : (
                <InsetGroupedList>
                  {deferred.map((d) => (
                    <div key={d.id} className={styles.fateRow}>
                      <span className={styles.fateTitle}>
                        <Bidi>{d.title}</Bidi>
                      </span>
                      <SegmentedControl<Fate>
                        label={`قرار: ${d.title}`}
                        segments={[
                          { value: 'keep', label: 'خليه' },
                          ...(d.id.startsWith('t:') ? [{ value: 'inbox' as Fate, label: 'للوارد' }] : []),
                          { value: 'drop', label: 'شيليه' },
                        ]}
                        value={fates[d.id] ?? 'keep'}
                        onChange={(v) => setFates((x) => ({ ...x, [d.id]: v }))}
                      />
                    </div>
                  ))}
                </InsetGroupedList>
              )}
            </div>
          )}

          {step === 4 && (
            <div className={styles.q}>
              <p className={me.lede + ' ' + me.pad}>إيقاف مؤقت، مو حذف — ترجّعينها من «عاداتي» متى ما بغيتي.</p>
              {activeHabits.length === 0 ? (
                <p className={me.note}>ما فيه عادات شغّالة.</p>
              ) : (
                <InsetGroupedList>
                  {activeHabits.map((h) => (
                    <ListRow key={h.id} title={<Bidi>{h.titleAr}</Bidi>} subtitle={pause.has(h.id) ? 'بتوقف مؤقتًا' : 'شغّالة'} trailing={<Switch checked={pause.has(h.id)} onChange={() => setPause((x) => toggleIn(x, h.id))} label={`وقّفي ${h.titleAr} مؤقتًا`} />} />
                  ))}
                </InsetGroupedList>
              )}
            </div>
          )}

          {step === 5 && (
            <div className={styles.q}>
              <p className={me.lede + ' ' + me.pad}>
                <span className="num">3</span> بالكثير — أقل وأوضح أحسن.
              </p>
              {top3.length > 0 && (
                <InsetGroupedList header="أولويات الأسبوع الجاي">
                  {top3.map((t, i) => (
                    <ListRow key={t} leading={<span className={styles.rank}>{i + 1}</span>} title={<Bidi>{t}</Bidi>} trailingActions={[{ key: 'x', label: 'شيليها', tone: 'destructive', onAction: () => setTop3((x) => x.filter((y) => y !== t)) }]} />
                  ))}
                </InsetGroupedList>
              )}
              {top3.length < 3 && topCandidates.filter((c) => !top3.includes(c)).length > 0 && (
                <div className={`${me.chips} ${me.pad}`}>
                  {topCandidates
                    .filter((c) => !top3.includes(c))
                    .map((c) => (
                      <Chip key={c} onClick={() => setTop3((x) => (x.length < 3 ? [...x, c] : x))}>
                        <Bidi>{c}</Bidi>
                      </Chip>
                    ))}
                </div>
              )}
              {top3.length < 3 && <AddLine value={topDraft} onChange={setTopDraft} placeholder="أولوية بكلماتك" onAdd={() => (setTop3((x) => [...x, topDraft.trim()].slice(0, 3)), setTopDraft(''))} />}
            </div>
          )}

          {step === 6 && (
            <div className={styles.q}>
              <div className={me.pad}>
                <SegmentedControl<Fit>
                  label="الخطة وطاقتك"
                  segments={[
                    { value: 'light', label: 'أخف' },
                    { value: 'right', label: 'مضبوطة' },
                    { value: 'heavy', label: 'أثقل' },
                  ]}
                  value={fit}
                  onChange={setFit}
                />
              </div>
              <p className={me.note}>{fit === 'heavy' ? 'نخفف الأسبوع الجاي — نسخ أصغر تكفي.' : fit === 'light' ? 'تقدرين تزودين شي بسيط لو حسيتي إنك مرتاحة.' : 'ممتاز — نكمل على نفس الإيقاع.'}</p>
              <label className={`${me.field} ${me.pad}`}>
                <span className={me.fieldLabel}>عطي هالأسبوع اسم (اختياري)</span>
                <input className={me.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلًا: أسبوع الهدوء" />
              </label>
            </div>
          )}

          {step === 7 && (
            <section className={styles.done} aria-live="polite">
              <motion.span initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: dur.slow, ease: ease.enter }}>
                <StarMark size={40} color="var(--brand-primary)" glow label="خلصت المراجعة" />
              </motion.span>
              <h2 className={styles.doneTitle}>{title.trim() ? <Bidi>{title.trim()}</Bidi> : 'خلّصتي مراجعة الأسبوع'}</h2>
              <p className={me.lede}>رتّبتي أسبوعك الجاي. أي شي تأجل ما راح — تلقينه تحت «بعدين».</p>
              {applied && (
                <div className={styles.appliedBox}>
                  <span className={styles.appliedTitle}>اللي تغيّر:</span>
                  <ul className={styles.appliedList}>
                    {applied.lines.map((l) => (
                      <li key={l}>
                        <Bidi>{l}</Bidi>
                      </li>
                    ))}
                  </ul>
                  <Button variant="plain" onClick={() => void applied.revert()}>
                    تراجعي عنها
                  </Button>
                </div>
              )}
              {award && award.amount > 0 && (
                <span className={styles.award}>
                  <StarMark size={10} color="var(--brand-primary)" />
                  <bdi dir="ltr" className="num">+{award.amount}</bdi> {nounFor(award.amount, NOUNS.spark)}
                </span>
              )}
              <Button size="large" block onClick={back}>
                تم
              </Button>
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      {step > 0 && step < 7 && (
        <div className={styles.nav}>
          <Button variant="secondary" onClick={() => setStep((x) => x - 1)}>
            رجوع
          </Button>
          {step < 6 ? (
            <Button onClick={() => setStep((x) => x + 1)}>التالي</Button>
          ) : (
            <Button onClick={() => void finish()} disabled={saving}>
              {saving ? 'نحفظ…' : 'خلّصي المراجعة'}
            </Button>
          )}
        </div>
      )}
    </Screen>
  )
}

function AddLine({ value, onChange, onAdd, placeholder }: { value: string; onChange: (v: string) => void; onAdd: () => void; placeholder: string }) {
  return (
    <form
      className={me.pad}
      style={{ display: 'flex', gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault()
        if (value.trim()) onAdd()
      }}
    >
      <input className={me.input} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} enterKeyHint="done" />
      <Button type="submit" variant="secondary" disabled={!value.trim()}>
        أضيفي
      </Button>
    </form>
  )
}
