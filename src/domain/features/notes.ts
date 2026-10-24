/**
 * Notes & decisions (web-only box `notes`).
 *
 * A note is free text she keeps; a decision is a note flagged `isDecision`
 * (what she decided and why). Notes can link to projects, goals, habits and
 * tasks. `tag` records what an imported line was classified as (routine,
 * goal, appointment, …) without turning it into a structured entity whose
 * dates or recurrence we would have to guess.
 */
import { asJson, enumFrom, jBool, jList, jStr, type Json } from '../core/json';

export const NOTE_LINK_KINDS = ['project', 'goal', 'habit', 'task'] as const;
export type NoteLinkKind = (typeof NOTE_LINK_KINDS)[number];

export interface NoteLink {
  kind: NoteLinkKind;
  id: string;
}

export const NOTE_TAGS = ['note', 'preference', 'reference', 'routine', 'goal', 'appointment'] as const;
export type NoteTag = (typeof NOTE_TAGS)[number];

/** Arabic labels for note tags (UI copy, Saudi-friendly). */
export const NOTE_TAG_LABELS: Record<NoteTag, string> = {
  note: 'ملاحظة',
  preference: 'تفضيل',
  reference: 'مرجع',
  routine: 'روتين',
  goal: 'هدف',
  appointment: 'موعد',
};

export interface Note {
  id: string;
  title: string;
  body: string;
  links: NoteLink[];
  isDecision: boolean;
  pinned: boolean;
  tag: NoteTag;
  createdAt: string;
  updatedAt: string;
}

export const makeNote = (p: Pick<Note, 'id' | 'createdAt'> & Partial<Note>): Note => ({
  title: '',
  body: '',
  links: [],
  isDecision: false,
  pinned: false,
  tag: 'note',
  updatedAt: p.createdAt,
  ...p,
});

const NoteLinkJ = {
  fromJson: (j: Json): NoteLink => ({ kind: enumFrom(NOTE_LINK_KINDS, j['kind'], 'project'), id: jStr(j, 'id') }),
  toJson: (l: NoteLink): Json => ({ kind: l.kind, id: l.id }),
};

export const NoteJ = {
  fromJson: (j: Json): Note => ({
    id: jStr(j, 'id'),
    title: jStr(j, 'title'),
    body: jStr(j, 'body'),
    links: jList(j, 'links', NoteLinkJ.fromJson).filter((l) => l.id !== ''),
    isDecision: jBool(j, 'isDecision'),
    pinned: jBool(j, 'pinned'),
    tag: enumFrom(NOTE_TAGS, j['tag'], 'note'),
    createdAt: jStr(j, 'createdAt'),
    updatedAt: jStr(j, 'updatedAt', jStr(j, 'createdAt')),
  }),
  toJson: (n: Note): Json => ({
    id: n.id,
    title: n.title,
    body: n.body,
    links: n.links.map(NoteLinkJ.toJson),
    isDecision: n.isDecision,
    pinned: n.pinned,
    tag: n.tag,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }),
};

/** Display title: the title, else the first line of the body (trimmed). */
export const noteDisplayTitle = (n: Pick<Note, 'title' | 'body'>): string =>
  n.title.trim() !== '' ? n.title.trim() : (n.body.trim().split('\n')[0] ?? '').slice(0, 80);

/** Pinned first, then most recently updated. */
export function sortNotes(notes: readonly Note[]): Note[] {
  return [...notes].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0),
  );
}

export const noteLinksTo = (n: Note, kind: NoteLinkKind, id: string): boolean => n.links.some((l) => l.kind === kind && l.id === id);

/** Normalises a links list (drops empties, de-duplicates). */
export function cleanLinks(links: readonly NoteLink[]): NoteLink[] {
  const seen = new Set<string>();
  const out: NoteLink[] = [];
  for (const raw of links) {
    const l = NoteLinkJ.fromJson(asJson(raw as unknown));
    const k = `${l.kind}:${l.id}`;
    if (l.id === '' || seen.has(k)) continue;
    seen.add(k);
    out.push(l);
  }
  return out;
}
