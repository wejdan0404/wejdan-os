import type { ComponentType } from 'react'
import type { LifeSnapshot } from '../../../domain'
import { JoyOnboardingStep } from '../joy/JoyOnboardingStep'

/**
 * Extra onboarding steps that other features contribute (e.g. the joy map). They are inserted right
 * after the life map, take part in the progress dots and the draft resume, and never block: the footer
 * always offers «التالي»/«تخطّي». Empty by default — with nothing registered the flow simply has no such step.
 *
 *   onboardingExtraSteps.push({ id: 'joy', Component: JoyMapOnboardingStep, finish: async () => { … } })
 *
 * `finish` runs when she taps the last button (before onboardingDone is written); keep it idempotent.
 */
export interface OnboardingExtraStep {
  id: string
  Component: ComponentType
  finish?: () => Promise<void>
  /** True while the step has nothing from her yet — the footer then says «تخطّي» instead of «التالي». */
  isEmpty?: (s: LifeSnapshot) => boolean
}

export const onboardingExtraSteps: OnboardingExtraStep[] = []

// the joy step (area G): joys are saved the moment she taps/saves one, so there is nothing to finish
onboardingExtraSteps.push({ id: 'joy', Component: JoyOnboardingStep, isEmpty: (s) => s.joyItems.length === 0 })
