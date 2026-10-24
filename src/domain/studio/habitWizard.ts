/**
 * Habit Studio wizard — pure logic (9 steps from the Habit Studio board).
 * The wizard edits a [WizardDraft]; [habitFromDraft] turns it into a Habit. Evidence prefill reads the
 * existing library (Action) — nothing here invents content: a field the library has no text for stays empty.
 */
import {
  actionPriority,
  actionSlot,
  actionText,
  actionType,
  anchor,
  defaultReminder,
  EVERY_DAY,
  makeHabit,
  schedule,
  type Action,
  type AppLanguage,
  type CueAnchor,
  type DomainId,
  type Habit,
  type PrayerAnchor,
  type Priority,
  type Slot,
} from '../models';
import { domainForAction } from '../seed/seedLibrary';

export const WIZARD_STEP_IDS = ['goal', 'behavior', 'versions', 'cue', 'prep', 'joy', 'ifThen', 'friction', 'reminder'] as const;
export type WizardStepId = (typeof WIZARD_STEP_IDS)[number];

export type CueKind = 'wake' | 'prayer' | 'fixedTime' | 'slot';

export interface WizardDraft {
  title: string;
  domain: DomainId;
  priority: Priority;
  goal: string;
  actionId: string | null;
  cueKind: CueKind;
  prayer: PrayerAnchor;
  minute: number;
  slot: Slot;
  days: number[];
  minText: string;
  minMin: number;
  normalText: string;
  normalMin: number;
  bonusText: string;
  frictionDown: string;
  joyPairing: string;
  ifThen: string;
  frictionUp: string;
  reminderOn: boolean;
}
export type WizardKey = keyof WizardDraft;

/** Which draft fields each step owns (drives «مقترح» badges and the per-step summary). */
export const STEP_FIELDS: Record<WizardStepId, readonly WizardKey[]> = {
  goal: ['goal'],
  behavior: ['title', 'domain', 'priority'],
  versions: ['minText', 'normalText', 'bonusText', 'minMin', 'normalMin'],
  cue: ['cueKind', 'prayer', 'minute', 'slot', 'days'],
  prep: ['frictionDown'],
  joy: ['joyPairing'],
  ifThen: ['ifThen'],
  friction: ['frictionUp'],
  reminder: ['reminderOn'],
};

export function emptyDraft(domain: DomainId = 'health'): WizardDraft {
  return {
    title: '', domain, priority: 'recommended', goal: '', actionId: null,
    cueKind: 'slot', prayer: 'asr', minute: 7 * 60, slot: 'anytime', days: [...EVERY_DAY],
    minText: '', minMin: 5, normalText: '', normalMin: 15, bonusText: '',
    frictionDown: '', joyPairing: '', ifThen: '', frictionUp: '', reminderOn: false,
  };
}

export function draftFromHabit(h: Habit): WizardDraft {
  const a = h.schedule.anchor;
  const kind: CueKind = a.type === 'sleep' ? 'slot' : (a.type as CueKind);
  return {
    title: h.titleAr, domain: h.domain, priority: h.priority, goal: h.goal, actionId: h.actionId,
    cueKind: kind, prayer: a.prayer ?? 'asr', minute: a.minute ?? 7 * 60, slot: a.slot ?? 'anytime',
    days: [...h.schedule.weekdays], minText: h.minimumText, minMin: h.minimumDurationMin,
    normalText: h.normalText, normalMin: h.durationMin, bonusText: h.bonusText,
    frictionDown: h.frictionDown, joyPairing: h.joyPairing, ifThen: h.ifThen, frictionUp: h.frictionUp,
    reminderOn: h.reminder.enabled,
  };
}

export function cueOf(d: WizardDraft): CueAnchor {
  switch (d.cueKind) {
    case 'wake': return anchor({ type: 'wake', offsetMin: 10 });
    case 'prayer': return anchor({ type: 'prayer', prayer: d.prayer, offsetMin: 10 });
    case 'fixedTime': return anchor({ type: 'fixedTime', minute: d.minute });
    case 'slot': return anchor({ type: 'slot', slot: d.slot });
  }
}

/** Error text for the step, or null when it may be left as is (only the name and the days are required). */
export function validateStep(id: WizardStepId, d: WizardDraft): string | null {
  if (id === 'behavior' && d.title.trim() === '') return 'اكتبي اسم العادة';
  if (id === 'cue' && d.days.length === 0) return 'اختاري يوم واحد على الأقل';
  return null;
}
/** First step that blocks saving, or null. */
export function firstBlockingStep(d: WizardDraft): WizardStepId | null {
  for (const id of WIZARD_STEP_IDS) if (validateStep(id, d) != null) return id;
  return null;
}

/** True when the step holds something she (or the library) wrote — text steps only. */
export function stepHasValue(id: WizardStepId, d: WizardDraft): boolean {
  switch (id) {
    case 'goal': return d.goal.trim() !== '';
    case 'behavior': return d.title.trim() !== '';
    case 'versions': return [d.minText, d.normalText, d.bonusText].some((t) => t.trim() !== '');
    case 'cue': return d.days.length > 0;
    case 'prep': return d.frictionDown.trim() !== '';
    case 'joy': return d.joyPairing.trim() !== '';
    case 'ifThen': return d.ifThen.trim() !== '';
    case 'friction': return d.frictionUp.trim() !== '';
    case 'reminder': return true;
  }
}

/**
 * Builds the Habit. [cueText] is the human label of the cue (UI-owned wording). Unchanged reminder
 * state keeps the base reminder (its text/offset); a changed one is «تنبيه واحد وقت العادة».
 * [status] 'paused' = saved as a draft (kept, off her day until she turns it on).
 */
export function habitFromDraft(d: WizardDraft, base: Habit | null, o: { id: string; cueText: string; status?: Habit['status'] }): Habit {
  const cue = cueOf(d);
  const normalMin = Math.max(1, d.normalMin);
  const reminder = base && base.reminder.enabled === d.reminderOn ? base.reminder : d.reminderOn ? { ...defaultReminder(), enabled: true, offsetMin: 0 } : defaultReminder();
  const fields: Partial<Habit> = {
    titleAr: d.title.trim(),
    domain: d.domain,
    goal: d.goal.trim(),
    actionId: d.actionId ?? base?.actionId ?? null,
    cue: o.cueText,
    schedule: schedule(d.days.slice().sort(), cue),
    minimumText: d.minText.trim(),
    minimumDurationMin: Math.min(d.minMin, normalMin),
    normalText: d.normalText.trim(),
    durationMin: normalMin,
    bonusText: d.bonusText.trim(),
    frictionDown: d.frictionDown.trim(),
    joyPairing: d.joyPairing.trim(),
    ifThen: d.ifThen.trim(),
    frictionUp: d.frictionUp.trim(),
    priority: d.priority,
    reminder,
  };
  if (o.status) fields.status = o.status;
  return base ? { ...base, ...fields } : makeHabit({ id: o.id, domain: d.domain, titleAr: d.title.trim(), titleEn: '', ...fields });
}

// ---- evidence library ---------------------------------------------------------------------

/** Library actions that make sense as a habit (type «Habit»); women's-health ones only when her private module is on. */
export function evidenceHabitOptions(actions: readonly Action[], o: { includeSensitive: boolean }): Action[] {
  return actions.filter((a) => actionType(a) === 'habit' && (o.includeSensitive || domainForAction(a) !== 'womensHealth'));
}

export interface Prefill {
  patch: Partial<WizardDraft>;
  /** Fields the library actually filled (so the UI marks them «مقترح»). */
  keys: WizardKey[];
}

/** Maps a library action onto the draft. Empty library fields are skipped, never replaced by invented text. */
export function prefillFromAction(a: Action, lang: AppLanguage, fallbackDomain: DomainId): Prefill {
  const patch: Partial<WizardDraft> = { actionId: a.actionId };
  const text = (f: Parameters<typeof actionText>[1]) => (actionText(a, f, lang) ?? '').trim();
  const set = <K extends WizardKey>(k: K, v: WizardDraft[K], ok = true) => {
    if (ok) patch[k] = v;
  };
  const title = lang === 'ar' ? (a.ar?.cardTitle ?? a.nameAr) : a.nameEn;
  set('title', title, title.trim() !== '');
  patch.domain = domainForAction(a) ?? fallbackDomain;
  patch.priority = actionPriority(a);
  const min = text('minimum'), normal = text('normal'), bonus = text('bonus');
  set('minText', min, min !== '');
  set('normalText', normal, normal !== '');
  set('bonusText', bonus, bonus !== '');
  const mins = Math.round(a.timeMinutesNormal);
  if (Number.isFinite(mins) && mins > 0) {
    patch.normalMin = Math.min(mins, 180);
    patch.minMin = Math.min(5, patch.normalMin);
  }
  patch.cueKind = 'slot';
  patch.slot = actionSlot(a);
  const fd = text('frictionDown'), jp = text('joy'), it = text('ifThen'), fu = text('frictionUp');
  set('frictionDown', fd, fd !== '');
  set('joyPairing', jp, jp !== '');
  set('ifThen', it, it !== '');
  set('frictionUp', fu, fu !== '');
  const keys = (Object.keys(patch) as WizardKey[]).filter((k) => k !== 'actionId');
  return { patch, keys };
}

/** Applies a prefill; returns the new draft and the previous values of every field it touched (for undo). */
export function applyPrefill(d: WizardDraft, p: Prefill): { draft: WizardDraft; previous: Partial<WizardDraft> } {
  const previous: Partial<WizardDraft> = {};
  for (const k of Object.keys(p.patch) as WizardKey[]) (previous as Record<string, unknown>)[k] = d[k];
  return { draft: { ...d, ...p.patch }, previous };
}
/** Undo of [applyPrefill]. */
export const undoPrefill = (d: WizardDraft, previous: Partial<WizardDraft>): WizardDraft => ({ ...d, ...previous });
