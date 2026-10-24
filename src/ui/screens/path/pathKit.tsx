/** Shared bits for the Path area (local to src/ui/screens/path). */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { kDomainNames, parseDayKey, type CapacityViolation, type DomainId, type Project, type ProjectStatus, type ProjectStep, type TaskItem } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { STAR_PATH } from '../../components/StarMark'
import { dur, ease } from '../../motion'
import styles from './Path.module.css'

export const STATUS_AR: Record<ProjectStatus, string> = {
  idea: 'فكرة',
  active: 'نشط',
  waiting: 'منتظر',
  paused: 'متوقف',
  done: 'خلص',
  archived: 'مؤرشف',
}

export const statusTone = (s: ProjectStatus): 'active' | 'done' | 'neutral' =>
  s === 'active' ? 'active' : s === 'done' ? 'done' : 'neutral'

export const capacityMessage = (v: CapacityViolation[]): string =>
  v.length > 0 ? 'عندك مشاريع نشطة كفاية — وقّفي واحد أو فعّليه على أي حال.' : ''

export const domainName = (d: DomainId | null | undefined): string => (d ? kDomainNames[d]?.[0] ?? '' : '')

const fmtDay = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'long' })
const fmtWeekday = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { weekday: 'long' })

/** «12 نوفمبر» from a day key. */
export const dayLabel = (key: string): string => fmtDay.format(parseDayKey(key))
export const weekdayLabel = (d: Date): string => fmtWeekday.format(d)

/** The id after the last slash of the current hash route (pushed screens have no params). */
export function useRouteTail(): string {
  const { pathname } = useLocation()
  return decodeURIComponent(pathname.split('/').filter(Boolean).pop() ?? '')
}

/** Identity divider: a thread of dots with one star (or plain dots). */
export function StarDivider({ star = true }: { star?: boolean }) {
  return (
    <div className={styles.divider} aria-hidden="true">
      <span className={styles.dots} />
      {star && (
        <>
          <svg width="12" height="12" viewBox="-1 -1 2 2">
            <path d={STAR_PATH} fill="currentColor" />
          </svg>
          <span className={styles.dots} />
        </>
      )}
    </div>
  )
}

export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className={styles.sectionHead}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {action}
    </div>
  )
}

export function StatusTag({ status }: { status: ProjectStatus }) {
  return (
    <span className={styles.status} data-tone={statusTone(status)}>
      {STATUS_AR[status]}
    </span>
  )
}

export function Caret() {
  return (
    <svg className={styles.caret} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

/** Expandable card: the header toggles, the body grows with a layout spring. */
export function ExpandCard({
  id,
  title,
  subtitle,
  status,
  open,
  onToggle,
  children,
}: {
  id: string
  title: string
  subtitle?: ReactNode
  status: ProjectStatus
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  const bodyId = `pc-${id}`
  return (
    <motion.article layout={reduce ? false : 'position'} className={styles.card} data-open={open || undefined} transition={{ duration: dur.slow, ease: ease.standard }}>
      <button type="button" className={styles.cardHead} aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <span className={styles.cardText}>
          <span className={styles.cardTitle}>
            <Bidi>{title}</Bidi>
          </span>
          {subtitle && <span className={styles.cardSub}>{subtitle}</span>}
        </span>
        <StatusTag status={status} />
        <Caret />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={bodyId}
            key="body"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: dur.slow, ease: ease.standard }}
            style={{ overflow: 'hidden' }}
          >
            <div className={styles.cardBody}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

/**
 * The open task that already puts this project step on [dayKey] — «حطيها لليوم» is idempotent:
 * a second tap shows «على يومك» instead of adding a duplicate (QA #15, area 3 #3). Linked by step
 * id; older tasks (before the link existed) match by title.
 */
export function stepTaskOn(tasks: readonly TaskItem[], p: Project, step: ProjectStep, dayKey: string): TaskItem | undefined {
  return tasks.find(
    (t) =>
      t.projectId === p.id &&
      (t.projectStepId === step.id || (t.projectStepId == null && t.title === step.titleAr)) &&
      t.dueDate === dayKey &&
      t.status !== 'cancelled' &&
      t.status !== 'done',
  )
}

/** Fixes one-decimal input like «6,5» / «٦٫٥»: Arabic-Indic digits and separators → number. */
export function parseLocaleNumber(v: string): number {
  const ascii = v
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[٫,]/g, '.')
  return ascii === '' ? NaN : Number(ascii)
}
