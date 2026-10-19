/// Display formatting for the UI (Western digits always; Arabic-first).
library;

import 'package:flutter/widgets.dart';

import '../core/date_utils.dart';
import '../data/models/models.dart';
import '../engine/why_today.dart';
import '../state/providers.dart';
import 'theme/theme_ext.dart';

/// "20 د" / "20 min".
/// "12 د". Empty for 0 (duration not set — never shown as "0 د").
String minutesText(BuildContext context, int m) => m <= 0 ? '' : context.l.minutesShort(m.toString());

/// "الاثنين 28 سبتمبر" / "Monday 28 September".
String dateLine(BuildContext context, DateTime d) {
  final lang = context.lang;
  return '${weekdayName(d.weekday).of(lang)} ${d.day} ${monthName(context, d.month)}';
}

String monthName(BuildContext context, int m) => context.l.months.split(',')[m - 1].trim();

/// Morning / evening greeting with her name.
String greeting(BuildContext context, DateTime now) {
  final l = context.l;
  return now.hour < 12 && now.hour >= 4 ? l.greetingMorning(l.userName) : l.greetingEvening(l.userName);
}

String domainShort(BuildContext context, DomainId d) {
  final l = context.l;
  return switch (d) {
    DomainId.health => l.domainHealth,
    DomainId.sleep => l.domainSleep,
    DomainId.food => l.domainFood,
    DomainId.care => l.domainCare,
    DomainId.womensHealth => l.domainWomensHealth,
    DomainId.ielts => l.domainIelts,
    DomainId.learning => l.domainLearning,
    DomainId.career => l.domainCareer,
    DomainId.driving => l.domainDriving,
    DomainId.money => l.domainMoney,
    DomainId.home => l.domainHome,
    DomainId.digital => l.domainDigital,
    DomainId.admin => l.domainAdmin,
    DomainId.joy => l.domainJoy,
    DomainId.people => l.domainPeople,
    DomainId.faith => l.domainFaith,
    DomainId.aquarium => l.domainAquarium,
  };
}

String prayerName(BuildContext context, PrayerAnchor p) {
  final l = context.l;
  return switch (p) {
    PrayerAnchor.fajr => l.prayerFajr,
    PrayerAnchor.dhuhr => l.prayerDhuhr,
    PrayerAnchor.asr => l.prayerAsr,
    PrayerAnchor.maghrib => l.prayerMaghrib,
    PrayerAnchor.isha => l.prayerIsha,
  };
}

String slotName(BuildContext context, Slot s) {
  final l = context.l;
  return switch (s) {
    Slot.morning => l.slotMorning,
    Slot.midday => l.slotMidday,
    Slot.afternoon => l.slotAfternoon,
    Slot.evening => l.slotEvening,
    Slot.night => l.slotNight,
    Slot.anytime => l.slotAnytime,
  };
}

/// Human cue for an anchor: "بعد العصر", "بعد الاستيقاظ", "قبل النوم", or
/// the resolved clock time when the anchor is a plain slot / fixed time.
String cueLabel(BuildContext context, CueAnchor a, Settings s, {int? resolvedMinute}) {
  final l = context.l;
  switch (a.type) {
    case AnchorType.prayer:
      if (s.prayerAnchorsEnabled && a.prayer != null) {
        return a.offsetMin < 0 ? l.cueBefore(prayerName(context, a.prayer!)) : l.cueAfter(prayerName(context, a.prayer!));
      }
      return resolvedMinute != null ? slotTimeLabel(context, resolvedMinute) : slotName(context, a.slot);
    case AnchorType.wake:
      return l.cueAfterWake;
    case AnchorType.sleep:
      return l.cueBeforeSleep;
    case AnchorType.fixedTime:
      return slotTimeLabel(context, a.minute ?? resolvedMinute ?? 0);
    case AnchorType.slot:
      return resolvedMinute != null ? slotTimeLabel(context, resolvedMinute) : slotName(context, a.slot);
  }
}

/// Friendly part of day for a clock minute: صباحًا / ظهرًا / عصرًا / مساءً / ليلًا.
String dayPartLabel(BuildContext context, int minute) {
  final l = context.l;
  final m = ((minute % 1440) + 1440) % 1440;
  if (m < kDayBoundaryMinute) return l.partNight;
  if (m < 12 * 60) return l.partMorning;
  if (m < 15 * 60) return l.partNoon;
  if (m < 18 * 60) return l.partAfternoon;
  if (m < 21 * 60) return l.partEvening;
  return l.partNight;
}

/// «صباحًا · 07:05» — used when prayer anchors are off, instead of a bare time.
String slotTimeLabel(BuildContext context, int minute) => '${dayPartLabel(context, minute)} · ${formatHm(minute)}';

/// "28 سبتمبر" / "28 September".
String dayMonth(BuildContext context, DateTime d) => '${d.day} ${monthName(context, d.month)}';

/// "الاثنين 28 سبتمبر".
String dayMonthKey(BuildContext context, String key) => dayMonth(context, parseDayKey(key));

/// "اليوم" / "بكرة" / "بعد 5 أيام" / "قبل 2 يوم".
String relativeDays(BuildContext context, int days) {
  final l = context.l;
  if (days == 0) return l.relToday;
  if (days == 1) return l.relTomorrow;
  if (days < 0) return l.relAgo((-days).toString());
  return l.relIn(days.toString());
}

/// Amount in SAR with grouping, Western digits: "1,100".
String moneyText(num v) {
  final neg = v < 0;
  final s = v.abs().round().toString();
  final b = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) b.write(',');
    b.write(s[i]);
  }
  return '${neg ? '-' : ''}$b';
}

/// Band like 6.5 → "6.5", 6 → "6.0".
String bandText(double v) => v.toStringAsFixed(1);

/// Anchor of the entity behind a plan item (habit / weekly task / routine).
CueAnchor? anchorOf(PlanItem item, LifeSnapshot? s) {
  if (s == null) return null;
  switch (item.kind) {
    case PlanItemKind.habit:
      return s.habit(item.itemId)?.schedule.anchor;
    case PlanItemKind.weeklyTask:
      return s.weeklyTasks.where((t) => t.id == item.itemId).firstOrNull?.anchor;
    case PlanItemKind.routineStep:
      return s.routines.where((r) => r.id == item.routineId).firstOrNull?.anchor;
    case PlanItemKind.projectStep:
    case PlanItemKind.joy:
      return null;
  }
}

/// Minutes for a level: minimum → habit's minimum estimate; normal → the
/// planner's estimate; bonus → shown as "20+ د".
String levelMinutes(BuildContext context, PlanItem item, CompletionLevel level, LifeSnapshot? s) {
  final h = item.kind == PlanItemKind.habit ? s?.habit(item.itemId) : null;
  final normal = item.suggestedLevel == CompletionLevel.normal ? item.estimatedMin : (h?.durationMin ?? item.estimatedMin);
  final minimum = h?.minimumDurationMin ?? item.estimatedMin;
  final text = switch (level) {
    CompletionLevel.minimum => minutesText(context, minimum),
    CompletionLevel.bonus => plusMinutes(context, normal),
    CompletionLevel.normal || CompletionLevel.skipped => minutesText(context, normal),
  };
  // QA D07: a planning estimate is labelled wherever minutes are shown. Once
  // the planner learned her own minutes from logs (ENG-18) the number differs
  // from the seeded estimate and is hers, so no tag.
  final estimated = h != null &&
      (level == CompletionLevel.minimum
          ? h.minimumDurationEstimated
          : h.durationEstimated && normal == h.durationMin);
  // Non-breaking around «·» so the tag never wraps onto its own line.
  return estimated && text.isNotEmpty ? '$text\u00A0·\u00A0${context.l.estimateTag}' : text;
}

/// "13+ د" with the number and plus isolated (LRI…PDI) so RTL keeps "13+".
String plusMinutes(BuildContext context, int m) =>
    context.lang == AppLanguage.ar ? context.l.minutesShort('\u2066$m+\u2069') : context.l.minutesPlus('$m');

String levelName(BuildContext context, CompletionLevel lv) => switch (lv) {
  CompletionLevel.minimum => context.l.levelShortMin,
  CompletionLevel.normal => context.l.levelShortNormal,
  CompletionLevel.bonus => context.l.levelShortBonus,
  CompletionLevel.skipped => context.l.levelSkipped,
};

/// "mm:ss" countdown text.
String clockText(Duration d) {
  final s = d.inSeconds.clamp(0, 359999);
  return '${(s ~/ 60).toString().padLeft(2, '0')}:${(s % 60).toString().padLeft(2, '0')}';
}

/// Joins meta parts with " · ", isolating each part (FSI…PDI) so mixed
/// Latin/digit runs ("IELTS · 06:30 · 5 د") keep their order in RTL.
String metaJoin(Iterable<String> parts) => parts.where((p) => p.isNotEmpty).map((p) => '\u2068$p\u2069').join(' · ');

final _arabicChars = RegExp('[\u0600-\u06FF]');

/// RTL when the text contains Arabic, else LTR (seed texts are English).
TextDirection textDirFor(String s, BuildContext context) =>
    s.trim().isEmpty ? Directionality.of(context) : (_arabicChars.hasMatch(s) ? TextDirection.rtl : TextDirection.ltr);
