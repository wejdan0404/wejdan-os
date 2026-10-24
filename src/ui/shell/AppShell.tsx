import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import {
  Suspense,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type PointerEvent as RPointerEvent,
} from 'react'
import { Route, Routes, useLocation, useNavigate, type Location } from 'react-router-dom'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { Fab } from '../components/Fab'
import { TABS, TabBar } from '../components/TabBar'
import { SkeletonRows } from '../components/Skeleton'
import { QuickAddSheet } from '../screens/today/QuickAddSheet'
import { isFullscreenRoute, resolvePushed, tabRoots as roots } from '../routes'
import { useLifeSelector } from '../state/LifeStore'
import { TabGateContext, createTabGate, type MutableTabGate, type TabGate } from '../state/tabGate'
import { dur, ease, springs } from '../motion'
import { StackContext } from './stack'
import { StableNavigateProvider } from './navigate'
import { focusScreenTitle, restoreFocus } from './stackFocus'
import { rememberIntendedRoute } from '../state/onboardingResume'
import styles from './AppShell.module.css'

/** Which tab sits under a non-tab root on a cold load. */
const OWNER_TAB: Record<string, string> = {
  brief: 'today',
  evening: 'today',
  focus: 'today',
  routine: 'habits',
  studio: 'habits',
  review: 'me',
  help: 'me',
}

const isRtl = () => typeof document !== 'undefined' && document.documentElement.dir === 'rtl'

/**
 * A kept-alive tab root. Memoised with stable props so shell re-renders (route
 * changes, the stack animating) never re-render a tab; the gate freezes its
 * store reads while it is hidden.
 */
const TabRoot = memo(function TabRoot({ name, gate }: { name: string; gate: TabGate }) {
  const Root = roots[name]
  return (
    <TabGateContext.Provider value={gate}>
      <Suspense fallback={<div className={styles.fallback}><SkeletonRows /></div>}>
        <Root />
      </Suspense>
    </TabGateContext.Provider>
  )
})

/** The + button and its quick-add sheet own their state, so opening it touches nothing else. */
const QuickAddHost = memo(function QuickAddHost({ hidden }: { hidden: boolean }) {
  const [open, setOpen] = useState(false)
  const show = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])
  return (
    <>
      <AnimatePresence>{!hidden && <Fab key="fab" onClick={show} />}</AnimatePresence>
      <QuickAddSheet open={open} onClose={close} />
    </>
  )
})

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const segs = location.pathname.split('/').filter(Boolean)
  const isTabKey = TABS.some((t) => t.key === segs[0])
  // Non-tab roots (/review, /help, /routine…) keep the tab she came from underneath;
  // on a cold load they fall back to the tab that owns them.
  const [lastTab, setLastTab] = useState<string>(() => (isTabKey ? segs[0] : (OWNER_TAB[segs[0]] ?? 'today')))
  useEffect(() => {
    if (isTabKey && segs[0] !== lastTab) setLastTab(segs[0])
  }, [isTabKey, segs[0], lastTab])
  const tab = isTabKey ? segs[0] : lastTab
  const Pushed = resolvePushed(location.pathname)
  const onboarded = useLifeSelector((s) => s.settings.onboardingDone)
  useEffect(() => {
    if (onboarded) return
    // a deep link opened before first run is where she lands once onboarding is done
    rememberIntendedRoute(`${location.pathname}${location.search}`)
    navigate('/onboarding', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarded, navigate])
  // Unknown paths (#/nonsense, #/routine/xx, #/today/foo) don't silently keep a bad URL:
  // they land on the tab root that would have been shown.
  const unknown = !Pushed && (!isTabKey || segs.length > 1)
  useEffect(() => {
    if (unknown) navigate(`/${tab}`, { replace: true })
  }, [unknown, tab, navigate])

  // keep visited tab roots alive (scroll position + state survive tab switches, like iOS)
  const [visited, setVisited] = useState<string[]>([tab])
  useEffect(() => setVisited((v) => (v.includes(tab) ? v : [...v, tab])), [tab])

  // one gate per kept-alive tab: only the visible tab follows store changes
  const gates = useRef(new Map<string, MutableTabGate>())
  const gateFor = (key: string): MutableTabGate => {
    let g = gates.current.get(key)
    if (!g) {
      g = createTabGate(key === tab)
      gates.current.set(key, g)
    }
    return g
  }
  useLayoutEffect(() => {
    // before paint: the incoming tab catches up, hidden ones freeze
    for (const [key, g] of gates.current) g.set(key === tab)
  }, [tab, visited])

  // ---- navigation stack ----
  const d = isRtl() ? -1 : 1 // physical direction a pushed screen comes from
  // cold load straight onto a pushed route (#/brief, refresh) starts fully shown
  const progress = useMotionValue(Pushed ? 0 : 1) // 0 = pushed fully shown
  // Each pushed screen keeps the location it was opened with (a11y #8): while the stack swaps to the
  // next route, the leaving screen must never re-render against a URL it can't parse.
  const [shown, setShown] = useState<{ key: string; C: ComponentType; loc: Location } | null>(
    Pushed ? { key: location.pathname, C: Pushed, loc: location } : null,
  )
  const opener = useRef<Element | null>(null)
  const pushedRef = useRef<HTMLElement>(null)
  const baseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (Pushed) {
      if (shown?.key !== location.pathname) {
        if (!shown) opener.current = document.activeElement
        setShown({ key: location.pathname, C: Pushed, loc: location })
        progress.set(reduce ? 0 : 1)
        if (!reduce) animate(progress, 0, springs.sheet)
      }
    } else if (shown) {
      const c = animate(progress, 1, reduce ? { duration: 0 } : { duration: dur.slow, ease: ease.standard })
      c.then(() => setShown(null))
      return () => c.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // a11y #1: focus the pushed screen's title on push; on pop, return focus to what opened it.
  const firstShown = useRef(true)
  useEffect(() => {
    if (firstShown.current) {
      firstShown.current = false
      return
    }
    if (shown) return focusScreenTitle(pushedRef.current)
    const activeRoot = baseRef.current?.querySelector<HTMLElement>('[data-active-root]') ?? null
    restoreFocus(opener.current, activeRoot)
    opener.current = null
  }, [shown?.key])

  const goBack = useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    const done = () => (idx > 0 ? navigate(-1) : navigate(`/${tab}`, { replace: true }))
    if (reduce) return done()
    animate(progress, 1, springs.sheet).then(done)
  }, [navigate, progress, reduce, tab])

  const pushedX = useTransform(progress, (p) => `${p * d * 100}%`)
  const baseX = useTransform(progress, (p) => (shown ? `${(1 - p) * -d * 30}%` : '0%'))
  const dim = useTransform(progress, (p) => (shown ? (1 - p) * 0.14 : 0))

  // ---- edge swipe-back ----
  const drag = useRef<{ x0: number; t0: number; w: number; last: number; lt: number } | null>(null)
  const onEdgeDown = (e: RPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x0: e.clientX, t0: performance.now(), w: window.innerWidth, last: e.clientX, lt: performance.now() }
  }
  const onEdgeMove = (e: RPointerEvent<HTMLDivElement>) => {
    const s = drag.current
    if (!s) return
    const dx = (e.clientX - s.x0) * d
    progress.set(Math.max(0, Math.min(1, dx / s.w)))
    s.last = e.clientX
    s.lt = performance.now()
  }
  const onEdgeUp = (e: RPointerEvent<HTMLDivElement>) => {
    const s = drag.current
    drag.current = null
    if (!s) return
    const dt = Math.max(1, performance.now() - s.lt)
    const v = ((e.clientX - s.last) * d) / dt // px per ms toward "back"
    if (progress.get() > 0.35 || v > 0.5) goBack()
    else animate(progress, 0, springs.sheet)
  }

  const underLabel = TABS.find((t) => t.key === tab)?.label
  const stackApi = useMemo(() => ({ progress, goBack, depth: 1, underLabel }), [progress, goBack, underLabel])
  // covers and task flows (weekly review, morning brief, import review, note editor) hide the tab bar
  const fullscreen = !!shown && isFullscreenRoute(shown.key)

  return (
    <StableNavigateProvider>
    <div className={styles.app}>
      <motion.div
        ref={baseRef}
        className={styles.base}
        style={{ x: baseX }}
        // a11y #1: the covered screen leaves the focus order and the accessibility tree
        {...(shown ? { inert: '', 'aria-hidden': true } : {})}
      >
        {visited.map((key) => {
          const active = key === tab
          return (
            <motion.section
              key={key}
              className={styles.root}
              aria-hidden={!active}
              // a11y #9: the one visible screen is the page's main landmark
              role={active && !shown ? 'main' : undefined}
              data-active-root={active || undefined}
              initial={false}
              animate={
                active
                  ? { opacity: 1, visibility: 'visible', contentVisibility: 'visible' }
                  : // once faded out, skip its layout + paint entirely (state and scroll are kept)
                    { opacity: 0, transitionEnd: { visibility: 'hidden', contentVisibility: 'hidden' } }
              }
              transition={{ duration: reduce ? 0 : dur.base, ease: ease.standard }}
              style={{ zIndex: active ? 1 : 0, pointerEvents: active ? 'auto' : 'none' }}
              // inert keeps hidden tabs out of the focus order
              {...(!active ? { inert: '' } : {})}
            >
              {/* ErrorBoundary resets on navigation (a11y); TabRoot is memoised, so this never re-renders the tab (perf) */}
              <ErrorBoundary resetKey={location.pathname}>
                <TabRoot name={key} gate={gateFor(key)} />
              </ErrorBoundary>
            </motion.section>
          )
        })}
        <motion.div className={styles.dim} style={{ opacity: dim }} aria-hidden="true" />
      </motion.div>

      {shown && (
        <StackContext.Provider value={stackApi}>
          <motion.section
            ref={pushedRef}
            className={styles.pushed}
            style={{ x: pushedX }}
            key={shown.key}
            role="main"
            data-stack="pushed"
            data-fullscreen={fullscreen || undefined}
          >
            <ErrorBoundary resetKey={shown.key}>
              <Suspense fallback={<div className={styles.fallback}><SkeletonRows /></div>}>
                <Routes location={shown.key === location.pathname ? location : shown.loc}>
                  <Route path="*" element={<shown.C />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
            <div
              className={styles.edge}
              onPointerDown={onEdgeDown}
              onPointerMove={onEdgeMove}
              onPointerUp={onEdgeUp}
              onPointerCancel={onEdgeUp}
              aria-hidden="true"
            />
          </motion.section>
        </StackContext.Provider>
      )}

      {/* Today carries its own + in the header (the floating one would sit over its rows' trailing controls) */}
      <QuickAddHost hidden={!!shown || tab === 'today'} />

      <TabBar
        hidden={fullscreen}
        active={tab}
        onSelect={(key) => {
          if (key === tab && location.pathname !== `/${key}`) goBack()
          else navigate(`/${key}`)
        }}
      />
    </div>
    </StableNavigateProvider>
  )
}
