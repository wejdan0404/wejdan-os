/**
 * «أولوياتك هالأسبوع» — the top 3 she picked in this week's review, shown where she plans
 * (Path) so the review's answer is actually used (QA area 5 #6). Nothing renders when this
 * week has no review or no priorities. Read-only; «عدّليها» reopens the review.
 */
import { useNavigate } from 'react-router-dom'
import { dayKey, startOfWeek } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { useLife, useToday } from '../../state/LifeStore'

export function WeekPriorities() {
  const s = useLife()
  const today = useToday()
  const navigate = useNavigate()
  const weekKey = dayKey(startOfWeek(today, s.settings.weekStartsOn))
  const review = s.weeklyReviews.find((r) => r.id === weekKey)
  const top = (review?.top3 ?? []).map((t) => t.trim()).filter((t) => t !== '')
  if (top.length === 0) return null
  return (
    <InsetGroupedList
      header="أولوياتك هالأسبوع"
      headerAction={
        <button
          type="button"
          onClick={() => navigate('/review')}
          style={{ border: 0, background: 'none', color: 'var(--text-accent)', font: 'inherit', minBlockSize: 44, cursor: 'pointer' }}
        >
          عدّليها
        </button>
      }
      footer="اخترتيها بالمراجعة الأسبوعية — ما تنضاف ليومك إلا إذا أضفتيها."
    >
      {top.map((t, i) => (
        <ListRow
          key={`${i}:${t}`}
          leading={
            <span className="num" aria-hidden="true" style={{ color: 'var(--text-accent)', fontWeight: 600 }}>
              {i + 1}
            </span>
          }
          title={<Bidi>{t}</Bidi>}
        />
      ))}
    </InsetGroupedList>
  )
}
