/**
 * Today-area helpers: time/date text, bidi isolation for string-only props,
 * and lookups across the Today read-model.
 */
import type { CompletionLevel, DomainId, PlanItem, Suggestion, TodayView } from '../../../domain'
import { LTR_RUN_FLAGS, LTR_RUN_SOURCE } from '../../components/Bidi'

/**
 * «صباح الخير» from the day flip (04:30, the app's logical day) until noon, then «مساء الخير».
 * With her name (set in onboarding): «صباح الخير، وجدان».
 */
export const greetingFor = (d: Date, name?: string | null): string => {
  const m = d.getHours() * 60 + d.getMinutes()
  const base = m >= 4 * 60 + 30 && m < 12 * 60 ? 'صباح الخير' : 'مساء الخير'
  const n = name?.trim()
  return n ? `${base}، ${n}` : base
}

/** «السبت 24 أكتوبر» — Western digits, Gregorian. */
export const dateLine = (d: Date): string =>
  new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' }).format(d).replace('،', '')

/** 570 → «9:30» (no leading zero, like the boards). */
export const clock = (m: number): string => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`

/** Friendly part of day for a minute: الصبح / الظهر / العصر / المغرب / الليل. */
export function partOfDay(m: number): string {
  if (m < 11 * 60) return 'الصبح'
  if (m < 14 * 60 + 30) return 'الظهر'
  if (m < 17 * 60 + 30) return 'العصر'
  if (m < 20 * 60) return 'المسا'
  return 'الليل'
}

export const minutesText = (n: number): string => `${n} د`

/** Meta parts for a row: «العصر · 20 د». */
export const metaParts = (i: PlanItem): string[] =>
  [i.startMinute != null ? partOfDay(i.startMinute) : null, i.estimatedMin > 0 ? minutesText(i.estimatedMin) : null].filter(
    (x): x is string => !!x,
  )

const LRI = '⁦'
const PDI = '⁩'
const LTR_RUN = new RegExp(LTR_RUN_SOURCE, LTR_RUN_FLAGS)

/**
 * Isolates Latin/number runs with Unicode LRI…PDI so plain-string props
 * (hero title, aria labels) keep «SPF 30+» and «IELTS» in order inside Arabic.
 */
export const isolate = (text: string): string => text.replace(LTR_RUN, `${LRI}$1${PDI}`)

export const LEVEL_LABEL: Record<Exclude<CompletionLevel, 'skipped'>, string> = {
  minimum: 'أقل',
  normal: 'عادي',
  bonus: 'زيادة',
}

/** Every plan item the Today screen can show, by plan-item id. */
export function findItem(view: TodayView, id: string): { item: PlanItem; where: 'plan' | 'suggestion' | 'later' | 'week' } | null {
  const p = view.plan.items.find((i) => i.id === id)
  if (p) return { item: p, where: 'plan' }
  const sg = view.suggestions.find((x) => x.item.id === id)
  if (sg) return { item: sg.item, where: 'suggestion' }
  const l = view.later.find((i) => i.id === id)
  if (l) return { item: l, where: 'later' }
  const w = view.thisWeek.find((i) => i.id === id)
  if (w) return { item: w, where: 'week' }
  return null
}

/** Arabic count words for small numbers — «شي واحد», «شيئين», «3 أشياء». */
export function thingsCount(n: number): string {
  if (n === 0) return 'ما فيه شي'
  if (n === 1) return 'شي واحد'
  if (n === 2) return 'شيئين'
  if (n <= 10) return `${n} أشياء`
  return `${n} شي`
}

/** Steps left wording: «باقي خطوة» / «باقي خطوتين» / «باقي 3 خطوات». */
export function stepsLeft(n: number): string {
  if (n <= 0) return 'خلّصتيه'
  if (n === 1) return 'باقي خطوة'
  if (n === 2) return 'باقي خطوتين'
  return `باقي ${n} خطوات`
}

/** Icon key per life domain (outline set). */
export type DomainGlyph = 'walk' | 'book' | 'home' | 'drop' | 'moon' | 'money' | 'heart' | 'sun' | 'car' | 'people'
export function domainGlyph(d: DomainId): DomainGlyph {
  switch (d) {
    case 'health':
      return 'walk'
    case 'ielts':
    case 'learning':
    case 'career':
      return 'book'
    case 'home':
    case 'admin':
    case 'digital':
      return 'home'
    case 'care':
    case 'food':
    case 'aquarium':
      return 'drop'
    case 'sleep':
    case 'faith':
      return 'moon'
    case 'money':
      return 'money'
    case 'joy':
    case 'womensHealth':
      return 'heart'
    case 'driving':
      return 'car'
    case 'people':
      return 'people'
    default:
      return 'sun'
  }
}

export const DOMAIN_LABEL: Partial<Record<DomainId, string>> = {
  health: 'الحركة',
  sleep: 'النوم',
  food: 'الأكل',
  care: 'العناية',
  ielts: 'IELTS',
  learning: 'التعلّم',
  career: 'المسار المهني',
  driving: 'القيادة',
  money: 'المال',
  home: 'البيت',
  digital: 'الرقمي',
  admin: 'المعاملات',
  joy: 'المتعة',
  people: 'الناس',
  faith: 'الإيمان',
}

/** «شرارة / شرارتين / 3 شرارات / 11 شرارة» — Arabic counted-noun agreement. */
export function sparksText(n: number): string {
  if (n === 1) return 'شرارة'
  if (n === 2) return 'شرارتين'
  if (n >= 3 && n <= 10) return `${n} شرارات`
  return `${n} شرارة`
}

/**
 * The suggestions Today previews. Her daily plan fills the [n] slots; a weekly system item (the weekly
 * review) shows on its day as an extra row after them and never takes one of the slots, so it can't
 * push a daily plan (e.g. IELTS) off Today. [more] = daily suggestions left for «الكل».
 */
export function previewSuggestions(all: readonly Suggestion[], n = 3): { shown: Suggestion[]; more: boolean } {
  const daily = all.filter((x) => x.group !== 'system' && x.item.tier !== 'chain')
  const weekly = all.filter((x) => x.group === 'system')
  return { shown: [...daily.slice(0, n), ...weekly], more: daily.length > n }
}
