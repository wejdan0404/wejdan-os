/** Focus finish: which sessions get a retrieval question, and the questions' text. Pure. */
import type { DomainId } from '../models';

const STUDY_DOMAINS: ReadonlySet<DomainId> = new Set<DomainId>(['ielts', 'learning', 'career', 'driving']);

/** Study-type sessions (a planned item in a learning domain) get the try-first tip and the recall question. */
export const isStudyDomain = (d: DomainId | null | undefined): boolean => d != null && STUDY_DOMAINS.has(d);

export const recallQuestion = (title: string): string => `اذكري فكرتين تعلمتيها اليوم من «${title}».`;

/** Note saved from an answer (null when she left it empty). */
export function recallNote(title: string, answer: string): { title: string; body: string } | null {
  const body = answer.trim();
  return body === '' ? null : { title: `استرجاع: ${title}`.slice(0, 80), body };
}
