import { useRef, useState } from 'react'
import { Button } from '../components/Button'
import { useToast } from '../components/Toast'
import type { Session } from '../../domain/vault'
import { CANCELLED, useBackupIO } from './backupIO'
import { T } from './copy'
import s from './lock.module.css'

/**
 * The profile opened (right password) but its data could not be loaded. Never a dead end: try again, open a backup
 * file (the current data is backed up first), or go back to the lock screen. Nothing is deleted by showing this.
 */
export function UnreadableProfile({ session, onRetry, onBack }: { session: Session; onRetry: () => void; onBack: () => void }) {
  const io = useBackupIO()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  const pick = async (f: File | undefined) => {
    if (!f) return
    setBusy(true)
    try {
      const data = await io.readBackup(f)
      if (data === CANCELLED) return
      const preview = await session.repo.previewImport(data)
      if (!preview.ok) return void toast({ message: T.importBadFile })
      setPending(data)
    } catch {
      toast({ message: T.importFailed })
    } finally {
      setBusy(false)
    }
  }
  const confirm = async () => {
    setBusy(true)
    try {
      await session.repo.importAll(pending, { confirm: true, reason: 'before-import' })
      setPending(null)
      onRetry()
    } catch {
      toast({ message: T.importFailed })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={s.splash} role="alert">
      <div className={s.stack} style={{ padding: 24, maxWidth: 420, textAlign: 'center' }}>
        <h1 className={s.title} data-autofocus tabIndex={-1}>{pending ? T.importConfirmTitle : T.unreadableTitle}</h1>
        <p className={s.lede}>{pending ? T.importConfirmBody : T.unreadableBody}</p>
        <div className={s.actions}>
          {pending ? (
            <>
              <Button size="large" block disabled={busy} onClick={() => void confirm()}>{T.importConfirm}</Button>
              <button type="button" className={s.textBtn} disabled={busy} onClick={() => setPending(null)}>{T.cancel}</button>
            </>
          ) : (
            <>
              <Button size="large" block disabled={busy} onClick={onRetry}>{T.retry}</Button>
              <Button size="large" block variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>{T.openBackup}</Button>
              <button type="button" className={s.textBtn} disabled={busy} onClick={onBack}>{T.back}</button>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void pick(f) }} />
      </div>
    </div>
  )
}
