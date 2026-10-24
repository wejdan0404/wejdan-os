import { useState } from 'react'
import { Button } from '../components/Button'
import { isValidPassword, normalizeRecoveryCode, passwordStrength, type Profile, type Session } from '../../domain/vault'
import { T } from './copy'
import type { VaultApi } from './context'
import { StrengthMeter, TextField } from './fields'
import { BackRow, LockPage } from './LockPage'
import { RecoveryCodeStep } from './RecoveryCodeStep'
import s from './lock.module.css'

/** «نسيتي كلمة السر؟» — recovery code → new password → new recovery code (shown once, like setup). */
export function ForgotFlow({ api, profile, onBack, onDone }: { api: VaultApi; profile: Profile; onBack: () => void; onDone: (s: Session) => void }) {
  const [step, setStep] = useState<'code' | 'password' | 'newcode'>('code')
  const [code, setCode] = useState('')
  const [wrong, setWrong] = useState(false)
  const [pw, setPw] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ session: Session; recoveryCode: string } | null>(null)

  const checkCode = async () => {
    setBusy(true)
    const ok = normalizeRecoveryCode(code) != null && (await api.vault.checkRecovery(profile.id, code))
    setBusy(false)
    if (ok) setStep('password')
    else setWrong(true)
  }
  const reset = async () => {
    setBusy(true)
    const r = await api.vault.resetWithRecovery(profile.id, code, pw)
    setBusy(false)
    if (r) {
      setResult(r)
      setStep('newcode')
    } else {
      setStep('code')
      setWrong(true)
    }
  }

  if (step === 'newcode' && result)
    return <RecoveryCodeStep code={result.recoveryCode} onSaved={() => onDone(result.session)} />

  const fmt = (v: string) => {
    const c = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)
    return c.replace(/(.{4})(?=.)/g, '$1 ')
  }
  return (
    <LockPage label={T.forgotTitle}>
      <BackRow label={T.back} onClick={step === 'password' ? () => setStep('code') : onBack} />
      <h1 className={s.title} data-autofocus tabIndex={-1}>{step === 'code' ? T.forgotTitle : T.newPasswordTitle}</h1>
      {step === 'code' ? (
        <form className={s.stack} onSubmit={(e) => (e.preventDefault(), void checkCode())}>
          <p className={s.lede} style={{ marginBottom: 0 }}>{T.forgotLede}</p>
          <TextField
            label={T.recoveryField}
            value={code}
            onChange={(v) => (setCode(fmt(v)), setWrong(false))}
            ltr
            helper={T.recoveryHelp}
            error={wrong ? T.recoveryWrong : null}
            autoComplete="off"
            inputMode="text"
            placeholder="XXXX XXXX XXXX XXXX"
          />
          <Button type="submit" size="large" block disabled={busy || code.replace(/ /g, '').length < 16}>
            {busy ? T.opening : T.next}
          </Button>
        </form>
      ) : (
        <form className={s.stack} onSubmit={(e) => (e.preventDefault(), void reset())}>
          <TextField label={T.newPassword} value={pw} onChange={setPw} ltr secret helper={T.passwordHelp} autoComplete="new-password" />
          <StrengthMeter level={passwordStrength(pw)} />
          <TextField label={T.repeatPassword} value={repeat} onChange={setRepeat} ltr secret error={repeat && repeat !== pw ? T.mismatch : null} autoComplete="new-password" />
          <Button type="submit" size="large" block disabled={busy || !isValidPassword(pw) || pw !== repeat}>
            {busy ? T.opening : T.next}
          </Button>
        </form>
      )}
    </LockPage>
  )
}
