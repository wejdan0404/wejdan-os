/** Me: profile-aware header pieces + the «الملفات والحماية» group. Renders nothing special when the lock is off. */
import type { ReactNode } from 'react'
import { Bidi } from '../components/Bidi'
import { InsetGroupedList } from '../components/InsetGroupedList'
import { ListRow } from '../components/ListRow'
import { T } from './copy'
import { useVault } from './context'
import { LIcon } from './LockIcons'
import { ProfileAvatar } from './ProfileAvatar'
import s from './lock.module.css'

/** The header avatar: the profile's own avatar when the lock is on, otherwise [fallback] (the W). */
export function MeAvatar({ fallback }: { fallback: ReactNode }) {
  const api = useVault()
  const p = api?.current
  if (!p) return <>{fallback}</>
  return (
    <span className={s.meAvatar}>
      <ProfileAvatar name={p.name} avatar={p.avatar} size={56} />
    </span>
  )
}

/** «ملفك الحالي · test.user» when the lock is on, otherwise [fallback]. */
export function useMeSubtitle(fallback: ReactNode): ReactNode {
  const p = useVault()?.current
  if (!p) return fallback
  return (
    <>
      ملفك الحالي · <bdi dir="ltr">{p.username}</bdi>
    </>
  )
}

export function MeProfileGroup({ onProtect }: { onProtect: () => void }) {
  const api = useVault()
  if (!api?.current) return null
  const shown = api.profiles.slice(0, 3)
  return (
    <InsetGroupedList header={T.meGroup}>
      <ListRow
        leading={
          <span className={s.stackAv}>
            {shown.map((p) => (
              <ProfileAvatar key={p.id} name={p.name} avatar={p.avatar} size={34} />
            ))}
          </span>
        }
        title={T.switchRow}
        subtitle={<Bidi>{T.profilesCount(api.profiles.length)}</Bidi>}
        chevron
        onClick={() => api.lock()}
      />
      <ListRow
        leading={
          <span className={s.rowTile} data-strong="">
            <LIcon name="lock" size={18} />
          </span>
        }
        title={T.protectRow}
        subtitle={T.protectOn}
        chevron
        onClick={onProtect}
      />
    </InsetGroupedList>
  )
}
