/**
 * Small ME-area helpers: icon/switch aliases over the shared kit, riyal/date formatting.
 */
import type { CSSProperties } from 'react'
import { Icon, type IconName } from '../../icons/Icon'
import type { NounForms } from '../../lib/plural'
import styles from './me.module.css'

// ---- icons: thin alias over the shared outline set (src/ui/icons) ---------------------------

export type MeIconName = Extract<
  IconName,
  | 'inbox' | 'products' | 'money' | 'home' | 'evidence' | 'insights' | 'import' | 'data' | 'settings' | 'help'
  | 'review' | 'book' | 'phone' | 'shield' | 'bell' | 'theme' | 'calendar' | 'lock' | 'restore' | 'trash' | 'export'
>

export function MeIcon({ name, size = 22, style }: { name: MeIconName; size?: number; style?: CSSProperties }) {
  return <Icon name={name} size={size} style={style} />
}

/** Tinted rounded square behind a row icon (iOS Settings style, identity colours only). */
export function RowIcon({ name, tone = 'accent' }: { name: MeIconName; tone?: 'accent' | 'ink' | 'warn' }) {
  return (
    <span className={styles.rowIcon} data-tone={tone}>
      <MeIcon name={name} size={18} />
    </span>
  )
}

// ---- backups (Settings and the first-run «عندي نسخة احتياطية») -----------------------------------

export const BACKUP_REASON_AR: Record<string, string> = {
  'before-import': 'قبل الاستيراد',
  'before-restore': 'قبل الاستعادة',
  'before-delete-all': 'قبل الحذف الكامل',
  'before-lock': 'قبل تشغيل القفل',
  manual: 'يدوي',
}
export const RECORD_NOUN: NounForms = { one: 'سجل', two: 'سجلّين', few: 'سجلات', many: 'سجل' }

// ---- formatting ---------------------------------------------------------------------------

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
/** «1,750 ر.س» — Western digits, tabular, kept LTR-safe by the caller's <bdi>. */
export const riyal = (n: number) => `${nf.format(Math.round(n))} ر.س`

/**
 * Amount + currency in Arabic reading order («1,500 ر.س»): only the digits are isolated LTR,
 * the currency follows in the RTL line (QA #17 — a whole-LTR bdi put «ر.س» first).
 */
export function Riyal({ n, className }: { n: number; className?: string }) {
  return (
    <span className={className}>
      <bdi dir="ltr" className="num">
        {nf.format(Math.round(n))}
      </bdi>{' '}
      ر.س
    </span>
  )
}
export const num = (n: number) => nf.format(Math.round(n))

const dayMonth = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'long' })
const weekdayDayMonth = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' })
const monthName = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { month: 'long' })
export const fmtDayMonth = (d: Date) => dayMonth.format(d)
export const fmtWeekdayDayMonth = (d: Date) => weekdayDayMonth.format(d)
export const fmtMonth = (d: Date) => monthName.format(d)
const time24 = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
/** «24 أكتوبر · 00:51» — always 24-hour, Western digits (matches TimeField and the change log). */
export const fmtIso = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : `${dayMonth.format(d)} · ${time24.format(d)}`
}
export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** «بعد 4 أيام» / «اليوم» / «بكرة» / «فات من يومين». */
export function inDays(n: number): string {
  if (n === 0) return 'اليوم'
  if (n === 1) return 'بكرة'
  if (n === 2) return 'بعد يومين'
  if (n > 2 && n <= 10) return `بعد ${n} أيام`
  if (n > 10) return `بعد ${n} يوم`
  if (n === -1) return 'كان أمس'
  if (n === -2) return 'فات من يومين'
  return `فات من ${-n} ${-n <= 10 ? 'أيام' : 'يوم'}`
}

/** Download a JSON file (works in iOS Safari / standalone PWA). */
export function downloadJson(data: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export const newId = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
