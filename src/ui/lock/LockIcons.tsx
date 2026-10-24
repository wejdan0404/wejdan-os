import type { ReactNode, SVGProps } from 'react'

export type LockIconName = 'eye' | 'eyeOff' | 'copy' | 'key' | 'clock' | 'file' | 'info' | 'x' | 'lock' | 'shield' | 'alert' | 'trash' | 'check' | 'users' | 'plus'

const P: Record<LockIconName, ReactNode> = {
  eye: (<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.75" /></>),
  eyeOff: (<><path d="M4.5 4.5l15 15" /><path d="M9.9 6a9.8 9.8 0 0 1 2.1-.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.4M6.5 7.6A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.3 0 2.5-.3 3.5-.8" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>),
  copy: (<><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" /></>),
  key: (<><circle cx="8" cy="15.5" r="3.75" /><path d="M10.7 12.8 19.5 4M16 7.5l2.5 2.5M13.5 10l1.75 1.75" /></>),
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  file: (<><path d="M7 3.5h6.5L18.5 8.5v11a1 1 0 0 1-1 1h-10.5a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z" /><path d="M13.5 3.5v5h5" /></>),
  info: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></>),
  x: <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />,
  lock: (<><rect x="5.5" y="10.5" width="13" height="9.5" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>),
  shield: <path d="M12 3.75 5.25 6v5.25c0 4.1 2.9 7.6 6.75 9 3.85-1.4 6.75-4.9 6.75-9V6L12 3.75Z" />,
  alert: (<><path d="M12 4 3 19.5h18L12 4Z" /><path d="M12 10v4.5M12 17h.01" /></>),
  trash: (<><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" /><path d="M10 11v6M14 11v6" /></>),
  check: <path d="m5.5 12.5 4.25 4.25L18.5 7.5" />,
  users: (<><circle cx="9" cy="9" r="3.25" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.9a3.25 3.25 0 0 1 0 6.2M17.5 14.2A5.5 5.5 0 0 1 20.5 19" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
}

export function LIcon({ name, size = 20, ...rest }: { name: LockIconName; size?: number } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flexShrink: 0 }} {...rest}>
      {P[name]}
    </svg>
  )
}
