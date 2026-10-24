import type { ReactNode } from 'react'
import { STAR_PATH } from './StarMark'
import styles from './EmptyState.module.css'

export interface EmptyStateProps {
  title: string
  body?: string
  action?: ReactNode
  /** Halftone field (default). Off on screens that already carry a pattern — one family per composition. */
  pattern?: boolean
}

/** Empty state with the identity's "Halftone Field" — a grid of stars fading toward an edge. Never the W. */
export function EmptyState({ title, body, action, pattern = true }: EmptyStateProps) {
  const cols = 9
  const rows = 5
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const fade = 1 - c / (cols - 1)
      const s = 0.18 + 0.32 * fade
      cells.push(
        <path
          key={`${r}-${c}`}
          d={STAR_PATH}
          transform={`translate(${c * 16 + 8} ${r * 16 + 8}) scale(${s * 6})`}
          opacity={0.15 + 0.55 * fade * (1 - Math.abs(r - 2) / 4)}
        />,
      )
    }
  }
  return (
    <div className={styles.empty}>
      {pattern && (
        <svg className={styles.field} viewBox={`0 0 ${cols * 16} ${rows * 16}`} aria-hidden="true">
          <g fill="currentColor">{cells}</g>
        </svg>
      )}
      <p className={styles.title}>{title}</p>
      {body && <p className={styles.body}>{body}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
