/// Resolves cue anchors (ENG-01) to clock times.
///
/// Supports fixed times, wake/sleep, coarse slots and — optionally, off by
/// default — prayer times computed offline with `adhan` (method Umm al-Qura)
/// for a manually entered location (default Makkah 21.4225, 39.8262).
library;

import 'package:adhan/adhan.dart' as adhan;

import '../core/date_utils.dart';
import '../data/models/models.dart';

/// Prayer times of one day as minutes since local midnight.
typedef PrayerMinutes = Map<PrayerAnchor, int>;

/// Computes prayer times with Umm al-Qura for [latitude]/[longitude] and a
/// fixed [utcOffsetMinutes] (Saudi Arabia has no DST: +180).
PrayerMinutes computePrayerMinutes(
  DateTime day, {
  double latitude = kDefaultLatitude,
  double longitude = kDefaultLongitude,
  int utcOffsetMinutes = 180,
}) {
  final params = adhan.CalculationMethod.umm_al_qura.getParameters();
  final pt = adhan.PrayerTimes.utcOffset(
    adhan.Coordinates(latitude, longitude),
    adhan.DateComponents(day.year, day.month, day.day),
    params,
    Duration(minutes: utcOffsetMinutes),
  );
  int m(DateTime t) => t.hour * 60 + t.minute;
  return {
    PrayerAnchor.fajr: m(pt.fajr),
    PrayerAnchor.dhuhr: m(pt.dhuhr),
    PrayerAnchor.asr: m(pt.asr),
    PrayerAnchor.maghrib: m(pt.maghrib),
    PrayerAnchor.isha: m(pt.isha),
  };
}

/// Resolves [CueAnchor]s for a day. Create one per settings change.
class AnchorResolver {
  AnchorResolver({
    required this.wakeMinute,
    required this.sleepMinute,
    this.prayerAnchorsEnabled = false,
    this.latitude = kDefaultLatitude,
    this.longitude = kDefaultLongitude,
    this.utcOffsetMinutes = 180,
  });

  factory AnchorResolver.fromSettings(Settings s) => AnchorResolver(
        wakeMinute: s.wakeMinute,
        sleepMinute: s.sleepMinute,
        prayerAnchorsEnabled: s.prayerAnchorsEnabled,
        latitude: s.latitude,
        longitude: s.longitude,
        utcOffsetMinutes: s.utcOffsetMinutes,
      );

  final int wakeMinute;
  final int sleepMinute;
  final bool prayerAnchorsEnabled;
  final double latitude;
  final double longitude;
  final int utcOffsetMinutes;

  final Map<String, PrayerMinutes> _cache = {};

  /// Default clock time of a coarse slot. Documented app defaults (not
  /// evidence doses): morning = wake + 30, midday 12:30, afternoon 15:30,
  /// evening 18:30, night = sleep − 60, anytime = midday.
  int slotMinute(Slot slot) => switch (slot) {
        Slot.morning => wakeMinute + 30,
        Slot.midday => 12 * 60 + 30,
        Slot.afternoon => 15 * 60 + 30,
        Slot.evening => 18 * 60 + 30,
        Slot.night => sleepMinute - 60,
        Slot.anytime => 12 * 60 + 30,
      };

  /// Prayer minutes for [day] (cached), or null when prayer anchors are off.
  PrayerMinutes? prayerMinutes(DateTime day) {
    if (!prayerAnchorsEnabled) return null;
    final key = dayKey(day);
    return _cache.putIfAbsent(
      key,
      () => computePrayerMinutes(
        day,
        latitude: latitude,
        longitude: longitude,
        utcOffsetMinutes: utcOffsetMinutes,
      ),
    );
  }

  /// Minute of day for [anchor] on [day], clamped to 0..1439.
  int resolve(CueAnchor anchor, DateTime day) {
    final base = switch (anchor.type) {
      AnchorType.fixedTime => anchor.minute ?? slotMinute(anchor.slot),
      AnchorType.wake => wakeMinute,
      AnchorType.sleep => sleepMinute,
      AnchorType.slot => slotMinute(anchor.slot),
      AnchorType.prayer => (anchor.prayer == null ? null : prayerMinutes(day)?[anchor.prayer!]) ??
          slotMinute(anchor.slot),
    };
    return (base + anchor.offsetMin).clamp(0, 1439);
  }
}
