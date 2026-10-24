import { useMemo, useState } from 'react'
import { useStableNavigate } from '../../shell/navigate'
import { currentBudgetCycle, dayKey, inboxCount, seasonIsCurrent, startOfWeek } from '../../../domain'
import { Button } from '../../components/Button'
import { InsetGroupedList } from '../../components/InsetGroupedList'
import { ListRow } from '../../components/ListRow'
import { Screen } from '../../components/Screen'
import { StarMark } from '../../components/StarMark'
import { WMark } from '../../components/WMark'
import { Icon } from '../../icons/Icon'
import { useLife, useToday } from '../../state/LifeStore'
import { countLabel, NOUNS } from '../../lib/plural'
import { RowIcon } from './meKit'
import { MeAvatar, MeProfileGroup, useMeSubtitle } from '../../lock/MeProfile'
import { SearchButton } from '../notes/SearchSheet'
import styles from './me.module.css'

export default function MeScreen() {
  const navigate = useStableNavigate()
  const s = useLife()
  const today = useToday()

  const name = s.settings.displayName
  const season = s.seasons.find(seasonIsCurrent)
  const weekKey = dayKey(startOfWeek(today, s.settings.weekStartsOn))
  const reviewedThisWeek = s.weeklyReviews.some((r) => r.id === weekKey)
  const inbox = inboxCount(s)
  const activeProducts = useMemo(() => s.products.filter((p) => p.active && !p.placeholder).length, [s.products])
  const savedProducts = useMemo(() => s.products.filter((p) => !p.placeholder).length, [s.products])
  const cycle = currentBudgetCycle(s, today)

  const go = (to: string) => () => navigate(to)
  const subtitle = useMeSubtitle(season ? season.titleAr : 'كل شي هنا على جهازك بس')
  // «بعدين» on the review hero: rests the card for today only (a per-device convenience)
  const todayKey = dayKey(today)
  const [reviewRested, setReviewRested] = useState(() => {
    try {
      return localStorage.getItem('wejdan.reviewRest') === todayKey
    } catch {
      return false
    }
  })
  const restReview = () => {
    setReviewRested(true)
    try {
      localStorage.setItem('wejdan.reviewRest', todayKey)
    } catch {
      /* private mode: rests until the screen reloads */
    }
  }

  return (
    <Screen
      // one W on Me (boards): the avatar carries the mark and her name is the title
      title={name || 'أنا'}
      compactTitle="أنا"
      titleAccessory={
        <MeAvatar
          fallback={
            <span className={styles.avatar}>
              <WMark size={32} />
            </span>
          }
        />
      }
      subtitle={subtitle}
      ground="tinted"
      actions={
        <span className={styles.navGroup}>
          <SearchButton />
          <button type="button" className={styles.navBtn} aria-label="إعدادات" onClick={go("/me/settings")}>
            <Icon name="settings" size={20} />
          </button>
        </span>
      }
    >
      {!reviewRested && (
        <section className={styles.reviewCard} aria-labelledby="review-ready">
          <span className={styles.reviewEyebrow}>
            {reviewedThisWeek && <StarMark size={10} color="var(--brand-primary)" label="خلّصتيها" />}
            <span>
              المراجعة الأسبوعية · <span className="num">10</span> دقايق
            </span>
          </span>
          <h2 id="review-ready" className={styles.reviewTitle}>
            {reviewedThisWeek ? 'خلّصتي مراجعة هالأسبوع' : 'مراجعة الأسبوع جاهزة'}
          </h2>
          <p className={styles.lede}>
            {reviewedThisWeek
              ? 'تقدرين ترجعين لها وتعدّلين أولوياتك متى ما بغيتي.'
              : 'وش مشى، وش تبين تأجلين، ووش أهم شي للأسبوع الجاي.'}
          </p>
          <div className={styles.actions}>
            <Button onClick={go('/review')}>{reviewedThisWeek ? 'افتحيها' : 'ابدئي المراجعة'}</Button>
            <Button variant="plain" onClick={restReview}>
              بعدين
            </Button>
          </div>
        </section>
      )}

      <MeProfileGroup onProtect={go('/me/settings')} />

      <InsetGroupedList>
        <ListRow
          leading={<RowIcon name="inbox" />}
          title="الوارد"
          subtitle={inbox ? undefined : 'فاضي — كل شي مرتّب'}
          trailing={inbox ? <span className={styles.badge}>{inbox}</span> : undefined}
          chevron
          onClick={go('/me/inbox')}
        />
        <ListRow leading={<RowIcon name="book" />} title="ملاحظاتي وقراراتي" subtitle={s.notes.length ? undefined : 'اللي تبين ترجعين له'} chevron onClick={go('/me/notes')} />
        <ListRow
          leading={<RowIcon name="products" />}
          title="منتجاتي"
          subtitle={activeProducts ? (savedProducts > activeProducts ? `${activeProducts} في روتينك · ${savedProducts} محفوظ` : `${countLabel(activeProducts, NOUNS.product)} · صبح ومسا`) : 'أضيفي منتجاتك وتطلع لك بالروتين'}
          chevron
          onClick={go('/me/products')}
        />
        <ListRow
          leading={<RowIcon name="money" />}
          title="المال"
          subtitle={cycle.daysToPayday === 0 ? 'يوم الراتب اليوم' : `الراتب يوم ${s.settings.paydayDay}`}
          chevron
          onClick={go('/me/money')}
        />
        <ListRow leading={<RowIcon name="home" />} title="البيت والمعاملات" subtitle="وثائق وتجديدات" chevron onClick={go('/me/home')} />
      </InsetGroupedList>

      <InsetGroupedList header="أفهم نفسي">
        <ListRow leading={<RowIcon name="insights" />} title="الأنماط" subtitle="أوقاتك اللي تمشي فيها الأمور" chevron onClick={go('/me/insights')} />
        <ListRow leading={<RowIcon name="evidence" />} title="الأدلة والمصادر" subtitle="ليش كل عادة؟ ومن وين؟" chevron onClick={go('/me/evidence')} />
      </InsetGroupedList>

      <InsetGroupedList header="بياناتك">
        <ListRow leading={<RowIcon name="import" tone="ink" />} title="المصادر والاستيراد" subtitle="ملفات تضيفينها مع معاينة قبل الاعتماد" chevron onClick={go('/me/sources')} />
        <ListRow leading={<RowIcon name="restore" tone="ink" />} title="سجل التغييرات" subtitle="التعديلات والحذف — ترجّعينها بلمسة" chevron onClick={go('/me/changelog')} />
        <ListRow leading={<RowIcon name="data" tone="ink" />} title="البيانات" subtitle="تصدير · استعادة · نسخ احتياطية" chevron onClick={go('/me/settings?s=data')} />
        <ListRow leading={<RowIcon name="settings" tone="ink" />} title="الإعدادات" chevron onClick={go('/me/settings')} />
        <ListRow leading={<RowIcon name="help" tone="warn" />} title="المساعدة والسلامة" chevron onClick={go('/help')} />
      </InsetGroupedList>

      {import.meta.env.DEV && (
        <InsetGroupedList>
          <ListRow leading={<RowIcon name="review" tone="ink" />} title="مكوّنات الواجهة (للتطوير)" chevron onClick={go('/me/kit')} />
        </InsetGroupedList>
      )}
    </Screen>
  )
}
