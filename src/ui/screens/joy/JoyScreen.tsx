import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { useStableNavigate } from '../../shell/navigate'
import { dayKey, isDoneLevel, logsOn, type JoyItem } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { Sheet } from '../../components/Sheet'
import { StarMark } from '../../components/StarMark'
import { useToast } from '../../components/Toast'
import { Icon } from '../../icons/Icon'
import { springs } from '../../motion'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import { JoyEditSheet } from './JoyEditSheet'
import { earnedRewards, freeJoys, isLockedByMilestone, readTodayPick, rewardStatus, SIZE_LABEL, sortRewards, todaysFreeJoy, writeTodayPick } from './joyModel'
import { usePendingRedeems, useRedeem, useSparkBalance } from './useRedeem'
import { countLabel, countWords, NOUNS } from '../../lib/plural'
import styles from './JoyScreen.module.css'
import shared from './Joy.module.css'

export default function JoyScreen() {
  const s = useLife()
  const store = useStore()
  const today = useToday()
  const navigate = useStableNavigate()
  const toast = useToast()
  const reduce = useReducedMotion()
  const balance = useSparkBalance()
  const pending = usePendingRedeems()
  const redeem = useRedeem()
  const key = dayKey(today)

  const [pick, setPick] = useState<string | null>(() => readTodayPick(key))
  const [choosing, setChoosing] = useState(false)
  const [editing, setEditing] = useState<{ item: JoyItem | null; mode: 'free' | 'earned' } | null>(null)

  const joy = todaysFreeJoy(s, today, pick)
  const todayLogs = logsOn(s, today)
  const joyLog = joy ? todayLogs.get(joy.id) : undefined
  const joyDone = joyLog != null && isDoneLevel(joyLog.level)
  const joys = freeJoys(s)
  // a reward tied to an open milestone lives under «مكافآت المعالم» only (QA area4 #9)
  const rewards = sortRewards(earnedRewards(s).filter((r) => r.active && (r.price ?? 0) > 0 && !isLockedByMilestone(s, r.id)), balance)
  const topRewards = rewards.slice(0, 3)
  // a fresh Joy shows ONE empty state, not three stacked (QA #24)
  const fresh = joys.length === 0 && rewards.length === 0

  const markDone = async () => {
    if (!joy) return
    const r = await store.completeItem({ itemId: joy.id, kind: 'joy' }, 'normal')
    toast({ message: 'استمتعي — انحسبت لك', actionLabel: 'تراجع', onAction: () => void store.undo(r.log.id) })
  }

  const choose = (id: string) => {
    writeTodayPick(key, id)
    setPick(id)
    setChoosing(false)
  }

  const deleteJoy = async (j: JoyItem) => {
    const token = await store.deleteJoyItem(j.id)
    toast({
      message: `انحذفت «${j.titleAr}»`,
      actionLabel: token ? 'تراجع' : undefined,
      onAction: token ? () => void store.undoDelete(token.token) : undefined,
    })
  }

  const sparksPill = (
    <button type="button" className={styles.sparks} onClick={() => navigate('/joy/reward')} aria-label={`${countLabel(balance, NOUNS.spark)} — مكافآتك`}>
      <StarMark size={12} color="var(--brand-primary)" />
      <bdi className={shared.num}>{balance}</bdi>
    </button>
  )

  return (
    <Screen
      title="متعتي"
      titleEnd={balance > 0 ? sparksPill : undefined}
      subtitle="اللي يفرّحك جزء من يومك — مو مكافأة على الإنجاز."
      band={<span className={styles.band} />}
    >

      {joy ? (
        <motion.section
          className={styles.hero}
          aria-label="متعة اليوم"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.smooth}
        >
          <span className={styles.heroGlow} aria-hidden="true" />
          <span className={styles.heroEyebrow}>متعة اليوم · بدون شروط</span>
          <h2 className={styles.heroTitle}>
            <Bidi>{joy.titleAr}</Bidi>
          </h2>
          <p className={styles.heroBody}>
            {joyDone ? 'سوّيتيها اليوم — هذي لك.' : 'لك — حتى لو اليوم ما مشى زي ما تبين.'}
          </p>
          <div className={styles.heroActions}>
            {joyDone ? (
              <span className={styles.heroDone}>
                <StarMark size={16} color="var(--hero-accent)" glow />
                انحسبت لك
              </span>
            ) : (
              <motion.button type="button" className={styles.heroBtn} whileTap={{ scale: 0.97 }} transition={springs.snappy} onClick={() => void markDone()}>
                سوّيتها
              </motion.button>
            )}
            {joys.length > 1 && !joyDone && (
              <button type="button" className={styles.heroLink} onClick={() => setChoosing(true)}>
                غيّريها
              </button>
            )}
          </div>
        </motion.section>
      ) : (
        <EmptyState
          pattern={false}
          title="ما فيه متعة للحين"
          body={
            fresh
              ? 'أضيفي شي صغير يفرّحك — يطلع لك كل يوم بدون شروط. وإذا تبين، حددي مكافأة تجمعين لها.'
              : 'أضيفي شي صغير يفرّحك — يطلع لك كل يوم بدون شروط.'
          }
          action={
            <span className={shared.emptyActions}>
              <button type="button" className={shared.linkBtn} onClick={() => setEditing({ item: null, mode: 'free' })}>
                أضيفي أول متعة
              </button>
              {fresh && (
                <button type="button" className={shared.linkBtn} onClick={() => setEditing({ item: null, mode: 'earned' })}>
                  حددي مكافأة
                </button>
              )}
            </span>
          }
        />
      )}

      {!fresh && (
        <>
      {/* add actions live inside the lists, on the reading side — never under the floating + (QA area4 #20) */}
      <InsetGroupedList
        header="مكافآت حددتيها لنفسك"
        footer="الشرارات تجي من أي نسخة صغيرة، والرجعة بعد غياب تنحسب لك ضعف."
      >
        {topRewards.length === 0 ? (
          <ListRow
            leading={<Icon name="plus" size={20} />}
            title="ما حددتي مكافأة للحين"
            subtitle="شي تحبينه، تستلمينه لما تجمعين شراراته"
            onClick={() => setEditing({ item: null, mode: 'earned' })}
            muted
          />
        ) : (
          topRewards.map((r) => {
            const st = rewardStatus(r, balance)
            const held = pending.has(r.id)
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
                  ) : (
                    <>باقي {countWords(st.remaining, NOUNS.spark)}</>
                  )
                }
                trailing={st.ready && !held ? <span className={shared.smallBtn}>استلميها</span> : undefined}
                chevron={!st.ready || held}
                onClick={() => (st.ready && !held ? redeem.request(r) : navigate('/joy/reward'))}
              />
            )
          })
        )}
        {rewards.length > 3 && <ListRow title="كل المكافآت" chevron onClick={() => navigate('/joy/reward')} />}
        {topRewards.length > 0 && (
          <ListRow
            leading={<Icon name="plus" size={20} />}
            title={<span className={shared.accentText}>أضيفي مكافأة</span>}
            onClick={() => setEditing({ item: null, mode: 'earned' })}
          />
        )}
      </InsetGroupedList>

      <InsetGroupedList header="أشياء تحبينها">
        {joys.length === 0 ? (
          <ListRow leading={<Icon name="joy" size={22} />} title="القائمة فاضية" subtitle="قهوة، مشي، حلقة مسلسل — أي شي يفرّحك" muted onClick={() => setEditing({ item: null, mode: 'free' })} />
        ) : (
          joys.map((j) => (
            <ListRow
              key={j.id}
              leading={<Icon name="joy" size={22} />}
              title={<Bidi>{j.titleAr}</Bidi>}
              subtitle={j.kind === 'bundled' ? 'مربوطة بعادة' : SIZE_LABEL[j.size]}
              trailing={j.id === joy?.id ? <span className={shared.todayTag}>اليوم</span> : undefined}
              chevron
              onClick={() => setEditing({ item: j, mode: 'free' })}
              menu={[
                { key: 'today', label: 'خليها متعة اليوم', onSelect: () => choose(j.id) },
                { key: 'edit', label: 'تعديل', onSelect: () => setEditing({ item: j, mode: 'free' }) },
                { key: 'del', label: 'احذفي', destructive: true, icon: <Icon name="trash" size={18} />, onSelect: () => void deleteJoy(j) },
              ]}
              trailingActions={[{ key: 'del', label: 'حذف', tone: 'destructive', icon: <Icon name="trash" size={18} />, onAction: () => void deleteJoy(j) }]}
            />
          ))
        )}
        {joys.length > 0 && (
          <ListRow
            leading={<Icon name="plus" size={20} />}
            title={<span className={shared.accentText}>أضيفي متعة</span>}
            onClick={() => setEditing({ item: null, mode: 'free' })}
          />
        )}
      </InsetGroupedList>
        </>
      )}

      <Sheet open={choosing} onClose={() => setChoosing(false)} title="وش تبين اليوم؟" detents={['medium', 'large']}>
        <InsetGroupedList flush>
          {joys.map((j) => (
            <ListRow
              key={j.id}
              leading={<Icon name="joy" size={22} />}
              title={<Bidi>{j.titleAr}</Bidi>}
              subtitle={SIZE_LABEL[j.size]}
              trailing={j.id === joy?.id ? <Icon name="check" size={20} /> : undefined}
              onClick={() => choose(j.id)}
            />
          ))}
        </InsetGroupedList>
      </Sheet>

      <JoyEditSheet open={editing != null} onClose={() => setEditing(null)} item={editing?.item ?? null} defaultMode={editing?.mode} />
      {redeem.sheet}
    </Screen>
  )
}
