import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import {
  dayKey, openInbox, postponedTasks, tasksByStatus, type InboxItem, type InboxKind, type TaskItem,
} from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow, type SwipeAction } from '../../components/ListRow'
import type { MenuItem } from '../../components/ContextMenu'
import { Screen } from '../../components/Screen'
import { useToast } from '../../components/Toast'
import { Icon } from '../../icons/Icon'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import { NOUNS, countLabel } from '../../lib/plural'
import { ITEM, isoDayLabel } from '../sources/sourcesKit'
import { MeIcon, fmtIso } from './meKit'
import styles from './me.module.css'

const KIND: Record<InboxKind, string> = {
  task: 'مهمة',
  idea: 'فكرة',
  note: 'ملاحظة',
  link: 'رابط',
  potential_project: 'مشروع محتمل',
}

export default function InboxScreen() {
  const s = useLife()
  const store = useStore()
  const today = useToday()
  const toast = useToast()
  const [draft, setDraft] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const items = useMemo(() => openInbox(s), [s])
  const waiting = useMemo(() => tasksByStatus(s, 'inbox'), [s])
  const later = useMemo(() => postponedTasks(s), [s])
  const archived = useMemo(() => s.inbox.filter((i) => i.archived && !i.convertedTo), [s])
  const todayKey = dayKey(today)
  // Every task has a home here (QA area 5 #9): planned for another day, and recently finished.
  const upcoming = useMemo(
    () =>
      s.tasks
        .filter((t) => (t.status === 'planned' || t.status === 'in_progress') && t.dueDate !== todayKey)
        .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')),
    [s.tasks, todayKey],
  )
  const finished = useMemo(
    () =>
      s.tasks
        .filter((t) => t.status === 'done' || t.status === 'cancelled')
        .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt))
        .slice(0, 30),
    [s.tasks],
  )
  const [showFinished, setShowFinished] = useState(false)

  // Deep link from search: «#/me/inbox?focus=<id>» opens the collapsed section that holds it.
  const { search } = useLocation()
  const focusId = new URLSearchParams(search).get('focus')
  useEffect(() => {
    if (!focusId) return
    if (archived.some((i) => i.id === focusId)) setShowArchived(true)
    if (finished.some((t) => t.id === focusId)) setShowFinished(true)
  }, [focusId]) // eslint-disable-line react-hooks/exhaustive-deps

  const undoable = (label: string, p: Promise<{ token: string } | null>) =>
    void p.then((t) => toast({ message: label, actionLabel: t ? 'تراجع' : undefined, onAction: t ? () => void store.undoDelete(t.token) : undefined }))

  const capture = (e: FormEvent) => {
    e.preventDefault()
    const t = draft.trim()
    if (!t) return
    void store.quickAdd(t, /^https?:\/\//.test(t) ? 'link' : 'task', /^https?:\/\//.test(t) ? { url: t } : {})
    setDraft('')
    toast({ message: 'انحفظت بالوارد' })
  }

  // ---- inbox items ----------------------------------------------------------------------
  const archive = (it: InboxItem) =>
    void store.archiveInbox(it.id).then(() =>
      toast({ message: 'انأرشفت', actionLabel: 'تراجع', onAction: () => void store.archiveInbox(it.id, false) }),
    )
  const convert = (it: InboxItem, to: 'task' | 'project' | 'note', message: string, o: { dueDate?: string | null } = {}) =>
    void store.convertInboxWithUndo(it.id, to, o).then(({ undo }) =>
      toast(undo ? { message, actionLabel: 'تراجع', onAction: () => void store.undoDelete(undo.token) } : { message }),
    )
  const toTask = (it: InboxItem, due: string | null) => convert(it, 'task', due ? 'انضافت لليوم' : 'صارت مهمة', { dueDate: due })
  const itemMenu = (it: InboxItem): MenuItem[] => [
    { key: 'today', label: 'خطّطيها لليوم', icon: <Icon name="today" size={18} />, onSelect: () => toTask(it, todayKey) },
    { key: 'task', label: 'حوّليها مهمة', icon: <Icon name="check" size={18} />, onSelect: () => toTask(it, null) },
    {
      key: 'project', label: 'حوّليها مشروع', icon: <Icon name="path" size={18} />,
      onSelect: () => convert(it, 'project', 'انضافت لأفكار مساري'),
    },
    {
      key: 'note', label: 'خليها ملاحظة', icon: <Icon name="book" size={18} />,
      onSelect: () => convert(it, 'note', 'انحفظت كملاحظة'),
    },
    { key: 'archive', label: 'أرشفي', icon: <Icon name="inbox" size={18} />, onSelect: () => archive(it) },
    { key: 'delete', label: 'احذفي', icon: <Icon name="trash" size={18} />, destructive: true, onSelect: () => undoable('انحذفت', store.deleteInbox(it.id)) },
  ]
  const itemLeading = (it: InboxItem): SwipeAction[] => [
    { key: 'today', label: 'اليوم', icon: <Icon name="today" size={20} />, tone: 'accent', onAction: () => toTask(it, todayKey) },
  ]
  const itemTrailing = (it: InboxItem): SwipeAction[] => [
    { key: 'archive', label: 'أرشفي', icon: <Icon name="inbox" size={20} />, tone: 'neutral', onAction: () => archive(it) },
    { key: 'delete', label: 'احذفي', icon: <Icon name="trash" size={20} />, tone: 'destructive', onAction: () => undoable('انحذفت', store.deleteInbox(it.id)) },
  ]

  // ---- tasks --------------------------------------------------------------------------------
  const taskMenu = (t: TaskItem, inLater: boolean): MenuItem[] => [
    {
      key: 'today', label: inLater ? 'رجّعيها لليوم' : 'خطّطيها اليوم', icon: <Icon name="today" size={18} />,
      onSelect: () => void store.planTask(t.id, todayKey).then(() => toast({ message: 'انضافت لليوم' })),
    },
    ...(inLater
      ? [{ key: 'inbox', label: 'رجّعيها للوارد', icon: <Icon name="inbox" size={18} />, onSelect: () => void store.returnTaskToInbox(t.id) }]
      : [{ key: 'later', label: 'بعدين', icon: <Icon name="later" size={18} />, onSelect: () => void store.postponeTask(t.id, null).then(() => toast({ message: 'تلقينها تحت «بعدين»' })) }]),
    { key: 'done', label: 'خلّصتها', icon: <Icon name="check" size={18} />, onSelect: () => void store.completeTask(t.id).then(() => toast({ message: 'انحسبت لك' })) },
    { key: 'delete', label: 'احذفي', icon: <Icon name="trash" size={18} />, destructive: true, onSelect: () => undoable('انحذفت المهمة', store.deleteTask(t.id)) },
  ]
  const taskLeading = (t: TaskItem, inLater: boolean): SwipeAction[] => [
    {
      key: 'today', label: inLater ? 'لليوم' : 'اليوم', icon: <Icon name="today" size={20} />, tone: 'accent',
      onAction: () => void store.planTask(t.id, todayKey).then(() => toast({ message: 'انضافت لليوم' })),
    },
  ]
  const taskTrailing = (t: TaskItem, inLater: boolean): SwipeAction[] => [
    inLater
      ? { key: 'inbox', label: 'للوارد', icon: <Icon name="inbox" size={20} />, tone: 'neutral', onAction: () => void store.returnTaskToInbox(t.id) }
      : { key: 'later', label: 'بعدين', icon: <Icon name="later" size={20} />, tone: 'neutral', onAction: () => void store.postponeTask(t.id, null) },
    { key: 'delete', label: 'احذفي', icon: <Icon name="trash" size={20} />, tone: 'destructive', onAction: () => undoable('انحذفت المهمة', store.deleteTask(t.id)) },
  ]

  const empty =
    items.length === 0 && waiting.length === 0 && later.length === 0 && s.later.length === 0 && upcoming.length === 0 && finished.length === 0

  return (
    <Screen title="الوارد" backLabel="أنا">
      <form className={styles.pad} onSubmit={capture} style={{ display: 'flex', gap: 8 }}>
        <label htmlFor="inbox-capture" className="sr-only" style={{ position: 'absolute', inlineSize: 1, blockSize: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          أضيفي للوارد
        </label>
        <input
          id="inbox-capture"
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="اكتبي أي شي — مهمة، فكرة، رابط…"
          enterKeyHint="done"
          autoComplete="off"
        />
        <Button type="submit" disabled={!draft.trim()} aria-label="أضيفي">
          أضيفي
        </Button>
      </form>

      {empty ? (
        <EmptyState title="الوارد فاضي" body="أي شي يطري على بالك اكتبيه هنا، وترتّبينه بعدين على راحتك." />
      ) : (
        <>
          {items.length > 0 && (
            <InsetGroupedList header="لسا ما ترتّبت" footer="اضغطي «…» عشان تخططينها لليوم أو تحوّلينها أو تأرشفينها. وتقدرين تسحبين الصف بعد.">
              {items.map((it) => (
                <ListRow
                  key={it.id}
                  leading={<span className={styles.rowIcon}><Icon name={it.kind === 'link' ? 'path' : it.kind === 'note' ? 'book' : it.kind === 'idea' ? 'drop' : 'check'} size={18} /></span>}
                  title={<Bidi>{it.title}</Bidi>}
                  subtitle={[KIND[it.kind], it.source ? `من ${it.source}` : null].filter(Boolean).join(' · ')}
                  menu={itemMenu(it)}
                  leadingActions={itemLeading(it)}
                  trailingActions={itemTrailing(it)}
                />
              ))}
            </InsetGroupedList>
          )}

          {waiting.length > 0 && (
            <InsetGroupedList header="مهام تنتظر موعد">
              {waiting.map((t) => (
                <ListRow
                  key={t.id}
                  leading={<span className={styles.rowIcon}><Icon name="check" size={18} /></span>}
                  title={<Bidi>{t.title}</Bidi>}
                  subtitle="بدون موعد"
                  menu={taskMenu(t, false)}
                  leadingActions={taskLeading(t, false)}
                  trailingActions={taskTrailing(t, false)}
                />
              ))}
            </InsetGroupedList>
          )}

          {(later.length > 0 || s.later.length > 0) && (
            <InsetGroupedList header="بعدين" footer="اللي أجّلتيه ما يختفي — يبقى هنا لين ترجّعينه.">
              {later.map((t) => (
                <ListRow
                  key={t.id}
                  leading={<span className={styles.rowIcon}><Icon name="later" size={18} /></span>}
                  title={<Bidi>{t.title}</Bidi>}
                  subtitle={t.postponedTo ? `لين ${isoDayLabel(t.postponedTo)}` : 'بدون موعد'}
                  menu={taskMenu(t, true)}
                  leadingActions={taskLeading(t, true)}
                  trailingActions={taskTrailing(t, true)}
                />
              ))}
              {s.later.map((p) => (
                <ListRow
                  key={p.id}
                  leading={<span className={styles.rowIcon}><Icon name="later" size={18} /></span>}
                  title={<Bidi>{p.title.ar}</Bidi>}
                  subtitle="من خطة يوم سابق"
                  leadingActions={[
                    {
                      key: 'today', label: 'لليوم', icon: <Icon name="today" size={20} />, tone: 'accent',
                      onAction: () => void store.restoreFromLater(p.id).then(() => toast({ message: 'رجعت لليوم' })),
                    },
                  ]}
                  trailingActions={[
                    { key: 'drop', label: 'شيليها', icon: <Icon name="trash" size={20} />, tone: 'destructive', onAction: () => undoable('انشالت', store.dropFromLater(p.id)) },
                  ]}
                  menu={[
                    { key: 'today', label: 'رجّعيها لليوم', icon: <Icon name="today" size={18} />, onSelect: () => void store.restoreFromLater(p.id) },
                    { key: 'drop', label: 'شيليها', icon: <Icon name="trash" size={18} />, destructive: true, onSelect: () => undoable('انشالت', store.dropFromLater(p.id)) },
                  ]}
                />
              ))}
            </InsetGroupedList>
          )}
        </>
      )}

      {upcoming.length > 0 && (
        <InsetGroupedList header="مخططة لأيام ثانية" footer="تطلع لك في «اليوم» بيومها.">
          {upcoming.map((t) => (
            <ListRow
              key={t.id}
              leading={<span className={styles.rowIcon}><Icon name="today" size={18} /></span>}
              title={<Bidi>{t.title}</Bidi>}
              subtitle={
                t.dueDate == null
                  ? 'شغّالة عليها'
                  : t.dueDate < todayKey
                    ? `كان موعدها ${isoDayLabel(t.dueDate)}`
                    : `موعدها ${isoDayLabel(t.dueDate)}`
              }
              menu={taskMenu(t, false)}
              leadingActions={taskLeading(t, false)}
              trailingActions={taskTrailing(t, false)}
            />
          ))}
        </InsetGroupedList>
      )}

      {finished.length > 0 && (
        <InsetGroupedList
          header="خلصت مؤخرًا"
          headerAction={
            <Button variant="plain" onClick={() => setShowFinished((v) => !v)}>
              {showFinished ? 'أخفيها' : `اعرضيها (${finished.length})`}
            </Button>
          }
        >
          {showFinished ? (
            finished.map((t) => (
              <ListRow
                key={t.id}
                muted
                leading={<span className={styles.rowIcon}><Icon name="check" size={18} /></span>}
                title={<Bidi>{t.title}</Bidi>}
                subtitle={t.status === 'done' ? `خلصت · ${fmtIso(t.completedAt ?? t.updatedAt)}` : 'ملغاة'}
                trailing={
                  <Button variant="plain" onClick={() => void store.returnTaskToInbox(t.id).then(() => toast({ message: 'رجعت للوارد' }))}>
                    رجّعيها
                  </Button>
                }
              />
            ))
          ) : (
            <ListRow muted title={`${countLabel(finished.length, NOUNS.task)} خلصت أو انلغت`} subtitle="محفوظة، بس مخفية" />
          )}
        </InsetGroupedList>
      )}

      {archived.length > 0 && (
        <InsetGroupedList
          header="المؤرشف"
          headerAction={
            <Button variant="plain" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? 'أخفيه' : `اعرضيه (${archived.length})`}
            </Button>
          }
        >
          {showArchived ? (
            archived.map((it) => (
              <ListRow
                key={it.id}
                muted
                leading={<MeIcon name="inbox" size={20} style={{ color: 'var(--text-muted)' }} />}
                title={<Bidi>{it.title}</Bidi>}
                subtitle={`انأرشفت · ${fmtIso(it.createdAt)}`}
                trailing={
                  <Button variant="plain" onClick={() => void store.archiveInbox(it.id, false)}>
                    رجّعيها
                  </Button>
                }
              />
            ))
          ) : (
            <ListRow muted title={`${countLabel(archived.length, ITEM)} بالأرشيف`} subtitle="محفوظة، بس مخفية" />
          )}
        </InsetGroupedList>
      )}
    </Screen>
  )
}
