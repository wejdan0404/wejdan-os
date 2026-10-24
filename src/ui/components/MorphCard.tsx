import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../icons/Icon'
import { dur, ease, springs } from '../motion'
import styles from './MorphCard.module.css'

export interface MorphCardProps {
  id: string
  title: string
  /** Collapsed card content (below the title). */
  preview?: ReactNode
  /** Expanded detail content. */
  detail: ReactNode
  eyebrow?: string
}

/** Shared-element card → detail: the card itself grows into the detail view (layoutId). */
export function MorphCard({ id, title, preview, detail, eyebrow }: MorphCardProps) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <motion.button
        type="button"
        layoutId={`morph-${id}`}
        className={styles.card}
        onClick={() => setOpen(true)}
        transition={springs.smooth}
        style={{ borderRadius: 20 }}
        aria-expanded={open}
      >
        {eyebrow && <motion.span layoutId={`morph-${id}-eyebrow`} className={styles.eyebrow}>{eyebrow}</motion.span>}
        <motion.span layoutId={`morph-${id}-title`} className={styles.title}>
          {title}
        </motion.span>
        {preview && <span className={styles.preview}>{preview}</span>}
      </motion.button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <div className={styles.layer} key="layer">
              <motion.div
                className={styles.backdrop}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: dur.slow, ease: ease.standard }}
                onClick={() => setOpen(false)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                layoutId={`morph-${id}`}
                className={styles.detail}
                transition={springs.smooth}
                style={{ borderRadius: 32 }}
              >
                <button type="button" className={styles.close} aria-label="سكّري" onClick={() => setOpen(false)}>
                  <Icon name="close" size={20} />
                </button>
                {eyebrow && <motion.span layoutId={`morph-${id}-eyebrow`} className={styles.eyebrow}>{eyebrow}</motion.span>}
                <motion.h2 layoutId={`morph-${id}-title`} className={styles.detailTitle}>
                  {title}
                </motion.h2>
                <motion.div
                  className={styles.detailBody}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.12, duration: dur.slow, ease: ease.enter } }}
                  exit={{ opacity: 0, transition: { duration: dur.quick } }}
                >
                  {detail}
                </motion.div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
