# 01 — Executive Summary

> **ملخص**
> «وجدان» تطبيق PWA شخصي مبني بـ React/TypeScript، بياناته على الجوال فقط، وحلّ محل نسخة Flutter على نفس الرابط.
> الكود المدموج (`integ/features` @ d982b01) يضم كل الميزات الناقصة (المجموعات A إلى G): مراجعة أسبوعية بعشر خطوات، رسوم الأنماط، الاحتفالات، يوم مرتب بالمستويات و«يومك جاهز»، يوم هادئ، ظروف الميزانية وتذكير الادخار، خريطة المتعة، التركيز والاسترجاع، ترتيب البيت، فلتر الأدلة، استوديو العادات بتسع خطوات، خريطة الحياة، وإحصاءات الآيلتس والقيادة (كآليات تعبّئينها أنتِ بدون محتوى رسمي مخترع).
> الفحوصات على الكود نظيفة (849 اختبار، البناء، فحص الخصوصية) والفحصان المستقلان 6 و7 = SHIP. لكن سكربتات e2e اليدوية (تسعة منها) تفشل عند خطوة الـ onboarding بعد إضافة خطوات جديدة (LOS-044)، وفيه ملاحظات صغيرة مفتوحة (LOS-040 إلى 046). النسخة الحية الآن هي الإصدار 3 حسب منسّق الدمج.

## 1. What it is

Wejdan Life OS («وجدان») is a single-owner, Arabic-only, RTL personal operating system: a daily plan (suggestion mode), habits with a flower garden, projects/goals ("Path"), joy and rewards, money (payday cycle, bills), notes/decisions, search, weekly review, import/export. It installs as a PWA on the owner's iPhone from GitHub Pages and works offline. All data stays on the device (IndexedDB through Dexie).

## 2. Current state at `integ/features` = `d982b01` (2026-10-24; `main` was `ed0df23` before the wave)

| Area | State | Evidence |
|---|---|---|
| Core app (Today, Habits, Path, Joy, Me; notes; search; change log; sources/import review; money; weekly review) | Built and QA'd by earlier independent gates | `src/ui/screens/*`; QA gates `PER-REPORT` (`release-gate.md`, `release-gate-2.md`: verdict SHIP at `cb8a2f8`) |
| Old Flutter data migration (Hive to Dexie) and Flutter to React takeover | Built; tested in Chromium | `src/domain/migration/flutterHive.ts`, `src/pwa/legacyCleanup.ts`, `tests/e2e/sw-takeover/README.md` |
| Flexible streak (optional) | Built; **default ON for new installs is awaiting owner approval** (LOS-015) | `src/ui/screens/habits/StreakHero.tsx`, `tests/domain/flexibleStreak.test.ts` |
| In-app reminders + `.ics` export; reminder banner now in the page flow (gate-3 D2) | Built and re-tested | `src/ui/screens/reminders/*`, `src/domain/ics.ts`, `tests/e2e/streakRemindersLogo.e2e.mjs` |
| Backup nudge after 14 days | Built | `src/domain/backupReminder.ts` |
| App lock + multiple profiles (opt-in, AES-GCM-256 at rest) with durable migration, versioned registry with recovery, quarantine of unreadable rows, modal setup, calm (non-red) errors | Built; gate-3 defects D1, D3, D4, D7, D8 fixed with tests and a kill-and-reopen e2e | `src/domain/vault/*`, `src/ui/lock/*`, `tests/domain/vault*.test.ts`, `tests/e2e/lockProfiles.e2e.mjs`, `lockKill.e2e.mjs` |
| Gate 4 (HOLD) fixes: SIGKILL during turn-off / delete / enable no longer loses data or leaves ghost / orphan profiles (durable markers) | Fixed in `eed6603`; gate 5 (independent) = SHIP with two minors | `vaultDurability.test.ts` (75), `lockKill` e2e (PER-REPORT), `14_BUGS_AND_TECH_DEBT.md` §1.2 |
| Unicode bidi isolation, Arabic avatar names, copy fixes (D5, D6, D9) | Fixed; D9 has no dedicated test | `14_BUGS_AND_TECH_DEBT.md` §1.1 |
| Real W logo (owner's SVGs) + regenerated icons/splash | Built | `public/brand/w-ink.svg`, `w-white.svg`, `src/ui/components/WMark.tsx`, `scripts/brand/generate-brand-assets.mjs` |
| Her real routine/products | Not in the public repo by design; a private on-device import exists | `src/ui/screens/me/SettingsScreen.tsx` («استيراد مكتبتي الشخصية») |
| Missing-features wave, areas A to G (weekly review 10 steps, insights charts, celebrations, Today tiers / «يومك جاهز» / levels / free joy / week strip, calm day, money envelopes + saving reminder, joy map + bundles + onboarding joy step, focus recall, home tidy + errands, evidence filter + add-to-habits, settings cap / modules / storage banner, habit studio 9-step wizard, onboarding life map, IELTS stats / goals, driving road / quiz / hazard / conditions) | Built, 14 new test files, gates 6 and 7 = SHIP. Driving and IELTS are **owner-fillable mechanisms**: no official procedure, hours, fees, clips or question bank is shipped, and every step she adds wears «ما تأكدت من المصدر» until she marks it verified | `04_CURRENT_IMPLEMENTATION.md` §4b, `docs/design/*.md` |
| Gate 6 / 7 findings | D1 to D9 fixed in `fc6bb39`; two minors open (review-draft crash windows) | `14_BUGS_AND_TECH_DEBT.md` §1.3, LOS-042, LOS-043 |
| Privacy tooling | `npm run privacy:scan` guards commits (tokens, e-mail, phone, private file names, deny-list) | `scripts/privacy-scan.mjs` |

## 3. Deployment state (important)

- **Release 3 is live** per the integrator (not re-checked from this environment; PER-REPORT): it carries the missing-features wave. Its `gh-pages` SHA is `d2db69a`. Release 2 was `gh-pages` @ `f7e1f75`, a build of `main` @ `ed0df23`; the first React publish was `169ca40` (built from `0fa7aa6`, bundle `index-DhYFUn4i.js`). The handoff branch differs from `d982b01` only by two source comments, so the live bundle and this source are functionally the same.
- Publishing to `gh-pages` requires the owner's explicit approval each time (`20_CODEX_EXECUTION_PLAYBOOK.md` §6.2). Verify the live bundle name with `curl` before relying on any of the above.
- The GitHub source push is a separate, **done** step: one clean snapshot commit on a new branch `react-app` (D-64). Status: pushed to branch `react-app` (be98a824bcc8b74b745be6655dc480d83896dcab[:7], verified with git ls-remote); recorded in `HANDOFF_MANIFEST.json`.

## 4. Validation snapshot (run during this handoff on this tree)

| Check | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | exit 0 |
| `npm test` | **77 files, 849 tests passed**, 0 failed (155.7 s) |
| `npm run build` | exit 0, 712 modules, PWA precache 155 entries (2403.99 KiB) |
| `npm run privacy:scan` | clean (details in `13_TESTING_AND_QA.md` §2 and `22_COLD_START_AUDIT.md`) |
| Playwright e2e (hand-run), merged tree | **Pass:** bidiGlyphOrder (20), joyOnboarding (17), studioOnboarding (23). **Fail at the onboarding step (9 scripts, test tooling only):** lockProfiles, lockKill, streakRemindersLogo, toastClearance, reviewInsightsCelebrations, todayCalm, featureD, ieltsDriving, moneyJoy → LOS-044. Last green on earlier trees: lock 71, lockKill 375 (`ed0df23`); toast 27, streak 33 (`2b7a096`) |
| Not green / not run | ESLint cannot run (LOS-037); `npm audit` shows 9 open findings (LOS-033); legacy-migration e2e fails at its precondition (no seeded Flutter build, environment gap); iPhone checks deferred by the owner |

An earlier draft of this file reported a load-sensitive failure of the routine-player test in one run on `4fa6dcc`; both full runs on the current tree passed, so it is tracked as `OPEN-UNVERIFIED` (LOS-003).

## 5. What is genuinely open

Full list with IDs in `18_REMAINING_BACKLOG.md`. Headlines:

1. **Publish** (owner approval): the clean snapshot to GitHub (LOS-001 Part A) and, separately, the live site (Part B).
2. **Test tooling:** nine hand-run e2e scripts fail at the new onboarding (LOS-044, P2). **Minors:** LOS-040 orphan plain DB / `_bak_` cleanup, LOS-041 missing-data screen dead end, LOS-042 / LOS-043 review-draft crash windows, LOS-046 no change-log for driving / IELTS data. **Not built from the design inventory:** LOS-045 (list). Checks the gates did not cover: text scale as real Dynamic Type, board pixel comparison (LOS-002).
3. **Supply chain and legal:** `npm audit` (LOS-033), ESLint setup (LOS-037), LICENSE and OFL notices (LOS-036).
4. **Plaintext residuals of the lock** (disclosed in `17_SECURITY_AND_LIMITATIONS.md` §2.2): the profile header table is readable, semantic record ids (LOS-034), the pre-lock rollback copy until a later successful unlock (LOS-032), orphaned encrypted databases (LOS-035), personal library key with the lock off (LOS-038).
5. **Owner decisions:** flexible streak default (LOS-015), red delete / turn-off buttons (LOS-039), tab icons (LOS-014).
6. **Real-device checks** are `DEFERRED-BY-OWNER` (home-screen icon/splash, status bar colour, `.ics` via the iOS share sheet, real keyboard).
7. **Owner-only:** rotate two tokens committed in the public repo's old `main` branch (LOS-030); decide about the history cleanup (LOS-031), which she chose to leave as is.
8. Design-first rule: the lock/profile, streak, reminder and W screens were built without a verified board in Claude Design, and the wave was built from written specs in `docs/design/` (the gap inventory compared against an Oct-1 export of the older boards, not the 24-Oct artifacts); verify against the boards before further UI work (LOS-012).

## 6. Size and shape

- `src/`: 39,175 lines of `.ts`/`.tsx` (13,458 of them in `src/domain`), VERIFIED-NOW by the line count in `06_CODEBASE_GUIDE.md`; CSS modules are additional.
- 77 vitest files (38 domain, 38 ui, 1 migration) and 13 hand-run e2e scripts (`tests/e2e/*.mjs`, of which `legacyMigration` needs a Flutter build) plus the sw-takeover harness.
- Single-owner product; there is no backend, no CI, no issue tracker in the repo.
