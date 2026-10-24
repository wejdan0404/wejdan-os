import { memo, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { springs } from '../../motion'
import { cachedDrawings, FLOWER_AR, FLOWER_STAGE_AR, loadDrawings, type Drawings, type FlowerKind, type FlowerStage } from './flowers'
import { ensureFlowerSymbol } from './sprite'
import styles from './Flower.module.css'

type Props = {
  kind: FlowerKind
  stage: FlowerStage
  /** Rendered box in px (drawings are crisp from 24 to 96). */
  size?: number
  /** Decorative when the row already says the flower + stage in text. */
  decorative?: boolean
  className?: string
}

/**
 * One botanical flower at a growth stage. Ink follows currentColor (text colour
 * in light, pale in dark); fills are her Violet/Sky scales. When the stage grows
 * the flower rises gently from its ground line (static with reduced motion).
 */
function FlowerImpl({ kind, stage, size = 44, decorative = false, className }: Props) {
  const [d, setD] = useState<Drawings | null>(cachedDrawings())
  const reduced = useReducedMotion()
  const prevStage = useRef(stage)
  const grew = stage > prevStage.current
  useEffect(() => {
    prevStage.current = stage
  }, [stage])
  useEffect(() => {
    if (d) return
    let alive = true
    void loadDrawings().then((x) => alive && setD(x))
    return () => {
      alive = false
    }
  }, [d])

  const label = `${FLOWER_AR[kind]} · ${FLOWER_STAGE_AR[stage]}`
  const markup = d?.[kind]?.[`${stage}`] ?? ''
  // one shared <symbol> per drawing; this flower is a single <use>
  const symbolId = markup ? ensureFlowerSymbol(kind, stage, markup) : null
  const a11y = decorative ? { 'aria-hidden': true as const } : { role: 'img' as const, 'aria-label': label }

  return (
    <span className={[styles.flower, className].filter(Boolean).join(' ')} style={{ width: size, height: size }} {...a11y}>
      <motion.svg
        key={`${kind}-${stage}`}
        viewBox="0 0 96 96"
        width={size}
        height={size}
        className={styles.svg}
        initial={grew && !reduced ? { scaleY: 0.82, opacity: 0.4 } : false}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={springs.smooth}
        style={{ transformOrigin: '50% 92%' }}
      >
        {symbolId && <use href={`#${symbolId}`} />}
      </motion.svg>
    </span>
  )
}

/** Memoised: many flowers per list, props are primitives. */
export const Flower = memo(FlowerImpl)
