# 00 — Handoff Index (Wejdan Life OS)

> **ملخص**
> هذي الحزمة تسلّم مشروع «وجدان» (تطبيق ويب PWA بـ React) لوكيل برمجة جديد بدون أي سياق سابق.
> كل جملة فيها مبنية على الكود أو git أو تقارير الفحص؛ وأي شي ما اتحقق منه مكتوب صراحةً `UNKNOWN` أو `NOT VERIFIED`.
> الحزمة ما فيها بيانات شخصية (المستودع عام)؛ القرارات المعتمدة من المالكة تغلب أي برومبت عام.

Snapshot basis: `main` @ `ed0df23` (includes the gate-3 and gate-4 fixes) plus the handoff branch `docs/handoff` (2026-10-24). Everything below describes that tree unless stated otherwise. The commit hashes quoted in these docs are **local, unpublished** history; the public push will be one clean snapshot commit (see `16_DEVELOPMENT_HISTORY.md` §0 and `15_DECISION_LOG.md` D-64).

## 1. What this package is

An evidence-based engineering handoff for **Wejdan Life OS** (Arabic product name «وجدان»): a personal day-planner / habits / projects / joy / money PWA for one owner (Wejdan), built with React 18 + TypeScript + Vite, storing everything on the device (IndexedDB via Dexie). It replaced an earlier Flutter web build at the same GitHub Pages URL.

- Live URL: https://wejdan0404.github.io/wejdan-os/ (release 2: `gh-pages` @ `f7e1f75`, a build of `main` @ `ed0df23`, per the integrator; see `01_EXECUTIVE_SUMMARY.md` §3)
- Repo (PUBLIC): https://github.com/wejdan0404/wejdan-os (old Flutter code and data still exist on its `main` branch; left as-is by the owner's choice). The React source is planned to go to branch `react-app` as one snapshot commit: **PLANNED, UNVERIFIED** until the integrator records branch + SHA in `HANDOFF_MANIFEST.json` and `21_FINAL_HANDOFF_REPORT.md`.
- Audience: an engineering agent (OpenAI Codex) with no prior context. The owner reads the Arabic summary at the top of each file.

## 2. Files in this package

Start with the three root files, then the numbered documents.

| File | Read it to learn |
|---|---|
| [`../../README.md`](../../README.md) | Project summary, verified commands, repository map (English plus short Arabic) |
| [`../../CODEX_START_HERE.md`](../../CODEX_START_HERE.md) | Orientation, current state, owner decisions that override generic prompts, first work item |
| [`../../AGENTS.md`](../../AGENTS.md) | Working rules for coding agents, Definition of Done |
| [`00_HANDOFF_INDEX.md`](00_HANDOFF_INDEX.md) | This index |
| [`01_EXECUTIVE_SUMMARY.md`](01_EXECUTIVE_SUMMARY.md) | State of the product in one page |
| [`02_PROJECT_VISION.md`](02_PROJECT_VISION.md) | Why the product exists, who it is for, what it must never do |
| [`03_REQUIREMENTS_TRACEABILITY.md`](03_REQUIREMENTS_TRACEABILITY.md) | Requirement, code, evidence, status (R-001 to R-090) |
| [`04_CURRENT_IMPLEMENTATION.md`](04_CURRENT_IMPLEMENTATION.md) | What exists today, area by area, with verification table |
| [`05_SYSTEM_ARCHITECTURE.md`](05_SYSTEM_ARCHITECTURE.md) | Layers, boot sequence, vault/lock design, state flow |
| [`06_CODEBASE_GUIDE.md`](06_CODEBASE_GUIDE.md) | Directory-by-directory guide with real counts |
| [`07_DESIGN_SYSTEM.md`](07_DESIGN_SYSTEM.md) | Tokens, type, kit, motion, Arabic/bidi rules, fidelity vs boards |
| [`08_SCREENS_AND_USER_FLOWS.md`](08_SCREENS_AND_USER_FLOWS.md) | Screens, routes, flows, screenshot table |
| [`09_ASSETS_AND_RESOURCES.md`](09_ASSETS_AND_RESOURCES.md) | Asset manifest: icons, splash, fonts, data files, fixtures |
| [`10_DEPENDENCIES_AND_TOOLS.md`](10_DEPENDENCIES_AND_TOOLS.md) | Dependencies, licences, tooling, audit |
| [`11_DATA_STATE_AND_INTEGRATIONS.md`](11_DATA_STATE_AND_INTEGRATIONS.md) | Storage map, schema, localStorage inventory, import/export |
| [`12_SETUP_AND_ENVIRONMENT.md`](12_SETUP_AND_ENVIRONMENT.md) | Install, run, build, deploy facts, environment gotchas |
| [`13_TESTING_AND_QA.md`](13_TESTING_AND_QA.md) | Exact test results, coverage map, QA report history |
| [`14_BUGS_AND_TECH_DEBT.md`](14_BUGS_AND_TECH_DEBT.md) | Known defects and debt, gate-3 resolution table |
| [`15_DECISION_LOG.md`](15_DECISION_LOG.md) | Owner decisions D-01 to D-66 and the override table |
| [`16_DEVELOPMENT_HISTORY.md`](16_DEVELOPMENT_HISTORY.md) | Local commit-level history (unpublished) |
| [`17_SECURITY_AND_LIMITATIONS.md`](17_SECURITY_AND_LIMITATIONS.md) | Threat model, vault design and residuals, repo exposure, audit |
| [`18_REMAINING_BACKLOG.md`](18_REMAINING_BACKLOG.md) | Open and done items (LOS-001 to LOS-039) |
| [`19_NEXT_DEVELOPMENT_PLAN.md`](19_NEXT_DEVELOPMENT_PLAN.md) | Suggested order of work (Phase 0 is the first task) |
| [`20_CODEX_EXECUTION_PLAYBOOK.md`](20_CODEX_EXECUTION_PLAYBOOK.md) | Commands, e2e recipes, approvals, publishing checklist |
| [`21_FINAL_HANDOFF_REPORT.md`](21_FINAL_HANDOFF_REPORT.md) | Final report: GitHub status, quality results, blockers, readiness |
| [`22_COLD_START_AUDIT.md`](22_COLD_START_AUDIT.md) | Result of following the start instructions from zero |
| [`HANDOFF_MANIFEST.json`](HANDOFF_MANIFEST.json) | Machine-readable manifest |
| [`tools/capture-screens.mjs`](tools/capture-screens.mjs), [`tools/scan-asset-refs.mjs`](tools/scan-asset-refs.mjs), [`tools/check-docs.mjs`](tools/check-docs.mjs) | Screenshot capture, asset reference scan, doc link/path/count checker |
| [`screenshots/`](screenshots/) | 29 PNG screenshots (390x844) referenced from 08 |

Suggested reading order: README, CODEX_START_HERE, AGENTS, 01, 02, 15, 03, 18, 19, 20, then the reference files (04 to 14, 16, 17) as needed.

## 3. Hard rules (apply to every task)

These come from the owner's approved decisions (see `15_DECISION_LOG.md`) and win over any generic master prompt.

1. **Identity colours only:** White `#FFFFFF`, Ink `#0E121C`, Sky `#BEDAF7`, Violet `#6172B5` (plus their scales and status colours). Source: `src/ui/styles/tokens.css` header comment. Do not introduce a new accent.
2. **Light AND dark themes** (Settings has a theme choice; a dark-only app is wrong).
3. **Arabic, RTL only.** `index.html` is `lang="ar" dir="rtl"`. No visible English UI, no language switch.
4. **Friendly Saudi dialect, no guilt wording.**
5. **Fonts:** IBM Plex Sans Arabic (body) + El Messiri (display), self-hosted via `@fontsource`. **Thmanyah is NOT used** (its licence forbids hosting the font files publicly). See `src/ui/fonts.ts`.
6. **Day plan is suggestion mode:** nothing is added, moved or trimmed without her action; postponed items stay visible in «بعدين».
7. **Motivation:** momentum + sparks + rewards stay; optional flexible streak; one flower per category with 5 growth stages; the concave 4-point star only for achievement/evidence; no guilt mechanics.
8. **Local-only:** no server, no cloud accounts, no analytics, no sync, no external API calls. A grep for `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource` in `src/` (excluding the JSON data folder) returned no hits when this file was written. The optional lock/profiles are on-device only.
9. **iOS/Xcode/real-device testing is permanently deferred by the owner.** Do not ask for it and do not mark anything "device-verified". Items that need a real iPhone are recorded as `DEFERRED-BY-OWNER`.
10. **Public repo hygiene:** never commit personal data, her personal action library, routine/product import contents, health or women's-health items, recovery codes, tokens or e-mail. A private on-device import path exists (Settings, «استيراد مكتبتي الشخصية»); its contents are not in this repo and must not be.
11. **Test data is named `test`.**
12. **No force-push, no history rewrite, no push to `main`, no publish to `gh-pages` without explicit owner approval** (details in `20_CODEX_EXECUTION_PLAYBOOK.md`). The local history is unpublished; only a clean snapshot goes public (D-64).
13. **Run `npm run privacy:scan`** before anything leaves the machine, and never put a real personal value into `scripts/privacy-denylist.txt`.
14. **Owner decisions beat the generic master prompt** (D-59): light and dark, identity colours, IBM Plex Sans Arabic + El Messiri; no Thmanyah (licence).

## 4. Evidence vocabulary used in every file

| Label | Meaning |
|---|---|
| `VERIFIED-NOW` | The author read the code or ran a command during this handoff and saw the stated result. |
| `PER-REPORT` | Stated by a QA/agent report in the owner's local session scratchpad (local-only, not part of the repo). The report file is named; it was not re-run. |
| `UNKNOWN` / `NOT VERIFIED` | No evidence found. Do not assume. |
| `NOT APPLICABLE` | Does not apply to this architecture. |
| `DEFERRED-BY-OWNER` | Owner explicitly postponed it (all iOS/Xcode/device checks). |

Scratchpad QA reports (`release-gate*.md`, `area1…7*.md`, `a11y-report.md`, `perf-report.md`, `privacy-report.md`) live outside the repo (the session local-only report (not in repo): local-only, not in this repo, not published) and are **not** in this branch. Where a claim relies on them it is labelled `PER-REPORT`. **NOT VERIFIED:** that these files will remain available.

## 5. Verified facts about the repo (VERIFIED-NOW)

| Fact | Evidence |
|---|---|
| Stack: React 18.3, react-router-dom 6 (hash routes), Framer Motion 11, Dexie 4.0.8, adhan 4.4.3, Vite 5.4, vite-plugin-pwa 0.21, Vitest 2.1 | `package.json` |
| Scripts: `dev`, `build` (`tsc -b && vite build`), `preview`, `test` (`vitest run`), `brand:assets`, `privacy:scan`. No `lint` script | `package.json` |
| Base path `/wejdan-os/`, PWA `registerType: 'prompt'`, hash routing | `vite.config.ts`, `src/ui/routes.tsx` header |
| 5 tab roots: today, habits, path, joy, me | `src/ui/routes.tsx` |
| Domain code under `src/domain` does not import React (`grep "from 'react'" src/domain` has no hit); the UI is meant to use the facade documented at the top of `src/domain/index.ts` | `src/domain/index.ts` |
| No `.github/` directory (no CI) | `ls .github` fails |
| Test layout: `tests/domain`, `tests/ui`, `tests/migration` (Vitest) and `tests/e2e/*.mjs` (Playwright scripts, run by hand, not wired into `npm test`) | `ls tests`, `package.json` |
| Local run on this tree: tsc exit 0; `npm test` 63 files / 726 tests passed; build 650 modules; `privacy:scan` clean | `13_TESTING_AND_QA.md` §2, `22_COLD_START_AUDIT.md` |
| `public/` still contains `flutter.js`, `flutter_bootstrap.js`, `flutter_service_worker.js`, `main.dart.js` | `ls public` — these are the **takeover shims** that let the React build replace Flutter on returning devices (`src/pwa/legacyCleanup.ts`). Do not delete them without reading `15_DECISION_LOG.md` D-36. |

## 6. Where things are in the repo

| Area | Path |
|---|---|
| Domain model, store, selectors | `src/domain/models.ts`, `store.ts`, `selectors.ts`, `index.ts` |
| Engines (planner, momentum, sparks, reminders, recovery…) | `src/domain/engine/` |
| Features (notes, Arabic search, change log, sources/import) | `src/domain/features/` |
| Legacy Flutter-data migration | `src/domain/migration/flutterHive.ts` |
| Storage (Dexie, in-memory fallback) | `src/domain/storage.ts` |
| Lock + profiles crypto | `src/domain/vault/` (domain), `src/ui/lock/` (UI) |
| Calendar export (.ics), in-app reminders, backup nudge | `src/domain/ics.ts`, `inAppReminders.ts`, `reminderSelectors.ts`, `backupReminder.ts` |
| Screens | `src/ui/screens/{today,habits,path,joy,me,notes,sources,reminders}/` |
| Shared components | `src/ui/components/` (flowers in `components/flowers/`) |
| Tokens and global styles | `src/ui/styles/` |
| PWA runtime | `src/pwa/` |
| Brand asset generator | `scripts/brand/generate-brand-assets.mjs` (`npm run brand:assets`) |
| Tests | `tests/` |
