/**
 * Sources & import review (web-only boxes `sources`, `importBatches`, `provenance`).
 *
 * Pipeline: a file she picks → `parseImportFile` (JSON / CSV / Markdown / plain
 * text) → candidate items, each with a `sourceRef {file, location}` →
 * `evaluateCandidates` against her existing data (duplicates, conflicts,
 * missing fields) → she approves / edits / ignores each one → `commit` (in
 * LifeStore) adds ONLY approved items, each linked back to its source through a
 * `Provenance` record.
 *
 * Hard rules (owner spec §2 + §11):
 * - nothing is ever added to a day plan, and nothing is auto-approved;
 * - dates/times are taken only when the file states them explicitly in ISO
 *   form in a structured field (JSON/CSV); free text is never mined for dates
 *   or recurrence (Markdown/text items are always `suggested`);
 * - duplicates and conflicts are recorded with both sides — never resolved silently;
 * - an unreadable file gives a clear Arabic reason naming the file.
 */
import { asJson, enumFrom, jBool, jList, jStr, jStrList, jStrN, type Json } from '../core/json';
import { DOMAIN_IDS, type DomainId } from '../models';
import { normalizeArabic } from './arabic';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export const SOURCE_KINDS = ['json', 'csv', 'md', 'txt', 'unknown'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_STATUSES = ['review', 'committed', 'discarded', 'failed'] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export const SOURCE_STATUS_LABELS: Record<SourceStatus, string> = {
  review: 'تحتاج مراجعة',
  committed: 'انضافت',
  discarded: 'تجاهلتيها',
  failed: 'ما انقرت',
};

/** One file she imported (kept even after commit, so every item can point back to it). */
export interface Source {
  id: string;
  fileName: string;
  kind: SourceKind;
  importedAt: string;
  /** Candidate items found in the file. */
  itemCount: number;
  /** Items actually added (after her review). */
  addedCount: number;
  status: SourceStatus;
  /** Arabic reason when `failed`. */
  error: string | null;
}

export const CANDIDATE_TYPES = [
  'task', 'routine', 'project', 'goal', 'appointment', 'note', 'idea', 'preference', 'reference',
] as const;
export type CandidateType = (typeof CANDIDATE_TYPES)[number];

/** Owner's classification vocabulary. */
export const CANDIDATE_TYPE_LABELS: Record<CandidateType, string> = {
  task: 'مهمة',
  routine: 'روتين',
  project: 'مشروع',
  goal: 'هدف',
  appointment: 'موعد',
  note: 'ملاحظة',
  idea: 'فكرة',
  preference: 'تفضيل',
  reference: 'مرجع',
};

export const CANDIDATE_STATUSES = ['confirmed', 'suggested', 'missing', 'conflict'] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];
export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  confirmed: 'مؤكدة',
  suggested: 'اقتراح',
  missing: 'ناقصة',
  conflict: 'متعارضة',
};

export const CANDIDATE_DECISIONS = ['pending', 'approved', 'ignored'] as const;
export type CandidateDecision = (typeof CANDIDATE_DECISIONS)[number];

export interface SourceRef {
  file: string;
  /** Human location inside the file, e.g. «سطر 12» or «tasks › عنصر 3». */
  location: string;
}

export const MATCH_ENTITIES = ['task', 'project', 'goal', 'habit', 'note', 'inbox', 'product', 'candidate'] as const;
export type MatchEntity = (typeof MATCH_ENTITIES)[number];

export interface CandidateMatch {
  entity: MatchEntity;
  id: string;
  title: string;
  relation: 'duplicate' | 'conflict';
  /** Arabic detail (e.g. the two differing dates). */
  detail: string;
}

export interface ImportCandidate {
  id: string;
  type: CandidateType;
  /** True when the file said what it is (structured field / JSON key); false = our guess. */
  typeExplicit: boolean;
  title: string;
  body: string;
  url: string | null;
  /** ISO day key, only when stated explicitly in a structured field. */
  date: string | null;
  /** HH:MM, only when stated explicitly in a structured field. */
  time: string | null;
  /** Domain, only when stated explicitly and valid. */
  domain: DomainId | null;
  /** A date-ish value we could not read as ISO (kept verbatim, never guessed). */
  rawDate: string | null;
  sourceRef: SourceRef;
  status: CandidateStatus;
  decision: CandidateDecision;
  /** She edited it during review. */
  edited: boolean;
  /** Field names that are missing/unreadable (title, type, date, time). */
  missing: string[];
  matches: CandidateMatch[];
}

export interface ImportBatch {
  id: string;
  sourceId: string;
  fileName: string;
  createdAt: string;
  candidates: ImportCandidate[];
  committedAt: string | null;
  /** What the commit created (for undo / provenance). */
  created: { entity: ProvenanceEntity; id: string }[];
}

export const PROVENANCE_ENTITIES = ['task', 'project', 'note', 'inbox'] as const;
export type ProvenanceEntity = (typeof PROVENANCE_ENTITIES)[number];

/** Links an item in the app back to the file line it came from. id = `${entity}:${entityId}`. */
export interface Provenance {
  id: string;
  entity: ProvenanceEntity;
  entityId: string;
  sourceId: string;
  batchId: string;
  candidateId: string;
  sourceRef: SourceRef;
  importedAt: string;
  originalType: CandidateType;
  originalDate: string | null;
  originalTime: string | null;
}

export const provenanceId = (entity: ProvenanceEntity, entityId: string): string => `${entity}:${entityId}`;

// ---------------------------------------------------------------------------
// Codecs
// ---------------------------------------------------------------------------

const SourceRefJ = {
  fromJson: (j: Json): SourceRef => ({ file: jStr(j, 'file'), location: jStr(j, 'location') }),
  toJson: (r: SourceRef): Json => ({ file: r.file, location: r.location }),
};

export const SourceJ = {
  fromJson: (j: Json): Source => ({
    id: jStr(j, 'id'),
    fileName: jStr(j, 'fileName'),
    kind: enumFrom(SOURCE_KINDS, j['kind'], 'unknown'),
    importedAt: jStr(j, 'importedAt'),
    itemCount: typeof j['itemCount'] === 'number' ? (j['itemCount'] as number) : 0,
    addedCount: typeof j['addedCount'] === 'number' ? (j['addedCount'] as number) : 0,
    status: enumFrom(SOURCE_STATUSES, j['status'], 'review'),
    error: jStrN(j, 'error'),
  }),
  toJson: (s: Source): Json => ({
    id: s.id, fileName: s.fileName, kind: s.kind, importedAt: s.importedAt, itemCount: s.itemCount,
    addedCount: s.addedCount, status: s.status, error: s.error,
  }),
};

const MatchJ = {
  fromJson: (j: Json): CandidateMatch => ({
    entity: enumFrom(MATCH_ENTITIES, j['entity'], 'candidate'),
    id: jStr(j, 'id'),
    title: jStr(j, 'title'),
    relation: j['relation'] === 'conflict' ? 'conflict' : 'duplicate',
    detail: jStr(j, 'detail'),
  }),
  toJson: (m: CandidateMatch): Json => ({ entity: m.entity, id: m.id, title: m.title, relation: m.relation, detail: m.detail }),
};

export const ImportCandidateJ = {
  fromJson: (j: Json): ImportCandidate => ({
    id: jStr(j, 'id'),
    type: enumFrom(CANDIDATE_TYPES, j['type'], 'note'),
    typeExplicit: jBool(j, 'typeExplicit'),
    title: jStr(j, 'title'),
    body: jStr(j, 'body'),
    url: jStrN(j, 'url'),
    date: jStrN(j, 'date'),
    time: jStrN(j, 'time'),
    domain: j['domain'] == null ? null : enumFrom(DOMAIN_IDS, j['domain'], 'learning'),
    rawDate: jStrN(j, 'rawDate'),
    sourceRef: SourceRefJ.fromJson(asJson(j['sourceRef'])),
    status: enumFrom(CANDIDATE_STATUSES, j['status'], 'suggested'),
    decision: enumFrom(CANDIDATE_DECISIONS, j['decision'], 'pending'),
    edited: jBool(j, 'edited'),
    missing: jStrList(j, 'missing'),
    matches: jList(j, 'matches', MatchJ.fromJson),
  }),
  toJson: (c: ImportCandidate): Json => ({
    id: c.id, type: c.type, typeExplicit: c.typeExplicit, title: c.title, body: c.body, url: c.url, date: c.date,
    time: c.time, domain: c.domain, rawDate: c.rawDate, sourceRef: SourceRefJ.toJson(c.sourceRef), status: c.status,
    decision: c.decision, edited: c.edited, missing: [...c.missing], matches: c.matches.map(MatchJ.toJson),
  }),
};

export const ImportBatchJ = {
  fromJson: (j: Json): ImportBatch => ({
    id: jStr(j, 'id'),
    sourceId: jStr(j, 'sourceId'),
    fileName: jStr(j, 'fileName'),
    createdAt: jStr(j, 'createdAt'),
    candidates: jList(j, 'candidates', ImportCandidateJ.fromJson),
    committedAt: jStrN(j, 'committedAt'),
    created: jList(j, 'created', (c) => ({ entity: enumFrom(PROVENANCE_ENTITIES, c['entity'], 'note'), id: jStr(c, 'id') })),
  }),
  toJson: (b: ImportBatch): Json => ({
    id: b.id, sourceId: b.sourceId, fileName: b.fileName, createdAt: b.createdAt,
    candidates: b.candidates.map(ImportCandidateJ.toJson), committedAt: b.committedAt,
    created: b.created.map((c) => ({ entity: c.entity, id: c.id })),
  }),
};

export const ProvenanceJ = {
  fromJson: (j: Json): Provenance => ({
    id: jStr(j, 'id'),
    entity: enumFrom(PROVENANCE_ENTITIES, j['entity'], 'note'),
    entityId: jStr(j, 'entityId'),
    sourceId: jStr(j, 'sourceId'),
    batchId: jStr(j, 'batchId'),
    candidateId: jStr(j, 'candidateId'),
    sourceRef: SourceRefJ.fromJson(asJson(j['sourceRef'])),
    importedAt: jStr(j, 'importedAt'),
    originalType: enumFrom(CANDIDATE_TYPES, j['originalType'], 'note'),
    originalDate: jStrN(j, 'originalDate'),
    originalTime: jStrN(j, 'originalTime'),
  }),
  toJson: (p: Provenance): Json => ({
    id: p.id, entity: p.entity, entityId: p.entityId, sourceId: p.sourceId, batchId: p.batchId, candidateId: p.candidateId,
    sourceRef: SourceRefJ.toJson(p.sourceRef), importedAt: p.importedAt, originalType: p.originalType,
    originalDate: p.originalDate, originalTime: p.originalTime,
  }),
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export type ImportFileErrorReason = 'empty' | 'binary' | 'unsupported' | 'invalid_json' | 'no_header' | 'no_items' | 'app_backup';

/** A file we cannot read — `message` is Arabic, names the file and says why. */
export class ImportFileError extends Error {
  constructor(
    readonly fileName: string,
    readonly reason: ImportFileErrorReason,
    message: string,
  ) {
    super(message);
    this.name = 'ImportFileError';
  }
}

/** A parsed item before review (no id/status/decision yet). */
export type RawCandidate = Omit<ImportCandidate, 'id' | 'status' | 'decision' | 'edited' | 'matches' | 'missing'> & {
  missing: string[];
};

export interface ParsedImportFile {
  kind: SourceKind;
  candidates: RawCandidate[];
}

const UNSUPPORTED_EXT = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'key', 'pages', 'numbers', 'png', 'jpg', 'jpeg', 'gif', 'webp',
  'heic', 'zip', 'rar', '7z', 'mp3', 'mp4', 'mov',
]);

export function sourceKindOf(fileName: string): SourceKind {
  const ext = (fileName.split('.').pop() ?? '').toLowerCase();
  if (ext === 'json') return 'json';
  if (ext === 'csv' || ext === 'tsv') return 'csv';
  if (ext === 'md' || ext === 'markdown') return 'md';
  if (ext === 'txt' || ext === 'text') return 'txt';
  return 'unknown';
}

/** Type names she might use (Arabic or English, singular or plural) → candidate type. */
const TYPE_WORDS: [CandidateType, string[]][] = [
  ['task', ['task', 'tasks', 'todo', 'todos', 'to do', 'مهمه', 'مهام', 'مهمات', 'تودو']],
  ['routine', ['routine', 'routines', 'habit', 'habits', 'روتين', 'روتينات', 'عاده', 'عادات']],
  ['project', ['project', 'projects', 'مشروع', 'مشاريع']],
  ['goal', ['goal', 'goals', 'هدف', 'اهداف']],
  ['appointment', ['appointment', 'appointments', 'event', 'events', 'meeting', 'meetings', 'موعد', 'مواعيد', 'اجتماع', 'اجتماعات']],
  ['note', ['note', 'notes', 'ملاحظه', 'ملاحظات', 'مذكره', 'مذكرات']],
  ['idea', ['idea', 'ideas', 'فكره', 'افكار']],
  ['preference', ['preference', 'preferences', 'تفضيل', 'تفضيلات', 'يعجبني', 'احب']],
  ['reference', ['reference', 'references', 'link', 'links', 'resource', 'resources', 'مرجع', 'مراجع', 'رابط', 'روابط', 'مصدر', 'مصادر']],
];
const TYPE_INDEX = new Map<string, CandidateType>();
for (const [t, words] of TYPE_WORDS) for (const w of words) TYPE_INDEX.set(normalizeArabic(w), t);

/** Exact type word (normalised) → type, or null. */
export function typeFromWord(word: string): CandidateType | null {
  return TYPE_INDEX.get(normalizeArabic(word)) ?? null;
}
/** A heading that CONTAINS a type word (e.g. «مهام الأسبوع») → type, or null. */
function typeFromHeading(heading: string): CandidateType | null {
  const tokens = normalizeArabic(heading).split(' ');
  for (const t of tokens) {
    const hit = TYPE_INDEX.get(t) ?? TYPE_INDEX.get(t.startsWith('ال') ? t.slice(2) : t);
    if (hit) return hit;
  }
  return null;
}

const FIELD_ALIASES: Record<'title' | 'body' | 'type' | 'date' | 'time' | 'url' | 'domain', string[]> = {
  title: ['title', 'name', 'item', 'text', 'عنوان', 'العنوان', 'الاسم', 'اسم', 'نص', 'البند'],
  body: ['body', 'notes', 'note', 'description', 'details', 'ملاحظات', 'ملاحظه', 'وصف', 'الوصف', 'تفاصيل', 'التفاصيل'],
  type: ['type', 'kind', 'category', 'نوع', 'النوع', 'التصنيف', 'تصنيف'],
  date: ['date', 'due', 'duedate', 'due date', 'deadline', 'تاريخ', 'التاريخ', 'الموعد', 'موعد التسليم'],
  time: ['time', 'وقت', 'الوقت', 'الساعه'],
  url: ['url', 'link', 'href', 'رابط', 'الرابط'],
  domain: ['domain', 'area', 'المجال', 'مجال'],
};
const FIELD_INDEX = new Map<string, keyof typeof FIELD_ALIASES>();
for (const [f, names] of Object.entries(FIELD_ALIASES) as [keyof typeof FIELD_ALIASES, string[]][]) {
  for (const n of names) FIELD_INDEX.set(normalizeArabic(n), f);
}
const fieldOf = (key: string): keyof typeof FIELD_ALIASES | null => FIELD_INDEX.get(normalizeArabic(key)) ?? null;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^([01]?\d|2[0-3]):[0-5]\d$/;
const URL_RE = /https?:\/\/[^\s<>"')]+/i;
const MAX_TITLE = 140;

function validIsoDay(v: string): boolean {
  if (!ISO_DAY.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function splitTitle(text: string): { title: string; body: string } {
  const t = text.trim();
  if (t.length <= MAX_TITLE) return { title: t, body: '' };
  const cut = t.lastIndexOf(' ', MAX_TITLE);
  const at = cut > 40 ? cut : MAX_TITLE;
  return { title: `${t.slice(0, at).trim()}…`, body: t };
}

/** Builds a candidate from structured fields (JSON object / CSV row). */
function fromFields(
  fields: Partial<Record<keyof typeof FIELD_ALIASES, string>>,
  ref: SourceRef,
  typeFromContainer: CandidateType | null,
): RawCandidate {
  const missing: string[] = [];
  const rawType = (fields.type ?? '').trim();
  let type: CandidateType = typeFromContainer ?? 'note';
  let typeExplicit = typeFromContainer != null;
  if (rawType !== '') {
    const t = typeFromWord(rawType);
    if (t) {
      type = t;
      typeExplicit = true;
    } else {
      missing.push('type');
    }
  }
  const { title, body: overflow } = splitTitle(fields.title ?? '');
  if (title === '') missing.push('title');
  const bodyParts = [overflow, (fields.body ?? '').trim()].filter((x) => x !== '');
  if (rawType !== '' && missing.includes('type')) bodyParts.push(`النوع في الملف: ${rawType}`);
  let date: string | null = null;
  let rawDate: string | null = null;
  const d = (fields.date ?? '').trim();
  if (d !== '') {
    const day = d.length >= 10 ? d.slice(0, 10) : d;
    if (validIsoDay(day) && (d.length === 10 || /^\d{4}-\d{2}-\d{2}[T ]/.test(d))) date = day;
    else {
      rawDate = d;
      missing.push('date');
    }
  }
  let time: string | null = null;
  const tm = (fields.time ?? '').trim();
  if (tm !== '') {
    if (HH_MM.test(tm)) time = tm.padStart(5, '0');
    else {
      missing.push('time');
      bodyParts.push(`الوقت في الملف: ${tm}`);
    }
  }
  const urlField = (fields.url ?? '').trim();
  const url = urlField !== '' ? urlField : (URL_RE.exec(fields.title ?? '')?.[0] ?? null);
  const domRaw = (fields.domain ?? '').trim();
  const domain = (DOMAIN_IDS as readonly string[]).includes(domRaw) ? (domRaw as DomainId) : null;
  if (domRaw !== '' && domain == null) bodyParts.push(`المجال في الملف: ${domRaw}`);
  return { type, typeExplicit, title, body: bodyParts.join('\n'), url, date, time, domain, rawDate, sourceRef: ref, missing };
}

function looksBinary(text: string): boolean {
  if (text.includes('\u0000')) return true;
  const bad = (text.match(/�/g) ?? []).length;
  return text.length > 0 && bad / text.length > 0.05;
}

function parseJsonFile(fileName: string, text: string): RawCandidate[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportFileError(fileName, 'invalid_json', `«${fileName}» ما قدرنا نقراه: محتواه مو JSON سليم.`);
  }
  const root = asJson(data);
  if (typeof root['schemaVersion'] === 'number' && root['boxes'] != null) {
    throw new ImportFileError(
      fileName,
      'app_backup',
      `«${fileName}» نسخة احتياطية من التطبيق نفسه — استعيديها من الإعدادات ← البيانات، مو من هنا.`,
    );
  }
  const out: RawCandidate[] = [];
  const pushItem = (item: unknown, location: string, containerType: CandidateType | null): void => {
    const ref = { file: fileName, location };
    if (typeof item === 'string') {
      if (item.trim() === '') return;
      out.push(fromFields({ title: item }, ref, containerType));
      return;
    }
    if (item === null || typeof item !== 'object' || Array.isArray(item)) return;
    const fields: Partial<Record<keyof typeof FIELD_ALIASES, string>> = {};
    for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
      const f = fieldOf(k);
      if (f == null || fields[f] != null) continue;
      if (typeof v === 'string') fields[f] = v;
      else if (typeof v === 'number' || typeof v === 'boolean') fields[f] = String(v);
    }
    out.push(fromFields(fields, ref, containerType));
  };
  const walkList = (list: unknown[], label: string, containerType: CandidateType | null): void => {
    list.forEach((it, i) => pushItem(it, label === '' ? `عنصر ${i + 1}` : `${label} › عنصر ${i + 1}`, containerType));
  };
  if (Array.isArray(data)) walkList(data, '', null);
  else {
    let handled = false;
    for (const [k, v] of Object.entries(root)) {
      if (!Array.isArray(v)) continue;
      handled = true;
      const fromKey = typeFromWord(k);
      walkList(v, k, fromKey);
    }
    if (!handled && Object.keys(root).length > 0) pushItem(root, 'الملف كامل', null);
  }
  return out;
}

/** RFC 4180-ish CSV reader (quotes, escaped quotes, CRLF), delimiter auto-detected. */
export function readCsv(text: string): { rows: string[][]; lineOf: number[] } {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delim = [',', ';', '\t'].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = [];
  const lineOf: number[] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let line = 1;
  let rowStart = 1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else {
        if (ch === '\n') line++;
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && cell === '') inQuotes = true;
    else if (ch === delim) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      lineOf.push(rowStart);
      row = [];
      cell = '';
      line++;
      rowStart = line;
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
    lineOf.push(rowStart);
  }
  return { rows, lineOf };
}

function parseCsvFile(fileName: string, text: string): RawCandidate[] {
  const { rows, lineOf } = readCsv(text);
  const nonEmpty = rows.map((r, i) => ({ r, line: lineOf[i] })).filter(({ r }) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length === 0) throw new ImportFileError(fileName, 'empty', `«${fileName}» فاضي.`);
  const header = nonEmpty[0].r.map((h) => fieldOf(h.trim()));
  if (!header.includes('title')) {
    throw new ImportFileError(
      fileName,
      'no_header',
      `«${fileName}»: أول سطر لازم يكون أسماء الأعمدة، وفيه عمود للعنوان (مثل «عنوان» أو title).`,
    );
  }
  const out: RawCandidate[] = [];
  for (const { r, line } of nonEmpty.slice(1)) {
    const fields: Partial<Record<keyof typeof FIELD_ALIASES, string>> = {};
    header.forEach((f, i) => {
      if (f != null && fields[f] == null && r[i] != null) fields[f] = r[i];
    });
    out.push(fromFields(fields, { file: fileName, location: `سطر ${line}` }, null));
  }
  return out;
}

const LIST_ITEM = /^\s*(?:[-*•+–]|\d{1,3}[.)\-])\s+(.*)$/;
const CHECKBOX = /^\[( |x|X)\]\s*(.*)$/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const SEPARATOR = /^\s*([-*_=])\1{2,}\s*$/;

/** Markdown / plain text: one candidate per list item or line; headings give context. Always `suggested`. */
function parseTextFile(fileName: string, text: string): RawCandidate[] {
  const out: RawCandidate[] = [];
  const headings: string[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((rawLine, i) => {
    const lineNo = i + 1;
    const line = rawLine.replace(/\t/g, ' ');
    if (line.trim() === '' || SEPARATOR.test(line)) return;
    const h = HEADING.exec(line);
    if (h) {
      const level = h[1].length;
      headings.length = level - 1;
      headings[level - 1] = h[2].trim();
      return;
    }
    let content = line.trim();
    let isCheckbox = false;
    let checked = false;
    const li = LIST_ITEM.exec(line);
    if (li) content = li[1].trim();
    const cb = CHECKBOX.exec(content);
    if (cb) {
      isCheckbox = true;
      checked = cb[1].toLowerCase() === 'x';
      content = cb[2].trim();
    }
    if (content === '') return;
    const context = headings.filter(Boolean);
    let type: CandidateType = 'note';
    if (isCheckbox) type = 'task';
    else {
      const fromHeading = [...context].reverse().map(typeFromHeading).find((t) => t != null) ?? null;
      if (fromHeading) type = fromHeading;
      else if (URL_RE.test(content)) type = 'reference';
    }
    const { title, body: overflow } = splitTitle(content);
    const bodyParts = [overflow];
    if (checked) bodyParts.push('معلّمة كمنتهية في الملف');
    const location = context.length > 0 ? `${context.join(' › ')} · سطر ${lineNo}` : `سطر ${lineNo}`;
    out.push({
      type,
      typeExplicit: false,
      title,
      body: bodyParts.filter((x) => x !== '').join('\n'),
      url: URL_RE.exec(content)?.[0] ?? null,
      date: null,
      time: null,
      domain: null,
      rawDate: null,
      sourceRef: { file: fileName, location },
      missing: [],
    });
  });
  return out;
}

/**
 * Reads one file into candidate items. Throws `ImportFileError` (Arabic message
 * naming the file) for empty, binary, unsupported or malformed files.
 */
export function parseImportFile(fileName: string, text: string): ParsedImportFile {
  const ext = (fileName.split('.').pop() ?? '').toLowerCase();
  if (UNSUPPORTED_EXT.has(ext)) {
    throw new ImportFileError(
      fileName,
      'unsupported',
      `«${fileName}» نوعه (${ext}) ما نقدر نقراه هنا. احفظيه كنص (txt أو md) أو جدول CSV وجربي مرة ثانية.`,
    );
  }
  const clean = text.replace(/^﻿/, '');
  if (looksBinary(clean)) {
    throw new ImportFileError(fileName, 'binary', `«${fileName}» ما يبان كنص — يمكن ملف صورة أو مستند مضغوط.`);
  }
  if (clean.trim() === '') throw new ImportFileError(fileName, 'empty', `«${fileName}» فاضي.`);
  let kind = sourceKindOf(fileName);
  if (kind === 'unknown') {
    const t = clean.trim();
    kind = t.startsWith('{') || t.startsWith('[') ? 'json' : 'txt';
  }
  const candidates =
    kind === 'json' ? parseJsonFile(fileName, clean) : kind === 'csv' ? parseCsvFile(fileName, clean) : parseTextFile(fileName, clean);
  if (candidates.length === 0) {
    throw new ImportFileError(fileName, 'no_items', `«${fileName}» ما لقينا فيه بنود نقدر نضيفها.`);
  }
  return { kind, candidates };
}

// ---------------------------------------------------------------------------
// Review: duplicates, conflicts, missing
// ---------------------------------------------------------------------------

export interface ExistingEntry {
  entity: Exclude<MatchEntity, 'candidate'>;
  id: string;
  title: string;
  /** Normalised title. */
  norm: string;
  /** Its own date (task dueDate), if any. */
  date: string | null;
}

/** Minimal view of her data needed for duplicate detection (a LifeSnapshot satisfies it). */
export interface ExistingData {
  tasks: readonly { id: string; title: string; dueDate: string | null }[];
  projects: readonly { id: string; titleAr: string }[];
  goals: readonly { id: string; titleAr: string }[];
  habits: readonly { id: string; titleAr: string }[];
  inbox: readonly { id: string; title: string }[];
  products: readonly { id: string; name: string }[];
  notes?: readonly { id: string; title: string; body: string }[];
}

export function buildExistingIndex(d: ExistingData): ExistingEntry[] {
  const e = (entity: ExistingEntry['entity'], id: string, title: string, date: string | null = null): ExistingEntry => ({
    entity, id, title, norm: normalizeArabic(title), date,
  });
  const out: ExistingEntry[] = [
    ...d.tasks.map((t) => e('task', t.id, t.title, t.dueDate)),
    ...d.projects.map((p) => e('project', p.id, p.titleAr)),
    ...d.goals.map((g) => e('goal', g.id, g.titleAr)),
    ...d.habits.map((h) => e('habit', h.id, h.titleAr)),
    ...d.inbox.map((i) => e('inbox', i.id, i.title)),
    ...d.products.map((p) => e('product', p.id, p.name)),
    ...(d.notes ?? []).map((n) => e('note', n.id, n.title.trim() !== '' ? n.title : (n.body.split('\n')[0] ?? ''))),
  ];
  return out.filter((x) => x.norm !== '');
}

const AR_DAY = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' });
/** «2026-11-20» → «20 نوفمبر 2026» (anything else is returned as it is). */
export function arDayLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? AR_DAY.format(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : iso;
}
const dateDetail = (here: string, there: string): string => `بالملف ${arDayLabel(here)}، وعندك ${arDayLabel(there)}`;
const twoDates = (a: string | null, b: string | null): string => `نفس البند بتاريخين: ${arDayLabel(a ?? '')} و${arDayLabel(b ?? '')}`;

/**
 * Recomputes status + matches for every candidate (keeps her decisions and
 * edits). Duplicates are recorded but never resolved; anything with a match,
 * a conflict or a missing field is never auto-approved.
 */
export function evaluateCandidates(cands: readonly ImportCandidate[], existing: readonly ExistingEntry[], structured: boolean): ImportCandidate[] {
  const byNorm = new Map<string, ExistingEntry[]>();
  for (const e of existing) byNorm.set(e.norm, [...(byNorm.get(e.norm) ?? []), e]);
  const seen = new Map<string, ImportCandidate>();
  const result = cands.map((c) => ({ ...c, matches: [] as CandidateMatch[] }));
  for (const c of result) {
    const norm = normalizeArabic(c.title);
    if (norm === '') continue;
    for (const e of byNorm.get(norm) ?? []) {
      const conflict = c.date != null && e.date != null && c.date !== e.date;
      c.matches.push({
        entity: e.entity, id: e.id, title: e.title, relation: conflict ? 'conflict' : 'duplicate',
        detail: conflict ? dateDetail(c.date as string, e.date as string) : 'نفس العنوان موجود عندك',
      });
    }
    const prev = seen.get(norm);
    if (prev) {
      const conflict = c.date != null && prev.date != null && c.date !== prev.date;
      c.matches.push({
        entity: 'candidate', id: prev.id, title: prev.title, relation: conflict ? 'conflict' : 'duplicate',
        detail: conflict ? twoDates(prev.date, c.date) : `مكرر في الملف — ${prev.sourceRef.location}`,
      });
      if (conflict && !prev.matches.some((m) => m.entity === 'candidate' && m.id === c.id)) {
        prev.matches.push({
          entity: 'candidate', id: c.id, title: c.title, relation: 'conflict', detail: twoDates(prev.date, c.date),
        });
      }
    } else seen.set(norm, c);
  }
  return result.map((c) => ({ ...c, status: statusOf(c, structured) }));
}

function statusOf(c: ImportCandidate, structured: boolean): CandidateStatus {
  if (c.matches.some((m) => m.relation === 'conflict')) return 'conflict';
  const missing = [...c.missing];
  if (c.title.trim() === '' && !missing.includes('title')) missing.push('title');
  if (c.type === 'appointment' && c.date == null && !missing.includes('date')) missing.push('date');
  if (missing.length > 0) return 'missing';
  if (structured && c.typeExplicit && !c.edited) return 'confirmed';
  if (c.edited && c.title.trim() !== '') return 'confirmed';
  return 'suggested';
}

/** Missing fields as shown to her (adds appointment date / empty title). */
export function missingFields(c: ImportCandidate): string[] {
  const m = [...c.missing];
  if (c.title.trim() === '' && !m.includes('title')) m.push('title');
  if (c.type === 'appointment' && c.date == null && !m.includes('date')) m.push('date');
  return m;
}

/** Safe to bulk-approve: no matches, nothing missing, no conflict. */
export const isSafeToBulkApprove = (c: ImportCandidate): boolean =>
  (c.status === 'confirmed' || c.status === 'suggested') && c.matches.length === 0 && missingFields(c).length === 0;

/** Where an approved candidate lands in the app (never a day plan). */
export function targetOf(type: CandidateType): ProvenanceEntity {
  if (type === 'task') return 'task';
  if (type === 'project') return 'project';
  if (type === 'idea') return 'inbox';
  return 'note';
}

/** Review counters for a batch. */
export function batchSummary(b: ImportBatch): Record<CandidateStatus | CandidateDecision | 'total', number> {
  const out = { total: b.candidates.length, confirmed: 0, suggested: 0, missing: 0, conflict: 0, pending: 0, approved: 0, ignored: 0 };
  for (const c of b.candidates) {
    out[c.status]++;
    out[c.decision]++;
  }
  return out;
}
