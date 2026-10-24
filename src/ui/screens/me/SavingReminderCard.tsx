import { useState } from 'react'
import { SAVING_MAX_DAY, defaultSavingDay, savingReminderInfo, SAVING_REMINDER_KEY, type LifeSnapshot } from '../../../domain'
import { Button } from '../../components/Button'
import { Sheet } from '../../components/Sheet'
import { TimeField } from '../../components/TimeField'
import { useToast } from '../../components/Toast'
import { useStableNavigate } from '../../shell/navigate'
import { Icon } from '../../icons/Icon'
import { useStore } from '../../state/LifeStore'
import { CalendarExportSheet } from '../reminders/CalendarExportSheet'
import { Clock12Text } from '../reminders/format'
import { fmtDayMonth } from './meKit'
import styles from './moneyEnvelopes.module.css'
import form from './me.module.css'

/** «ادخار تلقائي يوم الراتب»: a monthly reminder only — no transfer, no suggested amount. */
export function SavingReminderCard({ s, today }: { s: LifeSnapshot; today: Date }) {
  const store = useStore()
  const toast = useToast()
  const navigate = useStableNavigate()
  const info = savingReminderInfo(s, today)
  const [open, setOpen] = useState(false)
  const [calendar, setCalendar] = useState(false)
  const [day, setDay] = useState(info.day)
  const [minute, setMinute] = useState(info.minute)

  const openSheet = () => {
    setDay(info.enabled ? info.day : defaultSavingDay(s))
    setMinute(info.minute)
    setOpen(true)
  }
  const save = async () => {
    const prev = s.moduleState
    await store.updateModuleState({ ...prev, autoSaveDay: day, autoSaveMinute: minute })
    setOpen(false)
    toast({ message: `تمام — نذكّرك يوم ${day} من كل شهر`, actionLabel: 'تراجع', onAction: () => void store.updateModuleState(prev) })
  }
  const turnOff = async () => {
    const prev = s.moduleState
    await store.updateModuleState({ ...prev, autoSaveDay: null })
    setOpen(false)
    toast({ message: 'طفّينا تذكير الادخار', actionLabel: 'تراجع', onAction: () => void store.updateModuleState(prev) })
  }

  return (
    <section className={styles.save} aria-labelledby="save-title">
      <div className={styles.saveHead}>
        <span className={styles.saveTile}>
          <Icon name="bell" size={20} />
        </span>
        <div className={styles.saveText}>
          <h2 id="save-title" className={styles.saveTitle}>ادخار تلقائي يوم الراتب</h2>
          <p className={styles.saveBody}>فعّليه مرة وحدة من تطبيق بنكك، ويمشي لحاله. اختاري المبلغ اللي يناسبك — إحنا نذكّرك بس، ما نحوّل فلوس.</p>
          {info.enabled && (
            <p className={styles.saveWhen}>
              تذكير: يوم <span className="num">{info.day}</span> من كل شهر · <Clock12Text minute={info.minute} />
              {info.next && <> · الجاي {fmtDayMonth(info.next)}</>}
            </p>
          )}
        </div>
      </div>
      {info.enabled && !s.settings.notificationsEnabled && (
        <p className={styles.foot}>
          تذكيرات التطبيق مطفية —{' '}
          <button type="button" className={styles.linkBtn} onClick={() => navigate('/me/reminders')}>
            شغّليها من التذكيرات
          </button>{' '}
          عشان يطلع لك بالتطبيق، أو حطيه في التقويم.
        </p>
      )}
      <div className={styles.actions}>
        <Button variant={info.enabled ? 'secondary' : 'primary'} onClick={openSheet}>
          {info.enabled ? 'غيّري' : 'ذكّريني'}
        </Button>
        {info.enabled && (
          <Button variant="plain" onClick={() => setCalendar(true)}>
            حطيه بالتقويم
          </Button>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="تذكير الادخار" detents={['medium', 'large']}>
        <form
          className={form.form}
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <label className={form.field}>
            <span className={form.fieldLabel}>أي يوم بالشهر؟</span>
            <select className={form.select} value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {Array.from({ length: SAVING_MAX_DAY }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  يوم {d}
                </option>
              ))}
            </select>
          </label>
          <p className={form.lede}>اقتراحنا يوم راتبك — تقدرين تختارين يوم ثاني. الأيام لين 28 عشان يجيك كل شهر.</p>
          <div className={form.field}>
            <span className={form.fieldLabel}>الساعة</span>
            <TimeField minute={minute} onChange={setMinute} label="وقت تذكير الادخار" selectClassName={form.select} />
          </div>
          <Button type="submit" block size="large">
            احفظي
          </Button>
          {info.enabled && (
            <Button variant="plain" block onClick={() => void turnOff()}>
              طفّي التذكير
            </Button>
          )}
        </form>
      </Sheet>
      <CalendarExportSheet open={calendar} onClose={() => setCalendar(false)} only={[SAVING_REMINDER_KEY]} />
    </section>
  )
}
