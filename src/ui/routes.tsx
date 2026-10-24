/**
 * Route registry — the ONLY place routes are declared. Screen builders edit their own
 * files under src/ui/screens/<area>/; add a route here only when a new screen file appears.
 *
 * - tabRoots: the 5 tab roots (kept alive between tab switches).
 * - pushed:   screens pushed over the current tab (slide + swipe-back), first match wins.
 * - Onboarding is full-screen (no tab bar) and declared in App.tsx.
 */
import { type ComponentType } from 'react'
import { lazyWithRetry } from './lib/lazyRetry'

// lazy + retry with backoff; a failed chunk can be retried from the error screen without a reload
const L = (f: () => Promise<{ default: ComponentType }>) => lazyWithRetry(f)

export const tabRoots: Record<string, ComponentType> = {
  today: L(() => import('./screens/today/TodayScreen')),
  habits: L(() => import('./screens/habits/HabitsScreen')),
  path: L(() => import('./screens/path/PathScreen')),
  joy: L(() => import('./screens/joy/JoyScreen')),
  me: L(() => import('./screens/me/MeScreen')),
}

export const OnboardingScreen = L(() => import('./screens/me/OnboardingScreen'))

export interface PushedRoute {
  /** Hash path pattern, e.g. /^\/path\/project\/[^/]+$/ */
  pattern: RegExp
  component: ComponentType
  /** Presented as a full-screen cover / task flow: the tab bar steps aside (boards). */
  fullscreen?: boolean
}

export const pushed: PushedRoute[] = [
  // today
  { pattern: /^\/today\/item\/[^/]+$/, component: L(() => import('./screens/today/ItemDetailScreen')) },
  { pattern: /^\/brief$/, component: L(() => import('./screens/today/MorningBriefScreen')), fullscreen: true },
  { pattern: /^\/evening$/, component: L(() => import('./screens/today/EveningScreen')) },
  { pattern: /^\/focus\/[^/]+$/, component: L(() => import('./screens/today/FocusScreen')) },
  // habits
  { pattern: /^\/habits\/garden$/, component: L(() => import('./screens/habits/GardenScreen')) },
  { pattern: /^\/habits\/[^/]+$/, component: L(() => import('./screens/habits/HabitDetailScreen')) },
  { pattern: /^\/routine\/(am|pm|weekly)\/play$/, component: L(() => import('./screens/habits/RoutinePlayerScreen')) },
  { pattern: /^\/routine\/(am|pm|weekly)$/, component: L(() => import('./screens/habits/RoutineScreen')) },
  { pattern: /^\/me\/products$/, component: L(() => import('./screens/habits/ProductsScreen')) },
  { pattern: /^\/studio$/, component: L(() => import('./screens/habits/HabitStudioScreen')) },
  // path
  { pattern: /^\/path\/project\/[^/]+$/, component: L(() => import('./screens/path/ProjectDetailScreen')) },
  { pattern: /^\/path\/ielts$/, component: L(() => import('./screens/path/IeltsScreen')) },
  { pattern: /^\/path\/driving$/, component: L(() => import('./screens/path/DrivingScreen')) },
  // joy
  { pattern: /^\/joy\/reward$/, component: L(() => import('./screens/joy/RewardsScreen')) },
  // me
  { pattern: /^\/me\/inbox$/, component: L(() => import('./screens/me/InboxScreen')) },
  { pattern: /^\/me\/money$/, component: L(() => import('./screens/me/MoneyScreen')) },
  { pattern: /^\/review$/, component: L(() => import('./screens/me/WeeklyReviewScreen')), fullscreen: true },
  { pattern: /^\/me\/insights$/, component: L(() => import('./screens/me/InsightsScreen')) },
  { pattern: /^\/me\/evidence$/, component: L(() => import('./screens/me/EvidenceScreen')) },
  { pattern: /^\/me\/home$/, component: L(() => import('./screens/me/HomeAdminScreen')) },
  { pattern: /^\/me\/reminders$/, component: L(() => import('./screens/reminders/RemindersScreen')) },
  { pattern: /^\/me\/settings$/, component: L(() => import('./screens/me/SettingsScreen')) },
  { pattern: /^\/help$/, component: L(() => import('./screens/me/HelpScreen')) },
  // notes & search (builder N)
  { pattern: /^\/me\/notes\/(new|[^/]+)$/, component: L(() => import('./screens/notes/NoteEditorScreen')), fullscreen: true },
  { pattern: /^\/me\/notes$/, component: L(() => import('./screens/notes/NotesScreen')) },
  // sources, import review & change log (builder S)
  { pattern: /^\/me\/sources\/review\/[^/]+$/, component: L(() => import('./screens/sources/ImportReviewScreen')), fullscreen: true },
  { pattern: /^\/me\/sources$/, component: L(() => import('./screens/sources/SourcesScreen')) },
  { pattern: /^\/me\/changelog$/, component: L(() => import('./screens/sources/ChangeLogScreen')) },
]

// Developer component gallery — dev builds only (never shipped to her).
if (import.meta.env.DEV) {
  pushed.push({ pattern: /^\/me\/kit$/, component: L(() => import('./screens/me/KitScreen')) })
}

export function resolvePushed(pathname: string): ComponentType | null {
  return pushed.find((r) => r.pattern.test(pathname))?.component ?? null
}

/** True when the pushed screen at this path is a full-screen cover (no tab bar). */
export function isFullscreenRoute(pathname: string): boolean {
  return !!pushed.find((r) => r.pattern.test(pathname))?.fullscreen
}
