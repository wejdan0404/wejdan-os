import { useState, useSyncExternalStore } from 'react'
import { sparksBalance, type JoyItem } from '../../../domain'
import { Button } from '../../components/Button'
import { Sheet } from '../../components/Sheet'
import { StarMark } from '../../components/StarMark'
import { useToast } from '../../components/Toast'
import { useLife, useStore } from '../../state/LifeStore'
import { isLockedByMilestone, pendingRedeems } from './joyModel'
import { countLabel, countWords, NOUNS } from '../../lib/plural'
import styles from './Joy.module.css'

/** Re-renders when a redeem enters/leaves its undo window. */
export function usePendingRedeems() {
  useSyncExternalStore(pendingRedeems.subscribe, pendingRedeems.getVersion)
  return pendingRedeems
}

/** Balance as she should see it: ledger minus redeems still inside the undo window. */
export function useSparkBalance(): number {
  const s = useLife()
  const p = usePendingRedeems()
  return sparksBalance(s) - p.heldSparks()
}

/**
 * Redeem flow: confirm sheet → ledger write → «استلمتيها» toast with تراجع (domain undo token).
 * Returns `request(reward)` and the sheet element to render once.
 */
export function useRedeem() {
  const store = useStore()
  const toast = useToast()
  const balance = useSparkBalance()
  const [target, setTarget] = useState<JoyItem | null>(null)

  const confirm = async () => {
    const r = target
    if (!r || r.price == null) return
    setTarget(null)
    const res = await store.redeem(r.id)
    if (!res.ok) {
      toast({ message: res.shortBy > 0 ? `باقي لك ${countLabel(res.shortBy, NOUNS.spark)} عليها` : 'ما قدرنا نستلمها الحين' })
      return
    }
    pendingRedeems.mark(r.id)
    toast({
      message: `استلمتي «${r.titleAr}» — استمتعي`,
      actionLabel: 'تراجع',
      onAction: () => {
        pendingRedeems.cancel(r.id)
        if (res.undo) void store.undoDelete(res.undo.token)
      },
    })
  }

  const price = target?.price ?? 0
  const sheet = (
    <Sheet open={target != null} onClose={() => setTarget(null)} title="تستلمينها الحين؟" detents={['medium']}>
      {target && (
        <div className={styles.confirm}>
          <StarMark size={28} color="var(--brand-primary)" glow />
          <p className={styles.confirmTitle}>{target.titleAr}</p>
          <p className={styles.confirmBody}>
            ينخصم {countWords(price, NOUNS.spark)}،{' '}
            {balance - price > 0 ? <>ويبقى لك {countWords(balance - price, NOUNS.spark)}.</> : 'وما يبقى لك شرارات.'}
          </p>
          <div className={styles.confirmActions}>
            <Button block size="large" onClick={() => void confirm()}>
              استلميها
            </Button>
            <Button block variant="plain" onClick={() => setTarget(null)}>
              مو الحين
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )

  const s = useLife()
  const request = (r: JoyItem) => {
    // a reward tied to an open milestone opens only after the milestone (QA area4 #9)
    if (isLockedByMilestone(s, r.id)) {
      toast({ message: 'تنفتح لما تخلصين المَعلم في مساري' })
      return
    }
    setTarget(r)
  }

  return { request, sheet }
}
