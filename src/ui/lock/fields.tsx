import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Bidi } from '../components/Bidi'
import { LIcon } from './LockIcons'
import { T } from './copy'
import s from './lock.module.css'

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string
  value: string
  onChange: (v: string) => void
  /** Left-to-right value (usernames, passwords, codes): the text is right-aligned inside the RTL layout. */
  ltr?: boolean
  helper?: string
  /** Error helper (alert icon + text); also puts the 1.5px error border on the field. */
  error?: string | null
  /** Show an eye button that reveals the value (password fields). */
  secret?: boolean
}

/** Label above, 52px well, focus ring inside, helper below. Errors are text + icon + border, never colour alone. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, value, onChange, ltr, helper, error, secret, disabled, type, ...rest }, ref,
) {
  const id = useId()
  const hid = `${id}-h`
  const [shown, setShown] = useState(false)
  const msg = error ?? helper
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {label}
      </label>
      <div className={s.well} data-error={error ? '' : undefined} data-disabled={disabled ? '' : undefined}>
        <input
          ref={ref}
          id={id}
          className={s.input}
          dir={ltr ? 'ltr' : undefined}
          value={value}
          disabled={disabled}
          type={secret && !shown ? 'password' : (type ?? 'text')}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={msg ? hid : undefined}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          {...rest}
        />
        {secret && (
          <button type="button" className={s.eye} onClick={() => setShown((x) => !x)} aria-label={shown ? T.hide : T.show} aria-pressed={shown} disabled={disabled}>
            <LIcon name={shown ? 'eye' : 'eyeOff'} />
          </button>
        )}
      </div>
      {msg && (
        <p id={hid} className={s.help} data-error={error ? '' : undefined} role={error ? 'alert' : undefined}>
          {error && <LIcon name="info" size={16} />}
          <span>
            <Bidi>{msg}</Bidi>
          </span>
        </p>
      )}
    </div>
  )
})

/** 4 segments + a plain-words caption. */
export function StrengthMeter({ level }: { level: 0 | 1 | 2 | 3 | 4 }) {
  return (
    <div className={s.field} style={{ gap: 8 }}>
      <div className={s.meter} role="img" aria-label={T.strengthLabel(level)}>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={s.seg} data-on={i <= level ? '' : undefined} />
        ))}
      </div>
      {level > 0 && (
        <p className={s.help} aria-live="polite">
          {T.strength[level]}
        </p>
      )}
    </div>
  )
}

export function WarnCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={s.warn}>
      <span className={s.warnIcon}>
        <LIcon name="alert" size={20} />
      </span>
      <div>
        <h2 className={s.warnTitle}>{title}</h2>
        <p className={s.warnBody}>{children}</p>
      </div>
    </section>
  )
}
