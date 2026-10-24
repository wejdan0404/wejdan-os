/** Read-models for notes, change log, sources & import review. */
import type { LifeSnapshot } from '../snapshot';
import type { ChangeEntity, ChangeEntry } from './changelog';
import { noteLinksTo, sortNotes, type Note, type NoteLinkKind } from './notes';
import {
  batchSummary, missingFields, provenanceId, type ImportBatch, type ImportCandidate, type Provenance, type ProvenanceEntity,
  type Source,
} from './sources';

/** All notes, pinned first then newest. */
export const notesView = (s: LifeSnapshot): Note[] => sortNotes(s.notes);
/** Decisions only. */
export const decisions = (s: LifeSnapshot): Note[] => notesView(s).filter((n) => n.isDecision);
/** Notes linked to a project / goal / habit / task. */
export const notesLinkedTo = (s: LifeSnapshot, kind: NoteLinkKind, id: string): Note[] =>
  notesView(s).filter((n) => noteLinksTo(n, kind, id));

/** Change log for one item, newest first. */
export const changesFor = (s: LifeSnapshot, entity: ChangeEntity, id: string): ChangeEntry[] =>
  s.changeLog.filter((e) => e.entity === entity && e.entityId === id);

/** Where an imported item came from (null = typed in the app). */
export const provenanceOf = (s: LifeSnapshot, entity: ProvenanceEntity, id: string): (Provenance & { source: Source | null }) | null => {
  const p = s.provenance.find((x) => x.id === provenanceId(entity, id));
  return p ? { ...p, source: s.sources.find((x) => x.id === p.sourceId) ?? null } : null;
};

/** Batches still waiting for her review, newest first. */
export const openImportBatches = (s: LifeSnapshot): ImportBatch[] => s.importBatches.filter((b) => b.committedAt == null);

/** Every candidate that still needs her eye (pending decision), with its batch. */
export function needsReview(s: LifeSnapshot): { batch: ImportBatch; candidate: ImportCandidate; missing: string[] }[] {
  const out: { batch: ImportBatch; candidate: ImportCandidate; missing: string[] }[] = [];
  for (const b of openImportBatches(s)) {
    for (const c of b.candidates) if (c.decision === 'pending') out.push({ batch: b, candidate: c, missing: missingFields(c) });
  }
  return out;
}
export const needsReviewCount = (s: LifeSnapshot): number => needsReview(s).length;

/** Files that could not be read (name + Arabic reason). */
export const failedSources = (s: LifeSnapshot): Source[] => s.sources.filter((x) => x.status === 'failed');

/** Per-source report: what was found, added, still pending, duplicates/conflicts. */
export function sourceReport(s: LifeSnapshot, sourceId: string) {
  const source = s.sources.find((x) => x.id === sourceId) ?? null;
  const batch = s.importBatches.find((b) => b.sourceId === sourceId) ?? null;
  const summary = batch ? batchSummary(batch) : null;
  const flagged = batch ? batch.candidates.filter((c) => c.matches.length > 0) : [];
  return { source, batch, summary, flagged };
}
