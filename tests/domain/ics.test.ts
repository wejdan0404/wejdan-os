/** RFC 5545 export: parsed back with a real iCalendar parser (ical.js) — the proof the file is valid. */
import ICAL from 'ical.js';
import { describe, expect, it } from 'vitest';
import { buildIcs, firstOccurrence, fixedZoneOffset, foldLine, icsEscape, mkDate, rruleFor, type ReminderItem } from '../../src/domain';

const NOW = new Date(Date.UTC(2026, 9, 7, 6, 15, 30)); // Wed 7 Oct 2026, 09:15 in Riyadh
const items: ReminderItem[] = [
  { key: 'routine:am', kind: 'routine', id: 'am', title: 'روتين الصبح', minute: 7 * 60, weekdays: [1, 2, 3, 4, 5, 6, 7], durationMin: 15 },
  { key: 'habit:walk', kind: 'habit', id: 'walk', title: 'مشي سريع، بعد العصر; test', minute: 16 * 60 + 30, weekdays: [7, 1, 3], durationMin: 20 },
  { key: 'routine:pm', kind: 'routine', id: 'pm', title: 'روتين المسا', minute: null, weekdays: [1], durationMin: 15 },
];
const parse = (text: string) => {
  const jcal = ICAL.parse(text);
  const root = new ICAL.Component(jcal);
  for (const tz of root.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(tz);
  return root;
};

describe('buildIcs (Asia/Riyadh)', () => {
  const text = buildIcs({ items, leadMin: 5, now: NOW, timeZone: 'Asia/Riyadh' });

  it('is valid iCalendar: CRLF only, folded at 75 octets, parses with a real parser', () => {
    expect(text.endsWith('\r\n')).toBe(true);
    expect(text.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    for (const line of text.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    const root = parse(text);
    expect(root.name).toBe('vcalendar');
    expect(root.getFirstPropertyValue('version')).toBe('2.0');
    expect(root.getFirstPropertyValue('prodid')).toContain('Wejdan');
    expect(root.getFirstPropertyValue('x-wr-calname')).toBe('وجدان');
  });

  it('one VEVENT per reminder that has a time, with stable UIDs, DTSTAMP, RRULE and a display VALARM', () => {
    const events = parse(text).getAllSubcomponents('vevent');
    expect(events).toHaveLength(2); // the routine without a time is skipped
    const [am, walk] = events.map((e) => new ICAL.Event(e));
    expect(am!.uid).toBe('routine:am@wejdan-life-os');
    expect(walk!.uid).toBe('habit:walk@wejdan-life-os');
    expect(String(events[0]!.getFirstPropertyValue('dtstamp'))).toBe('2026-10-07T06:15:30Z');
    expect(String(events[0]!.getFirstPropertyValue('rrule'))).toBe('FREQ=DAILY');
    expect(String(events[1]!.getFirstPropertyValue('rrule'))).toBe('FREQ=WEEKLY;BYDAY=MO,WE,SU');
    const alarm = events[0]!.getFirstSubcomponent('valarm')!;
    expect(alarm.getFirstPropertyValue('action')).toBe('DISPLAY');
    expect(String(alarm.getFirstPropertyValue('trigger'))).toBe('-PT5M');
    expect(alarm.getFirstPropertyValue('description')).toBe('روتين الصبح');
    // a second export of the same reminders keeps the UIDs
    const again = buildIcs({ items, leadMin: 5, now: new Date(NOW.getTime() + 3600000), timeZone: 'Asia/Riyadh' });
    expect(parse(again).getAllSubcomponents('vevent').map((e) => new ICAL.Event(e).uid)).toEqual([am!.uid, walk!.uid]);
  });

  it('TZID Asia/Riyadh with a VTIMEZONE: 07:00 local resolves to 04:00 UTC, and the weekly rule expands on the right days', () => {
    const root = parse(text);
    const vtz = root.getFirstSubcomponent('vtimezone')!;
    expect(vtz.getFirstPropertyValue('tzid')).toBe('Asia/Riyadh');
    expect(String(vtz.getFirstSubcomponent('standard')!.getFirstPropertyValue('tzoffsetto'))).toBe('+03:00');
    const [am, walk] = root.getAllSubcomponents('vevent').map((e) => new ICAL.Event(e));
    expect(am!.startDate.zone.tzid).toBe('Asia/Riyadh');
    expect(am!.startDate.toString()).toBe('2026-10-07T07:00:00'); // today (Wed) is a planned day
    expect(am!.startDate.convertToZone(ICAL.Timezone.utcTimezone).toString()).toBe('2026-10-07T04:00:00Z');
    expect(am!.endDate.toString()).toBe('2026-10-07T07:15:00');
    const it = walk!.iterator();
    const days: string[] = [];
    for (let i = 0; i < 4; i++) days.push(it.next().toString());
    expect(days).toEqual(['2026-10-07T16:30:00', '2026-10-11T16:30:00', '2026-10-12T16:30:00', '2026-10-14T16:30:00']); // Wed, Sun, Mon, Wed
  });

  it('lead time 0 is TRIGGER:PT0S, 10 is -PT10M', () => {
    const at0 = parse(buildIcs({ items, leadMin: 0, now: NOW, timeZone: 'Asia/Riyadh' }));
    expect(String(at0.getAllSubcomponents('vevent')[0]!.getFirstSubcomponent('valarm')!.getFirstPropertyValue('trigger'))).toBe('PT0S');
    const ten = parse(buildIcs({ items, leadMin: 10, now: NOW, timeZone: 'Asia/Riyadh' }));
    expect(String(ten.getAllSubcomponents('vevent')[0]!.getFirstSubcomponent('valarm')!.getFirstPropertyValue('trigger'))).toBe('-PT10M');
  });

  it('writes only the titles she chose: escapes , ; and keeps Arabic UTF-8 intact', () => {
    expect(text.replace(/\r\n /g, '')).toContain('SUMMARY:مشي سريع، بعد العصر\\; test'); // unfolded; the ASCII ; is escaped
    const walk = parse(text).getAllSubcomponents('vevent')[1]!;
    expect(walk.getFirstPropertyValue('summary')).toBe('مشي سريع، بعد العصر; test');
    for (const e of parse(text).getAllSubcomponents('vevent')) {
      expect(e.getAllProperties().map((p) => p.name).sort()).toEqual(
        ['dtend', 'dtstamp', 'dtstart', 'rrule', 'sequence', 'summary', 'transp', 'uid'].sort(),
      ); // no description / location / notes
    }
  });
});

describe('time zones', () => {
  it('Asia/Riyadh has a fixed offset; a DST zone does not and falls back to floating local times', () => {
    expect(fixedZoneOffset('Asia/Riyadh', NOW)).toBe(180);
    expect(fixedZoneOffset('America/New_York', NOW)).toBeNull();
    const floating = buildIcs({ items, leadMin: 5, now: NOW, timeZone: 'America/New_York' });
    expect(floating).not.toContain('TZID');
    expect(floating).not.toContain('VTIMEZONE');
    const ev = new ICAL.Event(parse(floating).getAllSubcomponents('vevent')[0]!);
    expect(ev.startDate.zone.tzid).toBe('floating');
    expect(ev.startDate.toString()).toBe('2026-10-07T07:00:00');
  });
});

describe('helpers', () => {
  it('rruleFor', () => {
    expect(rruleFor([1, 2, 3, 4, 5, 6, 7])).toBe('FREQ=DAILY');
    expect(rruleFor([])).toBe('FREQ=DAILY');
    expect(rruleFor([7, 1, 4])).toBe('FREQ=WEEKLY;BYDAY=MO,TH,SU');
  });
  it('firstOccurrence picks today when planned, else the next planned day', () => {
    expect(firstOccurrence(mkDate(2026, 10, 7, 9), [3]).getDate()).toBe(7);
    expect(firstOccurrence(mkDate(2026, 10, 7, 9), [1]).getDate()).toBe(12);
  });
  it('icsEscape and foldLine (never split a multi-byte character)', () => {
    expect(icsEscape('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne');
    const long = 'SUMMARY:' + 'ا'.repeat(100);
    const folded = foldLine(long);
    const parts = folded.split('\r\n');
    expect(parts.length).toBeGreaterThan(2);
    for (const p of parts) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
    expect(parts.slice(1).every((p) => p.startsWith(' '))).toBe(true);
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join('')).toBe(long);
    expect(foldLine('SHORT:x')).toBe('SHORT:x');
  });
});
