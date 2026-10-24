/**
 * Change log (web-only box `changelog`): an append-only record of important
 * edits and deletes so she can see what changed and bring an old version
 * back (`LifeStore.restoreChange`). Capped at [kMaxChangeLog] entries
 * (oldest dropped first). Included in the export.
 */
import { asJson, enumFrom, jStr, type Json } from '../core/json';

export const kMaxChangeLog = 300;

export const CHANGE_OPS = ['create', 'update', 'delete', 'restore'] as const;
export type ChangeOp = (typeof CHANGE_OPS)[number];

export const CHANGE_ENTITIES = [
  'task', 'inbox', 'habit', 'project', 'goal', 'product', 'note', 'routine', 'weeklyTask', 'joyItem', 'fixedEvent',
] as const;
export type ChangeEntity = (typeof CHANGE_ENTITIES)[number];

/** Arabic labels for the change-log screen. */
export const CHANGE_ENTITY_LABELS: Record<ChangeEntity, string> = {
  task: 'مهمة',
  inbox: 'الوارد',
  habit: 'عادة',
  project: 'مشروع',
  goal: 'هدف',
  product: 'منتج',
  note: 'ملاحظة',
  routine: 'روتين',
  weeklyTask: 'مهمة أسبوعية',
  joyItem: 'متعة',
  fixedEvent: 'موعد',
};
export const CHANGE_OP_LABELS: Record<ChangeOp, string> = {
  create: 'انضافت',
  update: 'تعدّلت',
  delete: 'انحذفت',
  restore: 'رجعت',
};

export interface ChangeEntry {
  id: string;
  at: string;
  op: ChangeOp;
  entity: ChangeEntity;
  entityId: string;
  /** Human label (title) at the time of the change. */
  label: string;
  /** Entity JSON before the change (null for a create). */
  before: Json | null;
  /** Entity JSON after the change (null for a delete). */
  after: Json | null;
}

const jsonOrNull = (v: unknown): Json | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? asJson(v) : null);

export const ChangeEntryJ = {
  fromJson: (j: Json): ChangeEntry => ({
    id: jStr(j, 'id'),
    at: jStr(j, 'at'),
    op: enumFrom(CHANGE_OPS, j['op'], 'update'),
    entity: enumFrom(CHANGE_ENTITIES, j['entity'], 'note'),
    entityId: jStr(j, 'entityId'),
    label: jStr(j, 'label'),
    before: jsonOrNull(j['before']),
    after: jsonOrNull(j['after']),
  }),
  toJson: (e: ChangeEntry): Json => ({
    id: e.id,
    at: e.at,
    op: e.op,
    entity: e.entity,
    entityId: e.entityId,
    label: e.label,
    before: e.before == null ? null : (JSON.parse(JSON.stringify(e.before)) as Json),
    after: e.after == null ? null : (JSON.parse(JSON.stringify(e.after)) as Json),
  }),
};

/** Newest first (ids are time-ordered; `at` breaks ties). */
export const sortChanges = (l: readonly ChangeEntry[]): ChangeEntry[] =>
  [...l].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.id < b.id ? 1 : a.id > b.id ? -1 : 0));

/** Bookkeeping fields that do not make an edit meaningful on their own. */
const IGNORED_KEYS = new Set(['updatedAt']);

/** True when the two JSON values are equal (stable stringify), ignoring `updatedAt`. */
export function sameJson(a: Json | null, b: Json | null): boolean {
  const strip = (v: Json | null): Json | null =>
    v == null ? null : (Object.fromEntries(Object.entries(v).filter(([k]) => !IGNORED_KEYS.has(k))) as Json);
  return stableStringify(strip(a)) === stableStringify(strip(b));
}
function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(',')}}`;
}
