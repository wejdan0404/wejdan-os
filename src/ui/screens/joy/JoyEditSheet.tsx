import { useEffect, useId, useState } from 'react'
import { makeJoyItem, type JoyItem, type JoyKind, type JoySize } from '../../../domain'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { SegmentedControl } from '../../components/SegmentedControl'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { useLife, useStore } from '../../state/LifeStore'
import { linkedMilestoneKey, relinkMilestone, rewardOnMilestone, SIZE_LABEL } from './joyModel'
import { parseWhole } from '../../lib/number'
import styles from './Joy.module.css'
import { Switch } from '../../components/Switch'

type Mode = 'free' | 'earned'

const MODES = [
  { value: 'free' as const, label: 'بلا شروط' },
  { value: 'earned' as const, label: 'مكافأة بالشرارات' },
]
const SIZES = (Object.keys(SIZE_LABEL) as JoySize[]).map((v) => ({ value: v, label: SIZE_LABEL[v] }))
const PRICE_PRESETS = [30, 60, 120, 200]

export interface JoyEditSheetProps {
  open: boolean
  onClose: () => void
  /** Editing this item; null = new. */
  item: JoyItem | null
  /** For a new item. */
  defaultMode?: Mode
}

/** Add / edit a joy or a reward. Rewards can be tied to a goal milestone. */
export function JoyEditSheet({ open, onClose, item, defaultMode = 'free' }: JoyEditSheetProps) {
  const s = useLife()
  const store = useStore()
  const toast = useToast()
  const uid = useId()
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<Mode>(defaultMode)
  const [size, setSize] = useState<JoySize>('quick')
  const [price, setPrice] = useState<string>('60')
  const [costsMoney, setCostsMoney] = useState(false)
  const [milestone, setMilestone] = useState<string>('')

  useEffect(() => {
    if (!open) return
    setTitle(item?.titleAr ?? '')
    setMode(item ? (item.kind === 'earned' ? 'earned' : 'free') : defaultMode)
    setSize(item?.size ?? 'quick')
    setPrice(item?.price != null ? String(item.price) : '60')
    setCostsMoney(item?.costsMoney ?? false)
    setMilestone(item ? (linkedMilestoneKey(s, item.id) ?? '') : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id])

  const priceNum = Math.max(0, Math.min(9999, Math.trunc(Number(price) || 0)))
  const valid = title.trim().length > 0 && (mode === 'free' || priceNum > 0)
  const milestoneOptions = s.goals.flatMap((g) =>
    g.milestones
      .filter((m) => !m.done || m.rewardJoyId === item?.id)
      .map((m) => {
        const other = m.rewardJoyId && m.rewardJoyId !== item?.id ? s.joyItems.find((j) => j.id === m.rewardJoyId) ?? null : null
        return { key: `${g.id}:${m.id}`, goal: g.titleAr, title: m.titleAr, taken: other?.titleAr ?? null }
      }),
  )
  // QA area4 #19: say so before a milestone's current reward gets replaced
  const replacing = milestone ? rewardOnMilestone(s, milestone) : null
  const replacingOther = replacing && replacing.id !== item?.id ? replacing : null

  const save = async () => {
    if (!valid) return
    const kind: JoyKind = mode === 'earned' ? 'earned' : item?.kind === 'bundled' ? 'bundled' : 'free'
    const t = title.trim()
    const next: JoyItem = item
      ? { ...item, kind, titleAr: t, titleEn: item.titleEn || t, size, costsMoney, price: mode === 'earned' ? priceNum : null }
      : makeJoyItem({ id: `joy_${Date.now().toString(36)}`, kind, titleAr: t, titleEn: t, size, costsMoney, price: mode === 'earned' ? priceNum : null })
    await store.upsertJoyItem(next)
    const goals = relinkMilestone(s.goals, next.id, mode === 'earned' && milestone ? milestone : null)
    for (const g of goals) await store.upsertGoal(g)
    toast({
      message: replacingOther
        ? `انحفظت — وفكّينا «${replacingOther.titleAr}» من المَعلم`
        : item
          ? 'انحفظت التعديلات'
          : mode === 'earned'
            ? 'انضافت المكافأة'
            : 'انضافت المتعة',
    })
    onClose()
  }

  const remove = async () => {
    if (!item) return
    const token = await store.deleteJoyItem(item.id)
    onClose()
    toast({
      message: `انحذفت «${item.titleAr}»`,
      actionLabel: token ? 'تراجع' : undefined,
      onAction: token ? () => void store.undoDelete(token.token) : undefined,
    })
  }

  return (
    <Sheet open={open} onClose={onClose} title={item ? 'تعديل' : mode === 'earned' ? 'مكافأة جديدة' : 'متعة جديدة'} detents={['large']}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <div className={styles.field}>
          <label htmlFor={`${uid}-t`} className={styles.label}>
            وش هي؟
          </label>
          <input
            id={`${uid}-t`}
            className={styles.input}
            placeholder={mode === 'earned' ? 'مثلًا: كتاب جديد' : 'مثلًا: قهوة وكتاب'}
            value={title}
            autoComplete="off"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <SegmentedControl label="النوع" segments={MODES} value={mode} onChange={setMode} />
        <p className={styles.hint}>
          {mode === 'free' ? 'متعة لك كل يوم — ما تحتاجين تستحقينها.' : 'تستلمينها لما تجمعين شراراتها.'}
        </p>

        {mode === 'earned' && (
          <div className={styles.field}>
            <label htmlFor={`${uid}-p`} className={styles.label}>
              كم شرارة؟
            </label>
            <div className={styles.priceRow}>
              <input
                id={`${uid}-p`}
                className={`${styles.input} ${styles.num}`}
                inputMode="numeric"
                pattern="[0-9]*"
                dir="ltr"
                value={price}
                onChange={(e) => {
                  const n = parseWhole(e.target.value)
                  setPrice(e.target.value.trim() === '' ? '' : String(n))
                }}
              />
              <div className={styles.chips}>
                {PRICE_PRESETS.map((p) => (
                  <Chip key={p} selected={priceNum === p} onClick={() => setPrice(String(p))}>
                    <bdi className={styles.num}>{p}</bdi>
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className={styles.field}>
          <span className={styles.label} id={`${uid}-s`}>
            حجمها
          </span>
          <SegmentedControl label="حجمها" segments={SIZES} value={size} onChange={setSize} />
        </div>

        <div className={styles.toggleRow}>
          <span>
            <span className={styles.toggleTitle}>تكلّف فلوس</span>
            <span className={styles.hint}>عشان تنحسب بميزانية المتعة</span>
          </span>
          <Switch label="تكلّف فلوس" checked={costsMoney} onChange={setCostsMoney} />
        </div>

        {mode === 'earned' && milestoneOptions.length > 0 && (
          <div className={styles.field}>
            <label htmlFor={`${uid}-m`} className={styles.label}>
              اربطيها بمَعلم (اختياري)
            </label>
            <select id={`${uid}-m`} className={styles.input} value={milestone} onChange={(e) => setMilestone(e.target.value)}>
              <option value="">بدون ربط</option>
              {milestoneOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.goal} · {o.title}
                  {o.taken ? ` (مربوط بـ«${o.taken}»)` : ''}
                </option>
              ))}
            </select>
            {replacingOther && (
              <p className={styles.hint} role="status">
                هذا المَعلم مربوط بـ«{replacingOther.titleAr}» — لو حفظتي، تصير هذي مكافأته بدالها.
              </p>
            )}
          </div>
        )}

        <Button type="submit" block size="large" disabled={!valid}>
          {item ? 'احفظي' : 'أضيفيها'}
        </Button>
        {item && (
          <Button variant="plain" block onClick={() => void remove()} className={styles.destructive}>
            احذفيها
          </Button>
        )}
      </form>
    </Sheet>
  )
}
