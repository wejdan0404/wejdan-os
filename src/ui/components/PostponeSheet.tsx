import { useEffect, useState } from 'react'
import { Icon } from '../icons/Icon'
import { Button } from './Button'
import { InsetGroupedList } from './InsetGroupedList'
import { ListRow } from './ListRow'
import { Sheet } from './Sheet'
import styles from './PostponeSheet.module.css'

export type PostponeChoice = { kind: 'tomorrow' } | { kind: 'thisWeek' } | { kind: 'date'; date: string } | { kind: 'inbox' }

export interface PostponeSheetProps {
  open: boolean
  itemTitle: string
  /** Earliest day she can pick (YYYY-MM-DD) — tomorrow: today or a past day would lose it. */
  minDate?: string
  onClose: () => void
  onChoose: (c: PostponeChoice) => void
}

/** «بعدين» — the item never disappears; it moves to a place she can find again. */
export function PostponeSheet({ open, itemTitle, minDate, onClose, onChoose }: PostponeSheetProps) {
  const [picking, setPicking] = useState(false)
  const [date, setDate] = useState('')
  // every opening starts fresh — a date typed for one item never carries over to the next
  useEffect(() => {
    if (open) {
      setPicking(false)
      setDate('')
    }
  }, [open, itemTitle])
  const valid = date !== '' && (minDate == null || date >= minDate)
  const choose = (c: PostponeChoice) => {
    onChoose(c)
    setPicking(false)
    setDate('')
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="متى ترجع لك؟" detents={['medium']}>
      <p className={styles.item}>{itemTitle}</p>
      <InsetGroupedList flush>
        <ListRow leading={<Icon name="sun" size={20} />} title="بكرة" onClick={() => choose({ kind: 'tomorrow' })} />
        <ListRow leading={<Icon name="later" size={20} />} title="هالأسبوع" subtitle="تظهر في «بعدين» لين تختارين يومها" onClick={() => choose({ kind: 'thisWeek' })} />
        <ListRow leading={<Icon name="today" size={20} />} title="اختاري تاريخ" subtitle="من بكرة وطالع" chevron onClick={() => setPicking((p) => !p)} />
        <ListRow leading={<Icon name="inbox" size={20} />} title="رجّعيها للوارد" onClick={() => choose({ kind: 'inbox' })} />
      </InsetGroupedList>
      {picking && (
        <div className={styles.picker}>
          <label className={styles.label} htmlFor="postpone-date">
            التاريخ
          </label>
          <input
            id="postpone-date"
            type="date"
            className={styles.input}
            min={minDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-describedby="postpone-date-hint"
          />
          {date !== '' && !valid ? (
            <p id="postpone-date-hint" className={styles.hint} role="alert">
              اختاري يوم من بكرة وطالع — اليوم والأيام اللي راحت ما تنفع.
            </p>
          ) : (
            <p id="postpone-date-hint" className={styles.hintMuted}>
              تنتقل لذاك اليوم وتلقينها فيه.
            </p>
          )}
          <Button block disabled={!valid} onClick={() => choose({ kind: 'date', date })}>
            أجّليها لهالتاريخ
          </Button>
        </div>
      )}
    </Sheet>
  )
}
