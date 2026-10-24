import { useLocation } from 'react-router-dom'
import HabitStudioScreen from './HabitStudioScreen'
import HabitStudioWizard from './HabitStudioWizard'

/**
 * `/studio` → the 9-step wizard for a new habit. The quick form is still here:
 * `?mode=quick`, or any edit (`?habit=<id>`) unless `?mode=wizard` asks for steps.
 */
export default function StudioEntry() {
  const p = new URLSearchParams(useLocation().search)
  const mode = p.get('mode')
  const quick = mode === 'quick' || (mode !== 'wizard' && p.get('habit') != null)
  return quick ? <HabitStudioScreen key="quick" /> : <HabitStudioWizard key="wizard" />
}
