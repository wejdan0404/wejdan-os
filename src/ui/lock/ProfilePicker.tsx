import { Bidi } from '../components/Bidi'
import { WMark } from '../components/WMark'
import type { Profile } from '../../domain/vault'
import { T } from './copy'
import { LIcon } from './LockIcons'
import { BackRow, LockPage } from './LockPage'
import { ProfileAvatar } from './ProfileAvatar'
import s from './lock.module.css'

/** «اختاري ملفك»: avatar + lock badge + name + username (LTR). Tap → unlock. In manage mode: trash buttons, no unlock. */
export function ProfilePicker({
  profiles, onPick, onAdd, manage, onDelete, onClose, portal, currentId, onManage,
}: {
  profiles: readonly Profile[]
  onPick?: (p: Profile) => void
  onAdd: () => void
  manage?: boolean
  onDelete?: (p: Profile) => void
  onClose?: () => void
  portal?: boolean
  currentId?: string | null
  /** Locked picker: opens manage mode (delete). */
  onManage?: () => void
}) {
  return (
    <LockPage portal={portal} glow={!manage} label={manage ? T.manageTitle : T.pickerTitle}>
      {manage && onClose ? (
        <BackRow label={T.back} onClick={onClose} />
      ) : (
        <div className={s.top}>
          <WMark size={32} />
        </div>
      )}
      <h1 className={s.title} data-autofocus tabIndex={-1}>{manage ? T.manageTitle : T.pickerTitle}</h1>
      <p className={s.lede}>{manage ? T.manageLede : T.pickerLede}</p>
      <ul className={s.grid} style={{ listStyle: 'none', margin: 0 }}>
        {profiles.map((p) => (
          <li key={p.id} style={{ position: 'relative' }}>
            <button type="button" className={s.tile} onClick={() => (manage ? undefined : onPick?.(p))} aria-label={`${p.name} · ${p.username}`} disabled={manage} style={manage ? { cursor: 'default' } : undefined}>
              <span className={s.avatarWrap}>
                <ProfileAvatar name={p.name} avatar={p.avatar} size={92} />
                <span className={s.badge} aria-hidden="true">
                  <LIcon name="lock" size={14} />
                </span>
              </span>
              <span className={s.tileName}>
                <bdi>{p.name}</bdi>
              </span>
              <span className={s.tileUser}>
                <bdi dir="ltr">{p.username}</bdi>
              </span>
            </button>
            {manage && (
              <button type="button" className={s.trashBtn} onClick={() => onDelete?.(p)} aria-label={`احذفي ملف ${p.name}`}>
                <LIcon name="trash" size={18} />
              </button>
            )}
            {manage && p.id === currentId && <span className={s.tileUser} style={{ display: 'block', textAlign: 'center' }}>الملف الحالي</span>}
          </li>
        ))}
        <li>
          <button type="button" className={s.tile} onClick={onAdd}>
            <span className={s.addCircle} style={{ inlineSize: 92, blockSize: 92 }}>
              <LIcon name="plus" size={26} />
            </span>
            <span className={s.addLabel}>{T.newProfile}</span>
          </button>
        </li>
      </ul>
      <div className={s.spacer} />
      {!manage && onManage && (
        <button type="button" className={s.textBtn} onClick={onManage}>
          {T.manageTitle}
        </button>
      )}
      <p className={s.foot}>
        <LIcon name="shield" size={16} />
        <Bidi>{T.pickerFooter}</Bidi>
      </p>
    </LockPage>
  )
}
