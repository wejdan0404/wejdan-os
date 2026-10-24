import { useState } from 'react'
import {
  MAX_JOY_BUNDLES,
  bindBundle,
  bundleCandidates,
  canAddBundle,
  habitsForBundle,
  joyBundles,
  makeJoyItem,
  unbindBundle,
  type JoyBundle,
} from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { Icon } from '../../icons/Icon'
import { useLife, useStore } from '../../state/LifeStore'
import styles from './Joy.module.css'
import map from './joyMap.module.css'

/** «متعة محجوزة لعادة»: up to three joys kept for one habit each — an agreement with herself, never a lock. */
export function JoyBundles() {
  const s = useLife()
  const store = useStore()
  const toast = useToast()
  const bundles = joyBundles(s)
  const [open, setOpen] = useState(false)
  const full = !canAddBundle(s)

  const release = async (b: JoyBundle) => {
    const before = b.joy
    await store.upsertJoyItem(unbindBundle(b.joy))
    toast({ message: `رجعت «${before.titleAr}» متعة حرة`, actionLabel: 'تراجع', onAction: () => void store.upsertJoyItem(before) })
  }

  return (
    <>
      <InsetGroupedList
        header="متعة محجوزة لعادة · باتفاق مع نفسك"
        footer={
          full
            ? 'ثلاث باقات كفاية للبداية — عشان تبقى المتعة مميزة. شيلي وحدة وبعدها اختاري الجديدة.'
            : 'شي تحبينه تخلينه لوقت عادة — بدون أقفال، وتشيلينه متى ما بغيتي.'
        }
      >
        {bundles.map((b) => (
          <ListRow
            key={b.joy.id}
            leading={<Icon name="joy" size={22} />}
            title={
              <span className={map.pair}>
                <span className={map.habit}>{b.habit ? <Bidi>{b.habit.titleAr}</Bidi> : <span className={map.gone}>عادة محذوفة</span>}</span>
                <span className={map.link} aria-label="مربوطة بـ" role="img">
                  <Icon name="back" size={16} />
                </span>
                <span className={map.pill}>
                  <Bidi>{b.joy.titleAr}</Bidi>
                </span>
              </span>
            }
            menu={[{ key: 'release', label: 'فكّي الربط', icon: <Icon name="undo" size={18} />, onSelect: () => void release(b) }]}
            trailingActions={[{ key: 'release', label: 'فكّي', tone: 'destructive', icon: <Icon name="undo" size={18} />, onAction: () => void release(b) }]}
          />
        ))}
        {!full && (
          <ListRow
            leading={<Icon name="plus" size={20} />}
            title={<span className={styles.accentText}>{bundles.length === 0 ? 'احجزي متعة لعادة' : 'أضيفي باقة'}</span>}
            subtitle={bundles.length === 0 ? undefined : `${bundles.length} من ${MAX_JOY_BUNDLES}`}
            onClick={() => setOpen(true)}
          />
        )}
      </InsetGroupedList>
      <BundleSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function BundleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useLife()
  const store = useStore()
  const toast = useToast()
  const habits = habitsForBundle(s)
  const candidates = bundleCandidates(s)
  const [habitId, setHabitId] = useState<string | null>(null)
  const [joyId, setJoyId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) {
    setWasOpen(true)
    setHabitId(null)
    setJoyId(null)
    setTitle('')
  }
  if (!open && wasOpen) setWasOpen(false)

  const typed = title.trim()
  const valid = habitId != null && (joyId != null || typed.length > 0)

  const save = async () => {
    if (!habitId || !valid) return
    const existing = joyId ? s.joyItems.find((j) => j.id === joyId) : null
    const before = existing ?? null
    const joy = existing
      ? bindBundle(existing, habitId)
      : bindBundle(makeJoyItem({ id: `joy_${Date.now().toString(36)}`, kind: 'bundled', titleAr: typed, titleEn: typed, size: 'quick' }), habitId)
    await store.upsertJoyItem(joy)
    onClose()
    toast({
      message: 'انحجزت المتعة للعادة',
      actionLabel: 'تراجع',
      onAction: () => void (before ? store.upsertJoyItem(before) : store.deleteJoyItem(joy.id)),
    })
  }

  return (
    <Sheet open={open} onClose={onClose} title="باقة جديدة" detents={['large']}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <p className={styles.hint}>متعة تخلينها لوقت عادة معيّنة — عشان تبقى مميزة. بدون أقفال: تسوينها وقت ما بغيتي.</p>
        <div className={styles.field}>
          <span className={styles.label}>لأي عادة؟</span>
          {habits.length === 0 ? (
            <p className={styles.hint}>كل عاداتك النشطة لها باقة، أو ما أضفتي عادة للحين.</p>
          ) : (
            <div className={styles.chips} role="radiogroup" aria-label="العادة">
              {habits.map((h) => (
                <Chip key={h.id} role="radio" selected={habitId === h.id} onClick={() => setHabitId(h.id)}>
                  <Bidi>{h.titleAr}</Bidi>
                </Chip>
              ))}
            </div>
          )}
        </div>
        <div className={styles.field}>
          <span className={styles.label}>وش المتعة؟</span>
          {candidates.length > 0 && (
            <div className={styles.chips} role="radiogroup" aria-label="من متعك">
              {candidates.map((j) => (
                <Chip
                  key={j.id}
                  role="radio"
                  selected={joyId === j.id}
                  onClick={() => {
                    setJoyId(joyId === j.id ? null : j.id)
                    setTitle('')
                  }}
                >
                  <Bidi>{j.titleAr}</Bidi>
                </Chip>
              ))}
            </div>
          )}
          <input
            className={styles.input}
            aria-label="متعة جديدة"
            placeholder={candidates.length > 0 ? 'أو اكتبي متعة جديدة' : 'مثلًا: قهوة مختصة'}
            value={title}
            autoComplete="off"
            onChange={(e) => {
              setTitle(e.target.value)
              if (e.target.value) setJoyId(null)
            }}
          />
          {candidates.length === 0 && <p className={styles.hint}>متعك الحرة الوحيدة تبقى حرة — اكتبي وحدة جديدة للباقة.</p>}
        </div>
        <Button type="submit" block size="large" disabled={!valid}>
          احجزيها
        </Button>
      </form>
    </Sheet>
  )
}
