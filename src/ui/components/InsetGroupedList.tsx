import type { ReactNode } from 'react'
import styles from './InsetGroupedList.module.css'

export interface InsetGroupedListProps {
  header?: ReactNode
  footer?: ReactNode
  /** Small action on the header line (e.g. "الكل"). */
  headerAction?: ReactNode
  children: ReactNode
  /** Plain = no inset card, rows sit on the page with hairlines only. */
  variant?: 'inset' | 'plain'
  /** No page margin (inside sheets). */
  flush?: boolean
  /** Lifts the card off a tinted surface (e.g. results inside a sheet) with Shadow/Subtle — light only. */
  elevated?: boolean
  /** false for a group of fields/text (not rows): no list semantics, so screen readers don't count items. */
  asList?: boolean
}

export function InsetGroupedList({ header, footer, headerAction, children, variant = 'inset', flush, elevated, asList = true }: InsetGroupedListProps) {
  return (
    <section className={styles.section} data-flush={flush || undefined} data-elevated={elevated || undefined}>
      {(header || headerAction) && (
        <div className={styles.header}>
          {header && <h2 className={styles.headerText}>{header}</h2>}
          {headerAction}
        </div>
      )}
      <div role={asList ? 'list' : undefined} className={variant === 'inset' ? styles.group : styles.plain}>
        {children}
      </div>
      {footer && <p className={styles.footer}>{footer}</p>}
    </section>
  )
}
