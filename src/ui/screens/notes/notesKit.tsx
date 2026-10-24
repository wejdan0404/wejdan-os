/**
 * NOTES area kit — local icons, Arabic-aware highlighting, link labels, dates.
 * Shared by NotesScreen, NoteEditorScreen and SearchSheet.
 */
import { Fragment, type ReactNode, type SVGProps } from 'react'
import { useLocation } from 'react-router-dom'
import { stripAl, tokensOf, type LifeSnapshot, type Note, type NoteLink, type NoteLinkKind } from '../../../domain'
import styles from './notes.module.css'

// ---- icons (24 grid, 1.5 stroke, round caps — same family as the shared set) ------------------

type NIcon = 'search' | 'pin' | 'doc' | 'circle' | 'clock' | 'clear' | 'compose' | 'project' | 'goal' | 'habit' | 'product' | 'joy' | 'inbox'

const PATHS: Record<NIcon, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 17v5" />
      <path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z" />
    </>
  ),
  doc: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9 12h7M9 16h5" />
    </>
  ),
  circle: <circle cx="12" cy="12" r="9" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  clear: <path d="M6 6l12 12M18 6 6 18" />,
  compose: (
    <>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  project: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M3 9h18" />
    </>
  ),
  goal: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" />
    </>
  ),
  habit: (
    <>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </>
  ),
  product: (
    <>
      <path d="M9 3h6v4H9z" />
      <path d="M8 7h8l1 3v10a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V10z" />
    </>
  ),
  joy: <path d="M12 3.5c.3 4.6 3.9 8.2 8.5 8.5-4.6.3-8.2 3.9-8.5 8.5-.3-4.6-3.9-8.2-8.5-8.5 4.6-.3 8.2-3.9 8.5-8.5z" />,
  inbox: (
    <>
      <path d="M3 13h5l1.5 3h5L16 13h5" />
      <path d="M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z" />
    </>
  ),
}

export function NotesIcon({ name, size = 20, ...rest }: { name: NIcon; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}

// ---- routing -------------------------------------------------------------------------------

/** Last path segment of the current route (e.g. the note id, or «new»). */
export function useRouteTail(): string {
  const { pathname } = useLocation()
  return decodeURIComponent(pathname.split('/').filter(Boolean).pop() ?? '')
}

// ---- link labels -----------------------------------------------------------------------------

export const LINK_KIND_LABEL: Record<NoteLinkKind, string> = {
  project: 'مشروع',
  goal: 'هدف',
  habit: 'عادة',
  task: 'مهمة',
}

/** The linked entity's display name, or null when it no longer exists. */
export function linkTitle(s: LifeSnapshot, l: NoteLink): string | null {
  switch (l.kind) {
    case 'project':
      return s.projects.find((p) => p.id === l.id)?.titleAr ?? null
    case 'goal':
      return s.goals.find((g) => g.id === l.id)?.titleAr ?? null
    case 'habit':
      return s.habits.find((h) => h.id === l.id)?.titleAr ?? null
    case 'task':
      return s.tasks.find((t) => t.id === l.id)?.title ?? null
  }
}

/** Where a link chip takes her (QA area 5 #7). */
export function linkRoute(l: NoteLink): string {
  switch (l.kind) {
    case 'project':
      return `/path/project/${encodeURIComponent(l.id)}`
    case 'habit':
      return `/habits/${encodeURIComponent(l.id)}`
    case 'goal':
      return '/path'
    case 'task':
      return `/me/inbox?focus=${encodeURIComponent(l.id)}`
  }
}

/** Still-existing links with their chip label and route. */
export function linkItems(s: LifeSnapshot, n: Pick<Note, 'links'>): { key: string; label: string; to: string }[] {
  return n.links.flatMap((l) => {
    const t = linkTitle(s, l)
    return t ? [{ key: `${l.kind}:${l.id}`, label: `${LINK_KIND_LABEL[l.kind]} · ${t}`, to: linkRoute(l) }] : []
  })
}

/** «مشروع · تجديد الغرفة» for each still-existing link. */
export function linkLabels(s: LifeSnapshot, n: Pick<Note, 'links'>): string[] {
  return n.links.flatMap((l) => {
    const t = linkTitle(s, l)
    return t ? [`${LINK_KIND_LABEL[l.kind]} · ${t}`] : []
  })
}

// ---- dates -----------------------------------------------------------------------------------

const weekdayDayMonth = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' })
const dayMonth = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long' })

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** «اليوم» · «أمس» · «الأحد 19 أكتوبر» (this week+) · «2 أكتوبر». */
export function friendlyDate(iso: string, now: Date): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const days = Math.round((dayStart(now) - dayStart(d)) / 86_400_000)
  if (days <= 0) return 'اليوم'
  if (days === 1) return 'أمس'
  if (days < 14) return weekdayDayMonth.format(d)
  return dayMonth.format(d)
}

// ---- Arabic-aware highlighting ------------------------------------------------------------------

/** Harakat, shadda, sukun, tanwin, superscript alef, Quranic marks, tatweel. */
const TASHKEEL_CHAR = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/
const WORD_CHAR = /[\p{L}\p{N}]/u

function foldChar(c: string): string {
  switch (c) {
    case 'أ':
    case 'إ':
    case 'آ':
    case 'ٱ':
      return 'ا'
    case 'ة':
      return 'ه'
    case 'ى':
    case 'ئ':
      return 'ي'
    case 'ؤ':
      return 'و'
  }
  const code = c.charCodeAt(0)
  if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660)
  if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0)
  if (!WORD_CHAR.test(c)) return ' '
  return c.toLowerCase()
}

/** Ranges [start, end) in `text` matching any of the normalised query tokens (same folding as search). */
export function matchRanges(text: string, query: string): Array<[number, number]> {
  const tokens = tokensOf(query)
  if (tokens.length === 0 || !text) return []
  // normalised text with a map back to original indices
  let norm = ''
  const map: number[] = []
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (TASHKEEL_CHAR.test(c)) continue
    const f = foldChar(c)
    for (const ch of f) {
      norm += ch
      map.push(i)
    }
  }
  const needles = new Set<string>()
  for (const t of tokens) {
    needles.add(t)
    const core = stripAl(t)
    if (core.length >= 2) needles.add(core)
  }
  const ranges: Array<[number, number]> = []
  for (const n of needles) {
    if (n.length === 0) continue
    let from = 0
    for (;;) {
      const at = norm.indexOf(n, from)
      if (at < 0) break
      ranges.push([map[at], map[at + n.length - 1] + 1])
      from = at + n.length
    }
  }
  ranges.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([r[0], r[1]])
  }
  return merged
}

/** Text with the matched parts wrapped in <mark>. Latin runs keep their own direction. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const ranges = matchRanges(text, query)
  if (ranges.length === 0) return <bdi>{text}</bdi>
  const out: ReactNode[] = []
  let pos = 0
  ranges.forEach(([a, b], i) => {
    if (a > pos) out.push(<Fragment key={`t${i}`}>{text.slice(pos, a)}</Fragment>)
    out.push(
      <mark key={`m${i}`} className={styles.mark}>
        {text.slice(a, b)}
      </mark>,
    )
    pos = b
  })
  if (pos < text.length) out.push(<Fragment key="tail">{text.slice(pos)}</Fragment>)
  return <bdi>{out}</bdi>
}

/** One-line plain snippet of a note body (no line breaks). */
export const snippet = (body: string, max = 90) => {
  const one = body.replace(/\s+/g, ' ').trim()
  return one.length > max ? `${one.slice(0, max - 1)}…` : one
}
