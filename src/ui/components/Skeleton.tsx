import styles from './Skeleton.module.css'

/** Loading placeholder — a gentle 500 ms breath, static under reduced motion. */
export function Skeleton({ width = '100%', height = 16, radius = 6 }: { width?: number | string; height?: number; radius?: number }) {
  return <span className={styles.sk} style={{ width, height, borderRadius: radius }} aria-hidden="true" />
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className={styles.rows} role="status" aria-label="لحظة، نجهّز لك">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.row}>
          <Skeleton width={28} height={28} radius={999} />
          <div className={styles.lines}>
            <Skeleton width={`${70 - i * 12}%`} />
            <Skeleton width="40%" height={12} />
          </div>
        </div>
      ))}
    </div>
  )
}
