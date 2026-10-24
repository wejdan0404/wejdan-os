import type { PlanItem, TaskItem } from '../../../domain'
import { Bidi, MetaLine } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Sheet } from '../../components/Sheet'
import { Icon } from '../../icons/Icon'
import { metaParts } from './lib'
import styles from './Today.module.css'

/** «بعدين» — everything she parked. Nothing here is lost or moved without her. */
export function LaterSheet({
  open,
  onClose,
  items,
  tasks,
  onRestore,
  onDrop,
  onPlanTask,
}: {
  open: boolean
  onClose: () => void
  items: PlanItem[]
  tasks: TaskItem[]
  onRestore: (i: PlanItem) => void
  onDrop: (i: PlanItem) => void
  onPlanTask: (t: TaskItem) => void
}) {
  const empty = items.length === 0 && tasks.length === 0
  return (
    <Sheet open={open} onClose={onClose} title="بعدين" detents={['medium', 'large']}>
      <div className={styles.sheetBody}>
        {empty ? (
          <p className={styles.sheetEmpty}>ما فيه شي مؤجّل. اللي تأجلينه يجي هنا ويستناك — ما يضيع.</p>
        ) : (
          <InsetGroupedList footer="رجّعيها ليومك وقت ما يناسبك.">
            {items.map((it) => (
              <ListRow
                key={it.id}
                leading={<Icon name="later" size={20} />}
                title={<Bidi>{it.title.ar}</Bidi>}
                subtitle={<MetaLine parts={metaParts(it)} />}
                trailing={
                  <Button variant="plain" onClick={() => onRestore(it)} aria-label={`رجّعي ${it.title.ar} لليوم`}>
                    لليوم
                  </Button>
                }
                trailingActions={[{ key: 'drop', label: 'شيليها', tone: 'destructive', icon: <Icon name="trash" size={20} />, onAction: () => onDrop(it) }]}
                menu={[
                  { key: 'today', label: 'رجّعيها لليوم', icon: <Icon name="today" size={20} />, onSelect: () => onRestore(it) },
                  { key: 'drop', label: 'شيليها', destructive: true, icon: <Icon name="trash" size={20} />, onSelect: () => onDrop(it) },
                ]}
              />
            ))}
            {tasks.map((t) => (
              <ListRow
                key={t.id}
                leading={<Icon name="check" size={20} />}
                title={<Bidi>{t.title}</Bidi>}
                subtitle="مهمة"
                trailing={
                  <Button variant="plain" onClick={() => onPlanTask(t)} aria-label={`خطّطي ${t.title} لليوم`}>
                    لليوم
                  </Button>
                }
              />
            ))}
          </InsetGroupedList>
        )}
      </div>
    </Sheet>
  )
}
