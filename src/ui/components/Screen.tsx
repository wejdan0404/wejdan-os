import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef, useState, type ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { useStack } from '../shell/stack'
import styles from './Screen.module.css'

export interface ScreenProps {
  title: string
  /** Title in the collapsed bar when it differs from the large title (e.g. greeting vs «اليوم»). */
  compactTitle?: string
  /** Shown beside the large title (e.g. the W mark on Today/Me). */
  titleAccessory?: ReactNode
  /** Under the large title: date, subtitle. */
  subtitle?: ReactNode
  /** Above the large title: the eyebrow row (e.g. W + date on Today, season · week on Habits). */
  eyebrow?: ReactNode
  /** Back button label — the previous screen's title (iOS convention). */
  backLabel?: string
  /** 'cancel': a modal-style page (Note editor) — the back control is a plain «إلغاء» with no chevron. */
  backStyle?: 'back' | 'cancel'
  /** Buttons at the inline end of the nav bar. */
  actions?: ReactNode
  /** Reserve room for the floating add button (tab roots always do — the + shows on every tab). */
  withFab?: boolean
  /** No large title: inline title only (detail screens). */
  inlineTitle?: boolean
  /** Reveal the large title word by word, once (Today greeting). */
  revealTitle?: boolean
  /** Decorative band drawn behind the bar + large title (e.g. Harlequin on Joy). Purely visual. */
  band?: ReactNode
  /** Page ground: white (default, main screens) or the sky-50 tint (settings-like lists: Me, Settings, Sources…). */
  ground?: 'plain' | 'tinted'
  /** Dark-only header aurora — the one ambient glow behind the large title (Today, Habits, Brief). */
  aurora?: boolean
  /** Beside the large title at the inline end, outside the heading (e.g. the sparks chip on Joy). */
  titleEnd?: ReactNode
  children: ReactNode
}

/** iOS screen: large title that collapses into a blurred compact bar as you scroll. */
export function Screen({ title, compactTitle, titleAccessory, subtitle, backLabel, backStyle, actions, withFab, inlineTitle, revealTitle, band, ground, aurora, eyebrow, titleEnd, children }: ScreenProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const stack = useStack()
  const { scrollY } = useScroll({ container: ref })
  const compact = useTransform(scrollY, [28, 56], [0, 1])
  const barMaterial = useTransform(scrollY, [4, 40], [0, 1])
  const stretch = useTransform(scrollY, [-120, 0], [1.08, 1])
  const largeOpacity = useTransform(scrollY, [0, 52], [1, 0])
  const largeY = useTransform(scrollY, [0, 52], [0, -8])
  const [scrolled, setScrolled] = useState(false)
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 40))

  return (
    <div ref={ref} className={styles.scroll} data-fab={withFab || !stack || undefined} data-ground={ground === 'tinted' ? 'tinted' : undefined} data-band={band ? '' : undefined}>
      {aurora && <div className={styles.aurora} aria-hidden="true" />}
      {band && (
        <div className={styles.band} aria-hidden="true">
          {band}
        </div>
      )}
      <header className={styles.bar} data-scrolled={scrolled || undefined}>
        <motion.div className={styles.material} style={{ opacity: inlineTitle ? 1 : barMaterial }} aria-hidden="true" />
        <div className={styles.barRow}>
          <div className={styles.barStart}>
            {stack && stack.depth > 0 && (
              <button type="button" className={styles.back} data-cancel={backStyle === 'cancel' || undefined} onClick={stack.goBack}>
                {backStyle !== 'cancel' && <Icon name="back" size={22} />}
                <span>{backLabel ?? stack.underLabel ?? 'رجوع'}</span>
              </button>
            )}
          </div>
          {inlineTitle ? (
            // detail screens: the bar title IS the page heading (focus lands here on push)
            <motion.h1 className={`${styles.compactTitle} ${styles.focusTarget}`} tabIndex={-1} data-screen-title="">
              <TitleText text={compactTitle ?? title} />
            </motion.h1>
          ) : (
            <motion.h2 className={styles.compactTitle} style={{ opacity: compact }} aria-hidden="true">
              <TitleText text={compactTitle ?? title} />
            </motion.h2>
          )}
          <div className={styles.barEnd}>{actions}</div>
        </div>
      </header>
      {!inlineTitle && (
        <div className={styles.large}>
          {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
          <div className={titleEnd ? styles.titleRow : styles.titleRowPlain}>
          <motion.h1
            className={`${styles.largeTitle} ${styles.focusTarget}`}
            tabIndex={-1}
            data-screen-title=""
            style={reduce ? undefined : { scale: stretch, opacity: largeOpacity, y: largeY }}
          >
            {titleAccessory}
            {revealTitle && !reduce ? (
              <>
                {/* the heading's name is the plain text; the animated words are presentation only */}
                <span className="visually-hidden">{title}</span>
                <span aria-hidden="true">
                {(title ?? '').split(' ').map((w, i) => (
                  <motion.span
                    key={i}
                    aria-hidden="true"
                    style={{ display: 'inline-block', marginInlineEnd: '0.25em' }}
                    initial={{ opacity: 0, filter: 'blur(4px)', y: 4 }}
                    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                    transition={{ duration: 0.5, ease: [0, 0, 0, 1], delay: 0.08 + i * 0.12 }}
                  >
                    <TitleText text={w} />
                  </motion.span>
                ))}
                </span>
              </>
            ) : (
              <span>
                <TitleText text={title} />
              </span>
            )}
          </motion.h1>
          {titleEnd}
          </div>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
      )}
      <div className={styles.content}>{children}</div>
    </div>
  )
}

/** Latin runs (IELTS, SPF 30+) inside an Arabic display title use the Latin face and isolate their direction. */
const LATIN_RUN = /\p{Script=Latin}[\p{Script=Latin}\p{M}0-9 .+&'’\-]*[\p{Script=Latin}\p{M}0-9+]|\p{Script=Latin}/u
/** Number runs and ranges («30–45», «2026», «1,500») stay in order inside an Arabic title (QA area 3 #6). */
const NUMBER_RUN = /[0-9][0-9.,:٬٫]*(?:\s*[-–]\s*[0-9][0-9.,:٬٫]*)?/
const TITLE_RUNS = new RegExp(`(${LATIN_RUN.source})|(${NUMBER_RUN.source})`, 'gu')

function TitleText({ text }: { text: string | undefined }) {
  // Defensive: a screen leaving the stack can render once with a title it can't resolve.
  const safe = text ?? ''
  const out: ReactNode[] = []
  let last = 0
  for (const m of safe.matchAll(TITLE_RUNS)) {
    const i = m.index ?? 0
    if (i > last) out.push(safe.slice(last, i))
    out.push(
      m[1] ? (
        <bdi key={i} dir="ltr" lang="en" className={styles.latin}>
          {m[0]}
        </bdi>
      ) : (
        <bdi key={i} dir="ltr">
          {m[0]}
        </bdi>
      ),
    )
    last = i + m[0].length
  }
  if (out.length === 0) return <>{safe}</>
  if (last < safe.length) out.push(safe.slice(last))
  return <>{out}</>
}
