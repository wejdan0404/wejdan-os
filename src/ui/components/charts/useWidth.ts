import { useEffect, useRef, useState } from 'react'

/** Width of an element in px (chart drawn in real px so text follows the user's text scale). Falls back in tests. */
export function useWidth(fallback = 300) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => {
      const x = el.getBoundingClientRect().width
      if (x > 0) setW(Math.round(x))
    }
    read()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}
