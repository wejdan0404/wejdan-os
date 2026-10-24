import { Fragment, type ReactNode, memo } from 'react'

/**
 * Runs of Latin letters (any accented / ligature / combining form), digits, URLs and times inside Arabic text
 * (e.g. "IELTS", "my.gov.sa", "06:30", "45 د", "Embryolisse Lait-Crème Concentré", "SPF 30+") are isolated
 * in <bdi dir="ltr"> so separators and punctuation don't jump around in RTL. Built on Unicode property escapes,
 * so it needs the `u` flag (LTR_RUN_FLAGS).
 *
 * Inside a run: Latin-script letters, combining marks (\p{M}), ASCII digits, ZWJ/ZWNJ, and the usual joiners
 * `. : / @ _ + % -`. Separators that must not be swallowed when trailing (comma, en/em dash for ranges,
 * apostrophe, typographic apostrophe, ampersand) stay in only when a letter/digit follows. A run may open with a
 * currency sign («$25»).
 */
const LATIN = String.raw`\p{Script=Latin}`
const RUN_CHAR = String.raw`(?:[${LATIN}\p{M}0-9.:/@_+%\-‌‍]|[,٬٫–—'’&](?=[${LATIN}0-9]))`
const RUN_START = String.raw`(?:[$€£¥]?[0-9]|[${LATIN}])`
/** One LTR run; thousands separators («1,000», «8,000-10,000») and ranges («30–45») stay inside it. */
export const LTR_RUN_SOURCE = String.raw`(${RUN_START}${RUN_CHAR}*(?:\s+(?:&\s+)?${RUN_START}${RUN_CHAR}*)*)`
export const LTR_RUN_FLAGS = 'gu'
const LTR_RUN = new RegExp(LTR_RUN_SOURCE, LTR_RUN_FLAGS)
const HAS_LATIN = new RegExp(LATIN, 'u')

export function splitBidi(text: string): { text: string; ltr: boolean }[] {
  const parts: { text: string; ltr: boolean }[] = []
  let last = 0
  for (const m of text.matchAll(LTR_RUN)) {
    const i = m.index ?? 0
    if (i > last) parts.push({ text: text.slice(last, i), ltr: false })
    parts.push({ text: m[0], ltr: true })
    last = i + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), ltr: false })
  return parts
}

/** Render Arabic text with Latin/number runs wrapped in <bdi dir="ltr">. */
function BidiImpl({ children }: { children: string }): ReactNode {
  return (
    <>
      {splitBidi(children).map((p, i) =>
        p.ltr ? (
          // Latin words get lang="en" so VoiceOver's Arabic voice doesn't mangle «IELTS»; digits stay neutral.
          <bdi key={i} dir="ltr" lang={HAS_LATIN.test(p.text) ? 'en' : undefined}>
            {p.text}
          </bdi>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  )
}

/** A "·"-separated meta line where each part is its own isolate: «الصبح · 06:30 · IELTS». */
function MetaLineImpl({ parts }: { parts: (string | null | undefined | false)[] }) {
  const items = parts.filter((p): p is string => !!p)
  return (
    <>
      {items.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          <bdi>
            <Bidi>{p}</Bidi>
          </bdi>
        </Fragment>
      ))}
    </>
  )
}

/** Memoised: a pure leaf rendered many times per list. */
export const Bidi = memo(BidiImpl)

/** Memoised: a pure leaf rendered many times per list. */
export const MetaLine = memo(MetaLineImpl, (a, b) => a.parts.length === b.parts.length && a.parts.every((p, i) => p === b.parts[i]))
