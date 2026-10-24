import { useMemo, useState } from 'react'
import { backupReminder, type Settings } from '../../../domain'
import { Button } from '../../components/Button'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Switch } from '../../components/Switch'
import { useStableNavigate } from '../../shell/navigate'
import { useLife, useStore } from '../../state/LifeStore'
import { RowIcon } from '../me/meKit'
import { CalendarExportSheet } from './CalendarExportSheet'

/** Settings «العادات»: the flexible-streak switch (on for new installs; hers stays as she set it). */
export function StreakSettingGroup() {
  const s = useLife()
  const store = useStore()
  const set = (p: Partial<Settings>) => void store.updateSettings({ ...s.settings, ...p })
  return (
    <>
      <span id="settings-habits" style={{ display: 'block', blockSize: 0, marginBlockEnd: 'calc(-1 * var(--space-6))', scrollMarginBlockStart: 'calc(var(--safe-top) + var(--navbar-h) + 8px)' }} />
      <InsetGroupedList header="العادات">
        <ListRow
          leading={<RowIcon name="insights" />}
          title="الستريك المرن"
          subtitle="يسمح بيومين تعويض في الأسبوع"
          trailing={<Switch checked={s.settings.forgivingStreak} onChange={(v) => set({ forgivingStreak: v })} label="الستريك المرن" />}
        />
      </InsetGroupedList>
    </>
  )
}

/** Settings «التذكيرات»: in-app reminders (→ its own screen) and the calendar file. Replaces the old no-op switch. */
export function RemindersSettingsGroup() {
  const s = useLife()
  const navigate = useStableNavigate()
  const [exportOpen, setExportOpen] = useState(false)
  return (
    <>
      <InsetGroupedList header="التذكيرات" footer="التذكيرات داخل التطبيق تطلع وأنتِ فاتحته. التنبيهات الحقيقية على الجوال تجي من التقويم.">
        <ListRow
          leading={<RowIcon name="bell" />}
          title="تذكيرات داخل التطبيق"
          trailing={<span>{s.settings.notificationsEnabled ? 'شغّالة' : 'مطفية'}</span>}
          chevron
          onClick={() => navigate('/me/reminders')}
        />
        <ListRow
          leading={<RowIcon name="calendar" />}
          title="حطيها في تقويم الآيفون"
          subtitle={
            <span>
              ملف <bdi dir="ltr">.ics</bdi>
            </span>
          }
          chevron
          onClick={() => setExportOpen(true)}
        />
      </InsetGroupedList>
      <CalendarExportSheet open={exportOpen} onClose={() => setExportOpen(false)} />
    </>
  )
}

const fmt = (iso: string) =>
  new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'long' }).format(new Date(iso))

/** A quiet row at the top of «النسخ الاحتياطية»: when the last backup file was made, and a calm nudge after 14 days. */
export function BackupReminderRow({ onExport }: { onExport: () => void }) {
  const s = useLife()
  const r = useMemo(() => backupReminder({ lastBackupAt: s.settings.lastBackupAt, firstRunDate: s.firstRunDate, now: new Date() }), [s.settings.lastBackupAt, s.firstRunDate])
  const due = r.state === 'due'
  return (
    <ListRow
      leading={<RowIcon name="export" tone={due ? 'accent' : 'ink'} />}
      title={due ? 'مرّت فترة من آخر نسخة' : r.state === 'ok' ? 'آخر ملف نسخة' : 'ما صدّرتي ملف نسخة للحين'}
      subtitle={
        due
          ? 'صدّري ملف نسخة يحفظ بياناتك. يبقى على جهازك.'
          : r.state === 'ok' && s.settings.lastBackupAt
            ? fmt(s.settings.lastBackupAt)
            : 'بياناتك على هالجهاز بس. صدّري ملف كل فترة.'
      }
      trailing={
        due ? (
          <Button variant="plain" onClick={onExport}>
            صدّري
          </Button>
        ) : undefined
      }
    />
  )
}
