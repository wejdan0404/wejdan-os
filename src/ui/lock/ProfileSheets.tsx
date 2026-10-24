import { useState } from 'react'
import { Button } from '../components/Button'
import { Bidi } from '../components/Bidi'
import { Sheet } from '../components/Sheet'
import { StarDottedLine } from '../components/StarDottedLine'
import {
  VaultError, isValidPassword, isValidUsername, passwordStrength, type AutoLock, type AvatarSpec, type PreparedProfile, type Profile,
} from '../../domain/vault'
import { T } from './copy'
import type { VaultApi } from './context'
import { StrengthMeter, TextField } from './fields'
import { LIcon } from './LockIcons'
import { AVATAR_FLOWERS, ProfileAvatar } from './ProfileAvatar'
import { FLOWER_AR } from '../components/flowers/flowers'
import s from './lock.module.css'

/** 4.2 — «ملف جديد»: avatar, name, username, password. Hands the prepared profile to the recovery step. */
export function ProfileCreateSheet({ api, open, onClose, onPrepared }: { api: VaultApi; open: boolean; onClose: () => void; onPrepared: (p: PreparedProfile) => void }) {
  const [avatar, setAvatar] = useState<AvatarSpec>({ kind: 'initial' })
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [taken, setTaken] = useState(false)
  const valid = name.trim().length > 0 && isValidUsername(username) && isValidPassword(password)
  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    setTaken(false)
    try {
      onPrepared(await api.vault.prepare({ name, username, password, avatar }))
      setName(''); setUsername(''); setPassword(''); setAvatar({ kind: 'initial' })
    } catch (e) {
      if (e instanceof VaultError && e.code === 'username-taken') setTaken(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={T.createTitle}
      detents={['large']}
      cancelLabel={T.cancel}
      action={
        <button type="button" className={s.textBtn} disabled={!valid || busy} onClick={() => void submit()}>
          {T.create}
        </button>
      }
    >
      <form className={s.sheet} onSubmit={(e) => (e.preventDefault(), void submit())}>
        <div className={s.preview}>
          <ProfileAvatar name={name || '؟'} avatar={avatar} size={88} />
        </div>
        <div className={s.chooser} role="radiogroup" aria-label={T.avatarLabel}>
          {AVATAR_FLOWERS.map((f) => {
            const on = avatar.kind === 'flower' && avatar.flower === f
            return (
              <button key={f} type="button" role="radio" aria-checked={on} aria-label={FLOWER_AR[f]} className={s.chooseBtn} onClick={() => setAvatar({ kind: 'flower', flower: f })}>
                <ProfileAvatar name="" avatar={{ kind: 'flower', flower: f }} size={40} selected={on} />
              </button>
            )
          })}
          <button type="button" role="radio" aria-checked={avatar.kind === 'initial'} aria-label={T.initialAvatar} className={s.chooseBtn} onClick={() => setAvatar({ kind: 'initial' })}>
            <ProfileAvatar name={name || '؟'} avatar={{ kind: 'initial' }} size={40} selected={avatar.kind === 'initial'} />
          </button>
        </div>
        <TextField label={T.name} value={name} onChange={setName} dir="auto" autoComplete="off" />
        <TextField label={T.username} value={username} onChange={(v) => (setUsername(v), setTaken(false))} ltr autoComplete="off" error={taken ? T.taken : null} helper={T.usernameHelp} />
        <div className={s.stack} style={{ gap: 8 }}>
          <TextField label={T.password} value={password} onChange={setPassword} ltr secret autoComplete="new-password" helper="8 خانات أو أكثر." />
          <StrengthMeter level={passwordStrength(password)} />
        </div>
        <p className={s.quiet}>{T.createNote}</p>
        <Button size="large" block disabled={!valid || busy} onClick={() => void submit()}>
          {busy ? T.opening : T.createButton}
        </Button>
      </form>
    </Sheet>
  )
}

/** 4.4 — two-step delete. Safe default is the primary button; step 2 needs that profile's password. */
export function ProfileDeleteSheet({
  api, profile, onClose, onDeleted, onExport,
}: { api: VaultApi; profile: Profile | null; onClose: () => void; onDeleted: () => void; onExport?: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [pw, setPw] = useState('')
  const [wrong, setWrong] = useState(false)
  const [busy, setBusy] = useState(false)
  const close = () => {
    setStep(1); setPw(''); setWrong(false); setBusy(false)
    onClose()
  }
  const del = async () => {
    if (!profile || !pw || busy) return
    setBusy(true)
    // her password, or (if she lost it) the profile's recovery code — either proves it is her
    if (!(await api.vault.verifyPassword(profile.id, pw)) && !(await api.vault.checkRecovery(profile.id, pw))) {
      setBusy(false)
      setWrong(true)
      return
    }
    await api.removeProfile(profile.id)
    setStep(1); setPw(''); setBusy(false)
    onDeleted()
  }
  const name = profile?.name ?? ''
  return (
    <Sheet open={profile != null} onClose={close} title={step === 1 ? T.del1Title(name) : T.del2Title} detents={['large']} bare>
      {profile && (
        <div className={s.sheet} role="alertdialog" aria-label={step === 1 ? T.del1Title(name) : T.del2Title}>
          <div className={s.steps}>
            <span>
              <Bidi>{`${step} من 2`}</Bidi>
            </span>
            <StarDottedLine total={2} done={step - 1} label={`${step} من 2`} />
          </div>
          {step === 1 ? (
            <>
              <div className={s.delHead}>
                <div>
                  <h2 className={s.delTitle}>
                    تحذفين ملف «<bdi>{name}</bdi>»؟
                  </h2>
                  <p className={s.delUser}>
                    <bdi dir="ltr">{profile.username}</bdi>
                  </p>
                </div>
                <span className={s.delIcon}>
                  <LIcon name="trash" size={20} />
                </span>
              </div>
              <p className={s.sheetLede} style={{ color: 'var(--text-secondary)' }}>{T.del1Lead}</p>
              <div className={s.group}>
                {T.del1Items.map((t) => (
                  <div key={t} className={s.xRow}>
                    <span>{t}</span>
                    <LIcon name="x" size={18} />
                  </div>
                ))}
              </div>
              <p className={s.info}>
                <LIcon name="info" size={16} />
                {T.del1Info}
              </p>
              <Button size="large" block onClick={close}>
                {T.keep}
              </Button>
              <div className={s.row2}>
                {onExport && (
                  <button type="button" className={s.textBtn} onClick={onExport}>
                    {T.exportFirst}
                  </button>
                )}
                <button type="button" className={s.textBtn} data-danger onClick={() => setStep(2)}>
                  {T.continueDelete}
                </button>
              </div>
            </>
          ) : (
            <form className={s.sheet} onSubmit={(e) => (e.preventDefault(), void del())}>
              <div>
                <h2 className={s.delTitle}>{T.del2Title}</h2>
                <p className={s.delUser} style={{ direction: 'rtl' }}>
                  ملف «<bdi>{name}</bdi>»
                </p>
              </div>
              <p className={s.sheetLede} style={{ color: 'var(--text-secondary)' }}>
                اكتبي كلمة سر ملف «<bdi>{name}</bdi>» عشان نتأكد إنك أنتِ اللي تحذفين.
              </p>
              <TextField label={T.profilePassword} value={pw} onChange={(v) => (setPw(v), setWrong(false))} ltr secret autoComplete="off" helper={T.del2Help} error={wrong ? T.wrong : null} data-autofocus />
              <Button type="submit" className={s.destructive} size="large" block disabled={!pw || busy}>
                {busy ? T.opening : T.deleteForever}
              </Button>
              <button type="button" className={s.textBtn} onClick={close}>
                {T.keep}
              </button>
            </form>
          )}
        </div>
      )}
    </Sheet>
  )
}

/** 3.7 — single-select radio rows; picking closes the sheet. */
export function AutoLockSheet({ open, value, onPick, onClose }: { open: boolean; value: AutoLock; onPick: (v: AutoLock) => void; onClose: () => void }) {
  const order: AutoLock[] = ['immediate', 'min1', 'min5', 'launch']
  return (
    <Sheet open={open} onClose={onClose} title={T.timingTitle} detents={['medium']}>
      <div className={s.sheet}>
        <div className={s.group} role="radiogroup" aria-label={T.timingTitle}>
          {order.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={value === k} className={s.radio} onClick={() => (onPick(k), onClose())}>
              <span>
                <span className={s.radioT} style={{ display: 'block' }}>
                  <Bidi>{T.timing[k][0]}</Bidi>
                </span>
                <span className={s.radioS}>{T.timing[k][1]}</span>
              </span>
              <span className={s.dot}>{value === k && <LIcon name="check" size={14} />}</span>
            </button>
          ))}
        </div>
        <p className={s.sheetFoot}>{T.timingFooter}</p>
      </div>
    </Sheet>
  )
}
