/** Home block: the weekly tidy zone. Pure; the offset is the existing ModuleState.homeZoneOffset. */
import { addDays, startOfWeek } from '../core/dates';

/** Neutral list of places; she can skip one with «غيّري المنطقة». */
export const HOME_ZONES: readonly { id: string; ar: string; hint: string }[] = [
  { id: 'desk', ar: 'المكتب', hint: 'سطح واحد يكفي: المكتب أو الدرج.' },
  { id: 'bedroom', ar: 'غرفة النوم', hint: 'السرير وطاولة جنبه، وبس.' },
  { id: 'kitchen', ar: 'المطبخ', hint: 'سطح واحد: الكاونتر أو رف.' },
  { id: 'bath', ar: 'الحمّام', hint: 'رف واحد أو الدرج.' },
  { id: 'closet', ar: 'الدولاب', hint: 'رف واحد، مو الدولاب كله.' },
  { id: 'entry', ar: 'المدخل', hint: 'مكان المفاتيح والشنطة والأحذية.' },
  { id: 'shelf', ar: 'رف الكتب', hint: 'رف واحد، وشيلي اللي ما تحتاجينه.' },
];

const WEEK0 = new Date(2024, 0, 7); // a fixed Sunday (week start): week index counts from here

export const weekIndexOf = (d: Date): number => Math.round((startOfWeek(d).getTime() - WEEK0.getTime()) / (7 * 86_400_000));

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** The zone for the week containing [today]; [offset] is how many she has skipped. */
export function weeklyZone(today: Date, offset = 0) {
  return HOME_ZONES[mod(weekIndexOf(today) + offset, HOME_ZONES.length)]!;
}
export const nextWeekZone = (today: Date, offset = 0) => weeklyZone(addDays(startOfWeek(today), 7), offset);

/** Seconds left for a wall-clock tidy timer. */
export const tidyRemaining = (totalSec: number, carriedSec: number, startedAt: number | null, now: number): number =>
  Math.max(0, totalSec - carriedSec - (startedAt == null ? 0 : (now - startedAt) / 1000));
