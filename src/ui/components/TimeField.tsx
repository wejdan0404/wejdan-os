import styles from './TimeField.module.css'

export interface TimeFieldProps {
  /** Minutes after midnight. */
  minute: number
  onChange: (minute: number) => void
  /** Accessible name of the whole field («وقت الصحيان»). */
  label: string
  /** Class for each select (lets screens keep their own control look). */
  selectClassName?: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const HOURS = Array.from({ length: 24 }, (_, h) => h)

/**
 * 24-hour time picker made of two native selects (a11y #18). The native time input shows Latin
 * «AM/PM» on some locales; the rest of the app uses Western 24h times («06:30»), so this matches it
 * — and each select is a 44px target that VoiceOver reads as «الساعة» / «الدقيقة».
 */
export function TimeField({ minute, onChange, label, selectClassName }: TimeFieldProps) {
  const safe = Number.isFinite(minute) ? Math.max(0, Math.min(24 * 60 - 1, Math.round(minute))) : 0
  const h = Math.floor(safe / 60)
  const m = safe % 60
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5)
  if (!minutes.includes(m)) minutes.push(m)
  minutes.sort((a, b) => a - b)
  return (
    <span className={styles.field} role="group" aria-label={label} dir="ltr">
      <select aria-label={`${label}: الساعة`} className={selectClassName} value={h} onChange={(e) => onChange(Number(e.target.value) * 60 + m)}>
        {HOURS.map((x) => (
          <option key={x} value={x}>
            {pad(x)}
          </option>
        ))}
      </select>
      <span className={styles.colon} aria-hidden="true">
        :
      </span>
      <select aria-label={`${label}: الدقيقة`} className={selectClassName} value={m} onChange={(e) => onChange(h * 60 + Number(e.target.value))}>
        {minutes.map((x) => (
          <option key={x} value={x}>
            {pad(x)}
          </option>
        ))}
      </select>
    </span>
  )
}
