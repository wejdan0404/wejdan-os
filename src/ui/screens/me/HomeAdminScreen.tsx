import { useMemo, useState } from 'react'
import { daysBetween, dateOnly, parseDayKey, type AdminDoc } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { Icon } from '../../icons/Icon'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import { NOUNS, countLabel } from '../../lib/plural'
import { RowIcon, fmtDayMonth, newId } from './meKit'
import { HomeTidyBlock } from './HomeTidy'
import styles from './me.module.css'

const left = (n: number) =>
  n < 0 ? 'انتهت — جدّديها' : n === 0 ? 'تنتهي اليوم' : n === 1 ? 'باقي يوم' : n === 2 ? 'باقي يومين' : n <= 30 ? `باقي ${n} ${n <= 10 ? 'أيام' : 'يوم'}` : n < 60 ? 'بعد شهر تقريبًا' : Math.round(n / 30) === 2 ? 'بعد شهرين تقريبًا' : `بعد ${Math.round(n / 30)} ${Math.round(n / 30) <= 10 ? 'شهور' : 'شهر'} تقريبًا`

export default function HomeAdminScreen() {
  const s = useLife()
  const store = useStore()
  const today = useToday()
  const toast = useToast()
  const [edit, setEdit] = useState<AdminDoc | null>(null)
  const [open, setOpen] = useState(false)

  const docs = useMemo(
    () =>
      [...s.adminDocs]
        .map((d) => ({ d, n: d.expiry ? daysBetween(dateOnly(today), parseDayKey(d.expiry)) : null }))
        .sort((a, b) => (a.n ?? 1e9) - (b.n ?? 1e9)),
    [s.adminDocs, today],
  )
  const soon = docs.filter((x) => x.n != null && x.n <= x.d.remindDaysBefore)
  const rest = docs.filter((x) => !soon.includes(x))

  const remove = (d: AdminDoc) =>
    void store.deleteAdminDoc(d.id).then((t) => toast({ message: 'انحذفت', actionLabel: t ? 'تراجع' : undefined, onAction: t ? () => void store.undoDelete(t.token) : undefined }))

  const row = ({ d, n }: { d: AdminDoc; n: number | null }) => (
    <ListRow
      key={d.id}
      leading={<RowIcon name="evidence" tone={n != null && n <= 7 ? 'warn' : 'accent'} />}
      title={<Bidi>{d.name}</Bidi>}
      subtitle={d.expiry ? `${fmtDayMonth(parseDayKey(d.expiry))} · ${left(n!)}` : 'بدون تاريخ انتهاء'}
      chevron
      onClick={() => (setEdit(d), setOpen(true))}
      trailingActions={[{ key: 'del', label: 'احذفي', icon: <Icon name="trash" size={20} />, tone: 'destructive', onAction: () => remove(d) }]}
      menu={[
        { key: 'edit', label: 'عدّليها', icon: <Icon name="edit" size={18} />, onSelect: () => (setEdit(d), setOpen(true)) },
        { key: 'del', label: 'احذفيها', icon: <Icon name="trash" size={18} />, destructive: true, onSelect: () => remove(d) },
      ]}
    />
  )

  return (
    <Screen
      title="البيت والمعاملات"
      compactTitle="المعاملات"
      backLabel="أنا"
      actions={
        <Button variant="plain" aria-label="أضيفي وثيقة" onClick={() => (setEdit(null), setOpen(true))}>
          <Icon name="plus" size={22} />
        </Button>
      }
    >
      <HomeTidyBlock />

      <p className={`${styles.lede} ${styles.pad}`}>الهوية، الرخصة، الجواز، التأمين… وتطلع لك هنا قبل ما تنتهي بوقت كافي.</p>

      {docs.length === 0 ? (
        <EmptyState
          title="ما فيه وثائق للحين"
          body="أضيفي اللي يحتاج تجديد، وتطلع لك هنا قبل موعدها."
          action={<Button onClick={() => (setEdit(null), setOpen(true))}>أضيفي وثيقة</Button>}
        />
      ) : (
        <>
          {soon.length > 0 && <InsetGroupedList header="قرّب موعدها">{soon.map(row)}</InsetGroupedList>}
          {rest.length > 0 && <InsetGroupedList header={soon.length ? 'الباقي' : 'وثائقك'}>{rest.map(row)}</InsetGroupedList>}
        </>
      )}

      <DocSheet
        key={edit?.id ?? 'new'}
        open={open}
        doc={edit}
        onClose={() => setOpen(false)}
        onDelete={
          edit
            ? () => {
                setOpen(false)
                remove(edit)
              }
            : undefined
        }
        onSave={async (d) => {
          await store.upsertAdminDoc(d)
          setOpen(false)
          toast({ message: edit ? 'انحفظت' : 'انضافت' })
        }}
      />
    </Screen>
  )
}

function DocSheet({ open, doc, onClose, onSave, onDelete }: { open: boolean; doc: AdminDoc | null; onClose: () => void; onSave: (d: AdminDoc) => void; onDelete?: () => void }) {
  const [name, setName] = useState(doc?.name ?? '')
  const [expiry, setExpiry] = useState(doc?.expiry ?? '')
  const [remind, setRemind] = useState(doc?.remindDaysBefore ?? 30)
  const [note, setNote] = useState(doc?.note ?? '')
  return (
    <Sheet open={open} onClose={onClose} title={doc ? 'تعديل الوثيقة' : 'وثيقة جديدة'} detents={['large']}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          onSave({ id: doc?.id ?? newId('doc'), name: name.trim(), expiry: expiry || null, remindDaysBefore: remind, note: note.trim() })
        }}
      >
        <label className={styles.field}>
          <span className={styles.fieldLabel}>وش هي؟</span>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلًا: رخصة القيادة" autoFocus={!doc} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>تاريخ الانتهاء</span>
          <input className={`${styles.input} ${styles.ltrInput}`} type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>نذكّرك قبلها بـ</span>
          <select className={styles.select} value={remind} onChange={(e) => setRemind(Number(e.target.value))}>
            {[7, 14, 30, 60, 90].map((d) => (
              <option key={d} value={d}>
                {countLabel(d, NOUNS.day)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>ملاحظة (اختياري)</span>
          <textarea className={styles.textarea} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلًا: التجديد من أبشر" />
        </label>
        <Button type="submit" block size="large" disabled={!name.trim()}>
          احفظي
        </Button>
        {onDelete && (
          <Button type="button" variant="plain" block onClick={onDelete} style={{ color: 'var(--error)' }}>
            احذفي الوثيقة
          </Button>
        )}
      </form>
    </Sheet>
  )
}
