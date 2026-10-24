import { MotionConfig } from 'framer-motion'
import { Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './ui/components/ErrorBoundary'
import { SkeletonRows } from './ui/components/Skeleton'
import { VaultProvider } from './ui/lock/VaultProvider'
import { OnboardingScreen } from './ui/routes'
import { AppShell } from './ui/shell/AppShell'
import { ThemeProvider } from './ui/shell/theme'
import { LifeStoreProvider } from './ui/state/LifeStore'

export default function App() {
  return (
    <ThemeProvider>
      {/* last line of defence: a crash anywhere shows a calm recovery screen, never a blank app */}
      <ErrorBoundary scope="app">
        {/* reducedMotion="user": transforms/layout animations are skipped when the OS asks for less motion */}
        <MotionConfig reducedMotion="user">
          <VaultProvider>
            <LifeStoreProvider>
              <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                  <Route path="/" element={<Navigate to="/today" replace />} />
                  {import.meta.env.DEV && <Route path="/kit" element={<Navigate to="/me/kit" replace />} />}
                  <Route
                    path="/onboarding"
                    element={
                      <Suspense fallback={<SkeletonRows />}>
                        <OnboardingScreen />
                      </Suspense>
                    }
                  />
                  <Route path="*" element={<AppShell />} />
                </Routes>
              </HashRouter>
            </LifeStoreProvider>
          </VaultProvider>
        </MotionConfig>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
