/**
 * Amount parsing for money / price inputs typed on any iPhone keyboard (QA area4 #6):
 * Arabic-Indic (٠-٩) and Persian (۰-۹) digits, the Arabic decimal separator «٫» (U+066B),
 * and thousands separators («٬» U+066C, «,», «،») — «١٬٢٠٠٫٥» → 1200.5, «١٢٫٥» → 12.5.
 * Returns 0 for anything that isn't a finite, non-negative number.
 */
export function parseAmount(raw: string): number {
  const ascii = raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/[٬,،\s]/g, '')
  const cleaned = ascii.replace(/[^\d.]/g, '')
  // keep only the first decimal point
  const firstDot = cleaned.indexOf('.')
  const normalised = firstDot < 0 ? cleaned : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
  const n = Number(normalised)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/** Whole number from a digits-only field (any digit script); non-digits dropped. */
export function parseWhole(raw: string): number {
  return Math.trunc(parseAmount(raw.replace(/[٫.]/g, '')))
}
