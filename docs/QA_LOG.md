# QA log — core layer

Toolchain: Flutter 3.47.5 (stable) · Dart 3.13.4 · Linux container (no iOS
toolchain). Commands: `flutter analyze`, `flutter test --coverage`,
`flutter build web --release`. Coverage computed from `coverage/lcov.info`
(line hits; generated `lib/l10n/app_localizations*.dart` excluded).

## Loop 0 — first compile

* `flutter analyze lib`: 4 infos (`use_null_aware_elements` in
  `MockTest.weakest`) → fixed with `key: ?value` map entries.
* 1 info `unnecessary_import` in `life_controller.dart` → removed.

## Loop 1 — first full pass

| Gate | Result |
|---|---|
| analyze | No issues |
| tests | 100/100 pass (after fixes below) |
| engine coverage | 813/827 = 98.3 % |
| web build | ✓ `build/web` |

Fixes during the loop:
* Test design: learned-duration assertion hit the time-budget trim (comeback
  items ranked first) → gave that test a larger budget; behaviour correct.
* Test design: reminder cap test — the 06:30 vocab nudge sits inside default
  quiet hours (23:00–07:00) → test uses quiet end 06:00.
* Test expectation: forgiving-streak break length corrected (2, not 1).
* **Bug**: `scheduleTodayNudges` read `reminderPlanProvider` from inside the
  notifier → Riverpod `CircularDependencyError`. Fixed by computing the plan
  from the snapshot (`reminderPlanFor`) in both the provider and the
  controller.
* **Data finding**: 4 seed items have an empty `sources` list — LIFE-01,
  LIFE-11, LIFE-15, JOY-12 (spec says all sources verified). Not changed;
  test pins the list so a future data fix is noticed.

## Loop 2 — critical review + fixes

Review found and fixed:
1. Day boundary: spec §5.1 plans at 04:30, but "today" flipped at midnight →
   a 00:30 night routine would log on the wrong day. Added
   `logicalDay()`/`kDayBoundaryMinute`; used by `todayProvider`, all
   controller writes, spark txn dates, opened-day tracking.
2. Spark txn date used the calendar day while logs used the plan day → cap
   could be bypassed after midnight. `txnForAward(date:)` now takes the
   logical day.
3. Free Joy completions earned Sparks → now 0 (joy is never a "should";
   ENG-09 overjustification).
4. Completing a project step did not mark the step done (and undo did not
   revert) → fixed in controller.
5. New habits saved without `createdDate` would count retroactive misses →
   `upsertHabit` stamps today.
6. A habit referenced by a routine step but without `routineId` could appear
   twice (chain + standalone) → planner excludes chained habits.

| Gate | Result |
|---|---|
| analyze | No issues |
| tests | 103/103 pass |
| engine coverage | 818/832 = 98.3 % |
| web build | ✓ |

## Loop 3 — services coverage + final gates

* Added `test/services/services_test.dart`: iOS notification service against
  a fake plugin (category/actions, TZ scheduling in Asia/Riyadh, past-time
  skip, snooze, unknown-zone fallback, action → `NudgeActionType` mapping),
  no-op app lock, share failure path without a platform.

| Gate | Result |
|---|---|
| analyze | No issues |
| tests | **106/106 pass** |
| engine coverage | **819/832 = 98.4 %** (target ≥ 80 %) |
| data / state / services | 95.8 % / 99.3 % / 96.1 % |
| all lib (excl. generated l10n) | 96.7 % |
| web build | ✓ `flutter build web --release` |

## Not verifiable here

* iOS build/run (no Xcode): `AppDelegate.swift` notification delegate and
  `NSFaceIDUsageDescription` added per plugin docs but not compiled.
* Web app not launched in a browser (Hive/IndexedDB path untested at
  runtime; the build succeeds).

---

# QA log — UI layer (phase UI-1)

Method per iteration: `flutter analyze` → `flutter test` → `flutter build web
--release --no-web-resources-cdn` (CanvasKit bundled, no CDN at runtime) →
serve `build/web` → Playwright (Chromium, 390 wide, DPR 2; tall viewports for
long screens) using the web demo flags (`lib/ui/demo_flags.dart`) and hash
deep links (`/#/today/why/h_walk`, …) → read every PNG next to the design PNG
→ defect list → fix. Screens in `docs/screens/<iteration>/`.

## UI-1 iteration 1 (AR light, first render)

Gates before screenshots: analyze 0 issues; tests 115/115.

Defects found (screen → issue → fix):
1. All deep links → every sheet/overlay URL rendered plain Today. Cause: a
   splash `MaterialApp` shown while loading reset the web URL to `/`.
   Fix: no second MaterialApp; `main()` awaits the snapshot before `runApp`.
2. Today meta line — bidi reordering ("5 · 06:30 · IELTS د"). Fix:
   `metaJoin()` wraps each part in FSI…PDI isolates.
3. Today status row — energy chip wrapped to two lines (Flexible + Spacer
   split the width 50/50). Fix: Expanded+Align start.
4. Directional icons doubled-mirrored in RTL (chevrons, "بكرة" arrow, back
   buttons pointed the wrong way). Material chevrons/arrows already mirror;
   now always use the LTR-semantic icon (forward = chevron_right).
5. Why sheet 4-week grid — weekday initials duplicated ("أ ا ث أ …").
   Fix: explicit initials ح ن ث ر خ ج س / S M T W T F S.
6. Habit Studio versions — minute steppers crammed under 100 px columns
   (digits stacked vertically); English seed text in RTL fields put the
   full stop on the wrong side. Fix: steppers moved to labelled full-width
   rows; `textDirFor()` sets field/summary direction by content.
7. Routine Player — 4 step tiles overflowed horizontally (88 px fixed).
   Fix: tiles share the row width when ≥ 80 px, else scroll.
8. Morning Brief — spark motif on the end side; design has it on the start
   side. Fixed.
9. Accessibility — CheckButton semantics merged into the tappable card node
   (VoiceOver would read one combined node, ambiguous action). Fix:
   `container: true` on every button-like Semantics.
10. Screenshot harness — recovery chip click failed (Flutter web exposes
    button names as text, not aria-label). Harness now uses role/text.

Kept as-is (checked, not defects): FAB overlaps the lowest card's end
side while scrolled (list has 120 px bottom padding; same as design);
tile "صيانة 0" is real data (starter Maintain habits all live in chains);
evidence/min-version texts are English (seed is English-only, CORE_API §10),
rendered LTR with a note.

## UI-1 iteration 2 (AR dark + EN, full set)

Note: this capture ran against the build made right after the deep-link fix;
a later `flutter build web` in the same step did not run, so the Studio /
Routine / grid fixes of iteration 1 were verified in iteration 3 instead
(harness now checks `main.dart.js` is newer than `lib/`).

Compared against MainDark.png / JoyDark tints:
* Dark Today matches MainDark: surface #141B33 cards with #2B3358 borders,
  gold joy card #33290F, sage chain chips, primary check with glow. OK.
* Dark Why sheet: stage bar + grid readable; empty grid dots use border
  colour (not red) — calm. OK.
1. Chevrons/back arrows still wrong in RTL: Material mirrors only some
   glyphs (chevron_left yes, chevron_right no). Fix: `forwardIcon()` /
   `backIcon()` / `forwardArrow()` choose the glyph per direction and render
   with `textDirection: ltr` so nothing double-flips.
2. EN Today: level control ("Min · Normal · Bonus") is ~210 px, squeezing
   the why line to 3–4 lines. Fix: in English the why line stacks above the
   control when the card is < 340 px wide.
3. EN greeting / header / tab order mirror correctly (Today at left). OK.

## UI-1 iteration 3 (full set, fresh build verified)

Verified fixed: deep links (Why sheet, Quick Add, Studio, Player, Focus,
Recovery, Evening all open directly); RTL chevrons ("<" forward, ">" back)
in light/dark; Studio minute steppers on labelled rows, English seed text
LTR with correct punctuation; Routine tiles fit 4 across; Why-sheet weekday
initials; EN why line stacks above the level control; Recovery chip → engine
proposal card (before/after) renders as in Recovery.png.

Compared with design PNGs — remaining differences, judged acceptable:
* Today "صيانة" tile shows 0 (seeded Maintain habits live in chains); the
  artboard used sample data. Real data wins.
* Meta shows resolved clock times ("18:40") instead of "بعد العصر" because
  prayer anchors are off by default (spec §5.1); turning them on in
  onboarding step 3 shows the prayer cue text.
* Sparks 0 / momentum low on a fresh profile — true values, no fake metrics.

New defect: EN tab bar — "Joy" label sits ~2 px higher than the others
(spark glyph is 22 px vs 24 px icons). Fix: icons centred in a 24×24 box.

## UI-1 iteration 4 (final pass, full set: 44 screenshots)

Verified: EN tab labels aligned; all 20 AR light + 20 AR dark screens and
4 EN/scale checks render without overflow or clipping; no console errors
from any page; RTL chevrons/arrows correct in light and dark; text scale 1.5
on Today wraps cleanly (why line stacks above level control, tiles grow).

| Gate | Result |
|---|---|
| `flutter analyze` | No issues |
| `flutter test` | 115/115 (10 new Today widget tests: plan render, check/uncheck + Sparks, undo snackbar, level select + re-level, Red caps, EN/LTR, text scale 1.5, onboarding → brief, Morning Brief re-plan, 44 pt targets) |
| `flutter build web --release --no-web-resources-cdn` | ✓ (CanvasKit bundled; no runtime network) |
| Screenshots | `docs/screens/4/` (iterations 1–3 kept for comparison) |

Open / not verifiable here:
* iOS: notification permission prompt + actionable nudges are wired but only
  the no-op path ran (web). Face ID lock toggle only stores the setting.
* Evidence and minimum/normal/bonus texts are English (seed data); Arabic
  translations of the Action Library are a data task, not UI.
* Hijri date (optional in spec) not shown.
* Widget tests render with the square test font (tall cards); layout
  fidelity is judged from the web screenshots, not the tests.

---

# QA log — UI layer (phase UI-2: hubs, Arabic content, fresh start, sensitive modules)

Method (same as UI-1): analyze → test → `flutter build web --release
--no-web-resources-cdn` → `python3 tool/qa_screenshots.py ui2-<n>` (Playwright,
390 wide, DPR 2) → read every PNG next to `design/previews/*.png` → defects →
fix. QA data comes from the web demo flag `?seed=test` (every record titled
`test`, per the project rule) plus `?mods=cycle,pcos,aquarium`. Screens in
`docs/screens/ui2-<n>/`.

## UI-2 iteration 1 (first render of all hubs; 63 shots)

Gates before screenshots: analyze 0; tests 115/115 (after updating the Today
test for the Arabic card title of GROW-07).

Defects (screen → issue → fix):
1. Habits/Insights — every plant "بذرة", momentum 0, consistency 0 % even with
   14 days of QA logs. Cause: seed habits are created "today" on a fresh
   install, so earlier logs are ignored (correct engine rule). Fix: QA seed
   back-dates `createdDate` 21 days (demo data only).
2. IELTS mock log / Insights momentum — bars invisible (only the track drew).
   `LabelledBar` fill was an unsized `ColoredBox` inside a Stack. Fix:
   `Positioned.fill` + `FractionallySizedBox(heightFactor: 1)`.
3. Driving stats — «2 من 5» rendered «من 5 2»: `StatTile` forced LTR on any
   value. Fix: LTR only for purely numeric values.
4. Path — today (28 Sep 2026) is before the roadmap (Oct 2026) but was placed
   in Q4 «يول–سبت», and goals' "next step" jumped to Q4 milestones. Fix:
   dates before Oct 2026 count as Q1 and the marker reads «قبل بداية السنة».
5. Habits — «فيه مكان لـ3.» bidi-broke into «ل3.» → copy rephrased.
6. Rewards — size pill «سريعة · أقل من 15 د» crowded the segmented control →
   short labels in segments.
7. Settings / Review SRBAI / Rewards / IELTS tabs — segmented controls hugged
   their content instead of filling the row like the boards → new
   `SegmentedPills.expand`.
8. Money BNPL — one long line with nested parentheses «(2) · الدفعة 4 من قبل 16
   يوم» (bidi) → two lines built with `metaJoin`.
9. Money wishlist — ring showed a percentage «29», board shows days left →
   `TimerRing` with the days-left number.
10. Money calendar — no weekday header → initials row (week start aware).
11. Me — money subtitle «test قبل 16 يوم» mixed direction → `metaJoin`.
12. Weekly Review step 1 — "fresh start" card said «موسم جديد» on a Monday
    (season started today). "Tomorrow" landmark now only counts a season that
    starts tomorrow (engine + test).
13. Garden — seed-stage glyph a dot → short shoot with two leaves.
14. Path EN — season pill «Maintai n» wrapped → wider pill column in EN.
Widget tests (new) caught more: 15. Joy reward row overflow (price text not
flexible); 16. Money "log spend" sheet disposed its TextEditingController
while the sheet was still animating out (crash) → own StatefulWidget;
17. Evidence card footer overflow → Wrap; 18. Path "you are here" row
overflow; 19. Money legend overflow at 1.5×; 20. `ToggleRow` only the switch
was tappable → whole row.

Kept (checked, not defects): Me header has no "W" avatar (board has one) —
logged for iteration 2; the Joy Map shows only her real free joys (1 on the
starter profile), not the board's sample chips; review wins list shows only
what was logged.

## UI-2 iteration 2 (fixes of iteration 1 verified; full set re-shot)

Gates: analyze 0; tests 159/159 (44 new: 16 engine, 5 state, 23 hub widget
tests). Verified fixed: momentum rings / garden stages / consistency show QA
history; mock-test and momentum bars filled and labelled; «2 من 5» reads
correctly; roadmap marker «قبل بداية السنة»; full-width segmented controls;
BNPL two-line meta; wishlist days-left ring; weekday header on the bills
calendar; no fresh-start "season" card on a Monday review.

Defects found now:
1. Bottom sheets opened from hub tabs sat *inside* the tab shell (tab bar
   visible under the redeem confirm) → `showWSheet` uses the root navigator.
   Consequence found in review: Evidence detail sheet pushed Habit Studio
   from its own (popped) context → now uses the root navigator context.
2. Why sheet (AR) — «+13 د» for the bonus minutes (bidi split "13+") → shared
   `plusMinutes()` isolates the number (LRI…PDI) in Why sheet, Studio, Today.
3. Money — subscription pill squeezed the amount column → subscription moved
   under the title; overdue instalment said «قبل 16 يوم» → «متأخر 16 يوم»
   (Money + Me subtitle).
4. Habits — capacity line still bidi-fragile («لـ 3») → «باقي 3».
5. Weekly Review close — peak-end line quoted the weakest win («1 من 3») →
   wins ordered: comebacks, project steps, habits by completion ratio, vocab.
6. Me — missing "W" avatar from the board → `HubPage.leading` avatar.

Compared with boards and judged fine: Habits garden/by-domain/routines
layout (HabitsHub.png), Path season + quarters + goals (Path.png), IELTS
(IELTS.png), Driving stepper (Driving.png), Joy (Joy.png, JoyDark.png),
Settings (Settings.png), Help (HelpSafety.png), Review steps (s0–s7).

## UI-2 iteration 3 (verification pass, full set)

Verified: sheets from hubs now cover the tab bar (root navigator); Me avatar
"W"; «متأخر 16 يوم» in Money and Me; Why sheet «13+ د» keeps its order; Help,
Cycle (privacy banner, factual "last start", no predictions), PCOS (only
FOOD-19 fields, «إذا كان لديك تشخيص» banner, sources LTR), Vocab review,
fresh-start card on Today, Studio prefilled in Arabic from the library, all
dark variants (contrast and tints follow JoyDark / MainDark).

Defect: Joy rewards — «باقي 52 شرارة» floated mid-card (two flex children
shared the row) → fixed-width end-aligned label.
Kept: Studio version boxes wrap long Arabic library texts into narrow
columns (same 3-column layout as HabitStudio.png; full text is editable).

## UI-2 iteration 4 (final pass, 63 screenshots in `docs/screens/ui2-4/`)

Verified: reward "sparks to go" label end-aligned; Joy, Money and Review
step 3 at text scale 1.5 wrap without clipping or overflow; Evidence dark;
season editor sheet above the tab bar with live counts «في النمو: 3 من 3 ·
في الصيانة: 4 من 5»; no console errors on any page.

| Gate | Result |
|---|---|
| `flutter analyze` | No issues |
| `flutter test` | **159/159** (UI-1: 115 · new: `test/engine/ui2_engine_test.dart` 16, `test/state/ui2_state_test.dart` 5, `test/widget/hubs_test.dart` 23) |
| `flutter build web --release --no-web-resources-cdn` | ✓ |
| Screenshots | `docs/screens/ui2-1` … `ui2-4` (AR light + AR dark for 24 screens, 5 EN, 3 at 1.5×, interaction shots: redeem confirm, review close, season editor) |

Open / not verifiable here:
* iOS not run: Face ID unlock (local_auth), file import (file_selector) and
  share sheet export only compiled; the web preview uses the no-op lock.
* Money / admin dues (bills, BNPL, documents, auto-save) are shown in-app
  (Money, Home, Me) but are **not** scheduled as OS notifications — the
  reminder engine's daily cap (spec §5.6) has no slot for them yet.
* Help & Safety numbers (937, 997, 911) and the MOH psychological line
  (920033360, from JOY-13's cited MOH page) still need the owner's
  verification pass (BACKLOG BL-026).
* Arabic copy (UI strings + `actions_ar.json`) pending native review.
* Widget tests use the square test font; layout fidelity judged from the web
  screenshots.

## Fix pass 1/2 — QA report 2026-09-28 (builder fix pass, 2 verification loops)

Scope: `docs/qa/QA_REPORT_2026-09-28.md` D01–D24 + BL-014, BL-016, dues
notification. The 9 skipped QA tests in `test/qa` now run by default and pass.
Premise checks done before fixing: every defect was reproduced first (9 via
`flutter test test/qa --run-skipped` → 9 fail; D01/D02/D06 via
`tool/qa/robustness.py` + Playwright; the rest by reading the cited code).

| ID | Fix | Evidence |
|---|---|---|
| D01 | `main()`: Hive init + bootstrap under 5 s timeout + try/catch → seeded `InMemoryLifeRepository`; banner «الحفظ غير متاح في هذا المتصفح — بياناتك مؤقتة» above the app (own semantics) | `tool/qa/fix_verify.py`: idb_throws / idb_onerror / idb_hangs → 17 semantics nodes, banner=true, 0 page errors (`docs/qa/fix_verify.json`, `shots/fix_idb_*.png`); `robustness.py` idb cases now render; widget test "D01: in-memory fallback shows the storage banner" |
| D02 | Custom `web/flutter_bootstrap.js`: no `serviceWorkerSettings` (SW never registered) | iframe `allow-scripts` + CORS host → renders (in-memory + banner, 0 SW errors, `shots/fix_iframe_scripts_only_cors.png`); `allow-scripts allow-same-origin` → renders with persistence. **Host requirement:** an opaque-origin iframe makes every asset fetch cross-origin, so the host must send `Access-Control-Allow-Origin: *` (plain `http.server` → canvaskit blocked by CORS; `tool/qa/cors_server.py` shows it works). `robustness.py` still reports blank for scripts-only: its context uses Playwright `service_workers='block'`, which itself reads `navigator.serviceWorker` and throws in an opaque origin, and its server has no CORS header |
| D03 | Planner pins items done today (ranked first, count toward cap, never trimmed/deferred, also on Red); new items only in the remaining capacity | `qa_engine_test` "a done item disappears…" passes; `fix_pass1_test` D03 group (3 tests) |
| D04 | Undo snackbar: `persist:false`, duration = deadline − 250 ms entrance; own 44×44 `TextButton`; late tap → «انتهت مهلة التراجع…» | widget test "D04: undo target ≥ 44 pt and the bar is gone by the 10 s deadline" |
| D05 | Studio behaviour field writes her text to `titleAr` and `titleEn` | widget test "D05: a title she types is her title in both languages" |
| D06 | `config.fontFallbackBaseUrl: 'no-fallback-fonts/'` (same origin, not shipped) | typing `test 😊 中文 ✦`: 27 requests, **0 external**; fallback lookups go to localhost and 404 → emoji/CJK tofu on web (accepted) (`fix_verify.json` → network) |
| D07 | No `normal÷3` anywhere (Studio, onboarding, evidence add). Library-stated minimum (`statedMinimumMinutes`) or 0 = «حددي مدة صغيرة» (save blocked until set). Starter profile: stated → exact; unstated → flagged `minimumDurationEstimated`, Why sheet «N د · تقدير». BODY-17 "30 min before bed" is an offset → wind-down estimate 1 | `fix_pass1_test` D07 group; `shots/fix1b_why_vocab.png` («5 د · تقدير»), `fix1_ar_light_why.png` (walk 10 stated, no tag), `fix1b_today_red.png` (no "30 د") |
| D08 | Room reset (LIFE-13) + spend log (LIFE-05) standalone Maintain; maintain ranking weekly → project → habit, two-pass placement | Green Monday: `الصيانة · 2 · خفيفة` (`shots/fix1_ar_light_today.png` vs `design/previews/Main.png`); `qa_engine_test` Green-day finding passes; `fix_pass1_test` D08 group |
| D09 | Momentum floor 1.0 once ever done (incl. beyond lookback); ring shows «راحة» at rest | both `qa_engine_test` momentum findings pass; `fix_pass1_test` D09; widget test "D09" |
| D10 | Token `checkRing` light `#5E8BC4` (3.52:1 white · 3.28:1 bg · 3.1:1 subtle), dark `#9BC4EE` | contrast computed in session; `shots/fix1_ar_light_today.png` |
| D11 | Quiet hours end at wake (`effectiveQuietEnd`), default quiet end 06:00, `Settings.withWake` in onboarding + Settings | `qa_engine_test` wake finding passes (brief 06:00); builder test rewritten to the new rule ("quiet hours end at wake…") |
| D12 | «…أول مرة ترجعين لها تاخذين شرارات مضاعفة.» | `tool/ui_strings.py` → ARB |
| D13 | Help: 937 first; 920033360 with hours (8 ص–8 م، السبت 1 م–8 م, MOH psychiatry page re-fetched this session); "مصادر الأرقام" section links MOH 937, MOH psychiatry, SRCA (911: srca.org.sa/en quotes "public emergency services (such as 911)"); SRCA source added to JOY-13. **997 still unverified** (my.gov.sa agency page lists only 19971; srca news page unreachable) → BL-026 owner | `shots/fix2_help.png` |
| D14 | `undo()` restores `comebackPending` for the log that consumed it | `qa_state_test` finding passes |
| D15 | Brief Red counts every non-joy item (= Today Red) with number agreement (1/2 keys); `calmDayBody` no hard-coded «ثلاث» | `shots/fix1b_brief_red.png` «3 أشياء صغيرة + متعة», Today Red 3 items |
| D16 | Close line without top-3 → `wrEndWinNoTop`; with picks → «جاهز بأولوياتك» (no count) | code path in `weekly_review_screen.dart` |
| D17 | `SeedLibrary.parse` swaps internal ids for «titles» in EN + AR texts (library v3) | sweep: "BODY" leak gone from `ar_*_why`; `fix_pass1_test` "D17" scans all actions × fields × languages |
| D18 | IELTS rotation: whole slot is the tap target, card padding 12 | sweep: `*_ielts` small targets 7 → 0 (`docs/qa/visual_sweep_fix1.json`) |
| D19 | `largeText()` layouts for `SectionLabel` and Today status row | 3 `qa_textscale_test` findings pass (0 overflow at 2.0) |
| D20 | Launch removes all `isFocusBlock` events; title localised | widget test "D20" |
| D21 | `MomentumRing`/`SparkBadge` own semantics containers; ring value "N من 100" | code; sweep labels |
| D22 | `<title>`/`appTitle` «Wejdan Life OS — وجدان», description, manifest | `fix_verify.json` title |
| D23 | «ممارسة عملية — بلا مصدر محكّم» pill on Why + Evidence for LIFE-01/11/15, JOY-12 (sources still empty → BL-009) | code |
| D24 | **Not changed:** the Review close sits at the start because `design/artboards/WeeklyReview.dc.html` puts it there; overlays disagree across boards → designer decision (design-first) | — |
| Dues | ONE «مستحقات اليوم» notification (bills, subscriptions, BNPL, renewals expiring today, auto-save), 60 min after the brief, inside the cap | `fix_pass1_test` dues group (3 tests) |
| BL-014 | `tool/merge_arb.py`, `tool/qa_screenshots.py`, `tool/qa/*.py` repo-relative (`pathlib`), Playwright profile in `tempfile` | `py_compile` all; scripts ran from the repo |
| BL-016 | `integration_test` dev dep + `integration_test/app_smoke_test.dart` (boot → sample → Brief → Today; in-memory data) | `flutter test integration_test -d flutter-tester` → 1/1 pass. iOS simulator: **not run** (no Xcode). `-d web-server` unsupported for `flutter test integration_test` |

Intentional builder-test updates (behaviour changed by the fixes): habit count
10 → 11 and the action set (+LIFE-05), night chain without room reset, quiet
hours test rewritten to "quiet ends at wake".

Loop 1 → found: Help «الإسعاف» broke mid-word in the half-width card and the
920033360 hours split across lines; the banner was missing from the
semantics tree (a route's BlockSemantics) → fixed (full-width number cards,
non-breaking hours on their own line, app in its own semantics container).
Loop 2 → `shots/fix2_help.png` clean; banner present in semantics.

| Gate | Result |
|---|---|
| `flutter analyze` | No issues found |
| `flutter test` | **206 pass, 0 skipped, 0 fail** (was 176 + 9 skipped; +21 new: `test/engine/fix_pass1_test.dart` 15, `test/widget/fix_pass1_widget_test.dart` 6) |
| `flutter test integration_test -d flutter-tester` | 1/1 |
| `flutter build web --release --no-web-resources-cdn` | ✓ |
| Visual sweep | `python3 tool/qa/visual_sweep.py '' fix1` → 75 shots `docs/qa/shots/fix1_*.png`, 0 console errors, 0 external requests |

Observations, not fixed here:
* Headless Chromium with no `locale` in this POSIX container reports
  `navigator.language = en-US@posix`; the Flutter engine then throws
  "Incorrect locale information provided" and the page stays blank. Real
  browsers don't report `@posix`; all QA scripts set `locale='ar-SA'`.
  Worth a check on an unusual-locale browser later.
* Evening "small target" in the sweep is the next radio row cut by the
  viewport bottom (artefact, as in the QA report).
* Design mirror follow-ups (designer): `checkRing` token, storage banner,
  Help sources section + full-width 997/911 cards, Today Maintain now real
  data, «راحة» ring state, unsourced pill.

## Fix pass 3 — QA re-verification remainders (2026-09-28)

Scope: `docs/qa/QA_REPORT_2026-09-28.md` "Re-verification" open rows R1, D02, D04,
D07, D10, D13, the «راحة» font size, overlay close position (BL-029) and the
starter maintain titles. Each premise was re-checked first: R1 by the skipped
QA test (fails with `--run-skipped`); D04 by a desktop-platform widget test
(undo 36 pt without the fix, 44 with it); D10 by contrast of the code colours;
D13 by fetching official pages; the rest by reading the cited code.

| ID | Fix | Evidence |
|---|---|---|
| R1 | `Settings.quietEndSetByUser`. Effective quiet end = her end if she set one, else wake (`Settings.effectiveQuietEndMinute`, engine `effectiveQuietEnd`). Morning Brief at max(wake, quiet end). `withWake` never moves her end; `withQuietEnd` (Settings «إلى» tile) sets it; `copyWith(quietEndMinute:)` counts as hers. Settings and onboarding show the effective value. Legacy JSON without the flag: set iff the stored end is not wake/06:00/07:00 (values the app wrote itself) | `test/qa/qa_reverify_test.dart` R1 unskipped and passing (no nudge before 08:00); `test/engine/fix_pass3_test.dart` (5); widget "R1 Settings shows…" (2: unset → «إلى 07:30» follows wake; hers → «إلى 08:00», brief ≥ 08:00) |
| D10 | Joy check ring = gold ink `c.joy.ink`: light #8A6412 on #FBF1D6 **4.77:1** (5.37:1 on white fill), dark #EFCB7A on #33290F 9.21:1 (was spark #E0A93B, 1.88:1) | widget "D10" (border colour); `shots/fx3_ar_light_today.png`, `fx3_ar_dark_today.png`, `fx3_*_joy.png` |
| D13 | Help: 937 · 920033360 · **911 · 997**; 997 labelled «الهلال الأحمر (إسعاف)»; source row «997 — خطة الترقيم الوطنية، هيئة الاتصالات والفضاء والتقنية» → https://www.cst.gov.sa/en/about/Numbering. Page fetched (curl) 2026-09-28: "997 Saudi Red Crescent", "911 Ministry of Interior - Security Reports", "937 Ministry of Health (Emergency Call Center)". srca.org.sa/en does **not** mention 997 (WebFetch); my.gov.sa emergency page did not render numbers | widget "D13"; `shots/fx3_ar_light_help.png`, `fx3_ar_dark_help.png`; strings `tool/fix3_strings.py` |
| D04 | `ThemeData(visualDensity: VisualDensity.standard, materialTapTargetSize: MaterialTapTargetSize.padded)` on all platforms | widget "D04 … desktop (web) density" with `TargetPlatform.linux` (fails at 36 pt without the change); sweep on the 7 touched screens × 3 variants: 0 small targets |
| D07 | `levelMinutes` tags «تقدير» for an estimated minimum (`minimumDurationEstimated`) and an estimated normal duration (new `Habit.durationEstimated` = library dose "not specified by source": GROW-12 rotation, GROW-22, LIFE-05, LIFE-13). Tag drops once the planner learned her minutes from logs (shown ≠ seeded). Tag joined with no-break spaces (loop 1 found «· تقدير» wrapping alone on the focus card). Studio duration edit clears the flag. Applies to Today, Evening Shutdown, Why sheet | widget "D07 + starter titles"; `shots/fx3b_ar_light_today.png`, `fx3b_ar_dark_today_red.png` («5 د · تقدير», «1 د · تقدير»; dental 2 min stated → no tag) |
| Starter titles | AR display titles «تسجيل مصروف اليوم» (LIFE-05) and «ترتيب الغرفة» (LIFE-13) as on `Main.dc.html`; action links unchanged. 15/10 min are not sourced (LIFE-05 dose gives no amount; LIFE-13 "10 minutes is a planning estimate") → shown with «تقدير»; boards `Main`/`MainDark` metas updated to «… · تقدير» | same widget test; `fx3_ar_light_today.png` |
| «راحة» | Rest label `max(12, size×12/44)` px (was 10 at 44) — matches HabitsHub board (12) | widget "«راحة» label is at least 12 px" |
| BL-029 | Weekly Review: title · step count · close (close at the end, per `WeeklyReview.dc.html`). Focus and Routine Player already had close at the end — no change | widget "Weekly Review close…"; `fx3_*_review0.png`, `fx3_*_focus.png`, `fx3_*_routine.png` |
| D02 | App side unchanged (nothing else blocks). README: "Web preview needs `allow-same-origin` or CORS `*` headers" | `tool/qa/reverify.py noidb` → `reverify_robustness_iframe.json`: scripts-only + CORS host renders with the storage banner, scripts + same-origin renders, scripts-only plain server blank (canvaskit CORS). Harness fix: newer Chromium blocked the cross-port localhost iframe navigation (`ERR_BLOCKED_BY_PRIVATE_NETWORK_ACCESS_CHECKS`) → `reverify.py` launches with PNA checks disabled |

Loops: loop 1 (`fx3_*`, 7 screens × AR light/AR dark/EN light) → «تقدير» wrapped
onto its own line on the focus card, and the tag showed on minutes the planner
had learned from logs → fixed (no-break join; tag only when shown = seeded
estimate). Loop 2 (`fx3b_*` Today + Today Red) clean. All sweeps: 0 small
targets, 0 console errors, 0 external requests, no Latin leaks in AR.

| Gate | Result |
|---|---|
| `flutter analyze` | No issues found |
| `flutter test` | **222 pass, 0 skipped, 0 fail** (was 206 + 2 QA probes + 1 skipped; +5 `test/engine/fix_pass3_test.dart`, +8 `test/widget/fix_pass3_widget_test.dart`, R1 unskipped). `test/qa`: 29/29 |
| `flutter test integration_test -d flutter-tester` | 1/1 |
| `flutter build web --release --no-web-resources-cdn` | ✓ |

Intentional test updates: `fix_pass1_test` D11 and `reminders_capacity_test`
"quiet hours end at wake" now expect an **unset** end to follow a later wake
(08:00, was capped at 07:00).

Observations, not fixed here:
* On a Green day the planner downgrades the spend log to its minimum (2 min
  estimate) to fit the maintain budget, so Today shows «2 د · تقدير» where the
  board shows «15 د · تقدير». Engine budget behaviour, not changed.
* Routine Player step pills show minutes without «تقدير».
* JOY-13 `sources` in `actions.json` not extended with the CST page (Help cites it directly).
* Existing stored habits keep `durationEstimated = false` (flag set at seeding).
* iOS not run.
