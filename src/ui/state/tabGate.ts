/**
 * Tab gate — lets a kept-alive tab "freeze" while it is hidden.
 *
 * Every tab root (اليوم، عاداتي، …) stays mounted so its scroll position and
 * state survive tab switches. Without a gate, every store write re-rendered all
 * of them. Store hooks inside a gated subtree read a frozen snapshot while the
 * tab is hidden and catch up once, in one render, when it becomes active again.
 *
 * Screens outside a tab (pushed screens, onboarding) have no gate: always live.
 */
import { createContext } from 'react'

export interface TabGate {
  isActive(): boolean
  /** Called on every activation change. */
  subscribe(cb: () => void): () => void
}

export interface MutableTabGate extends TabGate {
  set(active: boolean): void
}

export function createTabGate(initial: boolean): MutableTabGate {
  let active = initial
  const listeners = new Set<() => void>()
  return {
    isActive: () => active,
    set(v) {
      if (v === active) return
      active = v
      for (const l of [...listeners]) l()
    },
    subscribe(cb) {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
  }
}

export const TabGateContext = createContext<TabGate | null>(null)
