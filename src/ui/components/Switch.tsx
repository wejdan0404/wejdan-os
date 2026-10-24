import styles from './Switch.module.css'

export interface SwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  /** Accessible name (the row title is usually enough). */
  label: string
  disabled?: boolean
}

/**
 * iOS-style on/off switch (role="switch"). Clicks don't bubble to the row behind it.
 * Off and on differ by more than colour: off = hollow outlined track with a small solid thumb;
 * on = filled track, larger thumb on the other side carrying a check mark.
 */
export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={styles.switch}
      data-on={checked || undefined}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
    >
      <span className={styles.thumb}>
        <svg className={styles.check} viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  )
}
