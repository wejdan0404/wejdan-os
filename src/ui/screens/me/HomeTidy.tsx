import { useEffect, useRef, useState } from 'react'
import { dayKey, nextWeekZone, tidyRemaining, weeklyZone, type Errand } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { CheckCircle } from '../../components/CheckCircle'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { ProgressArc } from '../../components/ProgressArc'
import { useToast } from '../../components/Toast'
import { Icon } from '../../icons/Icon'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import { newId } from './meKit'
import styles from './HomeTidy.module.css'

const mmss = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
type Phase = 'ready' | 'running' | 'paused' | 'over'

/** «ترتيب 10 دقايق» — a wall-clock timer with a one-surface small version. Nothing is logged behind her back. */
function TidyTimer() {
  const s = useLife()
  const configured = Math.min(60, Math.max(1, s.moduleState.resetMinutes || 10))
  const [small, setSmall] = useState(false)
  const minutes = small ? Math.min(3, configured) : configured
  const totalSec = minutes * 60
  const [phase, setPhase] = useState<Phase>('ready')
  const [now, setNow] = useState(() => Date.now())
  const carried = useRef(0)
  const startedAt = useRef<number | null>(null)

  useEffect(() => {
    if (phase !== 'running') return
    const t = window.setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (tidyRemaining(totalSec, carried.current, startedAt.current, n) <= 0) {
        carried.current = totalSec
        startedAt.current = null
        setPhase('over')
      }
    }, 250)
    return () => window.clearInterval(t)
  }, [phase, totalSec])

  const remaining = phase === 'over' ? 0 : tidyRemaining(totalSec, carried.current, startedAt.current, now)
  const start = () => {
    startedAt.current = Date.now()
    setNow(Date.now())
    setPhase('running')
  }
  const pause = () => {
    carried.current += (Date.now() - (startedAt.current ?? Date.now())) / 1000
    startedAt.current = null
    setPhase('paused')
  }
  const reset = () => {
    carried.current = 0
    startedAt.current = null
    setPhase('ready')
  }
  const status =
    phase === 'ready' ? 'النسخة الصغيرة: سطح واحد — المكتب أو السرير.' : phase === 'running' ? 'سطح واحد وبس. لا تفتحين شي ثاني.' : phase === 'paused' ? 'وقفة صغيرة — كمّلي وقت ما تبين.' : 'خلص الوقت. اللي صار يكفي.'

  return (
    <div className={styles.card}>
      <p className={styles.eyebrow}>ترتيب {minutes} {minutes <= 10 ? 'دقايق' : 'دقيقة'}</p>
      <ProgressArc value={totalSec === 0 ? 0 : 1 - remaining / totalSec} size={132} stroke={5} label={`باقي ${mmss(remaining)}`}>
        <span className={styles.time}>
          <bdi>{mmss(remaining)}</bdi>
        </span>
      </ProgressArc>
      <p className={styles.body} role="status">
        {status}
      </p>
      <div className={styles.row}>
        {phase === 'ready' && <Button onClick={start}>ابدئي</Button>}
        {phase === 'running' && (
          <Button variant="secondary" onClick={pause}>
            وقفة
          </Button>
        )}
        {phase === 'paused' && <Button onClick={start}>كمّلي</Button>}
        {phase !== 'ready' && (
          <Button variant="plain" onClick={reset}>
            {phase === 'over' ? 'تمام' : 'من الأول'}
          </Button>
        )}
        {phase === 'ready' && configured > 3 && (
          <Button variant="plain" onClick={() => setSmall((v) => !v)} aria-pressed={small}>
            {small ? 'رجّعيها عادية' : 'نسخة صغيرة: 3 دقايق'}
          </Button>
        )}
      </div>
    </div>
  )
}

/** «منطقة الأسبوع» — one place per week; «غيّري المنطقة» skips to the next without losing the rotation. */
function WeeklyZone() {
  const s = useLife()
  const store = useStore()
  const toast = useToast()
  const today = useToday()
  const off = s.moduleState.homeZoneOffset
  const z = weeklyZone(today, off)
  const next = nextWeekZone(today, off)
  const bump = (by: number) => store.updateModuleState({ ...store.getSnapshot().moduleState, homeZoneOffset: store.getSnapshot().moduleState.homeZoneOffset + by })
  return (
    <div className={`${styles.card} ${styles.zoneCard}`}>
      <p className={styles.eyebrow}>منطقة الأسبوع</p>
      <p className={styles.title}>{z.ar}</p>
      <p className={styles.body}>{z.hint} الأسبوع الجاي: {next.ar}.</p>
      <Button
        variant="plain"
        onClick={() => {
          void bump(1)
          toast({ message: `المنطقة صارت: ${weeklyZone(today, off + 1).ar}`, actionLabel: 'تراجع', onAction: () => void bump(-1) })
        }}
      >
        غيّري المنطقة
      </Button>
    </div>
  )
}

/** «مشاوير مجمّعة» — collect errands and do them in one trip. Uses the existing errand store. */
function Errands() {
  const s = useLife()
  const store = useStore()
  const toast = useToast()
  const today = useToday()
  const [text, setText] = useState('')
  const list = [...s.errands].sort((a, b) => Number(a.done) - Number(b.done) || (a.addedDate ?? '').localeCompare(b.addedDate ?? ''))
  const add = async () => {
    const title = text.trim()
    if (!title) return
    setText('')
    await store.upsertErrand({ id: newId('errand'), title, done: false, addedDate: dayKey(today) })
  }
  const remove = (e: Errand) =>
    void store.deleteErrand(e.id).then((t) => toast({ message: 'انحذف', actionLabel: t ? 'تراجع' : undefined, onAction: t ? () => void store.undoDelete(t.token) : undefined }))
  return (
    <InsetGroupedList header="مشاوير مجمّعة" footer="جمّعي مشاويرك هنا وطلعي لها مرة وحدة بدل ما تتفرق على الأسبوع.">
      {list.map((e) => (
        <ListRow
          key={e.id}
          leading={<CheckCircle checked={e.done} label={e.title} onChange={(v) => void store.upsertErrand({ ...e, done: v })} />}
          title={e.done ? <span className={styles.done}><Bidi>{e.title}</Bidi></span> : <Bidi>{e.title}</Bidi>}
          trailingActions={[{ key: 'del', label: 'احذفي', icon: <Icon name="trash" size={20} />, tone: 'destructive', onAction: () => remove(e) }]}
          menu={[{ key: 'del', label: 'احذفيه', icon: <Icon name="trash" size={18} />, destructive: true, onSelect: () => remove(e) }]}
        />
      ))}
      <form
        className={styles.add}
        onSubmit={(ev) => {
          ev.preventDefault()
          void add()
        }}
      >
        <input className={styles.addInput} value={text} onChange={(e) => setText(e.target.value)} placeholder="مشوار جديد: صيدلية، بنك…" aria-label="مشوار جديد" />
        <Button type="submit" variant="secondary" disabled={!text.trim()}>
          أضيفي
        </Button>
      </form>
    </InsetGroupedList>
  )
}

export function HomeTidyBlock() {
  return (
    <>
      <TidyTimer />
      <WeeklyZone />
      <Errands />
    </>
  )
}
