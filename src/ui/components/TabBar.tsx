import { motion } from 'framer-motion'
import { Icon, type IconName } from '../icons/Icon'
import { springs } from '../motion'
import styles from './TabBar.module.css'

export interface TabDef {
  key: string
  label: string
  icon: IconName
}

export const TABS: readonly TabDef[] = [
  { key: 'today', label: 'اليوم', icon: 'today' },
  { key: 'habits', label: 'عاداتي', icon: 'habits' },
  { key: 'path', label: 'مساري', icon: 'path' },
  { key: 'joy', label: 'متعتي', icon: 'joy' },
  { key: 'me', label: 'أنا', icon: 'me' },
] as const

export interface TabBarProps {
  active: string
  onSelect: (key: string) => void
  tabs?: readonly TabDef[]
  /** Full-screen covers hide the bar (it slides away and leaves the accessibility tree). */
  hidden?: boolean
}

/** Translucent iOS tab bar; the active glyph fills and a soft dot springs under its label. */
export function TabBar({ active, onSelect, tabs = TABS, hidden }: TabBarProps) {
  return (
    <nav className={styles.bar} aria-label="الأقسام" data-hidden={hidden || undefined} aria-hidden={hidden || undefined} {...(hidden ? { inert: '' } : {})}>
      <div className={styles.material} aria-hidden="true" />
      {/* a11y #13: navigation buttons, not ARIA tabs (no tabpanels / arrow-key model here) */}
      <ul className={styles.list}>
        {tabs.map((t) => {
          const isActive = t.key === active
          return (
            <li key={t.key} className={styles.item}>
              <button
                type="button"
                aria-current={isActive ? 'page' : undefined}
                className={styles.tab}
                data-active={isActive || undefined}
                onClick={() => onSelect(t.key)}
              >
                <span className={styles.glyph}>
                  <Icon name={t.icon} size={24} filled={isActive} />
                </span>
                <span className={styles.label}>{t.label}</span>
                {/* the board puts the active dot under the label */}
                <span className={styles.dotSlot} aria-hidden="true">
                  {isActive && <motion.span layoutId="tab-indicator" className={styles.indicator} transition={springs.snappy} />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
