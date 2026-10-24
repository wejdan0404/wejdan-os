import { memo } from 'react'
import type { SVGProps } from 'react'

/** Outline icons — 24 grid, 1.5 stroke, round caps (identity iconography rules). */
export type IconName =
  | 'today'
  | 'habits'
  | 'path'
  | 'joy'
  | 'me'
  | 'chevron'
  | 'back'
  | 'check'
  | 'plus'
  | 'later'
  | 'close'
  | 'moon'
  | 'sun'
  | 'inbox'
  | 'settings'
  | 'more'
  | 'drop'
  | 'book'
  | 'walk'
  | 'undo'
  | 'trash'
  // shared set extended in the integration pass (was duplicated in area folders)
  | 'money'
  | 'home'
  | 'help'
  | 'phone'
  | 'products'
  | 'evidence'
  | 'insights'
  | 'import'
  | 'export'
  | 'data'
  | 'review'
  | 'shield'
  | 'bell'
  | 'theme'
  | 'calendar'
  | 'lock'
  | 'restore'
  | 'play'
  | 'pause'
  | 'stop'
  | 'edit'
  | 'grip'
  | 'up'
  | 'down'
  | 'skip'
  | 'recover'
  | 'sparkle'
  | 'heart'
  | 'car'
  | 'people'
  | 'cloudSun'
  | 'link'
  | 'alert'

const paths: Record<IconName, JSX.Element> = {
  today: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.75v2M12 19.25v2M4.75 12h-2M21.25 12h-2M6.87 6.87 5.46 5.46M18.54 18.54l-1.41-1.41M6.87 17.13l-1.41 1.41M18.54 5.46l-1.41 1.41" />
    </>
  ),
  habits: (
    <>
      <path d="M5.25 18.75C5.25 10.5 10.5 5.25 18.75 5.25c0 8.25-5.25 13.5-13.5 13.5Z" />
      <path d="M5.25 18.75 13 11" />
    </>
  ),
  path: (
    <>
      <circle cx="6" cy="18.25" r="2" />
      <circle cx="18" cy="5.75" r="2" />
      <path d="M8 18.25h7.25a3.25 3.25 0 0 0 0-6.5h-6.5a3.25 3.25 0 0 1 0-6.5H16" />
    </>
  ),
  joy: (
    <>
      <path d="M5.5 9.25h11v4.5a5.5 5.5 0 0 1-11 0Z" />
      <path d="M16.5 10.5h1a2.25 2.25 0 0 1 0 4.5h-1.2" />
      <path d="M8.5 3.75c-.6.8-.6 1.7 0 2.5M12 3.75c-.6.8-.6 1.7 0 2.5" />
      <path d="M4.5 21h13" />
    </>
  ),
  me: (
    <>
      <circle cx="12" cy="8.25" r="3.75" />
      <path d="M4.75 20.25c.9-3.4 3.8-5.25 7.25-5.25s6.35 1.85 7.25 5.25" />
    </>
  ),
  chevron: <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  back: <path d="m14.5 5 -7 7 7 7" />,
  check: <path d="m5.5 12.5 4.25 4.25L18.5 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  later: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.75V12l2.75 2.25" />
    </>
  ),
  close: <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />,
  moon: <path d="M19.5 14.6A7.75 7.75 0 0 1 9.4 4.5a7.75 7.75 0 1 0 10.1 10.1Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3.5v1.5M12 19v1.5M3.5 12H5M19 12h1.5" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.75 13.25 6.2 5.6A1.5 1.5 0 0 1 7.63 4.5h8.74a1.5 1.5 0 0 1 1.43 1.1l2.45 7.65" />
      <path d="M3.75 13.25v4.5c0 .97.78 1.75 1.75 1.75h13a1.75 1.75 0 0 0 1.75-1.75v-4.5h-4.5l-1.25 2.5h-5l-1.25-2.5Z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.9-1.5-1.9-3.3-2.3.9a7.5 7.5 0 0 0-2.6-1.5L14.1 2.7h-3.8L9.9 5.1a7.5 7.5 0 0 0-2.6 1.5L5 5.7 3.1 9l1.9 1.5a7.6 7.6 0 0 0 0 3L3.1 15l1.9 3.3 2.3-.9a7.5 7.5 0 0 0 2.6 1.5l.4 2.4h3.8l.4-2.4a7.5 7.5 0 0 0 2.6-1.5l2.3.9 1.9-3.3Z" />
    </>
  ),
  more: (
    <>
      <circle cx="6" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="18" cy="12" r="1" />
    </>
  ),
  drop: <path d="M12 3.5s-6 6.4-6 10.75a6 6 0 0 0 12 0C18 9.9 12 3.5 12 3.5Z" />,
  book: (
    <>
      <path d="M4.75 5.25A1.5 1.5 0 0 1 6.25 3.75H19.25v14.5H6.25a1.5 1.5 0 0 0-1.5 1.5Z" />
      <path d="M4.75 19.75a1.5 1.5 0 0 0 1.5 1.5h13" />
    </>
  ),
  walk: (
    <>
      <circle cx="13" cy="4.5" r="1.75" />
      <path d="m9 21 2.5-6.5 3 2.5V21M8 11.5l2.5-3.5 3 1 2 3 2.5.5M11.5 14.5 12.5 9" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14.5 4.5 10 9 5.5" />
      <path d="M4.5 10h10a5 5 0 0 1 0 10H11" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 6.75h15M9.75 6.75V4.5h4.5v2.25" />
      <path d="m6.25 6.75.85 12.1a1.5 1.5 0 0 0 1.5 1.4h6.8a1.5 1.5 0 0 0 1.5-1.4l.85-12.1" />
    </>
  ),
  money: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.25" />
      <path d="M6.75 9.75v4.5M17.25 9.75v4.5" />
    </>
  ),
  home: <path d="M4.5 10.5 12 4.5l7.5 6V19a1 1 0 0 1-1 1h-4v-5.25h-5V20h-4a1 1 0 0 1-1-1v-8.5Z" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.75v5M12 16.25h.01" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M9.75 9.5a2.3 2.3 0 0 1 4.5.6c0 1.6-2.25 2-2.25 3.4M12 16.5h.01" />
    </>
  ),
  phone: <path d="M7.4 3.75H5.25a1.5 1.5 0 0 0-1.5 1.6c.6 8.2 6.7 14.3 14.9 14.9a1.5 1.5 0 0 0 1.6-1.5v-2.15a1.5 1.5 0 0 0-1.1-1.45l-2.6-.75a1.5 1.5 0 0 0-1.5.4l-1.1 1.1a12 12 0 0 1-5.6-5.6l1.1-1.1a1.5 1.5 0 0 0 .4-1.5l-.75-2.6a1.5 1.5 0 0 0-1.45-1.1Z" />,
  products: (
    <>
      <path d="M9.5 3.5h5v3h-5z" />
      <path d="M8.5 6.5h7a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19V8a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M7 12h10" />
    </>
  ),
  evidence: (
    <>
      <path d="M5.25 4.5h9.75l3.75 3.75V19.5H5.25z" />
      <path d="M15 4.5v3.75h3.75M8.25 12h7.5M8.25 15.75h4.5" />
    </>
  ),
  insights: <path d="M4.5 19.5V9.75M9.5 19.5V4.5M14.5 19.5v-6.75M19.5 19.5v-9.75" />,
  import: (
    <>
      <path d="M12 3.75v10.5M8.25 10.5 12 14.25l3.75-3.75" />
      <path d="M4.5 15.75v2.25a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-2.25" />
    </>
  ),
  export: (
    <>
      <path d="M12 14.25V3.75M8.25 7.5 12 3.75l3.75 3.75" />
      <path d="M4.5 15.75v2.25a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-2.25" />
    </>
  ),
  data: (
    <>
      <ellipse cx="12" cy="6" rx="7.5" ry="2.75" />
      <path d="M4.5 6v12c0 1.5 3.4 2.75 7.5 2.75s7.5-1.25 7.5-2.75V6M4.5 12c0 1.5 3.4 2.75 7.5 2.75S19.5 13.5 19.5 12" />
    </>
  ),
  review: (
    <>
      <rect x="4.5" y="5.25" width="15" height="15" rx="2.5" />
      <path d="M8.25 3.75v3M15.75 3.75v3M4.5 9.75h15M9 14.25l2 2 4-4" />
    </>
  ),
  shield: <path d="M12 3.75 5.25 6v5.25c0 4.1 2.9 7.6 6.75 9 3.85-1.4 6.75-4.9 6.75-9V6L12 3.75Z" />,
  bell: <path d="M6.75 16.5V11a5.25 5.25 0 0 1 10.5 0v5.5l1.5 1.5H5.25l1.5-1.5ZM10 20.25a2 2 0 0 0 4 0" />,
  theme: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 3.75v16.5a8.25 8.25 0 0 0 0-16.5Z" fill="currentColor" stroke="none" />
    </>
  ),
  calendar: (
    <>
      <rect x="4.5" y="5.25" width="15" height="15" rx="2.5" />
      <path d="M8.25 3.75v3M15.75 3.75v3M4.5 9.75h15" />
    </>
  ),
  lock: (
    <>
      <rect x="5.25" y="10.5" width="13.5" height="9.75" rx="2" />
      <path d="M8.25 10.5V7.5a3.75 3.75 0 0 1 7.5 0v3" />
    </>
  ),
  restore: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9" />
      <path d="M4.5 4.5V9H9" />
    </>
  ),
  play: <path d="M8.5 6.2v11.6c0 .6.6.9 1.1.6l8.6-5.8a.7.7 0 0 0 0-1.2L9.6 5.6c-.5-.3-1.1 0-1.1.6Z" />,
  pause: <path d="M9 6.5v11M15 6.5v11" />,
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2" />,
  edit: (
    <>
      <path d="m14.5 6 3.5 3.5" />
      <path d="M5 19l.6-3.6L15.9 5.1a1.6 1.6 0 0 1 2.3 0l.7.7a1.6 1.6 0 0 1 0 2.3L8.6 18.4 5 19Z" />
    </>
  ),
  grip: <path d="M9 7h.01M15 7h.01M9 12h.01M15 12h.01M9 17h.01M15 17h.01" strokeWidth={2.4} />,
  up: <path d="m6.5 14.5 5.5-5.5 5.5 5.5" />,
  down: <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  skip: (
    <>
      <path d="M6 7l6 5-6 5V7Z" />
      <path d="M17.5 7v10" />
    </>
  ),
  recover: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4.5 4.5v3.7h3.7" />
    </>
  ),
  sparkle: <path d="M12 4c.3 4.6 3.4 7.7 8 8-4.6.3-7.7 3.4-8 8-.3-4.6-3.4-7.7-8-8 4.6-.3 7.7-3.4 8-8Z" />,
  heart: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
  car: (
    <>
      <path d="M5 16V11l2-5h10l2 5v5" />
      <path d="M3 16h18v2H3z" />
      <circle cx="7.5" cy="13" r=".8" />
      <circle cx="16.5" cy="13" r=".8" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
    </>
  ),
  cloudSun: (
    <>
      <path d="M12 3v1.5M5.6 5.6l1 1M3 12h1.5M17.4 6.6l1-1" />
      <path d="M8 12a4 4 0 0 1 7.5-1.9" />
      <path d="M17.5 21H9a4 4 0 1 1 .8-7.9A5 5 0 0 1 19 15a3 3 0 0 1-1.5 6Z" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
    </>
  ),
}

/** Icons that point in a reading direction and must mirror in RTL. */
const mirrored: ReadonlySet<IconName> = new Set<IconName>(['chevron', 'back', 'undo'])

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  /** Accessible label. When omitted the icon is decorative. */
  label?: string
  /** Filled glyph (active tab). */
  filled?: boolean
}

function IconImpl({ name, size = 24, label, filled, style, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.22 : undefined}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={{ flexShrink: 0, ...(mirrored.has(name) ? { transform: 'var(--mirror, scaleX(-1))' } : null), ...style }}
      {...rest}
    >
      {paths[name]}
    </svg>
  )
}

/** Memoised: a pure leaf rendered many times per list. */
export const Icon = memo(IconImpl)
