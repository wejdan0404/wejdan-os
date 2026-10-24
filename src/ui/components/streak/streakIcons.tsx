import type { SVGProps } from 'react'

/** Small outline icons for the streak + reminders screens (24 grid, 1.5 stroke, round caps — same set rules as Icon). */
type P = SVGProps<SVGSVGElement> & { size?: number }
const base = (size: number, p: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
  ...p,
})

/** The compensation arc: a quiet arrow turning back on itself. */
export const ArcIcon = ({ size = 16, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M4 12a8 8 0 1 0 2.6-5.9" />
    <path d="M4 4.5v4h4" />
  </svg>
)
export const ClockIcon = ({ size = 20, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)
export const RepeatIcon = ({ size = 20, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M17 3.5l3 3-3 3" />
    <path d="M4 11V9.5a3 3 0 0 1 3-3h13" />
    <path d="M7 20.5l-3-3 3-3" />
    <path d="M20 13v1.5a3 3 0 0 1-3 3H4" />
  </svg>
)
export const FileIcon = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M14 3v4h4" />
  </svg>
)
export const ShareIcon = ({ size = 20, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 15V3.5" />
    <path d="M8 7l4-4 4 4" />
    <path d="M6 11H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1" />
  </svg>
)
