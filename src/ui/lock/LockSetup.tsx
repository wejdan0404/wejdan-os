import { useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { VaultError, isValidPassword, isValidUsername, passwordStrength, type PreparedProfile } from '../../domain/vault'
import { T } from './copy'
import { useVault } from './context'
import { StrengthMeter, TextField, WarnCard } from './fields'
import { BackRow, LockPage, Steps } from './LockPage'
import { LIcon } from './LockIcons'
import { RecoveryCodeStep } from './RecoveryCodeStep'
import s from './lock.module.css'

/**
 * First-time setup, two steps. Nothing is saved until «حفظته»: step 1 only derives keys in memory,
 * step 2 shows the recovery code, and «حفظته» migrates the existing data into the first (encrypted) profile.
 */
export function LockSetup({ name, onClose }: { name: string; onClose: () => void }) {
  const api = useVault()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [prep, setPrep] = useState<PreparedProfile | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const level = passwordStrength(password)
  const mismatch = touched && repeat.length > 0 && repeat !== password
  const valid = isValidUsername(username) && isValidPassword(password) && repeat === password
  const userError = touched && username.length > 0 && !isValidUsername(username) ? T.usernameHelp : null
  const stable = useMemo(() => name, [name])

  const next = async () => {
    if (!api || !valid || busy) return
    setBusy(true)
    setErr(null)
    try {
      setPrep(await api.vault.prepare({ name: stable, username, password }))
    } catch (e) {
      setErr(e instanceof VaultError && e.code === 'username-taken' ? T.taken : T.enableFailed)
    } finally {
      setBusy(false)
    }
  }

  if (prep)
    return (
      <RecoveryCodeStep
        portal
        code={prep.recoveryCode}
        busy={busy}
        error={err}
        onBack={() => setPrep(null)}
        onSaved={async () => {
          if (!api) return
          setBusy(true)
          setErr(null)
          try {
            await api.activate(prep)
          } catch (e) {
            setBusy(false)
            setErr(e instanceof VaultError && e.code === 'no-storage' ? T.noStorage : T.enableFailed)
          }
        }}
      />
    )

  return (
    <LockPage portal label={T.setupTitle} onEscape={busy ? undefined : onClose}>
      <BackRow label={T.settingsBack} onClick={onClose} />
      <Steps n={1} />
      <h1 className={s.title} data-autofocus tabIndex={-1}>{T.setupTitle}</h1>
      <p className={s.lede}>{T.setupLede}</p>
      <form className={s.stack} onSubmit={(e) => (e.preventDefault(), setTouched(true), void next())} noValidate>
        <TextField label={T.username} value={username} onChange={setUsername} ltr helper={T.usernameHelp} error={userError} autoComplete="username" onBlur={() => setTouched(true)} />
        <div className={s.stack} style={{ gap: 8 }}>
          <TextField label={T.password} value={password} onChange={setPassword} ltr secret helper={T.passwordHelp} autoComplete="new-password" />
          <StrengthMeter level={level} />
        </div>
        <TextField label={T.repeatPassword} value={repeat} onChange={setRepeat} ltr secret error={mismatch ? T.mismatch : null} autoComplete="new-password" onBlur={() => setTouched(true)} />
        <WarnCard title={T.warnTitle}>{T.warnBody}</WarnCard>
        {err && (
          <p className={s.help} data-error role="alert">
            <LIcon name="info" size={16} />
            {err}
          </p>
        )}
        <div className={s.actions} style={{ marginBlockStart: 0 }}>
          <Button type="submit" size="large" block disabled={!valid || busy} aria-busy={busy || undefined}>
            {busy ? T.opening : T.next}
          </Button>
          <button type="button" className={s.textBtn} onClick={onClose}>
            {T.notNow}
          </button>
        </div>
      </form>
    </LockPage>
  )
}
