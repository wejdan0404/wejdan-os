/**
 * SOURCES area helpers — labels, date formatting, file picking and small shared bits for
 * المصادر · مراجعة الدفعة · سجل التغييرات. Everything here is local to this folder.
 */
import { useRef, type ChangeEvent, type ReactNode } from 'react'
import {
  CANDIDATE_STATUS_LABELS, CANDIDATE_TYPE_LABELS, targetOf,
  type CandidateStatus, type CandidateType, type ImportCandidate, type SourceKind,
} from '../../../domain'
import { Icon, type IconName } from '../../icons/Icon'
import { countLabel, type NounForms } from '../../lib/plural'
import styles from './sources.module.css'

// ---- counting -------------------------------------------------------------------------------

export const ITEM: NounForms = { one: 'عنصر', two: 'عنصرين', few: 'عناصر', many: 'عنصر' }
export const FILE: NounForms = { one: 'ملف', two: 'ملفين', few: 'ملفات', many: 'ملف' }
export const items = (n: number) => countLabel(n, ITEM)
export const files = (n: number) => countLabel(n, FILE)

// ---- labels ---------------------------------------------------------------------------------

export const typeLabel = (t: CandidateType) => CANDIDATE_TYPE_LABELS[t]
export const statusLabel = (s: CandidateStatus) => CANDIDATE_STATUS_LABELS[s]

const MISSING_AR: Record<string, string> = { title: 'العنوان', type: 'النوع', date: 'التاريخ', time: 'الوقت' }
export const missingLabel = (keys: string[]) => keys.map((k) => MISSING_AR[k] ?? k).join('، ')

/** Where an approved candidate lands — never a day plan. */
export function destinationOf(type: CandidateType): string {
  switch (targetOf(type)) {
    case 'task':
      return 'الوارد — مهمة بدون موعد'
    case 'project':
      return 'أفكار مساري'
    case 'inbox':
      return 'الوارد'
    default:
      return 'الملاحظات'
  }
}

export const KIND_ICON: Record<SourceKind, IconName> = {
  json: 'data',
  csv: 'data',
  md: 'book',
  txt: 'book',
  unknown: 'import',
}

// ---- dates ----------------------------------------------------------------------------------

const AR = 'ar-SA-u-nu-latn-ca-gregory'
const fmtTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
const fmtDayMonth = new Intl.DateTimeFormat(AR, { day: 'numeric', month: 'long' })
const fmtWeekdayDayMonth = new Intl.DateTimeFormat(AR, { weekday: 'long', day: 'numeric', month: 'long' })

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000)

export const parseIso = (iso: string): Date | null => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/** «اليوم» · «أمس» · «الخميس 22 أكتوبر» (group headers). */
export function dayHeading(d: Date, now: Date): string {
  const diff = daysBetween(now, d)
  if (diff === 0) return 'اليوم'
  if (diff === 1) return 'أمس'
  return fmtWeekdayDayMonth.format(d)
}

/** Short relative date for a row: «اليوم» · «أمس» · «22 أكتوبر». */
export function shortDay(d: Date, now: Date): string {
  const diff = daysBetween(now, d)
  if (diff === 0) return 'اليوم'
  if (diff === 1) return 'أمس'
  return fmtDayMonth.format(d)
}

/** «10:42» — 24h, Western digits (render inside <Bidi>). */
export const clock = (d: Date) => fmtTime.format(d)

/** «2026-10-27» → «27 أكتوبر» (null/invalid → the raw text). */
export function isoDayLabel(iso: string | null): string | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  return fmtDayMonth.format(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

// ---- file picking ---------------------------------------------------------------------------

export const ACCEPT = '.json,.csv,.md,.txt,application/json,text/csv,text/markdown,text/plain'
/** Bigger than this is almost certainly not a hand-written list. */
export const MAX_BYTES = 2 * 1024 * 1024

export type PickedFile = { name: string; text: string } | { name: string; error: string }

/** Reads the picked file as text on the device (nothing is uploaded). */
export async function readPicked(file: File): Promise<PickedFile> {
  if (file.size > MAX_BYTES) return { name: file.name, error: `«${file.name}» كبير مرة (أكثر من 2 ميقا) — قسّميه لملفات أصغر.` }
  try {
    const text = typeof file.text === 'function' ? await file.text() : await readWithFileReader(file)
    return { name: file.name, text }
  } catch {
    return { name: file.name, error: `«${file.name}» ما قدرنا نفتحه على جهازك.` }
  }
}

/** Older Safari (and jsdom) lack Blob.text(). */
function readWithFileReader(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : '')
    r.onerror = () => reject(r.error)
    r.readAsText(file)
  })
}

/** A visually-hidden file input + a function that opens it. */
export function useFilePicker(onPick: (f: File) => void): { open: () => void; input: ReactNode } {
  const ref = useRef<HTMLInputElement>(null)
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) onPick(f)
  }
  const input = (
    <input
      ref={ref}
      type="file"
      accept={ACCEPT}
      className={styles.hiddenInput}
      onChange={onChange}
      aria-label="اختاري ملف تستوردينه"
      tabIndex={-1}
      data-testid="source-file-input"
    />
  )
  return { open: () => ref.current?.click(), input }
}

// ---- small visual bits ----------------------------------------------------------------------

/**
 * A file name in RTL text: «خطة الأسبوع.json» keeps its extension (dot included) as one LTR run,
 * and an all-Latin name («routine.csv») is isolated as a whole.
 */
export function FileName({ name }: { name: string }) {
  if (!/[\u0600-\u06FF]/.test(name)) return <bdi dir="ltr">{name}</bdi>
  const i = name.lastIndexOf('.')
  if (i <= 0 || i === name.length - 1) return <bdi>{name}</bdi>
  return (
    <bdi>
      {name.slice(0, i)}
      <bdi dir="ltr" className={styles.fileExt}>
        {name.slice(i)}
      </bdi>
    </bdi>
  )
}

/** Rounded tile behind a row icon. tone: accent (default) · ink · warn (amber) · error. */
export function Tile({ icon, tone = 'accent' }: { icon: IconName; tone?: 'accent' | 'ink' | 'warn' | 'error' | 'success' }) {
  return (
    <span className={styles.tile} data-tone={tone} aria-hidden="true">
      <Icon name={icon} size={18} />
    </span>
  )
}

/** Status badge: always icon + text (never colour alone). */
export function Badge({ tone, children }: { tone: 'warn' | 'success' | 'error' | 'accent' | 'muted'; children: ReactNode }) {
  const icon: IconName | null = tone === 'success' ? 'check' : tone === 'warn' ? 'help' : tone === 'error' ? 'close' : null
  return (
    <span className={styles.badge} data-tone={tone}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  )
}

export const statusTone = (s: CandidateStatus): 'warn' | 'success' | 'error' | 'accent' =>
  s === 'conflict' ? 'error' : s === 'missing' ? 'warn' : s === 'confirmed' ? 'success' : 'accent'

/** True when a pending candidate needs a closer look before approving. */
export const isFlagged = (c: ImportCandidate) => c.status === 'conflict' || c.status === 'missing' || c.matches.length > 0
