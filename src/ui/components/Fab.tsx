import { motion } from 'framer-motion'
import { Icon } from '../icons/Icon'
import { springs } from '../motion'
import styles from './Fab.module.css'

export function Fab({ label = 'إضافة سريعة', onClick }: { label?: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      className={styles.fab}
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={springs.snappy}
    >
      <Icon name="plus" size={26} strokeWidth={2} />
    </motion.button>
  )
}
