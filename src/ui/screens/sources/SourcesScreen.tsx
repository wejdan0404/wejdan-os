/**
 * المصادر — the files she imported, what is waiting for her decision, and files we
 * could not read (name + reason). Files are read on her device; nothing goes to
 * today's plan without her approval.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  batchSummary, needsReview, openImportBatches, type ImportBatch, type Source,
} from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import type { MenuItem } from '../../components/ContextMenu'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { Sheet } from '../../components/Sheet'
import { StarMark } from '../../components/StarMark'
import { useToast } from '../../components/Toast'
import { Icon } from '../../icons/Icon'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import {
  Badge, FileName, KIND_ICON, Tile, files, items, parseIso, readPicked, shortDay, useFilePicker,
} from './sourcesKit'
import styles from './sources.module.css'

export default function SourcesScreen() {
  const s = useLife()
  const store = useStore()
  const now = useToday()
  const toast = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [help, setHelp] = useState<Source | null>(null)
  // «بعدين» on the review hero: tucks it away for this visit (the files keep their «للمراجعة» badge)
  const [reviewLater, setReviewLater] = useState(false)
  const [discard, setDiscard] = useState<ImportBatch | null>(null)

  const pending = useMemo(() => needsReview(s), [s])
  const open = useMemo(() => openImportBatches(s), [s])
  const batchOf = useMemo(() => new Map(s.importBatches.map((b) => [b.sourceId, b])), [s.importBatches])

  const pick = useFilePicker(async (file) => {
    setBusy(true)
    try {
      const read = await readPicked(file)
      if ('error' in read) {
        toast({ message: read.error })
        return
      }
      const res = await store.startImport(read.name, read.text)
      if (res.ok) navigate(`/me/sources/review/${encodeURIComponent(res.batch.id)}`)
      else toast({ message: res.error })
    } finally {
      setBusy(false)
    }
  })

  const conflicts = pending.filter((p) => p.candidate.status === 'conflict').length
  const missing = pending.filter((p) => p.candidate.status === 'missing').length
  const dupes = pending.filter((p) => p.candidate.status !== 'conflict' && p.candidate.matches.some((m) => m.relation === 'duplicate')).length
  const reasons = [
    conflicts > 0 ? `${conflicts === 1 ? 'تعارض واحد' : conflicts === 2 ? 'تعارضين' : `${conflicts} تعارضات`}` : null,
    missing > 0 ? `${missing === 1 ? 'عنصر ناقص' : missing === 2 ? 'عنصرين ناقصين' : `${missing} عناصر ناقصة`}` : null,
    dupes > 0 ? `${dupes === 1 ? 'مكرر واحد' : dupes === 2 ? 'مكررين' : `${dupes} مكررات`}` : null,
  ].filter(Boolean)
  const batchesWithPending = new Set(pending.map((p) => p.batch.id)).size
  const firstOpen = pending[0]?.batch ?? open[0] ?? null

  // a failed or discarded file can leave the list (with undo) — QA area 5 #20
  const removeSrc = (src: Source) =>
    void store.removeSource(src.id).then((t) =>
      toast(t ? { message: 'انشالت من القائمة', actionLabel: 'تراجع', onAction: () => void store.undoDelete(t.token) } : { message: 'ما تنشال وهي تنتظر مراجعتك' }),
    )

  const rowFor = (src: Source) => {
    const b = batchOf.get(src.id) ?? null
    const d = parseIso(src.importedAt)
    const when = d ? shortDay(d, now) : ''
    const goReview = b ? () => navigate(`/me/sources/review/${encodeURIComponent(b.id)}`) : undefined

    if (src.status === 'failed') {
      return (
        <ListRow
          key={src.id}
          leading={<Tile icon="close" tone="error" />}
          title={<FileName name={src.fileName} />}
          subtitle={<span className={styles.errorText}>{src.error ?? 'ما قدرنا نقراه.'}</span>}
          trailing={<span className={styles.decision}>وش أسوي؟</span>}
          onClick={() => setHelp(src)}
          chevron
          menu={[
            { key: 'help', label: 'وش أسوي؟', icon: <Icon name="help" size={18} />, onSelect: () => setHelp(src) },
            { key: 'remove', label: 'شيليها من القائمة', icon: <Icon name="trash" size={18} />, destructive: true, onSelect: () => removeSrc(src) },
          ]}
          trailingActions={[{ key: 'remove', label: 'شيليها', icon: <Icon name="trash" size={20} />, tone: 'destructive', onAction: () => removeSrc(src) }]}
        />
      )
    }

    let trailing = null
    if (src.status === 'review' && b) {
      const sum = batchSummary(b)
      trailing = sum.pending > 0 ? <Badge tone="warn">{`${sum.pending} للمراجعة`}</Badge> : <Badge tone="accent">جاهزة تنضاف</Badge>
    } else if (src.status === 'committed') {
      trailing = src.addedCount >= src.itemCount ? <Badge tone="success">انضافت كلها</Badge> : <Badge tone="success">{`انضاف ${src.addedCount}`}</Badge>
    } else if (src.status === 'discarded') {
      trailing = <Badge tone="muted">تجاهلتيها</Badge>
    }

    const menu: MenuItem[] | undefined =
      b && b.committedAt == null
        ? [
            { key: 'review', label: 'راجعيها', icon: <Icon name="review" size={18} />, onSelect: () => goReview?.() },
            { key: 'discard', label: 'تجاهلي الملف كله', icon: <Icon name="trash" size={18} />, destructive: true, onSelect: () => setDiscard(b) },
          ]
        : src.status === 'discarded'
          ? [{ key: 'remove', label: 'شيليها من القائمة', icon: <Icon name="trash" size={18} />, destructive: true, onSelect: () => removeSrc(src) }]
          : undefined

    return (
      <ListRow
        key={src.id}
        leading={<Tile icon={KIND_ICON[src.kind]} />}
        title={<FileName name={src.fileName} />}
        subtitle={<Bidi>{[when, items(src.itemCount)].filter(Boolean).join(' · ')}</Bidi>}
        trailing={trailing}
        onClick={goReview}
        chevron={!!goReview}
        menu={menu}
      />
    )
  }

  const importButton = (
    <Button size="regular" icon={<Icon name="import" size={18} />} onClick={pick.open} disabled={busy} aria-label="استوردي ملف">
      {busy ? 'نقراه…' : 'استوردي ملف'}
    </Button>
  )

  return (
    <Screen
      title="المصادر"
      backLabel="أنا"
      subtitle="الملفات اللي استوردتيها، ومن وين جا كل شي في تطبيقك."
      ground="tinted"
      titleEnd={s.sources.length > 0 ? importButton : undefined}
    >
      {pick.input}
      <div className={styles.stack}>
        {pending.length > 0 && firstOpen && !reviewLater && (
          <section className={styles.hero} aria-labelledby="needs-review">
            <span className={styles.glow} aria-hidden="true" />
            <span className={styles.eyebrow}>
              <Icon name="alert" size={16} />
              يحتاج مراجعة
            </span>
            <h2 id="needs-review" className={styles.heroTitle}>
              <Bidi>{`${items(pending.length)} تنتظر قرارك`}</Bidi>
            </h2>
            <p className={styles.heroBody}>
              <Bidi>
                {[reasons.length > 0 ? reasons.join('، ') : 'اقتراحات تحتاج نظرة سريعة', batchesWithPending > 1 ? `من ${files(batchesWithPending)}` : null]
                  .filter(Boolean)
                  .join(' — ')}
              </Bidi>
            </p>
            <div className={styles.heroActions}>
              <Button onClick={() => navigate(`/me/sources/review/${encodeURIComponent(firstOpen.id)}`)}>راجعيها</Button>
              <Button variant="plain" onClick={() => setReviewLater(true)}>
                بعدين
              </Button>
            </div>
            <p className={styles.heroFoot}>
              <StarMark size={12} />
              ولا شي يروح ليومك إلا بموافقتك.
            </p>
          </section>
        )}

        {s.sources.length === 0 ? (
          <EmptyState
            title="ما استوردتي شي للحين"
            body="عندك قائمة مهام أو ملاحظات في ملف؟ اختاريه (JSON أو CSV أو نص) ونعرض لك كل بند قبل ما ينضاف — وتقررين أنتِ."
            action={importButton}
          />
        ) : (
          <>
            <InsetGroupedList header="الملفات" headerAction={<span className={styles.decision} style={{ color: 'var(--text-muted)' }}><Bidi>{files(s.sources.length)}</Bidi></span>}>
              {s.sources.map(rowFor)}
            </InsetGroupedList>
          </>
        )}

        <p className={styles.note}>
          <Icon name="lock" size={16} />
          الملفات تنقرا على جهازك — ما تنرفع لأي مكان، والملف الأصلي ما يتغيّر.
        </p>
      </div>

      <Sheet open={help != null} onClose={() => setHelp(null)} title="ما قدرنا نقرا الملف" detents={['medium']}>
        <div className={styles.sheetBody}>
          {help && (
            <p className={styles.heroBody}>
              <Bidi>{help.error ?? `«${help.fileName}» ما قدرنا نقراه.`}</Bidi>
            </p>
          )}
          <div className={styles.facts}>
            <span>اللي نقدر نقراه: ملف نص (TXT أو MD)، جدول CSV، أو JSON.</span>
            <span>لو عندك Word أو Excel: احفظيه كنص أو CSV من نفس البرنامج، وجربي مرة ثانية.</span>
          </div>
          <div className={styles.row2}>
            <Button
              onClick={() => {
                setHelp(null)
                pick.open()
              }}
            >
              اختاري ملف ثاني
            </Button>
            <Button variant="plain" onClick={() => setHelp(null)}>
              تمام
            </Button>
          </div>
        </div>
      </Sheet>

      <Sheet open={discard != null} onClose={() => setDiscard(null)} title="تتجاهلين الملف كله؟" detents={['medium']}>
        <div className={styles.sheetBody}>
          {discard && (
            <p className={styles.heroBody}>
              <Bidi>{`ولا بند من «${discard.fileName}» بينضاف. الملف يبقى بالقائمة كـ«تجاهلتيها»، وتقدرين تستوردينه من جديد متى ما بغيتي.`}</Bidi>
            </p>
          )}
          <div className={styles.row2}>
            <Button
              variant="secondary"
              onClick={() => {
                const b = discard
                setDiscard(null)
                if (b) void store.discardImport(b.id).then(() => toast({ message: 'تجاهلناه — ما انضاف شي' }))
              }}
            >
              إيه، تجاهليه
            </Button>
            <Button variant="plain" onClick={() => setDiscard(null)}>
              لا، خليه
            </Button>
          </div>
        </div>
      </Sheet>
    </Screen>
  )
}
