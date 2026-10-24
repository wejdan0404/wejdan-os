import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { countLabel, NOUNS } from '../../lib/plural'
import { Icon } from '../../icons/Icon'
import { Bidi } from '../../components/Bidi'
import { useStableNavigate } from '../../shell/navigate'
import { dur, ease } from '../../motion'
import { Clock12Text } from './format'
import styles from './reminders.module.css'
import { useDueReminders } from './useDueReminders'

/**
 * «وقت روتين الصبح» — the in-app reminder banner on Today. Shows only while the app is open, when a reminder's
 * time has passed and its item is not done (and not in quiet hours). Never auto-dismisses.
 * IN-FLOW: a card at the top of Today's scroll content that pushes the day down. It is never fixed or portalled,
 * so it cannot cover a control (header «+»/search, toast, tab bar) and cannot trap focus or block taps.
 * One at a time; the rest are summarised as «+N». Motion: fades + slides 8px in `base`, exits `quick`; reduced motion only fades.
 */
export function TodayReminderBanner() {
  const { pathname } = useLocation()
  const navigate = useStableNavigate()
  const reduce = useReducedMotion()
  const { current, queued, dismiss, snooze } = useDueReminders()
  // tab roots stay mounted under other screens: the banner belongs to Today only
  const visible = pathname === '/today' || pathname === '/' ? current : null

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.section
          key={visible.id}
          className={styles.banner}
          aria-label="تذكير"
          role="alert"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.enter } }}
          exit={{ opacity: 0, transition: { duration: dur.quick, ease: ease.exit } }}
        >
          <div className={styles.bannerTop}>
            <span className={styles.bannerIcon}>
              <Icon name="bell" size={20} />
            </span>
            <div className={styles.bannerText}>
              <p className={styles.bannerTitle}>
                وقت <Bidi>{visible.title}</Bidi>
              </p>
              <p className={styles.bannerSub}>
                <Clock12Text minute={visible.minute} />
                {visible.stepsLeft != null && visible.stepsLeft > 0 && <> · {countLabel(visible.stepsLeft, NOUNS.step)}</>}
              </p>
            </div>
            {queued > 0 && (
              <span className={styles.bannerMore} aria-label={queued === 1 ? 'وفيه تذكير ثاني بعده' : `وفيه ${queued} تذكيرات ثانية بعده`}>
                <bdi dir="ltr">+{queued}</bdi>
              </span>
            )}
            <button type="button" className={styles.bannerClose} aria-label="سكّري التذكير" onClick={() => dismiss(visible)}>
              <Icon name="close" size={18} />
            </button>
          </div>
          <div className={styles.bannerActions}>
            <button
              type="button"
              className={styles.bannerPrimary}
              onClick={() => {
                dismiss(visible)
                navigate(visible.kind === 'routine' ? `/routine/${visible.itemId}/play` : `/habits/${visible.itemId}`)
              }}
            >
              ابدئي
            </button>
            <button type="button" className={styles.bannerSecondary} onClick={() => snooze(visible)}>
              بعد 10 دقايق
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
