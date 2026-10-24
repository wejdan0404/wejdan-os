/**
 * Focus management for the push/pop stack (a11y #1): a pushed screen takes focus on its title
 * (screen readers announce where she landed), and popping returns focus to whatever opened it.
 */

const TITLE = '[data-screen-title]'

/** Focus the screen title inside `container`, waiting briefly for a lazy screen to render. */
export function focusScreenTitle(container: HTMLElement | null, timeoutMs = 2000): () => void {
  let cancelled = false
  const started = performance.now()
  const tick = () => {
    if (cancelled || !container) return
    const el = container.querySelector<HTMLElement>(TITLE)
    if (el) {
      el.focus({ preventScroll: true })
      return
    }
    if (performance.now() - started < timeoutMs) window.setTimeout(tick, 50)
  }
  tick()
  return () => {
    cancelled = true
  }
}

const usable = (el: Element | null): el is HTMLElement =>
  !!el && el instanceof HTMLElement && el.isConnected && !el.closest('[inert]') && el !== document.body

/** Return focus to the opener if it's still there and reachable; otherwise to the visible screen's title. */
export function restoreFocus(opener: Element | null, fallbackContainer: HTMLElement | null) {
  // A sheet or the next screen may already have taken focus — don't steal it back.
  const current = document.activeElement
  if (current && current !== document.body && !current.closest('[inert]') && current.isConnected) {
    const inPushed = current.closest('[data-stack="pushed"]')
    if (!inPushed) return
  }
  if (usable(opener)) {
    opener.focus({ preventScroll: true })
    return
  }
  fallbackContainer?.querySelector<HTMLElement>(TITLE)?.focus({ preventScroll: true })
}
