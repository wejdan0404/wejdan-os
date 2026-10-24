/** «ترتاح» (resting) — port of Flutter `isRestingHabit` (ui/state/hub_providers.dart). */
import { describe, expect, it } from 'vitest';
import { type Domain, type DomainId, addDays, dayKey, isRestingHabit, kRestAfterDays, mkDate } from '../../src/domain';
import { logFor, simpleHabit } from './helpers';

const today = mkDate(2026, 10, 23);
const dom = (id: DomainId, state: Domain['state'] = 'grow', enabled = true): Domain => ({
  id, nameAr: id, nameEn: id, state, sensitive: false, enabled, parent: null, sortOrder: 0,
});
const created = dayKey(addDays(today, -21));

describe('isRestingHabit', () => {
  it('rests when no planned day in the last 7 days was done', () => {
    const h = simpleHabit({ id: 'w', created });
    expect(isRestingHabit({ habit: h, domains: [dom('health')], logs: [], today })).toBe(true);
  });

  it('does not rest when one planned day in the window was done', () => {
    const h = simpleHabit({ id: 'w', created });
    const logs = [logFor('w', addDays(today, -3))];
    expect(isRestingHabit({ habit: h, domains: [dom('health')], logs, today })).toBe(false);
  });

  it('ignores today and days older than the window', () => {
    const h = simpleHabit({ id: 'w', created });
    const logs = [logFor('w', today), logFor('w', addDays(today, -(kRestAfterDays + 1)))];
    expect(isRestingHabit({ habit: h, domains: [dom('health')], logs, today })).toBe(true);
  });

  it('never rests while younger than the window', () => {
    const h = simpleHabit({ id: 'w', created: dayKey(addDays(today, -(kRestAfterDays - 1))) });
    expect(isRestingHabit({ habit: h, domains: [dom('health')], logs: [], today })).toBe(false);
  });

  it('does not rest when nothing was planned in the window', () => {
    // Planned only on a weekday that never falls in the 7-day window is impossible,
    // so use an empty schedule.
    const h = simpleHabit({ id: 'w', created, weekdays: [] });
    expect(isRestingHabit({ habit: h, domains: [dom('health')], logs: [], today })).toBe(false);
  });

  it('rests when paused, in a Rest domain, or in a disabled domain', () => {
    const logs = [logFor('w', addDays(today, -1))];
    const paused = { ...simpleHabit({ id: 'w', created }), status: 'paused' as const };
    expect(isRestingHabit({ habit: paused, domains: [dom('health')], logs, today })).toBe(true);
    const h = simpleHabit({ id: 'w', created });
    expect(isRestingHabit({ habit: h, domains: [dom('health', 'rest')], logs, today })).toBe(true);
    expect(isRestingHabit({ habit: h, domains: [dom('health', 'grow', false)], logs, today })).toBe(true);
  });
});
