import { useState } from 'react'
import {
  experimentTemplateOf, kMaxGrowDomains, kMaxMaintainDomains, strengthBand, isCompleteCheck, BLOCKER_EXPERIMENT,
  type Domain, type DomainId, type DomainState, type Experiment, type ExperimentReadout, type ExperimentTemplate,
  type MissReason, type StrengthCandidate,
} from '../../../../domain'
import { Bidi } from '../../../components/Bidi'
import { Chip } from '../../../components/Chip'
import { SegmentedControl } from '../../../components/SegmentedControl'
import { StarMark } from '../../../components/StarMark'
import { nounFor, NOUNS } from '../../../lib/plural'
import { MISS_REASON_AR } from '../../habits/shared'
import { domainName } from '../../path/pathKit'
import me from '../me.module.css'
import { ExperimentResultCard } from './ExperimentResultCard'
import {
  BLOCKER_FEEDS_AR, BLOCKER_FIX_AR, EXPERIMENT_HOW_AR, SCALE_HIGH_AR, SCALE_LOW_AR, STRENGTH_BAND_AR, STRENGTH_ITEMS_AR,
} from './reviewCopy'
import styles from './review.module.css'

const REASONS = Object.keys(MISS_REASON_AR) as MissReason[]

// ---- blockers ---------------------------------------------------------------------------------

export function BlockersStep({ selected, onToggle }: { selected: MissReason[]; onToggle: (r: MissReason) => void }) {
  return (
    <div className={styles.q}>
      <p className={`${me.lede} ${me.pad}`}>ليش ما مشى الحال؟ نعدّل التصميم، مو نلومك. اختاري كل اللي ينطبق.</p>
      <div className={`${me.chips} ${me.pad}`}>
        {REASONS.map((r) => (
          <Chip key={r} selected={selected.includes(r)} onClick={() => onToggle(r)}>
            {MISS_REASON_AR[r]}
          </Chip>
        ))}
      </div>
      {selected.length === 0 ? (
        <p className={me.note}>لو الأسبوع مشى معك، تخطّي بدون ما تختارين شي.</p>
      ) : (
        <ul className={`${styles.fixList} ${me.pad}`} role="list">
          {selected.map((r) => (
            <li key={r} className={styles.fixCard}>
              <span className={styles.fixEyebrow}>اقتراح تعديل وحد · {MISS_REASON_AR[r]}</span>
              <p className={styles.fixText}>{BLOCKER_FIX_AR[r]}</p>
              {BLOCKER_EXPERIMENT[r] ? (
                <span className={styles.fixFeeds}>{BLOCKER_FEEDS_AR.experiment}</span>
              ) : r === 'notImportantNow' ? (
                <span className={styles.fixFeeds}>{BLOCKER_FEEDS_AR.pause}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---- strength check ---------------------------------------------------------------------------

export function StrengthStep({
  candidates, habitId, onHabit, ratings, onRate,
}: {
  candidates: StrengthCandidate[]
  habitId: string
  onHabit: (id: string) => void
  ratings: Record<string, number[]>
  onRate: (habitId: string, index: number, value: number) => void
}) {
  const current = candidates.find((c) => c.habit.id === habitId) ?? candidates[0]
  if (!current) return <p className={me.note}>ما فيه عادات شغّالة للفحص.</p>
  const items = ratings[current.habit.id] ?? []
  const complete = isCompleteCheck(items)
  return (
    <div className={styles.q}>
      <p className={`${me.lede} ${me.pad}`}>4 جمل، 20 ثانية. 1 = ما أوافق أبدًا · 5 = أوافق تمامًا.</p>
      {candidates.length > 1 && (
        <div className={`${me.chips} ${me.pad}`} role="radiogroup" aria-label="العادة اللي نفحصها">
          {candidates.slice(0, 5).map((c) => (
            <Chip key={c.habit.id} role="radio" selected={c.habit.id === current.habit.id} onClick={() => onHabit(c.habit.id)}>
              <Bidi>{c.habit.titleAr}</Bidi>
            </Chip>
          ))}
        </div>
      )}
      <h3 className={`${styles.strengthHabit} ${me.pad}`}>
        <Bidi>{current.habit.titleAr}</Bidi>
      </h3>
      <ol className={`${styles.itemList} ${me.pad}`} role="list">
        {STRENGTH_ITEMS_AR.map((text, i) => (
          <li key={text} className={styles.itemCard}>
            <span className={styles.itemText} id={`sr-${i}`}>{text}</span>
            <div className={styles.scale} role="radiogroup" aria-labelledby={`sr-${i}`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={items[i] === n}
                  className={styles.scaleBtn}
                  data-on={items[i] === n || undefined}
                  onClick={() => onRate(current.habit.id, i, n)}
                >
                  <span className="num">{n}</span>
                </button>
              ))}
            </div>
            <span className={styles.scaleEnds} aria-hidden="true">
              <span>{SCALE_LOW_AR}</span>
              <span>{SCALE_HIGH_AR}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className={me.note} aria-live="polite">
        {complete ? STRENGTH_BAND_AR[strengthBand(items)] : 'لو ما بغيتي تفحصينها الحين، تخطّي. ما ينحفظ إلا الفحص الكامل.'}
      </p>
    </div>
  )
}

// ---- season adjust ----------------------------------------------------------------------------

const STATE_SEGMENTS = [
  { value: 'grow', label: 'نمو' },
  { value: 'maintain', label: 'صيانة' },
  { value: 'rest', label: 'راحة' },
] as const

export function SeasonStep({
  domains, states, onChange, seasonTitle,
}: {
  domains: Domain[]
  states: Partial<Record<DomainId, DomainState>>
  onChange: (id: DomainId, st: DomainState) => void
  seasonTitle: string | null
}) {
  const [refused, setRefused] = useState<{ id: DomainId; st: DomainState } | null>(null)
  const stateOf = (d: Domain) => states[d.id] ?? d.state
  const count = (st: DomainState) => domains.filter((d) => stateOf(d) === st).length
  const grow = count('grow')
  const maintain = count('maintain')
  const change = (d: Domain, st: DomainState) => {
    const next = (x: DomainState) => count(x) + (stateOf(d) === x ? 0 : st === x ? 1 : 0)
    if ((st === 'grow' && next('grow') > kMaxGrowDomains) || (st === 'maintain' && next('maintain') > kMaxMaintainDomains)) {
      setRefused({ id: d.id, st })
      return
    }
    setRefused(null)
    onChange(d.id, st)
  }
  return (
    <div className={styles.q}>
      <p className={`${me.lede} ${me.pad}`}>
        أنمّي <span className="num">{kMaxGrowDomains}</span> بالكثير · أحافظ <span className="num">{kMaxMaintainDomains}</span> · والباقي يرتاح.
        {seasonTitle ? <> الموسم: <Bidi>{seasonTitle}</Bidi>.</> : null}
      </p>
      <div className={`${styles.counters} ${me.pad}`} aria-live="polite">
        <span>نمو <bdi dir="ltr" className="num">{grow}/{kMaxGrowDomains}</bdi></span>
        <span>صيانة <bdi dir="ltr" className="num">{maintain}/{kMaxMaintainDomains}</bdi></span>
      </div>
      <ul className={`${styles.domainList} ${me.pad}`} role="list">
        {domains.map((d) => {
          const name = domainName(d.id) || d.nameAr
          return (
            <li key={d.id} className={styles.domainRow}>
              <span className={styles.domainName}><Bidi>{name}</Bidi></span>
              <SegmentedControl<DomainState> label={`حالة ${name}`} segments={STATE_SEGMENTS} value={stateOf(d)} onChange={(v) => change(d, v)} />
              {refused?.id === d.id && (
                <p className={styles.refuse} role="status">
                  {refused.st === 'grow' ? 'ثلاثة مجالات للنمو بالكثير. خلّي واحد منها للصيانة أول.' : 'خمسة مجالات للصيانة بالكثير. خلّي واحد منها يرتاح أول.'}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---- experiment -------------------------------------------------------------------------------

export function ExperimentStep({
  readout, suggestions, pick, onPick, preferred, busy, onDecide,
}: {
  readout: ExperimentReadout | null
  suggestions: Experiment[]
  pick: string | null
  onPick: (id: string | null) => void
  preferred: ExperimentTemplate | null
  busy: boolean
  onDecide: (keep: boolean) => void
}) {
  return (
    <div className={styles.q}>
      <p className={`${me.lede} ${me.pad}`}>نغيّر شي واحد بس ونقيس الإنجاز والمتعة. القرار بعدها لك.</p>
      {readout ? (
        <div className={me.pad}>
          <ExperimentResultCard readout={readout} busy={busy} onDecide={onDecide} />
        </div>
      ) : suggestions.length === 0 ? (
        <p className={me.note}>لما يصير عندك عادة شغّالة، نقترح لك تجربة هنا.</p>
      ) : (
        <>
          <div className={`${styles.expPick} ${me.pad}`} role="radiogroup" aria-label="تجربة الأسبوع">
            {suggestions.map((e) => {
              const t = experimentTemplateOf(e)
              const on = pick === e.id
              return (
                <button key={e.id} type="button" role="radio" aria-checked={on} className={styles.expOption} data-on={on || undefined} onClick={() => onPick(e.id)}>
                  <span className={styles.expOptionHead}>
                    <Bidi>{e.titleAr}</Bidi>
                    {t && t === preferred && <span className={styles.expTag}>من اللي عطّلك</span>}
                  </span>
                  {t && <span className={styles.expOptionBody}>{EXPERIMENT_HOW_AR[t]}</span>}
                </button>
              )
            })}
            <button type="button" role="radio" aria-checked={pick === null} className={styles.expOption} data-on={pick === null || undefined} onClick={() => onPick(null)}>
              <span className={styles.expOptionHead}>بدون تجربة هالأسبوع</span>
            </button>
          </div>
          <p className={me.note}>أسبوع واحد يعطي إشارة، مو حكم نهائي.</p>
        </>
      )}
    </div>
  )
}

// ---- chapter card -----------------------------------------------------------------------------

export function ChapterCard({
  chapter, title, wins, comebacks, lessons, sparks,
}: {
  chapter: number
  title: string
  wins: number
  comebacks: number
  lessons: string[]
  sparks?: number
}) {
  const bits: string[] = []
  if (wins > 0) bits.push(wins === 1 ? 'إنجاز واحد' : wins === 2 ? 'إنجازين' : `${wins} ${wins <= 10 ? 'إنجازات' : 'إنجاز'}`)
  if (comebacks > 0) bits.push(comebacks === 1 ? 'رجعة وحدة بعد غياب' : comebacks === 2 ? 'رجعتين بعد غياب' : `${comebacks} رجعات بعد غياب`)
  return (
    <section className={styles.chapter} aria-label={`بطاقة الفصل ${chapter}`}>
      <span className={styles.chapterEyebrow}>
        الفصل <span className="num">{chapter}</span>
      </span>
      {title.trim() && <h3 className={styles.chapterTitle}><Bidi>{title.trim()}</Bidi></h3>}
      {bits.length > 0 && <p className={styles.chapterBits}>{bits.join(' · ')}</p>}
      {lessons.length > 0 && <p className={styles.chapterBits}>عطّلك: {lessons.join('، ')}</p>}
      {sparks != null && sparks > 0 && (
        <span className={styles.chapterSparks}>
          <StarMark size={10} color="var(--brand-primary)" />
          <bdi dir="ltr" className="num">+{sparks}</bdi> {nounFor(sparks, NOUNS.spark)} للمراجعة
        </span>
      )}
    </section>
  )
}
