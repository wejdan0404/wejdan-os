> **ملخص**
> خطوات التشغيل من الاستنساخ إلى التثبيت فالتطوير فالاختبار فالبناء والمعاينة، وكل أمر موسوم VERIFIED (نُفّذ فعلاً) أو NOT VERIFIED.
> المسار الأساسي للتطبيق /wejdan-os/ (Vite base)، ولا توجد متغيرات بيئة؛ سكربتات e2e بـ Playwright تُشغَّل يدوياً على Chromium في /opt/pw-browsers/chromium.
> النشر على gh-pages من نسخة منفصلة خارج هذا المستودع، مع قواعد أمان؛ لم يُنفَّذ أي نشر أثناء إعداد هذه الوثيقة.

# 12 — Setup and environment

Legend: **VERIFIED** = run in this pass (2026-10-24, Linux sandbox, Node v22.22.2, npm 10.9.7, system timezone UTC), on the tree at `main` @ `ed0df23` + the handoff branch. **NOT VERIFIED** = written from reading code/config only. A clean-room run of the install/test/build commands from a fresh copy is recorded in `22_COLD_START_AUDIT.md`.

## 1. Prerequisites

| Need | Detail | Status |
|---|---|---|
| Node.js | v22.x (the pinned `@types/node` is 22.9.0; no `engines`/`.nvmrc` in the repo) | v22.22.2 VERIFIED to work; other majors NOT VERIFIED |
| npm | 10.x (lockfileVersion 3) | 10.9.7 VERIFIED |
| Git | for the worktree/branch workflow | — |
| Chromium (e2e only) | `/opt/pw-browsers/chromium` (symlink to build 1194) | VERIFIED present |
| Python 3 (only for `tests/e2e/sw-takeover/server.py`) | | NOT VERIFIED |
| Flutter SDK | **Not needed** — the Flutter app is a separate legacy repo; only its output shims live in `public/` | — |

Repository remote: the local repository used for this handoff has **no remote configured** (`git remote -v` prints nothing). The public repository is `https://github.com/wejdan0404/wejdan-os`; the React app is planned to appear there as a single snapshot commit on a new branch `react-app` (**PLANNED / UNVERIFIED** until the integrator pushes and fills the SHA into `HANDOFF_MANIFEST.json`). Its old `main` holds the Flutter app and must not be used as the base.

## 2. Install

| Command | Notes | Status |
|---|---|---|
| `git clone https://github.com/wejdan0404/wejdan-os.git wejdan-os-web && cd wejdan-os-web && git checkout react-app` | branch **PLANNED**, not pushed yet when this was written | NOT VERIFIED (use a local copy of the snapshot until the push is confirmed) |
| `npm ci` | Uses `package-lock.json`. Preferred for reproducibility. | VERIFIED in a clean copy without `node_modules` — see `22_COLD_START_AUDIT.md` §2 for the exact result |
| `npm install` | Alternative; may update the lockfile. | NOT VERIFIED |
| `ls node_modules` | In this worktree `node_modules` is a **symlink** to `<integrator checkout>/node_modules`; installing from a worktree would modify the main checkout's modules. | VERIFIED (`readlink -f`) |

Do **not** run `npm install eslint …` here to "fix lint" without deciding on the toolchain first: `eslint.config.js` needs `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint` and `eslint`, none of which are declared (see 10_DEPENDENCIES_AND_TOOLS.md). There is no `lint` script.

## 3. Day-to-day commands

| Purpose | Command | Result in this pass |
|---|---|---|
| Dev server | `npm run dev` (= `vite`) | VERIFIED with an explicit port: `npx vite --port 5199 --strictPort` → "ready in 788 ms", `http://localhost:5199/wejdan-os/` HTTP 200. Default port 5173 NOT VERIFIED (Vite default). **Open `/wejdan-os/`, not `/`.** Service worker is disabled in dev (`devOptions.enabled: false`). Vite printed "Re-optimizing dependencies because lockfile has changed" (cache dir inside the shared `node_modules/.vite`). |
| Dev-only pages | `http://localhost:<port>/wejdan-os/src/ui/screens/{today,habits,notes,sources}/preview/index.html?theme=dark#/today` | VERIFIED HTTP 200 for `today/preview/index.html`; `/#/me/kit` component gallery exists only in dev (`import.meta.env.DEV`). |
| Run all tests | `npm test` (= `vitest run`) | VERIFIED: **77 files, 849 tests passed** (≈100 s idle; expect ~1–3 min). |
| One test file | `npx vitest run tests/domain/ics.test.ts` | VERIFIED: 9 passed, 2.2 s wall. |
| Domain tests under another timezone | `TZ=Pacific/Kiritimati npx vitest run tests/domain` | VERIFIED in the first draft (30 files / 352 tests then); NOT re-run on the 32-file / 401-test domain suite. UI tests under other TZ: NOT VERIFIED. |
| Watch mode | `npx vitest` | NOT VERIFIED |
| Type check (correct) | `npx tsc --noEmit -p tsconfig.app.json` | VERIFIED exit 0 (~16 s) — checks `src` **and** `tests`. |
| Type check (the trap) | `npx tsc --noEmit` | VERIFIED exit 0 but **checks zero files** (`--listFilesOnly` prints nothing) because root `tsconfig.json` is `files: []` + references. Do not use it as a gate. |
| Production build | `npm run build` (= `tsc -b && vite build`) | VERIFIED exit 0: ~6 s, `precache 155 entries (2403.99 KiB)`. `tsc -b` writes `node_modules/.tmp/*.tsbuildinfo`. |
| Privacy scan | `npm run privacy:scan` | VERIFIED — see 13 §2. Run before any push/publish |
| Preview the build | `npm run preview` (= `vite preview`) | VERIFIED with `npx vite preview --port 4199 --strictPort`: `/wejdan-os/` 200, `/wejdan-os/sw.js` 200, `/` → 302 to `/wejdan-os/`. Use this (not dev) to test the PWA/service worker. |
| Regenerate icons/splash | `npm run brand:assets` | NOT VERIFIED — overwrites `public/icons/*`, `public/splash/*`, `apple-touch-icon.png`, `favicon-48.png` from `public/brand/w-*.svg`. |
| Lint | — | **Impossible** (see §2; LOS-037). |

Test-runner facts (from `vite.config.ts` and `tests/setup.ts`): environment `jsdom`; `globals: true`; include `tests/**/*.test.{ts,tsx}` and `src/**/*.test.{ts,tsx}` (there are none under `src/`); `css: false` (CSS Modules are not applied → layout/visual rules are checked by e2e, a few tests read CSS files as text, e.g. `toastPlacement.test.tsx`); `testTimeout: 20000`; RTL `asyncUtilTimeout: 5000` (lazy screens take time to transform on a loaded machine); stubs for `matchMedia`/`ResizeObserver`; IndexedDB comes from `fake-indexeddb/auto` imported per test file.

## 4. Base path, routing and environment variables

- **Base path:** `base: '/wejdan-os/'` in `vite.config.ts`. Also hard-coded in `index.html` (icon/splash `href="/wejdan-os/…"`), manifest `id`/`scope`/`start_url`, and workbox `navigateFallback: '/wejdan-os/index.html'`. Routing is `HashRouter` (`#/today`, …), so the host needs no rewrite rules. Moving the app to another path means editing all of those (VERIFIED by grep).
- **Environment variables: none.** No `.env*` files exist (`ls -a` at repo root), no `import.meta.env.*` besides Vite's built-in `DEV` (gates the `/kit` gallery in `src/App.tsx`, `src/ui/routes.tsx`, and a link in `MeScreen.tsx`), no `process.env` in `src/`. Secrets: none. API keys: none.
- `process.env` is used only by e2e scripts (§6).

## 5. Local data while developing

- Dev and preview each have their own origin (port) → their own IndexedDB/localStorage. Clearing site data resets the app to the neutral seed + onboarding.
- Use throw-away browser profiles for manual testing; name anything you create "test" (owner rule for test data).
- With the lock enabled in a profile, a forgotten password is only recoverable with the recovery code (there is no server): do not enable the lock in a browser profile that holds data you care about unless you keep the code.
- Never commit exported backups, `localStorage['wejdan.personalActionLibrary.v1']` content, or the owner's private action-library file. The public repo ships only the neutral library.

## 6. End-to-end scripts (Playwright, manual — not part of `npm test`)

All live in `tests/e2e/`. They `import('playwright')` (devDependency 1.47.2) unless `PLAYWRIGHT_MODULE` points elsewhere, start their own tiny static server on a fixed port over a built `dist/`, and launch **system Chromium**:

```js
chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--headless=new'] })
```

`legacyMigration.e2e.mjs` and `sw-takeover/swap.mjs` use `executablePath: '/opt/pw-browsers/chromium'` (hard-coded) with `args: ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']`. Contexts: mobile viewport 390×844, `isMobile`, `hasTouch`, `deviceScaleFactor: 2`; `toastClearance` and `streakRemindersLogo` also set locale `ar-SA`, timezone `Asia/Riyadh` and `serviceWorkers: 'block'`; `lockProfiles` uses `serviceWorkers: 'allow'` (it asserts offline reload); `legacyMigration` sets no locale/timezone.

| Script | Needs | Env (defaults) | Port | Run status |
|---|---|---|---|---|
| `toastClearance.e2e.mjs` | built `dist/` | `REACT_DIR` (`./dist`), `SHOTS` (`./e2e-shots`), `PORT`, `LABEL`, `CHROMIUM`, `REPORT_ONLY`, `DARK`, `REDUCED`, `PLAYWRIGHT_MODULE` | 5712 | **VERIFIED**: `SHOTS=<dir> node tests/e2e/toastClearance.e2e.mjs` → 27 PASS lines, 0 FAIL, "ALL PASSED", exit 0 on `ed0df23` (light; also `DARK=1 REDUCED=1`). **On `d982b01` it fails at onboarding (LOS-044).** |
| `lockProfiles.e2e.mjs` | built `dist/` | same family, `PORT` default 5713 | 5713 | **VERIFIED on `ed0df23`**: 71 PASS lines, 0 FAIL (light; the dark run had 70 on the earlier tree). **On `d982b01` it fails at onboarding (LOS-044).** long scenario (~3 min): lock, profiles, recovery, auto-lock, soft delay, offline reload |
| `lockKill.e2e.mjs` | built `dist/` | `REACT_DIR`, `PORT` (5714), `CHROMIUM`, `DELAYS_ENABLE` (150,600,2000,6000), `DELAYS` (100,300,600,1500,3000,8000 for turn-off / delete), `SCENARIOS`, `KINDS` | 5714 | **VERIFIED** on `ed0df23`: 375 PASS, 0 FAIL, exit 0 (about 15 min); **not re-run on `d982b01`**, it fails at onboarding (LOS-044) — SIGKILL of the browser during enable, turn-off and delete; data intact every time |
| `bidiGlyphOrder.e2e.mjs` | none (bundles `Bidi.tsx` with esbuild) | `CHROMIUM`, `SHOTS` | — | **VERIFIED** on `d982b01`: 20 PASS lines, 0 FAIL, exit 0 |
| `streakRemindersLogo.e2e.mjs` | built `dist/` | same family, `DARK`, `DEBUG_E2E`; pins time to 2026-10-07 16:50 | 5731 | **VERIFIED on `ed0df23`**: 33 PASS lines, 0 FAIL (light and `DARK=1`). **On `d982b01` it fails at onboarding (LOS-044).** |
| `reviewInsightsCelebrations`, `todayCalm`, `moneyJoy`, `featureD`, `studioOnboarding`, `ieltsDriving`, `joyOnboarding` (`*.e2e.mjs`, added by the wave) | built `dist/` | same family (`REACT_DIR`, `SHOTS`, `PORT`, `CHROMIUM`; default ports 5731 for most, 5733 `featureD`, 5741 `ieltsDriving`) | see file | **VERIFIED on `d982b01`**: `studioOnboarding` 23 PASS lines and `joyOnboarding` 17 PASS lines, 0 FAIL; `reviewInsightsCelebrations`, `todayCalm`, `moneyJoy`, `featureD`, `ieltsDriving` fail at onboarding (LOS-044) |
| `legacyMigration.e2e.mjs` | a **Flutter web build** dir (`FLUTTER_DIR`, not in this repo) + `REACT_DIR` | `PORT` default 5711 | 5711 | NOT VERIFIED (cannot run without the old build) |
| `sw-takeover/swap.mjs` + `server.py` | folder `$T` with `flutter/`, `flutter_cachingsw/`, `react/` (= `dist/`, files touched newer) and a `current` file; `python3 server.py 8931` then `T=$T node swap.mjs plain|cachingsw|expiredSubres` | `T` | 8931 | NOT VERIFIED; the README records a 2026-10-24 manual result |

Generic invocation (cwd = repo root, after `npm run build`):

```bash
SHOTS=/some/writable/dir PORT=<free port> node tests/e2e/<script>.e2e.mjs
# if 'playwright' does not resolve from the script's directory:
PLAYWRIGHT_MODULE="$PWD/node_modules/playwright/index.mjs" SHOTS=… node tests/e2e/<script>.e2e.mjs
```

Every record these scripts create is titled "test". Do not use ports 6400–6402 (reserved by the QA run) when working alongside it.

## 7. Deploying to GitHub Pages (`gh-pages`)

**Not executed in this pass; every step below is NOT VERIFIED.** The published site is a plain static copy of `dist/` on the `gh-pages` branch of the publishing GitHub repository, served at `https://<owner>.github.io/wejdan-os/` (hence `base: '/wejdan-os/'`). The `gh-pages` working tree lives in a **separate clone** — it is not part of this repository's tree and its location is not recorded anywhere in the repo (**UNKNOWN**; ask the owner). In an earlier session's checkout (observed read-only, not modified) the branch root contained exactly: `.nojekyll`, `index.html`, `sw.js`, `workbox-<hash>.js`, `manifest.webmanifest`, `assets/`, `icons/`, `brand/`, `splash/`, `apple-touch-icon.png`, `favicon-48.png`, and the four legacy shims `flutter_service_worker.js`, `flutter_bootstrap.js`, `flutter.js`, `main.dart.js` — i.e. `dist/` plus `.nojekyll` (a diff of file *names* against the fresh `dist/` showed only `.nojekyll` missing from `dist/`; contents differed because that checkout held an older build).

Procedure (proposal derived from that layout):

1. In this repo, on the commit to release: `npm test` and `npx tsc --noEmit -p tsconfig.app.json` must pass; `npm run build`.
2. Inspect `dist/` for sanity: `dist/index.html`, `dist/sw.js`, `dist/workbox-*.js` present; the four `flutter*`/`main.dart.js` shims present (they come from `public/`).
3. In the **gh-pages clone**: `git fetch origin && git checkout gh-pages && git pull --ff-only`.
4. Replace the contents (not the `.git` directory) with `dist/`: e.g. `rsync -a --delete --exclude=.git --exclude=.nojekyll "<repo>/dist/" "<gh-pages clone>/"` (the excludes matter: `--delete` would otherwise remove `.nojekyll`). Ensure `.nojekyll` exists.
5. `git add -A && git commit -m "Publish <short sha of source commit>" && git push origin gh-pages` — one commit, whole tree, so `index.html`, `sw.js`, `workbox-*.js` and the hashed `assets/` always match.
6. Wait for the Pages build; GitHub Pages serves with `Cache-Control: max-age=600`, so clients may see the previous `index.html` for up to ~10 minutes (the Flutter shims and `?r=` logic exist for exactly this).
7. Verify: `curl -sI https://<owner>.github.io/wejdan-os/sw.js` (200), load in a fresh browser profile (onboarding appears, no console errors), load in a profile that already has the app (update prompt «فيه تحديث جديد للتطبيق» appears; it must not reload by itself), and, if old Flutter installs matter, repeat the `sw-takeover` scenarios.

Safety rules:

- **Never** delete or rename `flutter_service_worker.js`, `flutter_bootstrap.js`, `flutter.js`, `main.dart.js` while any device may still run the old Flutter build: they are the kill-switch and redirect shims. Never add them to the precache (they are in `globIgnores`).
- **Never** publish from the local git history: the public source push is a single clean snapshot (`16` §0, `20` §6.1).
- **Never** touch IndexedDB deliberately in any release code path: the old `wlo_*` databases and the new `wejdan_life_os*` databases hold the owner's data; the migration relies on them surviving.
- Deploy `dist/` **atomically** (one commit); do not hand-edit `sw.js`, `workbox-*.js` or `index.html` on the branch.
- Publish only build output. Nothing from any private scratch folder, exported backups or the personal library file may enter the `gh-pages` tree (inspect `git status` / `git diff --stat` before pushing).
- Do not change `base` without also changing `index.html`, manifest and `navigateFallback`, and re-testing offline start-up.
- Do not run `npm run brand:assets` as part of a release unless the icons are meant to change.
- Do not force-push `gh-pages`; roll back by reverting the publish commit.
- Keep the app repo's `main` the source of truth; never develop on `gh-pages`.

## 8. Known environment pitfalls

| Pitfall | Detail | Status |
|---|---|---|
| `pkill -f` kills the shell | `pkill -f <pattern>` matches every process whose **command line** contains the pattern — including the shell/tool process that is running your own command (the pattern text is in its argv) — so it can kill the agent shell. Kill by PID instead: record `$!` when starting a server, or `ps aux \| grep '[v]ite'` and `kill <pid>`. | Reported by the owner; mechanism is standard `pkill` behaviour; the shell-kill itself NOT VERIFIED here. I stopped my servers with plain `kill <pid>` (VERIFIED, ports freed). |
| `ss`/`lsof` may be missing | `ss: command not found` in this sandbox; use `curl --max-time 2 -s -o /dev/null -w "%{http_code}" http://localhost:<port>/wejdan-os/` to probe a port. | VERIFIED |
| a11y tests flaky under load | `tests/ui/a11y/a11y.test.tsx` (7 tests) and other lazy-screen UI tests depend on timing; `tests/setup.ts` widens `asyncUtilTimeout` to 5 s for that reason. Reported flaky under heavy parallel load; in this pass they **passed** while the machine was running other agents. Re-run the single file before concluding a real failure. | Flakiness itself NOT VERIFIED |
| Full test run is slow | ≈103 s here on an idle machine (transform 3.3 s, setup 8.6 s, tests 40.6 s, environment 23.6 s, cumulative); the first draft measured 167–203 s while other jobs ran. | VERIFIED |
| False-green typecheck | `npx tsc --noEmit` checks nothing (see §3). | VERIFIED |
| Test noise | stderr shows React Router v7 future-flag warnings (tests use `MemoryRouter`) and `act(...)` warnings from Joy/Rewards/Ielts/Cards tests. They do not fail the run. | VERIFIED |
| Shared `node_modules` in worktrees | In the integrator's worktree `node_modules` is a symlink to another checkout (not the case in a normal clone); `npm ls` shows `extraneous` for transitives; Vite/`tsc -b` write caches there. Avoid `npm install`/`npm ci` from a worktree. | VERIFIED |
| Dev server and the service worker | SW is off in `vite dev`; offline/update behaviour only appears in `preview`/`dist`. After testing the PWA, unregister the worker and clear site data for that port or you will see stale builds. | Behaviour by config; staleness NOT VERIFIED |
| Port clashes | e2e scripts use 5711/5712/5713/5714/5731/8931; dev 5173; preview 4173 (Vite defaults NOT VERIFIED). QA uses 6400–6402. Use `--strictPort` so a clash fails loudly. | — |
| `dist/` is git-ignored | `git status` stays clean after a build (VERIFIED); never commit it to the app repo. | VERIFIED |
| `npm audit` | reports 9 issues (see 10 §4, LOS-033); `npm audit fix` would change versions — decide deliberately, never `--force`. | VERIFIED (report only) |
