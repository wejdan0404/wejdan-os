# AGENTS.md — working rules for coding agents (Wejdan Life OS)

Scope: the whole repository. Read `CODEX_START_HERE.md` first for orientation and `docs/handoff/15_DECISION_LOG.md` for the owner's decisions. This file is the rulebook; where it says MUST, a violation is a defect, not a style choice.

Evidence labels used in the docs: `VERIFIED-NOW`, `PER-REPORT`, `UNKNOWN` / `NOT VERIFIED`, `DEFERRED-BY-OWNER`. Do not turn an `UNKNOWN` into a claim.

## 1. Commands (all verified; run from the repo root)

| Purpose | Command |
|---|---|
| Install | `npm ci` |
| Dev server | `npm run dev` then open `http://localhost:5173/wejdan-os/` (base path matters) |
| Type-check | `npx tsc --noEmit -p tsconfig.app.json` (bare `tsc --noEmit` checks nothing: the root tsconfig only has references) |
| Tests | `npm test` (77 files / 849 tests, about 2 minutes); one area: `npx vitest run tests/ui/habits` |
| Build | `npm run build` (runs `tsc -b` then `vite build`) |
| Privacy scan | `npm run privacy:scan` (MUST pass before every commit that goes beyond your machine) |
| Lint | **Not available** (`eslint` packages are not declared; LOS-037). Do not claim lint passed |
| e2e | Hand-run Playwright scripts in `tests/e2e/`, see `docs/handoff/20_CODEX_EXECUTION_PLAYBOOK.md` §2 |

## 2. Architecture boundaries

1. `src/domain/` is framework-free. It MUST NOT import React, anything under `src/ui/`, or `src/pwa/`. Check with `grep -rn "from 'react'\|/ui/" src/domain` (expect nothing).
2. `src/ui/` talks to the domain only through the facade `src/domain/index.ts` (relative import such as `../../../domain`; there is no `@/` alias). Do not deep-import `src/domain/engine/*` or `storage.ts` from screens.
3. State flow: UI event, then a store method (async, write-through to IndexedDB), then a new immutable snapshot, then `useSyncExternalStore` re-render. Do not keep a second source of truth in component state for persisted data.
4. Rules of the product (planner, momentum, sparks, resting, recovery, payday) live in `src/domain/engine/`. A UI file that re-implements a rule is wrong; add it to the engine with a test.
5. `src/domain/vault/` (lock) and `storage.ts` hold the data-safety logic. Changes there need tests in `tests/domain/vault*.test.ts` plus the fault-injection hooks (`VaultHooks.step`, `SimulatedCrash`) for anything that writes during migration. Never weaken a durability or compare-and-set check to make a test pass.
6. Do not add network code (`fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`) to `src/`. The app is local-only by decision (D-32).

## 3. Naming and structure

- Components: `PascalCase.tsx` with a sibling `PascalCase.module.css`. Hooks `useX`. Domain files `camelCase.ts`. Tests mirror the source path under `tests/` and end in `.test.ts(x)`.
- Screens live in `src/ui/screens/<area>/` (today, habits, path, joy, me, notes, sources, reminders); shared pieces in `src/ui/components/`; lock UI in `src/ui/lock/`.
- Code identifiers and comments are English. Every visible string is Arabic.
- Records use string ids; do not assume their format (LOS-034).
- Keep changes small and single-purpose; do not refactor `src/domain` or the store in bulk (849 tests are built around its current shape).

## 4. Arabic, RTL and copy

1. The app is Arabic only, `lang="ar" dir="rtl"` on `index.html`. No English UI text, no language switch.
2. Use logical CSS properties (`margin-inline-start`, `inset-inline-end`, `text-align: start`). Physical left/right is allowed only for things that are not directional in meaning (for example a physical gesture) and needs a comment.
3. Mixed text: numbers, ranges, usernames and amounts that sit inside Arabic MUST be isolated. Use `src/ui/components/Bidi.tsx` / `lib/textDir.ts` / `<bdi>`; thousands separators must stay in one LTR run. Tests: `tests/ui/today/bidiF1.test.ts`, `tests/e2e/bidiGlyphOrder.e2e.mjs`.
4. Tone: friendly Saudi dialect, warm, short, second person feminine (the owner), no guilt, no shaming, no commands that sound like failure ("فشلتي", "تأخرتي"). Say what is available next, not what was missed.
5. Plural and count agreement go through `src/ui/lib/plural.ts`. Do not concatenate "N + noun" by hand.
6. Do not machine-translate or invent medical, legal, religious or financial claims. Copy changes that touch health, money or lock/recovery wording need owner review (list them in your report).
7. Typed amounts are parsed by `parseAmount` in `src/ui/lib/number.ts` (accepts Arabic-Indic and Persian digits and separators); reuse it for any new numeric input instead of `Number(...)`.

## 5. UI kit, tokens and identity (decisions D-59 and the design decisions override any generic prompt)

1. Colours come only from `src/ui/styles/tokens.css`: White `#FFFFFF`, Ink `#0E121C`, Sky `#BEDAF7`, Violet `#6172B5`, their scales and the status colours already defined. No new accent, no raw hex in a component CSS file, no gradients that introduce another hue.
2. Both themes are required: light and dark (plus reduced motion). A change is not done until it is checked in both. A dark-only reading of the generic master prompt is wrong (D-59).
3. Fonts: IBM Plex Sans Arabic (body) and El Messiri (display), self-hosted from `@fontsource` (`src/ui/fonts.ts`). Do not add the Thmanyah font: its licence forbids hosting the files publicly.
4. Use the existing kit in `src/ui/components/` (Button, Chip, Sheet, Switch, Toast, ListRow, InsetGroupedList, SegmentedControl, EmptyState, Skeleton, ...). Before adding a component, look for one that already does the job. The dev-only gallery is `#/me/kit` (dev builds only).
5. The concave 4-point star (`StarMark`) is reserved for achievement or evidence moments. One flower per category with five growth stages. Do not use stars as decoration.
6. Design-first rule: for any new or changed screen, confirm the board exists in Claude Design (LOS-012). If it does not, say so in your report and fix the board first; do not invent a layout.

## 6. Calm states: no red failure, no shaming, targets, overlays

1. No red "failure" states for the owner's own behaviour (missed habit, skipped day, wrong password). Use calm Ink/Violet/Sky tones and neutral wording. Destructive controls (delete profile, turn off the lock) currently use red by an unapproved choice; do not extend that to other places and see LOS-039.
2. Minimum interactive target 44 by 44 CSS px. Check new buttons, chips and icon buttons; add padding or a hit area, not a bigger glyph.
3. Toasts and banners MUST NOT cover a control. The toast sits above the tab bar and the routine-player buttons; the reminder banner is in the document flow. This is enforced by `tests/ui/toastPlacement.test.tsx` and `tests/e2e/toastClearance.e2e.mjs`. If you add a floating element, extend those checks.
4. Modals use `Sheet` (page behind becomes `inert`, focus trap, Escape closes the top one, focus returns). The lock setup is a modal `LockPage` rendered through a portal.
5. Motion respects `prefers-reduced-motion`; no animation is required to understand state.

## 7. Storage, privacy and security

1. All data is local: IndexedDB through Dexie, plus a few documented localStorage keys (inventory in `docs/handoff/11_DATA_STATE_AND_INTEGRATIONS.md` §3). Do not add a new storage location or key without documenting it there.
2. Anything user-written that is not already inside the encrypted database must be added to the wipe list in `src/ui/lock/deviceKeys.ts` (cleared on manual lock, profile switch or delete).
3. NEVER commit: personal routines, products, the personal action library, health or women's-health items, backups, recovery codes, passwords, tokens, e-mail addresses, phone numbers, or files from the owner's private folders. Test data is always named `test`.
4. Run `npm run privacy:scan` before committing. It reads `scripts/privacy-denylist.txt`; never add a real personal value to that file, only generic shapes or file names.
5. Do not log secrets, passwords, recovery codes or decrypted content, and do not print them in reports.
6. Fixtures: use the synthetic ones in `tests/fixtures/` (`flutter_export_synthetic.json`, `flutter_ui_expected.json`). Never put a real export in the repo.
7. Do not weaken crypto parameters (AES-GCM-256, PBKDF2-SHA256 at least 310,000 iterations, non-extractable data key). Known limits are listed in `docs/handoff/17_SECURITY_AND_LIMITATIONS.md`; do not oversell them as "secure".

## 8. Testing requirements

1. Every behaviour change gets a test in the matching folder (`tests/domain`, `tests/ui`, `tests/migration`). A bug fix starts with a failing test.
2. UI tests use Testing Library and wait through lazy screens (`asyncUtilTimeout: 5000`). If one fails only under load, re-run that file alone and record it (LOS-003); do not raise timeouts silently.
3. Run before you report: `npx tsc --noEmit -p tsconfig.app.json`, `npm test`, `npm run build`, `npm run privacy:scan`. Quote the real numbers; do not write "all green" without having run them.
4. Changes that touch the lock, toasts, reminders, streak or bidi also need the matching e2e script in light and dark (see playbook §2). State clearly when you could not run one. Today nine of the twelve scripts fail at the onboarding step (LOS-044); fix that helper before relying on them.
5. Test data is named `test`. No real names, cities or products in fixtures.
6. iPhone, Xcode and real-device checks are permanently deferred by the owner (`DEFERRED-BY-OWNER`). Do not ask for them and never write "verified on device".

## 9. Git workflow

1. Work on a branch (`feat/...`, `fix/...`, `docs/...`). Commit with a short imperative subject and a body that says why.
2. NEVER force-push, rewrite published history, delete branches you did not create, or merge into the default branch without the owner's explicit approval.
3. The local history of this project is unpublished. Anything pushed publicly is a clean snapshot (D-64). Do not push the local history, and do not push to `gh-pages` (the live site) without explicit approval for that publish.
4. Keep generated output out of commits: `dist/`, `node_modules/`, test result folders, screenshots from ad-hoc runs. The handoff screenshots in `docs/handoff/screenshots/` are the only tracked images of that kind.
5. Do not change repository visibility, settings or secrets.

## 10. Documentation update rules

When you change behaviour, update the doc that owns it in the same commit:

| You changed | Update |
|---|---|
| A requirement or its status | `docs/handoff/03_REQUIREMENTS_TRACEABILITY.md` |
| Architecture, storage or schema | `05_SYSTEM_ARCHITECTURE.md`, `11_DATA_STATE_AND_INTEGRATIONS.md` |
| Files, counts, scripts | `06_CODEBASE_GUIDE.md`, `12_SETUP_AND_ENVIRONMENT.md`, `README.md` |
| Tokens, components, copy rules | `07_DESIGN_SYSTEM.md` |
| Screens or flows | `08_SCREENS_AND_USER_FLOWS.md` (and screenshots if the look changed) |
| Dependencies | `10_DEPENDENCIES_AND_TOOLS.md` |
| Test results or coverage | `13_TESTING_AND_QA.md` |
| A bug found or fixed | `14_BUGS_AND_TECH_DEBT.md` |
| A decision | `15_DECISION_LOG.md` (new `D-xx`, never edit an old decision silently) |
| Security or privacy posture | `17_SECURITY_AND_LIMITATIONS.md` |
| Open or finished work | `18_REMAINING_BACKLOG.md` (move to DONE with evidence) |

Docs describe evidence, not hopes: write the command you ran and its result, or mark the claim `NOT VERIFIED`. Keep an Arabic summary on top of each handoff file. Re-run `node docs/handoff/tools/check-docs.mjs` (link and path checker) after editing docs.

## 11. Definition of Done

A task is done only when all of these are true and reported:

1. Behaviour matches the owner's decisions (`15_DECISION_LOG.md`) and the Arabic/RTL/token rules above, in light and dark.
2. Tests added or updated; `npx tsc --noEmit -p tsconfig.app.json`, `npm test`, `npm run build` and `npm run privacy:scan` pass, with the real counts quoted.
3. Relevant e2e scripts run, or the gap is stated.
4. No new network call, no new storage location, no personal data, no new colour or font.
5. Docs in §10 updated; `node docs/handoff/tools/check-docs.mjs` passes.
6. The change is committed on a branch, not pushed anywhere without approval, and the report lists what was NOT verified.

## 12. Reporting blockers

Stop and report (do not guess) when: a decision is not in `15_DECISION_LOG.md` and changes visible behaviour; a test can only pass by weakening a safety check; a command fails for environmental reasons; privacy scan hits that you cannot explain; or the task needs a real device, a secret, or publishing. A blocker report has: what you tried (exact command), the exact output (secrets removed), what you believe the cause is (labelled as a claim to verify), and the smallest decision or input needed from the owner.

## 13. Safe-modification boundaries

| Area | Rule |
|---|---|
| `src/domain/vault/`, `storage.ts`, `store.ts` | High risk. Small changes, tests first, fault-injection coverage |
| `public/` Flutter takeover shims (`flutter.js`, `flutter_bootstrap.js`, `flutter_service_worker.js`, `main.dart.js`) | Do not delete or edit without owner confirmation (LOS-021, D-36) |
| `public/brand/*.svg`, icons, splash | Owner's logo. Regenerate with `npm run brand:assets` only when the logo itself changes |
| `src/ui/styles/tokens.css` | Identity tokens; changing a value is an owner decision |
| `package.json` / lockfile | Declare every new dependency; no `npm audit fix --force`; explain any new package and its licence |
| `docs/handoff/screenshots/` | Documentation only, not visual baselines |
| `scripts/privacy-denylist.txt` | Only add generic patterns |

## 14. Prohibited assumptions and destructive operations

- Do not assume the live site equals the source (publishing is a separate, approved step, LOS-001).
- Do not assume iOS behaviour; do not assume an `UNKNOWN` is fine.
- Do not assume the generic "dark, Thmanyah, charcoal/green" prompt applies (it does not, D-59).
- Do not run `git push --force`, `git reset --hard` on shared work, `git clean -fdx`, `rm -rf` outside your temp folder, or any command that deletes browser/IndexedDB data of a real profile.
- Do not delete orphaned encrypted databases or the plaintext rollback copy by hand; the app removes the rollback after a real unlock on a later launch (LOS-032 rollback window, LOS-035 orphaned databases).
- Do not import or open the owner's private files, and do not copy their content into prompts, tests or docs.
