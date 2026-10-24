import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { ProgressArc } from '../../components/ProgressArc'
import { Screen } from '../../components/Screen'
import { StarMark } from '../../components/StarMark'
import { dur, ease, springs } from '../../motion'
import { useStack } from '../../shell/stack'
import { Glyph } from './Glyph'
import { findItem, isolate } from './lib'
import styles from './Focus.module.css'
import { useTodayModel } from './useTodayModel'
import { clearFocusSession, loadFocusSession, resumeFocusSession, saveFocusSession } from './focusSession'

type Phase = 'ready' | 'running' | 'paused' | 'over' | 'done'

const mmss = (sec: number) => {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** جلسة تركيز — one open arc, one number, nothing else competing. */
export default function FocusScreen() {
  const navigate = useNavigate()
  const stack = useStack()
  const reduce = useReducedMotion()
  const id = decodeURIComponent(useLocation().pathname.split('/').pop() ?? '')
  const { view, isDone, actions } = useTodayModel()
  const found = id === 'free' ? null : findItem(view, id)
  const item = found?.item ?? null
  const baseMin = item ? Math.max(5, item.estimatedMin || 25) : 25
  // a session that was running before a reload/eviction picks up where the wall clock says
  const [restored] = useState(() => loadFocusSession(id))
  const resumed = restored ? resumeFocusSession(restored) : null
  const [totalSec, setTotalSec] = useState(restored?.totalSec ?? baseMin * 60)
  const [elapsed, setElapsed] = useState(resumed?.elapsed ?? 0)
  const [phase, setPhase] = useState<Phase>(resumed?.phase ?? 'ready')
  const startedAt = useRef<number | null>(restored?.phase === 'running' && resumed?.phase === 'running' ? restored.startedAt : null)
  const carried = useRef(restored?.phase === 'running' && resumed?.phase === 'running' ? restored.carried : (resumed?.elapsed ?? 0))

  // persist every phase change so a reload resumes the same session
  useEffect(() => {
    if (phase === 'ready' || phase === 'done') {
      clearFocusSession()
      return
    }
    saveFocusSession({ id, totalSec, phase, startedAt: phase === 'running' ? startedAt.current : null, carried: phase === 'running' ? carried.current : elapsed })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, totalSec, id])

  // tick from the wall clock so backgrounding the tab doesn't drift the timer
  useEffect(() => {
    if (phase !== 'running') return
    const t = window.setInterval(() => {
      const e = carried.current + (Date.now() - (startedAt.current ?? Date.now())) / 1000
      // a locked phone past the end doesn't count as overtime: the session stops at its length
      if (e >= totalSec) {
        setElapsed(totalSec)
        carried.current = totalSec
        startedAt.current = null
        setPhase('over')
      } else setElapsed(e)
    }, 250)
    return () => window.clearInterval(t)
  }, [phase, totalSec])

  // keep the screen on while running (best effort)
  useEffect(() => {
    if (phase !== 'running') return
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    return () => void lock?.release().catch(() => {})
  }, [phase])

  const start = () => {
    startedAt.current = Date.now()
    setPhase('running')
  }
  const pause = () => {
    carried.current = elapsed
    startedAt.current = null
    setPhase('paused')
  }
  /** «خمس دقايق زيادة» — always a full 5 minutes from where the session ended. */
  const extend = () => {
    const base = Math.min(elapsed, totalSec)
    setElapsed(base)
    setTotalSec(base + 5 * 60)
    carried.current = base
    startedAt.current = Date.now()
    setPhase('running')
  }
  const back = () => {
    clearFocusSession()
    if (stack) stack.goBack()
    else navigate('/today')
  }
  const finish = async () => {
    const minutes = Math.max(1, Math.round(Math.min(elapsed, totalSec) / 60))
    if (item && found?.where === 'plan' && !isDone(item)) {
      await actions.complete(item, item.suggestedLevel, { durationMin: minutes })
    }
    setPhase('done')
    window.setTimeout(back, reduce ? 300 : 1200)
  }

  const remaining = totalSec - elapsed
  const progress = Math.min(1, elapsed / totalSec)
  const title = item ? item.title.ar : 'جلسة تركيز حرّة'

  return (
    <Screen title="جلسة تركيز" backLabel="اليوم" inlineTitle>
      <div className={styles.stage}>
        <p className={styles.what}>
          <Bidi>{title}</Bidi>
        </p>

        <div className={styles.arcWrap}>
          <ProgressArc value={progress} size={248} stroke={6} label={`باقي ${mmss(remaining)}`}>
            <AnimatePresence mode="wait" initial={false}>
              {phase === 'done' ? (
                <motion.span key="star" initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springs.pop}>
                  <StarMark size={40} color="var(--action-default)" glow label="خلصت الجلسة" />
                </motion.span>
              ) : (
                <motion.span key="time" className={styles.time} aria-live="off" initial={false}>
                  <bdi>{mmss(phase === 'over' ? 0 : remaining)}</bdi>
                </motion.span>
              )}
            </AnimatePresence>
          </ProgressArc>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={phase} className={styles.status} role="status" initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: dur.base, ease: ease.standard }}>
            {phase === 'ready' && `${isolate(String(Math.round(totalSec / 60)))} دقيقة — النسخة الصغيرة تكفي لو احتجتي`}
            {phase === 'running' && 'معك. الجوال على جنب.'}
            {phase === 'paused' && 'وقفة صغيرة — كمّلي وقت ما تبين.'}
            {phase === 'over' && 'خلص الوقت. تبين تكمّلين شوي؟'}
            {phase === 'done' && 'انحسبت لك.'}
          </motion.p>
        </AnimatePresence>

        <div className={styles.controls}>
          {phase === 'ready' && (
            <Button block size="large" icon={<Glyph name="play" size={20} />} onClick={start}>
              ابدئي
            </Button>
          )}
          {phase === 'running' && (
            <Button block size="large" variant="secondary" icon={<Glyph name="pause" size={20} />} onClick={pause}>
              وقفة
            </Button>
          )}
          {phase === 'paused' && (
            <Button block size="large" icon={<Glyph name="play" size={20} />} onClick={start}>
              كمّلي
            </Button>
          )}
          {phase === 'over' && (
            <Button block size="large" variant="secondary" onClick={extend}>
              خمس دقايق زيادة
            </Button>
          )}
          {phase !== 'ready' && phase !== 'done' && (
            <Button block size="large" variant={phase === 'over' ? 'primary' : 'plain'} onClick={() => void finish()}>
              {item && found?.where === 'plan' ? 'خلّصتها' : 'خلّصت'}
            </Button>
          )}
          {phase === 'ready' && (
            <Button block variant="plain" onClick={back}>
              مو الحين
            </Button>
          )}
        </div>
      </div>
    </Screen>
  )
}
