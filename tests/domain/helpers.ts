/** Test helpers — port of `test/helpers.dart`. */
import actionsJson from '../../src/domain/data/actions.json';
import actionsArJson from '../../src/domain/data/actions_ar.json';
import {
  type CompletionLevel, type Domain, type DomainId, type EnergyMode, type FixedEvent, type Habit, type JoyItem, type LogEntry,
  type MockTest, type PlanItemKind, type PlannerInput, type Project, type Settings, type VocabCard, type WeeklyTask,
  addDays, dayKey, makeHabit, makeLog, mkDate, parseSeedLibrary, schedule,
} from '../../src/domain';
import { buildPersona, type PersonaProfile } from './fixtures/personaProfile';

export const library = parseSeedLibrary(actionsJson as unknown, actionsArJson as unknown);

/** Persona profile created on [created]. */
export const profileOn = (created: Date): PersonaProfile => buildPersona(library, created);

/** Test calendar (week starts Sunday 2026-10-04). */
export const sun = mkDate(2026, 10, 4);
export const mon = mkDate(2026, 10, 5);
export const tue = mkDate(2026, 10, 6);
export const wed = mkDate(2026, 10, 7);
export const thu = mkDate(2026, 10, 8);
export const fri = mkDate(2026, 10, 9);
export const sat = mkDate(2026, 10, 10);

let logSeq = 0;
export function logFor(
  itemId: string,
  day: Date,
  o: { level?: CompletionLevel; durationMin?: number; minute?: number; enjoyment?: number; kind?: PlanItemKind } = {},
): LogEntry {
  return makeLog({
    id: `log_${logSeq++}`,
    itemId,
    kind: o.kind ?? 'habit',
    date: dayKey(day),
    level: o.level ?? 'normal',
    durationMin: o.durationMin ?? null,
    minuteOfDay: o.minute ?? null,
    enjoyment: o.enjoyment ?? null,
  });
}

export function inputFor(
  date: Date,
  o: {
    profile?: PersonaProfile;
    energy?: EnergyMode;
    logs?: LogEntry[];
    settings?: Settings;
    domains?: Domain[];
    habits?: Habit[];
    projects?: Project[];
    vocab?: VocabCard[];
    events?: FixedEvent[];
    mocks?: MockTest[];
    joy?: JoyItem[];
    weekly?: WeeklyTask[];
  } = {},
): PlannerInput {
  const p = o.profile ?? profileOn(date);
  return {
    date,
    energy: o.energy ?? 'green',
    settings: o.settings ?? p.settings,
    domains: o.domains ?? p.domains,
    habits: o.habits ?? p.habits,
    routines: p.routines,
    weeklyTasks: o.weekly ?? p.weeklyTasks,
    projects: o.projects ?? [],
    joyItems: o.joy ?? p.joyItems,
    logs: o.logs ?? [],
    vocabCards: o.vocab ?? [],
    fixedEvents: o.events ?? [],
    mockTests: o.mocks ?? [],
  };
}

export function simpleHabit(o: { id?: string; weekdays?: number[]; created?: string | null; domain?: DomainId } = {}): Habit {
  return makeHabit({
    id: o.id ?? 'h',
    domain: o.domain ?? 'health',
    titleAr: 'عادة',
    titleEn: 'Habit',
    schedule: schedule(o.weekdays ?? [1, 2, 3, 4, 5, 6, 7]),
    createdDate: o.created ?? null,
  });
}

export function dailyLogs(itemId: string, from: Date, to: Date, done: (d: Date) => boolean): LogEntry[] {
  const out: LogEntry[] = [];
  let d = from;
  while (d.getTime() <= to.getTime()) {
    if (done(d)) out.push(logFor(itemId, d));
    d = addDays(d, 1);
  }
  return out;
}
