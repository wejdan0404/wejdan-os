# 15 — Decision Log

> **ملخص**
> سجل بالقرارات اللي اعتمدتها وجدان (وقرارات تقنية أخذها الوكلاء) مع السبب إن كان موثّقًا، والحالة: دائم أو مؤقت.
> القرارات المعتمدة منها تغلب أي برومبت عام (مثل الألوان الفحمية، الداكن فقط، خط ثمانية).
> التواريخ المكتوبة هي اللي وُجد دليل عليها؛ غيرها `UNKNOWN` لأن سجل المحادثة الأقدم غير متاح.

**Rules for reading this log**

- **Who:** `Owner` = Wejdan (decision stated by her in the session); `Agent` = a coding/QA agent in the session chose it and no owner approval is recorded; `Owner (accepted recommendation)` = an agent recommended, she picked it in a question prompt.
- **Date:** only when a timestamp or a dated document exists. The session transcript available to this handoff starts at 2026-09-28; the text before the last summary is partially unavailable, so earlier decisions carry the date of the document that records them (spec review 2026-10-23, ledger 2026-10-24) or `UNKNOWN`.
- **Status:** `permanent` (change only with the owner), `temporary` (has an expiry/revisit trigger, stated).
- Sources: `ledger` = `2026-10-24-react-rebuild-ledger.md`, `spec` = `2026-10-23-spec-review-and-plan.md` (both project docs, outside the repo); `session` = the session summary/messages; `code` = this repo.

## Product and behaviour

| ID | Decision | Date | Reason | Status | Who | Source |
|---|---|---|---|---|---|---|
| D-01 | Colours = identity only: White `#FFFFFF`, Ink `#0E121C`, Sky `#BEDAF7`, Violet `#6172B5`, with scales and status colours. The spec's charcoal + green/turquoise accent is ignored | 2026-10-23/24 (exact UNKNOWN) | Her brand identity; the spec recommended keeping the identity (dark ladder from Ink) rather than a new accent | permanent | Owner ("هويتي فقط الباقي تجاهله") | ledger §1; `src/ui/styles/tokens.css` |
| D-02 | Both light and dark themes (system / light / dark in Settings) | UNKNOWN | Identity ladder supports both; generic prompt's dark-only is rejected | permanent | Owner (accepted recommendation) | `src/ui/shell/theme.tsx`; spec ق1 |
| D-03 | Sparks, momentum and rewards stay as they are (recoloured to identity, no gold) | 2026-10-23/24 | The spec asked to remove points/streaks; she chose to keep them | permanent | Owner ("نخليها مثل ما هي") | ledger §1; `src/domain/engine/sparks.ts` |
| D-04 | Day plan in **suggestion mode**: engine proposes, she adds with a tap; nothing silently added/moved/trimmed; postponed items stay in «بعدين» | 2026-10-23/24 | Spec principle "do not fill the day automatically" | permanent | Owner (accepted recommendation) | ledger §1; `src/domain/models.ts` (`planMode: 'suggest'`) |
| D-05 | Five tabs stay: اليوم · عاداتي · مساري · متعتي · أنا (the spec's 4-section merge was not adopted) | 2026-10-24 | UNKNOWN beyond "as is" | permanent | Owner | ledger §1; `src/ui/routes.tsx` |
| D-06 | Payday = day 1 of each month; the budget cycle starts at payday; changing it keeps history | 2026-10-23/24 | Her salary date | permanent (value editable in Settings) | Owner | ledger §1; `paydayDay: 1` in `src/domain/models.ts` |
| D-07 | Routines (AM/PM/weekly) are built only from «منتجاتي»; initial products are generic placeholders she renames | 2026-10-23/24 | Her real list was not provided | temporary until she supplies/imports her list (LOS-010) | Owner | ledger §1, §6; `src/domain/products.ts` |
| D-08 | Aquarium removed permanently; one flower per category, 16 kinds, 5 growth stages (seed, bud, opening, blooming, rooted) tied to habit strength; flower→category map in the ledger | 2026-10-23/24 | Her request: plants, not fish ("ورود زي هيدرنجا ودلفينوم… لكل تصنيف") | permanent | Owner | ledger §1; `drawings.json`, `RETIRED_DOMAINS` |
| D-09 | «ترتاح» resting rule ported from Flutter | UNKNOWN | Parity with the old behaviour | permanent | Agent (parity) | ledger §1; `tests/domain/resting.test.ts` |
| D-10 | Concave 4-point star only for achievement/evidence | UNKNOWN | Identity rule | permanent | Owner (identity brief) | `src/ui/components/StarMark.tsx` (cap per screen: not verified) |
| D-11 | Language: Arabic only, RTL, friendly Saudi dialect, no guilt wording; English switch removed | 2026-10-23 | Spec + identity | permanent | Owner | spec §3; `index.html` |
| D-12 | Fonts: IBM Plex Sans Arabic (body) + El Messiri (display). Thmanyah is not used because its licence forbids hosting the font files; a native iOS app would need a written licence question first | 2026-10-23 | Licence (spec ق6, link recorded there) | permanent for web; revisit only for native (LOS-020) | Owner (accepted recommendation) | `src/ui/fonts.ts` |
| D-13 | Optional **flexible streak** (2 compensation days per week); turning it off leaves momentum only | 2026-10-24 08:40–08:45 UTC | She asked why there was no streak and replied "الاسهل نسويهه" | permanent feature; **default ON for new installs** is an agent choice, **awaiting owner approval** (LOS-015) — do not change it either way before she answers | Owner (feature), Agent (default) | transcript; `src/domain/models.ts:1139` |
| D-14 | Notifications: no real push (needs a server). Instead honest in-app reminders (shown while the app is open) + `.ics` calendar export with alarms | 2026-10-24 08:47 UTC | She answered "اي تم" to the offered option; "no server" constraint | permanent unless a server is approved | Owner | transcript; `src/ui/screens/reminders/*`, `src/domain/ics.ts` |
| D-15 | Backup nudge is a quiet Settings row after 14 days without an export (the design had no board for it) | 2026-10-24 | Agent deviation, noted in the agent's DEVIATIONS file | temporary until a board is designed (LOS-012) | Agent | `src/domain/backupReminder.ts` |
| D-16 | Added `quietHoursEnabled` setting so the quiet-hours switch gates in-app reminders | 2026-10-24 | Needed so the existing switch has an effect | permanent | Agent | `src/domain/models.ts:1142` |
| D-17 | Accounts = **on-device** lock + several local profiles (username + password + recovery code), no Google, no cloud | 2026-10-24 08:40–08:45 UTC | She asked for username/password accounts "without Google"; chose "الأسهل" (the on-device option) | permanent unless a server is approved | Owner | transcript; `src/domain/vault/*` |
| D-18 | Lock design: one random data key wrapped by password and recovery code; AES-GCM-256 per record; PBKDF2-SHA256 310k iterations; no password reset without the recovery code | 2026-10-24 | Real at-rest encryption instead of a UI gate | permanent | Agent | `src/domain/vault/crypto.ts` header |
| D-19 | Neutral edition (name/logo/wording) for friends is not built | 2026-10-24 | Not requested | temporary (revisit if she asks) | Owner (deferred) | audit row |
| D-20 | Weekly review = six reorder questions, no performance score | UNKNOWN | Spec "no scoring" | permanent | Owner (spec) | `src/ui/screens/me/WeeklyReviewScreen.tsx:28` |

## Architecture and platform

| ID | Decision | Date | Reason | Status | Who | Source |
|---|---|---|---|---|---|---|
| D-30 | React 18 + TypeScript + Vite + Framer Motion replaces Flutter web; engine ported from Dart with parity tests | 2026-10-23 | Flutter web renders to canvas (non-native text/scroll, 44 MB); she knows React and had a React component library; the weak design was a design problem, not a Flutter problem | permanent | Owner | ledger §2 |
| D-31 | The React build is published at the **same URL** as the Flutter build | 2026-10-24 | Her instruction ("إيه انشرها") | permanent | Owner | session; ledger §1 |
| D-32 | Local-only storage: IndexedDB through Dexie with in-memory fallback; no server, accounts in the cloud, analytics, sync | 2026-10-23 (master prompt) | Her privacy constraint from the master prompt | permanent | Owner | `src/domain/storage.ts` |
| D-33 | Export/import JSON stays compatible with Flutter `schemaVersion 1`; import has preview + per-category consent + automatic backup first | 2026-10-23 | Lossless move of old data | permanent | Agent (owner requirement of no data loss) | ledger §3; `tests/migration/flutterExport.test.ts` |
| D-34 | Hash routing, base path `/wejdan-os/` | UNKNOWN | Reason not recorded; plausible fit for static GitHub Pages | UNKNOWN | Agent | `vite.config.ts` |
| D-35 | PWA `registerType: 'prompt'` — updates wait for her | UNKNOWN | Comment in `vite.config.ts`: updates wait for her | permanent | Agent | `vite.config.ts` |
| D-36 | Keep Flutter shims (`flutter_service_worker.js`, `flutter_bootstrap.js`, `flutter.js`, `main.dart.js`) in `public/` so returning devices with the old service worker load the React build; one-time cleanup of Flutter caches/workers; IndexedDB is never touched | 2026-10-24 | Without them an old cached worker could serve a blank page | temporary: remove only when the owner confirms every device has opened the new build (no evidence of when; LOS-021) | Agent | `src/pwa/legacyCleanup.ts`; `tests/e2e/sw-takeover/README.md` |
| D-37 | Old Flutter data is migrated, never deleted, once, from Hive databases `wlo_*` on the same origin | 2026-10-23 | Nothing she entered may be lost | permanent | Agent (owner requirement) | `src/domain/migration/flutterHive.ts` |
| D-38 | The 100-component web library is used only as motion/behaviour references (8 chosen), not installed | 2026-10-23 | Spec ق7 | permanent | Owner (accepted recommendation) | ledger §2 |
| D-39 | Dev component gallery registered only in dev builds | UNKNOWN | Not meant to ship | permanent | Agent | `src/ui/routes.tsx` |
| D-40 | Performance: narrow store subscriptions (`useLifeSelector`), hidden tabs frozen, lazy route chunks with retry | 2026-10-24 | 4x-CPU measurements in the perf report | permanent | Agent | ledger §5 |

## Process, privacy and safety

| ID | Decision | Date | Reason | Status | Who | Source |
|---|---|---|---|---|---|---|
| D-50 | **All iOS/Xcode/real-device testing is permanently deferred** ("كمل كل شي الا ان نسوي تست في اكس كود") | before 2026-10-23 | Owner's standing constraint | permanent until she lifts it | Owner | session summary |
| D-51 | Design-first: anything to be built must exist in Claude Design; if not, fix the board first, then build | UNKNOWN | Owner's working rule | permanent | Owner | owner preference; 31 boards (ledger §4) |
| D-52 | Public repo stays public and un-rewritten; old `main` and `gh-pages` history may still hold personal data; **no force-push / history rewrite / privatising without asking again** | 2026-10-24 | Her answer "خلّه مثل ما هو الحين" | temporary (owner may reopen; LOS-031) | Owner | ledger §1, §6 |
| D-53 | The public build uses a neutral action library (132 actions); her personal library is a private file imported on her device only | 2026-10-24 | Public repo hygiene | permanent | Owner (accepted recommendation) | `src/domain/data/actions_ar.json`; Settings import rows |
| D-54 | Women's-health module is off by default and its content is absent from the public build | 2026-10-24 | Privacy | permanent | Owner | `cycleModule: false`; grep now |
| D-55 | Exercise items that are not medically approved ship paused | UNKNOWN | An agent's announced decision; no code or file to confirm | UNKNOWN | Agent | audit row ("ما اتحقق") |
| D-56 | Test data created in any test is named `test` | UNKNOWN | Owner preference | permanent | Owner | e2e script headers |
| D-57 | Real GitHub push/publish only on her explicit approval; she did approve publishing this app earlier ("إيه انشرها") | 2026-10-24 | Master-prompt rule: no push/commit/publish without an explicit request | permanent; each new publish needs a fresh yes | Owner | session summary |
| D-58 | Two tokens in a private ops file of an earlier workflow on the old public `main` are exposed (path deliberately not repeated); rotating them is her action on her machine | 2026-10-24 | They are in a public repo | open, owner action (LOS-030) | Owner (to act) | ledger §6 |

## Added in the final handoff (2026-10-24, after release-gate 3)

| ID | Decision | Date | Reason | Status | Who | Source |
|---|---|---|---|---|---|---|
| D-59 | **The owner's approved decisions supersede the generic master prompt** that was pasted at the start of the rebuild. That prompt asked for a "predominantly dark" UI and for Thmanyah / IBM Plex typography. Approved instead: **light + dark themes** (system / light / dark), the **identity colours** (White/Ink/Sky/Violet), **IBM Plex Sans Arabic + El Messiri**. **Thmanyah is not used** because its licence forbids hosting the font files publicly. See the table below | 2026-10-23/24 | Her identity brief and answers (D-01, D-02, D-12) | permanent; a coding agent must not "restore" dark-only or Thmanyah from the generic prompt | Owner | `tokens.css`, `theme.tsx`, `fonts.ts` |
| D-60 | Lock enabling is **non-destructive**: the plain DB is kept as a rollback and deleted only after a real unlock on a later launch; each profile DB carries a plaintext header that can rebuild the registry; registry writes are compare-and-set | 2026-10-24 | Gate-3 D1 was a data-loss defect | permanent design; the visible side effect (plaintext rollback copy) is tracked in LOS-032 | Agent (fix of a defect found by independent QA) | `c257441`; `vault.ts` header |
| D-61 | Undecryptable rows are **quarantined, never deleted**, and never block the rest of the profile | 2026-10-24 | Gate-3 D4 | permanent | Agent | `storage.ts`, `store.ts` |
| D-62 | With the lock on, the personal action library lives **inside the encrypted DB**; reminder memory is per profile | 2026-10-24 | Remove plaintext residuals found in gate 3 | permanent | Agent | `LifeStore.settlePersonalLibrary`, `deviceKeys.ts` |
| D-63 | Test fixtures in the repo are **synthetic**; `npm run privacy:scan` runs before any publish | 2026-10-24 | The repo is going public again; an earlier fixture was derived from a real export | permanent | Agent (privacy hygiene) | `da4c839`; `scripts/privacy-scan.mjs` |
| D-64 | The React app goes public as a **single clean snapshot commit** on a new branch (`react-app`, PLANNED, not yet pushed); the local development history stays unpublished | 2026-10-24 | Local history contains the real-derived fixture; old `main` history is left as-is by D-52 | permanent for the first publish; any history cleanup stays an owner decision (LOS-031) | Agent (recommendation) / Owner (D-52) | `HANDOFF_MANIFEST.json` |
| D-65 | Delete-profile and turn-off-lock confirmation buttons currently use the red `--error` fill | 2026-10-24 | Implemented by the lock agent; conflicts with the "no red failure states" rule only if read as failures | **open — owner call** (LOS-039) | Agent | `lock.module.css` |
| D-66 | Destructive vault steps (turn lock off, delete profile, enable migration) are guarded by durable IndexedDB markers (`retired`, `deleted`, `migrating`); a marked database is removed only on a LATER launch after the registry no longer lists it; a missing profile database is never opened empty | 2026-10-24 | Data safety (gate 4: N1 N2 N3) | permanent | Integrator, from release gate 4 | `eed6603`; `vaultDurability.test.ts`; implemented, owner not asked (no visible behaviour change except the calm missing-data message) |
| D-67 | Driving road, quiz, hazard clips and conditions are **owner-fillable mechanisms**: the app ships no official stages, steps, hours, fees, clips or question bank; empty states say they are added once the source is verified; user links are scheme-checked | 2026-10-24 | Honesty rule: nothing about official driving procedure is asserted without a source the owner trusts (gate 6 section 4 found no invented fact) | permanent | Agent (spec `docs/design/driving-road-quiz-hazard.md`) | design spec, `ModuleState.ieltsDriving` |
| D-68 | The unfinished weekly-review draft is stored in `localStorage` key `wejdan.reviewDraft.v2.<week>` while the lock is off and in the encrypted DB (`meta` row `reviewDraft.<week>`) while it is on | 2026-10-24 | Gate-6 D2: wins, miss reasons and ratings must not sit in plaintext under the lock. Crash windows are known: LOS-042, LOS-043 | permanent (crash windows OPEN) | Agent | `fc6bb39`, 11 §meta rows |
| D-69 | Review progress is shown as dots plus «N من 10»; the single hero star appears on the done card only | 2026-10-24 | Identity rule "star = achievement, max 3 per screen" (gate-6 D1) | permanent | Agent | `fc6bb39`, `07_DESIGN_SYSTEM.md` |
| D-70 | Today never adds items by itself: calm day, brief and a red energy check write nothing to the day plan; the free-joy check writes a joy log and earns 0 sparks | 2026-10-24 | Suggestion-mode rule (D-04); verified by gate 6 section 2 | permanent | Agent (spec `docs/design/today-calm.md`) | gate 6 (PER-REPORT), tests |
| D-71 | The evidence strength filter uses the library's own `evidence_strength` field; the app invents no new strength grades and no statistics | 2026-10-24 | Honesty rule (gate 6 section 1, section 4) | permanent | Agent (spec `docs/design/evidence-strength.md`) | gate 6 (PER-REPORT) |

### How the approved decisions override the generic master prompt (read this before touching UI)

| The generic prompt / spec said | Approved decision | Where it lives |
|---|---|---|
| "Predominantly dark" interface | **Light AND dark**; default follows the system; Settings has system / light / dark | `src/ui/shell/theme.tsx`, `tokens.css` (two blocks: `[data-theme='dark']` and `prefers-color-scheme`) |
| Charcoal base with a green/turquoise accent (the spec review's recommendation, recorded in D-01) | **Identity colours only**: White `#FFFFFF`, Ink `#0E121C`, Sky `#BEDAF7`, Violet `#6172B5` + scales + status colours; no new accent | `src/ui/styles/tokens.css` |
| Thmanyah typefaces | **IBM Plex Sans Arabic** (text) + **El Messiri** (display), self-hosted OFL fonts via `@fontsource`. Thmanyah is not used: its licence forbids public hosting of the font files (a native app would need a written answer, LOS-020) | `src/ui/fonts.ts`, `package.json` |


## Superseded or rejected options (so nobody re-proposes them)

| Option | Outcome |
|---|---|
| Charcoal + green/turquoise accent from the spec | Rejected (D-01) |
| Dark-only default | Rejected; both themes (D-02) |
| Turning sparks/momentum off by default | Rejected (D-03) |
| Merging «متعتي» into «أنا» (4 sections) | Not adopted (D-05) |
| Thmanyah web font | Not usable (D-12) |
| Rewriting Flutter app with ported animation components | Superseded by React rewrite (D-30) |
| Server-side push notifications | Not doing (D-14) |
