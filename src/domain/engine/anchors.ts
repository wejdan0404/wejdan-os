/**
 * Resolves cue anchors (ENG-01) to clock times: fixed times, wake/sleep,
 * coarse slots and — optionally, off by default — prayer times computed
 * offline with `adhan` (Umm al-Qura) for a manually entered location
 * (default Makkah). Port of `engine/anchors.dart`.
 */
import { CalculationMethod, Coordinates, PrayerTimes } from 'adhan';
import { clamp, dayKey, mod } from '../core/dates';
import type { CueAnchor, PrayerAnchor, Settings, Slot } from '../models';
import { kDefaultLatitude, kDefaultLongitude } from '../models';

/** Prayer times of one day as minutes since local midnight. */
export type PrayerMinutes = Record<PrayerAnchor, number>;

/** Computes prayer times (Umm al-Qura) for a fixed UTC offset (Saudi: +180, no DST). */
export function computePrayerMinutes(
  day: Date,
  latitude: number = kDefaultLatitude,
  longitude: number = kDefaultLongitude,
  utcOffsetMinutes = 180,
): PrayerMinutes {
  const params = CalculationMethod.UmmAlQura();
  // adhan reads the calendar date from the local Y/M/D of the Date it gets.
  const pt = new PrayerTimes(new Coordinates(latitude, longitude), new Date(day.getFullYear(), day.getMonth(), day.getDate()), params);
  const m = (t: Date): number => mod(t.getUTCHours() * 60 + t.getUTCMinutes() + utcOffsetMinutes, 1440);
  return { fajr: m(pt.fajr), dhuhr: m(pt.dhuhr), asr: m(pt.asr), maghrib: m(pt.maghrib), isha: m(pt.isha) };
}

export interface AnchorResolverOptions {
  wakeMinute: number;
  sleepMinute: number;
  prayerAnchorsEnabled?: boolean;
  latitude?: number;
  longitude?: number;
  utcOffsetMinutes?: number;
}

/** Resolves CueAnchors for a day. Create one per settings change. */
export class AnchorResolver {
  readonly wakeMinute: number;
  readonly sleepMinute: number;
  readonly prayerAnchorsEnabled: boolean;
  readonly latitude: number;
  readonly longitude: number;
  readonly utcOffsetMinutes: number;
  private readonly cache = new Map<string, PrayerMinutes>();

  constructor(o: AnchorResolverOptions) {
    this.wakeMinute = o.wakeMinute;
    this.sleepMinute = o.sleepMinute;
    this.prayerAnchorsEnabled = o.prayerAnchorsEnabled ?? false;
    this.latitude = o.latitude ?? kDefaultLatitude;
    this.longitude = o.longitude ?? kDefaultLongitude;
    this.utcOffsetMinutes = o.utcOffsetMinutes ?? 180;
  }

  static fromSettings(s: Settings): AnchorResolver {
    return new AnchorResolver({
      wakeMinute: s.wakeMinute,
      sleepMinute: s.sleepMinute,
      prayerAnchorsEnabled: s.prayerAnchorsEnabled,
      latitude: s.latitude,
      longitude: s.longitude,
      utcOffsetMinutes: s.utcOffsetMinutes,
    });
  }

  /**
   * Default clock time of a slot (documented app defaults, not evidence doses):
   * morning = wake + 30, midday 12:30, afternoon 15:30, evening 18:30,
   * night = sleep − 60, anytime = midday.
   */
  slotMinute(slot: Slot): number {
    switch (slot) {
      case 'morning': return this.wakeMinute + 30;
      case 'midday': return 12 * 60 + 30;
      case 'afternoon': return 15 * 60 + 30;
      case 'evening': return 18 * 60 + 30;
      case 'night': return this.sleepMinute - 60;
      case 'anytime': return 12 * 60 + 30;
    }
  }

  /** Prayer minutes for [day] (cached), or null when prayer anchors are off. */
  prayerMinutes(day: Date): PrayerMinutes | null {
    if (!this.prayerAnchorsEnabled) return null;
    const key = dayKey(day);
    let v = this.cache.get(key);
    if (!v) {
      v = computePrayerMinutes(day, this.latitude, this.longitude, this.utcOffsetMinutes);
      this.cache.set(key, v);
    }
    return v;
  }

  /** Minute of day for [anchor] on [day], clamped to 0..1439. */
  resolve(a: CueAnchor, day: Date): number {
    let base: number;
    switch (a.type) {
      case 'fixedTime': base = a.minute ?? this.slotMinute(a.slot); break;
      case 'wake': base = this.wakeMinute; break;
      case 'sleep': base = this.sleepMinute; break;
      case 'slot': base = this.slotMinute(a.slot); break;
      case 'prayer': {
        const pm = a.prayer == null ? null : this.prayerMinutes(day);
        base = pm != null && a.prayer != null ? pm[a.prayer] : this.slotMinute(a.slot);
        break;
      }
    }
    return clamp(base + a.offsetMin, 0, 1439);
  }
}
