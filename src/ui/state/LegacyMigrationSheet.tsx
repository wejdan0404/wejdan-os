/**
 * Boot offer to move her data from the old (Flutter) version of the app, which lives on the
 * same origin in IndexedDB. Shown once when old data exists and the new store is still empty.
 * «نقلها» → read old boxes (untouched) → import with automatic backup → done.
 * «بعدين» → snoozed for 24 h.
 * If she already uses the new app (e.g. «بعدين» then onboarding), it re-offers ONCE as a reviewed
 * merge (Settings → البيانات), never a silent replace. Settings keeps the entry until it's moved.
 */
import { useEffect, useState } from 'react'
import {
  markLegacyReoffered, migrateLegacyData, shouldOfferLegacyMigration, shouldReofferLegacyMigration, snoozeLegacyMigration,
  type LegacyDetection, type LifeStore,
} from '../../domain'
import { Button } from '../components/Button'
import { Sheet } from '../components/Sheet'
import { NOUNS, countLabel } from '../lib/plural'

type Phase =
  | { k: 'idle' }
  | { k: 'ask'; d: LegacyDetection }
  | { k: 'merge' }
  | { k: 'working' }
  | { k: 'done'; habits: number }
  | { k: 'error' }

/** Settings deep link that opens the reviewed merge of the old data. */
export const kLegacyReviewHash = '#/me/settings?s=legacy'

export function LegacyMigrationSheet({ store }: { store: LifeStore }) {
  const [phase, setPhase] = useState<Phase>({ k: 'idle' })

  useEffect(() => {
    let alive = true
    let checkedReoffer = false
    const tryReoffer = () => {
      const snap = store.getSnapshot()
      if (checkedReoffer || !snap.settings.onboardingDone) return
      checkedReoffer = true
      shouldReofferLegacyMigration(snap)
        .then((o) => {
          if (alive && o.offer) setPhase((p) => (p.k === 'idle' ? { k: 'merge' } : p))
        })
        .catch(() => {})
    }
    shouldOfferLegacyMigration(store.getSnapshot())
      .then((o) => {
        if (!alive) return
        if (o.offer) setPhase({ k: 'ask', d: o.detection })
        else tryReoffer()
      })
      .catch(() => {
        /* detection failing must never block the app */
      })
    // «بعدين» on the boot offer, then onboarding: re-offer once as soon as she finishes it
    const unsub = store.subscribe(tryReoffer)
    return () => {
      alive = false
      unsub()
    }
  }, [store])

  const close = () => setPhase({ k: 'idle' })
  const mergeLater = () => {
    markLegacyReoffered()
    close()
  }
  const review = () => {
    markLegacyReoffered()
    close()
    window.location.hash = kLegacyReviewHash
  }
  const later = () => {
    snoozeLegacyMigration()
    close()
  }
  const move = async () => {
    setPhase({ k: 'working' })
    try {
      const r = await migrateLegacyData(store, { confirm: true })
      setPhase({ k: 'done', habits: r.imported['habits'] ?? 0 })
      // Her old setup is done — leave the first-run screens if they were showing.
      if (window.location.hash.startsWith('#/onboarding')) window.location.hash = '#/today'
    } catch {
      setPhase({ k: 'error' })
    }
  }

  const open = phase.k !== 'idle'
  return (
    <Sheet open={open} onClose={phase.k === 'ask' ? later : phase.k === 'merge' ? mergeLater : close} title="بياناتك القديمة" detents={['medium']}>
      <div style={{ display: 'grid', gap: 16, paddingBlock: 8 }}>
        {phase.k === 'ask' && (
          <>
            <p style={{ margin: 0, font: 'var(--type-body)', color: 'var(--text-primary)' }}>
              لقينا بياناتك من النسخة القديمة — ننقلها؟
            </p>
            <p style={{ margin: 0, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
              ننقل عاداتك وتسجيلاتك ومشاريعك وفلوسك لهالنسخة. النسخة القديمة تبقى زي ما هي على جهازك، ونحفظ نسخة احتياطية قبل النقل.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              <Button block size="large" onClick={() => void move()}>
                نقلها
              </Button>
              <Button block variant="plain" onClick={later}>
                بعدين
              </Button>
            </div>
          </>
        )}
        {phase.k === 'merge' && (
          <>
            <p style={{ margin: 0, font: 'var(--type-body)', color: 'var(--text-primary)' }}>
              لسا عندك بيانات من النسخة القديمة — تبين ندمجها مع اللي بدأتيه هنا؟
            </p>
            <p style={{ margin: 0, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
              نعرض لك كل نوع قبل ما يتغيّر شي، واللي عندك الحين يبقى. نحفظ نسخة احتياطية قبل الدمج، والنسخة القديمة تبقى زي ما هي.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              <Button block size="large" onClick={review}>
                راجعيها وادمجيها
              </Button>
              <Button block variant="plain" onClick={mergeLater}>
                بعدين — ألقاها بالإعدادات
              </Button>
            </div>
          </>
        )}
        {phase.k === 'working' && (
          <p role="status" aria-live="polite" style={{ margin: 0, font: 'var(--type-body)', color: 'var(--text-secondary)' }}>
            لحظة، ننقل بياناتك…
          </p>
        )}
        {phase.k === 'done' && (
          <>
            <p role="status" aria-live="polite" style={{ margin: 0, font: 'var(--type-body)', color: 'var(--text-primary)' }}>
              تمام، انتقلت بياناتك — {countLabel(phase.habits, NOUNS.habit)} وكل تسجيلاتك.
            </p>
            <Button block size="large" onClick={close}>
              يلا نكمل
            </Button>
          </>
        )}
        {phase.k === 'error' && (
          <>
            <p role="alert" style={{ margin: 0, font: 'var(--type-body)', color: 'var(--text-primary)' }}>
              ما قدرنا ننقلها الحين. بياناتك القديمة سليمة — جربي مرة ثانية.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              <Button block size="large" onClick={() => void move()}>
                جربي مرة ثانية
              </Button>
              <Button block variant="plain" onClick={later}>
                بعدين
              </Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}
