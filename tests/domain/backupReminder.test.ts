import { describe, expect, it } from 'vitest';
import { backupReminder, defaultSettings, SettingsJ } from '../../src/domain';

const now = new Date(2026, 9, 24, 12);
const iso = (d: Date) => d.toISOString();
const ago = (days: number) => new Date(now.getTime() - days * 86400000);

describe('backup reminder (14 days, on-device)', () => {
  it('a recent file is ok; 14+ days is due', () => {
    expect(backupReminder({ lastBackupAt: iso(ago(3)), firstRunDate: '2026-01-01', now })).toEqual({ state: 'ok', daysSince: 3 });
    expect(backupReminder({ lastBackupAt: iso(ago(13)), firstRunDate: '2026-01-01', now }).state).toBe('ok');
    expect(backupReminder({ lastBackupAt: iso(ago(14)), firstRunDate: '2026-01-01', now })).toEqual({ state: 'due', daysSince: 14 });
  });
  it('never exported: quiet for the first two weeks of use, then due', () => {
    expect(backupReminder({ lastBackupAt: null, firstRunDate: '2026-10-20', now })).toEqual({ state: 'never', daysSince: null });
    expect(backupReminder({ lastBackupAt: null, firstRunDate: '2026-09-01', now }).state).toBe('due');
    expect(backupReminder({ lastBackupAt: null, firstRunDate: null, now }).state).toBe('never');
  });
  it('an unreadable date counts as no file', () => {
    expect(backupReminder({ lastBackupAt: 'nope', firstRunDate: '2026-10-20', now }).state).toBe('never');
  });
  it('lastBackupAt, reminder times and quiet hours survive the settings round trip', () => {
    const s = defaultSettings({ lastBackupAt: '2026-10-01T10:00:00.000Z', reminderTimes: { 'habit:x': 990, 'routine:am': 420 }, quietHoursEnabled: false });
    const back = SettingsJ.fromJson(SettingsJ.toJson(s));
    expect(back.lastBackupAt).toBe('2026-10-01T10:00:00.000Z');
    expect(back.reminderTimes).toEqual({ 'habit:x': 990, 'routine:am': 420 });
    expect(back.quietHoursEnabled).toBe(false);
    const old = { ...(SettingsJ.toJson(defaultSettings()) as Record<string, unknown>) };
    delete old['reminderTimes'];
    delete old['quietHoursEnabled'];
    delete old['lastBackupAt'];
    const migrated = SettingsJ.fromJson(old as never);
    expect(migrated.reminderTimes).toEqual({});
    expect(migrated.quietHoursEnabled).toBe(true);
    expect(migrated.lastBackupAt).toBeNull();
  });
});
