import { Reorder, useDragControls, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { makeProduct, type Product, type ProductCategory, type ProductSlot } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Switch } from '../../components/Switch'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { SegmentedControl } from '../../components/SegmentedControl'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { Icon } from '../../icons/Icon'
import { useLife, useStore } from '../../state/LifeStore'
import styles from './habits.module.css'
import {
  categoriesOf,
  categoryAr,
  GROUP_AR,
  GROUP_OF,
  GROUPS,
  howTo,
  LIcon,
  productName,
  quoted,
  SLOT_AR,
  SLOT_ROUTINE_AR,
  SLOTS,
  useUndoDelete,
} from './shared'

const bySlotOrder = (a: Product, b: Product) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot) || a.order - b.order

/** All products of a slot (active or not) in step order. */
const inSlot = (all: Product[], slot: ProductSlot) => all.filter((p) => p.slot === slot).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))

export default function ProductsScreen() {
  const store = useStore()
  const s = useLife()
  const toast = useToast()
  const undoDelete = useUndoDelete()
  const [moving, setMoving] = useState(false)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)

  // Her products only. The seeded generic ones are suggestions until she adds them — they never
  // pose as her routine (QA #14).
  const all = useMemo(() => s.products.filter((p) => !p.placeholder), [s.products])
  const suggestions = useMemo(() => s.products.filter((p) => p.placeholder).sort(bySlotOrder), [s.products])
  const groups = useMemo(
    () => GROUPS.map((g) => ({ g, items: all.filter((p) => GROUP_OF[p.category] === g).sort(bySlotOrder) })).filter((x) => x.items.length > 0),
    [all],
  )
  const adopt = async (p: Product) => {
    const order = Math.max(0, ...all.filter((x) => x.slot === p.slot).map((x) => x.order)) + 1
    await store.upsertProduct({ ...p, placeholder: false, active: true, order })
    toast({
      message: `${quoted(productName(p))} صار من منتجاتك — عدّلي اسمه لمنتجك`,
      actionLabel: 'تراجع',
      onAction: () => void store.upsertProduct(p),
    })
  }

  const setActive = async (p: Product, active: boolean) => {
    await store.upsertProduct({ ...p, active })
    toast({ message: active ? `${quoted(productName(p))} رجع للروتين` : `${quoted(productName(p))} طلع من الروتين — محفوظ هنا` })
  }
  const remove = (p: Product) => void undoDelete(productName(p), () => store.deleteProduct(p.id), (t) => store.undoDelete(t))

  const row = (p: Product) => (
    <ListRow
      key={p.id}
      title={
        <button type="button" className={styles.titleBtn} onClick={() => setEditing(p)}>
          <Bidi>{productName(p)}</Bidi>
        </button>
      }
      subtitle={[productName(p) !== categoryAr(p.category) ? categoryAr(p.category) : '', howTo(p)].filter(Boolean).join(' · ') || undefined}
      muted={!p.active}
      trailing={
        <span className={styles.rowChips}>
          <Chip tone={p.active ? 'accent' : 'neutral'}>{SLOT_AR[p.slot]}</Chip>
          <Switch checked={p.active} onChange={(v) => void setActive(p, v)} label={`${productName(p)} في الروتين`} />
        </span>
      }
      trailingActions={[{ key: 'del', label: 'احذفي', tone: 'destructive', icon: <Icon name="trash" size={20} />, onAction: () => remove(p) }]}
      menu={[
        { key: 'edit', label: 'عدّليه', icon: <LIcon name="edit" size={20} />, onSelect: () => setEditing(p) },
        { key: 'del', label: 'احذفيه', destructive: true, icon: <Icon name="trash" size={20} />, onSelect: () => remove(p) },
      ]}
    />
  )

  return (
    <Screen
      title="منتجاتي"
      backLabel="رجوع"
      actions={
        <button type="button" className={styles.iconBtn} aria-label="أضيفي منتج" onClick={() => setEditing('new')}>
          <Icon name="plus" size={22} />
        </button>
      }
    >
      <p className={styles.lede}>كل منتج له وقته وترتيبه في الروتين</p>

      {all.length === 0 ? (
        <EmptyState
          title="ما أضفتي منتجات للحين"
          body="أضيفي غسولك أو معجونك، أو اختاري من الاقتراحات تحت — ويصير خطوة في روتين الصبح أو المسا."
          action={<Button onClick={() => setEditing('new')}>أضيفي منتج</Button>}
        />
      ) : moving ? (
        <>
          {SLOTS.map((slot) => (
            <MoveSection key={slot} slot={slot} products={inSlot(all, slot)} onDone={() => setMoving(false)} first={slot === 'am'} />
          ))}
        </>
      ) : (
        groups.map(({ g, items }, gi) => (
          <InsetGroupedList
            key={g}
            header={GROUP_AR[g]}
            headerAction={
              gi === 0 ? (
                <button type="button" className={styles.headerBtn} onClick={() => setMoving(true)}>
                  تحريك
                </button>
              ) : undefined
            }
            footer={gi === groups.length - 1 ? 'اسحبي المنتج جانبًا للحذف، أو اضغطي مطوّل لخيارات أكثر.' : undefined}
          >
            {items.map(row)}
          </InsetGroupedList>
        ))
      )}

      {!moving && suggestions.length > 0 && (
        <InsetGroupedList
          header="اقتراحات منتجات"
          footer="أنواع عامة بدون ماركات. أضيفي اللي تستخدمينه فعلًا وغيّري اسمه لمنتجك — ما يدخل روتينك شي إلا باختيارك."
        >
          {suggestions.map((p) => (
            <ListRow
              key={p.id}
              title={<Bidi>{productName(p)}</Bidi>}
              subtitle={`${SLOT_AR[p.slot]} · ${categoryAr(p.category)}`}
              trailing={
                <Button variant="secondary" onClick={() => void adopt(p)} aria-label={`أضيفي ${productName(p)} لمنتجاتي`}>
                  أضيفيه
                </Button>
              }
              menu={[
                { key: 'add', label: 'أضيفيه لمنتجاتي', icon: <Icon name="plus" size={20} />, onSelect: () => void adopt(p) },
                { key: 'hide', label: 'ما أحتاجه', destructive: true, icon: <Icon name="trash" size={20} />, onSelect: () => remove(p) },
              ]}
            />
          ))}
        </InsetGroupedList>
      )}

      <ProductSheet
        product={editing}
        all={all}
        onClose={() => setEditing(null)}
        onDelete={(p) => {
          setEditing(null)
          remove(p)
        }}
      />
    </Screen>
  )
}

// ---- reorder (drag with grip + non-drag up/down) ---------------------------------------

function MoveSection({ slot, products, onDone, first }: { slot: ProductSlot; products: Product[]; onDone: () => void; first: boolean }) {
  const store = useStore()
  const [order, setOrder] = useState(products.map((p) => p.id))
  const key = products.map((p) => p.id).join('|')
  useEffect(() => setOrder(products.map((p) => p.id)), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const byId = new Map(products.map((p) => [p.id, p]))
  if (products.length === 0) return null

  const commit = (ids: string[]) => void store.reorderProducts(slot, ids)
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    setOrder(next)
    commit(next)
  }

  return (
    <InsetGroupedList
      header={SLOT_ROUTINE_AR[slot]}
      headerAction={
        first ? (
          <button type="button" className={styles.headerBtn} onClick={onDone}>
            خلصت
          </button>
        ) : undefined
      }
      footer={first ? 'اسحبي من المقبض، أو استخدمي الأسهم.' : undefined}
    >
      <Reorder.Group as="ol" axis="y" values={order} onReorder={setOrder} className={styles.reorderList}>
        {order.map((id, i) => {
          const p = byId.get(id)
          return p ? <MoveItem key={id} p={p} i={i} count={order.length} onMove={move} onDrop={() => commit(order)} /> : null
        })}
      </Reorder.Group>
    </InsetGroupedList>
  )
}

function MoveItem({ p, i, count, onMove, onDrop }: { p: Product; i: number; count: number; onMove: (i: number, d: -1 | 1) => void; onDrop: () => void }) {
  const controls = useDragControls()
  const reduce = useReducedMotion()
  const [dragging, setDragging] = useState(false)
  return (
    <Reorder.Item
      value={p.id}
      className={styles.reorderItem}
      data-dragging={dragging || undefined}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => {
        setDragging(false)
        onDrop()
      }}
      layout={reduce ? undefined : 'position'}
    >
      <div className={styles.reorderInner}>
        <span className={styles.grip} onPointerDown={(e) => controls.start(e)} aria-hidden="true">
          <LIcon name="grip" size={20} />
        </span>
        <span className={styles.stepOrder}>{i + 1}</span>
        <span className={styles.reorderText}>
          <Bidi>{productName(p)}</Bidi>
        </span>
        <span className={styles.moveBtns}>
          <button type="button" className={styles.iconBtn} aria-label={`قدّمي ${productName(p)}`} disabled={i === 0} onClick={() => onMove(i, -1)}>
            <LIcon name="up" size={20} />
          </button>
          <button type="button" className={styles.iconBtn} aria-label={`أخّري ${productName(p)}`} disabled={i === count - 1} onClick={() => onMove(i, 1)}>
            <LIcon name="down" size={20} />
          </button>
        </span>
      </div>
    </Reorder.Item>
  )
}

// ---- add / edit sheet ------------------------------------------------------------------

/** Short slot names for the compact time control in the product sheet (board). */
const SLOT_SHORT: Record<ProductSlot, string> = { am: 'صباح', pm: 'مساء', weekly: 'أسبوعي' }

function ProductSheet({ product, all, onClose, onDelete }: { product: Product | 'new' | null; all: Product[]; onClose: () => void; onDelete: (p: Product) => void }) {
  const store = useStore()
  const toast = useToast()
  const isNew = product === 'new'
  const base = product && product !== 'new' ? product : null

  const [name, setName] = useState('')
  const [category, setCategory] = useState<ProductCategory>('cleanser')
  const [slot, setSlot] = useState<ProductSlot>('am')
  const [position, setPosition] = useState(1)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!product) return
    setError(null)
    if (product === 'new') {
      setName('')
      setCategory('cleanser')
      setSlot('am')
      setNotes('')
      setPosition(inSlot(all, 'am').length + 1)
    } else {
      setName(product.name)
      setCategory(product.category)
      setSlot(product.slot)
      setNotes(product.notes)
      setPosition(Math.max(1, inSlot(all, product.slot).findIndex((x) => x.id === product.id) + 1))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product])

  const siblings = inSlot(all, slot).filter((x) => x.id !== base?.id)
  const maxPos = siblings.length + 1
  const pos = Math.min(position, maxPos)
  const before = siblings[pos - 2]
  const hint =
    slot === 'weekly' ? (
      'بيطلع في العناية الأسبوعية.'
    ) : (
      <>
        بينضاف ل{SLOT_ROUTINE_AR[slot]}{' '}
        {before ? (
          <>
            بعد «<Bidi>{productName(before)}</Bidi>»
          </>
        ) : (
          'كأول خطوة'
        )}
        . تقدرين تغيّرين الترتيب بعدين.
      </>
    )

  const save = async () => {
    const trimmed = name.trim()
    if (trimmed === '' && category === 'other') {
      setError('اكتبي اسم المنتج أو اختاري فئته')
      return
    }
    const id = base?.id ?? `pr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const p: Product = base
      ? { ...base, name: trimmed, category, slot, notes: notes.trim() }
      : makeProduct({ id, name: trimmed, category, slot, notes: notes.trim(), order: maxPos })
    await store.upsertProduct(p)
    const ids = siblings.map((x) => x.id)
    ids.splice(pos - 1, 0, id)
    await store.reorderProducts(slot, ids)
    toast({ message: isNew ? `انضاف ${quoted(trimmed || categoryAr(category))}` : 'انحفظ' })
    onClose()
  }

  return (
    <Sheet
      open={product != null}
      onClose={onClose}
      title={isNew ? 'أضيفي منتج' : 'عدّلي المنتج'}
      detents={['large']}
      cancelLabel="إلغاء"
      action={
        <button type="submit" form="product-form">
          احفظي
        </button>
      }
    >
      <form
        id="product-form"
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label className={styles.field}>
          <span className={styles.label}>الاسم</span>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`مثلًا: ${categoryAr(category)} …`}
            autoComplete="off"
            enterKeyHint="done"
          />
        </label>

        {/* board: category chips (group, then type) instead of a native picker */}
        <div className={styles.field}>
          <span className={styles.label} id="product-cat">
            الفئة
          </span>
          <div className={styles.picks} role="radiogroup" aria-labelledby="product-cat">
            {GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={GROUP_OF[category] === g}
                className={styles.pick}
                onClick={() => GROUP_OF[category] !== g && setCategory(categoriesOf(g)[0])}
              >
                {GROUP_AR[g]}
              </button>
            ))}
          </div>
          <div className={styles.picks} role="radiogroup" aria-label={`نوع منتج ${GROUP_AR[GROUP_OF[category]]}`}>
            {categoriesOf(GROUP_OF[category]).map((c) => (
              <button key={c} type="button" role="radio" aria-checked={category === c} className={styles.pickSmall} onClick={() => setCategory(c)}>
                {categoryAr(c)}
              </button>
            ))}
          </div>
        </div>

        {/* board: time and order share one row */}
        <div className={styles.pair}>
        <div className={styles.field}>
          <span className={styles.label}>الوقت</span>
          <SegmentedControl
            label="وقت المنتج"
            segments={SLOTS.map((v) => ({ value: v, label: SLOT_SHORT[v] }))}
            value={slot}
            onChange={(v) => {
              setSlot(v)
              setPosition(inSlot(all, v).filter((x) => x.id !== base?.id).length + 1)
            }}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>الترتيب</span>
          <div className={styles.stepper}>
            <button type="button" className={styles.stepperBtn} aria-label="قدّميه خطوة" disabled={pos <= 1} onClick={() => setPosition(pos - 1)}>
              −
            </button>
            <span className={styles.stepperValue} aria-live="polite">
              خطوة {pos}
            </span>
            <button type="button" className={styles.stepperBtn} aria-label="أخّريه خطوة" disabled={pos >= maxPos} onClick={() => setPosition(pos + 1)}>
              +
            </button>
          </div>
        </div>
        </div>
        <span className={styles.hint}>{hint}</span>

        <label className={styles.field}>
          <span className={styles.label}>
            طريقة الاستخدام <span className={styles.optional}>(اختياري)</span>
          </span>
          <textarea className={styles.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثلًا: كمية حبة بازلاء على بشرة رطبة" />
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {base && (
          <Button variant="plain" onClick={() => onDelete(base)} icon={<Icon name="trash" size={18} />}>
            احذفي المنتج
          </Button>
        )}
      </form>
    </Sheet>
  )
}

