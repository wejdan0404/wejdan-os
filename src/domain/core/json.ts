/** Small, forgiving JSON readers (port of `json_utils.dart`) so malformed/older data never crashes. */

export type Json = Record<string, unknown>;

export function asJson(v: unknown): Json {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {};
}

export function jStr(j: Json, k: string, fallback = ''): string {
  const v = j[k];
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return fallback;
  return String(v);
}

export function jStrN(j: Json, k: string): string | null {
  const v = j[k];
  return typeof v === 'string' ? v : null;
}

export function jInt(j: Json, k: string, fallback = 0): number {
  const v = j[k];
  if (typeof v === 'number' && Number.isFinite(v)) return Number.isInteger(v) ? v : Math.round(v);
  if (typeof v === 'string') {
    const n = /^-?\d+$/.test(v.trim()) ? parseInt(v, 10) : NaN;
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

export function jIntN(j: Json, k: string): number | null {
  const v = j[k];
  if (typeof v === 'number' && Number.isFinite(v)) return Number.isInteger(v) ? v : Math.round(v);
  return null;
}

export function jDouble(j: Json, k: string, fallback = 0): number {
  const v = j[k];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

export function jDoubleN(j: Json, k: string): number | null {
  const v = j[k];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function jBool(j: Json, k: string, fallback = false): boolean {
  const v = j[k];
  return typeof v === 'boolean' ? v : fallback;
}

/** ISO date-time string if it parses, else null (kept as the original string for lossless round-trips). */
export function jDate(j: Json, k: string): string | null {
  const v = j[k];
  if (typeof v !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(v)) return null;
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  return Number.isNaN(d.getTime()) ? null : v;
}

export function jStrList(j: Json, k: string): string[] {
  const v = j[k];
  return Array.isArray(v) ? v.filter((e): e is string => typeof e === 'string') : [];
}

export function jIntList(j: Json, k: string): number[] {
  const v = j[k];
  return Array.isArray(v)
    ? v.filter((e): e is number => typeof e === 'number' && Number.isFinite(e)).map((e) => Math.trunc(e))
    : [];
}

export function jMap(j: Json, k: string): Json {
  return asJson(j[k]);
}

export function jList<T>(j: Json, k: string, f: (j: Json) => T): T[] {
  const v = j[k];
  if (!Array.isArray(v)) return [];
  return v.filter((e) => e !== null && typeof e === 'object' && !Array.isArray(e)).map((e) => f(e as Json));
}

/** Parses [name] into one of [values], returning [fallback] when unknown. */
export function enumFrom<T extends string>(values: readonly T[], name: unknown, fallback: T): T {
  return typeof name === 'string' && (values as readonly string[]).includes(name) ? (name as T) : fallback;
}
