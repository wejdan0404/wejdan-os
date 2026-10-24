import type { ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import styles from './Chip.module.css'

export interface ChipProps {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'success' | 'warning'
  icon?: ReactNode
  selected?: boolean
  onClick?: () => void
  /** Inside a `radiogroup` the toggle is a radio (aria-checked) instead of a pressed button. */
  role?: 'radio'
}

/** Tag/chip — radius 4 per identity. Becomes a toggle button when onClick is given. */
export function Chip({ children, tone = 'neutral', icon, selected, onClick, role }: ChipProps) {
  const cls = [styles.chip, styles[tone], selected ? styles.selected : ''].join(' ')
  if (onClick) {
    return (
      <button
        type="button"
        className={`${cls} ${styles.interactive}`}
        role={role}
        aria-checked={role === 'radio' ? !!selected : undefined}
        aria-pressed={role === 'radio' ? undefined : selected}
        onClick={onClick}
      >
        {/* selected state is not colour-only: a check mark leads the label */}
        {selected ? <Icon name="check" size={14} className={styles.check} aria-hidden="true" /> : icon}
        {children}
      </button>
    )
  }
  return (
    <span className={cls}>
      {icon}
      {children}
    </span>
  )
}
