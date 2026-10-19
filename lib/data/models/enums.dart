/// Enumerations shared by models and engine.
///
/// Every enum serialises by its [Enum.name]; use [enumFromName] to parse
/// with a safe fallback so older/newer JSON never crashes the app.
library;

/// Parses [name] into a value of [values], returning [fallback] when unknown.
T enumFromName<T extends Enum>(List<T> values, Object? name, T fallback) {
  if (name is! String) return fallback;
  for (final v in values) {
    if (v.name == name) return v;
  }
  return fallback;
}

/// Life-Map domains (spec §4). `aquarium` is a conditional sub-domain of Home.
enum DomainId {
  health,
  sleep,
  food,
  care,
  womensHealth,
  ielts,
  learning,
  career,
  driving,
  money,
  home,
  digital,
  admin,
  joy,
  people,
  faith,
  aquarium,
}

/// Per-season state of a domain (spec §4).
enum DomainState { grow, maintain, rest }

/// Evidence priority from the Action Library (`priority_for_her`).
enum Priority { core, recommended, optional, conditional }

/// How a plan item was completed (spec §5.2). `skipped` is an explicit skip;
/// any of minimum/normal/bonus counts as done (ENG-19).
enum CompletionLevel { minimum, normal, bonus, skipped }

extension CompletionLevelX on CompletionLevel {
  /// True for minimum, normal and bonus.
  bool get isDone => this != CompletionLevel.skipped;
}

/// Morning Brief one-tap energy check (spec §5.1).
enum EnergyMode { green, yellow, red }

/// Coarse time-of-day slot (matches `schedule_slot` in actions.json).
enum Slot { morning, midday, afternoon, evening, night, anytime }

/// Where a plan item came from.
enum PlanItemKind { habit, routineStep, weeklyTask, projectStep, joy }

/// Which cap bucket a plan item occupies (spec §5.1).
enum PlanTier {
  /// Up to 3 per day (2 on Yellow) from Grow domains.
  core,

  /// Up to 2 per day from Maintain domains.
  maintain,

  /// Exactly 1 Free Joy.
  joy,

  /// Steps of the Morning / Evening chains (not counted in caps).
  chain,

  /// System rituals such as the weekly review (not counted in caps).
  system,
}

/// Timeline section of the Today screen.
enum PlanSection { morningChain, day, eveningChain }

/// Item types from the Action Library (`app_type`).
enum ActionType {
  habit,
  routineStep,
  weeklyTask,
  systemAutomation,
  reference,
  projectStep,
  engineRule,
}

ActionType actionTypeFromSeed(String raw) {
  switch (raw) {
    case 'Habit':
      return ActionType.habit;
    case 'Routine step':
      return ActionType.routineStep;
    case 'Weekly task':
      return ActionType.weeklyTask;
    case 'System/automation':
      return ActionType.systemAutomation;
    case 'Project step':
      return ActionType.projectStep;
    case 'Engine rule':
      return ActionType.engineRule;
    case 'Reference':
    default:
      return ActionType.reference;
  }
}

Priority priorityFromSeed(String raw) {
  switch (raw) {
    case 'Core':
      return Priority.core;
    case 'Recommended':
      return Priority.recommended;
    case 'Conditional':
      return Priority.conditional;
    case 'Optional':
    default:
      return Priority.optional;
  }
}

/// Maps a seed `schedule_slot` to [Slot]. Non-daily values map to anytime.
Slot slotFromSeed(String raw) {
  switch (raw) {
    case 'morning':
      return Slot.morning;
    case 'midday':
      return Slot.midday;
    case 'afternoon':
      return Slot.afternoon;
    case 'evening':
      return Slot.evening;
    case 'night':
      return Slot.night;
    default:
      return Slot.anytime;
  }
}

/// Project lifecycle (spec §3). Max 2 [active] (ENG-17).
enum ProjectStatus { idea, active, waiting, paused, done, archived }

/// Habit lifecycle.
enum HabitStatus { active, paused, archived }

/// Joy types (spec §6).
enum JoyKind { free, bundled, earned }

/// Joy size tag in the Joy Map.
enum JoySize { quick, medium, big }

/// Growth stages derived from Habit Strength (spec §5.3). Never a day count.
enum GrowthStage { seed, sprout, growing, rooted, automatic }

/// Why a Spark transaction happened (spec §6.4).
enum SparkReason {
  completion,
  comeback,
  weeklyReview,
  experiment,
  redeem,
  reversal,
  adjustment,
}

/// "What got in the way?" chips (spec §5.5).
enum MissReason {
  forgot,
  badTime,
  tooBig,
  tired,
  notEnjoyable,
  placeDidntFit,
  busy,
  notImportantNow,
}

/// IELTS skill focus of a rotation day (GROW-12).
enum IeltsSkill { reading, listening, writing, speaking, mixedReadingListening, lightReview }

/// Experiment lifecycle (ENG-21).
enum ExperimentStatus { planned, active, completed, reverted, kept }

/// Kind of cue anchor a habit is scheduled against (ENG-01).
enum AnchorType { fixedTime, wake, sleep, prayer, slot }

/// Prayers usable as optional cue anchors (off by default).
enum PrayerAnchor { fajr, dhuhr, asr, maghrib, isha }

/// App-wide language.
enum AppLanguage { ar, en }

/// Theme preference.
enum ThemePref { system, light, dark }

/// Accessible accent palettes available in the appearance studio.
enum ThemePalette { calmSky, lavender, ocean, forest, rose, terracotta, midnight }

/// Card presentation preference; tap targets stay the same across styles.
enum CardStyle { outlined, soft, minimal }

/// Response to a delivered notification.
enum NudgeResponse { done, snoozed, skipped, ignored, opened }

/// Kind of scheduled notification (spec §5.6).
enum NudgeKind { morningBrief, anchored, eveningShutdown, dues }
