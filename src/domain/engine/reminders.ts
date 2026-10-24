/**
 * Reminder planning (spec §5.6, ENG-15, ENG-16, GROW-21) — port of `engine/reminders.dart`.
 *
 * PLANNING ONLY: the web app never shows notifications by itself. On top of the
 * Dart rules, reminders are OFF by default: when `settings.notificationsEnabled`
 * is false the plan is empty (pass `ignoreEnabledFlag: true` for parity tests).
 */
import { clamp, cmpNum, cmpStr, inWindow, mod, parseDayKey, stableHash, weekday } from '../core/dates';
import type { DayPlan, FixedEvent, Habit, LocalizedText, LogEntry, NudgeKind, NudgeRecord, Settings } from '../models';
import { effectiveQuietEndMinute, fixedEventOccursOn, ltSame } from '../models';
import { dueDaysFrom, type DueItem } from './dues';
import { bestCompletionMinute } from './recovery';
import { engineText } from './whyToday';

export const kIgnoredToMute = 3;
export const kDefaultNotificationCap = 4;
export const kSnoozeMinutes = 30;
export const kDuesAfterWakeMin = 60;

export const effectiveQuietEnd = (s: Settings): number => effectiveQuietEndMinute(s);

/** Dues that belong in today's bundled notification: due today or overdue. */
export const duesForToday = (dues: DueItem[], today: Date): DueItem[] => dues.filter((d) => dueDaysFrom(d, today) <= 0);

export const kNudgeCategoryId = 'wejdan_nudge';
export const kActionDone = 'done_min';
export const kActionSnooze = 'snooze_30';
export const kActionSkip = 'skip';

export interface ScheduledNudge {
  id: number;
  kind: NudgeKind;
  date: string;
  minute: number;
  title: LocalizedText;
  body: LocalizedText;
  itemId: string | null;
}
export const nudgeActionable = (n: ScheduledNudge): boolean => n.kind === 'anchored';
export const nudgePayload = (n: ScheduledNudge): string => `${n.kind}|${n.date}|${n.itemId ?? ''}`;

export interface NudgePayload {
  kind: NudgeKind;
  date: string;
  itemId: string | null;
}
export function parseNudgePayload(raw: string | null | undefined): NudgePayload | null {
  if (raw == null) return null;
  const p = raw.split('|');
  if (p.length !== 3) return null;
  const kinds: NudgeKind[] = ['morningBrief', 'anchored', 'eveningShutdown', 'dues'];
  return {
    kind: kinds.includes(p[0] as NudgeKind) ? (p[0] as NudgeKind) : 'anchored',
    date: p[1]!,
    itemId: p[2] === '' ? null : p[2]!,
  };
}

export interface MutedNudge {
  itemId: string;
  ignoredInARow: number;
  suggestedMinute: number | null;
}

export interface ReminderPlan {
  nudges: ScheduledNudge[];
  muted: MutedNudge[];
  droppedForQuiet: ScheduledNudge[];
  droppedForFocus: ScheduledNudge[];
  droppedForCap: ScheduledNudge[];
}
const EMPTY_PLAN = (): ReminderPlan => ({ nudges: [], muted: [], droppedForQuiet: [], droppedForFocus: [], droppedForCap: [] });

/**
 * A reminder time she chose herself (Settings → تذكيرات) for a routine or a habit. Unlike the
 * engine's own nudges it is exactly what she asked for: not capped, not muted by «ignored»
 * history — only quiet hours and focus blocks silence it (silently, never queued).
 */
export interface ExplicitReminder {
  itemId: string;
  minute: number;
  title: LocalizedText;
  /** Dart weekdays the item runs on (1 = Monday … 7 = Sunday). */
  weekdays: number[];
}

/** Consecutive most-recent `ignored` responses for [itemId]. */
export function ignoredInARow(history: NudgeRecord[], itemId: string): number {
  const own = history.filter((r) => r.itemId === itemId).sort((a, b) => cmpStr(b.date, a.date) || cmpStr(b.id, a.id));
  let n = 0;
  for (const r of own) {
    if (r.response !== 'ignored') break;
    n++;
  }
  return n;
}

export function buildReminderPlan(o: {
  plan: DayPlan;
  settings: Settings;
  habits: Habit[];
  nudgeHistory?: NudgeRecord[];
  logs?: LogEntry[];
  fixedEvents?: FixedEvent[];
  dues?: DueItem[];
  /** Times she set herself; they replace the habit's own anchored nudge for the same id. */
  explicit?: ExplicitReminder[];
  nowMinute?: number | null;
  /** Parity with the Dart engine (which has no on/off switch). */
  ignoreEnabledFlag?: boolean;
}): ReminderPlan {
  const { plan, settings } = o;
  if (!o.ignoreEnabledFlag && !settings.notificationsEnabled) return EMPTY_PLAN();
  const cap = clamp(settings.notificationCap, 0, 6);
  if (cap === 0) return EMPTY_PLAN();
  const day = parseDayKey(plan.date);
  const qs = settings.quietStartMinute;
  const qe = effectiveQuietEnd(settings);
  const quiet = (m: number) => settings.quietHoursEnabled !== false && inWindow(m, qs, qe);
  const focus = (o.fixedEvents ?? []).filter((e) => e.isFocusBlock && fixedEventOccursOn(e, day, plan.date));
  const inFocus = (m: number) => focus.some((e) => m >= e.startMinute && m < e.endMinute);

  const mk = (kind: NudgeKind, minute: number, title: LocalizedText, body: LocalizedText, itemId: string | null = null): ScheduledNudge => ({
    id: stableHash(`${plan.date}|${kind}|${itemId ?? ''}`),
    kind,
    date: plan.date,
    minute,
    title,
    body,
    itemId,
  });

  let morningAt = settings.wakeMinute;
  if (quiet(morningAt)) morningAt = qe;
  const first = plan.items.find((i) => i.tier !== 'joy');
  const morning = mk(
    'morningBrief',
    morningAt,
    engineText('nudgeMorningTitle'),
    first == null ? engineText('nudgeMorningBodyEmpty') : engineText('nudgeMorningBody', { first: first.title }),
  );
  let eveningAt = mod(settings.sleepMinute - settings.eveningShutdownBeforeSleepMin, 1440);
  if (quiet(eveningAt)) eveningAt = mod(qs - 30, 1440);
  const evening = mk('eveningShutdown', eveningAt, engineText('nudgeEveningTitle'), engineText('nudgeEveningBody'));

  const todayDues = duesForToday(o.dues ?? [], day);
  let duesNudge: ScheduledNudge | null = null;
  if (todayDues.length > 0) {
    let at = clamp(morningAt + kDuesAfterWakeMin, 0, 1439);
    if (quiet(at)) at = clamp(qe + kDuesAfterWakeMin, 0, 1439);
    const names = todayDues.map((d) =>
      d.kind === 'payday'
        ? engineText('duesPayday')
        : d.kind === 'autoSave' || d.title.trim() === ''
          ? engineText('duesAutoSave')
          : ltSame(d.title),
    );
    duesNudge = mk('dues', at, engineText('nudgeDuesTitle'), {
      ar: names.map((n) => n.ar).join('، '),
      en: names.map((n) => n.en).join(', '),
    });
  }

  const wd = weekday(day);
  const explicitToday = (o.explicit ?? []).filter((e) => e.weekdays.includes(wd));
  const explicitIds = new Set((o.explicit ?? []).map((e) => e.itemId));
  const habitsById = new Map(o.habits.map((h) => [h.id, h]));
  const muted: MutedNudge[] = [];
  const anchored: ScheduledNudge[] = [];
  const seen = new Set<string>();
  for (const item of plan.items) {
    if (item.kind !== 'habit' || item.startMinute == null) continue;
    const h = habitsById.get(item.itemId);
    if (h == null || !h.reminder.enabled || seen.has(h.id) || explicitIds.has(h.id)) continue;
    seen.add(h.id);
    const ignored = ignoredInARow(o.nudgeHistory ?? [], h.id);
    if (ignored >= kIgnoredToMute) {
      muted.push({ itemId: h.id, ignoredInARow: ignored, suggestedMinute: bestCompletionMinute(o.logs ?? [], h.id) });
      continue;
    }
    const body =
      h.reminder.textAr != null && h.reminder.textEn != null
        ? { ar: h.reminder.textAr, en: h.reminder.textEn }
        : engineText('nudgeAnchoredBody');
    anchored.push(mk('anchored', clamp(item.startMinute + h.reminder.offsetMin, 0, 1439), item.title, body, h.id));
  }

  const droppedQuiet: ScheduledNudge[] = [];
  const droppedFocus: ScheduledNudge[] = [];
  const keep = (n: ScheduledNudge): boolean => {
    if (o.nowMinute != null && n.minute <= o.nowMinute) return false;
    if (quiet(n.minute)) {
      droppedQuiet.push(n);
      return false;
    }
    if (inFocus(n.minute)) {
      droppedFocus.push(n);
      return false;
    }
    return true;
  };

  const explicitNudges = explicitToday.map((e) => mk('anchored', clamp(e.minute, 0, 1439), e.title, engineText('nudgeAnchoredBody'), e.itemId));
  const explicitKept = explicitNudges.filter(keep);
  const fixed = [morning, evening, ...(duesNudge ? [duesNudge] : [])].filter(keep);
  const anchoredKept = anchored.filter(keep).sort((a, b) => cmpNum(a.minute, b.minute));

  const result: ScheduledNudge[] = [];
  const droppedCap: ScheduledNudge[] = [];
  for (const n of fixed) {
    if (result.length < cap) result.push(n);
    else droppedCap.push(n);
  }
  const anchoredRoom = clamp(cap - result.length, 0, cap - 2 < 0 ? 0 : cap - 2);
  anchoredKept.forEach((n, i) => (i < anchoredRoom ? result.push(n) : droppedCap.push(n)));
  result.push(...explicitKept);
  result.sort((a, b) => cmpNum(a.minute, b.minute));
  return { nudges: result, muted, droppedForQuiet: droppedQuiet, droppedForFocus: droppedFocus, droppedForCap: droppedCap };
}
