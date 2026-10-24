import { Icon, type IconName } from '../icons/Icon'
import { Bidi } from './Bidi'
import { ListRow } from './ListRow'

export type InboxType = 'task' | 'idea' | 'note' | 'link'

export const INBOX_TYPES: Record<InboxType, { label: string; icon: IconName }> = {
  task: { label: 'مهمة', icon: 'check' },
  idea: { label: 'فكرة', icon: 'drop' },
  note: { label: 'ملاحظة', icon: 'book' },
  link: { label: 'رابط', icon: 'path' },
}

export interface InboxItemProps {
  title: string
  type: InboxType
  addedLabel?: string
  onTypeChange: (t: InboxType) => void
  onSchedule: () => void
  onArchive: () => void
  onDelete: () => void
}

/** Inbox row: swipe to plan/archive/delete; long-press to turn it into another type. */
export function InboxItem({ title, type, addedLabel, onTypeChange, onSchedule, onArchive, onDelete }: InboxItemProps) {
  const t = INBOX_TYPES[type]
  return (
    <ListRow
      leading={<Icon name={t.icon} size={20} />}
      title={<Bidi>{title}</Bidi>}
      subtitle={addedLabel ? `${t.label} · ${addedLabel}` : t.label}
      leadingActions={[{ key: 'plan', label: 'لليوم', tone: 'accent', icon: <Icon name="today" size={20} />, onAction: onSchedule }]}
      trailingActions={[
        { key: 'archive', label: 'أرشفي', tone: 'neutral', onAction: onArchive },
        { key: 'delete', label: 'احذفي', tone: 'destructive', icon: <Icon name="trash" size={20} />, onAction: onDelete },
      ]}
      menu={[
        ...(Object.keys(INBOX_TYPES) as InboxType[])
          .filter((k) => k !== type)
          .map((k) => ({ key: k, label: `حوّليها ${INBOX_TYPES[k].label}`, icon: <Icon name={INBOX_TYPES[k].icon} size={20} />, onSelect: () => onTypeChange(k) })),
        { key: 'archive', label: 'أرشفة', onSelect: onArchive },
        { key: 'delete', label: 'حذف', destructive: true, icon: <Icon name="trash" size={20} />, onSelect: onDelete },
      ]}
    />
  )
}
