/**
 * Global search — a large sheet over any screen. `<SearchButton />` is the entry point
 * (a 44px round button for a screen's nav bar); it owns the sheet's open state.
 */
import { useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { dayKey, type SearchKind, type SearchResult } from '../../../domain'
import { Button } from '../../components/Button'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import { fieldDir } from '../../lib/textDir'
import { flashTarget } from '../../lib/flashTarget'
import { Highlight, NotesIcon } from './notesKit'
import styles from './notes.module.css'

const SHORT: Record<SearchKind, string> = {
  task: 'مهام',
  inbox: 'الوارد',
  habit: 'عادات',
  project: 'مشاريع',
  goal: 'أهداف',
  note: 'ملاحظات',
  product: 'منتجات',
  joy: 'متعتي',
}

const KIND_ICON: Record<SearchKind, Parameters<typeof NotesIcon>[0]['name']> = {
  task: 'circle',
  inbox: 'inbox',
  habit: 'habit',
  project: 'project',
  goal: 'goal',
  note: 'doc',
  product: 'product',
  joy: 'joy',
}

// ---- recent searches: a per-device convenience (never data she relies on) ----------------------
const RECENT_KEY = 'wejdan.recentSearches'
function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 6) : []
  } catch {
    return []
  }
}
function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6)))
  } catch {
    /* storage unavailable — fine */
  }
}

export function SearchButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={styles.navBtn} aria-label="ابحثي في كل شي" onClick={() => setOpen(true)}>
        <NotesIcon name="search" size={20} />
      </button>
      <SearchSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export default function SearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="البحث" detents={['large']} bare>
      {open && <SearchBody onClose={onClose} />}
    </Sheet>
  )
}

function SearchBody({ onClose }: { onClose: () => void }) {
  const s = useLife()
  const store = useStore()
  const today = useToday()
  const toast = useToast()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<SearchKind | 'all'>('all')
  const [recent, setRecent] = useState<string[]>(readRecent)
  const q = useDeferredValue(query)

  // the sheet focuses its panel first; then hand focus to the field
  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => window.clearTimeout(t)
  }, [])

  const res = useMemo(() => store.search(q), [store, q, s]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (kind !== 'all' && !res.groups.some((g) => g.kind === kind)) setKind('all')
  }, [res, kind])

  const groups = kind === 'all' ? res.groups : res.groups.filter((g) => g.kind === kind)
  const hasQuery = q.trim().length > 0

  const remember = (term: string) => {
    const t = term.trim()
    if (!t) return
    const next = [t, ...recent.filter((r) => r !== t)].slice(0, 6)
    setRecent(next)
    writeRecent(next)
  }

  const go = (r: SearchResult) => {
    remember(query)
    const todayKey = dayKey(today)
    // Where the result actually lives (QA area 5 #9) + whether to flash its row once there.
    const [to, flash] = ((): [string, boolean] => {
      switch (r.kind) {
        case 'task': {
          const t = s.tasks.find((x) => x.id === r.id)
          if (t?.dueDate === todayKey && t.status !== 'done' && t.status !== 'cancelled') return ['/today', true]
          return [`/me/inbox?focus=${encodeURIComponent(r.id)}`, true]
        }
        case 'inbox':
          return [`/me/inbox?focus=${encodeURIComponent(r.id)}`, true]
        case 'habit':
          return [`/habits/${encodeURIComponent(r.id)}`, false]
        case 'project':
          return [`/path/project/${encodeURIComponent(r.id)}`, false]
        case 'goal':
          return ['/path', true]
        case 'note':
          return [`/me/notes/${encodeURIComponent(r.id)}`, false]
        case 'product':
          return ['/me/products', true]
        case 'joy':
          return ['/joy', true]
      }
    })()
    onClose()
    navigate(to)
    if (flash) flashTarget(r.title)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    remember(query)
    inputRef.current?.blur()
  }

  const toInbox = () => {
    const t = query.trim()
    if (!t) return
    void store.quickAdd(t).then(() => {
      toast({ message: 'انحفظت بالوارد' })
      onClose()
    })
  }
  const toNote = () => {
    const t = query.trim()
    if (!t) return
    void store.addNote({ title: t }).then((n) => {
      onClose()
      if (n) navigate(`/me/notes/${encodeURIComponent(n.id)}`)
    })
  }

  return (
    <div>
      <form className={styles.searchHead} role="search" onSubmit={submit} style={{ marginInline: 'calc(-1 * var(--page-margin))' }}>
        <div className={styles.searchRow}>
          <div className={styles.field}>
            <NotesIcon name="search" size={18} />
            <label htmlFor="global-search" style={{ position: 'absolute', inlineSize: 1, blockSize: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              ابحثي في كل شي
            </label>
            <input
              ref={inputRef}
              id="global-search"
              type="search"
              className={styles.input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="مهام، عادات، مشاريع، ملاحظات…"
              enterKeyHint="search"
              autoComplete="off"
              dir={fieldDir(query)}
            />
            {query && (
              <button
                type="button"
                className={styles.clear}
                aria-label="امسحي البحث"
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
              >
                <NotesIcon name="clear" size={12} strokeWidth={3} />
              </button>
            )}
          </div>
          {/* the bare sheet (board: iOS search) has no header, so this is its one close control (QA area 5 #21) */}
          <button type="button" className={styles.cancel} onClick={onClose}>
            إلغاء
          </button>
        </div>

        {hasQuery && res.total > 0 && (
          <div className={styles.filters} role="tablist" aria-label="نطاق البحث">
            <button type="button" role="tab" aria-selected={kind === 'all'} className={styles.filter} onClick={() => setKind('all')}>
              الكل · <span className="num">{res.total}</span>
            </button>
            {res.groups.map((g) => (
              <button key={g.kind} type="button" role="tab" aria-selected={kind === g.kind} className={styles.filter} onClick={() => setKind(g.kind)}>
                {SHORT[g.kind]}
              </button>
            ))}
          </div>
        )}
      </form>

      <div className={styles.results} aria-live="polite">
        {!hasQuery ? (
          recent.length > 0 ? (
            <InsetGroupedList
              flush
              header="آخر بحوثك"
              headerAction={
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => {
                    setRecent([])
                    writeRecent([])
                  }}
                >
                  امسحيها
                </button>
              }
            >
              {recent.map((r) => (
                <ListRow
                  key={r}
                  leading={
                    <span className={styles.rowLead} data-muted="">
                      <NotesIcon name="clock" size={18} />
                    </span>
                  }
                  title={<bdi>{r}</bdi>}
                  onClick={() => setQuery(r)}
                />
              ))}
            </InsetGroupedList>
          ) : (
            <p className={styles.hint}>ابحثي بمهامك، عاداتك، مشاريعك، ملاحظاتك، ومنتجاتك — كلها من مكان واحد.</p>
          )
        ) : res.total === 0 ? (
          <section className={styles.noResults} aria-labelledby="no-results-title" style={{ marginInline: 0 }}>
            <NotesIcon name="search" size={44} strokeWidth={1.2} />
            <h2 id="no-results-title" className={styles.noResultsTitle}>
              ما لقينا شي باسم «<bdi>{q.trim()}</bdi>»
            </h2>
            <p className={styles.noResultsBody}>جربي كلمة أقصر، أو دوّري بالنوع — مثل «بشرة».</p>
            <div className={styles.noResultsActions}>
              <Button onClick={toInbox}>حطيها بالوارد</Button>
              <Button variant="secondary" onClick={toNote}>
                اكتبيها ملاحظة
              </Button>
            </div>
          </section>
        ) : (
          groups.map((g) => (
            <InsetGroupedList key={g.kind} flush elevated header={g.label}>
              {g.results.map((r) => (
                <ListRow
                  key={`${r.kind}:${r.id}`}
                  leading={
                    <span className={styles.rowLead} data-muted={r.inactive || undefined}>
                      <NotesIcon name={KIND_ICON[r.kind]} />
                    </span>
                  }
                  title={<Highlight text={r.title} query={q} />}
                  subtitle={r.subtitle ? <Highlight text={r.subtitle} query={q} /> : undefined}
                  muted={r.inactive}
                  chevron
                  onClick={() => go(r)}
                />
              ))}
            </InsetGroupedList>
          ))
        )}
      </div>
    </div>
  )
}
