import { useCallback, useMemo } from 'react'
import { IeltsDrivingJ, type IeltsDrivingData, type Undo } from '../../../../domain'
import { useToast } from '../../../components/Toast'
import { useLife, useStore } from '../../../state/LifeStore'

/** Parsed area-F data (owner-entered; defaults when nothing saved). */
export function useIeltsDriving(): IeltsDrivingData {
  const raw = useLife().moduleState.ieltsDriving
  return useMemo(() => IeltsDrivingJ.fromJson(raw), [raw])
}

/** Runs an action that returns an undo, and says what happened with a «تراجع» toast. */
export function useDo() {
  const toast = useToast()
  return useCallback(
    async (p: Promise<Undo | null>, message: string) => {
      const undo = await p
      if (!undo) return false
      toast({ message, actionLabel: 'تراجع', onAction: () => void undo() })
      return true
    },
    [toast],
  )
}

export { useStore }

/** Arabic digits / Arabic decimal mark → Latin, for numeric inputs. */
export const latinDigits = (v: string) => v.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/٫/g, '.')

export const WEEK_DAY_NAME = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { weekday: 'long' })
