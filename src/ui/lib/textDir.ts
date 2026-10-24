/**
 * Direction for a text field she types into. The app is Arabic-first, so an empty field (and
 * anything with Arabic in it) is RTL — placeholder on the right, caret starting on the right,
 * ellipsis at the end of the Arabic. Only a value with Latin letters and no Arabic at all
 * (e.g. a pasted URL or an English phrase) follows its own direction.
 *
 * Never use bare `dir="auto"` on an empty field: with no strong character it resolves to LTR
 * (also on iOS Safari).
 */
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/
const LATIN = /[A-Za-zÀ-ɏ]/

export function fieldDir(value: string): 'rtl' | 'auto' {
  if (ARABIC.test(value)) return 'rtl'
  return LATIN.test(value) ? 'auto' : 'rtl'
}
