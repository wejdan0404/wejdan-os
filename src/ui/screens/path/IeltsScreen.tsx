import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import {
  addDays,
  dayKey,
  ieltsSkillName,
  ieltsTemplate,
  mockWeakest,
  rotationSkill,
  startOfWeek,
  vocabDue,
  weekday,
  type IeltsSkill,
  type MockTest,
  type VocabCard,
} from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { Sheet } from '../../components/Sheet'
import { StarDottedLine } from '../../components/StarDottedLine'
import { useToast } from '../../components/Toast'
import { dur, ease } from '../../motion'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import { ensureDomainsVisible } from '../../lib/domains'
import { dayLabel, parseLocaleNumber, SectionHead, StarDivider } from './pathKit'
import styles from './Path.module.css'

const SHORT_DAY = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { weekday: 'short' })

const SKILL_HINT: Record<IeltsSkill, string> = {
  reading: 'قطعة وحدة بوقت، وبعدها راجعي الأخطاء.',
  listening: 'تسجيل واحد، وبعده اكتبي الكلمات اللي فاتتك.',
  writing: 'فقرة وحدة مركّزة — Task 1 أو جزء من Task 2.',
  speaking: 'سجّلي نفسك دقيقتين على سؤال واحد، وبعدين اسمعي.',
  mixedReadingListening: 'نص قصير وتسجيل قصير — ولا تطوّلين.',
  lightReview: 'مراجعة خفيفة، أو اختبار تجريبي إذا عندك وقت.',
}

const skillAr = (k: IeltsSkill) => ieltsSkillName(k).ar
const PICKABLE_WEAKEST: IeltsSkill[] = ['reading', 'listening', 'writing', 'speaking']

/** Short labels for the 7-column week grid. */
const SKILL_SHORT: Record<IeltsSkill, string> = {
  reading: 'قراءة',
  listening: 'استماع',
  writing: 'كتابة',
  speaking: 'محادثة',
  mixedReadingListening: 'قراءة + استماع',
  lightReview: 'مراجعة',
}

export default function IeltsScreen() {
  const s = useLife()
  const store = useStore()
  const today = useToday()
  const toast = useToast()
  const reduce = useReducedMotion()

  const habit = s.habits.find((h) => h.domain === 'ielts' && h.status !== 'archived') ?? null
  const weakest = s.settings.ieltsWeakestSkill
  const todaySkill = rotationSkill(weekday(today), weakest)
  const weekStart = startOfWeek(today, s.settings.weekStartsOn)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const due = useMemo(() => vocabDue(s, today), [s, today])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const card = due[Math.min(idx, due.length - 1)] ?? null
  const [addCard, setAddCard] = useState(false)
  const [mockSheet, setMockSheet] = useState<MockTest | 'new' | null>(null)
  const [cardsSheet, setCardsSheet] = useState(false)
  const active = habit?.status === 'active'

  const mocks = [...s.mockTests].sort((a, b) => (a.date < b.date ? 1 : -1))
  const lastMock = mocks[0] ?? null
  const mockWeak = lastMock ? mockWeakest(lastMock) : null

  const enable = async () => {
    const lib = await store.loadLibrary()
    const h = ieltsTemplate(lib, today)
    await store.upsertHabit(h, true)
    const woke = await ensureDomainsVisible(store, s, [h.domain])
    // Say what changed, and undo both (QA area 3 #19).
    toast({
      message: woke.length ? 'تفعّلت خطة IELTS — ومجالها صار «حفاظ» عشان تطلع لك باقتراحات اليوم' : 'تفعّلت خطة IELTS — تطلع لك باقتراحات اليوم',
      actionLabel: 'تراجع',
      onAction: () => {
        void store.deleteHabit(h.id)
        if (woke.length) void store.setDomainState(h.domain, 'rest', true)
      },
    })
  }

  const pause = async () => {
    if (!habit) return
    await store.setHabitStatus(habit.id, 'paused')
    toast({ message: 'وقّفنا خطة IELTS مؤقتًا — ما تطلع باقتراحات اليوم', actionLabel: 'تراجع', onAction: () => void store.setHabitStatus(habit.id, 'active') })
  }
  const resume = async () => {
    if (!habit) return
    await store.setHabitStatus(habit.id, 'active')
    await ensureDomainsVisible(store, s, [habit.domain])
    toast({ message: 'رجعت خطة IELTS' })
  }

  const setWeakest = async (k: IeltsSkill) => {
    if (k === weakest) return
    const prev = weakest
    await store.updateSettings({ ...s.settings, ieltsWeakestSkill: k })
    toast({ message: `يوم الزيادة صار لـ«${skillAr(k)}»`, actionLabel: 'تراجع', onAction: () => void store.updateSettings({ ...store.getSnapshot().settings, ieltsWeakestSkill: prev }) })
  }

  const removeMock = async (m: MockTest) => {
    const tok = await store.deleteMockTest(m.id)
    if (tok) toast({ message: 'انحذفت النتيجة', actionLabel: 'تراجع', onAction: () => void store.undoDelete(tok.token) })
  }

  const grade = async (q: number) => {
    if (!card) return
    await store.reviewVocab(card.id, q)
    setReviewed((n) => n + 1)
    setFlipped(false)
    setIdx(0) // the reviewed card leaves the due list
  }

  return (
    <Screen title="IELTS" backLabel="مساري" subtitle={<Bidi>يوميًا 30–45 د · مهارة وحدة لكل يوم</Bidi>}>
      <div className={styles.stack}>
        {/* Today's skill */}
        <section className={styles.hero} aria-label="مهارة اليوم">
          <span className={styles.nextLabel}>مهارة اليوم</span>
          <h2 className={styles.heroTitle}>{skillAr(todaySkill)}</h2>
          <p className={styles.hint}>
            <Bidi>{SKILL_HINT[todaySkill]}</Bidi>
          </p>
          {!habit && (
            <div className={styles.actions}>
              <Button onClick={() => void enable()}>فعّلي الخطة اليومية</Button>
            </div>
          )}
          {habit && (
            <>
              <p className={styles.hint}>
                {active ? (
                  <>
                    الخطة مفعّلة — تطلع لك في اقتراحات «اليوم» باسم «<Bidi>IELTS — مفردات + مهارة اليوم</Bidi>».
                  </>
                ) : (
                  'الخطة متوقفة — ما تطلع باقتراحات اليوم لين ترجّعينها.'
                )}
              </p>
              <div className={styles.actions}>
                {active ? (
                  <Button variant="plain" onClick={() => void pause()}>
                    وقّفي الخطة مؤقتًا
                  </Button>
                ) : (
                  <Button onClick={() => void resume()}>رجّعي الخطة</Button>
                )}
              </div>
            </>
          )}
        </section>

        {/* Weekly rotation */}
        <SectionHead title="توزيع الأسبوع" />
        <div className={styles.week} role="list" aria-label="مهارة كل يوم">
          {days.map((d) => {
            const sk = rotationSkill(weekday(d), weakest)
            const isToday = dayKey(d) === dayKey(today)
            return (
              <div key={dayKey(d)} role="listitem" className={styles.day} data-today={isToday || undefined} aria-current={isToday ? 'date' : undefined}>
                <span className={styles.dayName}>{SHORT_DAY.format(d)}</span>
                <span className={styles.daySkill} title={skillAr(sk)}>{SKILL_SHORT[sk]}</span>
              </div>
            )
          })}
        </div>
        {/* She decides which skill gets the extra day — nothing switches by itself (QA area 3 #4, #20). */}
        <div className={styles.pad}>
          <label className={styles.field}>
            <span className={styles.label}>المهارة اللي تاخذ يوم زيادة بالأسبوع</span>
            <select className={styles.select} value={weakest} onChange={(e) => void setWeakest(e.target.value as IeltsSkill)}>
              {PICKABLE_WEAKEST.map((k) => (
                <option key={k} value={k}>
                  {skillAr(k)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className={`${styles.hint} ${styles.padded}`}>
          {lastMock
            ? mockWeak && mockWeak !== weakest
              ? `آخر اختبار تجريبي يقول أضعف مهارة: «${skillAr(mockWeak)}» — القرار لك.`
              : 'نفس المهارة اللي طلعت أضعف في آخر اختبار تجريبي.'
            : 'اختاريها أنتِ، أو سجّلي درجة اختبار تجريبي تحت ونقترح لك.'}
        </p>

        <StarDivider />

        {/* Vocab review */}
        <SectionHead
          title="مراجعة المفردات"
          action={
            <span className={styles.actions}>
              {s.vocabCards.length > 0 && (
                <button type="button" className={styles.linkBtn} onClick={() => setCardsSheet(true)}>
                  بطاقاتك
                </button>
              )}
              <button type="button" className={styles.linkBtn} onClick={() => setAddCard(true)}>
                بطاقة جديدة
              </button>
            </span>
          }
        />
        {card ? (
          <>
            <StarDottedLine total={Math.min(due.length + reviewed, 12)} done={Math.min(reviewed, 12)} label={`راجعتي ${reviewed}، باقي ${due.length}`} />
            <AnimatePresence mode="wait" initial={false}>
              <motion.button
                key={card.id + String(flipped)}
                type="button"
                className={styles.flash}
                onClick={() => setFlipped((f) => !f)}
                aria-label={flipped ? `${card.front}: ${card.back}` : `${card.front} — اضغطي عشان تشوفين المعنى`}
                initial={reduce ? { opacity: 0 } : { opacity: 0, rotateX: -12, y: 8 }}
                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, rotateX: 12, y: -8 }}
                transition={{ duration: dur.base, ease: ease.standard }}
              >
                <bdi dir="ltr" className={styles.flashFront}>
                  {card.front}
                </bdi>
                {flipped ? (
                  <>
                    <span className={styles.flashBack}>
                      <Bidi>{card.back}</Bidi>
                    </span>
                    {card.example && (
                      <bdi dir="ltr" className={styles.flashExample}>
                        {card.example}
                      </bdi>
                    )}
                  </>
                ) : (
                  <span className={styles.flashHint}>اضغطي عشان تشوفين المعنى</span>
                )}
              </motion.button>
            </AnimatePresence>
            {flipped && (
              <div className={styles.grades}>
                <Button variant="secondary" onClick={() => void grade(1)}>
                  ما تذكرتها
                </Button>
                <Button variant="secondary" onClick={() => void grade(3)}>
                  صعبة
                </Button>
                <Button onClick={() => void grade(5)}>سهلة</Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title={reviewed > 0 ? 'خلّصتي مراجعة اليوم' : s.vocabCards.length ? 'ما فيه بطاقات تنتظرك اليوم' : 'ما عندك بطاقات للحين'}
            body={s.vocabCards.length ? 'البطاقات ترجع لك بمواعيدها — مراجعة متباعدة.' : 'أضيفي كلمة جديدة كل ما مرّت عليك، وهي ترجع لك بوقتها.'}
            action={
              <Button variant="secondary" onClick={() => setAddCard(true)}>
                أضيفي بطاقة
              </Button>
            }
          />
        )}

        <StarDivider star={false} />

        {/* Mock tests */}
        <InsetGroupedList
          header="الاختبارات التجريبية"
          headerAction={
            <button type="button" className={styles.linkBtn} onClick={() => setMockSheet('new')}>
              سجّلي نتيجة
            </button>
          }
          footer={mockWeak && mockWeak !== weakest ? undefined : 'الدرجات تساعد التطبيق يعرف وش المهارة الأضعف.'}
        >
          {mocks.length === 0 ? (
            <ListRow title="ما سجّلتي اختبار للحين" subtitle="بعد أي اختبار تجريبي، سجّلي الدرجات هنا." muted />
          ) : (
            mocks.slice(0, 5).map((m) => (
              <ListRow
                key={m.id}
                title={dayLabel(m.date)}
                subtitle={<MockBands m={m} />}
                chevron
                onClick={() => setMockSheet(m)}
                trailingActions={[{ key: 'del', label: 'احذفي', tone: 'destructive', onAction: () => void removeMock(m) }]}
                menu={[
                  { key: 'edit', label: 'عدّليها', onSelect: () => setMockSheet(m) },
                  { key: 'del', label: 'احذفي النتيجة', destructive: true, onSelect: () => void removeMock(m) },
                ]}
              />
            ))
          )}
        </InsetGroupedList>
        {mockWeak && mockWeak !== weakest && (
          <div className={styles.pad}>
            <Button variant="secondary" block onClick={() => void setWeakest(mockWeak)}>
              خلّي «{skillAr(mockWeak)}» المهارة الأضعف
            </Button>
          </div>
        )}
      </div>

      <AddCardSheet open={addCard} onClose={() => setAddCard(false)} />
      <MockSheet mock={mockSheet} onClose={() => setMockSheet(null)} />
      <CardsSheet open={cardsSheet} onClose={() => setCardsSheet(false)} />
    </Screen>
  )
}

function MockBands({ m }: { m: MockTest }) {
  const parts: [string, number | null][] = [
    ['قراءة', m.reading],
    ['استماع', m.listening],
    ['كتابة', m.writing],
    ['محادثة', m.speaking],
  ]
  return (
    <>
      {parts
        .filter(([, v]) => v != null)
        .map(([k, v], i) => (
          <span key={k}>
            {i > 0 && ' · '}
            {k} <bdi className={styles.num}>{v}</bdi>
          </span>
        ))}
    </>
  )
}

function AddCardSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [example, setExample] = useState('')
  const save = async () => {
    if (!front.trim() || !back.trim()) return
    await store.addVocabCard(front.trim(), back.trim(), example.trim())
    setFront('')
    setBack('')
    setExample('')
    toast({ message: 'انضافت البطاقة' })
  }
  return (
    <Sheet open={open} onClose={onClose} title="بطاقة جديدة" detents={['large']}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label className={styles.field}>
          <span className={styles.label}>الكلمة</span>
          <input className={styles.input} dir="ltr" lang="en" value={front} onChange={(e) => setFront(e.target.value)} placeholder="e.g. resilient" autoFocus />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>المعنى</span>
          <input className={styles.input} value={back} onChange={(e) => setBack(e.target.value)} placeholder="بكلماتك" />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>جملة مثال (اختياري)</span>
          <input className={styles.input} dir="ltr" lang="en" value={example} onChange={(e) => setExample(e.target.value)} />
        </label>
        <p className={styles.hint}>تقدرين تضيفين أكثر من وحدة ورا بعض — الورقة تبقى مفتوحة.</p>
        <div className={styles.actions}>
          <Button type="submit" disabled={!front.trim() || !back.trim()}>
            أضيفي
          </Button>
          <Button variant="plain" onClick={onClose}>
            خلاص
          </Button>
        </div>
      </form>
    </Sheet>
  )
}

const BAND_KEYS = [
  ['reading', 'قراءة'],
  ['listening', 'استماع'],
  ['writing', 'كتابة'],
  ['speaking', 'محادثة'],
] as const

/** Add or edit a mock result — with clear feedback on out-of-range / rounded bands (QA area 3 #8, #16). */
function MockSheet({ mock, onClose }: { mock: MockTest | 'new' | null; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const today = useToday()
  const editing = mock && mock !== 'new' ? mock : null
  const [key, setKey] = useState<string | null>(null)
  const [vals, setVals] = useState<Record<string, string>>({})
  const [date, setDate] = useState('')
  const k = editing ? editing.id : mock === 'new' ? 'new' : null
  if (k !== key) {
    setKey(k)
    setVals(editing ? Object.fromEntries(BAND_KEYS.map(([b]) => [b, editing[b] == null ? '' : String(editing[b])])) : {})
    setDate(editing?.date ?? dayKey(today))
  }
  const check = (v: string | undefined): { value: number | null; error: string | null; note: string | null } => {
    if (!v || !v.trim()) return { value: null, error: null, note: null }
    const n = parseLocaleNumber(v)
    if (!Number.isFinite(n) || n < 0 || n > 9) return { value: null, error: 'الدرجة من 0 لين 9', note: null }
    const r = Math.round(n * 2) / 2
    return { value: r, error: null, note: r !== n ? `نقرّبها لأقرب نص درجة: ${r}` : null }
  }
  const checks = Object.fromEntries(BAND_KEYS.map(([b]) => [b, check(vals[b])])) as Record<string, ReturnType<typeof check>>
  const hasError = Object.values(checks).some((c) => c.error)
  const any = Object.values(checks).some((c) => c.value != null)
  const save = async () => {
    if (!any || hasError) return
    const m: MockTest = {
      id: editing?.id ?? store.newId('mock'),
      date: date || dayKey(today),
      reading: checks.reading!.value,
      listening: checks.listening!.value,
      writing: checks.writing!.value,
      speaking: checks.speaking!.value,
      note: editing?.note ?? '',
    }
    if (editing) await store.updateMockTest(m)
    else await store.addMockTest(m)
    onClose()
    toast(editing ? { message: 'انحفظ التعديل' } : { message: 'انحفظت النتيجة', actionLabel: 'تراجع', onAction: () => void store.deleteMockTest(m.id) })
  }
  return (
    <Sheet open={mock != null} onClose={onClose} title={editing ? 'عدّلي النتيجة' : 'نتيجة اختبار تجريبي'} detents={['medium', 'large']}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label className={styles.field}>
          <span className={styles.label}>تاريخ الاختبار</span>
          <input type="date" className={styles.input} dir="ltr" value={date} max={dayKey(today)} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className={styles.bands}>
          {BAND_KEYS.map(([b, label]) => (
            <label key={b} className={styles.field}>
              <span className={styles.label}>{label}</span>
              <input
                className={`${styles.input} ${styles.num}`}
                inputMode="decimal"
                dir="ltr"
                value={vals[b] ?? ''}
                onChange={(e) => setVals((v) => ({ ...v, [b]: e.target.value }))}
                placeholder="0–9"
                aria-label={`درجة ${label}`}
                aria-invalid={checks[b]!.error ? true : undefined}
              />
            </label>
          ))}
        </div>
        {BAND_KEYS.map(([b, label]) =>
          checks[b]!.error ? (
            <p key={b} className={styles.fieldError} role="alert">
              {label}: {checks[b]!.error}
            </p>
          ) : checks[b]!.note ? (
            <p key={b} className={styles.hint}>
              {label}: <Bidi>{checks[b]!.note!}</Bidi>
            </p>
          ) : null,
        )}
        <p className={styles.hint}>اكتبي اللي عندك بس — مو لازم الأربع.</p>
        <Button type="submit" size="large" block disabled={!any || hasError}>
          احفظي
        </Button>
      </form>
    </Sheet>
  )
}

/** All vocab cards — fix a typo or remove one (QA area 3 #8). */
function CardsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useLife()
  const store = useStore()
  const toast = useToast()
  const [editing, setEditing] = useState<VocabCard | null>(null)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [example, setExample] = useState('')
  const cards = [...s.vocabCards].sort((a, b) => a.front.localeCompare(b.front, 'en'))
  const startEdit = (c: VocabCard) => {
    setEditing(c)
    setFront(c.front)
    setBack(c.back)
    setExample(c.example)
  }
  const saveEdit = async () => {
    if (!editing || !front.trim() || !back.trim()) return
    await store.updateVocabCard({ ...editing, front: front.trim(), back: back.trim(), example: example.trim() })
    setEditing(null)
    toast({ message: 'انحفظت البطاقة' })
  }
  const remove = async (c: VocabCard) => {
    const tok = await store.deleteVocabCard(c.id)
    if (editing?.id === c.id) setEditing(null)
    if (tok) toast({ message: 'انحذفت البطاقة', actionLabel: 'تراجع', onAction: () => void store.undoDelete(tok.token) })
  }
  return (
    <Sheet open={open} onClose={onClose} title="بطاقاتك" detents={['large']}>
      {editing ? (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault()
            void saveEdit()
          }}
        >
          <label className={styles.field}>
            <span className={styles.label}>الكلمة</span>
            <input className={styles.input} dir="ltr" lang="en" value={front} onChange={(e) => setFront(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>المعنى</span>
            <input className={styles.input} value={back} onChange={(e) => setBack(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>جملة مثال (اختياري)</span>
            <input className={styles.input} dir="ltr" lang="en" value={example} onChange={(e) => setExample(e.target.value)} />
          </label>
          <div className={styles.actions}>
            <Button type="submit" disabled={!front.trim() || !back.trim()}>
              احفظي
            </Button>
            <Button variant="plain" onClick={() => setEditing(null)}>
              رجوع للقائمة
            </Button>
          </div>
        </form>
      ) : (
        <InsetGroupedList flush footer={cards.length ? 'اسحبي البطاقة أو اضغطي «…» عشان تعدّلينها أو تحذفينها.' : undefined}>
          {cards.length === 0 ? (
            <ListRow title="ما عندك بطاقات" muted />
          ) : (
            cards.map((c) => (
              <ListRow
                key={c.id}
                title={
                  <bdi dir="ltr" lang="en">
                    {c.front}
                  </bdi>
                }
                subtitle={<Bidi>{c.back}</Bidi>}
                onClick={() => startEdit(c)}
                trailingActions={[{ key: 'del', label: 'احذفي', tone: 'destructive', onAction: () => void remove(c) }]}
                menu={[
                  { key: 'edit', label: 'عدّليها', onSelect: () => startEdit(c) },
                  { key: 'del', label: 'احذفي البطاقة', destructive: true, onSelect: () => void remove(c) },
                ]}
              />
            ))
          )}
        </InsetGroupedList>
      )}
    </Sheet>
  )
}
