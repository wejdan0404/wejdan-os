import { useMemo, useState } from 'react'
import {
  EVIDENCE_STRENGTHS, canBecomeHabit, evidenceUrl, filterByStrength, habitFromAction, hasEvidenceHabit, normalizeArabic, strengthCounts, strengthLabel, stripAl, tokensOf,
  type Action, type EvidenceStrengthKey,
} from '../../../domain'
import { Bidi } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { useToast } from '../../components/Toast'
import { useDomainWake } from '../habits/DomainWakeSheet'
import { EmptyState } from '../../components/EmptyState'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { Sheet } from '../../components/Sheet'
import { StarMark } from '../../components/StarMark'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import { countLabel } from '../../lib/plural'
import styles from './me.module.css'

const GROUPS: { prefix: string; title: string }[] = [
  { prefix: 'BODY', title: 'الجسم والنوم' },
  { prefix: 'FOOD', title: 'الأكل والعناية' },
  { prefix: 'GROW', title: 'التعلّم والمسار' },
  { prefix: 'LIFE', title: 'المعاملات والبيت والمال' },
  { prefix: 'JOY', title: 'المتعة والراحة' },
  { prefix: 'ENG', title: 'كيف يشتغل التطبيق' },
]

const nameOf = (a: Action) => a.ar?.cardTitle ?? a.nameAr ?? a.nameEn
/** Women's-health actions stay hidden unless she turned the private module on. */
const isSensitive = (a: Action) => /women/i.test(a.area)

/** Arabic-aware match (same folding as the global search): every query word must appear in the name. */
export function evidenceMatches(a: Action, query: string): boolean {
  const q = tokensOf(query).map(stripAl)
  if (q.length === 0) return true
  const hay = ` ${normalizeArabic(`${nameOf(a)} ${a.nameAr ?? ''} ${a.nameEn}`)
    .split(' ')
    .map(stripAl)
    .join(' ')} `
  return q.every((t) => hay.includes(t))
}

export default function EvidenceScreen() {
  const s = useLife()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Action | null>(null)
  const [strength, setStrength] = useState<EvidenceStrengthKey | null>(null)
  const showSensitive = s.settings.cycleModule
  const store = useStore()
  const toast = useToast()
  const today = useToday()
  const { wake, sheet: wakeSheet } = useDomainWake()

  const matching = useMemo(() => {
    return s.actions.filter((a) => (showSensitive || !isSensitive(a)) && evidenceMatches(a, q))
  }, [s.actions, q, showSensitive])
  const counts = useMemo(() => strengthCounts(matching), [matching])
  const visible = useMemo(() => filterByStrength(matching, strength), [matching, strength])

  /** «أضيفيها لعاداتي»: one habit from the entry's own texts, through the normal habit action (undoable). */
  const addToHabits = async (a: Action, force = false) => {
    const h = habitFromAction(a, today)
    if (!h || hasEvidenceHabit(store.getSnapshot().habits, a)) return
    const v = await store.upsertHabit(h, force)
    if (v.length > 0 && !force) {
      toast({ message: 'عندك عادات أساسية كفاية الحين — ريّحي وحدة أول، أو أضيفيها على أي حال.', actionLabel: 'أضيفيها', onAction: () => void addToHabits(a, true) })
      return
    }
    setOpen(null)
    const o = await wake([h])
    toast({
      message:
        o === 'kept' ? 'انضافت لعاداتك — مجالها مرتاح، غيّريه من «مجالاتك» وقت ما تبين' : o === 'paused' ? 'انضافت لعاداتك موقّفة — شغّليها وقت ما يخف يومك' : 'انضافت لعاداتك — تطلع لك باقتراحات اليوم',
      actionLabel: 'تراجع',
      onAction: () => void store.deleteHabit(h.id),
    })
  }

  return (
    <Screen title="الأدلة والمصادر" compactTitle="الأدلة" backLabel="أنا">
      <div className={styles.pad} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p className={styles.lede}>كل عادة بالتطبيق لها سبب ومصدر. النجمة تعني إن المصدر متحقق منه.</p>
        <input
          className={styles.input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="دوّري: مشي، نوم، IELTS…"
          aria-label="بحث في الأدلة"
        />
        <div className={styles.chips} role="group" aria-label="قوة الدليل">
          <Chip selected={strength == null} onClick={() => setStrength(null)}>
            الكل <bdi>{matching.length}</bdi>
          </Chip>
          {EVIDENCE_STRENGTHS.map((st) => (
            <Chip key={st.key} selected={strength === st.key} onClick={() => setStrength(strength === st.key ? null : st.key)}>
              {st.ar} <bdi>{counts[st.key]}</bdi>
            </Chip>
          ))}
        </div>
        <p className={styles.lede}>الترتيب من الأقوى. الإرشادات تصدر من جهات رسمية أو مهنية، والمراجعة المنهجية تجمع دراسات كثيرة، والتجربة دراسة وحدة مضبوطة.</p>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={matching.length === 0 ? 'ما لقينا شي بهالاسم' : 'ما فيه شي بهالقوة'}
          body={matching.length === 0 ? 'جربي كلمة ثانية أو أقصر.' : 'جربي قوة ثانية أو اختاري «الكل».'}
          action={strength != null ? <Button variant="secondary" onClick={() => setStrength(null)}>الكل</Button> : undefined}
        />
      ) : (
        GROUPS.map((g) => {
          const xs = visible.filter((a) => a.actionId.startsWith(g.prefix + '-'))
          if (!xs.length) return null
          return (
            <InsetGroupedList key={g.prefix} header={g.title}>
              {xs.map((a) => (
                <ListRow
                  key={a.actionId}
                  leading={a.sources.some((x) => x.verifiedBy) ? <StarMark size={12} color="var(--brand-primary)" label="مصدر متحقق منه" /> : <span style={{ inlineSize: 12 }} />}
                  title={<Bidi>{nameOf(a)}</Bidi>}
                  subtitle={[strengthLabel(a), a.sources.length === 1 ? 'مصدر واحد' : a.sources.length === 2 ? 'مصدرين' : countLabel(a.sources.length, { one: 'مصدر', two: 'مصدرين', few: 'مصادر', many: 'مصدر' })].filter(Boolean).join(' · ')}
                  chevron
                  onClick={() => setOpen(a)}
                />
              ))}
            </InsetGroupedList>
          )
        })
      )}

      <Sheet open={open != null} onClose={() => setOpen(null)} title={open ? nameOf(open) : ''} detents={['large']}>
        {open && (
          <div className={styles.detailBlock}>
            {strengthLabel(open) && (
              <p className={styles.detailText}>
                قوة الدليل: <strong>{strengthLabel(open)}</strong>
              </p>
            )}
            {canBecomeHabit(open) && (
              <Button block size="large" disabled={hasEvidenceHabit(s.habits, open)} onClick={() => void addToHabits(open)}>
                {hasEvidenceHabit(s.habits, open) ? 'موجودة بعاداتك' : 'أضيفيها لعاداتي'}
              </Button>
            )}
            {open.ar?.what && (
              <>
                <p className={styles.detailHead}>وش هي؟</p>
                <p className={styles.detailText}>
                  <Bidi>{open.ar.what}</Bidi>
                </p>
              </>
            )}
            {open.ar?.why && (
              <>
                <p className={styles.detailHead}>ليش؟</p>
                <p className={styles.detailText}>
                  <Bidi>{open.ar.why}</Bidi>
                </p>
              </>
            )}
            {open.ar?.dose && (
              <>
                <p className={styles.detailHead}>الكمية</p>
                <p className={styles.detailText}>
                  <Bidi>{open.ar.dose}</Bidi>
                </p>
              </>
            )}
            {open.ar?.minimum && (
              <>
                <p className={styles.detailHead}>أصغر نسخة تنحسب</p>
                <p className={styles.detailText}>
                  <Bidi>{open.ar.minimum}</Bidi>
                </p>
              </>
            )}
            {open.ar?.safety && (
              <>
                <p className={styles.detailHead}>انتبهي</p>
                <p className={styles.detailText}>
                  <Bidi>{open.ar.safety}</Bidi>
                </p>
              </>
            )}
            <p className={styles.detailHead}>المصادر</p>
            <InsetGroupedList flush>
              {open.sources.map((src) => (
                <ListRow
                  key={`${src.type}_${src.id}`}
                  leading={src.verifiedBy ? <StarMark size={12} color="var(--brand-primary)" label="متحقق منه" /> : undefined}
                  title={
                    <a className={styles.sourceLink} href={evidenceUrl(src)} target="_blank" rel="noreferrer noopener">
                      <bdi dir="ltr">{src.title}</bdi>
                    </a>
                  }
                  subtitle={
                    <bdi dir="ltr">
                      {src.type} {src.year ?? ''}
                    </bdi>
                  }
                />
              ))}
            </InsetGroupedList>
          </div>
        )}
      </Sheet>
      {wakeSheet}
    </Screen>
  )
}
