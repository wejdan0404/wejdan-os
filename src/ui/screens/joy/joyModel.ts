/**
 * Joy area view-model — pure helpers over the domain snapshot (no React).
 *
 * - todaysFreeJoy: the same daily rotation as the planner (domain dayPlanner.freeJoy),
 *   with an optional per-day override she picks with «غيّريها».
 * - rewardStatus: what an earned reward needs (no shop-like progress — just «باقي X»).
 * - milestoneRewards: rewards she tied to a goal milestone.
 * - pendingRedeems: marks a just-redeemed reward during its undo window (the redeem is
 *   written at once; the domain's undo token reverses it).
 */
import { cmpStr, daysBetween, mkDate, mod, type Goal, type JoyItem, type LifeSnapshot, type Milestone } from '../../../domain'

export const REDEEM_UNDO_MS = 8000

export function freeJoys(s: LifeSnapshot): JoyItem[] {
  return s.joyItems.filter((j) => j.active && j.kind !== 'earned').sort((a, b) => cmpStr(a.id, b.id))
}

export function earnedRewards(s: LifeSnapshot): JoyItem[] {
  return s.joyItems.filter((j) => j.kind === 'earned')
}

/** Today's free joy — the planner's rotation (active `free` items by id), or her pick for today. */
export function todaysFreeJoy(s: LifeSnapshot, today: Date, overrideId: string | null): JoyItem | null {
  if (overrideId) {
    const o = s.joyItems.find((j) => j.id === overrideId && j.active)
    if (o) return o
  }
  const free = s.joyItems.filter((j) => j.active && j.kind === 'free').sort((a, b) => cmpStr(a.id, b.id))
  if (free.length === 0) return null
  return free[mod(daysBetween(mkDate(2000, 1, 1), today), free.length)] ?? null
}

export interface RewardStatus {
  /** Has a spark price. */
  priced: boolean
  ready: boolean
  remaining: number
}

export function rewardStatus(r: JoyItem, balance: number): RewardStatus {
  const price = r.price ?? 0
  if (price <= 0) return { priced: false, ready: false, remaining: 0 }
  return { priced: true, ready: balance >= price, remaining: Math.max(0, price - balance) }
}

/** Ready first, then by how close she is. */
export function sortRewards(list: JoyItem[], balance: number): JoyItem[] {
  return [...list].sort((a, b) => {
    const sa = rewardStatus(a, balance)
    const sb = rewardStatus(b, balance)
    if (sa.ready !== sb.ready) return sa.ready ? -1 : 1
    if (sa.remaining !== sb.remaining) return sa.remaining - sb.remaining
    return cmpStr(a.titleAr, b.titleAr)
  })
}

export interface MilestoneReward {
  goal: Goal
  milestone: Milestone
  reward: JoyItem
}

export function milestoneRewards(s: LifeSnapshot): MilestoneReward[] {
  const out: MilestoneReward[] = []
  for (const goal of s.goals) {
    for (const milestone of goal.milestones) {
      if (!milestone.rewardJoyId) continue
      const reward = s.joyItems.find((j) => j.id === milestone.rewardJoyId)
      if (reward) out.push({ goal, milestone, reward })
    }
  }
  return out.sort((a, b) => Number(b.milestone.done) - Number(a.milestone.done) || a.milestone.quarter - b.milestone.quarter)
}

/**
 * True when [rewardId] is tied to a milestone that isn't done yet: it can't be redeemed and is
 * listed only under «مكافآت المعالم» (QA area4 #9).
 */
export function isLockedByMilestone(s: LifeSnapshot, rewardId: string): boolean {
  let tied = false
  for (const g of s.goals)
    for (const m of g.milestones)
      if (m.rewardJoyId === rewardId) {
        if (m.done) return false
        tied = true
      }
  return tied
}

/** Reward currently tied to milestone [key] (`goalId:milestoneId`), if any. */
export function rewardOnMilestone(s: LifeSnapshot, key: string): JoyItem | null {
  for (const g of s.goals)
    for (const m of g.milestones)
      if (`${g.id}:${m.id}` === key && m.rewardJoyId) return s.joyItems.find((j) => j.id === m.rewardJoyId) ?? null
  return null
}

/** The milestone a reward is tied to (first match), as `goalId:milestoneId`. */
export function linkedMilestoneKey(s: LifeSnapshot, rewardId: string): string | null {
  for (const g of s.goals) for (const m of g.milestones) if (m.rewardJoyId === rewardId) return `${g.id}:${m.id}`
  return null
}

/** Goals with the milestone link for [rewardId] set to [key] (null = unlink everywhere). Only changed goals. */
export function relinkMilestone(goals: Goal[], rewardId: string, key: string | null): Goal[] {
  const changed: Goal[] = []
  for (const g of goals) {
    let dirty = false
    const milestones = g.milestones.map((m) => {
      const want = key === `${g.id}:${m.id}`
      if (want && m.rewardJoyId !== rewardId) {
        dirty = true
        return { ...m, rewardJoyId: rewardId }
      }
      if (!want && m.rewardJoyId === rewardId) {
        dirty = true
        return { ...m, rewardJoyId: null }
      }
      return m
    })
    if (dirty) changed.push({ ...g, milestones })
  }
  return changed
}

// ---- pending redeems (undo window before the ledger write) ----------------------

interface Pending {
  rewardId: string
  price: number
  timer: number
  commit: () => Promise<unknown>
}

const pending = new Map<string, Pending>()
const listeners = new Set<() => void>()
let version = 0
const emit = () => {
  version++
  listeners.forEach((l) => l())
}

export const pendingRedeems = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  getVersion: () => version,
  /** True while a just-redeemed reward is still inside its undo window (shows «استلمتيها»). */
  has: (rewardId: string) => pending.has(rewardId),
  /** The redeem is already in the ledger (domain undo token), so nothing is held back. */
  heldSparks: () => 0,
  /** Marks a reward as just redeemed for the undo window. */
  mark(rewardId: string, ms = REDEEM_UNDO_MS) {
    pendingRedeems.cancel(rewardId)
    const timer = window.setTimeout(() => {
      pending.delete(rewardId)
      emit()
    }, ms)
    pending.set(rewardId, { rewardId, price: 0, timer, commit: async () => undefined })
    emit()
  },
  cancel(rewardId: string) {
    const p = pending.get(rewardId)
    if (!p) return
    window.clearTimeout(p.timer)
    pending.delete(rewardId)
    emit()
  },
  /** Clears every mark (tests, sign-out). */
  clear() {
    for (const p of pending.values()) window.clearTimeout(p.timer)
    pending.clear()
    emit()
  },
}

// ---- today's pick («غيّريها») — a per-device convenience, safe without storage ----

const pickKey = (dayKey: string) => `wejdan.joy.pick.${dayKey}`

export function readTodayPick(dayKey: string): string | null {
  try {
    return window.localStorage.getItem(pickKey(dayKey))
  } catch {
    return null
  }
}

export function writeTodayPick(dayKey: string, id: string | null) {
  try {
    if (id) window.localStorage.setItem(pickKey(dayKey), id)
    else window.localStorage.removeItem(pickKey(dayKey))
  } catch {
    /* storage blocked — the pick just won't persist */
  }
}

export const SIZE_LABEL: Record<JoyItem['size'], string> = {
  quick: 'سريعة',
  medium: 'متوسطة',
  big: 'كبيرة',
}
