/**
 * راجعي الدفعة قبل ما تنضاف — every item found in a file, with its type, source line,
 * status (مؤكدة / اقتراح / ناقصة / متعارضة), duplicates and conflicts side by side.
 * She approves / edits / ignores each one; only approved items are added, each to its
 * place (inbox, ideas, notes) — never to today's plan.
 */
import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CANDIDATE_TYPES, batchSummary, isSafeToBulkApprove, missingFields, targetOf,
  type CandidateDecision, type CandidateType, type ImportBatch, type ImportCandidate,
} from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import type { MenuItem } from '../../components/ContextMenu'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow, type SwipeAction } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { SegmentedControl } from '../../components/SegmentedControl'
import { Sheet } from '../../components/Sheet'
import { StarMark } from '../../components/StarMark'
import { TimeField } from '../../components/TimeField'
import { useToast } from '../../components/Toast'
import { Icon, type IconName } from '../../icons/Icon'
import { useLife, useStore } from '../../state/LifeStore'
import {
  Badge, FileName, destinationOf, isFlagged, isoDayLabel, items, missingLabel, statusLabel, statusTone, typeLabel,
} from './sourcesKit'
import styles from './sources.module.css'

type Filter = 'needs' | 'approved' | 'all'

/** «HH:MM» ↔ minutes after midnight. */
const toMinute = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t)
  return m ? Number(m[1]) * 60 + Number(m[2]) : 9 * 60
}
const fromMinute = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

const useBatchId = () => {
  const { pathname } = useLocation()
  return decodeURIComponent(pathname.split('/').filter(Boolean).pop() ?? '')
}

const DECISION_AR: Record<CandidateDecision, string> = { pending: 'تبي قرارك', approved: 'اعتمدتيها', ignored: 'تجاهلتيها' }
/** After the batch is added there is nothing left to decide (QA area 5 #15). */
const COMMITTED_AR: Record<CandidateDecision, string> = { pending: 'ما انضافت', approved: 'انضافت', ignored: 'تجاهلتيها' }

const PLACE: Record<ReturnType<typeof targetOf>, string> = { task: 'الوارد', inbox: 'الوارد', project: 'أفكار مساري', note: 'الملاحظات' }
const joinAr = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join('، ')} و${xs[xs.length - 1]}`)

function DecisionMark({ d, committed = false }: { d: CandidateDecision; committed?: boolean }) {
  return (
    <span className={styles.decision} data-d={committed && d === 'pending' ? 'ignored' : d}>
      {d === 'approved' && <Icon name="check" size={16} />}
      {(committed ? COMMITTED_AR : DECISION_AR)[d]}
    </span>
  )
}

/** Type → a small icon for the row's leading slot (the type's name sits in the meta line, so a
 *  wide chip never overlaps the status badge — QA area 5 #3). */
const TYPE_ICON: Record<CandidateType, IconName> = {
  task: 'check', routine: 'habits', project: 'path', goal: 'sparkle', appointment: 'calendar',
  note: 'book', idea: 'drop', preference: 'heart', reference: 'link',
}

/**
 * The row's meta line: type · status · missing · as-written date · duplicate · source line.
 * Every part is its own bidi isolate with a «·» between parts, so dates, Latin keys and «›»
 * never run into each other (QA area 5 #3).
 */
function CandidateMeta({ c }: { c: ImportCandidate }) {
  const miss = missingFields(c)
  const dupe = c.matches.find((m) => m.relation === 'duplicate')
  const parts: ReactNode[] = [
    <span key="type" className={styles.metaType}>{typeLabel(c.type)}</span>,
    c.status === 'confirmed' ? (
      <span key="status" className={styles.decision} data-d="approved" style={{ color: 'var(--text-accent)' }}>
        {/* identity: no star per row — the one ✦ on this screen is the footer's promise */}
        <Icon name="check" size={14} />
        مؤكدة من مصدرها
      </span>
    ) : (
      <Badge key="status" tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge>
    ),
  ]
  if (miss.length > 0) parts.push(<span key="miss">ناقص: {missingLabel(miss)}</span>)
  if (c.rawDate)
    parts.push(
      <span key="raw">
        التاريخ كما كُتب: «<bdi>{c.rawDate}</bdi>» — ما نخمّنه
      </span>,
    )
  if (dupe)
    parts.push(
      <span key="dupe">
        {dupe.entity === 'candidate' ? (
          <bdi>{dupe.detail}</bdi>
        ) : (
          <>
            موجود عندك: «<bdi>{dupe.title.trim()}</bdi>»
          </>
        )}
      </span>,
    )
  parts.push(
    <span key="loc" className={styles.metaLoc}>
      <bdi>{c.sourceRef.location}</bdi>
    </span>,
  )
  return (
    <span className={styles.metaLine}>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <span className={styles.metaSep} aria-hidden="true">·</span>}
          {p}
        </Fragment>
      ))}
    </span>
  )
}

export default function ImportReviewScreen() {
  const id = useBatchId()
  const s = useLife()
  const store = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const batch: ImportBatch | null = s.importBatches.find((b) => b.id === id) ?? null

  const sum = batch ? batchSummary(batch) : null
  const [filter, setFilter] = useState<Filter>(sum && sum.pending > 0 ? 'needs' : 'all')
  const [editing, setEditing] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [picks, setPicks] = useState<Record<string, string>>({})
  const queue = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    if (sum && sum.pending === 0 && filter === 'needs') setFilter('all')
  }, [sum?.pending]) // eslint-disable-line react-hooks/exhaustive-deps

  const byId = useMemo(() => new Map((batch?.candidates ?? []).map((c) => [c.id, c])), [batch])

  // conflicts between two lines of the file → one side-by-side card per pair (pending only)
  const pairs = useMemo(() => {
    if (!batch) return [] as [ImportCandidate, ImportCandidate][]
    const seen = new Set<string>()
    const out: [ImportCandidate, ImportCandidate][] = []
    for (const c of batch.candidates) {
      if (c.decision !== 'pending' || c.status !== 'conflict') continue
      for (const m of c.matches) {
        if (m.relation !== 'conflict' || m.entity !== 'candidate') continue
        const o = byId.get(m.id)
        if (!o || o.decision !== 'pending') continue
        const key = [c.id, o.id].sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)
        out.push([c, o])
      }
    }
    return out
  }, [batch, byId])
  const inPair = useMemo(() => new Set(pairs.flatMap(([a, b]) => [a.id, b.id])), [pairs])

  if (!batch || !sum) {
    return (
      <Screen title="مراجعة الدفعة" backLabel="المصادر" ground="tinted">
        <EmptyState
          title="الدفعة مو موجودة"
          body="يمكن تجاهلتيها أو انضافت قبل. ارجعي للمصادر وشوفي الملفات."
          action={<Button onClick={() => navigate('/me/sources')}>المصادر</Button>}
        />
      </Screen>
    )
  }

  const committed = batch.committedAt != null
  /** Decisions on one batch run one after another (each write reads the latest batch), even on fast taps. */
  const enqueue = <T,>(fn: () => Promise<T>): Promise<T> => {
    const next = queue.current.then(fn, fn)
    queue.current = next.catch(() => undefined)
    return next
  }
  const decide = (cid: string, d: CandidateDecision) => void enqueue(() => store.reviewCandidate(batch.id, cid, d))
  const decideMany = (list: [string, CandidateDecision][]) => list.forEach(([cid, d]) => decide(cid, d))
  const safeCount = batch.candidates.filter((c) => c.decision === 'pending' && isSafeToBulkApprove(c)).length

  const approveSafe = () =>
    void enqueue(() => store.decideAll(batch.id, 'approved')).then((b) => {
      const left = b ? b.candidates.filter((c) => c.decision === 'pending').length : 0
      toast({ message: left > 0 ? `اعتمدنا الواضحة — ${items(left)} تبي قرارك` : 'اعتمدنا الواضحة كلها' })
    })

  const commit = () => {
    setConfirming(false)
    // name only the places this batch actually goes to (QA area 5 #19)
    const where = [...new Set(batch.candidates.filter((c) => c.decision === 'approved').map((c) => PLACE[targetOf(c.type)]))]
    void enqueue(() => store.commitImport(batch.id)).then(({ added, undo }) => {
      if (added === 0) {
        toast({ message: 'ما انضاف شي — ما فيه شي معتمد' })
        return
      }
      toast({
        message: `انضاف ${items(added)} — ${where.length ? `في ${joinAr(where)}` : 'كل واحد في مكانه'}، مو في يومك`,
        actionLabel: undo ? 'تراجع' : undefined,
        onAction: undo ? () => void store.undoDelete(undo.token) : undefined,
      })
    })
  }
  const onCommit = () => (sum.pending > 0 ? setConfirming(true) : commit())

  const visible = batch.candidates.filter((c) => {
    if (!committed && inPair.has(c.id)) return false
    if (filter === 'needs') return c.decision === 'pending'
    if (filter === 'approved') return c.decision === 'approved'
    return true
  })
  const flaggedVisible = visible.filter((c) => c.decision === 'pending' && isFlagged(c))
  const restVisible = visible.filter((c) => !(c.decision === 'pending' && isFlagged(c)))

  const rowMenu = (c: ImportCandidate): MenuItem[] => [
    { key: 'approve', label: 'اعتمديها', icon: <Icon name="check" size={18} />, onSelect: () => decide(c.id, 'approved') },
    { key: 'edit', label: 'عدّليها', icon: <Icon name="edit" size={18} />, onSelect: () => setEditing(c.id) },
    ...(c.decision !== 'pending'
      ? [{ key: 'pending', label: 'رجّعيها لقرارك', icon: <Icon name="undo" size={18} />, onSelect: () => decide(c.id, 'pending') }]
      : []),
    { key: 'ignore', label: 'تجاهليها', icon: <Icon name="close" size={18} />, destructive: true, onSelect: () => decide(c.id, 'ignored') },
  ]
  const leadingActions = (c: ImportCandidate): SwipeAction[] => [
    { key: 'approve', label: 'اعتمدي', icon: <Icon name="check" size={20} />, tone: 'success', onAction: () => decide(c.id, 'approved') },
  ]
  const trailingActions = (c: ImportCandidate): SwipeAction[] => [
    { key: 'ignore', label: 'تجاهلي', icon: <Icon name="close" size={20} />, tone: 'neutral', onAction: () => decide(c.id, 'ignored') },
  ]

  const row = (c: ImportCandidate) => (
    <ListRow
      key={c.id}
      leading={<Icon name={TYPE_ICON[c.type]} size={18} aria-hidden />}
      title={<Bidi>{c.title.trim() === '' ? 'بدون عنوان' : c.title}</Bidi>}
      subtitle={<CandidateMeta c={c} />}
      trailing={
        !committed && c.decision === 'pending' && missingFields(c).length > 0 ? (
          <span className={styles.decision}>حدّدي</span>
        ) : (
          <DecisionMark d={c.decision} committed={committed} />
        )
      }
      onClick={committed ? undefined : () => setEditing(c.id)}
      menu={committed ? undefined : rowMenu(c)}
      moreButton={!committed}
      leadingActions={committed ? [] : leadingActions(c)}
      trailingActions={committed ? [] : trailingActions(c)}
      muted={c.decision === 'ignored'}
    />
  )

  const editingC = editing ? byId.get(editing) ?? null : null

  return (
    <Screen title={committed ? 'انضافت الدفعة' : 'راجعي قبل ما تنضاف'} backLabel="المصادر" ground="tinted">
      <div className={styles.stack}>
        <p className={styles.summary}>
          {committed ? (
            <>
              من «<FileName name={batch.fileName} />» انضاف <Bidi>{items(batch.created.length)}</Bidi> — كل واحد في مكانه، ولا شي في يومك.
            </>
          ) : (
            <>
              <Bidi>{items(sum.total)}</Bidi> من «<FileName name={batch.fileName} />» · اللي تعتمدينه يروح مكانه، مو ليومك.
            </>
          )}
        </p>

        {!committed && (
          <>
            <div className={styles.filters}>
              <SegmentedControl<Filter>
                label="تصفية العناصر"
                value={filter}
                onChange={setFilter}
                segments={[
                  { value: 'all', label: `الكل ${sum.total}` },
                  { value: 'needs', label: `تبي قرارك ${sum.pending}` },
                  { value: 'approved', label: `اعتمدتيها ${sum.approved}` },
                ]}
              />
            </div>
            {safeCount > 0 && (
              <div className={styles.toolbar}>
                <Button variant="secondary" icon={<Icon name="check" size={18} />} onClick={approveSafe}>
                  <Bidi>{`اعتمدي الواضحة (${safeCount})`}</Bidi>
                </Button>
              </div>
            )}
          </>
        )}

        {!committed &&
          filter !== 'approved' &&
          pairs.map(([a, b]) => {
            const key = [a.id, b.id].sort().join('|')
            const picked = picks[key] ?? a.id
            const other = picked === a.id ? b : a
            return (
              <section key={key} className={styles.conflict} aria-label="تعارض">
                <div className={styles.conflictHead}>
                  <span className={styles.typeChip}>{typeLabel(a.type)}</span>
                  <Badge tone="error">تعارض</Badge>
                  <span className={styles.conflictHint}>نسختين — أي وحدة؟</span>
                </div>
                <div className={styles.pair}>
                  {[a, b].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={styles.side}
                      aria-pressed={picked === c.id}
                      onClick={() => setPicks((p) => ({ ...p, [key]: c.id }))}
                    >
                      <span className={styles.sideTitle}><Bidi>{c.title}</Bidi></span>
                      <span className={styles.sideMeta}><Bidi>{c.sourceRef.location}</Bidi></span>
                      <span className={styles.sideMeta}>{isoDayLabel(c.date) ?? 'بدون تاريخ'}</span>
                      {picked === c.id && <span className={styles.sidePick}>المختارة</span>}
                    </button>
                  ))}
                </div>
                <div className={styles.conflictActions}>
                  <Button
                    onClick={() => decideMany([[picked, 'approved'], [other.id, 'ignored']])}
                  >
                    اعتمدي المختارة
                  </Button>
                  <Button
                    variant="plain"
                    onClick={() => decideMany([[a.id, 'approved'], [b.id, 'approved']])}
                  >
                    خلّي الثنتين
                  </Button>
                  <Button
                    variant="plain"
                    onClick={() => decideMany([[a.id, 'ignored'], [b.id, 'ignored']])}
                  >
                    تجاهلي
                  </Button>
                </div>
              </section>
            )
          })}

        {!committed &&
          filter !== 'approved' &&
          flaggedVisible
            .filter((c) => c.status === 'conflict' && c.matches.some((m) => m.relation === 'conflict' && m.entity !== 'candidate'))
            .map((c) => {
              const m = c.matches.find((x) => x.relation === 'conflict' && x.entity !== 'candidate')!
              return (
                <section key={c.id} className={styles.conflict} aria-label="تعارض مع اللي عندك">
                  <div className={styles.conflictHead}>
                    <span className={styles.typeChip}>{typeLabel(c.type)}</span>
                    <Badge tone="error">تعارض</Badge>
                    <span className={styles.conflictHint}>يختلف عن اللي عندك</span>
                  </div>
                  <div className={styles.pair}>
                    <div className={styles.side} style={{ cursor: 'default' }}>
                      <span className={styles.sideMeta}>من الملف</span>
                      <span className={styles.sideTitle}><Bidi>{c.title}</Bidi></span>
                      <span className={styles.sideMeta}><Bidi>{c.sourceRef.location}</Bidi></span>
                    </div>
                    <div className={styles.existing}>
                      <span>عندك الحين</span>
                      <span className={styles.sideTitle} style={{ color: 'var(--text-primary)' }}><Bidi>{m.title}</Bidi></span>
                      <span><Bidi>{m.detail}</Bidi></span>
                    </div>
                  </div>
                  <div className={styles.conflictActions}>
                    <Button onClick={() => decide(c.id, 'approved')}>أضيفيها بعد</Button>
                    <Button variant="plain" onClick={() => setEditing(c.id)}>
                      عدّليها
                    </Button>
                    <Button variant="plain" onClick={() => decide(c.id, 'ignored')}>
                      تجاهليها
                    </Button>
                  </div>
                </section>
              )
            })}

        {(() => {
          const flaggedRows = flaggedVisible.filter(
            (c) => !(c.status === 'conflict' && c.matches.some((m) => m.relation === 'conflict' && m.entity !== 'candidate')),
          )
          return (
            flaggedRows.length > 0 && (
              <InsetGroupedList header="تبي نظرة منك" footer="الناقص نكمّله معك، والمكرر نوريك وينه — ما نخمّن تاريخ ولا تكرار.">
                {flaggedRows.map(row)}
              </InsetGroupedList>
            )
          )
        })()}

        {restVisible.length > 0 && (
          <InsetGroupedList header={committed ? 'كل عناصر الملف' : filter === 'approved' ? 'اعتمدتيها' : 'العناصر'}>{restVisible.map(row)}</InsetGroupedList>
        )}

        {visible.length === 0 && pairs.length === 0 && (
          <EmptyState
            title={filter === 'approved' ? 'ما اعتمدتي شي للحين' : 'خلّصتي المراجعة'}
            body={filter === 'approved' ? 'اسحبي العنصر يمين أو افتحيه واعتمديه.' : 'كل العناصر عليها قرارك — أضيفي المعتمدة تحت.'}
            pattern={false}
          />
        )}

        <p className={styles.note}>
          <StarMark size={12} />
          المعتمدة تروح للوارد أو الأفكار أو الملاحظات — ولا شي يروح ليومك إلا بموافقتك.
        </p>

        {!committed && (
          <div className={styles.footer}>
            {confirming ? (
              <div className={styles.confirm} role="alertdialog" aria-labelledby="commit-confirm">
                <p id="commit-confirm" className={styles.confirmTitle}>
                  <Bidi>{`${items(sum.pending)} لسا تبي قرارك`}</Bidi>
                </p>
                <p className={styles.footerNote} style={{ textAlign: 'start' }}>
                  لو أضفتي الحين، اللي ما قررتي فيها ما راح تنضاف — وتقدرين تستوردين الملف من جديد بعدين.
                </p>
                <div className={styles.row2}>
                  <Button onClick={commit} disabled={sum.approved === 0}>
                    <Bidi>{`أضيفي ${items(sum.approved)} بس`}</Bidi>
                  </Button>
                  <Button variant="plain" onClick={() => setConfirming(false)}>
                    أكمّل المراجعة
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button size="large" block onClick={onCommit} disabled={sum.approved === 0}>
                  <Bidi>{sum.approved === 0 ? 'اعتمدي شي عشان نضيفه' : `أضيفي ${items(sum.approved)}`}</Bidi>
                </Button>
                <p className={styles.footerNote}>
                  {sum.pending > 0 ? 'تقدرين تطلعين وترجعين — الدفعة تنتظرك في «المصادر».' : 'كل عنصر ينحفظ مع مصدره عشان ترجعين له.'}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <CandidateSheet
        candidate={editingC}
        onClose={() => setEditing(null)}
        onSave={async (c, edit, decision) => {
          if (edit) await enqueue(() => store.editCandidate(batch.id, c.id, edit))
          if (decision) await enqueue(() => store.reviewCandidate(batch.id, c.id, decision))
          setEditing(null)
          if (decision === 'approved') toast({ message: 'اعتمدتيها' })
          else if (decision === 'ignored') toast({ message: 'تجاهلتيها — ما راح تنضاف' })
          else if (edit) toast({ message: 'انحفظ التعديل' })
        }}
      />
    </Screen>
  )
}

// ---- detail / edit sheet ---------------------------------------------------------------------

type Edit = { type?: CandidateType; title?: string; body?: string; date?: string | null; time?: string | null }

function CandidateSheet({
  candidate: c,
  onClose,
  onSave,
}: {
  candidate: ImportCandidate | null
  onClose: () => void
  onSave: (c: ImportCandidate, edit: Edit | null, decision: CandidateDecision | null) => Promise<void>
}) {
  const [type, setType] = useState<CandidateType>('note')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  useEffect(() => {
    if (!c) return
    setType(c.type)
    setTitle(c.title)
    setBody(c.body)
    setDate(c.date ?? '')
    setTime(c.time ?? '')
  }, [c?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const diff = (): Edit | null => {
    if (!c) return null
    const e: Edit = {}
    if (type !== c.type) e.type = type
    if (title.trim() !== c.title) e.title = title
    if (body !== c.body) e.body = body
    if ((date || null) !== c.date) e.date = date || null
    if ((time || null) !== c.time) e.time = time || null
    return Object.keys(e).length > 0 ? e : null
  }
  const save = (decision: CandidateDecision | null) => (ev?: FormEvent) => {
    ev?.preventDefault()
    if (c) void onSave(c, diff(), decision)
  }

  const miss = c ? missingFields(c) : []
  const needsTitle = title.trim() === ''

  return (
    <Sheet open={c != null} onClose={onClose} title={c ? `${typeLabel(c.type)} من الملف` : undefined} detents={['large']}>
      {c && (
        <form className={styles.sheetBody} onSubmit={save(null)}>
          <div className={styles.facts}>
            <span className={styles.fact}>
              <span className={styles.factKey}>المصدر</span>
              <span>
                <FileName name={c.sourceRef.file} /> · <Bidi>{c.sourceRef.location}</Bidi>
              </span>
            </span>
            <span className={styles.fact}>
              <span className={styles.factKey}>الحالة</span>
              <span>
                {c.status === 'confirmed' ? 'مؤكدة من مصدرها' : statusLabel(c.status)}
                {miss.length > 0 ? ` — ناقص: ${missingLabel(miss)}` : ''}
              </span>
            </span>
            {c.rawDate && (
              <span className={styles.fact}>
                <span className={styles.factKey}>التاريخ</span>
                <Bidi>{`مكتوب «${c.rawDate}» — حدّديه أنتِ لو تبين`}</Bidi>
              </span>
            )}
            {c.matches.map((m) => (
              <span key={`${m.entity}:${m.id}`} className={styles.fact}>
                <span className={styles.factKey}>{m.relation === 'conflict' ? 'تعارض' : 'مكرر'}</span>
                <Bidi>{m.entity === 'candidate' ? m.detail : `«${m.title}» — ${m.detail}`}</Bidi>
              </span>
            ))}
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel} id="cand-type">النوع</span>
            <div className={styles.chips} role="group" aria-labelledby="cand-type">
              {CANDIDATE_TYPES.map((t) => (
                <Chip key={t} selected={type === t} onClick={() => setType(t)}>
                  {typeLabel(t)}
                </Chip>
              ))}
            </div>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>العنوان</span>
            <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>تفاصيل</span>
            <textarea className={styles.textarea} value={body} onChange={(e) => setBody(e.target.value)} />
          </label>

          <div className={styles.pairFields}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>التاريخ (اختياري)</span>
              <input type="date" className={`${styles.input} ${styles.ltr}`} value={date} onChange={(e) => setDate(e.target.value)} />
              <span className={styles.fieldHint}>
                {date ? (
                  <>
                    {isoDayLabel(date)}{' '}
                    <button type="button" className={styles.linkBtn} onClick={() => setDate('')}>
                      امسحيه
                    </button>
                  </>
                ) : (
                  'بدون تاريخ — ما نخمّن'
                )}
              </span>
            </label>
            {/* 24-hour picker like the rest of the app (QA area 5 #14) */}
            <div className={styles.field}>
              <span className={styles.fieldLabel}>الوقت (اختياري)</span>
              {time ? (
                <>
                  <TimeField minute={toMinute(time)} onChange={(m) => setTime(fromMinute(m))} label="الوقت" selectClassName={styles.input} />
                  <button type="button" className={styles.linkBtn} onClick={() => setTime('')}>
                    بدون وقت
                  </button>
                </>
              ) : (
                <Button variant="secondary" onClick={() => setTime('09:00')}>
                  حدّدي وقت
                </Button>
              )}
            </div>
          </div>

          <p className={styles.dest}>
            <Icon name="inbox" size={16} />
            <span>
              بتروح: {destinationOf(type)} — ما تنضاف ليومك.
            </span>
          </p>

          <div className={styles.row2}>
            <Button onClick={save('approved')} disabled={needsTitle}>
              {diff() ? 'احفظي واعتمديها' : 'اعتمديها'}
            </Button>
            {diff() && (
              <Button variant="secondary" type="submit">
                احفظي التعديل بس
              </Button>
            )}
            <Button variant="plain" onClick={save('ignored')}>
              تجاهليها
            </Button>
          </div>
        </form>
      )}
    </Sheet>
  )
}
