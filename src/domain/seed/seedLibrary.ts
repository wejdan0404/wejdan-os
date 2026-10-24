/**
 * Parsed action library (`actions.json` + Arabic `actions_ar.json`) — port of
 * `data/seed/seed_library.dart`. Internal cross-references ("see BODY-25") are
 * replaced by readable titles so ids never reach UI copy.
 */
import type { Action, DomainId, EngineRule, Json } from '../models';
import { ActionJ, EngineRuleJ, actionFamily, actionTitle } from '../models';
import { asJson, jStr } from '../core/json';
import { mergeLibraries, readPersonalLibrary, type PersonalLibraryFile } from './personalLibrary';

/** An internal action / engine-rule id inside seed text ("BODY-25"). */
export const kActionRefPattern = /\b(?:BODY|FOOD|GROW|LIFE|JOY|ENG)-\d{2}\b/g;

export interface SeedLibrary {
  actions: Action[];
  rules: EngineRule[];
}

/** Bump when the shipped library content changes (installed apps refresh their copy). */
export const kSeedLibraryVersion = 4; // v4: neutral public library (personal content moved to a private, locally-imported file)

/** Parses the raw arrays (already-decoded JSON or strings). */
export function parseSeedLibrary(raw: unknown, arRaw?: unknown): SeedLibrary {
  const list = (typeof raw === 'string' ? JSON.parse(raw) : raw) as unknown[];
  const arMap: Json = arRaw == null ? {} : asJson(typeof arRaw === 'string' ? JSON.parse(arRaw) : arRaw);
  const titleEn = new Map<string, string>();
  const titleAr = new Map<string, string>();
  for (const e of list) {
    const j = asJson(e);
    const id = jStr(j, 'action_id');
    titleEn.set(id, jStr(j, 'name_en'));
    const ar = arMap[id];
    const arTitle = ar !== null && typeof ar === 'object' ? (asJson(ar)['card_title_ar'] as string | undefined) : undefined;
    titleAr.set(id, arTitle == null || arTitle === '' ? jStr(j, 'name_ar') : arTitle);
  }
  const clean = (v: string, titles: Map<string, string>): string =>
    v.replace(kActionRefPattern, (m) => {
      const t = titles.get(m);
      return t == null || t === '' ? m : `«${t}»`;
    });
  const actions: Action[] = [];
  const rules: EngineRule[] = [];
  for (const e of list) {
    const j: Json = { ...asJson(e) };
    for (const k of Object.keys(j)) {
      const v = j[k];
      if (k !== 'action_id' && typeof v === 'string') j[k] = clean(v, titleEn);
    }
    const ar = arMap[jStr(j, 'action_id')];
    if (ar !== null && typeof ar === 'object') {
      const out: Json = {};
      for (const [k, v] of Object.entries(asJson(ar))) out[k] = typeof v === 'string' ? clean(v, titleAr) : v;
      j['ar'] = out;
    }
    if (jStr(j, 'app_type') === 'Engine rule') rules.push(EngineRuleJ.fromJson(j));
    else actions.push(ActionJ.fromJson(j));
  }
  return { actions, rules };
}

export const findAction = (lib: SeedLibrary, id: string): Action | null => lib.actions.find((a) => a.actionId === id) ?? null;

/** Like findAction but throws if missing (seed integrity). */
export function requireAction(lib: SeedLibrary, id: string): Action {
  const a = findAction(lib, id);
  if (a == null) throw new Error(`Seed action ${id} missing`);
  return a;
}

/**
 * The library that ships with the app (lazy chunk), merged with her personal
 * library when she has imported one on this device (see `personalLibrary.ts`).
 */
export async function loadShippedLibrary(personal?: PersonalLibraryFile | null): Promise<SeedLibrary> {
  const [en, ar] = await Promise.all([import('../data/actions.json'), import('../data/actions_ar.json')]);
  const merged = mergeLibraries(
    en.default as unknown as Json[],
    ar.default as unknown as Record<string, Json>,
    personal === undefined ? readPersonalLibrary() : personal,
  );
  return parseSeedLibrary(merged.en, merged.ar);
}

/** Maps an action's `area` to a Life-Map domain (Evidence Library / "add to my plan"). */
export function domainForAction(a: Action): DomainId | null {
  const sleepAreas = new Set([
    'sleep duration', 'sleep regularity', 'caffeine timing', 'screens/light before bed', 'daytime/morning light',
    'bedtime procrastination', 'naps', 'sleep hygiene', 'sleep (Ramadan)',
  ]);
  switch (actionFamily(a)) {
    case 'BODY':
      if (sleepAreas.has(a.area)) return 'sleep';
      if (a.area === 'hydration') return 'food';
      return 'health';
    case 'FOOD':
      switch (a.area) {
        case 'skincare':
        case 'hair care':
        case 'dental':
          return 'care';
        case "women's health":
          return 'womensHealth';
        case 'preventive health':
          return 'health';
        default:
          return 'food';
      }
    case 'GROW':
      switch (a.area) {
        case 'IELTS': return 'ielts';
        case 'job search':
        case 'professional growth':
        case 'attention & deep work':
          return 'career';
        case 'digital wellbeing': return 'digital';
        default: return 'learning';
      }
    case 'LIFE':
      switch (a.area) {
        case 'personal finance': return 'money';
        case 'home & clutter': return 'home';
        case 'digital life admin': return 'digital';
        case 'driving': return 'driving';
        case 'aquarium': return 'aquarium';
        default: return 'admin';
      }
    case 'JOY':
      switch (a.area) {
        case 'social connection':
        case 'acts of kindness':
          return 'people';
        case 'spiritual practice (user-chosen)':
          return 'faith';
        default:
          return 'joy';
      }
    default:
      return null;
  }
}

export { actionTitle };
