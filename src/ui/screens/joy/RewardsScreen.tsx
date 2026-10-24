import { useState } from 'react'
import { type JoyItem } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { StarMark } from '../../components/StarMark'
import { useToast } from '../../components/Toast'
import { Icon } from '../../icons/Icon'
import { useLife, useStore } from '../../state/LifeStore'
import { JoyEditSheet } from './JoyEditSheet'
import { earnedRewards, milestoneRewards, rewardStatus, SIZE_LABEL, sortRewards } from './joyModel'
import { usePendingRedeems, useRedeem, useSparkBalance } from './useRedeem'
import shared from './Joy.module.css'
import { countWords, NOUNS } from '../../lib/plural'
import styles from './RewardsScreen.module.css'

/** مكافآتي — rewards she set for herself, priced in Sparks; plus rewards tied to goal milestones. */
export default function RewardsScreen() {
  const s = useLife()
  const store = useStore()
  const toast = useToast()
  const balance = useSparkBalance()
  const pending = usePendingRedeems()
  const redeem = useRedeem()
  const [editing, setEditing] = useState<{ item: JoyItem | null } | null>(null)

  const tied = milestoneRewards(s)
  const tiedIds = new Set(tied.map((t) => t.reward.id))
  const rewards = sortRewards(
    // a reward tied to a milestone is listed once, under «مكافآت المعالم» (QA area4 #9)
    earnedRewards(s).filter((r) => r.active && !tiedIds.has(r.id)),
    balance,
  )
  const ready = rewards.filter((r) => rewardStatus(r, balance).ready || pending.has(r.id))
  const saving = rewards.filter((r) => !ready.includes(r))

  const remove = async (r: JoyItem) => {
    const token = await store.deleteJoyItem(r.id)
    toast({
      message: `انحذفت «${r.titleAr}»`,
      actionLabel: token ? 'تراجع' : undefined,
      onAction: token ? () => void store.undoDelete(token.token) : undefined,
    })
  }

  const row = (r: JoyItem) => {
    const st = rewardStatus(r, balance)
    const held = pending.has(r.id)
    const canRedeem = st.ready && !held
    return (
      <ListRow
        key={r.id}
        leading={
          st.ready || held ? (
            <span className={shared.starBadge} role="img" aria-label="استحقيتيها">
              <StarMark size={14} color="var(--brand-primary)" />
            </span>
          ) : (
            <span className={shared.ring} aria-hidden="true" />
          )
        }
        title={<Bidi>{r.titleAr}</Bidi>}
        subtitle={
          held ? (
            <span className={shared.accentText}>استلمتيها — استمتعي</span>
          ) : st.ready ? (
            <span className={shared.accentText}>استحقيتيها — استمتعي</span>
          ) : st.priced ? (
            <>
              باقي {countWords(st.remaining, NOUNS.spark)} · {SIZE_LABEL[r.size]}
            </>
          ) : (
            SIZE_LABEL[r.size]
          )
        }
        trailing={canRedeem ? <span className={shared.smallBtn}>استلميها</span> : undefined}
        chevron={!canRedeem}
        onClick={() => (canRedeem ? redeem.request(r) : setEditing({ item: r }))}
        menu={[
          ...(canRedeem ? [{ key: 'redeem', label: 'استلميها', onSelect: () => redeem.request(r) }] : []),
          { key: 'edit', label: 'تعديل', onSelect: () => setEditing({ item: r }) },
          { key: 'del', label: 'احذفي', destructive: true, icon: <Icon name="trash" size={18} />, onSelect: () => void remove(r) },
        ]}
        trailingActions={[{ key: 'del', label: 'حذف', tone: 'destructive', icon: <Icon name="trash" size={18} />, onAction: () => void remove(r) }]}
      />
    )
  }

  const empty = rewards.length === 0 && tied.length === 0

  return (
    <Screen
      title="مكافآتي"
      backLabel="متعتي"
      subtitle={
        <span className={styles.balance}>
          <StarMark size={12} color="var(--brand-primary)" />
          {balance > 0 ? <>عندك {countWords(balance, NOUNS.spark)}</> : 'ما عندك شرارات للحين'}
        </span>
      }
      actions={
        <button type="button" className={styles.add} aria-label="أضيفي مكافأة" onClick={() => setEditing({ item: null })}>
          <Icon name="plus" size={22} />
        </button>
      }
    >
      {empty ? (
        <EmptyState
          title="ما حددتي مكافأة للحين"
          body="اختاري شي تحبينه، وحطي له عدد شرارات — تستلمينه لما تجمعينها."
          action={
            <button type="button" className={shared.linkBtn} onClick={() => setEditing({ item: null })}>
              أضيفي أول مكافأة
            </button>
          }
        />
      ) : (
        <>
          {ready.length > 0 && <InsetGroupedList header="جاهزة لك">{ready.map(row)}</InsetGroupedList>}
          {saving.length > 0 && (
            <InsetGroupedList header="تجمعين لها" footer="الشرارات تجي من أي نسخة صغيرة، والرجعة بعد غياب تنحسب لك ضعف.">
              {saving.map(row)}
            </InsetGroupedList>
          )}
          {tied.length > 0 && (
            <InsetGroupedList header="مكافآت المعالم" footer="تنفتح لما تخلصين المَعلم في مساري.">
              {tied.map(({ goal, milestone, reward }) => {
                const st = rewardStatus(reward, balance)
                const held = pending.has(reward.id)
                // unlocked only once the milestone is done; a priced one still needs its sparks
                const canRedeem = milestone.done && st.priced && st.ready && !held
                return (
                  <ListRow
                    key={`${goal.id}:${milestone.id}`}
                    leading={
                      milestone.done ? (
                        <span className={shared.starBadge} role="img" aria-label="خلّصتيه">
                          <StarMark size={14} color="var(--brand-primary)" />
                        </span>
                      ) : (
                        <span className={shared.ring} aria-hidden="true" />
                      )
                    }
                    title={<Bidi>{reward.titleAr}</Bidi>}
                    subtitle={
                      !milestone.done ? (
                        <>
                          لما تخلصين: <Bidi>{milestone.titleAr}</Bidi> · <Bidi>{goal.titleAr}</Bidi>
                        </>
                      ) : held ? (
                        <span className={shared.accentText}>استلمتيها — استمتعي</span>
                      ) : st.priced && !st.ready ? (
                        <>
                          خلّصتي المَعلم — باقي {countWords(st.remaining, NOUNS.spark)}
                        </>
                      ) : (
                        <span className={shared.accentText}>
                          خلّصتي «<Bidi>{milestone.titleAr}</Bidi>» — استحقيتيها
                        </span>
                      )
                    }
                    trailing={canRedeem ? <span className={shared.smallBtn}>استلميها</span> : undefined}
                    chevron={!canRedeem}
                    onClick={() => (canRedeem ? redeem.request(reward) : setEditing({ item: reward }))}
                  />
                )
              })}
            </InsetGroupedList>
          )}
        </>
      )}

      <JoyEditSheet open={editing != null} onClose={() => setEditing(null)} item={editing?.item ?? null} defaultMode="earned" />
      {redeem.sheet}
    </Screen>
  )
}
