import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type NoteLink, type NoteLinkKind } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { SegmentedControl } from '../../components/SegmentedControl'
import { StarMark } from '../../components/StarMark'
import { Switch } from '../../components/Switch'
import { useToast } from '../../components/Toast'
import { Icon } from '../../icons/Icon'
import { useStack } from '../../shell/stack'
import { useLife, useStore } from '../../state/LifeStore'
import { fieldDir } from '../../lib/textDir'
import { LINK_KIND_LABEL, NotesIcon, linkRoute, linkTitle, useRouteTail } from './notesKit'
import styles from './notes.module.css'

type PickKind = Exclude<NoteLinkKind, 'task'> | 'none'

const PICK_KINDS = [
  { value: 'project' as const, label: 'مشروع' },
  { value: 'goal' as const, label: 'هدف' },
  { value: 'habit' as const, label: 'عادة' },
  // board: an explicit «بدون» — the note stands alone
  { value: 'none' as const, label: 'بدون' },
]

const sameLink = (a: NoteLink, b: NoteLink) => a.kind === b.kind && a.id === b.id

export default function NoteEditorScreen() {
  const tail = useRouteTail()
  const isNew = tail === 'new'
  const s = useLife()
  const store = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  const stack = useStack()
  const existing = isNew ? null : (s.notes.find((n) => n.id === tail) ?? null)

  const [title, setTitle] = useState(existing?.title ?? '')
  const [body, setBody] = useState(existing?.body ?? '')
  const [isDecision, setIsDecision] = useState(existing?.isDecision ?? false)
  const [pinned, setPinned] = useState(existing?.pinned ?? false)
  const [links, setLinks] = useState<NoteLink[]>(existing?.links ?? [])
  const [pickKind, setPickKind] = useState<PickKind>(() => (existing?.links[0]?.kind as PickKind | undefined) ?? 'project')
  const [armedDelete, setArmedDelete] = useState(false)

  // load once the note arrives (cold deep link: the store may still be booting)
  const loadedFor = useRef<string | null>(existing ? existing.id : null)
  useEffect(() => {
    if (existing && loadedFor.current !== existing.id) {
      loadedFor.current = existing.id
      setTitle(existing.title)
      setBody(existing.body)
      setIsDecision(existing.isDecision)
      setPinned(existing.pinned)
      setLinks(existing.links)
    }
  }, [existing])

  useEffect(() => {
    if (!armedDelete) return
    const t = window.setTimeout(() => setArmedDelete(false), 4000)
    return () => window.clearTimeout(t)
  }, [armedDelete])

  const empty = !title.trim() && !body.trim()
  const dirty = existing
    ? title !== existing.title ||
      body !== existing.body ||
      isDecision !== existing.isDecision ||
      pinned !== existing.pinned ||
      links.length !== existing.links.length ||
      links.some((l) => !existing.links.some((e) => sameLink(e, l)))
    : !empty

  // Nothing she typed is lost (like Notes on iPhone): it autosaves while she types, flushes when
  // the app is backgrounded or reloaded, and saves on leaving. A new note is created on the first
  // autosave and every later save updates that same note.
  const latest = useRef({ title, body, isDecision, pinned, links, dirty, empty })
  latest.current = { title, body, isDecision, pinned, links, dirty, empty }
  const saved = useRef(false)
  const noteId = existing?.id ?? null
  const createdId = useRef<string | null>(null)
  const lastSavedKey = useRef<string | null>(null)
  const saving = useRef<Promise<unknown> | null>(null)
  const persist = (): Promise<boolean> => {
    const v = latest.current
    if (saved.current || v.empty) return Promise.resolve(false)
    const patch = { title: v.title.trim(), body: v.body.trim(), isDecision: v.isDecision, pinned: v.pinned, links: v.links }
    const key = JSON.stringify(patch)
    const id = noteId ?? createdId.current
    if (key === lastSavedKey.current || (!v.dirty && !createdId.current)) return Promise.resolve(false)
    lastSavedKey.current = key
    // chain saves so a create always finishes before the next update
    const run = async () => {
      const target = noteId ?? createdId.current ?? id
      if (target) return !!(await store.updateNote(target, patch))
      const n = await store.addNote(patch)
      if (!n) return false
      createdId.current = n.id
      // a reload now reopens this note instead of an empty «new» editor (router state is kept)
      try {
        window.history.replaceState(window.history.state, '', window.location.href.replace(/\/me\/notes\/new(?=$|[?#])/, `/me/notes/${encodeURIComponent(n.id)}`))
      } catch {
        /* history not writable — the note is still saved */
      }
      return true
    }
    const p = (saving.current ?? Promise.resolve()).then(run, run)
    saving.current = p
    return p
  }
  // debounced autosave while typing
  useEffect(() => {
    if (empty || (!dirty && !createdId.current)) return
    const t = window.setTimeout(() => void persist(), 900)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, isDecision, pinned, links, dirty, empty])
  // flush right away when iOS backgrounds or reloads the app
  useEffect(() => {
    const flush = () => void persist()
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId])
  useEffect(
    () => () => {
      void persist().then((didSave) => {
        if (didSave) toast({ message: 'انحفظت الملاحظة' })
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [noteId],
  )

  const save = async () => {
    if (empty) {
      toast({ message: 'اكتبي عنوان أو شي بالتفاصيل أول' })
      return
    }
    const patch = { title: title.trim(), body: body.trim(), isDecision, pinned, links }
    await saving.current
    const target = existing?.id ?? createdId.current
    const n = target ? await store.updateNote(target, patch) : await store.addNote(patch)
    if (!n) {
      toast({ message: 'ما انحفظت — جربي مرة ثانية' })
      return
    }
    saved.current = true
    toast({ message: existing ? 'انحفظت التعديلات' : isDecision ? 'انحفظ القرار' : 'انحفظت الملاحظة' })
    stack?.goBack()
  }

  const remove = async () => {
    if (!existing) return
    if (!armedDelete) {
      setArmedDelete(true)
      return
    }
    saved.current = true
    const t = await store.deleteNote(existing.id)
    toast(t ? { message: 'انحذفت الملاحظة', actionLabel: 'تراجع', onAction: () => void store.undoDelete(t.token) } : { message: 'انحذفت الملاحظة' })
    stack?.goBack()
  }

  const options = useMemo(() => {
    switch (pickKind) {
      case 'project':
        return s.projects.filter((p) => p.status !== 'archived').map((p) => ({ id: p.id, title: p.titleAr }))
      case 'goal':
        return s.goals.map((g) => ({ id: g.id, title: g.titleAr }))
      case 'habit':
        return s.habits.filter((h) => h.status !== 'archived').map((h) => ({ id: h.id, title: h.titleAr }))
      case 'none':
        return []
    }
  }, [pickKind, s.projects, s.goals, s.habits])

  const toggleLink = (l: NoteLink) =>
    setLinks((cur) => (cur.some((x) => sameLink(x, l)) ? cur.filter((x) => !sameLink(x, l)) : [...cur, l]))

  const linkSummary = links
    .map((l) => {
      const t = linkTitle(s, l)
      return t ? `${LINK_KIND_LABEL[l.kind]} · ${t}` : null
    })
    .filter((x): x is string => !!x)

  if (!isNew && !existing && !saved.current) {
    // not found (deleted elsewhere, or a stale link) — after her own delete we just slide away
    return (
      <Screen title="الملاحظة" backLabel="ملاحظاتي" inlineTitle>
        <EmptyState
          title="الملاحظة ما عادت موجودة"
          body="يمكن انحذفت. تقدرين ترجعين لملاحظاتك وتكتبين وحدة جديدة."
          action={<Button onClick={() => stack?.goBack()}>ارجعي لملاحظاتي</Button>}
        />
      </Screen>
    )
  }

  return (
    <Screen
      title={existing ? 'الملاحظة' : 'ملاحظة جديدة'}
      backLabel="إلغاء"
      backStyle="cancel"
      inlineTitle
      actions={
        <button type="button" className={styles.saveBtn} onClick={() => void save()} disabled={empty || (!!existing && !dirty)}>
          احفظي
        </button>
      }
    >
      <div className={styles.stack}>
        <div className={styles.fields}>
          <label htmlFor="note-title" style={{ position: 'absolute', inlineSize: 1, blockSize: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            العنوان
          </label>
          <input
            id="note-title"
            className={styles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="العنوان"
            autoFocus={isNew}
            enterKeyHint="next"
            autoComplete="off"
            dir={fieldDir(title)}
          />
          <label htmlFor="note-body" style={{ position: 'absolute', inlineSize: 1, blockSize: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            التفاصيل
          </label>
          <textarea
            id="note-body"
            className={styles.bodyInput}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.blockSize = 'auto'
              el.style.blockSize = `${el.scrollHeight}px`
            }}
            placeholder="اكتبي اللي ببالك…"
            rows={4}
            dir={fieldDir(body)}
          />
        </div>

        {/* board: the decision/link group is a subtle sky block, not a lifted card */}
        <div className={styles.subtleGroup}>
        <InsetGroupedList>
          <ListRow
            leading={
              <span className={styles.rowLead}>
                <StarMark size={18} />
              </span>
            }
            title="هذا قرار"
            subtitle="ينحفظ بالقرارات وينعلّم بنجمة — وتلقينه تحت «القرارات»."
            trailing={<Switch checked={isDecision} onChange={setIsDecision} label="هذا قرار" />}
          />
          <ListRow
            leading={
              <span className={styles.rowLead}>
                <Icon name="link" size={20} />
              </span>
            }
            title="اربطيها بـ"
            subtitle={
              linkSummary.length === 0 ? (
                'مو مربوطة بشي'
              ) : (
                <span className={styles.chips}>
                  {links.map((l) => {
                    const t = linkTitle(s, l)
                    if (!t) return null
                    return (
                      <span key={`${l.kind}:${l.id}`} className={styles.linkChip}>
                        <button
                          type="button"
                          className={styles.linkChipOpen}
                          aria-label={`افتحي ${LINK_KIND_LABEL[l.kind]} ${t}`}
                          onClick={() => navigate(linkRoute(l))}
                        >
                          <Bidi>{`${LINK_KIND_LABEL[l.kind]} · ${t}`}</Bidi>
                        </button>
                        <button type="button" className={styles.removeLink} aria-label={`شيلي الربط مع ${t}`} onClick={() => toggleLink(l)}>
                          <NotesIcon name="clear" size={12} />
                        </button>
                      </span>
                    )
                  })}
                </span>
              )
            }
          />
        </InsetGroupedList>
        </div>

        <section aria-label="اختاري وش تربطينها فيه" className={styles.stack} style={{ gap: 'var(--space-3)', paddingBlockEnd: 0 }}>
          <div className={styles.pad}>
            <SegmentedControl
              segments={PICK_KINDS}
              value={pickKind}
              onChange={(k) => {
                setPickKind(k)
                if (k === 'none') setLinks([])
              }}
              label="نوع الربط"
            />
          </div>
          {options.length === 0 ? (
            <p className={styles.lede}>
              {pickKind === 'none'
                ? 'الملاحظة لحالها — تقدرين تربطينها بعدين.'
                : pickKind === 'project'
                  ? 'ما عندك مشاريع للحين.'
                  : pickKind === 'goal'
                    ? 'ما عندك أهداف للحين.'
                    : 'ما عندك عادات للحين.'}
            </p>
          ) : (
            <div className={styles.pickerChips} role="group" aria-label={`اختاري ${LINK_KIND_LABEL[pickKind as Exclude<PickKind, 'none'>]}`}>
              {options.map((o) => {
                const link = { kind: pickKind, id: o.id } as NoteLink
                const on = links.some((l) => sameLink(l, link))
                return (
                  <button key={o.id} type="button" role="checkbox" aria-checked={on} className={styles.pickChip} onClick={() => toggleLink(link)}>
                    {on && <Icon name="check" size={14} />}
                    <Bidi>{o.title}</Bidi>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <div className={styles.footRow}>
          <button type="button" className={styles.plainBtn} data-on={pinned || undefined} aria-pressed={pinned} onClick={() => setPinned((p) => !p)}>
            <NotesIcon name="pin" size={18} />
            {pinned ? 'مثبّتة فوق' : 'ثبّتيها فوق'}
          </button>
          <span className={styles.privacy}>تنحفظ على جهازك بس</span>
        </div>

        {existing && (
          <div className={styles.footRow}>
            <button type="button" className={styles.dangerBtn} onClick={() => void remove()}>
              <Icon name="trash" size={18} />
              {armedDelete ? 'اضغطي مرة ثانية عشان تنحذف' : 'احذفي الملاحظة'}
            </button>
          </div>
        )}
      </div>
    </Screen>
  )
}
