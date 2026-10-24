import type { ReactNode } from 'react'
import styles from './StorageBanner.module.css'

/**
 * App-wide notice when this browser can't keep her data (store.persistent === false). It takes its own
 * row above the app instead of covering the header, and carries the top safe-area so the app below
 * doesn't add it twice.
 */
export function StorageFrame({ unavailable, children }: { unavailable: boolean; children: ReactNode }) {
  if (!unavailable) return <>{children}</>
  return (
    <div className={styles.frame}>
      <div className={styles.banner} role="status">
        <strong className={styles.head}>الحفظ غير متاح في هذا المتصفح — بياناتك مؤقتة</strong>
        <span className={styles.hint}>صدّري نسخة من الإعدادات قبل ما تسكّرين الصفحة.</span>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  )
}
