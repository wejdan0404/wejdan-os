import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  addDays,
  dateOnly,
  habitRestingOf,
  habitStrengthOf,
  isDoneLevel,
  isMechanical,
  isPlannedOn,
  logsOn,
  MISS_REASONS,
  forgivingStreakOf,
  momentumOf,
  weekStreakDays,
  habitReminderRows,
  type DesignChange,
  type Habit,
  type MissReason,
} from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Flower, FLOWER_AR, flowerForDomain, STAGE_OF } from '../../components/flowers'
import { Screen } from '../../components/Screen'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { Icon } from '../../icons/Icon'
import { useStack } from '../../shell/stack'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import styles from './habits.module.css'
import { cueLabel, hhmm, LIcon, MISS_REASON_AR, momentumWord, RESTING_AR, STAGE_AR, useUndoDelete, weekdaysLabel } from './shared'
import { LinkedNotes } from '../notes/LinkedNotes'
import { StreakHero } from './StreakHero'
import { Clock12Text } from '../reminders/format'

function describeChange(c: DesignChange, h: Habit): string {
  switch (c.type) {
    case 'moveCueAddReminder':
      return 'نربطها بلحظة أوضح في يومك، ونشغّل لها تذكير هادي واحد.'
    case 'swapTime':
      return c.suggestedMinute != null ? `نخلي وقتها ${hhmm(c.suggestedMinute)} — الوقت اللي غالبًا تخلّصين فيه.` : 'نبدّل وقتها لوقت أريح لك.'
    case 'shrinkToMinimum':
      return `نخليها على النسخة الصغيرة فترة${h.minimumText ? `: ${h.minimumText}` : ''}. تنحسب كاملة.`
    case 'minimumAndMoveEarlier':
      return 'نصغّرها للنسخة الصغيرة ونقدّمها لوقت أبكر قبل ما يزحمك اليوم.'
    case 'addJoyPairing':
      return 'نربطها بشي تحبينه — بودكاست، قهوة، أغنية. اختاريه أنتِ.'
    case 'changePlacePrepare':
      return 'نجهّز لها المكان والأغراض من قبل، عشان تبدين بدون تفكير.'
    default:
      return 'تعديل صغير على خطة العادة.'
  }
}

export default function HabitDetailScreen() {
  const loc = useLocation()
  const id = decodeURIComponent(loc.pathname.split('/').pop() ?? '')
  // «تعثّرت فيها؟» from Today opens straight into recovery (…?recover=1)
  const wantsRecovery = new URLSearchParams(loc.search).get('recover') === '1'
  const navigate = useNavigate()
  const stack = useStack()
  const toast = useToast()
  const undoDelete = useUndoDelete()
  const store = useStore()
  const s = useLife()
  const today = useToday()
  const h = s.habits.find((x) => x.id === id)

  const [recoverOpen, setRecoverOpen] = useState(false)
  const [change, setChange] = useState<DesignChange | null>(null)
  const autoOpened = useRef(false)
  useEffect(() => {
    if (!wantsRecovery || autoOpened.current || !h) return
    autoOpened.current = true
    store.startRecovery(h.id)
    setChange(null)
    setRecoverOpen(true)
  }, [wantsRecovery, h, store])

  const last14 = useMemo(() => {
    if (!h) return []
    const t = dateOnly(today)
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(t, i - 13)
      if (!isPlannedOn(h.schedule, d)) return 'off' as const
      const l = logsOn(s, d).get(h.id)
      return l != null && isDoneLevel(l.level) ? ('done' as const) : ('open' as const)
    })
  }, [h, s, today])

  if (!h) {
    return (
      <Screen title="العادة" backLabel="عاداتي" inlineTitle>
        <EmptyState title="ما لقينا هالعادة" body="يمكن انحذفت. ارجعي لعاداتي." />
      </Screen>
    )
  }

  const st = habitStrengthOf(s, h.id, today)
  const resting = habitRestingOf(s, h.id, today)
  const stage = resting ? RESTING_AR : STAGE_AR[st?.stage ?? 'seed']
  const momentum = momentumWord(momentumOf(s, h.id, today))
  const paused = h.status === 'paused'

  const streak = forgivingStreakOf(s, h.id, today)
  const weekDays = weekStreakDays({ habit: h, logs: s.logs, today, weekStartsOn: s.settings.weekStartsOn, streak: streak != null })
  const reminderMinute = habitReminderRows(s).find((r) => r.id === h.id)?.minute ?? null

  const sizes = [
    { key: 'min', title: 'النسخة الصغيرة', text: h.minimumText, min: h.minimumDurationMin, note: 'تنحسب كاملة' },
    { key: 'normal', title: 'العادية', text: h.normalText, min: h.durationMin },
    { key: 'bonus', title: 'زيادة لو ودّك', text: h.bonusText, min: null as number | null },
  ].filter((x) => x.text.trim() !== '' || x.key !== 'bonus')

  const why = [
    { k: 'goal', t: 'ليش', v: h.goal },
    { k: 'ifThen', t: 'لو… فـ', v: h.ifThen },
    { k: 'joy', t: 'معها متعة', v: h.joyPairing },
  ].filter((x) => x.v.trim() !== '')

  const openRecovery = () => {
    store.startRecovery(h.id)
    setChange(null)
    setRecoverOpen(true)
  }
  const pickReason = (r: MissReason) => {
    const c = store.proposeRecovery(h.id, r)
    if (c) setChange(c)
    else {
      setRecoverOpen(false)
      toast({ message: 'عادي، صارت. ارجعي لها بنسخة صغيرة وقت ما تقدرين.' })
    }
  }
  const accept = async () => {
    if (!change) return
    const before = h
    await store.acceptDesignChange(change)
    setRecoverOpen(false)
    toast({ message: 'تمام، عدّلنا الخطة — مو أنتِ', actionLabel: 'تراجع', onAction: () => void store.upsertHabit(before, true) })
  }
  /** Back to the normal version after a recovery shrink (the shrink is «فترة», never forever). */
  const unshrink = async () => {
    await store.upsertHabit({ ...h, shrunkToMinimum: false }, true)
    toast({ message: 'رجعت للنسخة العادية', actionLabel: 'تراجع', onAction: () => void store.upsertHabit({ ...h, shrunkToMinimum: true }, true) })
  }

  const togglePause = async () => {
    await store.setHabitStatus(h.id, paused ? 'active' : 'paused')
    toast(paused ? { message: 'رجعت لعاداتك' } : { message: 'وقّفناها فترة', actionLabel: 'تراجع', onAction: () => void store.setHabitStatus(h.id, 'active') })
  }
  const remove = async () => {
    await undoDelete(h.titleAr, () => store.deleteHabit(h.id), (t) => store.undoDelete(t))
    stack?.goBack()
  }

  return (
    <Screen title={h.titleAr} backLabel="عاداتي" subtitle={<span>{cueLabel(h.schedule.anchor)} · {weekdaysLabel(h.schedule.weekdays)}</span>}>
      <section className={styles.detailHero} aria-label="قوة العادة">
        <span className={resting ? styles.resting : undefined}>
          <Flower kind={flowerForDomain(h.domain)} stage={STAGE_OF[st?.stage ?? 'seed']} size={88} />
        </span>
        <div className={styles.detailHeroText}>
          <span className={styles.detailStage}>{paused ? 'موقّفة فترة' : stage}</span>
          <span className={styles.detailMeta}>
            {FLOWER_AR[flowerForDomain(h.domain)]}
            {paused ? null : <> · {momentum}</>}
          </span>
          <div className={styles.dots} role="img" aria-label="آخر أسبوعين">
            {last14.map((d, i) => (
              <span key={i} className={styles.dot} data-s={d} />
            ))}
          </div>
        </div>
      </section>

      {h.status === 'active' && <StreakHero streak={streak} momentumText={momentum} days={weekDays} onOpenSettings={() => navigate('/me/settings?s=habits')} />}

      {h.shrunkToMinimum && (
        <InsetGroupedList footer="اقترحناها وقت التعافي. ترجعين للعادية وقت ما تحسين إنها خفّت.">
          <ListRow
            leading={<LIcon name="recover" size={22} />}
            title="على النسخة الصغيرة فترة"
            subtitle={h.minimumText ? <Bidi>{h.minimumText}</Bidi> : 'تنحسب كاملة'}
            trailing={
              <Button variant="plain" onClick={() => void unshrink()}>
                رجّعيها للعادية
              </Button>
            }
          />
        </InsetGroupedList>
      )}

      <InsetGroupedList header="الأحجام" footer="أي نسخة تسوينها تنحسب لك.">
        {sizes.map((z) => (
          <ListRow
            key={z.key}
            title={z.title}
            subtitle={
              <span className={styles.sizeText}>
                <Bidi>{[z.text, z.min ? `${z.min} د` : '', z.note ?? ''].filter(Boolean).join(' · ') || '—'}</Bidi>
              </span>
            }
          />
        ))}
      </InsetGroupedList>

      <InsetGroupedList header="تذكير">
        <ListRow
          leading={<Icon name="bell" size={22} />}
          title="تذكير داخل التطبيق"
          subtitle={reminderMinute == null ? 'ما حطيتي لها وقت' : 'يطلع لك وأنتِ فاتحة التطبيق'}
          trailing={reminderMinute == null ? undefined : <Clock12Text minute={reminderMinute} />}
          chevron
          onClick={() => navigate('/me/reminders')}
        />
      </InsetGroupedList>

      {why.length > 0 && (
        <InsetGroupedList header="ليش هالعادة">
          {why.map((w) => (
            <ListRow key={w.k} title={w.t} subtitle={<Bidi>{w.v}</Bidi>} />
          ))}
        </InsetGroupedList>
      )}

      <InsetGroupedList header="إذا ما مشت معك">
        <ListRow
          leading={<LIcon name="recover" size={22} />}
          title="ابدئي التعافي"
          subtitle="نعدّل الخطة، مو نلومك"
          chevron
          onClick={openRecovery}
        />
        <ListRow
          leading={<LIcon name={paused ? 'play' : 'pause'} size={22} />}
          title={paused ? 'رجّعيها' : 'وقّفيها فترة'}
          subtitle={paused ? 'ترجع لعاداتك من اليوم' : 'ما يروح شي من سجلّها'}
          onClick={() => void togglePause()}
        />
        <ListRow leading={<LIcon name="edit" size={22} />} title="عدّليها" chevron onClick={() => navigate(`/studio?habit=${h.id}`)} />
        <ListRow leading={<Icon name="trash" size={22} />} title="احذفيها" subtitle="تقدرين تتراجعين خلال ثواني" onClick={() => void remove()} />
      </InsetGroupedList>

      <LinkedNotes kind="habit" id={h.id} />

      <Sheet open={recoverOpen} onClose={() => setRecoverOpen(false)} title={change ? 'اقتراح صغير' : 'وش اللي صار؟'} detents={['medium', 'large']}>
        {!change ? (
          <InsetGroupedList flush footer="اختاري أقرب سبب — هذي معلومة تساعدنا نعدّل، مو حكم عليك.">
            {MISS_REASONS.map((r) => (
              <ListRow key={r} title={MISS_REASON_AR[r]} chevron onClick={() => pickReason(r)} />
            ))}
          </InsetGroupedList>
        ) : (
          <div className={styles.form}>
            <p className={styles.proposal}>{describeChange(change, h)}</p>
            <div className={styles.formActions}>
              {isMechanical(change) ? (
                <Button onClick={() => void accept()}>اعتمديها</Button>
              ) : (
                <Button
                  onClick={() => {
                    setRecoverOpen(false)
                    navigate(`/studio?habit=${h.id}`)
                  }}
                >
                  عدّليها بنفسك
                </Button>
              )}
              <Button variant="secondary" onClick={() => setChange(null)}>
                سبب ثاني
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </Screen>
  )
}
