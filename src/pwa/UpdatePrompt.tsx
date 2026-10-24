import { usePwaUpdate } from './state'
import styles from './UpdatePrompt.module.css'

/** Calm, dismissible prompt shown when a new version is waiting. */
export function UpdatePrompt() {
  const { needRefresh, applyUpdate, dismiss } = usePwaUpdate()
  if (!needRefresh) return null
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.card} dir="rtl" lang="ar">
        <span className={styles.text}>فيه تحديث جديد للتطبيق</span>
        <button type="button" className={styles.secondary} onClick={dismiss}>
          بعدين
        </button>
        <button type="button" className={styles.primary} onClick={applyUpdate}>
          حدّثي
        </button>
      </div>
    </div>
  )
}
