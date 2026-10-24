/**
 * iCalendar (RFC 5545) export of her reminders. PURE: no network, nothing leaves the device.
 *
 * Time zones: the events use `TZID=<her zone>` with an embedded VTIMEZONE when that zone has a fixed
 * UTC offset all year (Asia/Riyadh: +03:00, no DST — the Saudi case), which every calendar app,
 * iOS Calendar included, resolves identically. A zone with daylight saving can't be described by one
 * fixed VTIMEZONE here, so the file falls back to FLOATING local times («7:00 wherever the phone is»),
 * which iOS also imports correctly. Only titles she chose are written — no notes, no goals, no logs.
 */
import { addDays, dateOnly, mod, weekday } from './core/dates';
import type { ReminderItem } from './inAppReminders';

export const ICS_FILE_NAME = 'wejdan-life-os.ics';
export const ICS_MIME = 'text/calendar';
export const ICS_CALENDAR_NAME = 'وجدان';
/** How long before the event the calendar alerts: 0 = at the time. */
export type IcsLeadMin = 0 | 5 | 10;

const CRLF = '\r\n';
const DAY_CODES = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']; // Dart weekday 1 = Monday

/** Escapes a TEXT value (RFC 5545 §3.3.11). */
export const icsEscape = (v: string): string =>
  v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n');

const encoder = new TextEncoder();

/** Folds a content line at 75 octets (§3.1), never splitting a UTF-8 sequence; continuation = CRLF + space. */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let curBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (curBytes + n > limit) {
      out.push(cur);
      cur = '';
      curBytes = 0;
      limit = 74; // the leading space counts
    }
    cur += ch;
    curBytes += n;
  }
  out.push(cur);
  return out.join(CRLF + ' ');
}

const p2 = (n: number) => String(n).padStart(2, '0');
const localStamp = (d: Date, minute: number): string =>
  `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(Math.floor(minute / 60))}${p2(minute % 60)}00`;
const utcStamp = (d: Date): string =>
  `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}T${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}Z`;
const offsetText = (min: number): string => `${min < 0 ? '-' : '+'}${p2(Math.floor(Math.abs(min) / 60))}${p2(Math.abs(min) % 60)}`;

/** The zone's UTC offset in minutes at [at], or null when the runtime can't resolve the zone. */
function zoneOffsetMin(tz: string, at: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(at);
    const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
    return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
  } catch {
    return null;
  }
}

/** A fixed offset (minutes) when [tz] has the same UTC offset across the year around [now], else null. */
export function fixedZoneOffset(tz: string, now: Date): number | null {
  const first = zoneOffsetMin(tz, now);
  if (first == null) return null;
  for (let m = 1; m < 12; m++) {
    const o = zoneOffsetMin(tz, new Date(now.getTime() + m * 30 * 86400000));
    if (o !== first) return null;
  }
  return first;
}

const vtimezone = (tz: string, offsetMin: number): string[] => [
  'BEGIN:VTIMEZONE',
  `TZID:${tz}`,
  'BEGIN:STANDARD',
  'DTSTART:19700101T000000',
  `TZOFFSETFROM:${offsetText(offsetMin)}`,
  `TZOFFSETTO:${offsetText(offsetMin)}`,
  `TZNAME:${tz === 'Asia/Riyadh' ? 'AST' : offsetText(offsetMin)}`,
  'END:STANDARD',
  'END:VTIMEZONE',
];

/** First date on/after [from] that falls on one of [weekdays] (Dart weekdays). */
export function firstOccurrence(from: Date, weekdays: readonly number[]): Date {
  let d = dateOnly(from);
  for (let i = 0; i < 8; i++) {
    if (weekdays.includes(weekday(d))) return d;
    d = addDays(d, 1);
  }
  return dateOnly(from);
}

/** `FREQ=DAILY` for every day, else `FREQ=WEEKLY;BYDAY=…` in week order. */
export function rruleFor(weekdays: readonly number[]): string {
  const days = [...new Set(weekdays)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  if (days.length === 0 || days.length === 7) return 'FREQ=DAILY';
  return `FREQ=WEEKLY;BYDAY=${days.map((d) => DAY_CODES[d]).join(',')}`;
}

export interface IcsOptions {
  items: ReminderItem[];
  leadMin: IcsLeadMin;
  now: Date;
  /** IANA zone from her settings (e.g. Asia/Riyadh). */
  timeZone: string;
}

/** The calendar text (CRLF line endings, folded, UTF-8 safe). Items without a time are skipped. */
export function buildIcs(o: IcsOptions): string {
  const fixed = fixedZoneOffset(o.timeZone, o.now);
  const useTz = fixed != null;
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wejdan Life OS//Reminders//AR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(ICS_CALENDAR_NAME)}`,
  ];
  if (useTz) lines.push(`X-WR-TIMEZONE:${o.timeZone}`, ...vtimezone(o.timeZone, fixed));
  const stamp = utcStamp(o.now);
  // a re-export of the same reminder must be treated as an update: SEQUENCE grows with time
  const sequence = Math.max(0, Math.floor((o.now.getTime() - Date.UTC(2026, 0, 1)) / 60000));
  for (const r of o.items) {
    if (r.minute == null) continue;
    const start = firstOccurrence(o.now, r.weekdays);
    const dur = Math.max(5, Math.min(180, Math.round(r.durationMin || 15)));
    const endMinute = r.minute + dur;
    const endDay = endMinute >= 1440 ? addDays(start, 1) : start;
    const tzParam = useTz ? `;TZID=${o.timeZone}` : '';
    const title = icsEscape(r.title);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${r.key.replace(/[^A-Za-z0-9_.:-]/g, '-')}@wejdan-life-os`,
      `DTSTAMP:${stamp}`,
      `SEQUENCE:${sequence}`,
      `DTSTART${tzParam}:${localStamp(start, r.minute)}`,
      `DTEND${tzParam}:${localStamp(endDay, mod(endMinute, 1440))}`,
      `RRULE:${rruleFor(r.weekdays)}`,
      `SUMMARY:${title}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${title}`,
      `TRIGGER:${o.leadMin === 0 ? 'PT0S' : `-PT${o.leadMin}M`}`,
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}

