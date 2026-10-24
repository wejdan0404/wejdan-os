> **ملخص**
> جدول بكل اعتماديات المشروع (10 تشغيلية + 17 تطويرية) مع النسخة المعلنة والمثبّتة فعلياً، والغرض، وأين تُستخدم، والمخاطر.
> أدوات البيئة: Node v22.22.2 وnpm 10.9.7؛ لا يوجد أمر lint لأن ملف eslint.config.js يستورد حزماً غير معلنة وغير مثبّتة (@eslint/js وغيرها).
> `npm audit` (2026-10-24، أُعيد تشغيله على الشجرة النهائية) يُبلغ عن 9 ثغرات: 3 منها في سلسلة react-router وقت التشغيل والباقي أدوات تطوير؛ لم تُقيَّم قابلية استغلالها (LOS-033).

# 10 — Dependencies and tools

Collected 2026-10-24 in a worktree of the local repository (branch `docs/handoff`, on top of `main` @ `ed0df23`); versions re-checked against `package.json` on the final tree (10 dependencies + 17 devDependencies, unchanged by gate 3). **Installed** versions come from `npm ls --depth=0`; the worktree's `node_modules` is a symlink to the main checkout's `node_modules` (`<integrator checkout>/node_modules`), which is why `npm ls --all` prints `extraneous` for transitive packages — an artefact of the symlink, not a project defect.

## 1. Runtime and package-manager

| Tool | Version here | Source of truth in repo | Note |
|---|---|---|---|
| Node.js | **v22.22.2** (`node -v`) | **UNKNOWN** — no `engines` field, no `.nvmrc`, no `.node-version` | `@types/node` is pinned to 22.9.0, so Node 22 is the implied target. |
| npm | **10.9.7** (`npm -v`) | `package-lock.json` `lockfileVersion: 3` | |
| TypeScript | 5.6.3 (installed) | `^5.6.3` | `tsc -b` is part of `npm run build`. |
| Browser for e2e | Chromium build 1194 at `/opt/pw-browsers/chromium` (symlink to `chromium-1194/chrome-linux/chrome`) | referenced by absolute path inside `tests/e2e/*.mjs` | Playwright package 1.47.2 does not download browsers here. |
| `gh` | not part of the repo | — | |

`npm ci --dry-run --ignore-scripts` printed "added 57 packages" in this symlinked environment; that figure is not meaningful here. A clean `npm ci` from the lockfile was **NOT VERIFIED** (running it would have modified the shared `node_modules`).

## 2. `dependencies` (10)

| Package | Declared | Installed | Purpose | Where used (grep) | Risks / notes |
|---|---|---|---|---|---|
| `@fontsource/el-messiri` | `^5.1.0` | 5.1.0 | Display font (Arabic), weights 500/700 | `src/ui/fonts.ts` | Latest 5.3.0 (minor). OFL, self-hosted; comment in `fonts.ts` forbids a font whose licence prohibits hosting. |
| `@fontsource/ibm-plex-sans` | `^5.1.0` | 5.1.0 | Latin text font 400/500/600 | `src/ui/fonts.ts` | Latest 5.3.0. Cyrillic/greek/vietnamese subsets are excluded from precache. |
| `@fontsource/ibm-plex-sans-arabic` | `^5.1.0` | 5.1.0 | Arabic text font 400–700 | `src/ui/fonts.ts`; two faces preloaded in `vite.config.ts` | Latest 5.3.0. Preload regexes in `vite.config.ts` depend on fontsource file naming (`ibm-plex-sans-arabic-arabic-400-normal-*.woff2`); a fontsource rename silently drops the preload. |
| `adhan` | `4.4.3` (exact) | 4.4.3 | Offline prayer times (Umm al-Qura) for optional prayer anchors | `src/domain/engine/anchors.ts` only | Feature is off by default. Latest 4.4.6. |
| `dexie` | `4.0.8` (exact) | 4.0.8 | IndexedDB wrapper — the only persistence layer | `src/domain/storage.ts` (+ vault tests) | Latest 4.4.7. Two tables (`records`, plaintext `vault` header) at schema `version(2)`; any index change needs a `version(3)` migration. |
| `framer-motion` | `^11.11.17` | 11.11.17 | Animations (sheets, stack, toast, springs); `MotionConfig reducedMotion="user"` | 41 files in `src/ui` + `src/App.tsx` | Latest 14.x (major behind); `manualChunks.motion` = 134.85 kB raw / 45.04 kB gz. Bundle-size heavy for what it does. |
| `react` | `^18.3.1` | 18.3.1 | UI | everywhere | React 19 exists; app uses `StrictMode`, `lazy`, `useSyncExternalStore`. |
| `react-dom` | `^18.3.1` | 18.3.1 | UI | `main.tsx`, `src/pwa/index.tsx` (second root), `Toast.tsx` portal | |
| `react-router-dom` | `^6.28.0` | 6.28.0 | `HashRouter`, `Routes`, `useLocation/useNavigate` | 32 files in `src`, 18 in `tests` | `npm audit` flags `react-router`/`@remix-run/router` (open-redirect advisories, range ≤ 6.30.2; fix = upgrade within 6.x). Relevance to a hash-router app with no server redirects **not assessed**. Test output prints v7 future-flag warnings; `App.tsx` already opts in `v7_startTransition`, `v7_relativeSplatPath` for the real app but tests use `MemoryRouter` without flags. |
| `use-sync-external-store` | `^1.2.2` | 1.2.2 | `useSyncExternalStoreWithSelector` | `src/ui/state/LifeStore.tsx` | Shim package; React 18 already has the base hook, only the `/with-selector` entry is needed. |

## 3. `devDependencies` (17)

| Package | Declared | Installed | Purpose | Where used | Risks / notes |
|---|---|---|---|---|---|
| `@resvg/resvg-js` | `^2.6.2` | 2.6.2 | Rasterise the W logo SVG to PNG icons/splash | `scripts/brand/generate-brand-assets.mjs` (`npm run brand:assets`) | Native binary per platform. Script overwrites files in `public/`. Not run in this pass. |
| `@testing-library/dom` | `^10.4.0` | 10.4.0 | Peer of RTL | indirect (no direct import in `tests/`) | Latest 10.4.2. |
| `@testing-library/jest-dom` | `^6.6.3` | 6.6.3 | DOM matchers | `tests/setup.ts`, `tsconfig.app.json` types | Latest 7.0.1 (major). |
| `@testing-library/react` | `^16.0.1` | 16.0.1 | Component testing | 26 test files | Latest 16.3.3. |
| `@types/node` | `22.9.0` (exact) | 22.9.0 | Types for `vite.config.ts` and `node:fs/path` in one test (`tests/ui/toastPlacement.test.tsx`) | — | The `node:fs`/`node:path` import in that test type-checks (build exit 0, `tsc -p tsconfig.app.json` exit 0). |
| `@types/react` | `^18.3.12` | 18.3.12 | Types | — | |
| `@types/react-dom` | `^18.3.1` | 18.3.1 | Types | — | |
| `@types/use-sync-external-store` | `^0.0.6` | 0.0.6 | Types for the shim | — | |
| `@vitejs/plugin-react` | `^4.3.4` | 4.3.4 | React Fast Refresh/JSX for Vite | `vite.config.ts` | Latest 6.x. |
| `fake-indexeddb` | `6.0.0` (exact) | 6.0.0 | IndexedDB in vitest/jsdom | `import 'fake-indexeddb/auto'` in 4+ tests; `IDBFactory` in `legacyReoffer`/`legacyMigration` tests | Real browsers differ in details (comment in a test notes a version-0 shell after aborted creation). |
| `ical.js` | `^2.2.1` | 2.2.1 | Parse the generated `.ics` back to prove validity | `tests/domain/ics.test.ts` only | Test-only; proves RFC 5545 parsing, not a specific calendar app. |
| `jsdom` | `^25.0.1` | 25.0.1 | Vitest DOM environment | `vite.config.ts` `test.environment: 'jsdom'` | Latest 30.x. No layout engine → CSS/layout assertions are done via e2e instead. |
| `playwright` | `^1.47.2` | 1.47.2 | e2e scripts (not in vitest) | `tests/e2e/*.mjs` | `npm audit` high: browser download without SSL verification (range < 1.55.1) — affects `playwright install`, which this repo never runs (browser comes from `/opt/pw-browsers`). Latest 1.64.1. |
| `typescript` | `^5.6.3` | 5.6.3 | Type checking | `tsc -b` in build | Latest 5.9.3 within caret. |
| `vite` | `^5.4.11` | 5.4.11 | Dev server + bundler | `vite.config.ts` | `npm audit` high/moderate on dev server (`server.fs.deny` bypass, cross-origin requests to the dev server; esbuild ≤ 0.24.2 installed as 0.21.5). Dev-only exposure; never run `vite` dev on an untrusted network. Latest 8.x. |
| `vite-plugin-pwa` | `^0.21.1` | 0.21.1 | Workbox `generateSW`, manifest, `virtual:pwa-register` | `vite.config.ts`, `src/pwa/index.tsx`, `src/vite-env.d.ts` | Pulls `workbox-build` 7.4.1 / `workbox-window` 7.4.1. Latest 2.0.0. Generates `sw.js` + `workbox-<hash>.js`. |
| `vitest` | `^2.1.5` | 2.1.5 | Test runner | `npm test` | `npm audit` critical for `vitest` ≤ 4.1.10 / `tinypool` ≤ 2.1.1 (RCE when the Vitest **API/UI server** is exposed; this repo runs `vitest run` only). Latest 5.x. |

Not declared anywhere although imported by `eslint.config.js`: `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`, and `eslint` itself. `ls node_modules/.bin | grep eslint` → nothing; `ls node_modules/@eslint` → "No such file". **Lint cannot run**, there is no `lint` script, and the code contains `// eslint-disable-next-line react-hooks/exhaustive-deps` comments that assume the rule set. Not installed here on purpose (no installs were made).

No coverage provider (`@vitest/coverage-v8`) and no formatter (prettier/biome) are installed.

## 4. Security audit snapshot (`npm audit --json`, 2026-10-24, via the sandbox proxy)

Totals (re-run on the final tree): **9** vulnerabilities — 2 moderate, 5 high, 2 critical (0 low); `npm audit --omit=dev` lists only the 3 `react-router*` highs. Tracked as LOS-033. By package:

| Package | Severity | Direct? | Class |
|---|---|---|---|
| `vitest` (→ `@vitest/mocker`), `tinypool` | critical / moderate | vitest direct | Dev test tooling (RCE/arbitrary file read only when the Vitest server is listening). |
| `vite`, `esbuild` | high / moderate | vite direct | Dev server request/read bypasses. |
| `playwright` | high | direct | Browser download TLS verification. |
| `react-router-dom`, `react-router`, `@remix-run/router` | high | react-router-dom direct | **Runtime dependency**; open-redirect advisories on `<Link>`/`useNavigate`/redirects; `fixAvailable: true` (upgrade to a patched 6.x or 7.x). |

Relevance of each advisory to this app's actual usage was **not assessed**. Remediation (upgrade within current majors where possible, re-run all tests and the PWA build) is a separate task; no `package.json` change was made by this documentation work.

## 5. npm scripts (all in `package.json`)

| Script | Command | Verified |
|---|---|---|
| `dev` | `vite` | VERIFIED (ran `npx vite --port 5199 --strictPort`: served `/wejdan-os/` HTTP 200) |
| `build` | `tsc -b && vite build` | VERIFIED (exit 0) |
| `preview` | `vite preview` | VERIFIED (ran `npx vite preview --port 4199 --strictPort`: `/wejdan-os/` 200, `/wejdan-os/sw.js` 200) |
| `test` | `vitest run` | VERIFIED (77 files / 849 tests passed) |
| `privacy:scan` | `node scripts/privacy-scan.mjs` | VERIFIED (see 13 §2) |
| `brand:assets` | `node scripts/brand/generate-brand-assets.mjs` | NOT VERIFIED (would overwrite `public/` images) |
| *(none)* `lint`, `typecheck`, `e2e` | — | do not exist |

## 6. Build output facts (from the run)

- Vite 5.4.11; build ~6 s on an idle machine (first draft: ~13 s loaded).
- Largest chunks (raw / gzip, final tree): `index` 422.68 / 143.74 kB, `drawings` (flowers) 308.31 / 17.80 kB, `actions` 231.12 / 69.46 kB, `react` 153.37 / 50.35 kB, `actions_ar` 139.78 / 59.12 kB, `motion` 134.85 / 45.04 kB.
- PWA: `precache 155 entries (2403.99 KiB)`; the two action-library chunks are intentionally outside precache.
- `dist/` 9.7 MB (includes `splash/` 22 PNGs and the four `flutter*`/`main.dart.js` shims).
