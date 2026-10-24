/**
 * Arabic-aware text normalisation for search and duplicate detection.
 *
 * - strips tashkeel (harakat, shadda, sukun, tanwin, superscript alef) and tatweel
 * - unifies alef forms أ إ آ ٱ → ا, taa marbuta ة → ه, alef maqsura ى → ي
 * - also folds ؤ → و and ئ → ي (common spelling variance in typed notes)
 * - Arabic-Indic / Persian digits → Western digits
 * - lower-cases Latin, turns punctuation into spaces, collapses whitespace
 */

const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;
const ARABIC_INDIC = /[٠-٩]/g;
const PERSIAN_DIGITS = /[۰-۹]/g;
/** Anything that is not a letter or a digit (any script) becomes a separator. */
const NON_WORD = /[^\p{L}\p{N}]+/gu;

export function normalizeArabic(input: string): string {
  return input
    .replace(TASHKEEL, '')
    .replace(TATWEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(PERSIAN_DIGITS, (d) => String(d.charCodeAt(0) - 0x06f0))
    .toLowerCase()
    .replace(NON_WORD, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Normalised tokens (empty input → []). */
export const tokensOf = (input: string): string[] => {
  const n = normalizeArabic(input);
  return n === '' ? [] : n.split(' ');
};

/**
 * Light prefix stripping for a normalised word (no stemming of roots):
 * و/ف/ب/ك + ال («والمدرسه» → «مدرسه»), لل («للمدرسه» → «مدرسه»), ال («المدرسه» → «مدرسه»).
 * Only applied when enough letters remain, so short words are left alone.
 */
export function stripAl(token: string): string {
  if (/^[وفبك]ال/.test(token) && token.length > 4) return token.slice(3);
  if (token.startsWith('لل') && token.length > 4) return token.slice(2);
  if (token.startsWith('ال') && token.length > 3) return token.slice(2);
  return token;
}
