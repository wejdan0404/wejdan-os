/** The quiet «صدّري نسخة» nudge: 14 days without a backup file. Everything stays on the device. */
import { parseDayKey } from './core/dates';

export const kBackupReminderDays = 14;

export interface BackupReminder {
  /** `ok` = a recent file; `never` = none yet but it is early; `due` = 14+ days (since the last file, or since first use). */
  state: 'ok' | 'never' | 'due';
  /** Whole days since the last file (null when there never was one). */
  daysSince: number | null;
}

export function backupReminder(o: { lastBackupAt: string | null; firstRunDate: string | null; now: Date }): BackupReminder {
  const last = o.lastBackupAt == null ? null : new Date(o.lastBackupAt);
  const lastOk = last != null && Number.isFinite(last.getTime());
  const ref = lastOk ? last : o.firstRunDate == null ? null : parseDayKey(o.firstRunDate);
  const days = ref == null ? null : Math.floor((o.now.getTime() - ref.getTime()) / 86400000);
  const daysSince = lastOk ? Math.max(0, days ?? 0) : null;
  if (days != null && days >= kBackupReminderDays) return { state: 'due', daysSince };
  return { state: lastOk ? 'ok' : 'never', daysSince };
}
