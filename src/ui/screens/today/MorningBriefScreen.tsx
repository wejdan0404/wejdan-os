import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { EnergyMode, PlanItem } from '../../../domain'
import { Bidi, MetaLine } from '../../components/Bidi'
import { Button } from '../../components/Button'
import { WMark } from '../../components/WMark'
import { Icon } from '../../icons/Icon'
import { dur, ease, springs } from '../../motion'
import { useStack } from '../../shell/stack'
import { Glyph, type GlyphName } from './Glyph'
import { clock, dateLine, greetingFor, metaParts } from './lib'
import styles from './MorningBrief.module.css'
import { useTodayModel } from './useTodayModel'

/** Same order as Today's energy control: قليلة · متوسطة · زينة in RTL reading order. */
const ENERGY: { mode: EnergyMode; label: string; sub: string; icon: GlyphName }[] = [
  { mode: 'red', label: 'قليلة', sub: 'الأساس بس', icon: 'moon' },
  { mode: 'yellow', label: 'متوسطة', sub: 'نسخ أخف', icon: 'cloudSun' },
  { mode: 'green', label: 'زينة', sub: 'يوم عادي', icon: 'sun' },
]

const NUM = ['', 'وحدة', 'ثنتين', 'ثلاث', 'أربع', 'خمس', 'ست']
const word = (n: number) => NUM[n] ?? String(n)

/** موجز الصباح — energy first, then her day's shape in words, then suggestions she picks. */
export default function MorningBriefScreen() {
  const navigate = useNavigate()
  const stack = useStack()
  const reduce = useReducedMotion()
  const { s, store, today, view, actions, answered } = useTodayModel()
  const [showAll, setShowAll] = useState(false)
  const now = new Date()
  // board: «صباح الخير، وجدان» — her name when she set one
  const displayName = s.settings.displayName?.trim() ?? ''
  const greeting = greetingFor(now, displayName)

  const accepted = view.plan.items.filter((i) => i.tier !== 'chain')
  const acceptedIds = new Set(view.plan.items.map((i) => i.id))
  const sugg = view.suggestions.filter((x) => x.item.tier !== 'chain').sort((a, b) => Number(b.inAutoPlan) - Number(a.inAutoPlan))
  const chain = view.suggestions.filter((x) => x.item.tier === 'chain')
  // «أضيفي المقترح كله» adds the suggested list below — never the routine (that has its own button)
  const recommended = view.suggestions.filter((x) => x.inAutoPlan && x.item.tier !== 'chain')
  const rows: { item: PlanItem; added: boolean }[] = [...accepted.map((item) => ({ item, added: true })), ...sugg.map((x) => ({ item: x.item, added: false }))]
  const visible = showAll ? rows : rows.slice(0, 6)

  const shape = dayShape(view.energy, [...accepted, ...recommended.map((x) => x.item)])
  const close = () => (stack ? stack.goBack() : navigate('/today'))
  // Energy is only recorded when she picks it — «ابدئي يومك» never answers for her.
  const start = () => navigate('/today')

  return (
    <div className={styles.scroll}>
      <div className={styles.wash} aria-hidden="true" />
      <div className={styles.band} aria-hidden="true" />
      <div className={styles.page}>
        <div className={styles.top}>
          <span className={styles.date}>
            {dateLine(today)} · <bdi className={styles.num}>{clock(now.getHours() * 60 + now.getMinutes())}</bdi>
          </span>
          <button type="button" className={styles.close} onClick={close} aria-label="سكّري الموجز">
            <Icon name="close" size={16} />
          </button>
        </div>

        <header className={styles.header}>
          <motion.div initial={reduce ? false : { opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: dur.slow, ease: ease.enter }}>
            <WMark size={48} glow />
          </motion.div>
          <h1 className={styles.title} aria-label={greeting} tabIndex={-1} data-screen-title="" style={{ outline: 'none' }}>
            {greeting
              .split(' ')
              .map((w, i) => (
                <motion.span
                  key={i}
                  aria-hidden="true"
                  className={styles.word}
                  initial={reduce ? false : { opacity: 0, filter: 'blur(4px)', y: 4 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                  transition={{ duration: dur.gentle, ease: ease.enter, delay: 0.1 + i * 0.12 }}
                >
                  {w}
                </motion.span>
              ))}
          </h1>
          <p className={styles.lede}>كيف طاقتك اليوم؟ اختاري وحدة، والخطة تمشي معك.</p>
        </header>

        <div className={styles.energy} role="radiogroup" aria-label="طاقتي اليوم">
          {ENERGY.map((e) => {
            const on = answered && view.energy === e.mode
            return (
              <motion.button
                key={e.mode}
                type="button"
                role="radio"
                aria-checked={on}
                className={styles.option}
                data-on={on || undefined}
                whileTap={reduce ? undefined : { scale: 0.97 }}
                transition={springs.snappy}
                onClick={() => void store.setEnergy(e.mode)}
              >
                <Glyph name={e.icon} size={26} className={styles.optionIcon} />
                <span className={styles.optionLabel}>{e.label}</span>
                <span className={styles.optionSub}>{e.sub}</span>
              </motion.button>
            )
          })}
        </div>

        <section className={styles.shape} aria-label="شكل يومك">
          <h2 className={styles.kicker}>شكل يومك</h2>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={shape} className={styles.shapeText} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: dur.base, ease: ease.standard }}>
              {shape}
            </motion.p>
          </AnimatePresence>
          {answered && view.energy === 'red' && (
            <button type="button" className={styles.link} onClick={() => navigate('/today/calm')}>
              شوفي النسخة الهادئة من يومك
            </button>
          )}
        </section>

        {chain.length > 0 && (
          <div className={styles.group}>
            <div className={styles.row}>
              <span className={styles.rowIcon}>
                <Glyph name="drop" size={20} />
              </span>
              <div className={styles.rowText}>
                <span className={styles.rowTitle}>الروتين</span>
                <span className={styles.rowMeta}>
                  <MetaLine parts={chain.map((x) => x.item.title.ar).slice(0, 4)} />
                </span>
              </div>
              <button type="button" className={styles.add} onClick={() => void actions.acceptRoutine(chain.map((x) => x.item.id), 'الروتين')}>
                + أضيفيه
              </button>
            </div>
          </div>
        )}

        <section aria-label="اقتراحات لليوم" className={styles.suggestions}>
          <div className={styles.suggHead}>
            <h2 className={styles.kicker}>اقتراحات — أنتِ تختارين</h2>
            {recommended.length > 1 && (
              <button type="button" className={styles.link} onClick={() => void actions.acceptAll(recommended.filter((x) => !acceptedIds.has(x.item.id)).map((x) => x.item))}>
                أضيفي المقترح كله
              </button>
            )}
          </div>
          {rows.length === 0 ? (
            <p className={styles.empty}>ما عندنا اقتراحات اليوم. يومك لك — أضيفي اللي تبينه من الزر +.</p>
          ) : (
            <div className={styles.group}>
              <AnimatePresence initial={false}>
                {visible.map(({ item, added }, i) => (
                  <motion.div
                    key={item.id}
                    layout={!reduce}
                    className={styles.row}
                    data-last={i === visible.length - 1 || undefined}
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.enter, delay: Math.min(i, 6) * 0.04 } }}
                  >
                    <div className={styles.rowText}>
                      <span className={styles.rowTitle}>
                        <Bidi>{item.title.ar}</Bidi>
                      </span>
                      <span className={styles.rowMeta}>
                        <MetaLine parts={metaParts(item)} />
                      </span>
                    </div>
                    {added || acceptedIds.has(item.id) ? (
                      <button type="button" className={styles.added} onClick={() => void actions.remove(item)} aria-label={`انضافت ${item.title.ar} — اضغطي عشان تشيلينها`}>
                        <Icon name="check" size={14} /> انضافت
                      </button>
                    ) : (
                      <button type="button" className={styles.add} onClick={() => void actions.accept(item)} aria-label={`أضيفي ${item.title.ar} لليوم`}>
                        + أضيفيه
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          {rows.length > 6 && !showAll && (
            <button type="button" className={styles.more} onClick={() => setShowAll(true)}>
              شوفي الباقي ({rows.length - 6})
            </button>
          )}
        </section>
      </div>

      <div className={styles.footer}>
        <Button block size="large" onClick={start}>
          ابدئي يومك
        </Button>
        <button type="button" className={styles.self} onClick={() => navigate('/today')}>
          أرتّبه بنفسي
        </button>
      </div>
      <div className={styles.spacer} aria-hidden="true" />
    </div>
  )
}

/** Her day's shape in words — no number grid. */
function dayShape(energy: EnergyMode, items: PlanItem[]): string {
  const core = items.filter((i) => i.tier === 'core').length
  const maintain = items.filter((i) => i.tier === 'maintain' || i.tier === 'system').length
  const joy = items.filter((i) => i.tier === 'joy').length
  if (items.length === 0) return 'يوم مفتوح — ما فيه شي لازم، وأنتِ تختارين.'
  const joyText = joy > 0 ? 'ومتعة وحدة لك' : 'ووقت لك'
  if (energy === 'red') return `يوم رايق: الأساس بس، نسخة صغيرة تكفي، ${joyText}.`
  if (energy === 'yellow') return `يوم أخف: ${core > 0 ? `${core >= 2 ? 'أساسيتين' : 'أساسية وحدة'} بنسخ أصغر` : 'نسخ أصغر'}${maintain > 0 ? ' وأشياء خفيفة قليلة' : ''}، ${joyText}.`
  if (core === 0) return `يوم متوازن: ${maintain > 0 ? 'أشياء خفيفة بس، بدون أساسيات ثقيلة' : 'بدون أساسيات ثقيلة'}، ${joyText}.`
  const coreText = core === 1 ? 'أساسية وحدة' : core === 2 ? 'أساسيتين' : `${word(core)} أساسيات`
  return `يوم متوازن: ${coreText}${maintain > 0 ? ' وأشياء خفيفة معها' : ''}، ${joyText}.`
}
