/** Port of test/data/repository_test.dart, adapted to the neutral seed + web storage (Dexie, backups, confirm). */
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import sample from './fixtures/export_sample.json';
import {
  type Json, type LifeRepository, type StarterProfile, ActionJ, DexieLifeRepository, EngineRuleJ, InMemoryLifeRepository,
  SettingsJ, buildStarterProfile, defaultSettings, domainForAction, findAction, kExportSchemaVersion, kFlutterBoxes, kMaxBackups,
  kSeedOnlyBoxes, makeProject, mkDate, mockWeakest, requireAction,
} from '../../src/domain';
import { P, buildPersona } from './fixtures/personaProfile';
import { library, logFor, mon, tue } from './helpers';

const neutral = (): StarterProfile => buildStarterProfile(library, mon);
const persona = (): StarterProfile => ({ ...buildPersona(library, mon), products: [] });
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

async function seeded(profile: StarterProfile = neutral()): Promise<LifeRepository> {
  const repo = new InMemoryLifeRepository();
  await repo.open();
  await repo.seed({ library, profile });
  return repo;
}

describe('Seed library', () => {
  it('109 actions + 23 engine rules (neutral public library); source gaps are known', () => {
    expect(library.actions.length).toBe(109);
    expect(library.rules.length).toBe(23);
    expect(library.actions.filter((a) => a.sources.length === 0).map((a) => a.actionId)).toEqual(['LIFE-01', 'LIFE-11', 'LIFE-15', 'JOY-12']);
    expect(library.rules.every((r) => r.sources.length > 0)).toBe(true);
    expect(library.rules.map((r) => r.ruleId)).toContain('ENG-23');
    expect(findAction(library, 'NOPE')).toBeNull();
    expect(() => requireAction(library, 'NOPE')).toThrow();
  });
  it('every action maps to a domain; engine rules do not', () => {
    for (const a of library.actions) expect(domainForAction(a), a.actionId).not.toBeNull();
    expect(domainForAction(requireAction(library, 'BODY-15'))).toBe('sleep');
    expect(domainForAction(requireAction(library, 'FOOD-23'))).toBe('care');
    expect(domainForAction(requireAction(library, 'GROW-07'))).toBe('ielts');
    expect(domainForAction(requireAction(library, 'LIFE-01'))).toBe('driving');
    expect(domainForAction(ActionJ.fromJson(EngineRuleJ.toJson(library.rules[0]!)))).toBeNull();
  });
});

describe('Neutral seed (web)', () => {
  it('no personal data: no habits, goals, joy, money; generic products; Maintain basics only', () => {
    const p = neutral();
    expect(p.habits).toEqual([]);
    expect(p.goals).toEqual([]);
    expect(p.joyItems).toEqual([]);
    expect(p.routines).toEqual([]);
    expect(p.weeklyTasks.map((t) => t.id)).toEqual(['wt_weekly_review']);
    expect(p.domains.length).toBe(17);
    expect(p.domains.filter((d) => d.state === 'grow')).toEqual([]);
    expect(new Set(p.domains.filter((d) => d.state === 'maintain').map((d) => d.id))).toEqual(new Set(['sleep', 'care', 'home', 'money']));
    expect(p.domains.find((d) => d.id === 'womensHealth')!.enabled).toBe(false);
    expect(p.products.length).toBeGreaterThanOrEqual(8);
    expect(p.products.every((x) => x.placeholder)).toBe(true);
    expect(p.products.map((x) => x.name)).toEqual(expect.arrayContaining(['غسول', 'مرطب', 'شامبو', 'بلسم', 'خيط أسنان']));
    expect(p.products.some((x) => x.name.includes('SPF'))).toBe(true);
    expect(p.settings).toEqual(defaultSettings({ language: 'ar' }));
    expect(p.settings.paydayDay).toBe(1);
    expect(p.settings.planMode).toBe('suggest');
    expect(p.settings.notificationsEnabled).toBe(false);
    expect(p.settings.cycleModule).toBe(false);
    // condition-specific modules don't exist in the public build at all
    expect(Object.keys(p.settings).some((k) => /pcos/i.test(k))).toBe(false);
    // Nothing from her persona leaks into the shipped seed.
    const text = JSON.stringify(p);
    for (const id of Object.values(P).filter((x) => x !== P.weeklyReview)) expect(text).not.toContain(`"${id}"`);
  });
});

describe('Model JSON round-trips (persona fixture)', () => {
  it('all entities and derived helpers', () => {
    const p = buildPersona(library, mon);
    const rt = <T>(v: T, c: { toJson: (t: T) => Json; fromJson: (j: Json) => T }) =>
      expect(c.toJson(c.fromJson(clone(c.toJson(v))))).toEqual(c.toJson(v));
    for (const a of library.actions.slice(0, 5)) rt(a, ActionJ);
    rt(library.rules[0]!, EngineRuleJ);
    rt({ ...p.settings, budgetByWeekday: { 5: 200 }, prayerAnchorsEnabled: true, paydayDay: 27 }, SettingsJ);
    expect(SettingsJ.fromJson({}).language).toBe('ar');
    expect(SettingsJ.fromJson({}).firstActionPin).toBeNull();
    expect(SettingsJ.fromJson({}).paydayDay).toBe(1);
    expect(SettingsJ.fromJson(SettingsJ.toJson({ ...defaultSettings(), firstActionPin: '2026-09-29|h_vocab' })).firstActionPin).toBe('2026-09-29|h_vocab');
    expect(mockWeakest({ id: 'm', date: 'd', reading: null, listening: null, writing: null, speaking: null, note: '' })).toBeNull();
    const project = makeProject({ id: 'p', domain: 'home', titleAr: '', titleEn: '' });
    expect(project.status).toBeDefined();
  });
});

describe('InMemory repository', () => {
  it('seed → load round-trip, idempotent; first run date', async () => {
    const repo = await seeded();
    expect(await repo.isSeeded()).toBe(true);
    expect((await repo.actions.all()).length).toBe(109);
    expect((await repo.engineRules.all()).length).toBe(23);
    expect((await repo.domains.all()).length).toBe(17);
    expect((await repo.products.all()).length).toBe(neutral().products.length);
    expect(await repo.firstRunDate()).toBe('2026-10-05');
    const wt = (await repo.weeklyTasks.all())[0]!;
    await repo.weeklyTasks.put({ ...wt, durationMin: 99 });
    await repo.seed({ library, profile: buildStarterProfile(library, tue) });
    expect((await repo.weeklyTasks.get(wt.id))!.durationMin).toBe(99);
    await repo.weeklyTasks.delete(wt.id);
    expect(await repo.weeklyTasks.get(wt.id)).toBeNull();
  });

  it('opened days are tracked and trimmed', async () => {
    const repo = new InMemoryLifeRepository();
    for (let i = 0; i < 70; i++) await repo.markOpened(mkDate(2026, 8, 1 + i));
    const days = await repo.openedDays();
    expect(days.size).toBe(60);
    expect(days.has('2026-08-01')).toBe(false);
  });

  it('export → delete all → import (with confirm) restores user data; backup taken first', async () => {
    const repo = await seeded(persona());
    await repo.logs.put(logFor(P.walk, mon, { durationMin: 20 }));
    await repo.saveSettings({ ...defaultSettings(), language: 'en', notificationCap: 2, paydayDay: 25 });
    await repo.markOpened(mon);
    const exp = await repo.exportAll(mkDate(2026, 10, 5, 12));
    expect(exp.schemaVersion).toBe(kExportSchemaVersion);
    for (const b of kSeedOnlyBoxes) expect(exp.boxes).not.toHaveProperty(b);
    const encoded = JSON.stringify(exp);

    await repo.deleteAll();
    expect(await repo.isSeeded()).toBe(false);
    expect(await repo.habits.all()).toEqual([]);

    await expect(repo.importAll(JSON.parse(encoded), { confirm: false })).rejects.toThrow();
    expect(await repo.habits.all()).toEqual([]);

    const backup = await repo.importAll(JSON.parse(encoded), { confirm: true, now: mkDate(2026, 10, 5, 13) });
    expect(backup.reason).toBe('before-import');
    expect((await repo.listBackups()).map((b) => b.id)).toContain(backup.id);
    expect((await repo.habits.all()).length).toBe(11);
    expect((await repo.logs.all())[0]!.durationMin).toBe(20);
    expect((await repo.domains.all()).length).toBe(17);
    const s = await repo.loadSettings();
    expect(s.language).toBe('en');
    expect(s.paydayDay).toBe(25);
    expect(await repo.openedDays()).toContain('2026-10-05');
    expect(await repo.isSeeded()).toBe(true);
    await expect(repo.importAll({ schemaVersion: 999 }, { confirm: true })).rejects.toThrow();
  });

  it('backups: restore brings the old data back; only the last 5 are kept', async () => {
    const repo = await seeded(persona());
    const b0 = await repo.createBackup('manual', mkDate(2026, 10, 5, 9));
    await repo.habits.delete(P.walk);
    expect(await repo.habits.get(P.walk)).toBeNull();
    await repo.restoreBackup(b0.id, mkDate(2026, 10, 5, 10));
    expect(await repo.habits.get(P.walk)).not.toBeNull();
    for (let i = 0; i < 8; i++) await repo.createBackup('manual', mkDate(2026, 10, 6, 9, i));
    expect((await repo.listBackups()).length).toBe(kMaxBackups);
  });

  it('preview: counts, current and bad files, no writes', async () => {
    const repo = await seeded();
    const ok = await repo.previewImport(sample);
    expect(ok.ok).toBe(true);
    expect(ok.counts['habits']).toBe(13);
    expect(ok.counts['logs']).toBe(4);
    expect(ok.current['habits']).toBe(0);
    expect(ok.skipped).toBe(0);
    expect(ok.counts).not.toHaveProperty('tasks');
    const bad = await repo.previewImport({ schemaVersion: 2 });
    expect(bad.ok).toBe(false);
    expect(bad.error).toBeTruthy();
    expect((await repo.habits.all()).length).toBe(0);
  });
});

describe('Flutter export (schemaVersion 1) imports without loss', () => {
  it('every record decodes and re-encodes with all original keys and values', async () => {
    const repo = await seeded();
    const task = { id: 't1', title: 'web only', createdAt: '2026-10-05T09:00:00.000' };
    await repo.write('tasks', 't1', task);
    await repo.importAll(clone(sample), { confirm: true, now: mon });
    const raw = sample as unknown as { boxes: Record<string, Json[]>; meta: Json };
    const r = repo as unknown as Record<string, { all: () => Promise<unknown[]>; box: string }>;
    for (const box of kFlutterBoxes) {
      if (kSeedOnlyBoxes.includes(box)) continue;
      const original = raw.boxes[box] ?? [];
      const coll = Object.values(r).find((c) => c != null && typeof c === 'object' && 'box' in c && c.box === box) as
        | { all: () => Promise<unknown[]>; box: string }
        | undefined;
      expect(coll, box).toBeDefined();
      const decoded = await coll!.all();
      expect(decoded.length, box).toBe(original.length);
      const exp = await repo.exportAll(mon);
      const byId = (l: Json[]) => [...l].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      expect(byId(exp.boxes[box]!), box).toEqual(byId(original));
    }
    // Typed decode keeps every key/value (web fields are only additions).
    const { HabitJ, LogEntryJ, SparkTxnJ, WeeklyReviewRecordJ, FixedEventJ, JoyItemJ, DomainJ, SeasonJ, RoutineJ, WeeklyTaskJ, GoalJ, EnergyCheckJ } =
      await import('../../src/domain');
    const pairs: [string, { fromJson: (j: Json) => unknown; toJson: (t: never) => Json }][] = [
      ['habits', HabitJ], ['logs', LogEntryJ], ['sparkTxns', SparkTxnJ], ['weeklyReviews', WeeklyReviewRecordJ],
      ['fixedEvents', FixedEventJ], ['joyItems', JoyItemJ], ['domains', DomainJ], ['seasons', SeasonJ], ['routines', RoutineJ],
      ['weeklyTasks', WeeklyTaskJ], ['goals', GoalJ], ['energyChecks', EnergyCheckJ],
    ];
    for (const [box, c] of pairs) {
      for (const rec of raw.boxes[box] ?? []) expect(c.toJson(c.fromJson(clone(rec)) as never), box).toMatchObject(rec);
    }
    expect(SettingsJ.toJson(SettingsJ.fromJson(clone(raw.meta['settings'] as Json)))).toMatchObject(raw.meta['settings'] as Json);
    const settings = await repo.loadSettings();
    expect(settings.language).toBe('en');
    // 07:00 was the old default quiet end → migrated as not hers (Fix pass 3).
    expect(settings.quietEndSetByUser).toBe(false);
    expect(settings.paydayDay).toBe(1);
    expect(await repo.firstRunDate()).toBe('2026-09-28');
    // Web-only boxes missing from a Flutter file are kept.
    expect(await repo.read('tasks', 't1')).toEqual(task);
  });
});

describe('Dexie repository (fake IndexedDB)', () => {
  it('persists across close/reopen; clearBox', async () => {
    const name = `t_${Date.now()}`;
    const repo = new DexieLifeRepository(name);
    await repo.open();
    await repo.seed({ library, profile: persona() });
    await repo.logs.put(logFor(P.vocab, mon));
    await repo.close();

    const again = new DexieLifeRepository(name);
    await again.open();
    expect(again.persistent).toBe(true);
    expect(await again.isSeeded()).toBe(true);
    expect((await again.logs.all())[0]!.itemId).toBe(P.vocab);
    expect((await again.habits.all()).length).toBe(11);
    expect((await again.actions.all()).length).toBe(109);
    await again.clearBox('logs');
    expect(await again.logs.all()).toEqual([]);
    const b = await again.createBackup('manual', mon);
    expect((await again.getBackup(b.id))!.schemaVersion).toBe(1);
    await again.close();
  });
});
