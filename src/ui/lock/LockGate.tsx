import { useState } from 'react'
import { useToast } from '../components/Toast'
import type { Profile, Session } from '../../domain/vault'
import { T } from './copy'
import type { VaultApi } from './context'
import { ForgotFlow } from './ForgotFlow'
import { ProfilePicker } from './ProfilePicker'
import { ProfileCreateSheet, ProfileDeleteSheet } from './ProfileSheets'
import { RecoveryCodeStep } from './RecoveryCodeStep'
import { UnlockScreen } from './UnlockScreen'
import type { PreparedProfile } from '../../domain/vault'

type View = { k: 'auto' } | { k: 'unlock'; id: string } | { k: 'forgot'; id: string }

/** What she sees while locked: the picker (2+ profiles) or the unlock screen (1), plus create / delete. */
export function LockGate({ api }: { api: VaultApi }) {
  const toast = useToast()
  const profiles = api.vault.profiles
  const [view, setView] = useState<View>({ k: 'auto' })
  const [creating, setCreating] = useState(false)
  const [newProfile, setNewProfile] = useState<PreparedProfile | null>(null)
  const [deleting, setDeleting] = useState<Profile | null>(null)
  const [manage, setManage] = useState(false)

  const find = (id: string) => profiles.find((p) => p.id === id)
  const open = (s: Session) => api.adopt(s)

  if (newProfile)
    return (
      <RecoveryCodeStep
        code={newProfile.recoveryCode}
        onBack={() => setNewProfile(null)}
        onSaved={async () => {
          try {
            await api.addAndEnter(newProfile)
          } catch {
            toast({ message: T.enableFailed })
          }
        }}
      />
    )

  const current =
    view.k === 'unlock' || view.k === 'forgot'
      ? find(view.id)
      : profiles.length === 1
        ? profiles[0]
        : undefined

  if (view.k === 'forgot' && current)
    return <ForgotFlow api={api} profile={current} onBack={() => setView({ k: 'unlock', id: current.id })} onDone={open} />

  if (current)
    return (
      <>
        <UnlockScreen
          key={current.id}
          api={api}
          profile={current}
          onUnlocked={open}
          onForgot={() => setView({ k: 'forgot', id: current.id })}
          onBack={profiles.length > 1 ? () => setView({ k: 'auto' }) : undefined}
        />
      </>
    )

  return (
    <>
      <ProfilePicker
        profiles={profiles}
        manage={manage}
        onPick={(p) => setView({ k: 'unlock', id: p.id })}
        onAdd={() => setCreating(true)}
        onDelete={(p) => setDeleting(p)}
        onClose={() => setManage(false)}
        onManage={() => setManage(true)}
      />
      <ProfileCreateSheet api={api} open={creating} onClose={() => setCreating(false)} onPrepared={(p) => (setCreating(false), setNewProfile(p))} />
      <ProfileDeleteSheet
        api={api}
        profile={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => {
          setDeleting(null)
          toast({ message: T.deleted })
        }}
      />
    </>
  )
}
