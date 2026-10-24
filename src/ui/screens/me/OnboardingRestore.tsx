import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { BackupInfo, ExportJson, ImportPreview } from '../../../domain'
import { Button } from '../../components/Button'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { useToast } from '../../components/Toast'
import { countLabel } from '../../lib/plural'
import { useStore } from '../../state/LifeStore'
import { CANCELLED, useBackupIO } from '../../lock/backupIO'
import { ImportReview } from './ImportReview'
import { BACKUP_REASON_AR, RECORD_NOUN, RowIcon, fmtIso } from './meKit'
import me from './me.module.css'
import styles from './Onboarding.module.css'

/**
 * First run, «عندي نسخة احتياطية» (a screen in the onboarding flow, no tab bar): restore one of the automatic backups, or import a backup file,
 * before onboarding. Nothing is written until she picks one (no starter habits / products here);
 * the same restore and import-review logic as Settings runs, and a successful restore ends
 * onboarding — her restored data is already her setup.
 */
export function OnboardingRestore({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const io = useBackupIO()
  const fileRef = useRef<HTMLInputElement>(null)
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [pending, setPending] = useState<{ name: string; data: unknown; preview: ImportPreview; current: ExportJson | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    store
      .listBackups()
      .then((b) => alive && setBackups(b))
      .catch(() => alive && setBackups([]))
    return () => {
      alive = false
    }
  }, [store])

  /** Restored data is her setup: leave onboarding (the screen then routes into the app). */
  const finishRestore = async () => {
    const cur = store.getSnapshot().settings
    if (!cur.onboardingDone) await store.updateSettings({ ...cur, onboardingDone: true })
  }

  const restore = async (b: BackupInfo) => {
    setBusy(true)
    setError(null)
    try {
      await store.restoreBackup(b.id)
      await finishRestore()
      toast({ message: 'رجعت نسختك' })
    } catch {
      setError('ما رجعت النسخة — ما تغيّر شي. جربي مرة ثانية.')
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setError(null)
    try {
      const data = await io.readBackup(f)
      if (data === CANCELLED) return
      const preview = await store.previewImport(data)
      if (!preview.ok) setError(preview.error ?? 'الملف ما ينقرأ')
      else setPending({ name: f.name, data, preview, current: await store.exportAll().catch(() => null) })
    } catch {
      setError(`ما قدرنا نقرا «${f.name}» — تأكدي إنه ملف JSON مصدّر من التطبيق.`)
    }
  }

  const confirmImport = async (build: (current: ExportJson) => unknown) => {
    setBusy(true)
    try {
      await store.importAll(build(await store.exportAll()), { confirm: true })
      await finishRestore()
      setPending(null)
      toast({ message: 'انستوردت بياناتك' })
    } catch {
      setError('ما انستوردت — ما تغيّر شي.')
      setPending(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className={styles.top}>
        <button type="button" className={styles.back} onClick={pending ? () => setPending(null) : onClose} aria-label="رجوع">
          رجوع
        </button>
      </div>
      <main className={styles.body}>
        <div className={styles.step}>
          {pending ? (
            <ImportReview
              fileName={pending.name}
              data={pending.data}
              preview={pending.preview}
              current={pending.current}
              busy={busy}
              onConfirm={(build) => void confirmImport(build)}
              onCancel={() => setPending(null)}
            />
          ) : (
            <>
              <h1 className={styles.h1}>عندك نسخة احتياطية؟</h1>
              <p className={styles.lede}>ترجعين بياناتك زي ما كانت، وما نضيف لك شي من عندنا.</p>
              {backups.length > 0 && (
                <InsetGroupedList flush header="نسخ تلقائية على جهازك">
                  {backups.map((b) => (
                    <ListRow
                      key={b.id}
                      leading={<RowIcon name="restore" tone="ink" />}
                      title={BACKUP_REASON_AR[b.reason] ?? b.reason}
                      subtitle={`${fmtIso(b.createdAt)} · ${countLabel(b.records, RECORD_NOUN)}`}
                      trailing={
                        <Button variant="plain" disabled={busy} onClick={() => void restore(b)}>
                          استرجعي
                        </Button>
                      }
                    />
                  ))}
                </InsetGroupedList>
              )}
              <InsetGroupedList flush>
                <ListRow leading={<RowIcon name="import" />} title="استوردي ملف نسخة" subtitle="ملف JSON مصدّر من التطبيق" chevron onClick={() => fileRef.current?.click()} />
              </InsetGroupedList>
              {error && (
                <p className={styles.lede} role="alert">
                  {error}
                </p>
              )}
            </>
          )}
          <input ref={fileRef} type="file" accept="application/json,.json" className={me.hiddenInput} onChange={(e) => void onFile(e)} tabIndex={-1} aria-hidden="true" />
        </div>
      </main>
      {!pending && (
        <footer className={styles.footer}>
          <Button variant="plain" block onClick={onClose}>
            لا، أبدأ من جديد
          </Button>
        </footer>
      )}
    </>
  )
}
