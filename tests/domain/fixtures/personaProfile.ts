/**
 * TEST FIXTURE ONLY — port of the Flutter `StarterProfile` (persona schedule)
 * so the ported engine tests exercise exactly the same inputs. It is NOT the
 * shipped seed (the app ships the neutral profile in src/domain/seed).
 * Goal/milestone titles are generic here on purpose.
 */
import {
  type Action, type ActionField, type AppLanguage, type CueAnchor, type Domain, type DomainId, type Goal, type Habit,
  type HabitSchedule, type JoyItem, type Milestone, type Routine, type Season, type Settings, type WeeklyTask,
  actionPriority, actionStatedMinimumMinutes, actionText, actionTitle, anchor, anchorSlot, buildDomains, dayKey,
  defaultSettings, makeHabit, makeJoyItem, makeRoutine, makeRoutineStep, makeWeeklyTask, requireAction, schedule,
  type SeedLibrary,
} from '../../../src/domain';

export const doseUnstated = (a: Action): boolean => a.dose.toLowerCase().includes('not specified by source');

export interface PersonaProfile {
  domains: Domain[];
  season: Season;
  habits: Habit[];
  routines: Routine[];
  weeklyTasks: WeeklyTask[];
  goals: Goal[];
  joyItems: JoyItem[];
  settings: Settings;
}

export const P = {
  walk: 'h_walk',
  strength: 'h_strength',
  vocab: 'h_vocab',
  focus: 'h_focus',
  sunscreen: 'h_sunscreen',
  cleanse: 'h_cleanse',
  dental: 'h_dental',
  roomReset: 'h_room_reset',
  moneyLog: 'h_money_log',
  wake: 'h_wake',
  windDown: 'h_wind_down',
  morningRoutine: 'r_morning',
  nightRoutine: 'r_night',
  mealPlan: 'wt_meal_plan',
  ieltsWriting: 'wt_ielts_writing',
  admin: 'wt_admin',
  weeklyReview: 'wt_weekly_review',
} as const;

const GROW = new Set<DomainId>(['health', 'ielts', 'career']);
const MAINTAIN = new Set<DomainId>(['sleep', 'care', 'home', 'money']);

export function personaDomains(): Domain[] {
  return buildDomains(GROW, MAINTAIN);
}

export function buildPersona(lib: SeedLibrary, today: Date, lang: AppLanguage = 'ar'): PersonaProfile {
  const created = dayKey(today);
  const tx = (a: Action, f: ActionField) => actionText(a, f, lang) ?? '';
  const fromAction = (
    id: string,
    actionId: string,
    o: {
      domain: DomainId;
      schedule: HabitSchedule;
      estimateMinimumMin: number;
      durationMin?: number;
      routineId?: string;
      alternationGroup?: string;
      essential?: boolean;
      reminder?: boolean;
      sortOrder?: number;
      normalTextOverride?: string;
      titleArOverride?: string;
      durationSource?: Action;
    },
  ): Habit => {
    const a = requireAction(lib, actionId);
    const stated = actionStatedMinimumMinutes(a);
    return makeHabit({
      id,
      actionId,
      domain: o.domain,
      titleAr: o.titleArOverride ?? actionTitle(a, 'ar'),
      titleEn: a.nameEn,
      cue: tx(a, 'cue'),
      ifThen: tx(a, 'ifThen'),
      minimumText: tx(a, 'minimum'),
      normalText: o.normalTextOverride ?? tx(a, 'normal'),
      bonusText: tx(a, 'bonus'),
      joyPairing: tx(a, 'joy'),
      frictionDown: tx(a, 'frictionDown'),
      frictionUp: tx(a, 'frictionUp'),
      reminder: { enabled: o.reminder ?? false, offsetMin: 0, textAr: null, textEn: null },
      priority: actionPriority(a),
      schedule: o.schedule,
      durationMin: o.durationMin ?? (a.timeMinutesNormal < 1 ? 1 : a.timeMinutesNormal),
      minimumDurationMin: stated ?? o.estimateMinimumMin,
      minimumDurationEstimated: stated == null,
      durationEstimated: doseUnstated(o.durationSource ?? a),
      routineId: o.routineId ?? null,
      alternationGroup: o.alternationGroup ?? null,
      essential: o.essential ?? false,
      sortOrder: o.sortOrder ?? 0,
      createdDate: created,
    });
  };
  const everyDay = [1, 2, 3, 4, 5, 6, 7];
  const rot = requireAction(lib, 'GROW-12');
  const habits: Habit[] = [
    fromAction(P.vocab, 'GROW-07', {
      domain: 'ielts', normalTextOverride: tx(rot, 'normal'), durationMin: rot.timeMinutesNormal, durationSource: rot,
      estimateMinimumMin: 5, schedule: schedule(everyDay, anchorSlot('morning')), reminder: true, sortOrder: 1,
    }),
    fromAction(P.focus, 'GROW-22', {
      domain: 'career', estimateMinimumMin: 15,
      schedule: schedule([7, 1, 2, 3, 4], anchor({ type: 'wake', offsetMin: 90, slot: 'morning' })), sortOrder: 2,
    }),
    fromAction(P.walk, 'BODY-02', {
      domain: 'health', estimateMinimumMin: 10, alternationGroup: 'movement',
      schedule: schedule([1, 3, 5, 6], anchor({ type: 'prayer', prayer: 'maghrib', slot: 'evening', offsetMin: 10 })),
      reminder: true, sortOrder: 3,
    }),
    fromAction(P.strength, 'BODY-05', {
      domain: 'health', estimateMinimumMin: 10, alternationGroup: 'movement',
      schedule: schedule([7, 2, 4], anchor({ type: 'prayer', prayer: 'asr', slot: 'afternoon', offsetMin: 15 })),
      reminder: true, sortOrder: 4,
    }),
    fromAction(P.roomReset, 'LIFE-13', {
      domain: 'home', titleArOverride: 'ترتيب الغرفة', estimateMinimumMin: 3,
      schedule: schedule(everyDay, anchor({ type: 'sleep', offsetMin: -90, slot: 'evening' })), sortOrder: 5,
    }),
    fromAction(P.moneyLog, 'LIFE-05', {
      domain: 'money', titleArOverride: 'تسجيل مصروف اليوم', estimateMinimumMin: 2,
      schedule: schedule(everyDay, anchorSlot('evening')), sortOrder: 6,
    }),
    fromAction(P.wake, 'BODY-15', {
      domain: 'sleep', estimateMinimumMin: 1, routineId: P.morningRoutine,
      schedule: schedule(everyDay, anchor({ type: 'wake' })), sortOrder: 10,
    }),
    fromAction(P.sunscreen, 'FOOD-20', {
      domain: 'care', estimateMinimumMin: 1, routineId: P.morningRoutine,
      schedule: schedule(everyDay, anchor({ type: 'wake' })), sortOrder: 11,
    }),
    fromAction(P.windDown, 'BODY-17', {
      domain: 'sleep', estimateMinimumMin: 1, routineId: P.nightRoutine, essential: true,
      schedule: schedule(everyDay, anchor({ type: 'sleep' })), sortOrder: 21,
    }),
    fromAction(P.cleanse, 'FOOD-21', {
      domain: 'care', estimateMinimumMin: 2, routineId: P.nightRoutine,
      schedule: schedule(everyDay, anchor({ type: 'sleep' })), sortOrder: 22,
    }),
    fromAction(P.dental, 'FOOD-23', {
      domain: 'care', estimateMinimumMin: 2, routineId: P.nightRoutine, essential: true,
      schedule: schedule(everyDay, anchor({ type: 'sleep' })), sortOrder: 23,
    }),
  ];
  const f21 = requireAction(lib, 'FOOD-21');
  const f23 = requireAction(lib, 'FOOD-23');
  const routines: Routine[] = [
    makeRoutine({
      id: P.morningRoutine, titleAr: 'روتين الصباح', titleEn: 'Morning routine', section: 'morningChain', anchor: anchor({ type: 'wake' }),
      steps: [
        makeRoutineStep({ id: 'rs_wake', habitId: P.wake }),
        makeRoutineStep({
          id: 'rs_morning_cleanse', actionId: 'FOOD-21', domain: 'care', titleAr: `${actionTitle(f21, 'ar')} (الصبح)`,
          titleEn: `${f21.nameEn} (morning)`, normalText: tx(f21, 'normal'), durationMin: 3, minimumDurationMin: 1,
        }),
        makeRoutineStep({ id: 'rs_sunscreen', habitId: P.sunscreen }),
        makeRoutineStep({
          id: 'rs_morning_brush', actionId: 'FOOD-23', domain: 'care', titleAr: `${actionTitle(f23, 'ar')} (الصبح)`,
          titleEn: `${f23.nameEn} (morning)`, normalText: tx(f23, 'normal'), durationMin: 4, minimumDurationMin: 2,
        }),
      ],
    }),
    makeRoutine({
      id: P.nightRoutine, titleAr: 'روتين الليل', titleEn: 'Night routine', section: 'eveningChain',
      anchor: anchor({ type: 'sleep', offsetMin: -60 }),
      steps: [
        makeRoutineStep({ id: 'rs_wind_down', habitId: P.windDown }),
        makeRoutineStep({ id: 'rs_cleanse', habitId: P.cleanse }),
        makeRoutineStep({ id: 'rs_dental', habitId: P.dental }),
      ],
    }),
  ];
  const weekly = (
    id: string,
    actionId: string,
    o: { domain: DomainId; days: number[]; anchor: CueAnchor; minimumDurationMin: number; pinned?: boolean; review?: boolean; sortOrder?: number },
  ): WeeklyTask => {
    const a = requireAction(lib, actionId);
    return makeWeeklyTask({
      id, actionId, domain: o.domain, titleAr: actionTitle(a, 'ar'), titleEn: a.nameEn, minimumText: tx(a, 'minimum'),
      normalText: tx(a, 'normal'), durationMin: a.timeMinutesNormal, minimumDurationMin: o.minimumDurationMin,
      preferredWeekdays: o.days, anchor: o.anchor, pinned: o.pinned ?? false, isWeeklyReview: o.review ?? false, sortOrder: o.sortOrder ?? 0,
    });
  };
  const weeklyTasks = [
    weekly(P.ieltsWriting, 'GROW-10', { domain: 'ielts', days: [1], anchor: anchor({ type: 'prayer', prayer: 'dhuhr', slot: 'midday', offsetMin: 15 }), minimumDurationMin: 10, sortOrder: 1 }),
    weekly(P.mealPlan, 'FOOD-08', { domain: 'food', days: [5], anchor: anchor({ type: 'prayer', prayer: 'maghrib', slot: 'evening', offsetMin: 15 }), minimumDurationMin: 5, pinned: true, sortOrder: 2 }),
    weekly(P.admin, 'LIFE-16', { domain: 'admin', days: [7], anchor: anchor({ type: 'prayer', prayer: 'asr', slot: 'afternoon', offsetMin: 60 }), minimumDurationMin: 10, pinned: true, sortOrder: 3 }),
    weekly(P.weeklyReview, 'JOY-09', { domain: 'joy', days: [6], anchor: anchor({ type: 'slot', slot: 'evening', offsetMin: 60 }), minimumDurationMin: 5, review: true, sortOrder: 4 }),
  ];
  const ms = (id: string, q: number, t: string): Milestone => ({ id, quarter: q, titleAr: t, titleEn: t, done: false, doneDate: null, rewardJoyId: null });
  const goal = (id: string, domain: DomainId, sortOrder: number, milestones: Milestone[], linkedHabitIds: string[] = []): Goal => ({
    id, domain, titleAr: id, titleEn: id, targetNote: '', milestones, linkedHabitIds, linkedProjectIds: [], sortOrder,
  });
  const goals = [
    goal('g_driving', 'driving', 1, [ms('m_drv_1', 1, 'm1'), ms('m_drv_2', 2, 'm2'), ms('m_drv_3', 3, 'm3')]),
    goal('g_ielts', 'ielts', 2, [ms('m_ie_1', 1, 'm1'), ms('m_ie_2', 2, 'm2'), ms('m_ie_3', 3, 'm3')], [P.vocab]),
    goal('g_career', 'career', 3, [ms('m_car_1', 1, 'm1'), ms('m_car_2', 2, 'm2'), ms('m_car_3', 3, 'm3')], [P.focus]),
    goal('g_health', 'health', 4, [ms('m_hl_1', 1, 'm1'), ms('m_hl_2', 2, 'm2'), ms('m_hl_4', 4, 'm4')], [P.walk, P.strength, P.wake]),
    goal('g_money', 'money', 5, [ms('m_mo_1', 1, 'm1'), ms('m_mo_3', 3, 'm3')]),
  ];
  const joyItems: JoyItem[] = [
    makeJoyItem({ id: 'joy_coffee_book', kind: 'free', titleAr: 'قهوة وكتاب', titleEn: 'Coffee & a book', size: 'medium', keepFree: true }),
    makeJoyItem({ id: 'joy_podcast', kind: 'bundled', titleAr: 'بودكاست — بس وقت المشي', titleEn: 'Podcast — only while walking', bundledHabitId: P.walk }),
    makeJoyItem({ id: 'joy_series', kind: 'bundled', titleAr: 'حلقة مسلسل — بس مع تمرين القوة', titleEn: 'A series episode — only with strength training', size: 'medium', bundledHabitId: P.strength }),
    makeJoyItem({ id: 'joy_beans', kind: 'earned', titleAr: 'حبوب قهوة جديدة', titleEn: 'New coffee beans', price: 60, costsMoney: true }),
    makeJoyItem({ id: 'joy_book', kind: 'earned', titleAr: 'كتاب جديد', titleEn: 'A new book', size: 'medium', price: 120, costsMoney: true }),
    makeJoyItem({ id: 'joy_outing', kind: 'earned', titleAr: 'طلعة', titleEn: 'An outing', size: 'big', price: 200, costsMoney: true }),
  ];
  const domains = personaDomains();
  const states: Season['states'] = {};
  for (const d of domains) states[d.id] = d.state;
  return {
    domains,
    season: { id: 's_1', titleAr: 'موسم الأساسات', titleEn: 'Foundations season', startDate: created, plannedEndDate: null, endedDate: null, states },
    habits,
    routines,
    weeklyTasks,
    goals,
    joyItems,
    // Parity: the Flutter engine has reminders always available and auto plan.
    settings: defaultSettings({ language: lang, notificationsEnabled: true, planMode: 'auto' }),
  };
}
