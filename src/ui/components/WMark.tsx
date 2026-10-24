import styles from './WMark.module.css'
import { W_PATH_D, W_RATIO, W_VIEWBOX } from './wPath'

export interface WMarkProps {
  /** One of the identity sizes: 16 · 20 · 24 · 32 · 48 · 64 · 96 · 128 · 192 · 256 */
  size?: 16 | 20 | 24 | 32 | 48 | 64 | 96 | 128 | 192 | 256
  /** Glow/Micro — allowed on the W only on dark grounds, and only from 48px up. */
  glow?: boolean
  label?: string
}

/**
 * The W monogram, inline SVG filled with `currentColor` (`--mark-color`: ink on light, white on
 * dark) — never brand-coloured, never stretched or rotated. Below 32px the three stars merge.
 */
export function WMark({ size = 32, glow, label = 'وجدان' }: WMarkProps) {
  return (
    <svg
      role="img"
      aria-label={label}
      className={styles.mark}
      data-glow={glow && size >= 48 ? true : undefined}
      width={size}
      height={Math.round(size * W_RATIO)}
      viewBox={W_VIEWBOX}
      fill="none"
      focusable="false"
    >
      <path d={W_PATH_D} fill="currentColor" />
    </svg>
  )
}
