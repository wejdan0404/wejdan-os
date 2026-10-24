import { beforeEach, describe, expect, it } from 'vitest'
import { purgeDeviceConveniences } from '../../../src/ui/lock/deviceKeys'
import { rememberIntendedRoute, suppressIntendedRoute, takeIntendedRoute } from '../../../src/ui/state/onboardingResume'

beforeEach(() => localStorage.clear())

describe('per-device conveniences are wiped when the lock is used on purpose', () => {
  it('removes search history, drafts and picks; keeps theme, the lock registry and PWA flags', () => {
    for (const k of ['wejdan.recentSearches', 'wejdan.reviewDraft.v1:2026-10-04', 'wejdan.joy.pick.2026-10-24', 'wejdan.focus.v1', 'wejdan.reviewRest', 'wejdan.onboarding.draft.v1']) localStorage.setItem(k, 'x')
    for (const k of ['wejdan.theme', 'wejdan.vault.v1', 'wejdan.persistRequested']) localStorage.setItem(k, 'keep')
    purgeDeviceConveniences()
    expect(Object.keys(localStorage).sort()).toEqual(['wejdan.persistRequested', 'wejdan.theme', 'wejdan.vault.v1'])
  })
})

describe('gate-2 P1: after «احذفي كل شي» the app lands on Today, not Settings', () => {
  it('a remembered deep link is still honoured normally', () => {
    rememberIntendedRoute('/me/notes')
    expect(takeIntendedRoute()).toBe('/me/notes')
    expect(takeIntendedRoute()).toBe('/today')
  })
  it('after suppressIntendedRoute() the Settings route AppShell tries to remember is dropped', () => {
    rememberIntendedRoute('/me/settings') // an earlier visit
    suppressIntendedRoute()
    rememberIntendedRoute('/me/settings') // what AppShell does when the wipe flips onboardingDone
    expect(takeIntendedRoute()).toBe('/today')
    rememberIntendedRoute('/me/notes') // and the flag is cleared again for the next first run
    expect(takeIntendedRoute()).toBe('/me/notes')
  })
})
