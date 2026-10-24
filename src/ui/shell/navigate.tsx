/**
 * Stable navigation for kept-alive tab screens.
 *
 * react-router's useNavigate() subscribes to the location, so every tab switch
 * re-rendered all five tab screens. The shell provides one stable function
 * instead; screens outside the shell (tests, onboarding) fall back to
 * react-router's own hook.
 */
import { createContext, useContext, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useNavigate, type NavigateFunction, type NavigateOptions, type To } from 'react-router-dom'

const StableNavigateContext = createContext<NavigateFunction | null>(null)

export function StableNavigateProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const ref = useRef(navigate)
  useLayoutEffect(() => {
    ref.current = navigate
  }, [navigate])
  const stable = useMemo<NavigateFunction>(() => {
    const fn = (to: To | number, opts?: NavigateOptions) =>
      typeof to === 'number' ? ref.current(to) : ref.current(to, opts)
    return fn as NavigateFunction
  }, [])
  return <StableNavigateContext.Provider value={stable}>{children}</StableNavigateContext.Provider>
}

/** Like useNavigate(), but doesn't re-render on every route change inside the shell. */
export function useStableNavigate(): NavigateFunction {
  const stable = useContext(StableNavigateContext)
  // The provider is either always present or always absent for a mounted
  // component, so the hook order is stable.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return stable ?? useNavigate()
}
