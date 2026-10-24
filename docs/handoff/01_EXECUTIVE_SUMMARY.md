# 01 — Executive Summary

> **ملخص**
> «وجدان» تطبيق PWA شخصي مبني بـ React/TypeScript، بياناته على الجوال فقط، وحلّ محل نسخة Flutter على نفس الرابط.
> الكود في `main` (ed0df23) يشمل القفل والملفات الشخصية، الستريك المرن، التذكيرات الداخلية مع تصدير .ics، وشعار W الحقيقي، وإصلاحات الفحص الثالث (D1 إلى D9) والرابع (N1 إلى N5) مع اختبارات؛ والفحص الخامس المستقل = SHIP مع ملاحظتين صغيرتين مفتوحتين (LOS-040، LOS-041). النسخة الحية (الإصدار 2) مبنية من هذا الكود حسب منسّق الدمج.
> الفحوصات على هذي الشجرة نظيفة (726 اختبار، البناء، فحص الخصوصية). الباقي: فحص مستقل نهائي، نشر بموافقتها، اعتماديات npm، ترخيص، وقرارات تخصها. فحوصات الجهاز الحقيقي مؤجلة منها.

## 1. What it is

Wejdan Life OS («وجدان») is a single-owner, Arabic-only, RTL personal operating system: a daily plan (suggestion mode), habits with a flower garden, projects/goals ("Path"), joy and rewards, money (payday cycle, bills), notes/decisions, search, weekly review, import/export. It installs as a PWA on the owner's iPhone from GitHub Pages and works offline. All data stays on the device (IndexedDB through Dexie).

## 2. Current state at `main` = `ed0df23` (2026-10-24)

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
| Privacy tooling | `npm run privacy:scan` guards commits (tokens, e-mail, phone, private file names, deny-list) | `scripts/privacy-scan.mjs` |

## 3. Deployment state (important)

- **Release 2 is live** (per the integrator, PER-REPORT; not re-checked from this environment): `gh-pages` @ `f7e1f75` is a build of `main` @ `ed0df23` (139 precache entries). It includes the lock/profiles, flexible streak / reminders / W logo and the gate-3 and gate-4 fixes. The handoff branch differs from `ed0df23` only by two source comments, so the live bundle and this source are functionally the same.
- The earlier live bundle (`assets/index-DhYFUn4i.js`, gh-pages `169ca40`, built from `0fa7aa6`) is superseded.
- Publishing to `gh-pages` requires the owner's explicit approval each time (`20_CODEX_EXECUTION_PLAYBOOK.md` §6.2). Verify the live bundle name with `curl` before relying on it.
- The GitHub source push is a separate, **PLANNED** step: one clean snapshot commit on a new branch `react-app` (D-64). Status: not pushed; branch and SHA to be recorded by the integrator in `HANDOFF_MANIFEST.json` (`commit_sha` is `PENDING_PUSH`).

## 4. Validation snapshot (run during this handoff on this tree)

| Check | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | exit 0 |
| `npm test` | **63 files, 726 tests passed**, 0 failed (about 103 s) |
| `npm run build` | exit 0, 650 modules, PWA precache 139 entries (about 2217 KiB) |
| `npm run privacy:scan` | clean (details in `13_TESTING_AND_QA.md` §2 and `22_COLD_START_AUDIT.md`) |
| Playwright e2e (hand-run) | toast 28, lock 71 (light and dark), streak/reminders/logo 34 (light and dark), lock kill-and-reopen 375 (re-run on `ed0df23`), bidi glyph order 21: all passed |
| Not green / not run | ESLint cannot run (LOS-037); `npm audit` shows 9 open findings (LOS-033); legacy-migration e2e fails at its precondition (no seeded Flutter build, environment gap); iPhone checks deferred by the owner |

An earlier draft of this file reported a load-sensitive failure of the routine-player test in one run on `4fa6dcc`; both full runs on the current tree passed, so it is tracked as `OPEN-UNVERIFIED` (LOS-003).

## 5. What is genuinely open

Full list with IDs in `18_REMAINING_BACKLOG.md`. Headlines:

1. **Publish** (owner approval): the clean snapshot to GitHub (LOS-001 Part A) and, separately, the live site (Part B).
2. **Two gate-5 minors** (LOS-040 orphan plain DB / `_bak_` cleanup; LOS-041 missing-data screen has no way forward) and the checks gate 5 did not cover (LOS-002: text scale 1.5/2.0, contrast measurement, comparison against the design boards).
3. **Supply chain and legal:** `npm audit` (LOS-033), ESLint setup (LOS-037), LICENSE and OFL notices (LOS-036).
4. **Plaintext residuals of the lock** (disclosed in `17_SECURITY_AND_LIMITATIONS.md` §2.2): the profile header table is readable, semantic record ids (LOS-034), the pre-lock rollback copy until a later successful unlock (LOS-032), orphaned encrypted databases (LOS-035), personal library key with the lock off (LOS-038).
5. **Owner decisions:** flexible streak default (LOS-015), red delete / turn-off buttons (LOS-039), tab icons (LOS-014).
6. **Real-device checks** are `DEFERRED-BY-OWNER` (home-screen icon/splash, status bar colour, `.ics` via the iOS share sheet, real keyboard).
7. **Owner-only:** rotate two tokens committed in the public repo's old `main` branch (LOS-030); decide about the history cleanup (LOS-031), which she chose to leave as is.
8. Design-first rule: the lock/profile, streak, reminder and W screens were built without a verified board in Claude Design; verify before further UI work (LOS-012).

## 6. Size and shape

- `src/`: 33,376 lines of `.ts`/`.tsx` (11,723 of them in `src/domain`), VERIFIED-NOW by the line count in `06_CODEBASE_GUIDE.md`; CSS modules are additional.
- 63 vitest files (32 domain, 30 ui, 1 migration) and 5 hand-run e2e scripts plus the legacy-migration script and the sw-takeover harness.
- Single-owner product; there is no backend, no CI, no issue tracker in the repo.
