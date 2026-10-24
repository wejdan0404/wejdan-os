import { useState } from 'react'
import { kLifeMapCaps, lifeMapChoose, lifeMapCounts, type Domain, type DomainState, type LifeMap, type LifeMapBlock } from '../../../domain'
import { Icon } from '../../icons/Icon'
import styles from './Onboarding.module.css'
import m from './lifeMap.module.css'

const TIERS: { value: DomainState; label: string }[] = [
  { value: 'grow', label: 'نمو' },
  { value: 'maintain', label: 'صيانة' },
  { value: 'rest', label: 'راحة' },
]
const NOTES: Record<'' | LifeMapBlock, string> = {
  '': 'النمو = تركيز هذا الموسم. الراحة مو إهمال — إيقاف مؤقت، ويختفي من يومك.',
  grow: 'ثلاثة مجالات نمو كفاية لموسم واحد. انقلي واحد للصيانة أولًا، وبعدها اختاري الجديد.',
  maintain: 'الصيانة خفيفة بس لها حد: خمسة مجالات. خلي واحد يرتاح هذا الموسم.',
}

/** Onboarding step 2 of the board: every domain «نمو · صيانة · راحة», caps 3 / 5, nothing changes silently. */
export function LifeMapStep({ domains, map, onChange }: { domains: readonly Domain[]; map: LifeMap; onChange: (m: LifeMap) => void }) {
  const [blocked, setBlocked] = useState<'' | LifeMapBlock>('')
  const c = lifeMapCounts(map)
  const choose = (id: Domain['id'], to: DomainState) => {
    const r = lifeMapChoose(map, id, to)
    setBlocked(r.blocked ?? '')
    if (!r.blocked) onChange(r.map)
  }
  return (
    <div className={styles.step}>
      <h1 className={styles.h1}>خريطة حياتك لهذا الموسم</h1>
      <p className={styles.lede}>
        الموسم من <span className="num">6</span> إلى <span className="num">12</span> أسبوع. اختاري لكل مجال: نمو، صيانة، أو راحة.
      </p>
      <div className={m.counters} aria-live="polite">
        <div className={m.counter} data-full={c.grow >= kLifeMapCaps.grow || undefined}>
          <span className={m.counterLabel}>نمو</span>
          <span className={m.counterValue}>
            <bdi>{c.grow}</bdi> من <bdi>{kLifeMapCaps.grow}</bdi>
          </span>
        </div>
        <div className={m.counter} data-full={c.maintain >= kLifeMapCaps.maintain || undefined}>
          <span className={m.counterLabel}>صيانة</span>
          <span className={m.counterValue}>
            <bdi>{c.maintain}</bdi> من <bdi>{kLifeMapCaps.maintain}</bdi>
          </span>
        </div>
        <div className={m.counter}>
          <span className={m.counterLabel}>راحة</span>
          <span className={m.counterValue}>
            <bdi>{c.rest}</bdi>
          </span>
        </div>
      </div>
      <p className={m.note} data-warn={blocked ? '' : undefined} role={blocked ? 'status' : undefined}>
        <Icon name="help" size={20} style={{ flex: 'none', marginBlockStart: 2 }} />
        <span>{NOTES[blocked]}</span>
      </p>
      <ul className={m.list}>
        {domains.map((d) => (
          <li key={d.id} className={m.row}>
            <span className={m.name}>{d.nameAr}</span>
            <div className={m.opts} role="group" aria-label={`حالة ${d.nameAr}`}>
              {TIERS.map((t) => (
                <button key={t.value} type="button" className={m.opt} data-tier={t.value} aria-pressed={map[d.id] === t.value} onClick={() => choose(d.id, t.value)}>
                  {t.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className={m.foot}>صحة المرأة وتتبّع الدورة مقفلة افتراضيًا — تقدرين تفعّلينها من الإعدادات.</p>
    </div>
  )
}
