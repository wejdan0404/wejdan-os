import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/Button'
import { WMark } from '../components/WMark'
import { Bidi } from '../components/Bidi'
import { remainingSeconds, type Profile, type Session } from '../../domain/vault'
import { T, clock, spoken } from './copy'
import type { VaultApi } from './context'
import { TextField } from './fields'
import { LIcon } from './LockIcons'
import { BackRow, LockPage } from './LockPage'
import s from './lock.module.css'

/** Unlock: username (prefilled, editable) + password. Wrong → calm inline message; 5th → soft delay card. */
export function UnlockScreen({
  api, profile, onUnlocked, onForgot, onBack,
}: { api: VaultApi; profile: Profile; onUnlocked: (s: Session) => void; onForgot: () => void; onBack?: () => void }) {
  const [username, setUsername] = useState(profile.username)
  const [password, setPassword] = useState('')
  const [wrong, setWrong] = useState(false)
  const [missing, setMissing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const pwRef = useRef<HTMLInputElement>(null)
  const live = api.vault.profile(profile.id) ?? profile
  const wait = remainingSeconds(live.attempts, now)

  // the countdown ticks once a second; when it ends the field comes back and takes focus
  useEffect(() => {
    if (wait <= 0) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [wait > 0])
  const waiting = wait > 0
  const wasWaiting = useRef(false)
  useEffect(() => {
    if (waiting) wasWaiting.current = true
    else if (wasWaiting.current) {
      wasWaiting.current = false
      setWrong(false)
      pwRef.current?.focus()
    }
  }, [waiting])

  const submit = async () => {
    if (busy || waiting || !password) return
    setBusy(true)
    const r = await api.vault.unlock(profile.id, username, password)
    if (r.ok) return onUnlocked(r.session)
    setBusy(false)
    setNow(Date.now())
    setMissing(r.reason === 'missing')
    if (r.reason === 'wrong' && r.retryAt <= Date.now()) {
      setWrong(true)
      pwRef.current?.focus()
    } else setWrong(false)
  }

  return (
    <LockPage glow label={T.unlock}>
      {onBack ? <BackRow label={T.back} onClick={onBack} /> : <div className={s.top} />}
      <div className={s.hero}>
        <WMark size={64} glow />
        <h1 className={s.heroTitle}>
          {T.welcome} <bdi>{profile.name}</bdi>
        </h1>
        <p className={s.heroLede}>{T.unlockLede}</p>
      </div>
      <form className={s.stack} onSubmit={(e) => (e.preventDefault(), void submit())}>
        <TextField label={T.username} value={username} onChange={(v) => (setUsername(v), setWrong(false))} ltr autoComplete="username" disabled={waiting} />
        <TextField
          ref={pwRef}
          label={T.password}
          value={password}
          onChange={(v) => (setPassword(v), setWrong(false), setMissing(false))}
          ltr
          secret
          autoComplete="current-password"
          error={missing ? T.missingData : wrong && !waiting ? T.wrong : null}
          disabled={waiting}
          data-autofocus
        />
        {waiting && (
          <section className={s.waitCard} role="status" aria-live="polite">
            <span className={s.waitIcon}>
              <LIcon name="clock" size={20} />
            </span>
            <div>
              <h2 className={s.warnTitle} style={{ color: 'var(--text-primary)' }}>{T.waitTitle}</h2>
              <p className={s.warnBody}>
                <Bidi>{T.waitBody(spoken(wait))}</Bidi>
              </p>
            </div>
          </section>
        )}
        <div className={s.actions} style={{ marginBlockStart: 0 }}>
          <Button type="submit" size="large" block disabled={waiting || busy || !password} aria-busy={busy || undefined}>
            {waiting ? <Bidi>{T.waitButton(clock(wait))}</Bidi> : busy ? T.opening : T.unlock}
          </Button>
          <button type="button" className={s.textBtn} onClick={onForgot}>
            {T.forgot}
          </button>
        </div>
      </form>
      <div className={s.spacer} />
      <p className={s.foot}>
        <LIcon name="lock" size={16} />
        {T.onDeviceOnly}
      </p>
    </LockPage>
  )
}
