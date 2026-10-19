/// Starter profile matching the persona in PRODUCT_SPEC (§4, §5, §6, §11).
///
/// * Grow: Health & Movement, IELTS & English, Career & Portfolio.
/// * Maintain: Sleep & Energy, Care, Home, Money.
/// * Rest: everything else (Women's health + Aquarium also disabled modules).
///
/// All habit texts come verbatim from the Action Library — Arabic
/// (`actions_ar.json`) when the profile is built for Arabic, English
/// otherwise; titles use the Arabic card title / `name_en`. The UI maps an
/// unedited seed text to the current language (`localizedSeedText`). Arabic strings
/// authored here (routine/goal/joy titles) are pending native review.
/// Durations use the library's `time_minutes_normal`. Minimum-version
/// minutes come only from the library's minimum text when it states them
/// (`Action.statedMinimumMinutes`); otherwise the value is a small planning
/// estimate flagged `minimumDurationEstimated` (labelled «تقدير» in the Why
/// sheet, editable in the Studio) and replaced by her logged durations over
/// time (ENG-18). The normal duration is flagged `durationEstimated` when the
/// library's dose says "not specified by source" ([doseUnstated]); Today and
/// the Why sheet then add «تقدير» (QA D07, Fix pass 3).
///
/// Maintain (spec §5.1 "care, home reset, money check, admin"; Main.png
/// "الصيانة · 2"): the room reset (LIFE-13) and the daily spend log (LIFE-05)
/// are standalone Maintain habits so a Green day carries up to 2 of them.
library;

import '../../core/date_utils.dart';
import '../models/models.dart';
import 'seed_library.dart';

/// True when the library's dose states no amount ("not specified by source"),
/// i.e. `time_minutes_normal` is a planning estimate.
bool doseUnstated(Action a) => a.dose.toLowerCase().contains('not specified by source');

/// Library + profile, written by `LifeRepository.seed`.
class SeedBundle {
  const SeedBundle({required this.library, required this.profile});

  factory SeedBundle.build(String actionsJson, DateTime today, {String? arJson, AppLanguage lang = AppLanguage.ar}) {
    final lib = SeedLibrary.parse(actionsJson, arRaw: arJson);
    return SeedBundle(library: lib, profile: StarterProfile.build(lib, today, lang: lang));
  }

  final SeedLibrary library;
  final StarterProfile profile;
}

class StarterProfile {
  const StarterProfile({
    required this.domains,
    required this.season,
    required this.habits,
    required this.routines,
    required this.weeklyTasks,
    required this.goals,
    required this.joyItems,
    required this.settings,
  });

  final List<Domain> domains;
  final Season season;
  final List<Habit> habits;
  final List<Routine> routines;
  final List<WeeklyTask> weeklyTasks;
  final List<Goal> goals;
  final List<JoyItem> joyItems;
  final Settings settings;

  // Stable ids the UI/tests can rely on.
  static const walk = 'h_walk';
  static const strength = 'h_strength';
  static const vocab = 'h_vocab';
  static const focus = 'h_focus';
  static const sunscreen = 'h_sunscreen';
  static const cleanse = 'h_cleanse';
  static const dental = 'h_dental';
  static const roomReset = 'h_room_reset';
  static const moneyLog = 'h_money_log';
  static const wake = 'h_wake';
  static const windDown = 'h_wind_down';
  static const morningRoutine = 'r_morning';
  static const nightRoutine = 'r_night';
  static const mealPlan = 'wt_meal_plan';
  static const ieltsWriting = 'wt_ielts_writing';
  static const admin = 'wt_admin';
  static const weeklyReview = 'wt_weekly_review';

  static const _domainNames = <DomainId, (String, String)>{
    DomainId.health: ('الصحة والحركة', 'Health & Movement'),
    DomainId.sleep: ('النوم والطاقة', 'Sleep & Energy'),
    DomainId.food: ('الأكل', 'Food'),
    DomainId.care: ('العناية (بشرة، شعر، أسنان)', 'Care (skin, hair, teeth)'),
    DomainId.womensHealth: ('صحة المرأة', "Women's health"),
    DomainId.ielts: ('الآيلتس والإنجليزي', 'IELTS & English'),
    DomainId.learning: ('التعلّم والمهارات', 'Learning & Skills'),
    DomainId.career: ('المسار المهني والبورتفوليو', 'Career & Portfolio'),
    DomainId.driving: ('القيادة', 'Driving'),
    DomainId.money: ('المال', 'Money'),
    DomainId.home: ('البيت', 'Home'),
    DomainId.digital: ('الحياة الرقمية', 'Digital life'),
    DomainId.admin: ('الأمور الإدارية', 'Life admin'),
    DomainId.joy: ('المتعة والترفيه', 'Joy & Leisure'),
    DomainId.people: ('الناس والتواصل', 'People & Connection'),
    DomainId.faith: ('الإيمان والمعنى', 'Faith & Meaning'),
    DomainId.aquarium: ('حوض السمك', 'Aquarium'),
  };

  static const _grow = {DomainId.health, DomainId.ielts, DomainId.career};
  static const _maintain = {DomainId.sleep, DomainId.care, DomainId.home, DomainId.money};

  static List<Domain> buildDomains() => [
        for (final (i, id) in DomainId.values.indexed)
          Domain(
            id: id,
            nameAr: _domainNames[id]!.$1,
            nameEn: _domainNames[id]!.$2,
            state: _grow.contains(id)
                ? DomainState.grow
                : (_maintain.contains(id) ? DomainState.maintain : DomainState.rest),
            sensitive: id == DomainId.womensHealth,
            enabled: id != DomainId.womensHealth && id != DomainId.aquarium,
            parent: id == DomainId.aquarium ? DomainId.home : null,
            sortOrder: i,
          ),
      ];

  factory StarterProfile.build(SeedLibrary lib, DateTime today, {AppLanguage lang = AppLanguage.ar}) {
    final created = dayKey(today);
    // Seed text in the profile language ('' when the field does not apply).
    String tx(Action a, ActionField f) => a.text(f, lang) ?? '';

    Habit fromAction(
      String id,
      String actionId, {
      required DomainId domain,
      required HabitSchedule schedule,
      required int estimateMinimumMin,
      int? durationMin,
      String? routineId,
      String? alternationGroup,
      bool essential = false,
      bool reminder = false,
      int sortOrder = 0,
      String? normalTextOverride,
      String? titleArOverride,
      Action? durationSource,
    }) {
      final a = lib.require(actionId);
      final stated = a.statedMinimumMinutes;
      return Habit(
        id: id,
        actionId: actionId,
        domain: domain,
        titleAr: titleArOverride ?? a.title(AppLanguage.ar),
        titleEn: a.nameEn,
        cue: tx(a, ActionField.cue),
        ifThen: tx(a, ActionField.ifThen),
        minimumText: tx(a, ActionField.minimum),
        normalText: normalTextOverride ?? tx(a, ActionField.normal),
        bonusText: tx(a, ActionField.bonus),
        joyPairing: tx(a, ActionField.joy),
        frictionDown: tx(a, ActionField.frictionDown),
        frictionUp: tx(a, ActionField.frictionUp),
        reminder: HabitReminder(enabled: reminder),
        priority: a.priority,
        schedule: schedule,
        durationMin: durationMin ?? (a.timeMinutesNormal < 1 ? 1 : a.timeMinutesNormal),
        minimumDurationMin: stated ?? estimateMinimumMin,
        minimumDurationEstimated: stated == null,
        durationEstimated: doseUnstated(durationSource ?? a),
        routineId: routineId,
        alternationGroup: alternationGroup,
        essential: essential,
        sortOrder: sortOrder,
        createdDate: created,
      );
    }

    const everyDay = [1, 2, 3, 4, 5, 6, 7];
    final ieltsRotation = lib.require('GROW-12');

    final habits = <Habit>[
      // ---- Core (Grow) ----
      fromAction(vocab, 'GROW-07',
          domain: DomainId.ielts,
          // Normal = vocab + the day's rotation block (GROW-12).
          normalTextOverride: tx(ieltsRotation, ActionField.normal),
          durationMin: ieltsRotation.timeMinutesNormal,
          durationSource: ieltsRotation,
          estimateMinimumMin: 5,
          schedule: const HabitSchedule(weekdays: everyDay, anchor: CueAnchor.slot(Slot.morning)),
          reminder: true,
          sortOrder: 1),
      fromAction(focus, 'GROW-22',
          domain: DomainId.career,
          estimateMinimumMin: 15,
          // Work days Sun–Thu, after the morning routine.
          schedule: const HabitSchedule(
            weekdays: [7, 1, 2, 3, 4],
            anchor: CueAnchor(type: AnchorType.wake, offsetMin: 90, slot: Slot.morning),
          ),
          sortOrder: 2),
      fromAction(walk, 'BODY-02',
          domain: DomainId.health,
          estimateMinimumMin: 10,
          alternationGroup: 'movement',
          // Walk days = the non-strength days.
          schedule: const HabitSchedule(
            weekdays: [1, 3, 5, 6],
            anchor: CueAnchor(type: AnchorType.prayer, prayer: PrayerAnchor.maghrib, slot: Slot.evening, offsetMin: 10),
          ),
          reminder: true,
          sortOrder: 3),
      fromAction(strength, 'BODY-05',
          domain: DomainId.health,
          estimateMinimumMin: 10,
          alternationGroup: 'movement',
          schedule: const HabitSchedule(
            weekdays: [7, 2, 4],
            anchor: CueAnchor(type: AnchorType.prayer, prayer: PrayerAnchor.asr, slot: Slot.afternoon, offsetMin: 15),
          ),
          reminder: true,
          sortOrder: 4),
      // ---- Maintain (standalone: up to 2 on Today, spec §5.1) ----
      // Display titles as on the approved Today board (Main.dc.html).
      fromAction(roomReset, 'LIFE-13',
          domain: DomainId.home,
          titleArOverride: 'ترتيب الغرفة',
          estimateMinimumMin: 3,
          schedule: const HabitSchedule(
            weekdays: everyDay,
            anchor: CueAnchor(type: AnchorType.sleep, offsetMin: -90, slot: Slot.evening),
          ),
          sortOrder: 5),
      fromAction(moneyLog, 'LIFE-05',
          domain: DomainId.money,
          titleArOverride: 'تسجيل مصروف اليوم',
          estimateMinimumMin: 2,
          schedule: const HabitSchedule(weekdays: everyDay, anchor: CueAnchor.slot(Slot.evening)),
          sortOrder: 6),
      // ---- Maintain (in chains) ----
      fromAction(wake, 'BODY-15',
          domain: DomainId.sleep,
          estimateMinimumMin: 1,
          routineId: morningRoutine,
          schedule: const HabitSchedule(weekdays: everyDay, anchor: CueAnchor(type: AnchorType.wake)),
          sortOrder: 10),
      fromAction(sunscreen, 'FOOD-20',
          domain: DomainId.care,
          estimateMinimumMin: 1,
          routineId: morningRoutine,
          schedule: const HabitSchedule(weekdays: everyDay, anchor: CueAnchor(type: AnchorType.wake)),
          sortOrder: 11),
      fromAction(windDown, 'BODY-17',
          domain: DomainId.sleep,
          estimateMinimumMin: 1,
          routineId: nightRoutine,
          essential: true,
          schedule: const HabitSchedule(weekdays: everyDay, anchor: CueAnchor(type: AnchorType.sleep)),
          sortOrder: 21),
      fromAction(cleanse, 'FOOD-21',
          domain: DomainId.care,
          estimateMinimumMin: 2,
          routineId: nightRoutine,
          schedule: const HabitSchedule(weekdays: everyDay, anchor: CueAnchor(type: AnchorType.sleep)),
          sortOrder: 22),
      fromAction(dental, 'FOOD-23',
          domain: DomainId.care,
          estimateMinimumMin: 2,
          routineId: nightRoutine,
          essential: true,
          schedule: const HabitSchedule(weekdays: everyDay, anchor: CueAnchor(type: AnchorType.sleep)),
          sortOrder: 23),
    ];

    final food21 = lib.require('FOOD-21');
    final food23 = lib.require('FOOD-23');
    final routines = <Routine>[
      Routine(
        id: morningRoutine,
        titleAr: 'روتين الصباح',
        titleEn: 'Morning routine',
        section: PlanSection.morningChain,
        anchor: const CueAnchor(type: AnchorType.wake),
        steps: [
          const RoutineStep(id: 'rs_wake', habitId: wake),
          RoutineStep(
            id: 'rs_morning_cleanse',
            actionId: 'FOOD-21',
            domain: DomainId.care,
            titleAr: '${food21.title(AppLanguage.ar)} (صباحًا)',
            titleEn: '${food21.nameEn} (morning)',
            normalText: tx(food21, ActionField.normal),
            durationMin: 3,
            minimumDurationMin: 1,
          ),
          const RoutineStep(id: 'rs_sunscreen', habitId: sunscreen),
          RoutineStep(
            id: 'rs_morning_brush',
            actionId: 'FOOD-23',
            domain: DomainId.care,
            titleAr: '${food23.title(AppLanguage.ar)} (صباحًا)',
            titleEn: '${food23.nameEn} (morning)',
            normalText: tx(food23, ActionField.normal),
            durationMin: 4,
            minimumDurationMin: 2,
          ),
        ],
      ),
      const Routine(
        id: nightRoutine,
        titleAr: 'روتين الليل',
        titleEn: 'Night routine',
        section: PlanSection.eveningChain,
        anchor: CueAnchor(type: AnchorType.sleep, offsetMin: -60),
        steps: [
          RoutineStep(id: 'rs_wind_down', habitId: windDown),
          RoutineStep(id: 'rs_cleanse', habitId: cleanse),
          RoutineStep(id: 'rs_dental', habitId: dental),
        ],
      ),
    ];

    WeeklyTask weekly(
      String id,
      String actionId, {
      required DomainId domain,
      required List<int> days,
      required CueAnchor anchor,
      required int minimumDurationMin,
      bool pinned = false,
      bool review = false,
      int sortOrder = 0,
    }) {
      final a = lib.require(actionId);
      return WeeklyTask(
        id: id,
        actionId: actionId,
        domain: domain,
        titleAr: a.title(AppLanguage.ar),
        titleEn: a.nameEn,
        minimumText: tx(a, ActionField.minimum),
        normalText: tx(a, ActionField.normal),
        durationMin: a.timeMinutesNormal,
        minimumDurationMin: minimumDurationMin,
        preferredWeekdays: days,
        anchor: anchor,
        pinned: pinned,
        isWeeklyReview: review,
        sortOrder: sortOrder,
      );
    }

    final weeklyTasks = <WeeklyTask>[
      weekly(ieltsWriting, 'GROW-10',
          domain: DomainId.ielts,
          days: [1],
          anchor: const CueAnchor(type: AnchorType.prayer, prayer: PrayerAnchor.dhuhr, slot: Slot.midday, offsetMin: 15),
          minimumDurationMin: 10,
          sortOrder: 1),
      weekly(mealPlan, 'FOOD-08',
          domain: DomainId.food,
          days: [5],
          anchor: const CueAnchor(type: AnchorType.prayer, prayer: PrayerAnchor.maghrib, slot: Slot.evening, offsetMin: 15),
          minimumDurationMin: 5,
          pinned: true,
          sortOrder: 2),
      weekly(admin, 'LIFE-16',
          domain: DomainId.admin,
          days: [7],
          anchor: const CueAnchor(type: AnchorType.prayer, prayer: PrayerAnchor.asr, slot: Slot.afternoon, offsetMin: 60),
          minimumDurationMin: 10,
          pinned: true,
          sortOrder: 3),
      weekly(weeklyReview, 'JOY-09',
          domain: DomainId.joy,
          days: [6],
          anchor: const CueAnchor(type: AnchorType.slot, slot: Slot.evening, offsetMin: 60),
          minimumDurationMin: 5,
          review: true,
          sortOrder: 4),
    ];

    Milestone ms(String id, int q, String ar, String en) => Milestone(id: id, quarter: q, titleAr: ar, titleEn: en);

    final goals = <Goal>[
      Goal(id: 'g_driving', domain: DomainId.driving, titleAr: 'رخصة القيادة', titleEn: 'Driving licence', sortOrder: 1,
          milestones: [
            ms('m_drv_1', 1, 'تأكيد مسار الرخصة الرسمي في أبشر والتسجيل في مدرسة قيادة', 'Confirm the official licence path on Absher and enrol in a driving school'),
            ms('m_drv_2', 2, 'تدريب قيادة تحت الإشراف + اختبار النظري', 'Supervised driving practice + theory test'),
            ms('m_drv_3', 3, 'اختبار القيادة', 'Driving test'),
          ]),
      Goal(id: 'g_ielts', domain: DomainId.ielts, titleAr: 'الآيلتس', titleEn: 'IELTS', sortOrder: 2,
          linkedHabitIds: const [vocab],
          milestones: [
            ms('m_ie_1', 1, 'اختبار تشخيصي + مفردات يومية', 'Diagnostic test + daily vocabulary'),
            ms('m_ie_2', 2, 'تدوير كامل للمهارات + اختبار تجريبي شهري', 'Full skill rotation + monthly mock test'),
            ms('m_ie_3', 3, 'حجز الاختبار عندما تصل التجريبية لهدفك (أنتِ تحددينه)', 'Book the test when mocks reach your target (you set it)'),
          ]),
      Goal(id: 'g_career', domain: DomainId.career, titleAr: 'المسار المهني والبورتفوليو', titleEn: 'Career & portfolio', sortOrder: 3,
          linkedHabitIds: const [focus],
          milestones: [
            ms('m_car_1', 1, 'كورس واحد نشط (Google UX)', 'One active course (Google UX)'),
            ms('m_car_2', 2, 'دراسة حالة #1 في البورتفوليو + بداية سبرنت البحث الأسبوعي عن وظيفة', 'Portfolio case study #1 + weekly job-search sprint begins'),
            ms('m_car_3', 3, 'دراسة حالة #2 + بناء علاقات مهنية', 'Case study #2 + networking'),
          ]),
      Goal(id: 'g_health', domain: DomainId.health, titleAr: 'الصحة والجسم', titleEn: 'Health & body', sortOrder: 4,
          linkedHabitIds: const [walk, strength, wake],
          milestones: [
            ms('m_hl_1', 1, 'ثبات موعد النوم والاستيقاظ + مشي يومي + قوة مرتين أسبوعيًا على الأقل', 'Sleep/wake anchor + daily walk + strength at least 2×/week'),
            ms('m_hl_2', 2, 'تدرّج في تمارين القوة', 'Strength progression'),
            ms('m_hl_4', 4, 'المحافظة على العادات التلقائية', 'Maintain automatic habits'),
          ]),
      Goal(id: 'g_money', domain: DomainId.money, titleAr: 'المال', titleEn: 'Money', sortOrder: 5,
          milestones: [
            ms('m_mo_1', 1, 'أسبوع تتبّع المصروف + تفعيل الادخار التلقائي', 'Spending-tracking week + auto-save set up'),
            ms('m_mo_3', 3, 'مرحلة صندوق الطوارئ (المبلغ تحددينه)', 'Emergency fund milestone (amount you set)'),
          ]),
    ];

    const joyItems = <JoyItem>[
      JoyItem(id: 'joy_coffee_book', kind: JoyKind.free, titleAr: 'قهوة وكتاب', titleEn: 'Coffee & a book', size: JoySize.medium, keepFree: true),
      JoyItem(id: 'joy_podcast', kind: JoyKind.bundled, titleAr: 'بودكاست — فقط وقت المشي', titleEn: 'Podcast — only while walking', bundledHabitId: walk),
      JoyItem(id: 'joy_series', kind: JoyKind.bundled, titleAr: 'حلقة مسلسل — فقط مع تمرين القوة', titleEn: 'A series episode — only with strength training', size: JoySize.medium, bundledHabitId: strength),
      JoyItem(id: 'joy_beans', kind: JoyKind.earned, titleAr: 'حبوب قهوة جديدة', titleEn: 'New coffee beans', price: 60, costsMoney: true),
      JoyItem(id: 'joy_book', kind: JoyKind.earned, titleAr: 'كتاب جديد', titleEn: 'A new book', size: JoySize.medium, price: 120, costsMoney: true),
      JoyItem(id: 'joy_outing', kind: JoyKind.earned, titleAr: 'طلعة مع صديقة', titleEn: 'An outing with a friend', size: JoySize.big, price: 200, costsMoney: true),
    ];

    final domains = buildDomains();
    return StarterProfile(
      domains: domains,
      season: Season(
        id: 's_1',
        titleAr: 'موسم الأساسات',
        titleEn: 'Foundations season',
        startDate: created,
        states: {for (final d in domains) d.id: d.state},
      ),
      habits: habits,
      routines: routines,
      weeklyTasks: weeklyTasks,
      goals: goals,
      joyItems: joyItems,
      settings: Settings(language: lang),
    );
  }
}
