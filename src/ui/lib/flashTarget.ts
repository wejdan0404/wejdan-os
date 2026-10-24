/**
 * After a search result opens a list screen, find the row for that item, bring it into view and
 * flash a short focus-ring outline on it — so she lands ON the thing she searched for, not just on
 * its screen (QA area 5 #9).
 *
 * Works on any screen built from ListRow (role="listitem"): it looks only inside the visible screen
 * (the pushed screen, else the active tab), matches the row text with the same Arabic folding as the
 * search, and gives up quietly after ~2.5s. Reduced motion: no smooth scroll, a steady ring instead
 * of a fade.
 */
import { normalizeArabic } from '../../domain'

export interface FlashOptions {
  /** Stop looking after this many ms (default 2500). */
  timeoutMs?: number
  /** Called with the row that was found (tests). */
  onFound?: (el: HTMLElement) => void
}

const visibleScope = (): ParentNode =>
  document.querySelector('[data-stack="pushed"]') ?? document.querySelector('[data-active-root]') ?? document

export function findRow(title: string, scope: ParentNode = visibleScope()): HTMLElement | null {
  const want = normalizeArabic(title)
  if (want === '') return null
  const rows = scope.querySelectorAll<HTMLElement>('[role="listitem"]')
  for (const r of rows) if (normalizeArabic(r.textContent ?? '').includes(want)) return r
  return null
}

export function flashTarget(title: string, o: FlashOptions = {}): () => void {
  const deadline = Date.now() + (o.timeoutMs ?? 2500)
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  let timer: ReturnType<typeof setTimeout> | undefined
  let cancelled = false
  const tick = () => {
    if (cancelled) return
    const hit = findRow(title)
    if (!hit) {
      if (Date.now() < deadline) timer = setTimeout(tick, 120)
      return
    }
    hit.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
    if (typeof hit.animate === 'function') {
      hit.animate(
        reduce
          ? [{ outline: '2px solid var(--focus-ring)', outlineOffset: '-2px' }, { outline: '2px solid var(--focus-ring)', outlineOffset: '-2px' }]
          : [
              { outline: '2px solid var(--focus-ring)', outlineOffset: '-2px' },
              { outline: '2px solid var(--focus-ring)', outlineOffset: '-2px', offset: 0.7 },
              { outline: '2px solid transparent', outlineOffset: '-2px' },
            ],
        { duration: reduce ? 1400 : 1800, easing: 'ease-out' },
      )
    }
    hit.setAttribute('data-search-hit', '')
    setTimeout(() => hit.removeAttribute('data-search-hit'), 2000)
    o.onFound?.(hit)
  }
  // let the push / tab switch settle first
  timer = setTimeout(tick, 200)
  return () => {
    cancelled = true
    if (timer) clearTimeout(timer)
  }
}
