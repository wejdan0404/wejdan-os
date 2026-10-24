import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import {
  CATEGORY_SUGGESTIONS_AR,
  MAX_CATEGORIES,
  categoryEnvelopeId,
  envelopeState,
  isCategoryEnvelope,
  previousCategories,
  spendBreakdown,
  type EnvelopeState,
  type LifeSnapshot,
  type MoneyEnvelope,
} from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { Icon } from '../../icons/Icon'
import { springs } from '../../motion'
import { parseAmount } from '../../lib/number'
import { countWords, NOUNS } from '../../lib/plural'
import { useStore } from '../../state/LifeStore'
import { Riyal, newId } from './meKit'
import styles from './moneyEnvelopes.module.css'
import form from './me.module.css'

function SoftMarker() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  )
}

/** One calm line per envelope — describes, never judges. */
export function StateLine({ st, spent }: { st: EnvelopeState; spent: number }) {
  switch (st.tone) {
    case 'noPlan':
      return <p className={styles.state}>بدون خطة · صرفتي <Riyal n={spent} /></p>
    case 'roomy':
      return <p className={styles.state}>باقي <Riyal n={st.remaining} /></p>
    case 'close':
      return <p className={styles.state}>باقي <Riyal n={st.remaining} /> — قربتي من الخطة</p>
    case 'full':
      return <p className={styles.state}>وصلتي لخطته بالضبط</p>
    case 'over':
      return (
        <p className={styles.state}>
          <SoftMarker />
          <span>فوق الخطة بـ <Riyal n={st.overBy} /> — عادي، عدّليها لو تبين.</span>
        </p>
      )
  }
}

export interface MoneyEnvelopesProps {
  s: LifeSnapshot
  today: Date
  cycleKey: string
  daysLeft: number
  envelopes: MoneyEnvelope[]
  /** Open the spend sheet on this envelope. */
  onLog: (envId: string) => void
}

/** «ظروف الشهر»: per-category plan vs spent inside the budget cycle. */
export function MoneyEnvelopes({ s, today, cycleKey, daysLeft, envelopes, onLog }: MoneyEnvelopesProps) {
  const store = useStore()
  const toast = useToast()
  const reduce = useReducedMotion()
  const [manage, setManage] = useState(false)
  const cats = useMemo(() => envelopes.filter(isCategoryEnvelope).sort((a, b) => (a.id < b.id ? -1 : 1)), [envelopes])
  const prev = useMemo(() => previousCategories(s, today), [s, today])
  const bd = spendBreakdown(envelopes)

  const carry = async () => {
    for (const p of prev) {
      await store.upsertEnvelope({ ...p, id: categoryEnvelopeId(cycleKey, newId('c')), month: cycleKey, spent: 0 })
    }
    toast({ message: 'نسخنا ظروف الشهر اللي فات' })
  }

  if (cats.length === 0) {
    return (
      <section className={styles.card} aria-labelledby="env-title">
        <div className={styles.head}>
          <h2 id="env-title" className={styles.title}>ظروف الشهر</h2>
        </div>
        <p className={styles.foot}>قسّمي مصروفك بظروف: أكل، مواصلات، ترفيه… لكل ظرف مبلغ تقريبي، وتشوفين وين وصلتي بدون حساب.</p>
        <div className={styles.actions}>
          <Button onClick={() => setManage(true)}>سوّي ظروف</Button>
          {prev.length > 0 && (
            <Button variant="secondary" onClick={() => void carry()}>
              انسخي ظروف الشهر اللي فات
            </Button>
          )}
        </div>
        <ManageSheet open={manage} onClose={() => setManage(false)} cats={cats} cycleKey={cycleKey} />
      </section>
    )
  }

  return (
    <section className={styles.card} aria-labelledby="env-title">
      <div className={styles.head}>
        <h2 id="env-title" className={styles.title}>ظروف الشهر</h2>
        <span className={styles.sub}>{daysLeft <= 1 ? 'آخر يوم بالشهر' : <>باقي {countWords(daysLeft, NOUNS.day)}</>}</span>
      </div>
      <ul className={styles.list}>
        {cats.map((e) => {
          const st = envelopeState(e)
          return (
            <li key={e.id}>
              <button type="button" className={styles.row} onClick={() => onLog(e.id)} aria-label={`سجّلي مصروف في ${e.titleAr}`}>
                <span className={styles.rowTop}>
                  <span className={styles.name}><Bidi>{e.titleAr}</Bidi></span>
                  <span className={styles.amounts}>
                    <Riyal n={e.spent} /> من <Riyal n={e.planned} />
                  </span>
                </span>
                <span
                  className={styles.bar}
                  role="progressbar"
                  aria-label={`${e.titleAr}: المصروف من الخطة`}
                  aria-valuemin={0}
                  aria-valuemax={Math.max(1, Math.round(e.planned))}
                  aria-valuenow={Math.round(e.spent)}
                >
                  <motion.span
                    className={styles.fill}
                    data-tone={st.tone}
                    initial={false}
                    animate={{ inlineSize: `${st.ratio * 100}%` }}
                    transition={reduce ? { duration: 0 } : springs.smooth}
                  />
                </span>
                <StateLine st={st} spent={e.spent} />
              </button>
            </li>
          )
        })}
      </ul>
      {bd.uncategorized > 0 && (
        <p className={styles.foot}>غير مصنّف: صرفتي <Riyal n={bd.uncategorized} /></p>
      )}
      {bd.planned > 0 && bd.unallocated > 0 && (
        <p className={styles.foot}>لسا ما وزّعتي <Riyal n={bd.unallocated} /> من خطة المصروف.</p>
      )}
      {bd.unallocated < 0 && (
        <p className={styles.foot}>الظروف أكبر من خطة المصروف بـ <Riyal n={-bd.unallocated} /> — عدّلي وحدة منهم.</p>
      )}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => setManage(true)}>
          رتّبي الظروف
        </Button>
      </div>
      <ManageSheet open={manage} onClose={() => setManage(false)} cats={cats} cycleKey={cycleKey} />
    </section>
  )
}

interface Draft {
  id: string
  name: string
  plan: string
  isNew: boolean
}

function ManageSheet({ open, onClose, cats, cycleKey }: { open: boolean; onClose: () => void; cats: MoneyEnvelope[]; cycleKey: string }) {
  const store = useStore()
  const toast = useToast()
  const [rows, setRows] = useState<Draft[]>([])
  const [seeded, setSeeded] = useState(false)
  if (open && !seeded) {
    setRows(cats.map((c) => ({ id: c.id, name: c.titleAr, plan: c.planned ? String(c.planned) : '', isNew: false })))
    setSeeded(true)
  }
  if (!open && seeded) setSeeded(false)

  const used = new Set(rows.map((r) => r.name.trim()))
  const add = (name = '') => setRows((r) => (r.length >= MAX_CATEGORIES ? r : [...r, { id: categoryEnvelopeId(cycleKey, newId('c')), name, plan: '', isNew: true }]))
  const patch = (id: string, p: Partial<Draft>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const valid = rows.every((r) => r.name.trim().length > 0)

  const remove = async (d: Draft) => {
    setRows((r) => r.filter((x) => x.id !== d.id))
    if (d.isNew) return
    const token = await store.deleteEnvelope(d.id)
    toast({
      message: `انحذف ظرف «${d.name}» — اللي صرفتيه يبقى بـ«غير مصنّف»`,
      actionLabel: token ? 'تراجع' : undefined,
      onAction: token ? () => void store.undoDelete(token.token) : undefined,
    })
  }

  const save = async () => {
    if (!valid) return
    for (const r of rows) {
      const cur = cats.find((c) => c.id === r.id)
      const planned = parseAmount(r.plan)
      const name = r.name.trim()
      if (cur && cur.titleAr === name && cur.planned === planned) continue
      await store.upsertEnvelope({ id: r.id, titleAr: name, titleEn: name, month: cycleKey, planned, spent: cur?.spent ?? 0 })
    }
    onClose()
    toast({ message: 'انحفظت الظروف' })
  }

  return (
    <Sheet open={open} onClose={onClose} title="رتّبي الظروف" detents={['large']}>
      <form
        className={form.form}
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <p className={form.lede}>أرقام تقريبية تكفي — تعدّلينها متى ما بغيتي.</p>
        {rows.length > 0 && (
          <div className={styles.editHead} aria-hidden="true">
            <span>الاسم</span>
            <span>الخطة (ر.س)</span>
            <span />
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className={styles.editRow}>
            <input className={form.input} aria-label="اسم الظرف" value={r.name} placeholder="مثلًا: مواصلات" onChange={(e) => patch(r.id, { name: e.target.value })} />
            <input className={`${form.input} ${form.ltrInput}`} aria-label={`خطة ${r.name || 'الظرف'}`} inputMode="decimal" value={r.plan} placeholder="0" onChange={(e) => patch(r.id, { plan: e.target.value })} />
            <button type="button" className={styles.iconBtn} aria-label={`احذفي ظرف ${r.name || 'جديد'}`} onClick={() => void remove(r)}>
              <Icon name="trash" size={20} />
            </button>
          </div>
        ))}
        {rows.length < MAX_CATEGORIES && (
          <div className={form.field}>
            <span className={form.fieldLabel}>أضيفي ظرف</span>
            <div className={form.chips}>
              {CATEGORY_SUGGESTIONS_AR.filter((n) => !used.has(n)).map((n) => (
                <Chip key={n} onClick={() => add(n)} icon={<Icon name="plus" size={14} />}>
                  {n}
                </Chip>
              ))}
              <Chip onClick={() => add()} icon={<Icon name="plus" size={14} />}>
                ظرف ثاني
              </Chip>
            </div>
          </div>
        )}
        <Button type="submit" block size="large" disabled={!valid || rows.length === 0}>
          احفظي
        </Button>
      </form>
    </Sheet>
  )
}
