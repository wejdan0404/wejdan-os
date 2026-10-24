/**
 * Pure date helpers ported from `lib/core/date_utils.dart`.
 *
 * All engine code works on *local calendar days* represented as a JS `Date`
 * at local midnight, or as a day key string `yyyy-MM-dd`. Times of day are
 * numbers: minutes since midnight.
 *
 * Dart semantics are kept on purpose:
 * - weekday(): 1 = Monday … 7 = Sunday (Dart `DateTime.weekday`).
 * - months in `mkDate` are 1-based (Dart `DateTime(y, m, d)`); overflow
 *   normalises like Dart / JS (e.g. day 0 = last day of previous month).
 */

export const MONDAY = 1;
export const TUESDAY = 2;
export const WEDNESDAY = 3;
export const THURSDAY = 4;
export const FRIDAY = 5;
export const SATURDAY = 6;
export const SUNDAY = 7;

/** Dart-style `DateTime(y, m, d)` (m is 1-based), local midnight. */
export function mkDate(y: number, m: number, d: number, hh = 0, mm = 0): Date {
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/** Euclidean modulo (Dart `%` on ints with a positive divisor). */
export function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/** Dart `int.clamp`. */
export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Dart `~/` (truncating integer division). */
export function idiv(a: number, b: number): number {
  return Math.trunc(a / b);
}

/** Dart `num.round()` — half away from zero. */
export function dround(v: number): number {
  return v < 0 ? -Math.round(-v) : Math.round(v);
}

/** Dart `DateTime.weekday`: 1 = Monday … 7 = Sunday. */
export function weekday(d: Date): number {
  const w = d.getDay();
  return w === 0 ? 7 : w;
}

/** Strips the time part. */
export function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** `yyyy-MM-dd` key used for logs, plans and ledgers. */
export function dayKey(d: Date): string {
  const y = String(d.getFullYear()).padStart(4, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Parses a `yyyy-MM-dd` key into a local midnight Date. */
export function parseDayKey(key: string): Date {
  const p = key.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

/** Adds [days] calendar days (DST-safe because it rebuilds from y/m/d). */
export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** Whole calendar days from [a] to [b] (b − a). */
export function daysBetween(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86400000);
}

/**
 * Start of the week containing [d], given [weekStartsOn] as a Dart weekday
 * value (default Sunday — Saudi work week Sun–Thu).
 */
export function startOfWeek(d: Date, weekStartsOn: number = SUNDAY): Date {
  const day = dateOnly(d);
  const diff = mod(weekday(day) - weekStartsOn, 7);
  return addDays(day, -diff);
}

/** Planner day boundary (04:30 local). */
export const kDayBoundaryMinute = 4 * 60 + 30;

/** The *logical* day [now] belongs to (activity before 04:30 counts for yesterday). */
export function logicalDay(now: Date, boundaryMinute: number = kDayBoundaryMinute): Date {
  const d = dateOnly(now);
  return now.getHours() * 60 + now.getMinutes() < boundaryMinute ? addDays(d, -1) : d;
}

/** Minute-of-day for [d]. */
export function minuteOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Formats a minute-of-day as `HH:mm` with Western digits. */
export function formatHm(minute: number): string {
  const m = mod(minute, 1440);
  return `${String(Math.trunc(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Parses `HH:mm` into minute-of-day. */
export function parseHm(hm: string): number {
  const p = hm.split(':');
  return Number(p[0]) * 60 + Number(p[1]);
}

/** True if [minute] lies inside [start, end), which may wrap midnight. */
export function inWindow(minute: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return minute >= start && minute < end;
  return minute >= start || minute < end;
}

/** Stable 31-bit FNV-1a hash (identical to the Dart implementation). */
export function stableHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h & 0x7fffffff;
}

/** Dart `String.compareTo` (UTF-16 code unit order). */
export function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Numeric compare. */
export function cmpNum(a: number, b: number): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Dart `DateTime.toIso8601String()` for a local Date (no zone suffix). */
export function toIsoLocal(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return (
    `${p(d.getFullYear(), 4)}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
  );
}

/** Parses an ISO-8601 string (with or without zone) the way Dart's tryParse does; null if invalid. */
export function tryParseIso(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  // Without a zone designator Dart treats it as local time; JS does too for date-time forms.
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}
