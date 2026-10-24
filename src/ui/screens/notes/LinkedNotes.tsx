/**
 * «ملاحظاتك عنه» — the notes and decisions linked to a project / habit / goal, shown on that
 * item's own page so a link actually leads somewhere (QA area 5 #7). Renders nothing when there
 * are none, plus a quiet «اكتبي ملاحظة» row so she can start one from here.
 */
import { useNavigate } from 'react-router-dom'
import { noteDisplayTitle, notesLinkedTo, type NoteLinkKind } from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { StarMark } from '../../components/StarMark'
import { useLife } from '../../state/LifeStore'
import { NotesIcon, snippet } from './notesKit'
import styles from './notes.module.css'

export function LinkedNotes({ kind, id }: { kind: NoteLinkKind; id: string }) {
  const s = useLife()
  const navigate = useNavigate()
  const notes = notesLinkedTo(s, kind, id)
  if (notes.length === 0) return null
  return (
    <InsetGroupedList header="ملاحظاتك عنه">
      {notes.map((n) => (
        <ListRow
          key={n.id}
          leading={
            n.isDecision ? (
              <span className={styles.rowLead}>
                <StarMark size={16} label="قرار متّخذ" />
              </span>
            ) : (
              <span className={styles.rowLead} data-muted="">
                <NotesIcon name="doc" />
              </span>
            )
          }
          title={<Bidi>{noteDisplayTitle(n)}</Bidi>}
          subtitle={n.title.trim() && n.body.trim() ? <Bidi>{snippet(n.body)}</Bidi> : n.isDecision ? 'قرار' : undefined}
          chevron
          onClick={() => navigate(`/me/notes/${encodeURIComponent(n.id)}`)}
        />
      ))}
    </InsetGroupedList>
  )
}
