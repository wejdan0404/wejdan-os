# 16 — Development History

> **ملخص**
> تاريخ هذا المستودع المحلي 75 commit كلها بين 23 و24 أكتوبر 2026 (بناء React كامل، دمج فروع الميزات، إصلاحات الفحوصات الثالث والرابع، ثم موجة الميزات الناقصة وإصلاحات الفحص السادس). هذا التاريخ محلي وغير منشور: النشر العام سيكون commit واحد نظيف (snapshot) لأن الـ commits القديمة فيها fixture مشتق من بيانات حقيقية، فأرقام الـ commits هنا تخص المستودع المحلي فقط.
> تاريخ نسخة Flutter الأقدم موجود في المستودع الآخر (فرع main العام) وسياق المحادثات الأقدم ناقص جزئيًا، فما أكتبه عنه إلا ما له دليل.
> الأرقام والهاشات هنا من `git log` الآن؛ نتائج الفحص منسوبة لتقاريرها.

## 0. Scope and limits — read this first

- **This history is LOCAL and UNPUBLISHED.** Every commit hash in this document (`2b7a096`, `c257441`, `5629f51`, …) refers to the local development repository of the integrator's machine. **The public push will be a single clean snapshot commit** (planned branch `react-app` of `https://github.com/wejdan0404/wejdan-os`; status PLANNED/UNVERIFIED until the integrator records the real branch + SHA in `HANDOFF_MANIFEST.json`). The reason: older local commits (before `da4c839`) contained a test fixture derived from a real export of the old app. The snapshot starts from the final tree, whose fixtures are synthetic and which passes `npm run privacy:scan`. After the push the hashes below will **not** exist in the public repository; use them only to understand order and intent, and `git log` of your clone for what is actually there.
- This repo's local history (`git log` on `d982b01`, the last app commit; it was 56 commits at `2b7a096` and 58 at `ed0df23`): **75 commits**, all authored as `Claude`, from 2026-10-23 to 2026-10-24 (VERIFIED-NOW: `git rev-list --count d982b01`, `git log --format=%an`; 24 merge commits). The branch `docs/handoff` adds the handoff package on top.
- No git tags exist (`git tag` empty). No remote is configured in the local repository.
- **Not in this repo:** the Flutter-era history (built before 2026-10-23, 222 tests per the spec review). It lives in the other line of the public repository (`main`, kept as-is by the owner's choice) and in an earlier handoff package. This document does not describe it beyond what the ledger states.
- Conversation context before 2026-09-28 is unavailable; the session transcript used here starts 2026-09-28T14:20Z and its earlier part is only a summary. Anything about "why" before that is `UNKNOWN`.
- Times below are UTC from `git log`. Branch names come from merge-commit messages.

## 1. Timeline by stage

### Stage 1 — Baseline and flower garden (2026-10-23)

| Commit | What |
|---|---|
| `73726df` | Baseline: React rebuild snapshot (flower work in progress) |
| `cebe65c` | Flower garden, aquarium removal, QA fixes, PWA offline + iOS assets |
| `6557d2e` | Apply Arabic copy review: dialect, terms, plurals, bidi ranges, honesty fixes (65 fixes per the ledger) |

### Stage 2 — Feature branches: notes/search/sources, legacy migration, resting rule (2026-10-23 → 24)

| Commit | What |
|---|---|
| `dbcd72e`, `ccd4825`, `3af505d`, `6a4459c`, `9e13b3f`, `6987cbd`, `aacfbfe`, `27f22ea` | Notes & decisions, Arabic-aware search, change log, sources and import review; routes and Me rows; tests |
| `bf9fa00` | Performance: stop app-wide re-renders, flower sprite, font preload, lazy library cache |
| `420a0e6` | **Merge `feat/notes-search`** |
| `e455646` | One-time migration of old Flutter (hive_ce) data on the same origin |
| `b843bb0` | **Merge `feat/hive-migration`** |
| `48e05af`, `e52a9d2` | Port Flutter «ترتاح» rule; **Merge `feat/resting`** |
| `f9354f2`, `7c8a739`, `720aa79`, `3975b80` | Accessibility fixes (stack focus + inert, modal sheets, error boundaries, 44px targets, 200% text), sheet focus return, serialised import writes; **Merge `feat/a11y`** |
| `6812f5e`, `d133138`, `6328447` | Take over from the old Flutter web build at the same path (shims, cleanup); notes design gaps; **Merge `feat/sw-takeover`** |

### Stage 3 — Independent QA by area, then fix branches (2026-10-24, ending 06:41 UTC)

QA areas (reports outside the repo, `scratchpad/qa-final/area1…area7*.md`): Today, Habits, Path, Joy+Money, Me, Cross-cutting, Design fidelity. Fix commits and merges:

| Commit | What |
|---|---|
| `c3f19ba`, `cd0a9d2`, `668791c`, `60d9e89` | Area 1 (Today): forward-only postpone, done tasks stay, docked toast, Brief/detail undo, energy order; **Merge `fix/area1`** `b08a221` |
| `4f0a856` | Area 2 (Habits): routines only from her products, honest player, cap-respecting domain wake; **Merge `fix/area2`** `20b6bb5` |
| `3189c9c` | Area 3 (Path): 21 defects; **Merge `fix/area3`** `45abaa9` |
| `689e8ca` | Area 4 (Joy/Money): payday transitions, bill pause/paid, plurals, rewards; **Merge `fix/area4`** `cc1a078` |
| `055e70e`, `10b3a99` | Area 5 (Me): inbox→note, RTL fields, search deep links, Arabic change log, import review; **Merge `fix/area5`** `3dad89d` |
| `8f79b60`, `d4d164e` | Area 6 (cross-cutting): legacy re-offer, shims, drafts, timer, privacy keyword removal, a11y test headroom; **Merge `fix/area6`** `b79cf02` |
| `76fb028` | Area 7 (design fidelity): tokens, heroes, covers, identity; **Merge `fix/design`** `e98f52b` (06:41 UTC) |

The ledger's QA summary: 32 defects found by independent QA (1 critical, 14 major, 17 minor) and fixed. Re-verified only partially (see `18_REMAINING_BACKLOG.md`).

### Stage 4 — Release gates (2026-10-24, gate-1 report 07:25, gate-2 report 08:12, publish 08:15 UTC)

| Event | Result (`PER-REPORT`) |
|---|---|
| Release gate 1 on `e98f52b` | **HOLD**: N1 (undo toast covered the tab bar; a tap on «أنا» undid the last action) is Major; N2–N5 minor |
| `f035d28` | Fixes N2–N5 (first-run restore, payday prompt, skipped routine, net-zero payday notice) |
| `52facb7` | Fixes N1 (toast floats above the tab bar instead of replacing it) |
| `cb8a2f8` | Merge `fix/n2-n5` (07:43 UTC) |
| Release gate 2 on `cb8a2f8` | **SHIP** (D1 minor, P1/P2 polish; real iOS and keyboard not run; text scale 1.5/2.0 and contrast not run) |
| `0fa7aa6` (08:15:37) | D1: routine player keeps its buttons above the toast |
| gh-pages `169ca40` (08:15:51, local publish clone) | React build replaced the Flutter build on the live URL; bundle `index-DhYFUn4i.js` is what the URL served when checked |

### Stage 5 — Owner requests after launch: lock/profiles, streak, reminders, logo (2026-10-24, 08:40 → 09:48)

Owner messages (UTC): 08:40 asked whether friends can use the link with their own data, asked for accounts without Google, asked why no streak, attached the two W SVGs; 08:45 chose the easy on-device option and asked about notifications; 08:47 accepted the in-app + calendar-export option, asked for a full audit of everything promised and for her routine/products to be loaded to her account; 09:31 asked to finish everything and produce a comprehensive report.

| Commit | What |
|---|---|
| `5629f51` (09:42) | `feat(lock)`: on-device app lock + multiple profiles, opt-in, encrypted at rest. 39 new tests; e2e 68/68 per the agent's report. Also fixes gate-2 P1 |
| `50643eb` (09:47) | Flexible streak, honest in-app reminders with calendar export (.ics), real W logo, regenerated icons/splash, backup nudge |
| `4fa6dcc` (09:48) | **Merge `feat/streak-reminders-logo`** (conflict in `SettingsScreen.tsx` resolved by keeping both the encrypted backup IO and `lastBackupAt`) |

### Stage 6 — Privacy hygiene and release-gate 3 fixes (2026-10-24, 10:16 → 11:20 UTC)

Release-gate 3 (an independent QA/a11y/design pass of the merged tree; its report is local-only and not in the repo) found nine defects, G3-D1…D9, plus plaintext leftovers. They were fixed on two branches and merged:

| Commit | What |
|---|---|
| `da4c839`, `1bd7713`, `7e38872` (10:16) | `chore(privacy)`: synthetic migration fixtures replace the real-derived one; `scripts/privacy-scan.mjs` + generic deny-list (`npm run privacy:scan`); neutral sample usernames/passwords in tests |
| `0738f6f` (11:08) | `fix(ui)`: G3-D2 in-flow reminder banner, D5 Unicode-aware Bidi, D6 Arabic avatar names, D8 calm lock errors, D9 copy |
| `c257441` (11:19) | `fix(lock)`: G3-D1 durable vault migration (header row, boot recovery, plain DB kept as rollback), D3 versioned registry, D4 quarantine, D7 modal setup, no plaintext leftovers (per-profile reminder memory, personal library inside the encrypted DB). Deterministic crash tests + SIGKILL e2e |
| `2b7a096` (11:20) | Merge `fix/g3-vault` |

### Stage 6b — Gate 4 (HOLD) and gate 5 (SHIP) (2026-10-24, afternoon)

| Commit | Content |
|---|---|
| `eed6603` (12:50) | `fix(lock)`: G4-N1/N2/N3 — turn-off and delete survive SIGKILL even when the registry write is lost: durable `retired` / `deleted` / `migrating` markers, `recover()` finishes them on a later launch, a missing profile DB is never opened empty; crash-injection tests and `lockKill` e2e extended (kills at 100 to 8000 ms) |
| `ed0df23` (12:50) | Merge `fix/g4-turnoff` into `main`. Local history is now 58 commits, 16 merges |

Gate 4 (independent) returned HOLD (N1 major, N2, N3, N4/N5 polish). Gate 5 (independent, on the fixed tree) returned SHIP with two open minors (LOS-040, LOS-041). Both reports are local-only (PER-REPORT). Per the integrator, the live site was then published as release 2: `gh-pages` @ `f7e1f75` = build of `ed0df23` (139 precache entries).

### Stage 8 — Missing-features wave (2026-10-24, after release 2)

Seven feature branches were merged into `integ/features`, then gate-6 fixes, all authored `Claude`. Specs are the 16 files in `docs/design/`.

| Commit | What |
|---|---|
| `3f4a028` | Focus: retrieval step, try-first tip, honest silent-reminder and phone-away prompt (area D) |
| `44c8bc1` / `2a24dc5` | Today tiers, «يومك جاهز», inline levels, free joy, week strip, momentum ring, calm day (area B) |
| `40a2d22` / `8547755` | 9-step Habit Studio wizard with evidence prefill; onboarding life map (area E) |
| `ceba78f` / `ca75efe` | Per-category month envelopes, payday saving reminder, joy map and bundles (area C) |
| `308d0f1` / `b14c927` | Home tidy/zone/errands, evidence strength filter + add-to-habits, settings cap and modules, storage banner (area D) |
| `3d4987b` / `9f75e66` | IELTS stats/goals; driving road, conditions, hazard practice, spaced quiz (area F) |
| `5fadc46` / `e9df17f` | Weekly review depth (10 steps), insights charts, celebrations history (area A) |
| `1d5086b` / `1c9f0d7` | Optional joy step in onboarding (area G) |
| `fc6bb39` / `d982b01` | Gate-6 fixes D1 to D9 (review dots, encrypted review draft, Today count/overload, one season term, Studio badge colour, empty chapter title) |
| `a8ded5c` | Merge `integ/features` @ `d982b01` into `docs/handoff` (this package) |

Gate 6 (independent) returned SHIP; gate 7 (re-test of the fixes) returned SHIP with two minors (LOS-042, LOS-043). Both reports are local-only (PER-REPORT). Per the integrator, the live site is now release 3 (the wave); its `gh-pages` SHA is `d2db69a`.

### Stage 7 — Audit and this handoff (2026-10-24)

- The audit "promised vs done" (90 rows) was produced at `0fa7aa6`; it is the seed of `03_REQUIREMENTS_TRACEABILITY.md`.
- Branch `docs/handoff` (this package) was started from `4fa6dcc`, merged with `2b7a096`, and finalised against it (docs 00–22, `README.md`, `AGENTS.md`, `CODEX_START_HERE.md`, `HANDOFF_MANIFEST.json`, screenshots and tools).

## 2. Test growth (as reported)

| Point | Tests | Source |
|---|---|---|
| Spec review (Flutter) | 222 | spec doc |
| After the area-7 merge | 477 | session summary |
| At `0fa7aa6` (audit run) | 498 in 47 files | audit |
| Lock branch | 537 in 53 files | agent report |
| Streak/reminders branch | 562 in 52 files | agent report |
| Merged `4fa6dcc`, first draft of this handoff | 601 in 58 files (600 passed, 1 load-flaky failure, passes alone) | run then |
| Merged `2b7a096` (gate-3 fixes) | 695 in 63 files, all passed (two full runs) | run earlier in this handoff |
| Merged `ed0df23` (gate-4 fixes) | 726 in 63 files, all passed (+31, all in `vaultDurability`) | run earlier in this handoff |
| Wave `fc6bb39` (gate-6 run) | 842 in 76 files | gate-6 report (PER-REPORT) |
| Merged `d982b01` + handoff docs | **849 in 77 files, all passed** | run now (13 §2) |

## 3. Known history hazards

- The public GitHub repo `main` and `gh-pages` history still contain personal data (an earlier personal library, profile, a `_transfer` dump, and two tokens in a private ops file of an earlier workflow). The owner chose not to clean it. This `docs/handoff` branch must not add any more (`20_CODEX_EXECUTION_PLAYBOOK.md`).
- Many commits touched `SettingsScreen.tsx`; it is the usual merge-conflict file (`4fa6dcc`).
- Worktrees named `wos-*` existed on the original machine for feature branches; they are session-local and gone with the session. Do not depend on them.

## 4. Not available

- Exact reasons for decisions made before the last session summary: `UNKNOWN` (see `15_DECISION_LOG.md`).
- Who reviewed what beyond the agent reports: `UNKNOWN`; all commits are authored `Claude`.
- Design board history (Claude Design canvas titled «Wejdan Life OS — Redesign»): the board link is recorded in the ledger, its current content was not opened in this handoff. NOT VERIFIED.
