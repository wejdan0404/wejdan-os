/**
 * Flower system — every category (domain) has its own flower; a habit's
 * strength is shown as that flower's growth stage. Drawings live in
 * drawings.json (96×96 viewBox, ink = currentColor, fills = Violet/Sky only)
 * and are loaded lazily so they don't weigh on first load.
 */
import type { DomainId, GrowthStage } from '../../../domain'

export const FLOWER_KINDS = [
  'delphinium', 'hydrangea', 'lavender', 'chamomile', 'iris', 'bluebell', 'orchid', 'morning-glory',
  'peony', 'jasmine', 'anemone', 'forget-me-not', 'taif-rose', 'sweet-pea', 'lily', 'magnolia',
] as const
export type FlowerKind = (typeof FLOWER_KINDS)[number]
export type FlowerStage = 1 | 2 | 3 | 4 | 5

export const FLOWER_AR: Record<FlowerKind, string> = {
  delphinium: 'دلفينيوم',
  hydrangea: 'هيدرنجا',
  lavender: 'لافندر',
  chamomile: 'بابونج',
  iris: 'سوسن',
  bluebell: 'جريس',
  orchid: 'أوركيد',
  'morning-glory': 'مجد الصباح',
  peony: 'فاوانيا',
  jasmine: 'فل',
  anemone: 'شقائق النعمان',
  'forget-me-not': 'لا تنساني',
  'taif-rose': 'ورد طائفي',
  'sweet-pea': 'بازلاء عطرة',
  lily: 'زنبق أبيض',
  magnolia: 'ماغنوليا',
}

/** Category → flower (owner-approved mapping). */
export const DOMAIN_FLOWER: Record<Exclude<DomainId, 'aquarium'>, FlowerKind> = {
  health: 'delphinium',
  care: 'hydrangea',
  sleep: 'lavender',
  food: 'chamomile',
  ielts: 'iris',
  learning: 'bluebell',
  career: 'orchid',
  driving: 'morning-glory',
  money: 'peony',
  home: 'jasmine',
  digital: 'anemone',
  admin: 'forget-me-not',
  joy: 'taif-rose',
  people: 'sweet-pea',
  faith: 'lily',
  womensHealth: 'magnolia',
}

export const flowerForDomain = (d: DomainId): FlowerKind =>
  d === 'aquarium' ? 'jasmine' : DOMAIN_FLOWER[d]

/** Habit strength → flower stage. */
export const STAGE_OF: Record<GrowthStage, FlowerStage> = {
  seed: 1,
  sprout: 2,
  growing: 3,
  rooted: 4,
  automatic: 5,
}

export const FLOWER_STAGE_AR: Record<FlowerStage, string> = {
  1: 'بذرة',
  2: 'برعم',
  3: 'تتفتح',
  4: 'مزهرة',
  5: 'متجذرة',
}

export type Drawings = Record<FlowerKind, Record<`${FlowerStage}`, string>>

let cache: Drawings | null = null
let pending: Promise<Drawings> | null = null

export function loadDrawings(): Promise<Drawings> {
  if (cache) return Promise.resolve(cache)
  pending ??= import('./drawings.json').then((m) => {
    cache = (m.default ?? m) as unknown as Drawings
    return cache
  })
  return pending
}

export const cachedDrawings = (): Drawings | null => cache
