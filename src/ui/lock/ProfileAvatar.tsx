import { Flower } from '../components/flowers'
import { FLOWER_KINDS, type FlowerKind } from '../components/flowers/flowers'
import type { AvatarSpec } from '../../domain/vault'
import s from './lock.module.css'

export const AVATAR_FLOWERS: FlowerKind[] = ['taif-rose', 'iris', 'peony', 'jasmine']

const isKind = (v: string): v is FlowerKind => (FLOWER_KINDS as readonly string[]).includes(v)
const isArabic = (t: string) => /[؀-ۿ]/.test(t.trim().charAt(0))

/** Circle avatar: a stage-5 flower (drawn 112%, clipped) or the name's first letter. Decorative — the name sits beside it. */
export function ProfileAvatar({ name, avatar, size = 56, selected }: { name: string; avatar: AvatarSpec; size?: number; selected?: boolean }) {
  const initial = (name.trim().charAt(0) || '؟').toUpperCase()
  return (
    <span className={s.avatar} data-kind={avatar.kind === 'flower' ? 'flower' : 'initial'} data-selected={selected ? '' : undefined} style={{ inlineSize: size, blockSize: size }} aria-hidden="true">
      {avatar.kind === 'flower' && isKind(avatar.flower) ? (
        <span className={s.avatarFlower}>
          <Flower kind={avatar.flower} stage={5} size={Math.round(size * 1.12)} decorative />
        </span>
      ) : (
        <span style={{ fontSize: size * 0.42, fontFamily: isArabic(name) ? 'var(--font-display)' : 'var(--font-numeric)', lineHeight: 1 }}>{initial}</span>
      )}
    </span>
  )
}
