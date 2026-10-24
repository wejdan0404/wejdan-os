import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { noteDisplayTitle, notesView, type Note } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import type { MenuItem } from '../../components/ContextMenu'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow, type SwipeAction } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { SegmentedControl } from '../../components/SegmentedControl'
import { StarMark } from '../../components/StarMark'
import { useToast } from '../../components/Toast'
import { Icon } from '../../icons/Icon'
import { useLife, useStore } from '../../state/LifeStore'
import { NotesIcon, friendlyDate, linkItems, linkLabels, snippet } from './notesKit'
import { SearchButton } from './SearchSheet'
import styles from './notes.module.css'

type View = 'all' | 'decisions' | 'pinned'

const VIEWS = [
  { value: 'all' as const, label: 'الكل' },
  { value: 'decisions' as const, label: 'القرارات' },
  { value: 'pinned' as const, label: 'المثبّتة' },
]

export default function NotesScreen() {
  const s = useLife()
  const store = useStore()
  const toast = useToast()
  const navigate = useNavigate()
  const [view, setView] = useState<View>('all')
  const now = new Date()

  const all = useMemo(() => notesView(s), [s])
  const pinned = useMemo(() => all.filter((n) => n.pinned), [all])
  const decisions = useMemo(() => all.filter((n) => n.isDecision), [all])
  const rest = useMemo(() => all.filter((n) => !n.pinned && !n.isDecision), [all])

  const open = (n: Note) => navigate(`/me/notes/${encodeURIComponent(n.id)}`)
  const compose = () => navigate('/me/notes/new')

  const remove = (n: Note) =>
    void store.deleteNote(n.id).then((t) =>
      toast(
        t
          ? { message: 'انحذفت الملاحظة', actionLabel: 'تراجع', onAction: () => void store.undoDelete(t.token) }
          : { message: 'انحذفت الملاحظة' },
      ),
    )
  const togglePin = (n: Note) =>
    void store.setNotePinned(n.id, !n.pinned).then(() => toast({ message: n.pinned ? 'فكّيتي تثبيتها' : 'ثبّتيها فوق' }))
  const toggleDecision = (n: Note) =>
    void store
      .setNoteDecision(n.id, !n.isDecision)
      .then(() => toast({ message: n.isDecision ? 'رجعت ملاحظة عادية' : 'انحفظت كقرار' }))

  const menu = (n: Note): MenuItem[] => [
    { key: 'open', label: 'افتحيها', icon: <NotesIcon name="compose" size={18} />, onSelect: () => open(n) },
    {
      key: 'pin',
      label: n.pinned ? 'فكّي التثبيت' : 'ثبّتيها فوق',
      icon: <NotesIcon name="pin" size={18} />,
      onSelect: () => togglePin(n),
    },
    {
      key: 'decision',
      label: n.isDecision ? 'شيليها من القرارات' : 'خلّيها قرار',
      icon: <StarMark size={14} />,
      onSelect: () => toggleDecision(n),
    },
    { key: 'delete', label: 'احذفيها', icon: <Icon name="trash" size={18} />, destructive: true, onSelect: () => remove(n) },
  ]
  const leading = (n: Note): SwipeAction[] => [
    {
      key: 'pin',
      label: n.pinned ? 'فكّي' : 'ثبّتي',
      icon: <NotesIcon name="pin" size={20} />,
      tone: 'accent',
      onAction: () => togglePin(n),
    },
  ]
  const trailing = (n: Note): SwipeAction[] => [
    { key: 'delete', label: 'احذفي', icon: <Icon name="trash" size={20} />, tone: 'destructive', onAction: () => remove(n) },
  ]

  const row = (n: Note, kind: 'pinned' | 'decision' | 'plain') => {
    const labels = linkLabels(s, n)
    const body = snippet(n.body)
    const lead =
      kind === 'decision' ? (
        <span className={styles.rowLead}>
          <StarMark size={16} label="قرار متّخذ" />
        </span>
      ) : kind === 'pinned' ? (
        <span className={styles.rowLead} role="img" aria-label="مثبّتة">
          <NotesIcon name="pin" />
        </span>
      ) : (
        <span className={styles.rowLead} data-muted="">
          <NotesIcon name="doc" />
        </span>
      )
    return (
      <ListRow
        key={n.id}
        leading={lead}
        title={<Bidi>{noteDisplayTitle(n)}</Bidi>}
        trailing={n.isDecision ? <span className={styles.decisionTag}>قرار</span> : undefined}
        subtitle={
          <span className={styles.sub}>
            {body && n.title.trim() && (
              <span className={styles.snippet}>
                <Bidi>{body}</Bidi>
              </span>
            )}
            {kind === 'decision' ? (
              <span className={styles.meta}>
                {[friendlyDate(n.updatedAt, now), ...labels].join(' · ')}
              </span>
            ) : labels.length > 0 ? (
              <span className={styles.chips}>
                {linkItems(s, n).map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    className={`${styles.linkChip} ${styles.linkChipBtn}`}
                    aria-label={`افتحي ${l.label}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(l.to)
                    }}
                  >
                    <Bidi>{l.label}</Bidi>
                  </button>
                ))}
              </span>
            ) : (
              <span className={styles.meta}>{friendlyDate(n.updatedAt, now)} · بدون ربط</span>
            )}
          </span>
        }
        onClick={() => open(n)}
        menu={menu(n)}
        moreButton
        leadingActions={leading(n)}
        trailingActions={trailing(n)}
      />
    )
  }

  const actions = (
    <span className={styles.navGroup}>
      <SearchButton />
      <button type="button" className={styles.navBtn} aria-label="ملاحظة جديدة" onClick={compose}>
        <NotesIcon name="compose" size={20} />
      </button>
    </span>
  )

  const empty = (title: string, body: string, cta = true) => (
    <EmptyState
      title={title}
      body={body}
      action={
        cta ? (
          <Button icon={<Icon name="plus" size={18} />} onClick={compose}>
            اكتبي ملاحظة
          </Button>
        ) : undefined
      }
    />
  )

  return (
    <Screen title="ملاحظاتي" backLabel="أنا" actions={actions} subtitle="اللي تبين ترجعين له — والقرارات اللي ثبّتيها.">
      <div className={styles.stack}>
        {all.length > 0 && (
          <div className={styles.pad}>
            <SegmentedControl segments={VIEWS} value={view} onChange={setView} label="عرض الملاحظات" />
          </div>
        )}

        {all.length === 0 ? (
          empty('ما فيه ملاحظات للحين', 'اكتبي أي شي تبين ترجعين له، أو قرار ثبّتيه — وتلقينه هنا.')
        ) : view === 'decisions' ? (
          decisions.length === 0 ? (
            empty('ما فيه قرارات للحين', 'لما تثبّتين قرار، فعّلي «هذا قرار» بالملاحظة وينعلّم بنجمة.', false)
          ) : (
            <InsetGroupedList footer="القرارات تنعلّم بنجمة، وتلقينها كلها تحت «القرارات».">
              {decisions.map((n) => row(n, 'decision'))}
            </InsetGroupedList>
          )
        ) : view === 'pinned' ? (
          pinned.length === 0 ? (
            empty('ما ثبّتي شي للحين', 'من «…» على أي ملاحظة اختاري «ثبّتيها فوق».', false)
          ) : (
            <InsetGroupedList>{pinned.map((n) => row(n, 'pinned'))}</InsetGroupedList>
          )
        ) : (
          <>
            {pinned.length > 0 && <InsetGroupedList header="مثبّتة">{pinned.map((n) => row(n, 'pinned'))}</InsetGroupedList>}
            {decisions.filter((n) => !n.pinned).length > 0 && (
              <InsetGroupedList
                header={
                  <span className={styles.sectionHead}>
                    القرارات
                    <span className={styles.thread} aria-hidden="true" />
                  </span>
                }
              >
                {decisions.filter((n) => !n.pinned).map((n) => row(n, 'decision'))}
              </InsetGroupedList>
            )}
            {rest.length > 0 && <InsetGroupedList header="الباقي">{rest.map((n) => row(n, 'plain'))}</InsetGroupedList>}
          </>
        )}
      </div>
    </Screen>
  )
}
