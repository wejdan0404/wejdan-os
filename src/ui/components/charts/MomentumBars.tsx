import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { Bidi } from '../Bidi'
import { springs } from '../../motion'
import { useWidth } from './useWidth'
import styles from './charts.module.css'

export interface MomentumRow {
  id: string
  name: string
  /** 0–100 */
  value: number
  resting: boolean
}

/** Horizontal bars, one hue, 0–100 scale. A resting domain says «ترتاح» — never a zero. */
function BarRow({ r, reduce }: { r: MomentumRow; reduce: boolean }) {
  const [ref, w] = useWidth(180)
  const pct = r.resting ? 2 : Math.max(2, Math.min(100, r.value))
  const fw = Math.max(8, (w * pct) / 100)
  const label = r.resting ? 'ترتاح' : `${Math.round(r.value)} من 100`
  return (
    <li className={styles.barRow} aria-label={`${r.name}: ${label}`}>
      <span className={styles.barName}><Bidi>{r.name}</Bidi></span>
      <div ref={ref} className={styles.barBox}>
        <svg width={w} height={10} aria-hidden="true" focusable="false" className={styles.barSvg}>
          <rect x={0} y={0} width={w} height={10} rx={4} className={styles.track} />
          <line x1={w / 2} x2={w / 2} y1={0} y2={10} className={styles.tick} />
          {/* RTL: the bar grows from the inline start (right edge); a 2px surface gap would only matter when stacked */}
          <motion.g
            style={{ transformOrigin: `${w}px 5px` }}
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={reduce ? { duration: 0 } : springs.smooth}
          >
            <rect x={w - fw} y={0} width={fw} height={10} rx={4} className={styles.fill} data-resting={r.resting || undefined} />
          </motion.g>
        </svg>
      </div>
      <span className={styles.barVal}>{r.resting ? 'ترتاح' : <bdi dir="ltr" className="num">{Math.round(r.value)}</bdi>}</span>
    </li>
  )
}

/** Horizontal bars, one hue, 0–100 scale. A resting domain says «ترتاح» — never a zero. */
export function MomentumBars({ rows }: { rows: MomentumRow[] }) {
  const reduce = !!useReducedMotion()
  const [table, setTable] = useState(false)
  return (
    <div className={styles.chart}>
      {table ? (
        <table className={styles.table}>
          <caption className={styles.srOnly}>الزخم حسب المجال</caption>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row"><Bidi>{r.name}</Bidi></th>
                <td>{r.resting ? 'ترتاح' : <bdi dir="ltr" className="num">{Math.round(r.value)}</bdi>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul className={styles.bars} role="list">
          {rows.map((r) => (
            <BarRow key={r.id} r={r} reduce={reduce} />
          ))}
        </ul>
      )}
      {!table && (
        <div className={styles.scaleInner} aria-hidden="true">
          <span className="num">0</span>
          <span className="num">50</span>
          <span className="num">100</span>
        </div>
      )}
      <button type="button" className={styles.toggle} onClick={() => setTable((v) => !v)} aria-pressed={table}>
        {table ? 'الرسم' : 'جدول'}
      </button>
    </div>
  )
}
