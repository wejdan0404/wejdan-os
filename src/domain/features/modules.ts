/** Optional modules: life areas she can switch off entirely (domain.enabled). Pure. */
import { violationsAfter } from '../engine/capacityGuard';
import type { DomainId } from '../models';
import type { LifeSnapshot } from '../snapshot';

/** Areas that can be switched off without touching the everyday core (sleep, health, money, home…). */
export const OPTIONAL_MODULES: readonly { id: DomainId; desc: string }[] = [
  { id: 'ielts', desc: 'خطة الآيلتس وجلساتها' },
  { id: 'driving', desc: 'خطوات رخصة القيادة' },
  { id: 'career', desc: 'البحث عن وظيفة والتطوير المهني' },
  { id: 'faith', desc: 'عادات الإيمان والمعنى اللي تختارينها' },
  { id: 'people', desc: 'التواصل مع الناس اللي يهمونك' },
];

/** Switching a module back on must not silently push «نمو» / «صيانة» past their caps. */
export function canEnableModule(s: LifeSnapshot, id: DomainId): boolean {
  const d = s.domains.find((x) => x.id === id);
  if (!d) return false;
  if (d.enabled) return true;
  return violationsAfter({ domains: s.domains, projects: s.projects, habits: s.habits, changedDomain: { ...d, enabled: true } }).length === 0;
}
