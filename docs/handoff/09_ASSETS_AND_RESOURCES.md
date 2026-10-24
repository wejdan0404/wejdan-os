> **ملخص**
> جرد كامل لكل ملف أصول في `public/` و`src/` (أيقونات، شاشات البداية، W، خطوط، بيانات JSON، رسومات الورود) مع المسار والحجم والاستخدام والترخيص والحالة.
> الخطوط تُحمَّل من حزم npm (`@fontsource`) بترخيص OFL وتُستضاف مع التطبيق، ولا يوجد أي رابط خط خارجي ولا ملفات Thmanyah؛ ملاحظة: نص ترخيص OFL غير مضمَّن في مخرجات البناء.
> فحص المراجع المكسورة (سكربت داخل المستودع) أعطى 0 مرجع مكسور من 1651، وقائمة الموارد الخارجية بالاسم فقط بدون روابط أو مفاتيح.

# 09 — Assets and resources

Verified 2026-10-24, branch `docs/handoff` (on top of `main` @ `ed0df23`), production build from `npm run build` (vite 5.4.11, 139 precache entries ≈ 2,215 KiB).

## 1. Fonts — how they are really loaded

* Source: npm packages `@fontsource/ibm-plex-sans-arabic` 5.1.0, `@fontsource/ibm-plex-sans` 5.1.0, `@fontsource/el-messiri` 5.1.0 (all declared in `package.json` `dependencies`; licence field **OFL-1.1** in each package; each package ships a `LICENSE` file: «Copyright 2019 IBM Corp.» / «2018 IBM Corp.» / «2015 The El Messiri Project Authors»).
* `src/ui/fonts.ts` imports the **full-weight** per-weight CSS (`400/500/600/700` Plex Sans Arabic, `400/500/600` Plex Sans, `500/700` El Messiri). Those CSS files declare one `@font-face` per Unicode subset with `unicode-range`, so the browser downloads only the subsets a page draws.
* Vite emits the `.woff2` (72 files) and `.woff` (36 files) into `dist/assets/` (≈584 KB of woff2 in total). They are same-origin (`/wejdan-os/assets/…`). **No `<link>` to Google Fonts or any font CDN exists in `index.html` or in the CSS** (grep for `fonts.googleapis`, `fonts.gstatic`, `@import url(http` → none).
* First-paint preload: `vite.config.ts` plugin `wejdan-preload-first-paint-fonts` adds `<link rel="preload" as="font" type="font/woff2" crossorigin>` for `ibm-plex-sans-arabic-arabic-400-normal-*.woff2` and `el-messiri-arabic-700-normal-*.woff2` (verified in the built `dist/index.html`: 2 preload links).
* Offline: Workbox precache `globPatterns` include `woff2` and **exclude** `*-cyrillic-*`, `*-greek-*`, `*-vietnamese-*` (22 unique woff2 in the precache list). `.woff` files are not precached.
* Fallback stacks: see 07_DESIGN_SYSTEM.md §3 (`Geeza Pro`, `SF Arabic`, `-apple-system`, `system-ui`).
* **Thmanyah**: not referenced anywhere in `src/`, `public/`, `index.html`, `vite.config.ts` (only a comment in `src/ui/fonts.ts` records that its licence forbids hosting the files publicly). No Thmanyah font file exists in the repo tree.
* `scripts/brand/plex-sans-arabic-500-subset.ttf` (6,816 B): a subset of IBM Plex Sans Arabic Medium (OFL) used **only** by the build-time script that draws the splash line «يومك جاهز»; it is not served by the app.
* **OFL attribution gap (verified):** `grep -ri "SIL Open Font" dist` finds nothing — the built site redistributes the font files without the OFL text or copyright notice. The notices exist only inside `node_modules/@fontsource/*/LICENSE`. Recommended fix: ship a `THIRD_PARTY_NOTICES.txt` (or a Settings/Help «عن التطبيق» line) with the three OFL notices. Not done.

## 2. Asset manifest

Sizes are bytes from the working tree (`ls -l`). "Where used" = result of grep/reading on 2026-10-24. "In repo?" = tracked by git on this branch (`git ls-files`). Status values: **available**, **missing**, **unused**, **build-time only**, **legacy shim**.

### 2.1 `public/` (copied verbatim to `dist/`)

| Path | Type / size | Purpose | Where used | In repo? | Licence / provenance | Status |
|---|---|---|---|---|---|---|
| `public/brand/w-ink.svg` | SVG 9,265 · viewBox 227×205 | Owner's W monogram (W + arc + 3 stars), ink version | `scripts/brand/generate-brand-assets.mjs` reads its path `d`; precached via `includeAssets: ['brand/*.svg']` in `vite.config.ts`; **not rendered at runtime** (`WMark` uses the same path inlined in `src/ui/components/wPath.ts`) | yes | Owner's artwork (Figma file key `pei6kBFtNKDcYAwPBG1gTN`, node `72:53`); all rights the owner's | available; source of truth for raster assets |
| `public/brand/w-white.svg` | SVG 9,263 | White W for dark grounds | `includeAssets` only; no runtime reference | yes | same | available, **unused at runtime** (kept as brand source) |
| `public/icons/icon-192.png` | PNG 192×192 · 15,202 | PWA icon (`purpose: any`) | `manifest.webmanifest` (from `vite.config.ts`) | yes | generated from the W by `npm run brand:assets` | available |
| `public/icons/icon-512.png` | PNG 512×512 · 70,145 | PWA icon (`any`) | manifest | yes | same | available |
| `public/icons/maskable-192.png` | PNG 192×192 · 12,461 | PWA icon (`maskable`) | manifest | yes | same | available |
| `public/icons/maskable-512.png` | PNG 512×512 · 60,348 | PWA icon (`maskable`) | manifest | yes | same | available |
| `public/apple-touch-icon.png` | PNG 180×180 · 13,070 | iOS home-screen icon | `index.html` `<link rel="apple-touch-icon" href="/wejdan-os/apple-touch-icon.png">` | yes | same | available |
| `public/favicon-48.png` | PNG 48×48 · 1,247 | favicon | `index.html` | yes | same | available |
| `public/splash/splash-{750x1334, 828x1792, 1125x2436, 1170x2532, 1179x2556, 1206x2622, 1242x2688, 1260x2736, 1284x2778, 1290x2796, 1320x2868}-{light,dark}.png` | 22 PNG, 113 KB – 428 KB each (≈6.2 MB total) | iOS launch images (W + soft halo + «يومك جاهز») | 22 `<link rel="apple-touch-startup-image" media=…>` in `index.html` (scan: every file referenced, 0 broken) | yes | generated by `scripts/brand/generate-brand-assets.mjs` | available; excluded from the service-worker precache (`globIgnores: splash/**`); not verified on a real iPhone |
| `public/flutter.js` | JS 663 | Legacy shim: if a cached old Flutter `index.html` asks for it, redirect to a fresh URL (max 3 hops, via `sessionStorage`) | referenced only from the old cached page; listed in `globIgnores` | yes | owner code | **legacy shim** (intentional) |
| `public/flutter_bootstrap.js` | JS 663 | same shim | same | yes | | legacy shim |
| `public/main.dart.js` | JS 663 | same shim (replaces the 4 MB Flutter bundle) | same | yes | | legacy shim |
| `public/flutter_service_worker.js` | JS 1,507 | **Kill switch** for an old Flutter service worker at the same scope: skipWaiting, delete `flutter*` caches (never IndexedDB), unregister, navigate open windows to a fresh URL | fetched by the browser's SW update check | yes | | legacy shim; sunset date UNKNOWN (no removal criterion in code) |

Total `public/` = 6,412,105 bytes (6.1 MiB), 34 tracked files.

### 2.2 Assets under `src/`

| Path | Type / size | Purpose | Where used | In repo? | Licence | Status |
|---|---|---|---|---|---|---|
| `src/ui/screens/me/harlequin.svg` | SVG 283 | Violet diamond + white 4-point star tile (80×100) | `WeeklyReview.module.css:56` (`url('./harlequin.svg')`) | yes | owner pattern | available |
| `src/ui/screens/me/harlequin-night.svg` | SVG 283 | night variant of the tile | `WeeklyReview.module.css:74,81` | yes | owner pattern | available |
| `src/ui/screens/joy/harlequin.svg` | SVG 284 | same tile for Joy header | `JoyScreen.module.css:12` | yes | owner pattern | available (duplicate of the Me tile with a 1-byte difference) |
| `src/ui/components/wPath.ts` | TS string | W path (`W_PATH_D`, `W_VIEWBOX`, `W_RATIO`) | `WMark.tsx` | yes | owner artwork | available |
| `src/ui/components/StarMark.tsx` (`STAR_PATH`) | TS string | concave 4-point star | `StarMark`, `StarDottedLine`, etc. | yes | owner identity | available |
| `src/ui/icons/Icon.tsx` | TSX (54 inline outline icons) | UI icons | everywhere via `<Icon name>` | yes | in-house drawings (no icon library) | available |
| `src/ui/components/flowers/drawings.json` | JSON ≈ 0.3 MB (built chunk `drawings-*.js` 308,312 B) | 16 flower kinds × 5 stages = **80** drawings, 96×96 viewBox, ink = `currentColor`, fills Violet/Sky | `flowers.ts` (`loadDrawings()` lazy `import('./drawings.json')`), `sprite.ts` (SVG `<symbol id="wf-{kind}-{stage}">` in hidden `<svg id="wejdan-flower-sprite">`) | yes | owner/Claude-Design-generated artwork (provenance details UNKNOWN) | available |
| `src/domain/data/actions.json` | JSON 265,917 B · 132 entries = 109 actions + 23 engine rules (`ENG-*`; `tests/domain/repository.test.ts` asserts 109 + 23) | **Neutral** evidence/action library shipped in the public bundle (keys: `action_id, area, name_en, name_ar, what, dose, why, evidence_strength, sources, …`; no `priority_for_her`; grep for the owner's name/city → 0) | `seedLibrary.ts` (dynamic import, own chunk `actions-*.js`, cached by a runtime `CacheFirst` rule `wejdan-action-library`, not precached) | yes | Authored for the project; each item cites public sources (WHO/CDC/MOH etc.). **Redistribution terms of the cited sources: NOT VERIFIED** | available |
| `src/domain/data/actions_ar.json` | JSON 240,532 B · 132 entries (Arabic copy) | Arabic (Saudi dialect) copy for the same actions | `seedLibrary.ts` (chunk `actions_ar-*.js`) | yes | same | available |
| `tests/fixtures/migration/flutter_export_synthetic.json` (+ `flutter_ui_expected.json`) | JSON ≈ 72 KB | **Fully synthetic** Flutter-format export (same schema/counts/structure as a real one, invented generic titles) used by migration tests; replaced a real-derived fixture in `da4c839` | `tests/migration/flutterExport.test.ts` | yes | this project | available; `npm run privacy:scan` passes over it |
| `tests/fixtures/migration/flutter_ui_expected.json` | JSON 1,353 | expected UI values read from the Flutter build | same tests | yes | | available |
| `scripts/brand/generate-brand-assets.mjs` | MJS 5,388 | `npm run brand:assets` — draws icons, favicon, 22 splashes with `@resvg/resvg-js` | developer-run | yes | | build-time only |
| `scripts/brand/plex-sans-arabic-500-subset.ttf` | TTF 6,816 | glyph subset for the splash line | the script above | yes | OFL (IBM Plex Sans Arabic) | build-time only |
| `index.html` comment | — | named a non-existent Python generator (now corrected) | the generator is `scripts/brand/generate-brand-assets.mjs` | — | — | RESOLVED in the handoff branch (see 14 B2) |

No raster images, photos, videos, audio, Lottie or Rive files exist under `src/`. No `.woff/.ttf` font file is committed in the repo apart from the splash subset above (the app's fonts come from `node_modules` at build time).

### 2.3 Generated at build time (not in git)

| Output | Notes |
|---|---|
| `dist/assets/*.woff2` (72) / `*.woff` (36) | fontsource files, hashed names |
| `dist/assets/index-*.js` 401,148 B (≈ 135 kB gzip), `react-*.js` 153 kB, `motion-*.js` 135 kB, `actions-*.js` 234 kB, `actions_ar-*.js` 140 kB, `drawings-*.js` 308 kB | vite chunks (`manualChunks`: `react`, `motion`) |
| `dist/sw.js`, `dist/workbox-*.js` | `vite-plugin-pwa` (`registerType: 'prompt'`, `clientsClaim: false`, `skipWaiting: false`, `navigateFallback: /wejdan-os/index.html`) |
| `dist/manifest.webmanifest` | name/short_name «وجدان», `lang: ar`, `dir: rtl`, `display: standalone`, `orientation: portrait`, `scope`/`start_url`/`id` = `/wejdan-os/`, `theme_color #FFFFFF`, `background_color #F2F7FE`, 4 icons |

## 3. Broken-reference scan

Script (committed, runnable): `docs/handoff/tools/scan-asset-refs.mjs`.

```
node docs/handoff/tools/scan-asset-refs.mjs      # from the repo root; exit 1 on a broken reference
```

What it checks: relative `import … from`, dynamic `import()` and `require()` in `src/`, `scripts/`, `tests/` (resolving `.ts .tsx .js .css .json` and `index.*`); CSS `url()` and `@import`; HTML `href`/`src` in `index.html` (`/wejdan-os/…` mapped to `public/`); manifest/Workbox asset names in `vite.config.ts`; `@fontsource/*` CSS imports (resolved in `node_modules`). It then lists `public/` and `src/` image/font files whose path **and** base name appear nowhere in the scanned text.

Result on 2026-10-24:

```
files scanned: 341 · references checked: 1651 · broken: 0
assets with no textual reference (path or base name):
  (none)
```

Self-test (done): adding a temporary `import './nope'` and `url(./missing.png)` made the script report both as BROKEN with exit 1; the files were removed afterwards.

Limits of the scan: it does not follow string-built URLs, does not check runtime fetches (e.g. the `import('./drawings.json')` path is checked, but not the hashed output names), and treats "referenced by name somewhere" as used — so `public/brand/w-white.svg` counts as referenced (via `includeAssets` glob text `brand/*.svg` and the brand script) although nothing renders it at runtime.

## 4. Unused / questionable assets

| Asset | Finding |
|---|---|
| `public/brand/w-white.svg` | not used at runtime (kept as brand source; in precache) |
| `public/brand/w-ink.svg` | runtime-unused, build-time source for the raster script |
| `src/ui/screens/joy/harlequin.svg` vs `me/harlequin.svg` | near-duplicates (284 vs 283 bytes) |
| `public/flutter*.js`, `main.dart.js`, `flutter_service_worker.js` | intentional legacy shims, no removal date |
| `src/ui/screens/*/preview/index.html` + `preview.tsx` (4 harnesses: today, habits, notes, sources) | dev harnesses, not routed, not in the build; paths in their comments (`/wejdan-os/src/ui/screens/…`) work only under `vite dev` |
| `drawings.json` | 308 kB chunk precached for offline although only needed once flowers render |
| `index.html` comment referencing a non-existent Python generator | stale |

## 5. Libraries and licences (declared in the installed `package.json` of each package)

| Package | Version | Licence | Role |
|---|---|---|---|
| react, react-dom | 18.3.1 | MIT | UI |
| react-router-dom | 6.28.0 | MIT | hash routing |
| framer-motion | 11.11.17 | MIT | motion |
| dexie | 4.0.8 | Apache-2.0 | IndexedDB |
| adhan | 4.4.3 | MIT | prayer-time anchors (`domain/engine/anchors.ts`) |
| use-sync-external-store | 1.2.2 | MIT | store selectors |
| @fontsource/ibm-plex-sans-arabic, /ibm-plex-sans, /el-messiri | 5.1.0 | OFL-1.1 (fonts) | typography |
| vite 5.4.11, vite-plugin-pwa 0.21.1, @vitejs/plugin-react | MIT | build |
| typescript 5.6.3 | Apache-2.0 | types |
| vitest 2.1.5, jsdom 25.0.1, @testing-library/* | MIT | tests |
| fake-indexeddb 6.0.0 | Apache-2.0 | tests |
| playwright 1.47.2 | Apache-2.0 | e2e |
| ical.js 2.2.1 | **MPL-2.0** | tests only (`tests/domain/ics.test.ts`) — not bundled |
| @resvg/resvg-js 2.6.2 | **MPL-2.0** | build-time script only — not bundled |

Transitive dependency licences were **not** audited (no `license-checker` run). The project's own licence: no `LICENSE` file exists in the repo root (verified by `git ls-files`) — the code is therefore "all rights reserved" by default; the owner must decide before the repo is made public in a reusable form.

## 6. The owner's external resources (names only — no links, keys or tokens)

| Resource | Where it lives | Relation to the repo |
|---|---|---|
| Figma file key `pei6kBFtNKDcYAwPBG1gTN`, node `72:53` | Figma | the W monogram master; `public/brand/w-*.svg` are exports of it |
| Claude Design canvas «Wejdan Life OS — Redesign» (43 new boards added 2026-10-23; also older canvases titled «Wejdan Life OS — App Screens», all old "Calm Sky" look) | claude.ai Artifacts | approved screen designs; compared in 07 §11 |
| Wejdan design system artifact («Wejdan») and the identity brief | claude.ai / local-only files (not in the repo) | identity tokens (colour, type, motion) |
| Private action-library file (`kind: 'wejdan-action-library'`) | owner's device only | optional import in Settings; **not in the repo**; stored client-side only |
| Owner's content brief / routines / product lists | owner's private local files (not in the repo) | never in the repo; any private folder of the owner must not be copied |
| Public GitHub repository `wejdan0404/wejdan-os` (and its Pages site) | GitHub | deploy target; see 17_SECURITY_AND_LIMITATIONS.md for the exposure facts |
| Old Flutter build (same origin/path `/wejdan-os/`) | GitHub Pages history / local `build/web` | source of the legacy IndexedDB data (`wlo_*`) the app can migrate |

## 7. What to do when adding an asset

1. Put runtime-static files in `public/` (served under `/wejdan-os/`, reference with the `/wejdan-os/` prefix in HTML or relative `url()` in CSS imported by a module); put component-owned images next to the component (Vite hashes them).
2. Re-run `node docs/handoff/tools/scan-asset-refs.mjs`.
3. If the file must work offline, check it matches `globPatterns` and is not in `globIgnores` (`vite.config.ts`); large rarely-used files should use a runtime cache like `wejdan-action-library`.
4. Record the licence here. Never add a font file whose licence forbids public hosting (Thmanyah).
