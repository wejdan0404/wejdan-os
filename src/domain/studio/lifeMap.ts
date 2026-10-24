/**
 * Onboarding life map — every domain is «نمو / صيانة / راحة» (grow / maintain / rest) with the engine's caps
 * (3 grow, 5 maintain). Pure logic; [applyLifeMap] writes through the store (season + change rules unchanged).
 */
import { kMaxGrowDomains, kMaxMaintainDomains } from '../engine/capacityGuard';
import type { Domain, DomainId, DomainState } from '../models';
import type { LifeStore } from '../store';

export type LifeMap = Partial<Record<DomainId, DomainState>>;
export type LifeMapBlock = 'grow' | 'maintain';

export const kLifeMapCaps = { grow: kMaxGrowDomains, maintain: kMaxMaintainDomains } as const;

export function lifeMapCounts(map: LifeMap): { grow: number; maintain: number; rest: number } {
  const c = { grow: 0, maintain: 0, rest: 0 };
  for (const v of Object.values(map)) if (v) c[v]++;
  return c;
}

/** The map as it stands now, for the domains she can choose among. Over-cap leftovers fall to the next tier (never silently grow). */
export function lifeMapFromDomains(domains: readonly Domain[]): LifeMap {
  const map: LifeMap = {};
  let grow = 0, maintain = 0;
  for (const d of domains) {
    let st = d.state;
    if (st === 'grow') {
      if (grow < kMaxGrowDomains) grow++;
      else st = 'maintain';
    }
    if (st === 'maintain') {
      if (maintain < kMaxMaintainDomains) maintain++;
      else st = 'rest';
    }
    map[d.id] = st;
  }
  return map;
}

/** Sets one domain; if the tier is full nothing changes and `blocked` says which cap was hit. */
export function lifeMapChoose(map: LifeMap, id: DomainId, to: DomainState): { map: LifeMap; blocked: LifeMapBlock | null } {
  if (map[id] === to) return { map, blocked: null };
  const c = lifeMapCounts(map);
  if (to === 'grow' && c.grow >= kMaxGrowDomains) return { map, blocked: 'grow' };
  if (to === 'maintain' && c.maintain >= kMaxMaintainDomains) return { map, blocked: 'maintain' };
  return { map: { ...map, [id]: to }, blocked: null };
}

/** Writes only the domains whose state differs (rest first, so nothing passes through an over-cap moment). */
export async function applyLifeMap(store: LifeStore, domains: readonly Domain[], map: LifeMap): Promise<DomainId[]> {
  const rank: Record<DomainState, number> = { rest: 0, maintain: 1, grow: 2 };
  const changes = domains.filter((d) => map[d.id] != null && map[d.id] !== d.state).sort((a, b) => rank[map[a.id]!] - rank[map[b.id]!]);
  for (const d of changes) await store.setDomainState(d.id, map[d.id]!, true);
  return changes.map((d) => d.id);
}
