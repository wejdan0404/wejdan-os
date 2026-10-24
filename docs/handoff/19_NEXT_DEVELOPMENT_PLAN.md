# 19 — Next Development Plan

> **ملخص**
> الخطة تمشي بالترتيب: تحقق من الخط الأساسي (بدون تغيير كود)، ثم فحص نهائي للبناء بعد إصلاحات الفحص الثالث، ثم اعتماديات npm والترخيص، ثم نشر بموافقة وجدان، ثم تحسينات اختيارية.
> ما فيه ميزة جديدة كبيرة مطلوبة؛ المنتج مكتمل وظيفيًا، والباقي جودة وتحقق ونشر.
> أي بند يحتاج قرارًا أو موافقة منها موضّح، وكل شي iOS مؤجّل منها.

Source of items: `18_REMAINING_BACKLOG.md` (IDs LOS-xxx). Nothing here re-opens finished work listed as DONE in `03_REQUIREMENTS_TRACEABILITY.md` or in the DONE table of `18`. Baseline for this plan: `main` @ `ed0df23` (gate-4 fixes) + the handoff branch (726 tests / 63 files green, `tsc`, build and `privacy:scan` clean — `13_TESTING_AND_QA.md` §2).

## Principles for this phase

1. **Verify before building.** The product is feature-complete against the owner's decisions; the biggest risks are an un-re-gated merged tree, open npm advisories, and missing disclosures, not missing features.
2. **Design-first.** For any UI change, confirm the board exists in Claude Design (LOS-012) before touching code; if it does not, fix the board first.
3. **Small, reversible changes**, one concern per commit; keep tests green; update the docs listed in `AGENTS.md` §10.
4. **Stay inside the approved decisions** (`15_DECISION_LOG.md`, esp. D-59 which supersedes the generic master prompt): identity colours, light + dark, Arabic RTL, local-only, suggestion mode.
5. **No claims about iPhone behaviour.** Record such items as DEFERRED-BY-OWNER.
6. **Never publish history.** Anything that goes to GitHub is the clean snapshot (D-64) or a normal commit on a branch the owner approved.

## Phase 0 — Orientation and baseline (≈ 1–2 h, no code changes) — this is the FIRST WORK ITEM

- Read `CODEX_START_HERE.md`, `AGENTS.md`, `00`, `15`, `03`, `18`.
- Install and verify exactly as `CODEX_START_HERE.md` §5 says (`npm ci`, `npx tsc --noEmit -p tsconfig.app.json`, `npm test`, `npm run build`, `npm run privacy:scan`). Expect all green; record counts. If the routine-player test fails under load, rerun that file alone and note it (LOS-003).
- Write the baseline note (Arabic summary on top). Do not fix anything in this step unless it blocks setup.

## Phase 1 — Make the merged tree trustworthy (≈ 1–2 days)

| Order | Item | Output |
|---|---|---|
| 0 | LOS-040 orphan plain DB / `_bak_` cleanup and LOS-041 missing-data screen (gate-5 minors) | Crash-injection tests first, then code; whole vault suite + `lockKill` e2e |
| 1 | LOS-002 remaining checks (gate 5 already SHIP; text scale, contrast, board comparison, axe not covered) on the merged tree (light, dark, reduced motion; flows: lock/profiles incl. a kill-and-reopen, streak, reminders banner + `.ics`, backup nudge, quarantine notice) | A defect list; fixes for Major/Minor ones. Start from the five e2e scripts |
| 2 | LOS-003 flaky test (only if it reappears) | 5 consecutive green full runs |
| 3 | LOS-005 D1 visual check | Pass/fail with geometry numbers |
| 4 | LOS-006, LOS-007 text scale and contrast | Clean screenshots, token-usage fixes if needed (no identity colour changes) |
| 5 | LOS-008, LOS-012 design fidelity and missing boards | Diff list; boards added or confirmed |

Exit criteria: no Major defects, report stored outside the public repo if it contains any user-like data, owner informed in Arabic.

## Phase 2 — Supply chain, licence and disclosure (≈ 1 day)

| Order | Item | Notes |
|---|---|---|
| 1 | LOS-033 `npm audit` | Patch-upgrade `react-router-dom` within 6.x first; full tests + build + e2e; never `audit fix --force` |
| 2 | LOS-037 ESLint | Declare the missing devDependencies, add a `lint` script, run once |
| 3 | LOS-036 LICENSE + OFL notices | Needs the owner's licence choice |
| 4 | LOS-032 rollback-window disclosure | Copy first; behaviour change only with a vault test update |

## Phase 3 — Release (≈ 0.5 day, needs the owner)

| Order | Item | Notes |
|---|---|---|
| 1 | Clean snapshot push (LOS-001 Part A) | Integrator action: `npm run privacy:scan` on the exact tree, one snapshot commit on `react-app`, record branch + SHA in `HANDOFF_MANIFEST.json` |
| 2 | Live site publish (LOS-001 Part B) | Only with the owner's explicit yes for this publish; keep shims; verify live bundle name; offline check |

## Phase 4 — Owner decisions and polish (as the owner answers)

| Item | Question to ask her |
|---|---|
| LOS-015 | "Should the flexible streak start OFF for new installs?" (it is ON today and unapproved) |
| LOS-039 | "Should delete-profile / turn-off-lock buttons stay red or become Ink/Violet?" |
| LOS-038 | "Keep the personal library in a plain local key when the lock is off, or always inside the database?" |
| LOS-014 | "Tab icons: cup/plant (current) or star/leaf (board)?" |
| LOS-010 | "Ready to import your real routine/products on your phone? (we never put them in the repo)" |
| LOS-011 | "Did you receive the private library file and the guide?" |
| LOS-030, LOS-031 | Reminders only: rotate the tokens; history cleanup stays as-is unless she asks |

## Phase 5 — Optional engineering (pick by value)

Order suggested by value for the owner: LOS-004 (quick-add Save visibility in a short viewport), LOS-019, LOS-018, LOS-016, LOS-023, LOS-009, LOS-013, LOS-017, LOS-024, LOS-035, LOS-034.

## What not to do in this phase

- No new feature areas, no new colours, no English UI, no network calls, no server.
- No removal of the Flutter takeover shims (LOS-021) until she confirms.
- No history rewrite, no repository visibility changes, no push of the local history.
- No bulk refactors of `src/domain` or the store: it has 726 tests built around its current shape.
- No "restoring" dark-only, charcoal/green or Thmanyah from the generic master prompt (D-59).

## Roadmap ideas that are NOT approved (do not start without a decision)

These appear nowhere as owner requests; they are recorded only so nobody assumes they are planned: native iOS app (would reopen the font licence, LOS-020), cloud sync or sharing between devices, real push notifications, a neutral edition for friends (D-19), English interface, opaque record ids (LOS-034).
