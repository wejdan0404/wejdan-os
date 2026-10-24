import {
  JOY_SIZE_ORDER,
  joyMapGroups,
  joysThatCostMoney,
  type JoyItem,
  type JoySize,
  type LifeSnapshot,
} from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Chip } from '../../components/Chip'
import { Icon } from '../../icons/Icon'
import { SIZE_LABEL } from './joyModel'
import styles from './joyMap.module.css'

const SIZE_HINT: Record<JoySize, string> = { quick: 'أقل من 15 د', medium: '', big: '' }

export interface JoyMapProps {
  s: LifeSnapshot
  /** Today's joy id — marked «اليوم». */
  todayId?: string | null
  onEdit: (j: JoyItem) => void
  onAdd: (size: JoySize) => void
}

/** «خريطة متعتي»: her joys by effort. Chips open the existing editor; empty groups invite a first one. */
export function JoyMap({ s, todayId, onEdit, onAdd }: JoyMapProps) {
  const groups = joyMapGroups(s)
  const costly = joysThatCostMoney(groups)
  return (
    <section className={styles.card} aria-labelledby="joymap-title">
      <div className={styles.head}>
        <h2 id="joymap-title" className={styles.title}>
          خريطة متعتي
        </h2>
      </div>
      {JOY_SIZE_ORDER.map((size) => (
        <div key={size} role="group" aria-label={`متع ${SIZE_LABEL[size]}`} className={styles.group}>
          <span className={styles.groupTitle}>
            {SIZE_LABEL[size]}
            {SIZE_HINT[size] && <span className={styles.groupHint}> · {SIZE_HINT[size]}</span>}
          </span>
          <div className={styles.chips}>
            {groups[size].map((j) => (
              <Chip
                key={j.id}
                onClick={() => onEdit(j)}
                icon={
                  j.costsMoney ? (
                    <span className={styles.coin} role="img" aria-label="تكلّف فلوس">
                      <Icon name="money" size={14} />
                    </span>
                  ) : undefined
                }
              >
                <Bidi>{j.titleAr}</Bidi>
                {j.id === todayId && <span className={styles.todayDot}> · اليوم</span>}
              </Chip>
            ))}
            <Chip onClick={() => onAdd(size)} icon={<Icon name="plus" size={14} />}>
              <span className={styles.addChip}>{groups[size].length === 0 ? 'أضيفي أول وحدة' : 'أضيفي'}</span>
            </Chip>
          </div>
        </div>
      ))}
      <p className={styles.foot}>الأشياء اللي تحبينها أصلًا ما نحط عليها سعر — تبقى حرة.</p>
      {costly > 0 && <p className={styles.foot}>في متع تكلّف فلوس — تحسبينها من ميزانيتك بدون ضغط.</p>}
    </section>
  )
}
