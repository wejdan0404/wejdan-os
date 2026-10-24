import { useState } from 'react'
import { habitsForBundle, joyBundles, makeJoyItem, type JoyItem, type JoySize } from '../../../domain'
import { Chip } from '../../components/Chip'
import { Bidi } from '../../components/Bidi'
import { Icon } from '../../icons/Icon'
import { useLife, useStore } from '../../state/LifeStore'
import { JoyBundles } from './JoyBundles'
import { JoyEditSheet } from './JoyEditSheet'
import { JoyMap } from './JoyMap'
import styles from './joyOnboarding.module.css'

/** Neutral starting points — nothing is saved until she taps one, and every saved joy stays editable. */
export const JOY_SUGGESTIONS: { key: string; titleAr: string; titleEn: string; size: JoySize }[] = [
  { key: 'coffee', titleAr: 'قهوة بهدوء', titleEn: 'A quiet coffee', size: 'quick' },
  { key: 'walk', titleAr: 'مشي قصير', titleEn: 'A short walk', size: 'quick' },
  { key: 'book', titleAr: 'كتاب أحبه', titleEn: 'A book I love', size: 'medium' },
  { key: 'friend', titleAr: 'جلسة مع صديقة', titleEn: 'Time with a friend', size: 'medium' },
  { key: 'trip', titleAr: 'مشوار لمكان جديد', titleEn: 'A trip somewhere new', size: 'big' },
]

const sugId = (key: string) => `joy_onb_${key}`

/** Onboarding step «وش يفرّحك؟»: the joy map (empty states invite a first one) + reserved-joy bundles. Optional. */
export function JoyOnboardingStep() {
  const s = useLife()
  const store = useStore()
  const [editing, setEditing] = useState<{ item: JoyItem | null; size?: JoySize } | null>(null)
  const taken = new Set(s.joyItems.map((j) => j.id))
  const open = JOY_SUGGESTIONS.filter((x) => !taken.has(sugId(x.key)))
  const showBundles = joyBundles(s).length > 0 || habitsForBundle(s).length > 0

  // same id per suggestion → a double tap (or a re-run) upserts the same joy instead of duplicating it
  const add = (x: (typeof JOY_SUGGESTIONS)[number]) =>
    void store.upsertJoyItem(makeJoyItem({ id: sugId(x.key), kind: 'free', titleAr: x.titleAr, titleEn: x.titleEn, size: x.size }))

  return (
    <div className={styles.step}>
      <h1 className={styles.h1}>وش يفرّحك؟</h1>
      <p className={styles.lede}>اكتبي الأشياء الصغيرة والكبيرة اللي ترجّع لك نفسك. تقدرين تخليها فاضية وتضيفينها بعدين.</p>

      {open.length > 0 && (
        <div className={styles.sugs} role="group" aria-label="أفكار تبدين منها">
          <span className={styles.sugTitle}>أفكار تبدين منها</span>
          <div className={styles.chips}>
            {open.map((x) => (
              <Chip key={x.key} icon={<Icon name="plus" size={14} />} onClick={() => add(x)}>
                <Bidi>{x.titleAr}</Bidi>
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className={styles.wrap}>
        <JoyMap s={s} onEdit={(j) => setEditing({ item: j })} onAdd={(size) => setEditing({ item: null, size })} />
      </div>

      {showBundles ? (
        <div className={styles.wrap}>
          <JoyBundles />
        </div>
      ) : (
        <p className={styles.hint}>بعد ما تضيفين عاداتك، تقدرين تحجزين متعة لعادة معيّنة من صفحة المتعة.</p>
      )}

      <JoyEditSheet open={editing != null} onClose={() => setEditing(null)} item={editing?.item ?? null} defaultSize={editing?.size} />
    </div>
  )
}
