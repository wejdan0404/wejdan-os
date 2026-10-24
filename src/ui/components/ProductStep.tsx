import { Bidi } from './Bidi'
import { CheckCircle } from './CheckCircle'
import { Chip } from './Chip'
import { ListRow } from './ListRow'
import styles from './ProductStep.module.css'

export type ProductSlot = 'am' | 'pm' | 'weekly'
export const SLOT_LABEL: Record<ProductSlot, string> = { am: 'الصبح', pm: 'المسا', weekly: 'أسبوعي' }

export interface ProductStepProps {
  order: number
  name: string
  category?: string
  slot: ProductSlot
  done?: boolean
  onToggle?: (done: boolean) => void
  onEdit?: () => void
}

/** One product as a step in a care routine: order, name, slot. */
export function ProductStep({ order, name, category, slot, done, onToggle, onEdit }: ProductStepProps) {
  return (
    <ListRow
      leading={<span className={styles.order}>{order}</span>}
      title={<Bidi>{name}</Bidi>}
      subtitle={category}
      muted={done}
      onClick={onEdit}
      trailing={
        <>
          <Chip>{SLOT_LABEL[slot]}</Chip>
          {onToggle && <CheckCircle checked={!!done} onChange={onToggle} label={name} />}
        </>
      }
    />
  )
}
