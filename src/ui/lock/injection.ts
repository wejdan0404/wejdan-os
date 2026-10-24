import { createContext, useContext } from 'react'
import type { LifeStore } from '../../domain'

/** The unlocked profile's store; `LifeStoreProvider` uses it instead of opening the plain database. */
export const LifeStoreInjection = createContext<LifeStore | null>(null)
export const useInjectedLifeStore = (): LifeStore | null => useContext(LifeStoreInjection)
