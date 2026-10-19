import 'enums.dart';
import 'json_utils.dart';

/// Makkah (Masjid al-Haram) — default for optional prayer anchors.
const double kDefaultLatitude = 21.4225;
const double kDefaultLongitude = 39.8262;

/// App settings (single document). All defaults are editable by her.
class Settings {
  const Settings({
    this.language = AppLanguage.ar,
    this.theme = ThemePref.system,
    this.themePalette = ThemePalette.calmSky,
    this.customAccentArgb,
    this.cardStyle = CardStyle.outlined,
    this.notificationCap = 4,
    this.quietStartMinute = 23 * 60,
    // Quiet hours end: until she sets one herself ([quietEndSetByUser]), the
    // end follows her wake time (spec §5.6 "Morning Brief at wake"). The
    // stored value mirrors wake in that case; see [effectiveQuietEndMinute].
    this.quietEndMinute = 6 * 60,
    this.quietEndSetByUser = false,
    this.wakeMinute = 6 * 60,
    this.sleepMinute = 23 * 60,
    this.prayerAnchorsEnabled = false,
    this.latitude = kDefaultLatitude,
    this.longitude = kDefaultLongitude,
    this.utcOffsetMinutes = 180,
    this.timeZoneName = 'Asia/Riyadh',
    this.cycleModule = false,
    this.pcosModule = false,
    this.aquariumModule = false,
    this.appLock = false,
    this.forgivingStreak = false,
    this.dailyBudgetMin = 150,
    this.budgetByWeekday = const {},
    this.ieltsWeakestSkill = IeltsSkill.writing,
    this.weekStartsOn = DateTime.sunday,
    this.eveningShutdownBeforeSleepMin = 90,
    this.onboardingDone = false,
    this.lastSeasonReview,
    this.firstActionPin,
  });

  factory Settings.fromJson(Json j) => Settings(
        language: enumFromName(AppLanguage.values, j['language'], AppLanguage.ar),
        theme: enumFromName(ThemePref.values, j['theme'], ThemePref.system),
        themePalette: enumFromName(ThemePalette.values, j['themePalette'], ThemePalette.calmSky),
        customAccentArgb: jIntN(j, 'customAccentArgb'),
        cardStyle: enumFromName(CardStyle.values, j['cardStyle'], CardStyle.outlined),
        notificationCap: jInt(j, 'notificationCap', 4).clamp(0, 6),
        quietStartMinute: jInt(j, 'quietStartMinute', 23 * 60),
        quietEndMinute: jInt(j, 'quietEndMinute', 6 * 60),
        quietEndSetByUser: j.containsKey('quietEndSetByUser')
            ? jBool(j, 'quietEndSetByUser')
            : legacyQuietEndSetByUser(jInt(j, 'quietEndMinute', 6 * 60), jInt(j, 'wakeMinute', 6 * 60)),
        wakeMinute: jInt(j, 'wakeMinute', 6 * 60),
        sleepMinute: jInt(j, 'sleepMinute', 23 * 60),
        prayerAnchorsEnabled: jBool(j, 'prayerAnchorsEnabled'),
        latitude: jDouble(j, 'latitude', kDefaultLatitude),
        longitude: jDouble(j, 'longitude', kDefaultLongitude),
        utcOffsetMinutes: jInt(j, 'utcOffsetMinutes', 180),
        timeZoneName: jStr(j, 'timeZoneName', 'Asia/Riyadh'),
        cycleModule: jBool(j, 'cycleModule'),
        pcosModule: jBool(j, 'pcosModule'),
        aquariumModule: jBool(j, 'aquariumModule'),
        appLock: jBool(j, 'appLock'),
        forgivingStreak: jBool(j, 'forgivingStreak'),
        dailyBudgetMin: jInt(j, 'dailyBudgetMin', 150),
        budgetByWeekday: jMap(j, 'budgetByWeekday').map((k, v) => MapEntry(int.tryParse(k) ?? 0, v is num ? v.toInt() : 0)),
        ieltsWeakestSkill: enumFromName(IeltsSkill.values, j['ieltsWeakestSkill'], IeltsSkill.writing),
        weekStartsOn: jInt(j, 'weekStartsOn', DateTime.sunday),
        eveningShutdownBeforeSleepMin: jInt(j, 'eveningShutdownBeforeSleepMin', 90),
        onboardingDone: jBool(j, 'onboardingDone'),
        lastSeasonReview: jStrN(j, 'lastSeasonReview'),
        firstActionPin: jStrN(j, 'firstActionPin'),
      );

  final AppLanguage language;
  final ThemePref theme;
  final ThemePalette themePalette;
  final int? customAccentArgb;
  final CardStyle cardStyle;

  /// Max notifications per day (0–6, default 4; spec §5.6).
  final int notificationCap;
  final int quietStartMinute;
  final int quietEndMinute;

  /// True once she picked the quiet-hours end herself (Settings "إلى").
  /// Unset → quiet hours end at wake.
  final bool quietEndSetByUser;
  final int wakeMinute;
  final int sleepMinute;

  /// Optional prayer-time cue anchors (off by default).
  final bool prayerAnchorsEnabled;
  final double latitude;
  final double longitude;

  /// Local UTC offset used for prayer-time computation (Saudi = +180).
  final int utcOffsetMinutes;

  /// IANA zone for scheduling notifications.
  final String timeZoneName;
  final bool cycleModule;
  final bool pcosModule;
  final bool aquariumModule;
  final bool appLock;

  /// Optional forgiving streak (off by default).
  final bool forgivingStreak;

  /// Free minutes for standalone blocks on a typical day.
  final int dailyBudgetMin;

  /// Per-weekday overrides of [dailyBudgetMin] ([DateTime.weekday] → minutes).
  final Map<int, int> budgetByWeekday;

  /// Used on the rotation's "weakest skill" day (Thursday).
  final IeltsSkill ieltsWeakestSkill;
  final int weekStartsOn;
  final int eveningShutdownBeforeSleepMin;
  final bool onboardingDone;
  final String? lastSeasonReview;

  /// Tomorrow's first action picked in Evening Shutdown, as
  /// `"<dayKey>|<itemId>"` (the day it applies to). Morning Brief and the
  /// planner-facing UI surface it first; stale pins are ignored.
  final String? firstActionPin;

  int budgetFor(DateTime day) => budgetByWeekday[day.weekday] ?? dailyBudgetMin;

  /// Quiet-hours end the app applies and shows: her own setting if she set
  /// one, otherwise her wake time (R1: an explicit end is never overridden).
  int get effectiveQuietEndMinute => quietEndSetByUser ? quietEndMinute : wakeMinute;

  /// Sets wake time. An unset quiet end keeps following wake; her own quiet
  /// end is left as she set it.
  Settings withWake(int minute) =>
      copyWith(wakeMinute: minute, quietEndMinute: quietEndSetByUser ? quietEndMinute : minute, quietEndSetByUser: quietEndSetByUser);

  /// Her own quiet-hours end (Settings "إلى" tile).
  Settings withQuietEnd(int minute) => copyWith(quietEndMinute: minute, quietEndSetByUser: true);

  /// Data saved before `quietEndSetByUser` existed: the app only ever wrote
  /// the defaults (06:00 / 07:00) or her wake time there, so any other value
  /// was hers.
  static bool legacyQuietEndSetByUser(int quietEnd, int wake) =>
      quietEnd != wake && quietEnd != 6 * 60 && quietEnd != 7 * 60;

  Settings copyWith({
    AppLanguage? language,
    ThemePref? theme,
    ThemePalette? themePalette,
    int? customAccentArgb,
    bool clearCustomAccent = false,
    CardStyle? cardStyle,
    int? notificationCap,
    int? quietStartMinute,
    int? quietEndMinute,
    bool? quietEndSetByUser,
    int? wakeMinute,
    int? sleepMinute,
    bool? prayerAnchorsEnabled,
    double? latitude,
    double? longitude,
    int? utcOffsetMinutes,
    String? timeZoneName,
    bool? cycleModule,
    bool? pcosModule,
    bool? aquariumModule,
    bool? appLock,
    bool? forgivingStreak,
    int? dailyBudgetMin,
    Map<int, int>? budgetByWeekday,
    IeltsSkill? ieltsWeakestSkill,
    int? weekStartsOn,
    int? eveningShutdownBeforeSleepMin,
    bool? onboardingDone,
    String? lastSeasonReview,
    String? firstActionPin,
  }) =>
      Settings(
        language: language ?? this.language,
        theme: theme ?? this.theme,
        themePalette: themePalette ?? this.themePalette,
        customAccentArgb: clearCustomAccent ? null : (customAccentArgb ?? this.customAccentArgb),
        cardStyle: cardStyle ?? this.cardStyle,
        notificationCap: (notificationCap ?? this.notificationCap).clamp(0, 6),
        quietStartMinute: quietStartMinute ?? this.quietStartMinute,
        quietEndMinute: quietEndMinute ?? this.quietEndMinute,
        // Passing a quiet end counts as hers unless the caller says otherwise
        // (withWake passes the flag explicitly).
        quietEndSetByUser: quietEndSetByUser ?? (quietEndMinute != null ? true : this.quietEndSetByUser),
        wakeMinute: wakeMinute ?? this.wakeMinute,
        sleepMinute: sleepMinute ?? this.sleepMinute,
        prayerAnchorsEnabled: prayerAnchorsEnabled ?? this.prayerAnchorsEnabled,
        latitude: latitude ?? this.latitude,
        longitude: longitude ?? this.longitude,
        utcOffsetMinutes: utcOffsetMinutes ?? this.utcOffsetMinutes,
        timeZoneName: timeZoneName ?? this.timeZoneName,
        cycleModule: cycleModule ?? this.cycleModule,
        pcosModule: pcosModule ?? this.pcosModule,
        aquariumModule: aquariumModule ?? this.aquariumModule,
        appLock: appLock ?? this.appLock,
        forgivingStreak: forgivingStreak ?? this.forgivingStreak,
        dailyBudgetMin: dailyBudgetMin ?? this.dailyBudgetMin,
        budgetByWeekday: budgetByWeekday ?? this.budgetByWeekday,
        ieltsWeakestSkill: ieltsWeakestSkill ?? this.ieltsWeakestSkill,
        weekStartsOn: weekStartsOn ?? this.weekStartsOn,
        eveningShutdownBeforeSleepMin: eveningShutdownBeforeSleepMin ?? this.eveningShutdownBeforeSleepMin,
        onboardingDone: onboardingDone ?? this.onboardingDone,
        lastSeasonReview: lastSeasonReview ?? this.lastSeasonReview,
        firstActionPin: firstActionPin ?? this.firstActionPin,
      );

  Json toJson() => {
        'language': language.name,
        'theme': theme.name,
        'themePalette': themePalette.name,
        'customAccentArgb': customAccentArgb,
        'cardStyle': cardStyle.name,
        'notificationCap': notificationCap,
        'quietStartMinute': quietStartMinute,
        'quietEndMinute': quietEndMinute,
        'quietEndSetByUser': quietEndSetByUser,
        'wakeMinute': wakeMinute,
        'sleepMinute': sleepMinute,
        'prayerAnchorsEnabled': prayerAnchorsEnabled,
        'latitude': latitude,
        'longitude': longitude,
        'utcOffsetMinutes': utcOffsetMinutes,
        'timeZoneName': timeZoneName,
        'cycleModule': cycleModule,
        'pcosModule': pcosModule,
        'aquariumModule': aquariumModule,
        'appLock': appLock,
        'forgivingStreak': forgivingStreak,
        'dailyBudgetMin': dailyBudgetMin,
        'budgetByWeekday': budgetByWeekday.map((k, v) => MapEntry(k.toString(), v)),
        'ieltsWeakestSkill': ieltsWeakestSkill.name,
        'weekStartsOn': weekStartsOn,
        'eveningShutdownBeforeSleepMin': eveningShutdownBeforeSleepMin,
        'onboardingDone': onboardingDone,
        'lastSeasonReview': lastSeasonReview,
        'firstActionPin': firstActionPin,
      };
}
