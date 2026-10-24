import { memo } from 'react'
import { Icon } from '../../icons/Icon'
import type { DomainGlyph } from './lib'

/** Today-area glyph names → the shared outline set (24 grid, 1.5 stroke, round caps). */
const MAP = {
  walk: 'walk',
  heart: 'heart',
  book: 'book',
  home: 'home',
  drop: 'drop',
  moon: 'moon',
  moonFull: 'moon',
  money: 'money',
  sun: 'sun',
  cloudSun: 'cloudSun',
  car: 'car',
  people: 'people',
  play: 'play',
  pause: 'pause',
  stop: 'stop',
  spark: 'sparkle',
  link: 'link',
} as const satisfies Record<DomainGlyph | 'play' | 'pause' | 'stop' | 'cloudSun' | 'moonFull' | 'spark' | 'link', string>

export type GlyphName = keyof typeof MAP

function GlyphImpl({ name, size = 20, label, className }: { name: GlyphName; size?: number; label?: string; className?: string }) {
  return <Icon name={MAP[name]} size={size} label={label} className={className} />
}

/** Memoised: a pure leaf rendered many times per list. */
export const Glyph = memo(GlyphImpl)
