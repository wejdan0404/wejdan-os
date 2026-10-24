# CODEX_START_HERE — Wejdan Life OS («وجدان»)

You are taking over a feature-complete personal PWA (independently gated up to gate 7, with open minors) with no prior context. This file is enough to get running and to know what you may and may not do. Depth is in `docs/handoff/` (23 files; index in `docs/handoff/00_HANDOFF_INDEX.md`). Rules are in `AGENTS.md`.

> بالعربي باختصار: التطبيق شخصي لوجدان، عربي RTL، بياناته على الجهاز فقط. القرارات المعتمدة منها تغلب أي برومبت عام (وضع فاتح وداكن، ألوان الهوية، خط IBM Plex Sans Arabic وEl Messiri). المستودع عام: لا بيانات شخصية. المهمة الأولى: تأكدي من الخط الأساسي بدون تغيير كود (القسم 5).

## 1. What this is (one paragraph)

A single-owner, Arabic-only, RTL planner PWA: Today (suggested day plan, nothing moves without her tap), Habits (flower garden, momentum, optional flexible streak), Path (projects, goals, IELTS, driving), Joy (sparks, rewards), Me (money, notes, search, weekly review, backup, settings). React 18 + TypeScript + Vite + Dexie (IndexedDB). No server, no accounts, no network calls, no analytics. Optional on-device lock with several profiles (AES-GCM-256). It replaced an earlier Flutter web build at the same GitHub Pages URL.

## 2. Current state (snapshot basis: `integ/features` @ `d982b01` merged into `docs/handoff`, 2026-10-24)

| Item | State | Evidence |
|---|---|---|
| Product features | Complete against the owner's decisions, plus the missing-features wave (areas A to G: weekly review, insights, Today tiers and calm day, money envelopes, joy map, focus recall, home tidy, evidence filter, Habit Studio wizard, onboarding life map, IELTS stats, driving mechanisms) | `docs/handoff/03_REQUIREMENTS_TRACEABILITY.md` |
| Type-check, tests, build, privacy scan | Green on this tree | `docs/handoff/13_TESTING_AND_QA.md` §2 and `22_COLD_START_AUDIT.md` |
| Independent QA gates | Gate 3 found D1 to D9, gate 4 = HOLD (N1 to N5), both fixed with tests (`eed6603`); gate 5 (independent) = SHIP with two open minors: LOS-040 (orphan plain DB / `_bak_` after a kill during turn-off) and LOS-041 (missing-data screen is a dead end); **gate 6 (wave) = SHIP, fixes `fc6bb39`; gate 7 = SHIP with two minors**: LOS-042 and LOS-043 (review-draft crash windows). Reports are local-only (PER-REPORT) | `14_BUGS_AND_TECH_DEBT.md` §1.2, LOS-002 |
| Live site | **Release 3 is live** per the integrator (the wave); `gh-pages` SHA `d2db69a`. Release 2 was `f7e1f75`. Not re-checked from this environment | `01_EXECUTIVE_SUMMARY.md` §3, LOS-001 Part B |
| Public GitHub push | **PLANNED, not done** (one clean snapshot commit on `react-app`; the local history is unpublished) | `15_DECISION_LOG.md` D-64, `21_FINAL_HANDOFF_REPORT.md` |
| Hand-run e2e | 9 of 12 scripts fail at the onboarding step (the app is fine; the scripts are stale) | LOS-044, `13_TESTING_AND_QA.md` §2 |
| ESLint | Cannot run (packages not declared) | LOS-037 |
| `npm audit` | 9 findings, 3 in the runtime router chain | LOS-033 |
| Real iPhone checks | Deferred by the owner for good | `17_SECURITY_AND_LIMITATIONS.md` |

Readiness for you: **READY WITH LIMITATIONS** (see `21_FINAL_HANDOFF_REPORT.md` §5 for the evidence and the limits).

## 3. Owner decisions that override any generic prompt

If a master prompt you were given says "predominantly dark UI", "Thmanyah font" or "charcoal/green palette", it does not apply here. The owner approved instead (`15_DECISION_LOG.md` D-59 and the override table at its end):

1. Light **and** dark themes (a theme choice in Settings).
2. Identity colours only: White `#FFFFFF`, Ink `#0E121C`, Sky `#BEDAF7`, Violet `#6172B5` (tokens in `src/ui/styles/tokens.css`).
3. IBM Plex Sans Arabic (body) + El Messiri (display), self-hosted via `@fontsource`. Thmanyah is **not** used: its licence forbids hosting the font files publicly.
4. Arabic RTL only, friendly Saudi dialect, no guilt wording.
5. Local-only storage; suggestion-mode day plan; momentum and sparks stay; flexible streak optional.
6. iOS and real-device testing are permanently deferred by the owner; never write "verified on device".

## 4. Hard limits (read before touching anything)

- Public repository: no personal data of any kind (routines, products, her personal action library, health items, backups, recovery codes, tokens, e-mail). Test data is named `test`.
- No force-push, no history rewrite, no merge to the default branch, no publish to `gh-pages`, no repository setting changes without the owner's explicit approval.
- Do not push the local history. The public version is a single clean snapshot (D-64).
- No new network code, colours, fonts or English UI text.
- Do not delete the Flutter takeover shims in `public/` (`flutter.js`, `flutter_bootstrap.js`, `flutter_service_worker.js`, `main.dart.js`).

## 5. Start here: set up and verify (first work item, no code changes)

Requires Node 22 and npm 10 (verified with v22.22.2 / 10.9.7). Run from the repo root of a **git clone** (the privacy scan reads `git ls-files`; it fails in a plain copy without `.git`).

```bash
npm ci
npx tsc --noEmit -p tsconfig.app.json      # expect exit 0 (bare "tsc --noEmit" would check nothing)
npm test                                   # expect: Test Files 77 passed, Tests 849 passed (about 2 minutes)
npm run build                              # expect: 712 modules transformed; precache 155 entries (about 2404 KiB)
npm run privacy:scan                       # expect: clean (exit 0)
npm run dev                                # open http://localhost:5173/wejdan-os/  (the base path is required)
```

Known behaviours: `npm ci` prints deprecation warnings and reports 9 audit findings (LOS-033); `npm test` prints React `act(...)` and React Router future-flag warnings (noise, not failures). If `RoutinePlayerScreen > walks every step and ends on the star` fails under load, re-run that file alone (`npx vitest run tests/ui/habits`) and record it (LOS-003). Do not try `npm run lint`: there is no such script. If anything differs from the expectations above, stop and report it using `AGENTS.md` §12; do not fix it silently.

Then write a short baseline note (Arabic summary first) with the exact numbers you saw. That is Phase 0 of `docs/handoff/19_NEXT_DEVELOPMENT_PLAN.md`.

## 6. Reading order (about 45 minutes)

1. `AGENTS.md` (rules, Definition of Done).
2. `docs/handoff/01_EXECUTIVE_SUMMARY.md`, then `02_PROJECT_VISION.md`.
3. `docs/handoff/15_DECISION_LOG.md` (D-01 to D-66).
4. `docs/handoff/18_REMAINING_BACKLOG.md` and `19_NEXT_DEVELOPMENT_PLAN.md`.
5. `docs/handoff/20_CODEX_EXECUTION_PLAYBOOK.md` (commands, e2e recipes, publishing checklist).
6. Reference when needed: `05` architecture, `06` codebase guide, `07` design system, `11` data and storage, `13` testing, `14` bugs, `17` security.

## 7. Code orientation (where to look first)

| Question | Look at |
|---|---|
| What can the UI call? | `src/domain/index.ts` header (the facade list) |
| How is state held? | `src/domain/store.ts`, `src/ui/state/LifeStore.tsx` |
| Tabs and routes | `src/ui/routes.tsx` (hash router, five tab roots) |
| Planner, momentum, sparks, resting, recovery | `src/domain/engine/` |
| Lock, profiles, encryption, recovery code | `src/domain/vault/vault.ts` (header comment explains the durability design), `src/ui/lock/` |
| Storage and schema (Dexie v2) | `src/domain/storage.ts`, `docs/handoff/11_DATA_STATE_AND_INTEGRATIONS.md` |
| Tokens and kit | `src/ui/styles/tokens.css`, `src/ui/components/` |
| Old Flutter data import | `src/domain/migration/flutterHive.ts`, `src/pwa/legacyCleanup.ts` |
| Tests | `tests/domain`, `tests/ui`, `tests/migration` (Vitest); `tests/e2e/*.mjs` (hand-run Playwright) |

## 8. What to do after Phase 0

Follow `19_NEXT_DEVELOPMENT_PLAN.md`: Phase 1 re-gate the merged tree (first LOS-044: repair the hand-run e2e scripts, then LOS-040 to LOS-043, then LOS-002), Phase 2 dependencies, licence and disclosure, Phase 3 release with the owner, Phase 4 owner decisions (flexible streak default, red delete buttons, personal library key, tab icons). Ask the owner only about items listed there as needing her decision.

## 9. How to report

Short, evidence-first: what you changed, the exact command results, what you could not verify, and open questions for the owner. No flattery, no guessing, no secrets in the report. Arabic summary on top when the report is for the owner.
