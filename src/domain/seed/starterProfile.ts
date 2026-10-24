/**
 * NEUTRAL starter profile (owner decision): nothing personal ships in the
 * public build — no name, goals, schedule or routines of hers. She enters
 * those in onboarding, on her device. What ships:
 *
 * - the 17 Life-Map domains (Maintain: sleep, care, home, money; everything
 *   else Rest; Grow is chosen by her — max 3);
 * - a first season titled generically;
 * - the weekly-review ritual (system task, Saturday evening);
 * - generic, editable product placeholders («منتجاتي») → AM/PM care routines;
 * - default settings (Makkah only as the prayer-time default; prayer anchors off;
 *   reminders off; suggestion-mode day plan; payday on the 1st).
 *
 * Optional templates she can add herself (from her own stated routines in the
 * content brief): `drivingTemplate()` and `ieltsTemplate()`.
 */
import { dayKey } from '../core/dates';
import type { AppLanguage, Domain, DomainId, Habit, JoyItem, Goal, Product, Routine, Season, Settings, Slot, WeeklyTask } from '../models';
import {
  DOMAIN_IDS,
  actionText,
  actionTitle,
  anchor,
  defaultSettings,
  makeHabit,
  makeWeeklyTask,
  schedule,
  actionPriority,
} from '../models';
import { placeholderProducts } from '../products';
import { requireAction, type SeedLibrary } from './seedLibrary';

export const kDomainNames: Readonly<Record<DomainId, readonly [string, string]>> = {
  health: ['الصحة والحركة', 'Health & Movement'],
  sleep: ['النوم والطاقة', 'Sleep & Energy'],
  food: ['الأكل', 'Food'],
  care: ['العناية (بشرة، شعر، أسنان)', 'Care (skin, hair, teeth)'],
  womensHealth: ['صحة المرأة', "Women's health"],
  ielts: ['IELTS والإنجليزي', 'IELTS & English'],
  learning: ['التعلّم والمهارات', 'Learning & Skills'],
  career: ['المسار المهني والبورتفوليو', 'Career & Portfolio'],
  driving: ['القيادة', 'Driving'],
  money: ['المال', 'Money'],
  home: ['البيت', 'Home'],
  digital: ['الحياة الرقمية', 'Digital life'],
  admin: ['المعاملات والأوراق', 'Life admin'],
  joy: ['المتعة والترفيه', 'Joy & Leisure'],
  people: ['الناس والتواصل', 'People & Connection'],
  faith: ['الإيمان والمعنى', 'Faith & Meaning'],
  aquarium: ['حوض السمك', 'Aquarium'],
};

/** Domains with the given Grow / Maintain sets; everything else Rest. */
export function buildDomains(grow: ReadonlySet<DomainId> = new Set(), maintain: ReadonlySet<DomainId> = new Set(['sleep', 'care', 'home', 'money'])): Domain[] {
  return DOMAIN_IDS.map((id, i) => ({
    id,
    nameAr: kDomainNames[id][0],
    nameEn: kDomainNames[id][1],
    state: grow.has(id) ? 'grow' : maintain.has(id) ? 'maintain' : 'rest',
    sensitive: id === 'womensHealth',
    enabled: id !== 'womensHealth' && id !== 'aquarium',
    parent: id === 'aquarium' ? 'home' : null,
    sortOrder: i,
  }));
}

export interface StarterProfile {
  domains: Domain[];
  season: Season;
  habits: Habit[];
  routines: Routine[];
  weeklyTasks: WeeklyTask[];
  goals: Goal[];
  joyItems: JoyItem[];
  products: Product[];
  settings: Settings;
}

export const kWeeklyReviewTaskId = 'wt_weekly_review';

/** Builds the neutral starter profile created on [today]. */
export function buildStarterProfile(lib: SeedLibrary, today: Date, lang: AppLanguage = 'ar'): StarterProfile {
  const created = dayKey(today);
  const domains = buildDomains();
  const review = requireAction(lib, 'JOY-09');
  const weeklyReview = makeWeeklyTask({
    id: kWeeklyReviewTaskId,
    actionId: 'JOY-09',
    domain: 'joy',
    titleAr: actionTitle(review, 'ar'),
    titleEn: review.nameEn,
    minimumText: actionText(review, 'minimum', lang) ?? '',
    normalText: actionText(review, 'normal', lang) ?? '',
    durationMin: review.timeMinutesNormal,
    minimumDurationMin: 5,
    preferredWeekdays: [6],
    anchor: anchor({ type: 'slot', slot: 'evening', offsetMin: 60 }),
    isWeeklyReview: true,
    sortOrder: 1,
  });
  const states: Season['states'] = {};
  for (const d of domains) states[d.id] = d.state;
  return {
    domains,
    season: {
      id: 's_1',
      titleAr: 'موسمي الأول',
      titleEn: 'My first season',
      startDate: created,
      plannedEndDate: null,
      endedDate: null,
      states,
    },
    habits: [],
    routines: [],
    weeklyTasks: [weeklyReview],
    goals: [],
    joyItems: [],
    // Generic suggestions flagged `placeholder: true` (UI shows them as «مبدئي» suggestions, not her real products).
    products: placeholderProducts(),
    settings: defaultSettings({ language: lang }),
  };
}

// ---- optional templates (she adds them; never seeded) -----------------------

/** Driving: theory videos 3×/week + one supervised practice a week (flexible day). */
export function drivingTemplate(): WeeklyTask[] {
  return [
    makeWeeklyTask({
      id: 'wt_driving_videos',
      domain: 'driving',
      titleAr: 'فيديوهات نظرية',
      titleEn: 'Theory videos',
      minimumText: 'فيديو واحد قصير',
      normalText: 'فيديو أو اثنين مع ملاحظات',
      durationMin: 20,
      minimumDurationMin: 5,
      timesPerWeek: 3,
      sortOrder: 10,
    }),
    makeWeeklyTask({
      id: 'wt_driving_practice',
      domain: 'driving',
      titleAr: 'تدريب عملي',
      titleEn: 'Driving practice',
      minimumText: 'لفة قصيرة',
      normalText: 'تدريب عملي مع مرافق',
      durationMin: 60,
      minimumDurationMin: 20,
      timesPerWeek: 1,
      sortOrder: 11,
    }),
  ];
}

/** IELTS daily, 30–45 minutes, with the weekly skill rotation (GROW-07 / GROW-12). */
export function ieltsTemplate(lib: SeedLibrary, today: Date, lang: AppLanguage = 'ar'): Habit {
  const a = requireAction(lib, 'GROW-07');
  const rotation = requireAction(lib, 'GROW-12');
  return makeHabit({
    id: 'h_ielts',
    actionId: 'GROW-07',
    domain: 'ielts',
    titleAr: actionTitle(a, 'ar'),
    titleEn: a.nameEn,
    cue: actionText(a, 'cue', lang) ?? '',
    minimumText: actionText(a, 'minimum', lang) ?? '',
    // Her own range (30–45 د) instead of the library's generic «30-60».
    normalText: lang === 'ar' ? 'مفردات + مهارة اليوم (30–45 د).' : actionText(rotation, 'normal', lang) ?? '',
    bonusText: actionText(a, 'bonus', lang) ?? '',
    priority: actionPriority(a),
    schedule: schedule(undefined, anchor({ type: 'slot', slot: 'morning' })),
    durationMin: 45,
    // Her own range: 30 (small version) – 45 minutes.
    minimumDurationMin: 30,
    minimumDurationEstimated: false,
    createdDate: dayKey(today),
    sortOrder: 1,
  });
}

// ---------------------------------------------------------------------------
// Starter habits she can PICK in onboarding (nothing preselected, nothing personal):
// generic templates built from the evidence library. Ids are stable so picking twice
// doesn't duplicate.
// ---------------------------------------------------------------------------

export interface StarterHabitOption {
  actionId: string;
  domain: DomainId;
  slot: Slot;
  durationMin: number;
  minimumDurationMin: number;
}

export const kStarterHabitOptions: readonly StarterHabitOption[] = [
  { actionId: 'BODY-02', domain: 'health', slot: 'afternoon', durationMin: 20, minimumDurationMin: 10 },
  { actionId: 'BODY-23', domain: 'health', slot: 'anytime', durationMin: 1, minimumDurationMin: 1 },
  { actionId: 'BODY-15', domain: 'sleep', slot: 'morning', durationMin: 1, minimumDurationMin: 1 },
  { actionId: 'BODY-17', domain: 'sleep', slot: 'night', durationMin: 15, minimumDurationMin: 5 },
  { actionId: 'GROW-07', domain: 'ielts', slot: 'morning', durationMin: 45, minimumDurationMin: 30 },
  { actionId: 'GROW-08', domain: 'learning', slot: 'evening', durationMin: 15, minimumDurationMin: 5 },
  { actionId: 'LIFE-13', domain: 'home', slot: 'night', durationMin: 10, minimumDurationMin: 3 },
  { actionId: 'JOY-03', domain: 'joy', slot: 'night', durationMin: 3, minimumDurationMin: 1 },
];

/** Builds the habit for one starter option (null if the library lacks that action). */
export function starterHabit(lib: SeedLibrary, opt: StarterHabitOption, today: Date, lang: AppLanguage = 'ar', sortOrder = 50): Habit | null {
  if (opt.actionId === 'GROW-07') return { ...ieltsTemplate(lib, today, lang), sortOrder };
  const a = lib.actions.find((x) => x.actionId === opt.actionId);
  if (!a) return null;
  return makeHabit({
    id: `h_start_${opt.actionId.toLowerCase().replace('-', '')}`,
    actionId: a.actionId,
    domain: opt.domain,
    titleAr: actionTitle(a, 'ar'),
    titleEn: a.nameEn,
    cue: actionText(a, 'cue', lang) ?? '',
    minimumText: actionText(a, 'minimum', lang) ?? '',
    normalText: actionText(a, 'normal', lang) ?? '',
    bonusText: actionText(a, 'bonus', lang) ?? '',
    priority: actionPriority(a),
    schedule: schedule(undefined, anchor({ type: 'slot', slot: opt.slot })),
    durationMin: opt.durationMin,
    minimumDurationMin: opt.minimumDurationMin,
    createdDate: dayKey(today),
    sortOrder,
  });
}

/** All starter options as habits (for the onboarding picker). */
export function starterHabitOptions(lib: SeedLibrary, today: Date, lang: AppLanguage = 'ar'): Habit[] {
  return kStarterHabitOptions.map((o, i) => starterHabit(lib, o, today, lang, 50 + i)).filter((h): h is Habit => h != null);
}
