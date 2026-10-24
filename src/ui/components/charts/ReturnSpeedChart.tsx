import { useState } from 'react'
import { useWidth } from './useWidth'
import styles from './charts.module.css'

export interface ReturnPoint {
  label: string
  /** Mean days to return; null = no miss that week. */
  days: number | null
}

const H = 150
const LABEL_H = 22
const PAD_T = 22
const PAD_B = 8
const PAD_X = 24

/** Line of "days to come back" per week. Lower is better; the baseline is zero. RTL: oldest week on the right. */
export function ReturnSpeedChart({ points }: { points: ReturnPoint[] }) {
  const [ref, w] = useWidth(300)
  const [table, setTable] = useState(false)
  const max = Math.max(2, Math.ceil(Math.max(0, ...points.map((p) => p.days ?? 0))))
  const ticks = Array.from({ length: max + 1 }, (_, i) => i).filter((i) => max <= 4 || i % 2 === 0)
  const plotH = H - PAD_T - PAD_B
  const y = (v: number) => PAD_T + plotH - (v / max) * plotH
  const n = points.length
  const x = (i: number) => (n === 1 ? w / 2 : w - PAD_X - (i * (w - 2 * PAD_X)) / (n - 1)) // i = 0 is the oldest, on the right
  // consecutive known points form line segments; a week without a miss breaks the line
  const segs: string[] = []
  let cur = ''
  points.forEach((p, i) => {
    if (p.days == null) {
      if (cur) segs.push(cur)
      cur = ''
    } else cur += `${cur ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.days).toFixed(1)}`
  })
  if (cur) segs.push(cur)
  const desc = points.map((p) => `${p.label}: ${p.days == null ? 'ما فيه غياب' : `${p.days.toFixed(1)} يوم`}`).join('، ')
  return (
    <div className={styles.chart}>
      {table ? (
        <table className={styles.table}>
          <caption className={styles.srOnly}>سرعة الرجوع بالأيام</caption>
          <tbody>
            {points.map((p) => (
              <tr key={p.label}>
                <th scope="row">{p.label}</th>
                <td>{p.days == null ? 'ما فيه غياب' : <bdi dir="ltr" className="num">{p.days.toFixed(1)}</bdi>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div ref={ref} className={styles.lineWrap}>
          <svg width={w} height={H + LABEL_H} role="img" aria-label={`سرعة الرجوع بالأيام. ${desc}`} className={styles.lineSvg}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD_X - 8} x2={w - PAD_X + 8} y1={y(t)} y2={y(t)} className={t === 0 ? styles.baseline : styles.grid} />
                <text x={w - 2} y={y(t) + 4} textAnchor="end" className={styles.axisText}>{t}</text>
              </g>
            ))}
            {segs.map((d) => (
              <path key={d} d={d} className={styles.line} fill="none" />
            ))}
            {points.map((p, i) =>
              p.days == null ? (
                <text key={p.label} x={x(i)} y={y(0) - 8} textAnchor="middle" className={styles.axisText}>بدون غياب</text>
              ) : (
                <g key={p.label}>
                  <circle cx={x(i)} cy={y(p.days)} r={5} className={styles.dot} />
                  <text x={x(i)} y={y(p.days) - 11} textAnchor="middle" className={styles.valText}>{Number.isInteger(p.days) ? p.days : p.days.toFixed(1)}</text>
                </g>
              ),
            )}
            {points.map((p, i) => (
              <text key={`x-${p.label}`} x={x(i)} y={H + 14} textAnchor="middle" className={styles.axisText}>{p.label}</text>
            ))}
          </svg>
        </div>
      )}
      <button type="button" className={styles.toggle} onClick={() => setTable((v) => !v)} aria-pressed={table}>
        {table ? 'الرسم' : 'جدول'}
      </button>
    </div>
  )
}
