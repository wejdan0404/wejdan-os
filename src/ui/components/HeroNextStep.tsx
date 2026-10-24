import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { springs } from '../motion'
import { Button } from './Button'
import styles from './HeroNextStep.module.css'

export interface HeroNextStepProps {
  eyebrow?: string
  title: string
  meta?: ReactNode
  why?: string
  primaryLabel?: string
  secondaryLabel?: string
  onPrimary?: () => void
  onSecondary?: () => void
  onOpen?: () => void
  /** Shared-element id so the card morphs into its detail screen. */
  layoutId?: string
}

/** The one hero on Today: «خطوتك الجاية». The only element on the screen allowed Glow/Hero. */
export function HeroNextStep({
  eyebrow = 'خطوتك الجاية',
  title,
  meta,
  why,
  primaryLabel = 'ابدئي',
  secondaryLabel = 'بعدين',
  onPrimary,
  onSecondary,
  onOpen,
  layoutId,
}: HeroNextStepProps) {
  return (
    <motion.article layoutId={layoutId} transition={springs.smooth} className={styles.hero}>
      <span className={styles.glow} aria-hidden="true" />
      <button type="button" className={styles.body} onClick={onOpen} disabled={!onOpen}>
        <span className={styles.eyebrow}>
          {eyebrow}
        </span>
        <motion.span layoutId={layoutId ? `${layoutId}-title` : undefined} className={styles.title}>
          {title}
        </motion.span>
        {meta && <span className={styles.meta}>{meta}</span>}
        {why && <span className={styles.why}>{why}</span>}
      </button>
      <div className={styles.actions}>
        <Button variant="primary" onClick={onPrimary}>
          {primaryLabel}
        </Button>
        <Button variant="plain" onClick={onSecondary}>
          {secondaryLabel}
        </Button>
      </div>
    </motion.article>
  )
}
