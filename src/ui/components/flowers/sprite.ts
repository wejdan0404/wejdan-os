/**
 * Flower sprite — each drawing (kind × stage) is added ONCE to a hidden
 * <svg><defs> in the document as a <symbol>; every Flower then renders a
 * single <use href>. A garden of 60 habits went from ~1,100 inline paths to
 * ~60 <use> nodes, with identical pixels: drawings are self-contained
 * (literal Violet/Sky fills, ink = currentColor, which <use> inherits).
 */
const SPRITE_ID = 'wejdan-flower-sprite'
const added = new Set<string>()

export const flowerSymbolId = (kind: string, stage: number | string): string => `wf-${kind}-${stage}`

export function ensureFlowerSymbol(kind: string, stage: number | string, markup: string): string {
  const id = flowerSymbolId(kind, stage)
  if (typeof document === 'undefined') return id
  if (added.has(id) && document.getElementById(id)) return id
  let host = document.getElementById(SPRITE_ID) as SVGSVGElement | null
  if (!host) {
    host = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    host.setAttribute('id', SPRITE_ID)
    host.setAttribute('aria-hidden', 'true')
    host.setAttribute('focusable', 'false')
    host.setAttribute('width', '0')
    host.setAttribute('height', '0')
    host.style.position = 'absolute'
    host.style.width = '0'
    host.style.height = '0'
    host.style.overflow = 'hidden'
    host.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'defs'))
    document.body.appendChild(host)
  }
  if (!document.getElementById(id)) {
    const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol')
    symbol.setAttribute('id', id)
    symbol.setAttribute('viewBox', '0 0 96 96')
    symbol.setAttribute('overflow', 'visible')
    // Static, first-party drawings shipped with the app (drawings.json) — never user content.
    symbol.innerHTML = markup
    host.firstElementChild!.appendChild(symbol)
  }
  added.add(id)
  return id
}
