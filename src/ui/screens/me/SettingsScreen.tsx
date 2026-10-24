import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useLocation } from 'react-router-dom'
import {
  legacyMigrationAvailable, markLegacyMigrated, newStoreIsEmpty, PersonalLibraryError, readLegacyData,
  type BackupInfo, type ExportJson, type ImportPreview, type Settings,
} from '../../../domain'
import { Button } from '../../components/Button'
import { Switch } from '../../components/Switch'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { Sheet } from '../../components/Sheet'
import { SegmentedControl } from '../../components/SegmentedControl'
import { useToast } from '../../components/Toast'
import { useTheme, type ThemePref } from '../../shell/theme'
import { useLife, useStore } from '../../state/LifeStore'
import { ImportReview } from './ImportReview'
import { countLabel, type NounForms } from '../../lib/plural'
import { ITEM } from '../sources/sourcesKit'
import { BACKUP_REASON_AR, RECORD_NOUN, RowIcon, fmtIso } from './meKit'

const ENTRY: NounForms = { one: 'بند', two: 'بندين', few: 'بنود', many: 'بند' }
import { TimeField } from '../../components/TimeField'
import { CANCELLED, useBackupIO } from '../../lock/backupIO'
import { suppressIntendedRoute } from '../../state/onboardingResume'
import { ProtectionSection } from '../../lock/ProtectionSection'
import { BackupReminderRow, RemindersSettingsGroup, StreakSettingGroup } from '../reminders/SettingsRows'
import { SettingsExtras } from './SettingsExtras'
import styles from './me.module.css'


export default function SettingsScreen() {
  const s = useLife()
  const store = useStore()
  const toast = useToast()
  const { pref, setPref } = useTheme()
  const { search } = useLocation()
  const set = (p: Partial<Settings>) => void store.updateSettings({ ...s.settings, ...p })
  const io = useBackupIO()

  // deep links: ?s=data / ?s=import
  useEffect(() => {
    const id = new URLSearchParams(search).get('s')
    if (!id) return
    const t = window.setTimeout(() => document.getElementById(`settings-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 350)
    return () => window.clearTimeout(t)
  }, [search])

  // ---- backups ---------------------------------------------------------------------------
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const refreshBackups = useCallback(() => void store.listBackups().then(setBackups).catch(() => setBackups([])), [store])
  useEffect(refreshBackups, [refreshBackups])
  const [restoreId, setRestoreId] = useState<string | null>(null)

  // ---- import -----------------------------------------------------------------------------
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ name: string; data: unknown; preview: ImportPreview; legacy?: boolean; merge?: boolean; current?: ExportJson | null } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setImportError(null)
    try {
      const data = await io.readBackup(f)
      if (data === CANCELLED) return
      const preview = await store.previewImport(data)
      if (!preview.ok) setImportError(preview.error ?? 'الملف ما ينقرأ')
      else setPending({ name: f.name, data, preview, current: await store.exportAll().catch(() => null) })
    } catch {
      setImportError(`ما قدرنا نقرا «${f.name}» — تأكدي إنه ملف JSON مصدّر من التطبيق.`)
    }
  }
  const confirmImport = async (build: (current: ExportJson) => unknown) => {
    if (!pending) return
    setBusy(true)
    try {
      const payload = build(await store.exportAll())
      const backup = await store.importAll(payload, { confirm: true })
      if (pending.legacy) {
        markLegacyMigrated(backup?.id ?? null)
        setLegacyAvailable(false)
      }
      setPending(null)
      refreshBackups()
      toast({ message: pending.legacy ? 'انتقلت بياناتك القديمة — وأخذنا نسخة احتياطية قبلها' : 'انستوردت بياناتك — وأخذنا نسخة احتياطية قبلها' })
    } catch {
      setImportError('ما انستوردت — بياناتك زي ما هي.')
    } finally {
      setBusy(false)
    }
  }

  // ---- old (Flutter) version's data: reachable anytime until it's moved ---------------------
  const [legacyAvailable, setLegacyAvailable] = useState(false)
  useEffect(() => {
    let alive = true
    legacyMigrationAvailable()
      .then((r) => alive && setLegacyAvailable(r.available))
      .catch(() => alive && setLegacyAvailable(false))
    return () => {
      alive = false
    }
  }, [])
  const startLegacyReview = useCallback(async () => {
    setImportError(null)
    try {
      const { data } = await readLegacyData()
      const preview = await store.previewImport(data)
      if (!preview.ok) {
        setImportError(preview.error ?? 'ما قدرنا نقرأ بيانات النسخة القديمة')
        return
      }
      // she already uses this app → merge by default, nothing of hers is overwritten
      const merge = !newStoreIsEmpty(store.getSnapshot())
      setPending({ name: 'النسخة القديمة', data, preview, legacy: true, merge, current: await store.exportAll().catch(() => null) })
      window.setTimeout(() => document.getElementById('settings-import')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 50)
    } catch {
      setImportError('ما قدرنا نقرأ بيانات النسخة القديمة الحين. هي سليمة على جهازك — جربي مرة ثانية.')
    }
  }, [store])
  // deep link from the re-offer sheet: open the review straight away
  const legacyAutoOpened = useRef(false)
  useEffect(() => {
    if (legacyAutoOpened.current || !legacyAvailable) return
    if (new URLSearchParams(search).get('s') !== 'legacy') return
    legacyAutoOpened.current = true
    void startLegacyReview()
  }, [search, legacyAvailable, startLegacyReview])

  // ---- her personal action library (device-only; never part of the public build) ----------
  const libRef = useRef<HTMLInputElement>(null)
  const [hasLib, setHasLib] = useState(() => {
    try {
      return store.hasPersonalLibrary()
    } catch {
      return false
    }
  })
  const onLibFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    try {
      const data: unknown = JSON.parse(await f.text())
      const n = await store.importPersonalLibrary(data)
      setHasLib(true)
      toast({ message: `انضافت مكتبتك (${countLabel(n, ENTRY)}) — محفوظة على جهازك بس` })
    } catch (err) {
      toast({ message: err instanceof PersonalLibraryError ? err.message : `ما قدرنا نقرا «${f.name}» — تأكدي إنه ملف مكتبتك` })
    } finally {
      setBusy(false)
    }
  }
  const removeLib = async () => {
    setBusy(true)
    try {
      await store.removePersonalLibrary()
      setHasLib(false)
      toast({ message: 'شلنا مكتبتك الشخصية من هالجهاز — رجعت المكتبة العامة' })
    } finally {
      setBusy(false)
    }
  }

  const exportNow = async () => {
    try {
      const data = await store.exportAll()
      const d = new Date()
      const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (await io.exportBackup(data, `life-os-${stamp}`)) {
        set({ lastBackupAt: new Date().toISOString() })
        toast({ message: 'جهّزنا ملف النسخة — احفظيه بمكان تعرفينه' })
      }
    } catch {
      toast({ message: 'ما قدرنا نجهّز الملف — جربي مرة ثانية' })
    }
  }

  // ---- delete all (two explicit steps, in-page) --------------------------------------------
  const [wipeStep, setWipeStep] = useState<0 | 1 | 2>(0)
  const wipe = async () => {
    setBusy(true)
    try {
      suppressIntendedRoute()
      await store.deleteAllAndReseed()
      setWipeStep(0)
      refreshBackups()
      toast({ message: 'انحذف كل شي — وفيه نسخة احتياطية لو احتجتيها' })
    } finally {
      setBusy(false)
    }
  }

  const sources = useMemo(() => {
    const m = new Map<string, number>()
    for (const it of s.inbox) if (it.source) m.set(it.source, (m.get(it.source) ?? 0) + 1)
    return [...m.entries()]
  }, [s])

  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  return (
    <Screen title="الإعدادات" backLabel="أنا" ground="tinted">
      <ProtectionSection />
      <InsetGroupedList header="المظهر">
        {/* a11y #5: non-row content in a list still sits in a listitem */}
        <div role="listitem" style={{ padding: '12px 16px' }}>
          <SegmentedControl<ThemePref>
            label="المظهر"
            segments={[
              { value: 'system', label: 'تلقائي' },
              { value: 'light', label: 'فاتح' },
              { value: 'dark', label: 'داكن' },
            ]}
            value={pref}
            onChange={(v) => {
              setPref(v)
              set({ theme: v })
            }}
          />
        </div>
      </InsetGroupedList>

      <InsetGroupedList header="يومك">
        <ListRow
          leading={<RowIcon name="calendar" />}
          title="تصحين عادة"
          trailing={<TimeField label="وقت الصحيان" selectClassName={styles.inlineSelect} minute={s.settings.wakeMinute} onChange={(m) => set({ wakeMinute: m })} />}
        />
        <ListRow
          leading={<RowIcon name="theme" />}
          title="تنامين عادة"
          trailing={<TimeField label="وقت النوم" selectClassName={styles.inlineSelect} minute={s.settings.sleepMinute} onChange={(m) => set({ sleepMinute: m })} />}
        />
        <ListRow
          leading={<RowIcon name="review" />}
          title="خطة اليوم"
          subtitle={s.settings.planMode === 'suggest' ? 'نقترح وأنتِ تختارين — ما يتحرك شي بدونك' : 'نرتّبها لك تلقائيًا'}
          trailing={
            <select aria-label="طريقة خطة اليوم" className={styles.inlineSelect} value={s.settings.planMode} onChange={(e) => set({ planMode: e.target.value as Settings['planMode'] })}>
              <option value="suggest">اقتراحات</option>
              <option value="auto">تلقائي</option>
            </select>
          }
        />
        <ListRow
          leading={<RowIcon name="calendar" />}
          title="اربطي العادات بأوقات الصلاة"
          subtitle="أم القرى · محسوبة على جهازك"
          trailing={<Switch checked={s.settings.prayerAnchorsEnabled} onChange={(v) => set({ prayerAnchorsEnabled: v })} label="مواعيد الصلاة كإشارات" />}
        />
      </InsetGroupedList>

      <InsetGroupedList header="المال" footer="الشهر عندك يبدأ يوم الراتب، والميزانية تمشي على هالدورة.">
        <ListRow
          leading={<RowIcon name="money" />}
          title="يوم الراتب"
          trailing={
            <select aria-label="يوم الراتب" className={styles.inlineSelect} value={s.settings.paydayDay} onChange={(e) => void store.setPayday(Number(e.target.value)).then(() => toast({ message: `الراتب يوم ${e.target.value}` }))}>
              {days.map((d) => (
                <option key={d} value={d}>
                  يوم {d}
                </option>
              ))}
            </select>
          }
        />
      </InsetGroupedList>

      <StreakSettingGroup />

      <RemindersSettingsGroup />

      <SettingsExtras />

      <>
        <span id="settings-import" style={{ display: 'block', blockSize: 0, marginBlockEnd: 'calc(-1 * var(--space-6))', scrollMarginBlockStart: 'calc(var(--safe-top) + var(--navbar-h) + 8px)' }} />
        <InsetGroupedList header="المصادر والاستيراد" footer="أي ملف تستوردينه نعرض لك محتواه قبل ما يتغير شي، ونأخذ نسخة احتياطية قبلها. ما ينضاف شي لخطة اليوم تلقائيًا.">
          <ListRow leading={<RowIcon name="import" />} title="استوردي ملف نسخة" subtitle="ملف JSON مصدّر من التطبيق" chevron onClick={() => fileRef.current?.click()} />
          {sources.map(([src, n]) => (
            <ListRow key={src} leading={<RowIcon name="evidence" tone="ink" />} title={<bdi>{src}</bdi>} subtitle={`${countLabel(n, ITEM)} بالوارد`} />
          ))}
        </InsetGroupedList>
        <input ref={fileRef} type="file" accept="application/json,.json" className={styles.hiddenInput} onChange={(e) => void onFile(e)} tabIndex={-1} aria-hidden="true" />
        <input ref={libRef} type="file" accept="application/json,.json" className={styles.hiddenInput} onChange={(e) => void onLibFile(e)} tabIndex={-1} aria-hidden="true" />
        {importError && (
          <div className={`${styles.confirm} ${styles.pad}`} role="alert">
            <p className={styles.confirmTitle}>ما قدرنا نستورد</p>
            <p className={styles.lede}>{importError}</p>
            <Button variant="secondary" onClick={() => setImportError(null)}>
              تمام
            </Button>
          </div>
        )}
        {pending && (
          <ImportReview
            fileName={pending.name}
            data={pending.data}
            preview={pending.preview}
            current={pending.current}
            busy={busy}
            onConfirm={(build) => void confirmImport(build)}
            onCancel={() => setPending(null)}
            allowMerge={!!pending.legacy}
            preferMerge={!!pending.merge}
          />
        )}
      </>

      <>
        <span id="settings-data" style={{ display: 'block', blockSize: 0, marginBlockEnd: 'calc(-1 * var(--space-6))', scrollMarginBlockStart: 'calc(var(--safe-top) + var(--navbar-h) + 8px)' }} />
        <InsetGroupedList header="البيانات" footer="كل بياناتك محفوظة على هالجهاز بس. صدّري نسخة كل فترة واحفظيها بمكان آمن.">
          <ListRow leading={<RowIcon name="export" />} title="صدّري نسخة" subtitle="ملف JSON فيه كل شي" chevron onClick={() => void exportNow()} />
          {legacyAvailable && (
            <ListRow
              leading={<RowIcon name="import" />}
              title="انقلي بياناتك من النسخة القديمة"
              subtitle="نعرض لك كل شي قبل ما يتغيّر، واللي عندك يبقى"
              chevron
              onClick={() => void startLegacyReview()}
            />
          )}
          <ListRow
            leading={<RowIcon name="evidence" />}
            title="استيراد مكتبتي الشخصية"
            subtitle={hasLib ? 'مكتبتك مفعّلة — على هالجهاز بس' : 'ملف مكتبتك الخاصة (JSON)'}
            chevron
            onClick={() => libRef.current?.click()}
          />
          {hasLib && (
            <ListRow
              leading={<RowIcon name="trash" tone="ink" />}
              title="شيلي مكتبتي من هالجهاز"
              subtitle="ترجع المكتبة العامة"
              onClick={() => void removeLib()}
            />
          )}
          <ListRow
            leading={<RowIcon name="data" tone="ink" />}
            title="حالة الحفظ"
            subtitle={s.persistent ? 'محفوظة على هالجهاز' : 'الحفظ مو متاح بهالمتصفح — بياناتك مؤقتة'}
          />
        </InsetGroupedList>

        <InsetGroupedList header="النسخ الاحتياطية" footer={backups.length ? 'نحتفظ بآخر 5 نسخ تلقائية.' : 'تنعمل نسخة تلقائيًا قبل أي استيراد أو استعادة أو حذف.'}>
          <BackupReminderRow onExport={() => void exportNow()} />
          {backups.length === 0 ? (
            <ListRow muted title="ما فيه نسخ للحين" />
          ) : (
            backups.map((b) => (
              <ListRow
                key={b.id}
                leading={<RowIcon name="restore" tone="ink" />}
                title={BACKUP_REASON_AR[b.reason] ?? b.reason}
                subtitle={`${fmtIso(b.createdAt)} · ${countLabel(b.records, RECORD_NOUN)}`}
                trailing={
                  <Button variant="plain" onClick={() => setRestoreId(b.id)}>
                    استرجعي
                  </Button>
                }
              />
            ))
          )}
        </InsetGroupedList>
        {/* QA area 5 #5: confirmations open as a sheet above the tab bar, not inline below the fold */}
        <Sheet open={restoreId != null} onClose={() => setRestoreId(null)} title="ترجعين لهالنسخة؟" detents={['medium']}>
          <div className={styles.confirmSheet}>
            <p className={styles.lede}>بياناتك الحالية تنحفظ كنسخة احتياطية أول، وبعدين نرجّع هالنسخة.</p>
            <div className={styles.actions}>
              <Button
                disabled={busy}
                onClick={() => {
                  if (!restoreId) return
                  setBusy(true)
                  void store
                    .restoreBackup(restoreId)
                    .then(() => toast({ message: 'رجعت النسخة' }))
                    .catch(() => toast({ message: 'ما رجعت النسخة — بياناتك ما تغيّرت' }))
                    .finally(() => (setBusy(false), setRestoreId(null), refreshBackups()))
                }}
              >
                استرجعيها
              </Button>
              <Button variant="plain" onClick={() => setRestoreId(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        </Sheet>

        <InsetGroupedList>
          <ListRow leading={<RowIcon name="trash" tone="warn" />} title={<span className={styles.danger}>احذفي كل شي</span>} onClick={() => setWipeStep(1)} />
        </InsetGroupedList>
        <Sheet
          open={wipeStep > 0}
          onClose={() => setWipeStep(0)}
          title={wipeStep === 2 ? 'آخر تأكيد — يرجع التطبيق مثل أول مرة' : 'متأكدة تحذفين كل بياناتك؟'}
          detents={['medium']}
        >
          <div className={styles.confirmSheet} role="alertdialog" aria-label={wipeStep === 2 ? 'آخر تأكيد' : 'تأكيد الحذف'}>
            <p className={styles.lede}>
              {wipeStep === 2 ? 'بناخذ نسخة احتياطية قبل الحذف، وتقدرين ترجعينها من «النسخ الاحتياطية».' : 'العادات، المهام، المال، والمراجعات كلها تنمسح من هالجهاز.'}
            </p>
            <div className={styles.actions}>
              {wipeStep !== 2 ? (
                <Button onClick={() => setWipeStep(2)}>إيه، احذفي كل شي</Button>
              ) : (
                <Button onClick={() => void wipe()} disabled={busy} style={{ background: 'var(--error)', color: 'var(--on-error)' }}>
                  {busy ? 'نحذف…' : 'احذفي كل شي'}
                </Button>
              )}
              <Button variant="plain" onClick={() => setWipeStep(0)}>
                لا، خليها
              </Button>
            </div>
          </div>
        </Sheet>
      </>
    </Screen>
  )
}

