import { useState, type ReactNode } from 'react'
import { Bidi, MetaLine } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { CheckCircle } from '../../components/CheckCircle'
import { Chip } from '../../components/Chip'
import { EmptyState } from '../../components/EmptyState'
import { EnergySegmented, type Energy } from '../../components/EnergySegmented'
import { HeroNextStep } from '../../components/HeroNextStep'
import { InboxItem, type InboxType } from '../../components/InboxItem'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { MorphCard } from '../../components/MorphCard'
import { PaydayCard } from '../../components/PaydayCard'
import { PostponeSheet } from '../../components/PostponeSheet'
import { ProductStep } from '../../components/ProductStep'
import { ProgressArc } from '../../components/ProgressArc'
import { Screen } from '../../components/Screen'
import { SectionHeader } from '../../components/SectionHeader'
import { SegmentedControl } from '../../components/SegmentedControl'
import { Sheet } from '../../components/Sheet'
import { SkeletonRows } from '../../components/Skeleton'
import { StarDottedLine } from '../../components/StarDottedLine'
import { StarMark } from '../../components/StarMark'
import { TabBar } from '../../components/TabBar'
import { useToast } from '../../components/Toast'
import { WMark } from '../../components/WMark'
import { Icon } from '../../icons/Icon'
import styles from './KitScreen.module.css'

function Both({ title, children, flush }: { title: string; children: (theme: 'light' | 'dark') => ReactNode; flush?: boolean }) {
  return (
    <section className={styles.block} aria-label={title}>
      <h2 className={styles.blockTitle}>{title}</h2>
      <div className={styles.pair}>
        {(['light', 'dark'] as const).map((t) => (
          <div key={t} data-theme={t} className={styles.panel} data-flush={flush || undefined}>
            <span className={styles.tag}>{t === 'light' ? 'فاتح' : 'داكن'}</span>
            {children(t)}
          </div>
        ))}
      </div>
    </section>
  )
}

const SWATCHES = ['--surface-default', '--surface-subtle', '--surface-elevated', '--text-primary', '--text-secondary', '--text-muted', '--text-accent', '--border-subtle', '--brand-primary', '--action-default', '--glow-accent', '--success', '--warning', '--error']

export default function KitScreen() {
  const toast = useToast()
  const [checked, setChecked] = useState(true)
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a')
  const [energy, setEnergy] = useState<Energy>('medium')
  const [sheet, setSheet] = useState(false)
  const [postpone, setPostpone] = useState(false)
  const [inboxType, setInboxType] = useState<InboxType>('idea')
  const [arc, setArc] = useState(0.6)

  return (
    <Screen title="مكوّنات الواجهة" backLabel="أنا">
      <div className={styles.toolbar}>
        <Button variant="secondary" onClick={() => setSheet(true)}>افتحي ورقة</Button>
        <Button variant="secondary" onClick={() => setPostpone(true)}>بعدين…</Button>
        <Button variant="secondary" onClick={() => toast({ message: 'انحذفت «قراءة»', actionLabel: 'تراجع', onAction: () => {} })}>
          تنبيه مع تراجع
        </Button>
      </div>

      <Both title="الهوية: العلامة والنجمة">
        {() => (
          <div className={styles.row}>
            <WMark size={48} />
            <WMark size={32} />
            <StarMark size={20} color="var(--brand-primary)" glow label="نجمة البطل" />
            <StarMark size={12} color="var(--brand-primary)" />
          </div>
        )}
      </Both>

      <Both title="الألوان">
        {() => (
          <div className={styles.swatches}>
            {SWATCHES.map((v) => (
              <div key={v} className={styles.swatch}>
                <span style={{ background: `var(${v})` }} />
                <code dir="ltr">{v.replace('--', '')}</code>
              </div>
            ))}
          </div>
        )}
      </Both>

      <Both title="الخطوط">
        {() => (
          <div className={styles.type}>
            <p style={{ font: 'var(--type-display)' }}>صباح الخير</p>
            <p style={{ font: 'var(--type-h1)' }}>خطوتك الجاية</p>
            <p style={{ font: 'var(--type-title2)' }}>عنوان القسم</p>
            <p style={{ font: 'var(--type-headline)' }}>عنوان رئيسي</p>
            <p style={{ font: 'var(--type-body)' }}>نص عادي يقرأ براحة، والأرقام <span className="num">06:30</span> بخط لاتيني.</p>
            <p style={{ font: 'var(--type-footnote)', color: 'var(--text-muted)' }}>
              <MetaLine parts={['IELTS', 'الصبح', '06:30', '45 د']} />
            </p>
            <p style={{ font: 'var(--type-caption)' }}>
              <Bidi>جدّدي الهوية من Absher أو my.gov.sa خلال 3 أيام</Bidi>
            </p>
          </div>
        )}
      </Both>

      <Both title="الأزرار والوسوم">
        {() => (
          <div className={styles.stack}>
            <div className={styles.row}>
              <Button>ابدئي</Button>
              <Button variant="secondary">بعدين</Button>
              <Button variant="plain">تخطي</Button>
              <Button disabled>غير متاح</Button>
            </div>
            <div className={styles.row}>
              <Chip>الصبح</Chip>
              <Chip tone="accent">IELTS</Chip>
              <Chip tone="success" icon={<Icon name="check" size={14} />}>تم</Chip>
              <Chip selected onClick={() => {}}>مختار</Chip>
            </div>
          </div>
        )}
      </Both>

      <Both title="التحكم">
        {() => (
          <div className={styles.stack}>
            <SegmentedControl label="تجربة" segments={[{ value: 'a', label: 'الصبح' }, { value: 'b', label: 'المسا' }, { value: 'c', label: 'أسبوعي' }]} value={seg} onChange={setSeg} />
            <EnergySegmented value={energy} onChange={setEnergy} />
            <div className={styles.row}>
              <CheckCircle checked={checked} onChange={setChecked} label="مثال" />
              <CheckCircle checked={!checked} onChange={(v) => setChecked(!v)} label="مثال ٢" />
              <ProgressArc value={arc} size={64} label="تقدّم" />
              <Button variant="plain" onClick={() => setArc(arc >= 1 ? 0.2 : Math.min(1, arc + 0.2))}>
                زيدي
              </Button>
              <ProgressArc value={1} size={64} label="مكتمل" />
            </div>
            <StarDottedLine total={6} done={3} />
          </div>
        )}
      </Both>

      <Both title="القوائم: اسحبي واضغطي مطوّل" flush>
        {() => (
          <InsetGroupedList header="لليوم" flush>
            <ListRow
              leading={<CheckCircle checked={false} onChange={() => {}} label="قراءة" />}
              title="قراءة 10 صفحات"
              subtitle={<MetaLine parts={['بعد المغرب', '20 د']} />}
              leadingActions={[{ key: 'done', label: 'إنجاز', icon: <Icon name="check" size={20} />, onAction: () => toast({ message: 'انحسبت لك' }) }]}
              trailingActions={[
                { key: 'later', label: 'بعدين', tone: 'neutral', icon: <Icon name="later" size={20} />, onAction: () => setPostpone(true) },
                { key: 'del', label: 'حذف', tone: 'destructive', icon: <Icon name="trash" size={20} />, onAction: () => toast({ message: 'انحذفت', actionLabel: 'تراجع', onAction: () => {} }) },
              ]}
              menu={[
                { key: 'done', label: 'إنجاز', onSelect: () => {} },
                { key: 'later', label: 'بعدين…', onSelect: () => setPostpone(true) },
                { key: 'inbox', label: 'رجّعيها للوارد', onSelect: () => {} },
              ]}
            />
            <ListRow leading={<Icon name="settings" size={22} />} title="الإعدادات" trailing="تلقائي" chevron onClick={() => {}} />
            <InboxItem title="فكرة بوست عن IELTS" type={inboxType} addedLabel="أمس" onTypeChange={setInboxType} onSchedule={() => {}} onArchive={() => {}} onDelete={() => {}} />
            <ProductStep order={1} name="واقي شمس SPF 30+" category="بشرة" slot="am" done={false} onToggle={() => {}} />
          </InsetGroupedList>
        )}
      </Both>

      <Both title="البطاقات" flush>
        {(t) => (
          <div className={styles.stack}>
            <HeroNextStep title="مشي هادي" meta={<MetaLine parts={['بعد العصر', '20 د']} />} why="نسخة صغيرة تكفي اليوم." />
            <PaydayCard daysLeft={0} onPlan={() => {}} />
            <PaydayCard daysLeft={6} />
            <SectionHeader title="روتين الصبح" />
            <div style={{ marginInline: 'var(--page-margin)' }}>
              <MorphCard id={`kit-${t}`} eyebrow="مشروع" title="اختبار تشخيصي" preview="اضغطي — البطاقة تكبر وتصير صفحة" detail={<p>نفس البطاقة كبرت (layoutId). اسحبي لتحت أو اضغطي إغلاق.</p>} />
            </div>
          </div>
        )}
      </Both>

      <Both title="الحالات" flush>
        {() => (
          <div className={styles.stack}>
            <EmptyState title="يومك فاضي" body="ما فيه شي لازم. أضيفي شي لو حبيتي." action={<Button variant="secondary">أضيفي شي</Button>} />
            <SkeletonRows rows={2} />
          </div>
        )}
      </Both>

      <Both title="شريط التبويب" flush>
        {() => (
          <div className={styles.tabbarDemo}>
            <TabBar active="today" onSelect={() => {}} />
          </div>
        )}
      </Both>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="ورقة سفلية">
        <p style={{ font: 'var(--type-body)', color: 'var(--text-secondary)' }}>اسحبي المقبض لفوق عشان تكبر، ولتحت عشان تصغر أو تقفل.</p>
        <div style={{ height: 600 }} />
      </Sheet>
      <PostponeSheet open={postpone} itemTitle="قراءة 10 صفحات" onClose={() => setPostpone(false)} onChoose={(c) => toast({ message: c.kind === 'inbox' ? 'رجعت للوارد' : 'راحت لـ«بعدين»' })} />
    </Screen>
  )
}
