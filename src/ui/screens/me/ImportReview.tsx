import { useMemo, useState } from 'react'
import type { ExportJson, ImportPreview } from '../../../domain'
import { Button } from '../../components/Button'
import { SegmentedControl } from '../../components/SegmentedControl'
import { Switch } from '../../components/Switch'
import { Icon } from '../../icons/Icon'
import { fmtIso, num } from './meKit'
import styles from './me.module.css'

/** Arabic name of every exported box — the review never shows a raw key. */
export const BOX_AR: Record<string, string> = {
  domains: 'المجالات',
  seasons: 'المواسم',
  habits: 'العادات',
  routines: 'الروتينات',
  weeklyTasks: 'مهام الأسبوع',
  projects: 'المشاريع',
  goals: 'الأهداف',
  logs: 'سجل الإنجاز',
  dayPlans: 'خطط الأيام',
  energyChecks: 'تسجيلات الطاقة',
  strengthChecks: 'تقييمات قوة العادات',
  joyItems: 'المتعة والمكافآت',
  sparkTxns: 'حركات الشرارات',
  experiments: 'التجارب',
  vocabCards: 'بطاقات المفردات',
  mockTests: 'الاختبارات التجريبية',
  drivingSessions: 'جلسات القيادة',
  moneyEnvelopes: 'خطط المال',
  bills: 'الفواتير',
  bnplItems: 'الأقساط',
  wishItems: 'قائمة الأمنيات',
  adminDocs: 'الوثائق والتجديدات',
  fixedEvents: 'المواعيد الثابتة',
  nudgeRecords: 'سجل التذكيرات',
  errands: 'المشاوير',
  cycleEntries: 'سجل خاص',
  weeklyReviews: 'المراجعات الأسبوعية',
  tasks: 'المهام',
  inbox: 'الوارد',
  products: 'المنتجات',
  later: 'قائمة «بعدين»',
  notes: 'الملاحظات والقرارات',
  changelog: 'سجل التغييرات',
  sources: 'المصادر',
  importBatches: 'دفعات الاستيراد',
  provenance: 'مصدر كل عنصر',
}

const ID_KEY: Record<string, string> = { dayPlans: 'date', energyChecks: 'date' }
const SETTINGS = '__settings'

type Decision = 'replace' | 'keep' | 'merge'
type Rec = Record<string, unknown>

const idOf = (box: string, r: Rec) => String(r[ID_KEY[box] ?? 'id'] ?? '')

/** A readable line for one record, whatever its box. */
function labelOf(box: string, r: Rec): string {
  const pick = (v: unknown): string | null => {
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (v && typeof v === 'object') {
      const o = v as Rec
      if (typeof o.ar === 'string' && o.ar.trim()) return o.ar.trim()
      if (typeof o.en === 'string' && o.en.trim()) return o.en.trim()
    }
    return null
  }
  for (const k of ['titleAr', 'title', 'nameAr', 'name', 'text', 'termAr', 'term', 'front', 'label', 'note']) {
    const v = pick(r[k])
    if (v) return v.length > 60 ? `${v.slice(0, 58)}…` : v
  }
  const d = pick(r.date) ?? pick(r.createdAt) ?? pick(r.at)
  if (d) return fmtIso(d) || d
  return idOf(box, r) || 'سجل'
}

export interface ImportReviewProps {
  fileName: string
  data: unknown
  preview: ImportPreview
  /** Her data right now (export shape) — lets the review show what «استبدلي» would remove. */
  current?: ExportJson | null
  busy: boolean
  /** Builds the payload from her choices; `current` is today's export so kept boxes stay as they are. */
  onConfirm: (build: (current: ExportJson) => unknown) => void
  onCancel: () => void
  /**
   * Offer «ادمجي» per box: her current records stay and the file's new ones are added (hers win
   * on the same id). Used when moving the old version's data into an app she already uses.
   */
  allowMerge?: boolean
  /** Start every box the file fills on «ادمجي» and keep her settings (nothing is overwritten by default). */
  preferMerge?: boolean
}

/**
 * Import review (spec §11): every box that would change is listed in Arabic with counts, can be
 * expanded to its items, and is approved or skipped — per box, and per item inside a box.
 * Skipped boxes keep what's on her device; the automatic backup still runs first.
 */
export function ImportReview({ fileName, data, preview, current, busy, onConfirm, onCancel, allowMerge = false, preferMerge = false }: ImportReviewProps) {
  const file = data as ExportJson
  const boxes = useMemo(
    () =>
      Object.keys(BOX_AR).filter((b) => (preview.counts[b] ?? 0) > 0 || (preview.current[b] ?? 0) > 0),
    [preview],
  )
  const [decision, setDecision] = useState<Record<string, Decision>>(() => {
    const merging = allowMerge && preferMerge
    const d: Record<string, Decision> = { [SETTINGS]: merging ? 'keep' : 'replace' }
    // a box the file doesn't fill would only erase hers — default to keeping it
    for (const b of boxes) d[b] = (preview.counts[b] ?? 0) > 0 ? (merging ? 'merge' : 'replace') : 'keep'
    return d
  })
  const [excluded, setExcluded] = useState<Record<string, Set<string>>>({})
  const [open, setOpen] = useState<string | null>(null)

  const itemsOf = (b: string): Rec[] => {
    const list = file?.boxes?.[b]
    return Array.isArray(list) ? (list as Rec[]).filter((r) => idOf(b, r) !== '') : []
  }
  /** Her records in a box that the file doesn't have — «استبدلي» would remove these (QA area 5 #12). */
  const removedBy = (b: string): Rec[] => {
    const mine = current?.boxes?.[b]
    if (!Array.isArray(mine)) return []
    const inFile = new Set(itemsOf(b).map((r) => idOf(b, r)))
    return (mine as Rec[]).filter((r) => idOf(b, r) !== '' && !inFile.has(idOf(b, r)))
  }
  const toggleItem = (b: string, id: string, on: boolean) =>
    setExcluded((m) => {
      const set = new Set(m[b] ?? [])
      if (on) set.delete(id)
      else set.add(id)
      return { ...m, [b]: set }
    })

  const replacing = boxes.filter((b) => decision[b] === 'replace')
  const keeping = boxes.filter((b) => decision[b] === 'keep')
  const mergingBoxes = boxes.filter((b) => decision[b] === 'merge')
  const boxSegments = [
    ...(allowMerge ? [{ value: 'merge', label: 'ادمجي' }] : []),
    { value: 'replace', label: 'استبدلي' },
    { value: 'keep', label: 'خلّي اللي عندي' },
  ]

  const build = (current: ExportJson): unknown => {
    const out: ExportJson = { ...file, boxes: { ...(file.boxes ?? {}) }, meta: { ...(file.meta as Rec) } as ExportJson['meta'] }
    for (const b of boxes) {
      if (decision[b] === 'keep') out.boxes[b] = (current.boxes?.[b] ?? []) as ExportJson['boxes'][string]
      else if (decision[b] === 'merge') {
        const ex = excluded[b]
        const mine = ((current.boxes?.[b] ?? []) as Rec[]).filter((r) => idOf(b, r) !== '')
        const ids = new Set(mine.map((r) => idOf(b, r)))
        const incoming = itemsOf(b).filter((r) => !ex?.has(idOf(b, r)) && !ids.has(idOf(b, r)))
        out.boxes[b] = [...mine, ...incoming] as ExportJson['boxes'][string]
      } else {
        const ex = excluded[b]
        if (ex?.size) out.boxes[b] = itemsOf(b).filter((r) => !ex.has(idOf(b, r))) as ExportJson['boxes'][string]
      }
    }
    if (decision[SETTINGS] === 'keep') {
      const meta = out.meta as Rec
      meta.settings = (current.meta as Rec | undefined)?.settings
    }
    return out
  }

  return (
    <section className={`${styles.confirm} ${styles.pad}`} aria-labelledby="import-review">
      <p id="import-review" className={styles.confirmTitle}>
        راجعي «<bdi>{fileName}</bdi>» قبل ما يتغيّر شي
      </p>
      <p className={styles.lede}>
        {preview.exportedAt ? `النسخة من ${fmtIso(preview.exportedAt)}. ` : ''}
        {allowMerge
          ? 'اختاري لكل نوع: «ادمجي» يضيف الجديد ويخلّي اللي عندك، «استبدلي» ياخذ اللي بالملف، و«خلّي اللي عندي» ما يلمسه. قبل أي تغيير بناخذ نسخة احتياطية.'
          : 'اختاري لكل نوع: «استبدلي» ياخذ اللي بالملف، و«خلّي اللي عندي» ما يلمسه. قبل أي تغيير بناخذ نسخة احتياطية.'}
        {preview.skipped > 0 ? ` (${num(preview.skipped)} سجل بالملف بدون معرّف، بنتجاهله.)` : ''}
      </p>

      <ul className={styles.reviewList} role="list">
        {boxes.map((b) => {
          const items = itemsOf(b)
          const ex = excluded[b]
          const chosen = items.length - (ex?.size ?? 0)
          const isOpen = open === b
          const dec = decision[b]
          const gone = dec === 'replace' ? removedBy(b) : []
          return (
            <li key={b} className={styles.reviewBox}>
              <div className={styles.reviewHead}>
                <div className={styles.reviewName}>
                  <span className={styles.confirmTitle}>{BOX_AR[b]}</span>
                  <span className={styles.lede}>
                    بالملف <span className="num">{num(preview.counts[b] ?? 0)}</span> · عندك الحين{' '}
                    <span className="num">{num(preview.current[b] ?? 0)}</span>
                    {dec !== 'keep' && ex?.size ? (
                      <>
                        {' '}
                        · بتاخذين <span className="num">{num(chosen)}</span>
                      </>
                    ) : null}
                  </span>
                </div>
                {/* three choices get their own full row, so every type lines up the same */}
                <div style={allowMerge ? { flexBasis: '100%' } : undefined}>
                  <SegmentedControl
                    label={`${BOX_AR[b]}: وش نسوي؟`}
                    segments={boxSegments}
                    value={dec}
                    onChange={(v) => setDecision((d) => ({ ...d, [b]: v as Decision }))}
                  />
                </div>
              </div>
              {gone.length > 0 && (
                <div className={styles.reviewGone} role="note">
                  <span className={styles.reviewGoneTitle}>
                    <Icon name="trash" size={16} /> عندك وما هي بالملف — «استبدلي» يشيلها (وتبقى بالنسخة الاحتياطية):
                  </span>
                  <ul className={styles.reviewGoneList} role="list">
                    {gone.slice(0, 8).map((r) => (
                      <li key={idOf(b, r)}>
                        <bdi>{labelOf(b, r)}</bdi>
                      </li>
                    ))}
                    {gone.length > 8 && <li>و{num(gone.length - 8)} غيرها</li>}
                  </ul>
                </div>
              )}
              {dec !== 'keep' && items.length > 0 && (
                <button
                  type="button"
                  className={styles.reviewExpand}
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : b)}
                >
                  <span>{isOpen ? 'أخفي العناصر' : 'شوفي العناصر واختاري منها'}</span>
                  <Icon name={isOpen ? 'up' : 'down'} size={18} />
                </button>
              )}
              {dec !== 'keep' && isOpen && (
                <ul className={styles.reviewItems} role="list">
                  {items.map((r) => {
                    const id = idOf(b, r)
                    const on = !ex?.has(id)
                    const label = labelOf(b, r)
                    return (
                      <li key={id} className={styles.reviewItem}>
                        <bdi className={styles.reviewItemLabel}>{label}</bdi>
                        <Switch checked={on} onChange={(v) => toggleItem(b, id, v)} label={`خذي «${label}»`} />
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
        <li className={styles.reviewBox}>
          <div className={styles.reviewHead}>
            <div className={styles.reviewName}>
              <span className={styles.confirmTitle}>الإعدادات</span>
              <span className={styles.lede}>اسمك، الشكل، يوم الراتب، أوقاتك</span>
            </div>
            <div style={allowMerge ? { flexBasis: '100%' } : undefined}>
              <SegmentedControl
                label="الإعدادات: وش نسوي؟"
                segments={[
                  { value: 'replace', label: 'استبدلي' },
                  { value: 'keep', label: 'خلّي اللي عندي' },
                ]}
                value={decision[SETTINGS]}
                onChange={(v) => setDecision((d) => ({ ...d, [SETTINGS]: v as Decision }))}
              />
            </div>
          </div>
        </li>
      </ul>

      <p className={styles.lede} aria-live="polite">
        {replacing.length === 0 && mergingBoxes.length === 0 && decision[SETTINGS] === 'keep'
          ? 'ما اخترتي شي يتغيّر.'
          : [
              mergingBoxes.length ? `بينضاف لعندك: ${mergingBoxes.map((b) => BOX_AR[b]).join('، ')}.` : '',
              replacing.length || decision[SETTINGS] === 'replace'
                ? `بيتغيّر: ${[...replacing.map((b) => BOX_AR[b]), ...(decision[SETTINGS] === 'replace' ? ['الإعدادات'] : [])].join('، ')}.`
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
        {keeping.length > 0 ? ` يبقى زي ما هو: ${keeping.map((b) => BOX_AR[b]).join('، ')}.` : ''}
      </p>

      <div className={styles.actions}>
        <Button
          onClick={() => onConfirm(build)}
          disabled={busy || (replacing.length === 0 && mergingBoxes.length === 0 && decision[SETTINGS] === 'keep')}
        >
          {busy ? 'نستورد…' : 'اعتمدي اللي اخترتيه'}
        </Button>
        <Button variant="plain" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </section>
  )
}
