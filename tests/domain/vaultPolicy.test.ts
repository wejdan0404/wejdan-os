import { describe, expect, it } from 'vitest'
import {
  canAttempt, delaySecondsAfter, hiddenLockDelay, isValidPassword, isValidUsername, kNoAttempts, normalizeUsername,
  passwordStrength, recordFailure, remainingSeconds, shouldLockOnHide, shouldLockOnReturn, type AttemptState,
} from '../../src/domain/vault'

describe('auto-lock timing', () => {
  const T0 = 1_000_000
  it('«فورًا» locks as soon as the page is hidden, and always on return', () => {
    expect(shouldLockOnHide('immediate')).toBe(true)
    expect(shouldLockOnReturn('immediate', T0, T0 + 1)).toBe(true)
    for (const t of ['min1', 'min5', 'launch'] as const) expect(shouldLockOnHide(t)).toBe(false)
  })
  it('«بعد دقيقة» / «بعد 5 دقايق» lock only after being away at least that long', () => {
    expect(shouldLockOnReturn('min1', T0, T0 + 59_999)).toBe(false)
    expect(shouldLockOnReturn('min1', T0, T0 + 60_000)).toBe(true)
    expect(shouldLockOnReturn('min5', T0, T0 + 299_999)).toBe(false)
    expect(shouldLockOnReturn('min5', T0, T0 + 300_000)).toBe(true)
    expect(hiddenLockDelay('min1')).toBe(60_000)
    expect(hiddenLockDelay('min5')).toBe(300_000)
    expect(hiddenLockDelay('immediate')).toBeNull()
  })
  it('«كل ما أفتحه» never locks a live page (a cold start always needs the password)', () => {
    expect(shouldLockOnReturn('launch', T0, T0 + 86_400_000)).toBe(false)
    expect(hiddenLockDelay('launch')).toBeNull()
  })
  it('an unknown hide time fails safe (locks)', () => {
    expect(shouldLockOnReturn('min1', null, T0)).toBe(true)
  })
})

describe('soft delay after wrong passwords', () => {
  it('attempts 1-4: no delay; 5th: 30 s, then 60 s, 2 min, and 5 min (cap)', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 50].map(delaySecondsAfter)).toEqual([0, 0, 0, 0, 30, 60, 120, 300, 300, 300])
  })
  it('escalates through recordFailure and blocks attempts until retryAt; reload keeps the state (plain data)', () => {
    let s: AttemptState = kNoAttempts
    const now = 5_000_000
    for (let i = 0; i < 4; i++) {
      s = recordFailure(s, now)
      expect(canAttempt(s, now)).toBe(true)
    }
    s = recordFailure(s, now)
    expect(s.failures).toBe(5)
    expect(remainingSeconds(s, now)).toBe(30)
    expect(canAttempt(s, now + 29_000)).toBe(false)
    expect(remainingSeconds(s, now + 29_100)).toBe(1)
    expect(canAttempt(s, now + 30_000)).toBe(true)
    const reloaded = JSON.parse(JSON.stringify(s)) as AttemptState
    expect(canAttempt(reloaded, now + 10_000)).toBe(false)
    s = recordFailure(s, now + 30_000)
    expect(remainingSeconds(s, now + 30_000)).toBe(60)
    s = recordFailure(s, now + 100_000)
    expect(remainingSeconds(s, now + 100_000)).toBe(120)
    s = recordFailure(s, now + 300_000)
    expect(remainingSeconds(s, now + 300_000)).toBe(300)
    s = recordFailure(s, now + 700_000)
    expect(remainingSeconds(s, now + 700_000)).toBe(300)
  })
})

describe('credential rules', () => {
  it('username: 3+ English letters/digits/._-, normalised for comparison', () => {
    for (const ok of ['abc', 'test.user', 'test_k', 'A-1']) expect(isValidUsername(ok)).toBe(true)
    for (const bad of ['ab', '', 'وجدان', 'a b c', 'x'.repeat(33)]) expect(isValidUsername(bad)).toBe(false)
    expect(normalizeUsername(' Test.User ')).toBe('test.user')
  })
  it('password: 8+ chars; strength is a hint (1 short, 2 ok, 3-4 strong)', () => {
    expect(isValidPassword('1234567')).toBe(false)
    expect(isValidPassword('12345678')).toBe(true)
    expect(passwordStrength('')).toBe(0)
    expect(passwordStrength('abc')).toBe(1)
    expect(passwordStrength('aaaaaaaaaa')).toBe(1)
    expect(passwordStrength('tester.x1')).toBe(2)
    expect(passwordStrength('three plain words here')).toBeGreaterThanOrEqual(3)
    expect(passwordStrength('Xk9#mP2$vL7!qR4z')).toBe(4)
  })
})
