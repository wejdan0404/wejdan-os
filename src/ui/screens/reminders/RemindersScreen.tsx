import { useMemo, useState, type ReactNode } from 'react'
import {
  effectiveQuietEndMinute,
  habitReminderKey,
  habitReminderRows,
  habitsWithoutReminder,
  defaultReminderMinute,
  routineReminderRows,
  settingsWithQuietEnd,
  type ReminderItem,
  type Settings,
} from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { Sheet } from '../../components/Sheet'
import { Switch } from '../../components/Switch'
import { Icon } from '../../icons/Icon'
import { ClockIcon } from '../../components/streak/streakIcons'
import { useToast } from '../../components/Toast'
import { useLife, useStore } from '../../state/LifeStore'
import { weekdaysLabel } from '../habits/shared'
import { CalendarExportSheet } from './CalendarExportSheet'
import { Clock12Text, clock12Text } from './format'
import { ReminderTimeSheet, type ReminderTimeTarget } from './ReminderTimeSheet'
import styles from './reminders.module.css'

type Editing =
  | { kind: 'item'; item: Pick<ReminderItem, 'key' | 'kind' | 'id' | 'title'>; minute: number; isNew: boolean; repeat: string }
  | { kind: 'quietStart' }
  | { kind: 'quietEnd' }

/** Tinted rounded square behind a row icon (same look as the Settings rows). */
const Tile = ({ children }: { children: ReactNode }) => <span className={styles.tile}>{children}</span>

function TimeChip({ minute, label, onClick }: { minute: number | null; label: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.timeChip} onClick={onClick} aria-label={`${label}: ${minute == null ? 'بدون وقت' : clock12Text(minute)}`}>
      {minute == null ? <span>حطّي وقت</span> : <Clock12Text minute={minute} />}
    </button>
  )
}

/** Settings → تذكيرات: the master switch, a time per routine/habit, quiet hours, and the way to real phone alerts. */
export default function RemindersScreen() {
  const s = useLife()
  const store = useStore()
  const toast = useToast()
  const set = (p: Partial<Settings>) => void store.updateSettings({ ...s.settings, ...p })
  const on = s.settings.notificationsEnabled

  const routines = useMemo(() => routineReminderRows(s), [s])
  const habits = useMemo(() => habitReminderRows(s), [s])
  const addable = useMemo(() => habitsWithoutReminder(s), [s])
  const [editing, setEditing] = useState<Editing | null>(null)
  const [picker, setPicker] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const quietStart = s.settings.quietStartMinute
  const quietEnd = effectiveQuietEndMinute(s.settings)

  const editItem = (r: ReminderItem) =>
    setEditing({
      kind: 'item',
      item: r,
      minute: r.minute ?? defaultReminderMinute(s, r.kind, r.id),
      isNew: r.minute == null,
      repeat: r.kind === 'routine' ? 'كل يوم' : weekdaysLabel(r.weekdays),
    })

  const target: ReminderTimeTarget | null =
    editing == null
      ? null
      : editing.kind === 'item'
        ? { title: editing.item.title, minute: editing.minute, repeatText: editing.repeat, canRemove: !editing.isNew }
        : editing.kind === 'quietStart'
          ? { title: 'ساعات الهدوء · من', minute: quietStart }
          : { title: 'ساعات الهدوء · إلى', minute: quietEnd }

  const save = (minute: number) => {
    if (editing == null) return
    if (editing.kind === 'item') {
      set({ reminderTimes: { ...s.settings.reminderTimes, [editing.item.key]: minute } })
      if (!on) toast({ message: 'انحفظ الوقت. شغّلي «تذكيرات داخل التطبيق» عشان تطلع لك.' })
    } else if (editing.kind === 'quietStart') set({ quietStartMinute: minute })
    else set(settingsWithQuietEnd(s.settings, minute))
    setEditing(null)
  }
  const remove = () => {
    if (editing?.kind !== 'item') return
    const { [editing.item.key]: _gone, ...rest } = s.settings.reminderTimes
    // a habit's older fixed-time «تذكير» switch is turned off too, or it would keep the reminder alive
    if (editing.item.kind === 'habit') {
      const h = s.habits.find((x) => x.id === editing.item.id)
      if (h?.reminder.enabled) void store.upsertHabit({ ...h, reminder: { ...h.reminder, enabled: false } }, true)
    }
    set({ reminderTimes: rest })
    setEditing(null)
  }

  return (
    <Screen title="تذكيرات" backLabel="الإعدادات" ground="tinted">
      <p className={styles.lede}>تذكيرات تطلع لك داخل التطبيق وأنتِ فاتحته. للتنبيهات على الجوال نفسه، حطيها في تقويم الآيفون.</p>

      <InsetGroupedList>
        <ListRow
          leading={<Tile><Icon name="bell" size={18} /></Tile>}
          title="تذكيرات داخل التطبيق"
          trailing={<Switch checked={on} onChange={(v) => set({ notificationsEnabled: v })} label="تذكيرات داخل التطبيق" />}
        />
      </InsetGroupedList>

      <div className={styles.dimmable} data-off={!on || undefined} {...(!on ? { inert: '' } : {})}>
        {routines.length > 0 && (
          <InsetGroupedList header="الروتينات">
            {routines.map((r) => (
              <ListRow
                key={r.key}
                leading={<Tile><Icon name={r.id === 'am' ? 'sun' : 'moon'} size={18} /></Tile>}
                title={r.title}
                subtitle="قبل ما تبدأ خطواته"
                trailing={<TimeChip minute={r.minute} label={`وقت تذكير ${r.title}`} onClick={() => editItem(r)} />}
              />
            ))}
          </InsetGroupedList>
        )}

        <InsetGroupedList header="العادات">
          {habits.map((r) => (
            <ListRow
              key={r.key}
              leading={<Tile><Icon name="habits" size={18} /></Tile>}
              title={<Bidi>{r.title}</Bidi>}
              trailing={<TimeChip minute={r.minute} label={`وقت تذكير ${r.title}`} onClick={() => editItem(r)} />}
            />
          ))}
          <ListRow
            leading={<span className={styles.plus}><Icon name="plus" size={20} /></span>}
            title={<span className={styles.addTitle}>أضيفي تذكير</span>}
            onClick={() => (addable.length === 0 ? toast({ message: 'كل عاداتك عندها تذكير' }) : setPicker(true))}
          />
        </InsetGroupedList>

        <InsetGroupedList header="ساعات الهدوء">
          <ListRow
            leading={<Tile><Icon name="moon" size={18} /></Tile>}
            title="ساعات الهدوء"
            subtitle="ما نظهر لك تذكيرات في هالوقت"
            trailing={<Switch checked={s.settings.quietHoursEnabled} onChange={(v) => set({ quietHoursEnabled: v })} label="ساعات الهدوء" />}
          />
          {s.settings.quietHoursEnabled && (
            <>
              <ListRow leading={<span className={styles.clockIcon}><ClockIcon size={20} /></span>} title="من" trailing={<TimeChip minute={quietStart} label="بداية ساعات الهدوء" onClick={() => setEditing({ kind: 'quietStart' })} />} />
              <ListRow leading={<span className={styles.clockIcon}><ClockIcon size={20} /></span>} title="إلى" trailing={<TimeChip minute={quietEnd} label="نهاية ساعات الهدوء" onClick={() => setEditing({ kind: 'quietEnd' })} />} />
            </>
          )}
        </InsetGroupedList>
      </div>

      <InsetGroupedList footer="التقويم له وضع التركيز الخاص فيه، فساعات الهدوء ما تنحط في الملف.">
        <ListRow
          leading={<Tile><Icon name="calendar" size={18} /></Tile>}
          title="حطيها في تقويم الآيفون"
          subtitle="التقويم يرسل التنبيهات الحقيقية"
          chevron
          onClick={() => setExportOpen(true)}
        />
      </InsetGroupedList>

      <ReminderTimeSheet
        target={target}
        heading={editing?.kind === 'item' ? 'وقت التذكير' : 'ساعات الهدوء'}
        onClose={() => setEditing(null)}
        onSave={save}
        onRemove={remove}
      />

      <Sheet open={picker} onClose={() => setPicker(false)} title="أي عادة تذكّرك فيها؟" detents={['medium', 'large']}>
        <InsetGroupedList flush>
          {addable.map((h) => (
            <ListRow
              key={h.id}
              title={<Bidi>{h.titleAr}</Bidi>}
              chevron
              onClick={() => {
                setPicker(false)
                setEditing({ kind: 'item', item: { key: habitReminderKey(h.id), kind: 'habit', id: h.id, title: h.titleAr }, minute: defaultReminderMinute(s, 'habit', h.id), isNew: true, repeat: weekdaysLabel(h.schedule.weekdays) })
              }}
            />
          ))}
        </InsetGroupedList>
      </Sheet>

      <CalendarExportSheet open={exportOpen} onClose={() => setExportOpen(false)} />
    </Screen>
  )
}
