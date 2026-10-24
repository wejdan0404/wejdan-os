/**
 * Personal action library — kept ONLY on her device, never in the public build.
 *
 * The bundled library (`data/actions*.json`) is neutral: no personal priorities,
 * schedules, places, career targets or women's-health actions. Her full,
 * personalised library lives in a private file she imports once
 * (`{ kind: 'wejdan-action-library', version: 1, actions: [...], actions_ar: {...} }`).
 * It is stored in a small local key-value store and merged over the shipped
 * library at load time (same `action_id` → personal entry wins; extra ids are added).
 *
 * Storage hook for the store (F1): after `savePersonalLibrary(json)` or
 * `clearPersonalLibrary()`, call `repo.refreshLibrary(await loadShippedLibrary())`
 * so the local DB copy is rebuilt from the merged library.
 */
import { asJson } from '../core/json';
import type { Json } from '../models';

export const kPersonalLibraryKind = 'wejdan-action-library';
export const kPersonalLibraryStorageKey = 'wejdan.personalActionLibrary.v1';

export interface PersonalLibraryFile {
  kind: typeof kPersonalLibraryKind;
  version: number;
  actions: Json[];
  actions_ar: Record<string, Json>;
}

/** Minimal key-value interface (localStorage-compatible) so tests can inject one. */
export interface KeyValueStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function defaultKv(): KeyValueStore | null {
  try {
    const ls = (globalThis as { localStorage?: KeyValueStore }).localStorage;
    return ls ?? null;
  } catch {
    return null;
  }
}

export class PersonalLibraryError extends Error {}

/** Validates an imported file; throws [PersonalLibraryError] with an Arabic message. */
export function parsePersonalLibrary(raw: unknown): PersonalLibraryFile {
  let j: Json;
  try {
    j = asJson(typeof raw === 'string' ? JSON.parse(raw) : raw);
  } catch {
    throw new PersonalLibraryError('الملف مو JSON صالح.');
  }
  if (j['kind'] !== kPersonalLibraryKind) throw new PersonalLibraryError('هذا مو ملف مكتبتك الشخصية.');
  const actions = j['actions'];
  if (!Array.isArray(actions) || actions.length === 0) throw new PersonalLibraryError('الملف فاضي — ما فيه شي نضيفه.');
  for (const a of actions) {
    const id = a !== null && typeof a === 'object' ? (a as Json)['action_id'] : null;
    if (typeof id !== 'string' || id === '') throw new PersonalLibraryError('فيه عنصر ناقص بالملف.');
  }
  const ar = j['actions_ar'];
  return {
    kind: kPersonalLibraryKind,
    version: typeof j['version'] === 'number' ? (j['version'] as number) : 1,
    actions: actions as Json[],
    actions_ar: ar !== null && typeof ar === 'object' && !Array.isArray(ar) ? (ar as Record<string, Json>) : {},
  };
}

export function readPersonalLibrary(kv: KeyValueStore | null = defaultKv()): PersonalLibraryFile | null {
  if (kv == null) return null;
  try {
    const s = kv.getItem(kPersonalLibraryStorageKey);
    return s == null ? null : parsePersonalLibrary(s);
  } catch {
    return null;
  }
}

/** Validates and stores her personal library locally. Returns the number of actions. */
export function savePersonalLibrary(raw: unknown, kv: KeyValueStore | null = defaultKv()): number {
  const file = parsePersonalLibrary(raw);
  if (kv == null) throw new PersonalLibraryError('الحفظ مو متاح بهالمتصفح.');
  kv.setItem(kPersonalLibraryStorageKey, JSON.stringify(file));
  return file.actions.length;
}

export function clearPersonalLibrary(kv: KeyValueStore | null = defaultKv()): void {
  kv?.removeItem(kPersonalLibraryStorageKey);
}

export const hasPersonalLibrary = (kv: KeyValueStore | null = defaultKv()): boolean => readPersonalLibrary(kv) != null;

/** Merges the personal library over the shipped raw arrays (personal wins per id). */
export function mergeLibraries(
  shippedEn: Json[],
  shippedAr: Record<string, Json>,
  personal: PersonalLibraryFile | null,
): { en: Json[]; ar: Record<string, Json> } {
  if (personal == null) return { en: shippedEn, ar: shippedAr };
  const byId = new Map<string, Json>();
  for (const a of shippedEn) byId.set(a['action_id'] as string, a);
  for (const a of personal.actions) byId.set(a['action_id'] as string, a);
  return { en: [...byId.values()], ar: { ...shippedAr, ...personal.actions_ar } };
}
