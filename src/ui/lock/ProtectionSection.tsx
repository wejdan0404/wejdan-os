/**
 * Settings → «الحماية والملفات». Self-contained: every sheet and flow it opens lives here, so
 * SettingsScreen only renders <ProtectionSection />.
 */
import { useState } from 'react'
import { Button } from '../components/Button'
import { Bidi } from '../components/Bidi'
import { InsetGroupedList } from '../components/InsetGroupedList'
import { ListRow } from '../components/ListRow'
import { Sheet } from '../components/Sheet'
import { Switch } from '../components/Switch'
import { useToast } from '../components/Toast'
import { useLife, useStore } from '../state/LifeStore'
import { useBackupIO } from './backupIO'
import { VaultError, isValidPassword, passwordStrength, type PreparedProfile } from '../../domain/vault'
import { T } from './copy'
import { useVault } from './context'
import { StrengthMeter, TextField, WarnCard } from './fields'
import { LIcon, type LockIconName } from './LockIcons'
import { LockSetup } from './LockSetup'
import { ProfilePicker } from './ProfilePicker'
import { AutoLockSheet, ProfileCreateSheet, ProfileDeleteSheet } from './ProfileSheets'
import { RecoveryCodeStep } from './RecoveryCodeStep'
import s from './lock.module.css'

const Tile = ({ icon, strong }: { icon: LockIconName; strong?: boolean }) => (
  <span className={s.rowTile} data-strong={strong ? '' : undefined}>
    <LIcon name={icon} size={18} />
  </span>
)

export function ProtectionSection() {
  const api = useVault()
  const life = useLife()
  const store = useStore()
  const toast = useToast()
  const io = useBackupIO()
  const [setup, setSetup] = useState(false)
  const [timing, setTiming] = useState(false)
  const [sheet, setSheet] = useState<null | 'password' | 'recovery' | 'off'>(null)
  const [manage, setManage] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newProfile, setNewProfile] = useState<PreparedProfile | null>(null)
  const [deleting, setDeleting] = useState<ReturnType<NonNullable<typeof api>['vault']['profile']>>(undefined)
  const [rotated, setRotated] = useState<{ code: string; commit: () => Promise<void> } | null>(null)
  if (!api) return null
  const on = api.enabled
  const current = api.current

  const onSwitch = (v: boolean) => {
    if (v) return setSetup(true)
    if (api.profiles.length > 1) return toast({ message: T.turnOffMulti })
    setSheet('off')
  }
  const exportOf = async () => {
    await io.exportBackup(await store.exportAll(), `life-os-${new Date().toISOString().slice(0, 10)}`)
  }

  const bad = store.quarantined()
  const tampered = bad.filter((q) => q.reason === 'tamper').length

  return (
    <>
      {bad.length > 0 && (
        <div role="status" data-testid="quarantine-notice">
          <WarnCard title={T.quarantineTitle(bad.length)}>
            {T.quarantineBody}
            {tampered > 0 && ` ${T.quarantineTamper(tampered)}`}
          </WarnCard>
        </div>
      )}
      <InsetGroupedList header={T.groupTitle} footer={T.protectFooter}>
        <ListRow
          leading={<Tile icon="lock" strong={on} />}
          title={T.lockRow}
          subtitle={on ? T.lockOn : T.lockOff}
          trailing={<Switch checked={on} onChange={onSwitch} label={T.lockRow} />}
        />
        {on && (
          <>
            <ListRow
              leading={<Tile icon="clock" />}
              title={T.locksRow}
              trailing={<span className={s.valueText}>{T.timing[api.autoLock][0]}</span>}
              chevron
              onClick={() => setTiming(true)}
            />
            <ListRow leading={<Tile icon="lock" />} title={T.lockNow} chevron onClick={() => api.lock()} />
            <ListRow leading={<Tile icon="key" />} title={T.changePassword} chevron onClick={() => setSheet('password')} />
            <ListRow leading={<Tile icon="shield" />} title={T.newRecovery} subtitle={T.newRecoverySub} chevron onClick={() => setSheet('recovery')} />
            <ListRow
              leading={<Tile icon="users" />}
              title={T.profilesRow}
              trailing={<span className={s.valueText}><Bidi>{String(api.profiles.length)}</Bidi></span>}
              chevron
              onClick={() => setManage(true)}
            />
          </>
        )}
      </InsetGroupedList>

      {setup && <LockSetup name={life.settings.displayName} onClose={() => setSetup(false)} />}
      <AutoLockSheet open={timing} value={api.autoLock} onPick={(v) => api.setAutoLock(v)} onClose={() => setTiming(false)} />

      <PasswordSheets
        which={sheet}
        onClose={() => setSheet(null)}
        onRotated={(r) => (setSheet(null), setRotated(r))}
      />
      {rotated && (
        <RecoveryCodeStep
          portal
          code={rotated.code}
          onBack={() => setRotated(null)}
          onSaved={() => {
            rotated
              .commit()
              .then(() => {
                setRotated(null)
                toast({ message: T.recoveryRenewed })
              })
              .catch(() => toast({ message: T.enableFailed }))
          }}
        />
      )}

      {manage && !newProfile && (
        <ProfilePicker
          portal
          manage
          currentId={current?.id}
          profiles={api.profiles}
          onClose={() => setManage(false)}
          onAdd={() => setCreating(true)}
          onDelete={(p) => setDeleting(p)}
        />
      )}
      <ProfileCreateSheet api={api} open={creating} onClose={() => setCreating(false)} onPrepared={(p) => (setCreating(false), setNewProfile(p))} />
      {newProfile && (
        <RecoveryCodeStep
          portal
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
      )}
      <ProfileDeleteSheet
        api={api}
        profile={deleting ?? null}
        onClose={() => setDeleting(undefined)}
        onDeleted={() => {
          setDeleting(undefined)
          toast({ message: T.deleted })
        }}
        onExport={deleting && deleting.id === current?.id ? () => void exportOf() : undefined}
      />
    </>
  )
}

/** change password · new recovery code · turn lock off — each asks for the current password first. */
function PasswordSheets({
  which, onClose, onRotated,
}: { which: null | 'password' | 'recovery' | 'off'; onClose: () => void; onRotated: (r: { code: string; commit: () => Promise<void> }) => void }) {
  const api = useVault()!
  const toast = useToast()
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [wrong, setWrong] = useState(false)
  const [busy, setBusy] = useState(false)
  const id = api.current?.id
  const reset = () => (setCur(''), setNext(''), setRepeat(''), setWrong(false), setBusy(false))
  const close = () => (reset(), onClose())

  const submit = async () => {
    if (!id || busy) return
    setBusy(true)
    setWrong(false)
    try {
      if (which === 'password') {
        const ok = await api.vault.changePassword(id, cur, next)
        if (!ok) return (setBusy(false), setWrong(true))
        toast({ message: T.passwordChanged })
        close()
      } else if (which === 'recovery') {
        const r = await api.vault.prepareNewRecovery(id, cur)
        if (!r) return (setBusy(false), setWrong(true))
        reset()
        onRotated({ code: r.recoveryCode, commit: r.commit })
      } else if (which === 'off') {
        if (!(await api.vault.verifyPassword(id, cur))) return (setBusy(false), setWrong(true))
        await api.turnOff()
      }
    } catch (e) {
      setBusy(false)
      toast({ message: e instanceof VaultError && e.code === 'multiple-profiles' ? T.turnOffMulti : T.enableFailed })
    }
  }
  const title = which === 'password' ? T.changePassword : which === 'recovery' ? T.newRecovery : T.turnOffTitle
  const ready = !!cur && (which !== 'password' || (isValidPassword(next) && next === repeat))
  return (
    <Sheet open={which != null} onClose={close} title={title} detents={which === 'password' ? ['large'] : ['medium']}>
      <form className={s.sheet} onSubmit={(e) => (e.preventDefault(), void submit())}>
        {which === 'recovery' && <p className={s.sheetLede}>{T.newRecoveryLede}</p>}
        {which === 'off' && <p className={s.sheetLede}>{T.turnOffLede}</p>}
        <TextField label={T.currentPassword} value={cur} onChange={(v) => (setCur(v), setWrong(false))} ltr secret autoComplete="current-password" error={wrong ? T.wrong : null} />
        {which === 'password' && (
          <>
            <TextField label={T.newPassword} value={next} onChange={setNext} ltr secret autoComplete="new-password" helper={T.passwordHelp} />
            <StrengthMeter level={passwordStrength(next)} />
            <TextField label={T.repeatNew} value={repeat} onChange={setRepeat} ltr secret autoComplete="new-password" error={repeat && repeat !== next ? T.mismatch : null} />
          </>
        )}
        <Button type="submit" size="large" block disabled={!ready || busy} className={which === 'off' ? s.destructive : undefined}>
          {busy ? T.opening : which === 'password' ? T.change : which === 'recovery' ? T.next : T.turnOff}
        </Button>
        <button type="button" className={s.textBtn} onClick={close}>
          {T.cancel}
        </button>
      </form>
    </Sheet>
  )
}
