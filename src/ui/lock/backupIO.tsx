/**
 * Export / import of backup files with optional password encryption.
 *  - Lock on → export asks «تبين الملف مشفّر بكلمة سر؟» (default yes). Lock off → plain, exactly as before.
 *  - Import accepts both: the plain schemaVersion-1 JSON (unchanged) and the encrypted file (asks for its password).
 * The file password is typed each time and never stored.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { BadSecretError, decryptBackup, encryptBackup, isEncryptedBackup, isValidPassword, type EncryptedBackupFile } from '../../domain/vault'
import { Button } from '../components/Button'
import { Sheet } from '../components/Sheet'
import { downloadJson } from '../screens/me/meKit'
import { T } from './copy'
import { TextField, WarnCard } from './fields'
import { LIcon } from './LockIcons'
import { useVault } from './context'
import s from './lock.module.css'

export const CANCELLED = Symbol('cancelled')

export interface BackupIO {
  /** Resolves true when a file was produced, false when she cancelled. */
  exportBackup(data: unknown, baseName: string): Promise<boolean>
  /** Parsed backup JSON (decrypted if needed), or CANCELLED. Throws for a file that is not JSON. */
  readBackup(file: File): Promise<unknown | typeof CANCELLED>
}

const plainIO: BackupIO = {
  async exportBackup(data, baseName) {
    downloadJson(data, `${baseName}.json`)
    return true
  },
  async readBackup(file) {
    const parsed: unknown = JSON.parse(await file.text())
    if (isEncryptedBackup(parsed)) throw new Error('encrypted backup needs the password prompt')
    return parsed
  },
}

const Ctx = createContext<BackupIO>(plainIO)
export const useBackupIO = (): BackupIO => useContext(Ctx)

export function BackupIOProvider({ children }: { children: ReactNode }) {
  const vault = useVault()
  const lockOn = !!vault?.enabled
  const [exp, setExp] = useState<{ data: unknown; base: string } | null>(null)
  const [imp, setImp] = useState<EncryptedBackupFile | null>(null)
  const expDone = useRef<((ok: boolean) => void) | null>(null)
  const impDone = useRef<((v: unknown | typeof CANCELLED) => void) | null>(null)

  const exportBackup = useCallback(
    (data: unknown, base: string) => {
      if (!lockOn) return plainIO.exportBackup(data, base)
      return new Promise<boolean>((resolve) => {
        expDone.current = resolve
        setExp({ data, base })
      })
    },
    [lockOn],
  )
  const readBackup = useCallback(async (file: File) => {
    const parsed: unknown = JSON.parse(await file.text())
    if (!isEncryptedBackup(parsed)) return parsed
    return new Promise<unknown | typeof CANCELLED>((resolve) => {
      impDone.current = resolve
      setImp(parsed)
    })
  }, [])
  const io = useMemo<BackupIO>(() => ({ exportBackup, readBackup }), [exportBackup, readBackup])

  return (
    <Ctx.Provider value={io}>
      {children}
      {exp && (
        <ExportSheet
          data={exp.data}
          base={exp.base}
          onDone={(ok) => {
            setExp(null)
            expDone.current?.(ok)
          }}
        />
      )}
      {imp && (
        <ImportSheet
          file={imp}
          onDone={(v) => {
            setImp(null)
            impDone.current?.(v)
          }}
        />
      )}
    </Ctx.Provider>
  )
}

function ExportSheet({ data, base, onDone }: { data: unknown; base: string; onDone: (ok: boolean) => void }) {
  const [encrypted, setEncrypted] = useState(true)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const ready = !encrypted || isValidPassword(pw)
  const go = async () => {
    setBusy(true)
    try {
      if (encrypted) {
        const file = await encryptBackup(data, pw)
        downloadJson(file, `${base}.encrypted.json`)
      } else downloadJson(data, `${base}.json`)
      onDone(true)
    } catch {
      setBusy(false)
    }
  }
  return (
    <Sheet open onClose={() => onDone(false)} title={T.exportTitle} detents={['large']}>
      <div className={s.sheet}>
        <p className={s.sheetLede}>{T.exportLede}</p>
        <div className={s.group} role="radiogroup" aria-label={T.exportTitle}>
          {([true, false] as const).map((v) => (
            <button key={String(v)} type="button" role="radio" aria-checked={encrypted === v} className={s.radio} onClick={() => setEncrypted(v)}>
              <span>
                <span className={s.radioT} style={{ display: 'block' }}>{v ? T.exportEncrypted : T.exportPlain}</span>
                <span className={s.radioS}>{v ? T.exportEncryptedSub : T.exportPlainSub}</span>
              </span>
              <span className={s.dot}>{encrypted === v && <LIcon name="check" size={14} />}</span>
            </button>
          ))}
        </div>
        {encrypted ? (
          <TextField label={T.filePassword} value={pw} onChange={setPw} ltr secret helper={T.fileHelp} autoComplete="new-password" />
        ) : (
          <WarnCard title={T.exportPlainWarnTitle}>{T.exportPlainWarnBody}</WarnCard>
        )}
        <Button disabled={!ready || busy} onClick={() => void go()}>
          {busy ? T.opening : T.exportButton}
        </Button>
        <button type="button" className={s.textBtn} onClick={() => onDone(false)}>
          {T.cancel}
        </button>
      </div>
    </Sheet>
  )
}

function ImportSheet({ file, onDone }: { file: EncryptedBackupFile; onDone: (v: unknown | typeof CANCELLED) => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    setErr(false)
    try {
      onDone(await decryptBackup(file, pw))
    } catch (e) {
      if (e instanceof BadSecretError) setErr(true)
      setBusy(false)
    }
  }
  return (
    <Sheet open onClose={() => onDone(CANCELLED)} title={T.importTitle} detents={['medium']}>
      <form className={s.sheet} onSubmit={(e) => (e.preventDefault(), void go())}>
        <p className={s.sheetLede}>{T.importLede}</p>
        <TextField label={T.filePassword} value={pw} onChange={(v) => (setPw(v), setErr(false))} ltr secret error={err ? T.importWrong : null} autoComplete="off" autoFocus />
        <Button type="submit" disabled={!pw || busy}>
          {busy ? T.opening : T.importOpen}
        </Button>
        <button type="button" className={s.textBtn} onClick={() => onDone(CANCELLED)}>
          {T.cancel}
        </button>
      </form>
    </Sheet>
  )
}
