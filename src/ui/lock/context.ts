import { createContext, useContext } from 'react'
import type { AutoLock, PreparedProfile, Profile, Session, Vault } from '../../domain/vault'

export interface VaultApi {
  vault: Vault
  /** Lock feature on (a registry exists). */
  enabled: boolean
  profiles: readonly Profile[]
  /** The unlocked profile (null while locked or when the lock is off). */
  current: Profile | null
  autoLock: AutoLock
  /** Lock → profile 1 becomes the existing data, encrypted. Resolves when the app is running on it. */
  activate(prep: PreparedProfile): Promise<void>
  /** New empty profile → switch into it. */
  addAndEnter(prep: PreparedProfile): Promise<void>
  /** Lock now (manual «اقفلي الحين» / «بدّلي الملف»). */
  lock(): void
  /** Single profile: decrypt back and turn the lock off. */
  turnOff(): Promise<void>
  /** After the caller verified the password: delete [id]; the active one logs out. */
  removeProfile(id: string): Promise<void>
  /** Gate → open. */
  adopt(session: Session): void
  setAutoLock(t: AutoLock): void
}

export const VaultContext = createContext<VaultApi | null>(null)
export const useVault = (): VaultApi | null => useContext(VaultContext)
