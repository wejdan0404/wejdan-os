/**
 * Global search — a pure function over the snapshot (no index to keep in sync).
 *
 * Arabic-aware: both the query and the text are normalised (`normalizeArabic`:
 * no tashkeel/tatweel, أإآ→ا، ة→ه، ى→ي …). Every query token must match
 * somewhere in the item (title or body); title hits rank above body hits;
 * exact > prefix > word-start > substring. Results are grouped by kind in a
 * fixed order. Done/cancelled/archived items stay findable but rank lower.
 */
import type { LifeSnapshot } from '../snapshot';
import { normalizeArabic, stripAl, tokensOf } from './arabic';
import { noteDisplayTitle, type Note } from './notes';

export const SEARCH_KINDS = ['task', 'inbox', 'habit', 'project', 'goal', 'note', 'product', 'joy'] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export const SEARCH_KIND_LABELS: Record<SearchKind, string> = {
  task: 'المهام',
  inbox: 'الوارد',
  habit: 'العادات',
  project: 'المشاريع',
  goal: 'الأهداف',
  note: 'الملاحظات والقرارات',
  product: 'منتجاتي',
  joy: 'متعتي',
};

export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  /** Short secondary line (status, body snippet …). */
  subtitle: string;
  score: number;
  /** True when the item is done/archived/cancelled/paused. */
  inactive: boolean;
}

export interface SearchGroup {
  kind: SearchKind;
  label: string;
  results: SearchResult[];
}

export interface SearchResponse {
  query: string;
  /** Normalised query tokens actually searched. */
  tokens: string[];
  total: number;
  groups: SearchGroup[];
}

export interface SearchOptions {
  /** Max results per group (default 20). */
  perGroup?: number;
  /** Restrict to these kinds. */
  kinds?: readonly SearchKind[];
  /** Include inactive (done/archived/…) items (default true; they rank lower). */
  includeInactive?: boolean;
}

interface Doc {
  kind: SearchKind;
  id: string;
  title: string;
  body: string;
  subtitle: string;
  inactive: boolean;
}

const TASK_STATUS_AR: Record<string, string> = {
  inbox: 'بالوارد',
  planned: 'مخططة',
  in_progress: 'شغالة عليها',
  done: 'خلصت',
  postponed: 'بعدين',
  cancelled: 'ملغاة',
};

const snippet = (s: string, n = 60): string => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

function docsOf(s: LifeSnapshot): Doc[] {
  const docs: Doc[] = [];
  for (const t of s.tasks) {
    docs.push({
      kind: 'task', id: t.id, title: t.title, body: t.notes, subtitle: TASK_STATUS_AR[t.status] ?? '',
      inactive: t.status === 'done' || t.status === 'cancelled',
    });
  }
  for (const i of s.inbox) {
    // A converted item lives on as the task / project / note it became — that one is the result.
    if (i.convertedTo != null) continue;
    docs.push({
      kind: 'inbox', id: i.id, title: i.title, body: [i.body, i.url ?? ''].join(' '), subtitle: snippet(i.body),
      inactive: i.archived,
    });
  }
  for (const h of s.habits) {
    docs.push({
      kind: 'habit', id: h.id, title: h.titleAr, body: [h.titleEn, h.minimumText, h.normalText, h.bonusText, h.cue].join(' '),
      subtitle: h.cue, inactive: h.status !== 'active',
    });
  }
  for (const p of s.projects) {
    docs.push({
      kind: 'project', id: p.id, title: p.titleAr,
      body: [p.titleEn, p.notes ?? '', ...p.steps.map((st) => st.titleAr)].join(' '),
      subtitle: p.steps.find((st) => !st.done)?.titleAr ?? '', inactive: p.status === 'done' || p.status === 'archived',
    });
  }
  for (const g of s.goals) {
    docs.push({
      kind: 'goal', id: g.id, title: g.titleAr, body: [g.titleEn, g.targetNote, ...g.milestones.map((m) => m.titleAr)].join(' '),
      subtitle: snippet(g.targetNote), inactive: false,
    });
  }
  for (const n of s.notes as readonly Note[]) {
    docs.push({
      kind: 'note', id: n.id, title: noteDisplayTitle(n), body: n.body,
      subtitle: n.isDecision ? 'قرار' : snippet(n.body), inactive: false,
    });
  }
  for (const p of s.products) {
    docs.push({ kind: 'product', id: p.id, title: p.name, body: p.notes, subtitle: snippet(p.notes), inactive: !p.active });
  }
  for (const j of s.joyItems) {
    docs.push({ kind: 'joy', id: j.id, title: j.titleAr, body: j.titleEn, subtitle: '', inactive: !j.active });
  }
  return docs.filter((d) => d.title.trim() !== '' || d.body.trim() !== '');
}

/** Score one token against normalised text words (0 = no match). */
function tokenScore(token: string, normText: string, words: string[], weights: { exact: number; prefix: number; word: number; sub: number }): number {
  if (normText === token) return weights.exact;
  if (normText.startsWith(token)) return weights.prefix;
  const bare = stripAl(token);
  for (const w of words) {
    if (w === token || stripAl(w) === bare) return weights.word + 5;
    if (w.startsWith(token) || stripAl(w).startsWith(bare)) return weights.word;
  }
  if (normText.includes(token)) return weights.sub;
  if (bare.length >= 3 && bare !== token && normText.includes(bare)) return weights.sub - 2;
  return 0;
}

const TITLE_W = { exact: 100, prefix: 70, word: 50, sub: 30 };
const BODY_W = { exact: 20, prefix: 15, word: 12, sub: 8 };

/** Searches tasks, inbox, habits, projects, goals, notes, products and joy items. */
export function search(s: LifeSnapshot, query: string, o: SearchOptions = {}): SearchResponse {
  const tokens = tokensOf(query);
  const perGroup = o.perGroup ?? 20;
  const empty: SearchResponse = { query, tokens, total: 0, groups: [] };
  if (tokens.length === 0) return empty;
  const kinds = new Set(o.kinds ?? SEARCH_KINDS);
  const fullQuery = normalizeArabic(query);
  const scored: SearchResult[] = [];
  for (const d of docsOf(s)) {
    if (!kinds.has(d.kind)) continue;
    if (d.inactive && o.includeInactive === false) continue;
    const nt = normalizeArabic(d.title);
    const nb = normalizeArabic(d.body);
    const tw = nt.split(' ');
    const bw = nb.split(' ');
    let score = 0;
    let all = true;
    for (const t of tokens) {
      const ts = tokenScore(t, nt, tw, TITLE_W);
      const bs = ts > 0 ? 0 : tokenScore(t, nb, bw, BODY_W);
      if (ts === 0 && bs === 0) {
        all = false;
        break;
      }
      score += ts + bs;
    }
    if (!all) continue;
    if (tokens.length > 1 && nt.includes(fullQuery)) score += 40;
    if (nt === fullQuery) score += 60;
    if (d.inactive) score -= 25;
    scored.push({ kind: d.kind, id: d.id, title: d.title, subtitle: d.subtitle, score, inactive: d.inactive });
  }
  const groups: SearchGroup[] = [];
  for (const k of SEARCH_KINDS) {
    const results = scored
      .filter((r) => r.kind === k)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'ar'))
      .slice(0, perGroup);
    if (results.length > 0) groups.push({ kind: k, label: SEARCH_KIND_LABELS[k], results });
  }
  // Groups ordered by their best hit (ties keep the fixed kind order).
  groups.sort((a, b) => b.results[0].score - a.results[0].score);
  return { query, tokens, total: groups.reduce((n, g) => n + g.results.length, 0), groups };
}
