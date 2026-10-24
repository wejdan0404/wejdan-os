import { OPTIONAL_MODULES, canEnableModule, type DomainId, type Settings } from '../../../domain'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Switch } from '../../components/Switch'
import { useToast } from '../../components/Toast'
import { useLife, useStore } from '../../state/LifeStore'
import { RowIcon } from './meKit'
import styles from './me.module.css'

/**
 * Settings additions: the daily reminder cap and the optional-modules list (replaces the single
 * «وحدة خاصة» group; the cycle switch lives here now). Kept in its own file so SettingsScreen stays small.
 */
export function SettingsExtras() {
  const s = useLife()
  const store = useStore()
  const toast = useToast()
  const set = (p: Partial<Settings>) => void store.updateSettings({ ...s.settings, ...p })
  const cap = s.settings.notificationCap

  const toggle = async (id: DomainId, on: boolean) => {
    const name = s.domains.find((d) => d.id === id)?.nameAr ?? ''
    if (on && !canEnableModule(store.getSnapshot(), id)) {
      toast({ message: `مجالات النمو أو الصيانة مليانة — ريّحي مجال أول وبعدها شغّلي «${name}».` })
      return
    }
    await store.setDomainEnabled(id, on)
    toast({ message: on ? `«${name}» رجعت` : `«${name}» انطفت — بياناتها محفوظة`, actionLabel: 'تراجع', onAction: () => void store.setDomainEnabled(id, !on) })
  }

  return (
    <>
      <InsetGroupedList
        header="حد التذكيرات"
        footer="يحدّد كم تذكير تلقائي يطلع باليوم. الأوقات اللي حطيتيها بنفسك ما تنحسب. صفر يعني ما فيه تذكيرات."
      >
        <ListRow
          leading={<RowIcon name="bell" />}
          title="الحد الأقصى باليوم"
          subtitle="من 0 إلى 6 · الافتراضي 4"
          trailing={
            <select aria-label="الحد الأقصى للتذكيرات باليوم" className={styles.inlineSelect} value={cap} onChange={(e) => set({ notificationCap: Number(e.target.value) })}>
              {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? 'بدون' : n}
                </option>
              ))}
            </select>
          }
        />
      </InsetGroupedList>

      <InsetGroupedList header="الوحدات الاختيارية" footer="الوحدة المطفية تختفي من يومك ومسارك، وبياناتها تبقى محفوظة. الوحدة الخاصة مطفية افتراضيًا وتبقى على جهازك بس.">
        <ListRow leading={<RowIcon name="lock" tone="ink" />} title="متابعة الدورة" subtitle="خاصة · بدون توقعات ولا تشخيص" trailing={<Switch checked={s.settings.cycleModule} onChange={(v) => set({ cycleModule: v })} label="متابعة الدورة" />} />
        {OPTIONAL_MODULES.map((m) => {
          const d = s.domains.find((x) => x.id === m.id)
          if (!d) return null
          return <ListRow key={m.id} leading={<RowIcon name="settings" tone="ink" />} title={d.nameAr} subtitle={m.desc} trailing={<Switch checked={d.enabled} onChange={(v) => void toggle(m.id, v)} label={d.nameAr} />} />
        })}
      </InsetGroupedList>
    </>
  )
}
