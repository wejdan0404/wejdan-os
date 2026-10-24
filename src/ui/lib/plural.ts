/**
 * Arabic count agreement for short UI labels (Saudi everyday register).
 * 1 → "1 شرارة", 2 → "شرارتين", 3–10 → "5 شرارات", 11+ → "12 شرارة", 0 → "0 شرارة".
 * `nounOnly` returns just the noun form that follows the number (for markup that renders the
 * number separately) — for 2 it still returns the dual, so callers usually hide the number then.
 */
export interface NounForms {
  one: string
  two: string
  few: string
  many: string
  /** Spelled-out "one" for countWords (e.g. «شرارة وحدة», «يوم واحد»). */
  single?: string
}

export const NOUNS = {
  spark: { one: 'شرارة', two: 'شرارتين', few: 'شرارات', many: 'شرارة', single: 'شرارة وحدة' },
  day: { one: 'يوم', two: 'يومين', few: 'أيام', many: 'يوم', single: 'يوم واحد' },
  product: { one: 'منتج', two: 'منتجين', few: 'منتجات', many: 'منتج' },
  step: { one: 'خطوة', two: 'خطوتين', few: 'خطوات', many: 'خطوة' },
  minute: { one: 'دقيقة', two: 'دقيقتين', few: 'دقايق', many: 'دقيقة' },
  item: { one: 'شي', two: 'شيئين', few: 'أشياء', many: 'شي' },
  habit: { one: 'عادة', two: 'عادتين', few: 'عادات', many: 'عادة' },
  task: { one: 'مهمة', two: 'مهمتين', few: 'مهام', many: 'مهمة' },
} satisfies Record<string, NounForms>

export function nounFor(n: number, forms: NounForms): string {
  const a = Math.abs(n)
  if (a === 2) return forms.two
  if (a >= 3 && a <= 10) return forms.few
  if (a === 1) return forms.one
  return forms.many
}

/** "5 شرارات", "شرارتين", "1 شرارة". */
export function countLabel(n: number, forms: NounForms): string {
  if (Math.abs(n) === 2) return forms.two
  return `${n} ${nounFor(n, forms)}`
}

/**
 * Like countLabel, but reads as speech: 1 → «شرارة وحدة» (when the noun has `single`),
 * 2 → «شرارتين», 3–10 → «5 شرارات», 11+ → «22 يوم». Never prints a digit beside a dual.
 */
export function countWords(n: number, forms: NounForms): string {
  if (Math.abs(n) === 1 && forms.single) return forms.single
  return countLabel(n, forms)
}
