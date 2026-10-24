import { useCallback, useState } from 'react'
import { kMaxMaintainDomains, type DomainId, type Habit } from '../../../domain'
import { Button } from '../../components/Button'
import { Flower, flowerForDomain } from '../../components/flowers'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Sheet } from '../../components/Sheet'
import { wakeDomainsRespectingCap } from '../../lib/domains'
import { useStore } from '../../state/LifeStore'
import styles from './habits.module.css'

/** What she chose for a habit whose domain is resting while «صيانة» is already full. */
export type WakeOutcome = 'woke' | 'swapped' | 'kept' | 'paused'

interface Pending {
  blocked: DomainId[]
  habits: Habit[]
  resolve: (o: WakeOutcome) => void
}

/**
 * Asks her before a new habit pushes «صيانة» past its cap (QA area 2 #4): swap a domain to
 * «راحة», keep the habit's domain resting, or save the habit paused. Nothing changes silently.
 *
 *   const { wake, sheet } = useDomainWake()
 *   const outcome = await wake([habit])   // render {sheet} once in the screen
 */
export function useDomainWake() {
  const store = useStore()
  const [pending, setPending] = useState<Pending | null>(null)

  const wake = useCallback(
    async (habits: Habit[]): Promise<WakeOutcome> => {
      const active = habits.filter((h) => h.status === 'active')
      if (active.length === 0) return 'woke'
      const { blocked } = await wakeDomainsRespectingCap(store, store.getSnapshot(), active.map((h) => h.domain))
      if (blocked.length === 0) return 'woke'
      return new Promise<WakeOutcome>((resolve) => setPending({ blocked, habits: active.filter((h) => blocked.includes(h.domain)), resolve }))
    },
    [store],
  )

  const close = (o: WakeOutcome) => {
    pending?.resolve(o)
    setPending(null)
  }

  const s = store.getSnapshot()
  const name = (id: DomainId) => s.domains.find((d) => d.id === id)?.nameAr ?? ''
  const maintain = s.domains.filter((d) => d.enabled && !d.sensitive && d.state === 'maintain').sort((a, b) => a.sortOrder - b.sortOrder)
  const first = pending?.blocked[0] ?? null

  const swap = async (restId: DomainId) => {
    if (!pending) return
    await store.setDomainState(restId, 'rest')
    for (const id of pending.blocked) await store.setDomainState(id, 'maintain')
    close('swapped')
  }
  const keep = () => close('kept')
  const park = async () => {
    if (!pending) return
    for (const h of pending.habits) await store.setHabitStatus(h.id, 'paused')
    close('paused')
  }

  const sheet = (
    <Sheet open={pending != null} onClose={keep} title="مجالاتك للصيانة مليانة" detents={['medium', 'large']}>
      {first && (
        <div className={styles.form}>
          <p className={styles.proposal}>
            مجال «{pending!.blocked.map(name).join('» و«')}» مرتاح، وعندك {kMaxMaintainDomains} مجالات تحافظين عليها — وهذا الأريح بالكثير.
          </p>
          {pending!.blocked.length === 1 && (
            <InsetGroupedList flush header="ريّحي واحد بداله">
              {maintain.map((d) => (
                <ListRow
                  key={d.id}
                  leading={<Flower kind={flowerForDomain(d.id)} stage={4} size={32} decorative />}
                  title={d.nameAr}
                  subtitle="يصير «راحة» — ولا ينحذف شي"
                  onClick={() => void swap(d.id)}
                  chevron
                />
              ))}
            </InsetGroupedList>
          )}
          <Button variant="secondary" onClick={keep}>
            خلّي مجالها مرتاح
          </Button>
          <Button variant="plain" onClick={() => void park()}>
            احفظيها موقّفة
          </Button>
        </div>
      )}
    </Sheet>
  )

  return { wake, sheet }
}
