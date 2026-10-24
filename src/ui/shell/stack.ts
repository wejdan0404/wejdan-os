import { createContext, useContext } from 'react'
import type { MotionValue } from 'framer-motion'

export interface StackApi {
  /** 0 = pushed screen fully on screen, 1 = fully off (revealing the screen beneath). */
  progress: MotionValue<number>
  /** Animate the pushed screen away, then pop the route. */
  goBack: () => void
  depth: number
  /** Label of the tab underneath (the back button's default text, e.g. «أنا»). */
  underLabel?: string
}

export const StackContext = createContext<StackApi | null>(null)
export const useStack = () => useContext(StackContext)
