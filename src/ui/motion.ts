/** Identity motion tokens (ms) — "explain, then step aside". */
export const dur = {
  instant: 0,
  quick: 0.12,
  base: 0.2,
  slow: 0.32,
  gentle: 0.5,
  ambient: 8,
} as const

export const ease = {
  standard: [0.2, 0, 0, 1],
  enter: [0, 0, 0, 1],
  exit: [0.3, 0, 1, 1],
} as const satisfies Record<string, [number, number, number, number]>

/**
 * Apple-style springs expressed as response/damping-ratio (SwiftUI semantics),
 * converted to stiffness/damping for mass = 1.
 */
function spring(response: number, dampingRatio: number) {
  const stiffness = Math.pow((2 * Math.PI) / response, 2)
  const damping = 4 * Math.PI * dampingRatio / response
  return { type: 'spring' as const, stiffness, damping, mass: 1 }
}

export const springs = {
  /** Default UI spring: ~0.4s, very little bounce (iOS .smooth). */
  smooth: spring(0.4, 0.9),
  /** Slight life for selection indicators (iOS .snappy-ish). */
  snappy: spring(0.32, 0.82),
  /** Sheets and pushes: weighty, no overshoot. */
  sheet: spring(0.45, 1),
  /** Small confirmation pop (check, star). */
  pop: spring(0.3, 0.7),
} as const

export const fade = (d: number = dur.base) => ({ duration: d, ease: ease.standard })
