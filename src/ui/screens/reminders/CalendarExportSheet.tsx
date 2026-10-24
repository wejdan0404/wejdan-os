import { useEffect, useMemo, useState } from 'react'
import {
  ICS_FILE_NAME,
  ICS_MIME,
  buildIcs,
  reminderItems,
  type IcsLeadMin,
} from '../../../domain'
import { Button } from '../../components/Button'
import { Bidi } from '../../components/Bidi'
import { SegmentedControl } from '../../components/SegmentedControl'
import { Sheet } from '../../components/Sheet'
import { FileIcon, ShareIcon } from '../../components/streak/streakIcons'
import { useToast } from '../../components/Toast'
import { Icon } from '../../icons/Icon'
import { countLabel, type NounForms } from '../../lib/plural'
import { downloadFile, makeFile, shareFile } from '../../lib/shareFile'
import { useLife } from '../../state/LifeStore'
import { Clock12Text } from './format'
import styles from './reminders.module.css'

const REMINDER: NounForms = { one: 'تذكير', two: 'تذكيرين', few: 'تذكيرات', many: 'تذكير' }
type Lead = 'now' | '5' | '10'
const LEAD_MIN: Record<Lead, IcsLeadMin> = { now: 0, '5': 5, '10': 10 }

const STEPS = ['افتحي الملف من زر المشاركة واختاري «التقويم».', 'اضغطي «إضافة الكل»، وخلّيها في تقويم باسم «وجدان».', 'خلاص. التقويم هو اللي يرسل لك التنبيهات في وقتها، حتى والتطبيق مقفول.']

/**
 * «حطيها في تقويم الآيفون»: picks what goes in the calendar file, builds a valid .ics on the device and hands it
 * over with the share sheet (or a download). Nothing is uploaded; only the titles she chose are written.
 */
export function CalendarExportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useLife()
  const toast = useToast()
  const items = useMemo(() => reminderItems(s), [s])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [lead, setLead] = useState<Lead>('5')
  const [ready, setReady] = useState<{ file: File; count: number } | null>(null)

  // every reminder that is on is checked by default each time the sheet opens
  useEffect(() => {
    if (open) {
      setPicked(new Set(items.map((i) => i.key)))
      setReady(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toggle = (key: string) =>
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })

  const prepare = () => {
    const chosen = items.filter((i) => picked.has(i.key))
    const text = buildIcs({ items: chosen, leadMin: LEAD_MIN[lead], now: new Date(), timeZone: s.settings.timeZoneName || 'Asia/Riyadh' })
    setReady({ file: makeFile(text, ICS_FILE_NAME, ICS_MIME), count: chosen.length })
  }

  const openInCalendar = async () => {
    if (!ready) return
    const r = await shareFile(ready.file, 'وجدان')
    if (r === 'unsupported') {
      downloadFile(ready.file)
      toast({ message: 'نزّلنا الملف — افتحيه من «الملفات» وأضيفيه للتقويم' })
    }
  }
  const saveToFiles = () => {
    if (!ready) return
    downloadFile(ready.file)
    toast({ message: 'جهّزنا الملف — احفظيه بمكان تعرفينه' })
  }

  return (
    <Sheet open={open} onClose={onClose} title={ready ? 'الملف جاهز' : 'حطيها في تقويم الآيفون'} detents={['large']}>
      {!ready ? (
        <div className={styles.icsBody}>
          <p className={styles.lede}>التطبيق ما يرسل إشعارات بنفسه. نجهّز لك ملف تقويم، ولما تضيفينه للآيفون، التقويم هو اللي يرسل لك التنبيهات الحقيقية.</p>
          {items.length === 0 ? (
            <p className={styles.empty}>ما عندك تذكيرات لها وقت للحين. حطّي وقت لروتين أو عادة من «تذكيرات»، وارجعي هنا.</p>
          ) : (
            <>
              <h3 className={styles.sectionLabel}>وش نحط فيه؟</h3>
              <ul className={styles.checklist} role="list">
                {items.map((i) => (
                  <li key={i.key}>
                    <button type="button" className={styles.checkRow} role="checkbox" aria-checked={picked.has(i.key)} onClick={() => toggle(i.key)}>
                      <span className={styles.checkText}>
                        <span className={styles.checkTitle}>
                          <Bidi>{i.title}</Bidi>
                        </span>
                        <span className={styles.checkSub}>{i.minute != null && <Clock12Text minute={i.minute} />}</span>
                      </span>
                      <span className={styles.checkMark} data-on={picked.has(i.key) || undefined} aria-hidden="true">
                        {picked.has(i.key) && <Icon name="check" size={16} />}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <h3 className={styles.sectionLabel}>ينبّهك قبل الموعد بـ</h3>
              <SegmentedControl<Lead>
                label="ينبّهك قبل الموعد بـ"
                segments={[
                  { value: 'now', label: 'في الوقت' },
                  { value: '5', label: '5 دقايق' },
                  { value: '10', label: '10 دقايق' },
                ]}
                value={lead}
                onChange={setLead}
              />
            </>
          )}
          <Button size="large" block disabled={picked.size === 0 || items.length === 0} onClick={prepare}>
            جهّزي الملف
          </Button>
          <p className={styles.fine}>الملف ينحفظ على جهازك ولا ينرفع لأي مكان.</p>
        </div>
      ) : (
        <div className={styles.icsBody}>
          <div className={styles.fileCard}>
            <span className={styles.fileTile}>
              <FileIcon size={22} />
            </span>
            <span className={styles.fileText}>
              <bdi dir="ltr" className={styles.fileName}>
                {ready.file.name}
              </bdi>
              <span className={styles.fileMeta}>{countLabel(ready.count, REMINDER)} · تتكرر حسب جدولها</span>
            </span>
            <span className={styles.fileOk}>
              <Icon name="check" size={14} />
              جاهز
            </span>
          </div>
          <Button size="large" block icon={<ShareIcon size={20} />} onClick={() => void openInCalendar()}>
            افتحيه بالتقويم
          </Button>
          <Button variant="plain" block onClick={saveToFiles}>
            احفظيه في الملفات
          </Button>
          <h3 className={styles.sectionLabel}>كيف تضيفينه؟</h3>
          <ol className={styles.steps}>
            {STEPS.map((t, i) => (
              <li key={i} className={styles.step}>
                <span className={styles.stepNo}>{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
          <p className={styles.fine}>غيّرتي وقت تذكير؟ صدّري ملف جديد واحذفي القديم من التقويم.</p>
        </div>
      )}
    </Sheet>
  )
}
