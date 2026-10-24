import { motion, type MotionProps } from 'framer-motion'

/**
 * The identity's concave 4-point star. Inner/outer radius ≈ 0.38.
 * Meaning: evidence only (a logged completion, a verified source, a decision) — never decoration.
 */
export const STAR_PATH = 'M0 -1 Q0.04 -0.04 1 0 Q0.04 0.04 0 1 Q-0.04 0.04 -1 0 Q-0.04 -0.04 0 -1Z'

export interface StarMarkProps extends MotionProps {
  size?: number
  color?: string
  /** Adds Glow/Micro — reserved for the hero star only. */
  glow?: boolean
  label?: string
  className?: string
}

export function StarMark({ size = 12, color = 'currentColor', glow, label, className, ...motionProps }: StarMarkProps) {
  return (
    <motion.svg
      className={className}
      width={size}
      height={size}
      viewBox="-1 -1 2 2"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ flexShrink: 0, overflow: 'visible', filter: glow ? 'drop-shadow(0 0 6px var(--glow-accent))' : undefined }}
      {...motionProps}
    >
      <path d={STAR_PATH} fill={color} />
    </motion.svg>
  )
}
