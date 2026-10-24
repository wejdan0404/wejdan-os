import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'

// Lazy screens are transformed on first import; on a busy machine that alone can exceed the
// default 1 s, which made findBy*/waitFor flaky. A wider window changes no assertion.
configure({ asyncUtilTimeout: 5000 })

// jsdom lacks these browser APIs used by framer-motion / layout code
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver ??= RO
