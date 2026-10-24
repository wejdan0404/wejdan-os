import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { INBOX_TYPES, type InboxType } from '../../components/InboxItem'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { Icon } from '../../icons/Icon'
import { useStore } from '../../state/LifeStore'
import { isolate } from './lib'
import styles from './QuickAddSheet.module.css'

const KINDS: InboxType[] = ['task', 'idea', 'note', 'link']

/** Title-only capture → الوارد. Details can wait; nothing lands on Today by itself. */
export function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [kind, setKind] = useState<InboxType>('task')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const store = useStore()

  useEffect(() => {
    if (!open) return
    setError(null)
    const t = window.setTimeout(() => input.current?.focus(), 320)
    return () => window.clearTimeout(t)
  }, [open])

  const reset = () => {
    setTitle('')
    setUrl('')
    setKind('task')
  }

  const submit = async () => {
    const t = title.trim()
    if (!t || saving) return
    setSaving(true)
    setError(null)
    try {
      const item = await store.quickAdd(t, kind, kind === 'link' && url.trim() ? { url: url.trim() } : {})
      toast({
        message: `انحفظت في الوارد: ${isolate(t)}`,
        actionLabel: 'تراجع',
        onAction: () => void store.deleteInbox(item.id),
      })
      reset()
      onClose()
    } catch {
      setError('ما قدرنا نحفظها. جرّبي مرة ثانية.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="أضيفي بسرعة" detents={['medium', 'large']}>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <label htmlFor="qa-title" className="visually-hidden">
          العنوان
        </label>
        <input
          ref={input}
          id="qa-title"
          className={styles.input}
          placeholder="وش في بالك؟"
          value={title}
          autoComplete="off"
          enterKeyHint="done"
          dir="auto"
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className={styles.kinds} role="group" aria-label="النوع">
          {KINDS.map((k) => (
            <Chip key={k} selected={kind === k} tone={kind === k ? 'accent' : 'neutral'} icon={<Icon name={INBOX_TYPES[k].icon} size={16} />} onClick={() => setKind(k)}>
              {INBOX_TYPES[k].label}
            </Chip>
          ))}
        </div>
        {kind === 'link' && (
          <>
            <label htmlFor="qa-url" className="visually-hidden">
              الرابط
            </label>
            <input
              id="qa-url"
              className={styles.input}
              placeholder="https://"
              value={url}
              inputMode="url"
              autoComplete="off"
              dir="ltr"
              onChange={(e) => setUrl(e.target.value)}
            />
          </>
        )}
        <p className={styles.hint}>تنحفظ في الوارد، وترتّبينها وقت ما تبين.</p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <Button type="submit" block size="large" disabled={!title.trim() || saving}>
          {saving ? 'نحفظ…' : 'احفظيها'}
        </Button>
      </form>
    </Sheet>
  )
}
