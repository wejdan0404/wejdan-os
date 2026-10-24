import { useMemo, useState, type FormEvent } from 'react'
import {
  addDays,
  billPaidKeysFor,
  bnplNextDue,
  coolingDaysLeft,
  currentBudgetCycle,
  dateOnly,
  dayKey,
  dueDaysFrom,
  envelopesThisCycle,
  isBillPaidOn,
  needsMonthPlan,
  parseDayKey,
  upcomingDuesFor,
  type Bill,
  type BnplItem,
  type MoneyEnvelope,
  type WishItem,
} from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Switch } from '../../components/Switch'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { PaydayCard } from '../../components/PaydayCard'
import { Screen } from '../../components/Screen'
import { SegmentedControl } from '../../components/SegmentedControl'
import { Sheet } from '../../components/Sheet'
import { StarMark } from '../../components/StarMark'
import { useToast } from '../../components/Toast'
import { Icon } from '../../icons/Icon'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import { MeIcon, Riyal, fmtDayMonth, inDays, newId, riyal } from './meKit'
import { countWords, NOUNS } from '../../lib/plural'
import { parseAmount } from '../../lib/number'
import { monthlyDueDates } from './moneyModel'
import styles from './me.module.css'

type Part = 'save' | 'bills' | 'spend'
const PART_AR: Record<Part, string> = { save: 'ادخار', bills: 'فواتير وأقساط', spend: 'مصروف الشهر' }
const envId = (key: string, p: Part) => `env_${key}_${p}`
const partOf = (e: MoneyEnvelope): Part | null =>
  e.id.endsWith('_save') ? 'save' : e.id.endsWith('_bills') ? 'bills' : e.id.endsWith('_spend') ? 'spend' : null

/** Amount typed on any keyboard: «١٢٫٥» → 12.5, «1,200» → 1200 (QA area4 #6). */
const toNum = parseAmount

/** Quiet outline marker for "over the plan" — icon + text, identity colours only (QA area4 #11). */
function OverIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4 3 20h18L12 4Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

export default function MoneyScreen() {
  const s = useLife()
  const store = useStore()
  const today = useToday()
  const toast = useToast()
  // Money follows the calendar day: the salary lands after midnight, not at the 04:30 day flip (QA area4 #17).
  const calToday = useMemo(() => dateOnly(store.now()), [store, today])
  const cycle = currentBudgetCycle(s, calToday)
  const envelopes = useMemo(() => envelopesThisCycle(s, calToday), [s, calToday])
  const dues = useMemo(
    () => upcomingDuesFor(s, calToday, 35).filter((d) => d.kind === 'bill' || d.kind === 'subscription' || d.kind === 'bnpl'),
    [s, calToday],
  )
  const pausedBills = s.bills.filter((b) => !b.active)

  const [planOpen, setPlanOpen] = useState(false)
  const [spendOpen, setSpendOpen] = useState(false)
  const [addOpen, setAddOpen] = useState<AddKind | null>(null)

  const byPart = (p: Part) => envelopes.find((e) => partOf(e) === p) ?? null
  const spendEnvs = envelopes.filter((e) => partOf(e) !== 'save' && partOf(e) !== 'bills')
  const planned = spendEnvs.reduce((a, e) => a + e.planned, 0)
  const spent = spendEnvs.reduce((a, e) => a + e.spent, 0)
  const over = spent > planned && planned > 0
  const hasPlan = envelopes.length > 0
  const needsPlan = needsMonthPlan(s, calToday)
  const billsTotal =
    s.bills.filter((b) => b.active).reduce((a, b) => a + b.amount, 0) +
    s.bnplItems.filter((b) => bnplNextDue(b) != null).reduce((a, b) => a + b.instalmentAmount, 0)

  // paid instalments inside this cycle → star rows
  const startKey = dayKey(cycle.start)
  const endKey = dayKey(cycle.end)
  const paidThisCycle = s.bnplItems.flatMap((b) => b.paidDates.filter((d) => d >= startKey && d <= endKey).map((d) => ({ b, d })))

  const markPaid = (b: BnplItem) => {
    const due = bnplNextDue(b)
    if (!due) return
    void store.upsertBnpl({ ...b, paidDates: [...b.paidDates, due] }).then(() =>
      toast({ message: 'دفعتي القسط', actionLabel: 'تراجع', onAction: () => void store.upsertBnpl(b) }),
    )
  }
  // QA area4 #13: a paid instalment can be un-marked any time, not only inside the toast.
  const unmarkPaid = (b: BnplItem, date: string) => {
    void store.upsertBnpl({ ...b, paidDates: b.paidDates.filter((x) => x !== date) }).then(() =>
      toast({ message: 'رجع القسط غير مدفوع', actionLabel: 'تراجع', onAction: () => void store.upsertBnpl(b) }),
    )
  }

  // QA area4 #3: pausing a bill keeps it findable («موقّفة») and can be undone.
  const setBillActive = (bill: Bill, active: boolean) => {
    void store.upsertBill({ ...bill, active }).then(() =>
      toast({
        message: active ? 'رجعت الفاتورة' : 'وقّفناها — تلقينها تحت «موقّفة»',
        actionLabel: 'تراجع',
        onAction: () => void store.upsertBill(bill),
      }),
    )
  }
  const deleteBill = (bill: Bill) =>
    void store.deleteBill(bill.id).then((t) =>
      toast({ message: 'انحذفت الفاتورة', actionLabel: t ? 'تراجع' : undefined, onAction: t ? () => void store.undoDelete(t.token) : undefined }),
    )

  // QA area4 #7: wish decisions can be undone.
  const decideWish = (w: WishItem, decision: 'bought' | 'dropped') => {
    void store.upsertWish({ ...w, decision }).then(() =>
      toast({
        message: decision === 'bought' ? 'اشتريتيها — تبرد عليك' : 'شلناها من القائمة',
        actionLabel: 'تراجع',
        onAction: () => void store.upsertWish(w),
      }),
    )
  }

  const daysLeftInCycle = Math.max(0, Math.round((cycle.end.getTime() - calToday.getTime()) / 86400000) + 1)
  const nextCycleStart = addDays(cycle.end, 1)
  const waiting = s.wishItems.filter((w) => w.decision == null)

  return (
    <Screen
      title="المال"
      backLabel="أنا"
      subtitle={
        <>
          من {fmtDayMonth(cycle.start)} لين {fmtDayMonth(cycle.end)}
        </>
      }
    >
      {cycle.paydayChangedOn && (
        <p className={styles.note} role="note">
          <MeIcon name="calendar" size={16} />
          <span>
            غيّرتي يوم الراتب — هالشهر يكمل لين {fmtDayMonth(cycle.end)}، والشهر الجديد يبدأ {fmtDayMonth(nextCycleStart)} (يوم{' '}
            <span className="num">{cycle.paydayDay}</span>). اللي سجّلتيه يبقى على شهره.
          </span>
        </p>
      )}

      {needsPlan ? (
        <section className={`${styles.spend} ${styles.spendHero}`} aria-labelledby="payday-plan">
          <span className={styles.reviewEyebrow}>
            <StarMark size={10} color="var(--brand-primary)" />
            يوم الراتب · {fmtDayMonth(calToday)}
          </span>
          <h2 id="payday-plan" className={styles.reviewTitle}>
            نزل الراتب — خلّينا نرتّب الشهر
          </h2>
          <p className={styles.lede}>ادخار، فواتير، ومصروف — تحطين الأرقام بنفسك، وتعدّلينها متى ما بغيتي.</p>
          <div className={styles.actions}>
            <Button onClick={() => setPlanOpen(true)}>رتّبي الشهر</Button>
          </div>
        </section>
      ) : !hasPlan ? (
        <section className={`${styles.spend} ${styles.spendHero}`} aria-labelledby="payday-plan">
          {/* QA area4 #16: the next payday, never a past date labelled as payday */}
          <span className={styles.reviewEyebrow}>الراتب الجاي · {fmtDayMonth(cycle.nextPayday)}</span>
          <h2 id="payday-plan" className={styles.reviewTitle}>
            رتّبي شهرك بدقيقتين
          </h2>
          <p className={styles.lede}>
            {cycle.daysToPayday === 1 ? 'الراتب بكرة. ' : <>باقي {countWords(cycle.daysToPayday, NOUNS.day)} على الراتب. </>}
            ادخار، فواتير، ومصروف — تحطين الأرقام بنفسك، وتعدّلينها متى ما بغيتي.
          </p>
          <div className={styles.actions}>
            <Button onClick={() => setPlanOpen(true)}>رتّبي الشهر</Button>
          </div>
        </section>
      ) : cycle.isPayday ? null : (
        // payday with the month already planned: nothing left to ask (QA N3)
        <PaydayCard daysLeft={cycle.daysToPayday} paydayDay={cycle.paydayDay} />
      )}

      {hasPlan && (
        <section className={`${styles.spend} ${styles.spendFlat}`} aria-label="مصروف الشهر">
          <span className={styles.spendLabel}>مصروف الشهر لين الحين</span>
          <div className={styles.spendRow}>
            <bdi dir="ltr" className={styles.metric}>
              {Math.round(spent).toLocaleString('en-US')}
            </bdi>
            <span className={styles.of}>
              ر.س من <bdi dir="ltr" className="num">{Math.round(planned).toLocaleString('en-US')}</bdi>
            </span>
          </div>
          <div
            className={styles.bar}
            role="progressbar"
            aria-label="المصروف من الخطة"
            aria-valuemin={0}
            aria-valuemax={Math.max(1, Math.round(planned))}
            aria-valuenow={Math.round(spent)}
          >
            <span className={styles.barFill} data-over={over || undefined} style={{ inlineSize: `${planned > 0 ? Math.min(100, (spent / planned) * 100) : 0}%` }} />
          </div>
          {over ? (
            <p className={styles.overLine}>
              <OverIcon />
              <span>
                فوق خطة المصروف بـ <Riyal n={spent - planned} /> — عادي، عدّليها لو تبين.
              </span>
            </p>
          ) : (
            <p className={styles.lede}>
              ماشية على راحتك — {daysLeftInCycle <= 1 ? 'آخر يوم بالشهر' : <>باقي {countWords(daysLeftInCycle, NOUNS.day)} بالشهر</>}
            </p>
          )}
          <div className={styles.actions}>
            <Button variant="secondary" icon={<Icon name="plus" size={18} />} onClick={() => setSpendOpen(true)}>
              سجّلي مصروف
            </Button>
            <Button variant="plain" onClick={() => setPlanOpen(true)}>
              عدّلي الخطة
            </Button>
          </div>
        </section>
      )}

      <InsetGroupedList
        header="فواتير وأقساط"
        headerAction={
          <Button variant="plain" onClick={() => setAddOpen('bill')}>
            أضيفي
          </Button>
        }
        footer={dues.length === 0 && paidThisCycle.length === 0 ? 'ما فيه فواتير مسجّلة — أضيفي اللي يتكرر كل شهر، أو قسط.' : undefined}
      >
        {paidThisCycle.map(({ b, d }) => (
          <ListRow
            key={`${b.id}_${d}`}
            muted
            leading={<StarMark size={14} color="var(--brand-primary)" label="مدفوع" />}
            title={<Bidi>{b.title}</Bidi>}
            subtitle={`مدفوع · ${fmtDayMonth(parseDayKey(d))}`}
            trailing={<Riyal className={styles.trailStrong} n={b.instalmentAmount} />}
            menu={[{ key: 'unpaid', label: 'ما دفعته', icon: <Icon name="undo" size={18} />, onSelect: () => unmarkPaid(b, d) }]}
          />
        ))}
        {dues.map((d) => {
          const days = dueDaysFrom(d, calToday)
          const bnpl = d.kind === 'bnpl' ? s.bnplItems.find((x) => x.id === d.refId) : undefined
          const bill = d.kind !== 'bnpl' ? s.bills.find((x) => x.id === d.refId) : undefined
          const inst = bnpl ? `قسط ${bnpl.paidDates.length + 1} من ${bnpl.dueDates.length}` : d.kind === 'subscription' ? 'اشتراك' : 'فاتورة'
          // QA area4 #10 / #2: paying from the row marks the occurrence shown (its due date), so it
          // stays paid across cycles and payday changes.
          const paidKeys = billPaidKeysFor(s, d.date)
          const billPaid = bill != null && isBillPaidOn(s, bill, d.date)
          const setPaid = (paid: boolean) => {
            if (!bill) return
            const before = bill
            void store.setBillPaid(bill.id, paidKeys, paid).then(() =>
              toast({
                message: paid ? 'انحسبت مدفوعة' : 'رجعت غير مدفوعة',
                actionLabel: 'تراجع',
                onAction: () => void store.upsertBill(before),
              }),
            )
          }
          const inThisCycle = d.date.getTime() <= cycle.end.getTime()
          const paidLabel = inThisCycle ? 'دفعتيها هالشهر' : `مدفوعة مقدّم · ${fmtDayMonth(d.date)}`
          return (
            <ListRow
              key={`${d.kind}_${d.refId}`}
              muted={billPaid}
              leading={
                billPaid ? (
                  <span className={styles.rowIcon} role="img" aria-label="مدفوعة">
                    <StarMark size={16} color="var(--brand-primary)" />
                  </span>
                ) : (
                  <span className={styles.rowIcon}>
                    <MeIcon name={d.kind === 'bnpl' ? 'calendar' : 'money'} size={18} />
                  </span>
                )
              }
              title={<Bidi>{d.title}</Bidi>}
              subtitle={billPaid ? `${inst} · ${paidLabel}` : `${inst} · يوم ${d.date.getDate()} · ${inDays(days)}`}
              trailing={d.amount != null ? <Riyal className={styles.trailStrong} n={d.amount} /> : undefined}
              leadingActions={
                bnpl
                  ? [{ key: 'paid', label: 'دفعته', icon: <Icon name="check" size={20} />, tone: 'success', onAction: () => markPaid(bnpl) }]
                  : bill && !billPaid
                    ? [{ key: 'paid', label: 'دفعتها', icon: <Icon name="check" size={20} />, tone: 'success', onAction: () => setPaid(true) }]
                    : []
              }
              trailingActions={
                bill ? [{ key: 'del', label: 'احذفي', icon: <Icon name="trash" size={20} />, tone: 'destructive', onAction: () => deleteBill(bill) }] : []
              }
              menu={
                bnpl
                  ? [{ key: 'paid', label: 'دفعته', icon: <Icon name="check" size={18} />, onSelect: () => markPaid(bnpl) }]
                  : bill
                    ? [
                        billPaid
                          ? { key: 'unpaid', label: 'ما دفعتها', icon: <Icon name="undo" size={18} />, onSelect: () => setPaid(false) }
                          : { key: 'paid', label: 'دفعتها', icon: <Icon name="check" size={18} />, onSelect: () => setPaid(true) },
                        { key: 'pause', label: 'وقّفيها', icon: <Icon name="pause" size={18} />, onSelect: () => setBillActive(bill, false) },
                        { key: 'del', label: 'احذفي', icon: <Icon name="trash" size={18} />, destructive: true, onSelect: () => deleteBill(bill) },
                      ]
                    : undefined
              }
            />
          )
        })}
      </InsetGroupedList>

      {pausedBills.length > 0 && (
        <InsetGroupedList header="موقّفة" footer="ما تطلع بالفواتير لين تشغّلينها.">
          {pausedBills.map((bill) => (
            <ListRow
              key={bill.id}
              muted
              leading={
                <span className={styles.rowIcon}>
                  <Icon name="pause" size={18} />
                </span>
              }
              title={<Bidi>{bill.title}</Bidi>}
              subtitle={`${bill.isSubscription ? 'اشتراك' : 'فاتورة'} · يوم ${bill.dueDay}`}
              trailing={<Riyal className={styles.trail} n={bill.amount} />}
              leadingActions={[{ key: 'resume', label: 'شغّليها', icon: <Icon name="play" size={20} />, tone: 'success', onAction: () => setBillActive(bill, true) }]}
              menu={[
                { key: 'resume', label: 'شغّليها', icon: <Icon name="play" size={18} />, onSelect: () => setBillActive(bill, true) },
                { key: 'del', label: 'احذفي', icon: <Icon name="trash" size={18} />, destructive: true, onSelect: () => deleteBill(bill) },
              ]}
            />
          ))}
        </InsetGroupedList>
      )}

      <InsetGroupedList
        header="قائمة الأمنيات"
        headerAction={
          <Button variant="plain" onClick={() => setAddOpen('wish')}>
            أضيفي
          </Button>
        }
        footer={waiting.length === 0 ? 'أي شي تبين تشترينه حطيه هنا — يستنى كم يوم قبل القرار.' : 'أي شي تبين تشترينه يستنى كم يوم قبل القرار.'}
      >
        {waiting.map((w) => {
          const left = coolingDaysLeft(w, calToday)
          return (
            <ListRow
              key={w.id}
              title={<Bidi>{w.title}</Bidi>}
              subtitle={left > 0 ? `تقررين ${inDays(left)}` : 'جاهزة تقررين'}
              trailing={w.price != null ? <Riyal className={styles.trail} n={w.price} /> : undefined}
              menu={[
                { key: 'buy', label: 'اشتريتها', icon: <Icon name="check" size={18} />, onSelect: () => decideWish(w, 'bought') },
                { key: 'drop', label: 'ما أبيها', icon: <Icon name="close" size={18} />, onSelect: () => decideWish(w, 'dropped') },
              ]}
            />
          )
        })}
      </InsetGroupedList>

      <p className={styles.note}>
        <MeIcon name="shield" size={16} />
        <span>تسجيل يدوي — ما نربط أي حساب بنكي، وكل شي على جهازك.</span>
      </p>

      <PlanSheet
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        initial={{ save: byPart('save')?.planned ?? 0, bills: byPart('bills')?.planned ?? Math.round(billsTotal), spend: byPart('spend')?.planned ?? 0 }}
        onSave={async (v) => {
          for (const p of ['save', 'bills', 'spend'] as Part[]) {
            const cur = byPart(p)
            await store.upsertEnvelope({
              id: cur?.id ?? envId(cycle.key, p), titleAr: PART_AR[p], titleEn: p, month: cycle.key, planned: v[p], spent: cur?.spent ?? 0,
            })
          }
          setPlanOpen(false)
          toast({ message: 'انحفظت خطة الشهر' })
        }}
      />
      <SpendSheet
        open={spendOpen}
        envelopes={envelopes.filter((e) => partOf(e) !== 'save')}
        onClose={() => setSpendOpen(false)}
        onSave={async (env, amount) => {
          const before = env
          await store.upsertEnvelope({ ...env, spent: env.spent + amount })
          setSpendOpen(false)
          toast({ message: `انسجّل ${riyal(amount)}`, actionLabel: 'تراجع', onAction: () => void store.upsertEnvelope(before) })
        }}
      />
      <AddMoneySheet
        kind={addOpen}
        today={calToday}
        onKind={setAddOpen}
        onClose={() => setAddOpen(null)}
        onBill={async (b) => {
          const id = newId('bill')
          await store.upsertBill({ id, active: true, ...b })
          setAddOpen(null)
          toast({ message: 'انضافت الفاتورة', actionLabel: 'تراجع', onAction: () => void store.deleteBill(id) })
        }}
        onBnpl={async (b) => {
          const id = newId('bnpl')
          await store.upsertBnpl({ id, paidDates: [], ...b })
          setAddOpen(null)
          toast({ message: 'انضاف القسط', actionLabel: 'تراجع', onAction: () => void store.deleteBnpl(id) })
        }}
        onWish={async (w) => {
          const id = newId('wish')
          await store.upsertWish({ id, addedDate: dayKey(calToday), decision: null, ...w })
          setAddOpen(null)
          toast({ message: 'انضافت لقائمة الأمنيات', actionLabel: 'تراجع', onAction: () => void store.deleteWish(id) })
        }}
      />
    </Screen>
  )
}

// ---- sheets ----------------------------------------------------------------------------------

function PlanSheet({ open, onClose, initial, onSave }: { open: boolean; onClose: () => void; initial: Record<Part, number>; onSave: (v: Record<Part, number>) => void }) {
  const [v, setV] = useState<Record<Part, string>>({ save: '', bills: '', spend: '' })
  const [seeded, setSeeded] = useState(false)
  if (open && !seeded) {
    setV({ save: initial.save ? String(initial.save) : '', bills: initial.bills ? String(initial.bills) : '', spend: initial.spend ? String(initial.spend) : '' })
    setSeeded(true)
  }
  if (!open && seeded) setSeeded(false)
  const total = toNum(v.save) + toNum(v.bills) + toNum(v.spend)
  const pct = (p: Part) => (total > 0 ? (toNum(v[p]) / total) * 100 : 33.3)
  return (
    <Sheet open={open} onClose={onClose} title="خطة الشهر" detents={['large']}>
      <form
        className={styles.form}
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          onSave({ save: toNum(v.save), bills: toNum(v.bills), spend: toNum(v.spend) })
        }}
      >
        <p className={styles.lede}>أرقام تقريبية تكفي. الشهر يبدأ يوم الراتب، وتقدرين تعدّلينها بأي وقت.</p>
        {total > 0 && (
          <div className={styles.split} aria-hidden="true">
            <span style={{ inlineSize: `${pct('save')}%` }} />
            <span style={{ inlineSize: `${pct('bills')}%` }} />
            <span style={{ inlineSize: `${pct('spend')}%` }} />
          </div>
        )}
        {(['save', 'bills', 'spend'] as Part[]).map((p) => (
          <label key={p} className={styles.field}>
            <span className={styles.fieldLabel}>{PART_AR[p]} (ر.س)</span>
            <input
              className={`${styles.input} ${styles.ltrInput}`}
              inputMode="decimal"
              value={v[p]}
              placeholder="0"
              onChange={(e) => setV((x) => ({ ...x, [p]: e.target.value }))}
            />
          </label>
        ))}
        <Button type="submit" block size="large">
          اعتمدي خطة الشهر
        </Button>
      </form>
    </Sheet>
  )
}

function SpendSheet({ open, envelopes, onClose, onSave }: { open: boolean; envelopes: MoneyEnvelope[]; onClose: () => void; onSave: (e: MoneyEnvelope, amount: number) => void }) {
  const [amount, setAmount] = useState('')
  const [envId, setEnvId] = useState<string | null>(null)
  const chosen = envelopes.find((e) => e.id === envId) ?? envelopes.find((e) => partOf(e) === 'spend') ?? envelopes[0]
  return (
    <Sheet open={open} onClose={onClose} title="سجّلي مصروف" detents={['medium', 'large']}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          const n = toNum(amount)
          if (!chosen || n <= 0) return
          onSave(chosen, n)
          setAmount('')
        }}
      >
        <label className={styles.field}>
          <span className={styles.fieldLabel}>المبلغ (ر.س)</span>
          <input className={`${styles.input} ${styles.ltrInput}`} inputMode="decimal" autoFocus value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value)} />
        </label>
        {envelopes.length > 1 && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>من وين؟</span>
            <div className={styles.chips}>
              {envelopes.map((e) => (
                <Chip key={e.id} selected={chosen?.id === e.id} onClick={() => setEnvId(e.id)}>
                  {e.titleAr}
                </Chip>
              ))}
            </div>
          </div>
        )}
        <Button type="submit" block size="large" disabled={!chosen || toNum(amount) <= 0}>
          سجّليه
        </Button>
      </form>
    </Sheet>
  )
}

type AddKind = 'bill' | 'bnpl' | 'wish'
const ADD_KINDS = [
  { value: 'bill' as const, label: 'فاتورة' },
  { value: 'bnpl' as const, label: 'قسط' },
  { value: 'wish' as const, label: 'أمنية' },
]
const COOLING = [3, 7, 14, 30]

/** «أضيفي»: a bill, an instalment plan (QA area4 #8) or a wish — typed by hand. */
function AddMoneySheet({
  kind,
  today,
  onKind,
  onClose,
  onBill,
  onBnpl,
  onWish,
}: {
  kind: AddKind | null
  today: Date
  onKind: (k: AddKind) => void
  onClose: () => void
  onBill: (b: { title: string; amount: number; dueDay: number; isSubscription: boolean }) => void
  onBnpl: (b: { title: string; provider: string; instalmentAmount: number; dueDates: string[] }) => void
  onWish: (w: { title: string; price: number | null; coolingOffDays: number }) => void
}) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDay, setDueDay] = useState(1)
  const [sub, setSub] = useState(false)
  const [provider, setProvider] = useState('')
  const [count, setCount] = useState(4)
  const [first, setFirst] = useState('')
  const [cooling, setCooling] = useState(7)
  const reset = () => {
    setTitle('')
    setAmount('')
    setDueDay(1)
    setSub(false)
    setProvider('')
    setCount(4)
    setFirst('')
    setCooling(7)
  }
  const firstDate = first ? parseDayKey(first) : today
  const valid = title.trim().length > 0 && (kind === 'wish' || kind === 'bill' || toNum(amount) > 0)
  const titleText: Record<AddKind, string> = { bill: 'فاتورة جديدة', bnpl: 'قسط جديد', wish: 'أمنية جديدة' }
  return (
    <Sheet open={kind != null} onClose={onClose} title={kind ? titleText[kind] : ''} detents={['large']}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid || !kind) return
          const t = title.trim()
          if (kind === 'bill') onBill({ title: t, amount: toNum(amount), dueDay, isSubscription: sub })
          else if (kind === 'bnpl') onBnpl({ title: t, provider: provider.trim(), instalmentAmount: toNum(amount), dueDates: monthlyDueDates(firstDate, count) })
          else onWish({ title: t, price: amount.trim() ? toNum(amount) : null, coolingOffDays: cooling })
          reset()
        }}
      >
        <SegmentedControl label="وش تضيفين؟" segments={ADD_KINDS} value={kind} onChange={onKind} />
        <label className={styles.field}>
          <span className={styles.fieldLabel}>وش هي؟</span>
          <input
            className={styles.input}
            value={title}
            placeholder={kind === 'bnpl' ? 'مثلًا: جوال جديد' : kind === 'wish' ? 'مثلًا: سمّاعة' : 'مثلًا: باقة الإنترنت'}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{kind === 'bnpl' ? 'مبلغ القسط (ر.س)' : kind === 'wish' ? 'السعر (ر.س) — اختياري' : 'المبلغ (ر.س)'}</span>
          <input className={`${styles.input} ${styles.ltrInput}`} inputMode="decimal" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value)} />
        </label>

        {kind === 'bill' && (
          <>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>يوم الاستحقاق بالشهر</span>
              <select className={styles.select} value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    يوم {d}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.field} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className={styles.fieldLabel} style={{ font: 'var(--type-row)', color: 'var(--text-primary)' }}>
                اشتراك
              </span>
              <Switch checked={sub} onChange={setSub} label="اشتراك" />
            </div>
          </>
        )}

        {kind === 'bnpl' && (
          <>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>من وين؟ (اختياري)</span>
              <input className={styles.input} value={provider} placeholder="مثلًا: تابي" onChange={(e) => setProvider(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>كم قسط؟</span>
              <select className={styles.select} value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                  <option key={n} value={n}>
                    {n} أقساط
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>أول قسط</span>
              <input className={`${styles.input} ${styles.ltrInput}`} type="date" value={first || dayKey(today)} onChange={(e) => setFirst(e.target.value)} />
            </label>
            <p className={styles.lede}>
              كل شهر بنفس اليوم — آخر قسط {fmtDayMonth(parseDayKey(monthlyDueDates(firstDate, count)[count - 1]!))}.
            </p>
          </>
        )}

        {kind === 'wish' && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>تستنى كم يوم قبل القرار؟</span>
            <div className={styles.chips}>
              {COOLING.map((d) => (
                <Chip key={d} selected={cooling === d} onClick={() => setCooling(d)}>
                  {countWords(d, NOUNS.day)}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <Button type="submit" block size="large" disabled={!valid}>
          أضيفيها
        </Button>
      </form>
    </Sheet>
  )
}
