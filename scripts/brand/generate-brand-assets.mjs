#!/usr/bin/env node
/**
 * Raster brand assets from the owner's W SVG (public/brand/w-ink.svg · w-white.svg).
 * Run:  npm run brand:assets      (uses @resvg/resvg-js, a devDependency only)
 *
 * Outputs: public/icons/{icon,maskable}-{192,512}.png · public/apple-touch-icon.png
 *          public/favicon-48.png · public/splash/*.png (iOS startup images, light + dark)
 *
 * Identity rules (Logo board): the W is only white on Ink #0E121C or ink on Sky50 #F2F7FE / white;
 * never tinted, stretched or rotated; Glow/Micro only on dark and only at >= 96px. The path is used
 * exactly as supplied (read from the SVG, never re-traced). Splash: W ~132pt wide a touch above
 * centre, one soft halo behind, the line «يومك جاهز» (IBM Plex Sans Arabic 500, subset in this folder).
 */
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PUB = join(ROOT, 'public')
const FONT = join(dirname(fileURLToPath(import.meta.url)), 'plex-sans-arabic-500-subset.ttf')

const INK = '#0E121C'
const SKY50 = '#F2F7FE'
const SKY = '#BEDAF7'
const VIOLET_DEEP = '#3D4877'
const LINE_DARK = '#CDCFD4'
const LINE_LIGHT = '#2B3358'
const LINE_AR = 'يومك جاهز'

const svg = readFileSync(join(PUB, 'brand', 'w-ink.svg'), 'utf8')
const D = /\sd="([^"]+)"/.exec(svg)[1]
const [VW, VH] = [227, 205]

/** The W as an SVG group, `width` px wide, with its centre at (cx, cy). */
function mark(width, cx, cy, fill, extra = '') {
  const k = width / VW
  return `<g transform="translate(${cx - width / 2} ${cy - (VH * k) / 2}) scale(${k})"><path d="${D}" fill="${fill}" ${extra}/></g>`
}

function render(svgString, width) {
  const r = new Resvg(svgString, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles: [FONT], loadSystemFonts: false, defaultFontFamily: 'IBM Plex Sans Arabic' },
    shapeRendering: 2,
    textRendering: 2,
  })
  return r.render().asPng()
}

const out = (rel, buf) => {
  const p = join(PUB, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, buf)
}

/** (1 - d)^2.2 falloff, as a radial gradient (the old raster glow). */
function radial(id, color, strength) {
  const stops = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
    .map((d) => `<stop offset="${d}" stop-color="${color}" stop-opacity="${(strength * Math.pow(1 - d, 2.2)).toFixed(4)}"/>`)
    .join('')
  return `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">${stops}</radialGradient>`
}

/** Home-screen / PWA icon: full-bleed Ink square (iOS and maskable rounding are applied by the OS). */
function icon(size, scale, { glow = false } = {}) {
  const w = size * scale
  const halo = glow
    ? `<defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${size * 0.03}"/></filter></defs>` +
      mark(w, size / 2, size / 2, '#FFFFFF', `opacity="0.4" filter="url(#b)"`)
    : ''
  return render(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${INK}"/>${halo}${mark(w, size / 2, size / 2, '#FFFFFF')}</svg>`,
    size,
  )
}

// Portrait CSS size, device pixel ratio — current & recent iPhones (matches index.html).
const DEVICES = [
  [440, 956, 3], [402, 874, 3], [420, 912, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3],
  [390, 844, 3], [375, 812, 3], [414, 896, 3], [414, 896, 2], [375, 667, 2],
]

function splash(pw, ph, dpr, dark) {
  const cx = pw / 2
  const cy = ph * 0.465
  const mw = 132 * dpr
  const mh = (VH * mw) / VW
  const ground = dark ? INK : SKY50
  const glowCol = dark ? VIOLET_DEEP : SKY
  const R = 270 * dpr
  const ty = cy + mh / 2 + 34 * dpr
  const halo = dark
    ? `<defs><filter id="b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${9 * dpr}"/></filter></defs>` +
      mark(mw, cx, cy, '#FFFFFF', `opacity="0.42" filter="url(#b)"`)
    : ''
  const s =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="0 0 ${pw} ${ph}">` +
    `<defs>${radial('g', glowCol, dark ? 0.85 : 0.55)}</defs>` +
    `<rect width="${pw}" height="${ph}" fill="${ground}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#g)"/>` +
    halo +
    mark(mw, cx, cy, dark ? '#FFFFFF' : INK) +
    `<text x="${cx}" y="${ty + 20 * dpr}" font-family="IBM Plex Sans Arabic" font-weight="500" font-size="${20 * dpr}" text-anchor="middle" fill="${dark ? LINE_DARK : LINE_LIGHT}">${LINE_AR}</text>` +
    `</svg>`
  return render(s, pw)
}

out('icons/icon-192.png', icon(192, 0.56, { glow: true }))
out('icons/icon-512.png', icon(512, 0.56, { glow: true }))
// Maskable: the whole W stays inside the 80% safe circle (half-diagonal of the W box <= 0.4 * size).
out('icons/maskable-192.png', icon(192, 0.5, { glow: true }))
out('icons/maskable-512.png', icon(512, 0.5, { glow: true }))
out('apple-touch-icon.png', icon(180, 0.56, { glow: true }))
out('favicon-48.png', icon(48, 0.72))
for (const [cw, ch, dpr] of DEVICES) {
  const pw = cw * dpr
  const ph = ch * dpr
  for (const dark of [true, false]) out(`splash/splash-${pw}x${ph}-${dark ? 'dark' : 'light'}.png`, splash(pw, ph, dpr, dark))
}
console.log('brand assets written')
