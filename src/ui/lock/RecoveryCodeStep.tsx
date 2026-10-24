import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { formatRecoveryCode } from '../../domain/vault'
import { T } from './copy'
import { LIcon } from './LockIcons'
import { BackRow, LockPage, Steps } from './LockPage'
import s from './lock.module.css'

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

/**
 * Step 2 of 2 — the recovery code, shown once. hidden → revealed → copied. «حفظته» needs it revealed
 * (copying is encouraged, not required). The code lives only in this component's props/state.
 */
export function RecoveryCodeStep({
  code, onSaved, onBack, busy, portal, error,
}: { code: string; onSaved: () => void; onBack?: () => void; busy?: boolean; portal?: boolean; error?: string | null }) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState<'no' | 'yes' | 'failed'>('no')
  const groups = formatRecoveryCode(code).split(' ')
  // never leave the code on the clipboard history screen longer than needed: nothing to do on unmount (we can't read it back)
  useEffect(() => () => setCopied('no'), [])
  return (
    <LockPage portal={portal} label={T.recoveryTitle}>
      {onBack ? <BackRow label={T.back} onClick={onBack} /> : <div className={s.top} />}
      <Steps n={2} />
      <h1 className={s.title} data-autofocus tabIndex={-1}>{T.recoveryTitle}</h1>
      <p className={s.lede}>{T.recoveryLede}</p>
      <div className={s.stack}>
        <section className={s.codeCard}>
          <div className={s.code} data-testid="recovery-code" aria-label={revealed ? undefined : T.codeHidden} role={revealed ? undefined : 'img'}>
            {groups.map((g, i) => (
              <span key={i}>{revealed ? g : '••••'}</span>
            ))}
          </div>
          <div className={s.codeBtns}>
            <button type="button" className={s.ghost} onClick={() => setRevealed((x) => !x)} aria-pressed={revealed}>
              <LIcon name={revealed ? 'eyeOff' : 'eye'} size={18} />
              {revealed ? T.conceal : T.reveal}
            </button>
            <button
              type="button"
              className={s.ghost}
              disabled={!revealed}
              onClick={() => void copyText(formatRecoveryCode(code)).then((ok) => setCopied(ok ? 'yes' : 'failed'))}
            >
              <LIcon name="copy" size={18} />
              {T.copy}
            </button>
          </div>
          <p className={s.status} aria-live="polite" style={copied === 'failed' ? { color: 'var(--error)' } : undefined}>
            {copied === 'yes' && (
              <>
                <LIcon name="check" size={16} />
                {T.copied}
              </>
            )}
            {copied === 'failed' && T.copyFailed}
          </p>
        </section>
        <div className={s.group}>
          <div className={s.tip}>
            <div>
              <div className={s.tipT}>{T.tipPaperTitle}</div>
              <div className={s.tipB}>{T.tipPaperBody}</div>
            </div>
            <LIcon name="file" size={22} />
          </div>
          <div className={s.tip}>
            <div>
              <div className={s.tipT}>{T.tipLostTitle}</div>
              <div className={s.tipB}>{T.tipLostBody}</div>
            </div>
            <LIcon name="key" size={22} />
          </div>
        </div>
        {!revealed && <p className={s.hint}>{T.revealHint}</p>}
        {error && (
          <p className={s.help} data-error role="alert">
            <LIcon name="info" size={16} />
            {error}
          </p>
        )}
        <Button size="large" block disabled={!revealed || busy} onClick={onSaved} aria-busy={busy || undefined}>
          {busy ? T.opening : T.saved}
        </Button>
      </div>
    </LockPage>
  )
}
