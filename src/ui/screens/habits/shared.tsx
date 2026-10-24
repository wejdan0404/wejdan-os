/**
 * Shared helpers for the habits area (عاداتي · روتيني · منتجاتي · استوديو العادة).
 * Local to src/ui/screens/habits — no shared files are touched.
 */
import type { SVGProps } from 'react'
import { useCallback } from 'react'
import {
  isDoneLevel,
  kProductCategoryAr,
  logsOn,
  productStepId,
  type CueAnchor,
  type GrowthStage,
  type LifeSnapshot,
  type LogEntry,
  type MissReason,
  type Product,
  type ProductCategory,
  type ProductSlot,
} from '../../../domain'
import { useToast } from '../../components/Toast'
import { LTR_RUN_FLAGS, LTR_RUN_SOURCE } from '../../components/Bidi'
import { Icon, type IconName } from '../../icons/Icon'

// ---- labels ---------------------------------------------------------------------------

export const SLOT_AR: Record<ProductSlot, string> = { am: 'الصبح', pm: 'المسا', weekly: 'أسبوعي' }
export const SLOT_ROUTINE_AR: Record<ProductSlot, string> = { am: 'روتين الصبح', pm: 'روتين المسا', weekly: 'العناية الأسبوعية' }
export const SLOTS: readonly ProductSlot[] = ['am', 'pm', 'weekly']

const PRAYER_AR: Record<string, string> = { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' }
const SLOT_TIME_AR: Record<string, string> = {
  morning: 'الصبح',
  midday: 'الظهر',
  afternoon: 'العصر',
  evening: 'المسا',
  night: 'الليل',
  anytime: 'أي وقت',
}
export const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`

/** «بعد العصر» · «بعد الصحيان» · «قبل النوم» · «07:30» · «المسا». */
export function cueLabel(a: CueAnchor): string {
  switch (a.type) {
    case 'prayer':
      return a.prayer ? `${a.offsetMin < 0 ? 'قبل' : 'بعد'} ${PRAYER_AR[a.prayer]}` : 'مع الصلاة'
    case 'wake':
      return a.offsetMin > 30 ? 'بعد الصحيان بشوي' : 'بعد الصحيان'
    case 'sleep':
      return 'قبل النوم'
    case 'fixedTime':
      return a.minute != null ? hhmm(a.minute) : 'وقت محدد'
    default:
      return SLOT_TIME_AR[a.slot] ?? 'أي وقت'
  }
}

/** Dart weekdays 1 = Monday … 7 = Sunday. */
export const WEEKDAY_AR: Record<number, string> = { 1: 'الاثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت', 7: 'الأحد' }
export const WEEKDAY_SHORT: Record<number, string> = { 1: 'اثنين', 2: 'ثلاثاء', 3: 'أربعاء', 4: 'خميس', 5: 'جمعة', 6: 'سبت', 7: 'أحد' }
/** Saudi week order, starting Sunday unless she set otherwise. */
export const weekOrder = (startsOn: number): number[] => Array.from({ length: 7 }, (_, i) => ((startsOn - 1 + i) % 7) + 1)

export function weekdaysLabel(days: number[]): string {
  const set = new Set(days)
  if (set.size === 7) return 'كل يوم'
  if (set.size === 0) return 'ما لها أيام'
  if (set.size === 5 && [7, 1, 2, 3, 4].every((d) => set.has(d))) return 'أيام الدوام'
  if (set.size >= 4) return `${set.size} أيام بالأسبوع`
  return weekOrder(7)
    .filter((d) => set.has(d))
    .map((d) => WEEKDAY_AR[d])
    .join(' و')
}

/** Strength as calm words — never a score. */
/** Strength stages in the garden's words (seed → rooted flower). */
export const STAGE_AR: Record<GrowthStage, string> = {
  seed: 'بذرة',
  sprout: 'برعم',
  growing: 'تتفتح',
  rooted: 'مزهرة',
  automatic: 'متجذرة',
}

/** Garden word for a resting plant (Flutter parity: `plantResting`). Plants never die — the stage is kept. */
export const RESTING_AR = 'ترتاح'

/** Momentum (0–100) as words — rest is never zero or a failure. */
export function momentumWord(m: number): string {
  if (m <= 0) return 'لسا ما بدأت'
  if (m <= 1) return 'ترتاح شوي'
  if (m < 30) return 'بداية هادية'
  if (m < 65) return 'ماشي بهدوء'
  return 'ماشي زين'
}

export const MISS_REASON_AR: Record<MissReason, string> = {
  forgot: 'نسيتها',
  badTime: 'وقتها ما ناسبني',
  tooBig: 'كانت كبيرة عليّ',
  tired: 'كنت تعبانة',
  notEnjoyable: 'ما كانت ممتعة',
  placeDidntFit: 'المكان ما ساعد',
  busy: 'انشغلت',
  notImportantNow: 'مو مهمة لي الحين',
}

// ---- products -------------------------------------------------------------------------

export type CategoryGroup = 'skin' | 'hair' | 'teeth' | 'body'
export const GROUP_AR: Record<CategoryGroup, string> = { skin: 'البشرة', hair: 'الشعر', teeth: 'الأسنان', body: 'الجسم' }
export const GROUP_OF: Record<ProductCategory, CategoryGroup> = {
  cleanser: 'skin',
  toner: 'skin',
  serum: 'skin',
  moisturizer: 'skin',
  sunscreen: 'skin',
  mask: 'skin',
  exfoliant: 'skin',
  shampoo: 'hair',
  conditioner: 'hair',
  heat_protectant: 'hair',
  hair_oil: 'hair',
  toothpaste: 'teeth',
  floss: 'teeth',
  mouthwash: 'teeth',
  body: 'body',
  other: 'body',
}
export const GROUPS: readonly CategoryGroup[] = ['skin', 'hair', 'teeth', 'body']
export const categoriesOf = (g: CategoryGroup) => (Object.keys(GROUP_OF) as ProductCategory[]).filter((c) => GROUP_OF[c] === g)
export const categoryAr = (c: ProductCategory) => kProductCategoryAr[c]

/** Display name: her name for it, or the category when empty. */
export const productName = (p: Product) => (p.name.trim() === '' ? kProductCategoryAr[p.category] : p.name)

/** Default how-to lines for the generic placeholders (shown only while she hasn't written her own). */
const HOWTO: Partial<Record<ProductCategory, string>> = {
  cleanser: 'بماء فاتر، دقيقة وحدة',
  moisturizer: 'كمية حبة بازلاء على بشرة رطبة',
  sunscreen: 'آخر خطوة الصبح، كمية إصبعين',
  toothpaste: 'دقيقتين، بدون مضمضة قوية بعدها',
  floss: 'مرة باليوم قبل التفريش',
  shampoo: 'على فروة الراس بس',
  conditioner: 'على الأطراف، دقيقتين وبعدين اشطفي',
  heat_protectant: 'قبل السشوار أو المكواة',
}
export const howTo = (p: Product) => (p.notes.trim() !== '' ? p.notes : p.placeholder ? (HOWTO[p.category] ?? '') : '')

/** Minutes a step roughly takes (matches the domain's product routine durations). */
export const stepMinutes = (p: Product) => (GROUP_OF[p.category] === 'teeth' ? 2 : 1)

/** Product step ids done today. */
export function doneSteps(s: LifeSnapshot, today: Date): Set<string> {
  const out = new Set<string>()
  for (const [id, l] of logsOn(s, today)) if (isDoneLevel(l.level)) out.add(id)
  return out
}
export const isStepDone = (done: Set<string>, p: Product) => done.has(productStepId(p.id))

/**
 * «رجّعيه لليوم»: removes today's skip marks of a routine so it is untouched again. One at a time —
 * each undo patches the snapshot it started from, so parallel ones would overwrite each other.
 */
export async function restartSkippedRoutine(store: { undo(logId: string, ignoreWindow?: boolean): Promise<boolean> }, logs: readonly LogEntry[]): Promise<void> {
  for (const l of logs) await store.undo(l.id, true)
}

// ---- bidi-safe names inside plain-string messages (toasts) ---------------------------

const LTR_RUN_G = new RegExp(LTR_RUN_SOURCE, LTR_RUN_FLAGS)
/** Isolates Latin/number runs (LRI…PDI) so «SPF 30+» keeps its order inside an Arabic toast. */
export const isoText = (text: string): string => text.replace(LTR_RUN_G, '\u2066$1\u2069')
/** «name» with its Latin/number runs isolated — for toast and other string-only messages. */
export const quoted = (name: string): string => `«${isoText(name)}»`

// ---- undo-able delete -----------------------------------------------------------------

/** Runs a domain delete and shows «انحذف · تراجع» for the 10 s undo window. */
export function useUndoDelete() {
  const toast = useToast()
  return useCallback(
    async (label: string, del: () => Promise<{ token: string } | null>, undo: (token: string) => Promise<boolean>) => {
      const t = await del()
      const token = t?.token ?? null
      toast({
        message: `انحذف ${quoted(label)}`,
        ...(token ? { actionLabel: 'تراجع', onAction: () => void undo(token) } : {}),
      })
    },
    [toast],
  )
}

// ---- icons + switch: aliases over the shared kit -----------------------------------------

type LocalIconName = Extract<IconName, 'pause' | 'play' | 'edit' | 'grip' | 'up' | 'down' | 'skip' | 'recover' | 'products' | 'sparkle'>

export function LIcon({ name, size = 22, ...rest }: { name: LocalIconName; size?: number } & Omit<SVGProps<SVGSVGElement>, 'name' | 'ref'>) {
  return <Icon name={name} size={size} {...rest} />
}

