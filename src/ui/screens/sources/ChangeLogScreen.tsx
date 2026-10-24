/**
 * سجل التغييرات — important edits and deletes, grouped by day, each with a way back
 * (restoreChange). The restore itself is logged, so the toast offers «تراجع» too.
 */
import { useMemo, useState } from 'react'
import { type ChangeEntity, type ChangeEntry, type ChangeOp, type Json } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { SegmentedControl } from '../../components/SegmentedControl'
import { Button } from '../../components/Button'
import { useToast } from '../../components/Toast'
import { Icon, type IconName } from '../../icons/Icon'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import { Tile, clock, dayHeading, isoDayLabel, parseIso } from './sourcesKit'
import styles from './sources.module.css'

type Filter = 'all' | 'delete' | 'update' | 'create'
const PAGE = 60

/** «مهمة», «عادة»… and whether the noun is feminine (for «رجّعيها» vs «رجّعيه»). */
const ENTITY: Record<ChangeEntity, { noun: string; fem: boolean }> = {
  task: { noun: 'مهمة', fem: true },
  inbox: { noun: 'عنصر من الوارد', fem: false },
  habit: { noun: 'عادة', fem: true },
  project: { noun: 'مشروع', fem: false },
  goal: { noun: 'هدف', fem: false },
  product: { noun: 'منتج', fem: false },
  note: { noun: 'ملاحظة', fem: true },
  routine: { noun: 'روتين', fem: false },
  weeklyTask: { noun: 'مهمة أسبوعية', fem: true },
  joyItem: { noun: 'متعة', fem: true },
  fixedEvent: { noun: 'موعد', fem: false },
}

const VERB: Record<ChangeOp, string> = { create: 'أضفتي', update: 'عدّلتي', delete: 'حذفتي', restore: 'رجّعتي' }
const OP_ICON: Record<ChangeOp, IconName> = { create: 'plus', update: 'edit', delete: 'trash', restore: 'restore' }

/** Field names she would recognise (others are summarised as «تفاصيل»). */
const FIELD_AR: Record<string, string> = {
  title: 'العنوان', titleAr: 'الاسم', name: 'الاسم', nameAr: 'الاسم', body: 'التفاصيل', notes: 'الملاحظات', note: 'الملاحظة',
  status: 'الحالة', dueDate: 'الموعد', postponedTo: 'مؤجلة لين', domain: 'المجال', weekdays: 'الأيام', days: 'الأيام',
  cue: 'الإشارة', cueAr: 'الإشارة', slot: 'الوقت', time: 'الوقت', startMin: 'الوقت', order: 'الترتيب', active: 'مفعّل',
  pinned: 'مثبّتة', isDecision: 'قرار', minimumText: 'الأدنى', normalText: 'العادي', durationMin: 'المدة',
  category: 'التصنيف', steps: 'الخطوات', links: 'الروابط', archived: 'مؤرشفة', kind: 'النوع', amount: 'المبلغ', tag: 'الوسم',
  price: 'السعر', size: 'الحجم', costsMoney: 'تكلّف فلوس',
}

/** Stored enum values in her words — the log never shows raw «free → earned». */
const VALUE_AR: Record<string, string> = {
  // joy
  free: 'بلا شروط', earned: 'مكافأة بالشرارات', bundled: 'مع شي ثاني', quick: 'سريعة', medium: 'متوسطة', big: 'كبيرة',
  // statuses (projects, habits, tasks)
  idea: 'فكرة', active: 'نشط', waiting: 'منتظر', paused: 'متوقف', done: 'خلصت', archived: 'مؤرشف',
  inbox: 'بالوارد', planned: 'مخططة', in_progress: 'شغّالة عليها', postponed: 'بعدين', cancelled: 'ملغاة',
  // routine slots
  am: 'الصبح', pm: 'المسا', weekly: 'أسبوعي',
  // inbox kinds
  task: 'مهمة', note: 'ملاحظة', link: 'رابط', potential_project: 'مشروع محتمل',
}
const SKIP = new Set(['id', 'updatedAt', 'createdAt', 'titleEn', 'nameEn', 'sortOrder'])

/** Stored enum values in her words (QA area 5 #4) — keyed by entity, then field. */
const STATUS_AR: Partial<Record<ChangeEntity, Record<string, string>>> = {
  task: { inbox: 'بالوارد', planned: 'مخططة', in_progress: 'شغّالة عليها', done: 'خلصت', postponed: 'بعدين', cancelled: 'ملغاة' },
  habit: { active: 'شغّالة', paused: 'موقّفة', archived: 'مؤرشفة' },
  project: { idea: 'فكرة', active: 'شغّال', waiting: 'ينتظر', paused: 'موقّف', done: 'خلص', archived: 'مؤرشف' },
  goal: { active: 'شغّال', done: 'تحقق', archived: 'مؤرشف', paused: 'موقّف' },
}
const KIND_AR: Record<string, string> = { task: 'مهمة', idea: 'فكرة', note: 'ملاحظة', link: 'رابط', potential_project: 'مشروع محتمل' }
const SLOT_AR: Record<string, string> = { am: 'الصبح', pm: 'المسا', weekly: 'أسبوعي' }
const TAG_AR: Record<string, string> = { note: 'ملاحظة', preference: 'تفضيل', reference: 'مرجع', routine: 'روتين', goal: 'هدف', appointment: 'موعد' }
const CONVERTED_AR: Record<string, string> = { task: 'مهمة', project: 'مشروع', note: 'ملاحظة' }

function show(v: unknown, field?: string, entity?: ChangeEntity, domains?: Map<string, string>): string {
  if (v == null || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'إيه' : 'لا'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'string') {
    if (field === 'status' && entity) {
      const ar = STATUS_AR[entity]?.[v] ?? STATUS_AR.task?.[v]
      if (ar) return ar
    }
    if (field === 'kind' && KIND_AR[v]) return KIND_AR[v]
    if (field === 'slot' && SLOT_AR[v]) return SLOT_AR[v]
    if (field === 'tag' && TAG_AR[v]) return TAG_AR[v]
    if (field === 'domain' && domains?.has(v)) return domains.get(v)!
    // anything enum-like still in English (e.g. joy kind/size «free → earned») reads in her words
    if ((field === 'kind' || field === 'size' || field === 'status' || field === 'slot') && VALUE_AR[v]) return VALUE_AR[v]
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return isoDayLabel(v) ?? v
    return v.length > 60 ? `${v.slice(0, 57)}…` : v
  }
  if (Array.isArray(v)) return v.length === 0 ? '—' : v.every((x) => typeof x !== 'object') ? v.join('، ') : `${v.length}`
  if (field === 'convertedTo' && typeof v === 'object') {
    const t = (v as { type?: string }).type
    return t && CONVERTED_AR[t] ? `صارت ${CONVERTED_AR[t]}` : 'تغيّرت'
  }
  return 'تغيّرت'
}


/** Up to 3 changed fields of an edit, as before/after. */
function changedFields(e: ChangeEntry, domains: Map<string, string>): { key: string; before: string; after: string }[] {
  if (!e.before || !e.after) return []
  const b = e.before as Record<string, Json>
  const a = e.after as Record<string, Json>
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => !SKIP.has(k))
  const out: { key: string; before: string; after: string }[] = []
  for (const k of keys) {
    if (JSON.stringify(b[k] ?? null) === JSON.stringify(a[k] ?? null)) continue
    if (k === 'convertedTo') {
      // «صارت مهمة» reads as one fact, not a before/after pair
      out.push({ key: 'صارت', before: '—', after: show(a[k], k, e.entity, domains).replace(/^صارت /, '') })
      continue
    }
    out.push({ key: FIELD_AR[k] ?? 'تفاصيل', before: show(b[k], k, e.entity, domains), after: show(a[k], k, e.entity, domains) })
  }
  // collapse repeated «تفاصيل»
  const seen = new Set<string>()
  return out.filter((x) => (x.key === 'تفاصيل' ? (seen.has(x.key) ? false : (seen.add(x.key), true)) : true)).slice(0, 3)
}

const label = (e: ChangeEntry) => (e.label.trim() === '' ? 'بدون عنوان' : e.label)

export default function ChangeLogScreen() {
  const s = useLife()
  const store = useStore()
  const now = useToday()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [limit, setLimit] = useState(PAGE)
  const domainNames = useMemo(() => new Map(s.domains.map((d) => [d.id as string, d.nameAr])), [s.domains])

  const entries = useMemo(
    () => s.changeLog.filter((e) => filter === 'all' || e.op === filter),
    [s.changeLog, filter],
  )
  const shown = entries.slice(0, limit)

  // group by the wall-clock day (the app's logical day flips at 04:30, the log is real time)
  const wall = useMemo(() => new Date(Math.max(now.getTime(), Date.now())), [now])
  const groups = useMemo(() => {
    const out: { title: string; list: ChangeEntry[] }[] = []
    for (const e of shown) {
      const d = parseIso(e.at)
      const t = d ? dayHeading(d, wall) : 'قبل'
      const last = out[out.length - 1]
      if (last && last.title === t) last.list.push(e)
      else out.push({ title: t, list: [e] })
    }
    return out
  }, [shown, wall])

  const restore = (e: ChangeEntry) =>
    void store.restoreChange(e.id).then((ok) => {
      if (!ok) {
        toast({ message: 'ما قدرنا نرجّعه — يمكن انحذف من قبل' })
        return
      }
      const back = store.getSnapshot().changeLog.find((x) => x.op === 'restore' && x.entity === e.entity && x.entityId === e.entityId)
      const { fem } = ENTITY[e.entity]
      toast({
        message: e.op === 'create' ? (fem ? 'انشالت' : 'انشال') : fem ? 'رجعت مثل ما كانت' : 'رجع مثل ما كان',
        actionLabel: back ? 'تراجع' : undefined,
        onAction: back ? () => void store.restoreChange(back.id) : undefined,
      })
    })

  const actionFor = (e: ChangeEntry) => {
    const { fem } = ENTITY[e.entity]
    if (e.op === 'restore')
      return (
        <span className={styles.restored}>
          <Icon name="check" size={14} />
          {fem ? 'انرجعت' : 'انرجع'}
        </span>
      )
    const text = e.op === 'update' ? 'رجّعي القديم' : e.op === 'delete' ? (fem ? 'رجّعيها' : 'رجّعيه') : fem ? 'شيليها' : 'شيليه'
    const aria = `${text}: ${ENTITY[e.entity].noun} «${label(e)}»`
    return (
      <button type="button" className={styles.linkBtn} onClick={() => restore(e)} aria-label={aria}>
        {text}
      </button>
    )
  }

  const row = (e: ChangeEntry) => {
    const d = parseIso(e.at)
    const fields = e.op === 'update' ? changedFields(e, domainNames) : []
    // the diff below already names each field — the subtitle carries only the time (QA area 5 #4)
    const sub = d ? clock(d) : ''
    return (
      <ListRow
        key={e.id}
        leading={<Tile icon={OP_ICON[e.op]} tone={e.op === 'delete' ? 'error' : e.op === 'restore' ? 'success' : 'accent'} />}
        title={<Bidi>{`${VERB[e.op]} ${ENTITY[e.entity].noun} «${label(e)}»`}</Bidi>}
        subtitle={
          <>
            <Bidi>{sub}</Bidi>
            {fields.length > 0 && (
              <span className={styles.diff}>
                {fields.map((f, i) => (
                  <span key={i} className={styles.diffRow}>
                    <span className={styles.diffKey}>{f.key}</span>
                    <span className={styles.diffBefore}>
                      <Bidi>{f.before}</Bidi>
                    </span>
                    <span aria-hidden="true">←</span>
                    <span className={styles.diffAfter}>
                      <Bidi>{f.after}</Bidi>
                    </span>
                  </span>
                ))}
              </span>
            )}
          </>
        }
        trailing={actionFor(e)}
      />
    )
  }

  return (
    <Screen title="سجل التغييرات" backLabel="أنا" ground="tinted">
      <div className={styles.stack}>
        <p className={styles.lede}>التعديلات المهمة والحذف — ترجّعين اللي تبينه بلمسة.</p>

        {s.changeLog.length > 0 && (
          <div className={styles.filters}>
            <SegmentedControl<Filter>
              label="نوع التغيير"
              value={filter}
              onChange={(v) => {
                setFilter(v)
                setLimit(PAGE)
              }}
              segments={[
                { value: 'all', label: 'الكل' },
                { value: 'delete', label: 'حذف' },
                { value: 'update', label: 'تعديل' },
                { value: 'create', label: 'إضافة' },
              ]}
            />
          </div>
        )}

        {s.changeLog.length === 0 ? (
          <EmptyState
            title="السجل فاضي للحين"
            body="أول ما تعدّلين أو تحذفين شي مهم، يظهر هنا وتقدرين ترجّعينه."
          />
        ) : entries.length === 0 ? (
          <EmptyState title="ما فيه شي هنا" body="جرّبي «الكل»." pattern={false} />
        ) : (
          groups.map((g) => (
            <InsetGroupedList key={g.title} header={<Bidi>{g.title}</Bidi>}>
              {g.list.map(row)}
            </InsetGroupedList>
          ))
        )}

        {entries.length > limit && (
          <div className={styles.toolbar}>
            <Button variant="plain" onClick={() => setLimit((l) => l + PAGE)}>
              اعرضي الأقدم
            </Button>
          </div>
        )}

        <p className={styles.note}>
          <Icon name="lock" size={16} />
          السجل محفوظ على جهازك بس، ويحتفظ بآخر 300 تغيير.
        </p>
      </div>
    </Screen>
  )
}
