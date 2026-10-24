import { useEffect, useState } from 'react'
import { Button } from '../../components/Button'
import { Sheet } from '../../components/Sheet'
import { Icon } from '../../icons/Icon'
import { RepeatIcon } from '../../components/streak/streakIcons'
import { Bidi } from '../../components/Bidi'
import { TimeWheel, snap5 } from './TimeWheel'
import styles from './reminders.module.css'

export interface ReminderTimeTarget {
  title: string
  /** Shown as «يتكرر · …»; omit for quiet-hours times. */
  repeatText?: string
  minute: number
  canRemove?: boolean
}

/** «وقت التذكير» — the wheel sheet (board ReminderTime). Save writes the time; «شيلي هالتذكير» removes it. */
export function ReminderTimeSheet({
  target,
  onClose,
  onSave,
  onRemove,
  heading = 'وقت التذكير',
}: {
  target: ReminderTimeTarget | null
  onClose: () => void
  onSave: (minute: number) => void
  onRemove?: () => void
  heading?: string
}) {
  const [minute, setMinute] = useState(snap5(target?.minute ?? 480))
  useEffect(() => {
    if (target) setMinute(snap5(target.minute))
  }, [target])
  return (
    <Sheet
      open={target != null}
      onClose={onClose}
      title={heading}
      detents={['medium', 'large']}
      cancelLabel="إلغاء"
      action={
        <Button className={styles.saveBtn} onClick={() => onSave(minute)}>
          احفظي
        </Button>
      }
    >
      {target && (
        <div className={styles.timeBody}>
          <p className={styles.timeFor}>
            <Bidi>{target.title}</Bidi>
          </p>
          <TimeWheel minute={minute} onChange={setMinute} label={`${heading}: ${target.title}`} />
          {target.repeatText && (
            <div className={styles.repeatRow}>
              <span className={styles.repeatIcon}>
                <RepeatIcon size={20} />
              </span>
              <span className={styles.repeatTitle}>يتكرر</span>
              <span className={styles.repeatVal}>{target.repeatText}</span>
            </div>
          )}
          {target.canRemove && onRemove && (
            <button type="button" className={styles.removeBtn} onClick={onRemove}>
              <Icon name="trash" size={18} />
              <span>شيلي هالتذكير</span>
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}
