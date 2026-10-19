
# Flutter Life OS feature and release gap matrix

**Audit date:** 2026-10-18 (Asia/Riyadh)  
**Scope:** existing Flutter consumer application only; synthetic/local verification.  
**Truth status:** web release build and source tests pass; this is not an iOS release candidate.

## Current platform authority — DEC-018 (2026-10-19)

The latest direct owner instruction requires iOS, Android, and web for public launch, superseding DEC-016's platform deferral. DEC-016's framework choice remains: SwiftUI/native iOS, with the existing Flutter client as Android/web foundation. Android has a debug scaffold and one synthetic emulator smoke only. No production account backend, live processing, full platform acceptance, or public release has been implemented or approved. iOS acceptance requires a supported macOS/Xcode environment and owner signing.

## Public product owner direction — 2026-10-19

DEC-011–015 and the latest direct instruction DEC-018 set the public product principles: free/no ads, required accounts/cloud sync, offline-first local editing, all specified domains, completed-product beta, and iOS/Android/web. Consumer AI is local-first with explicit consent; sensitive health is opt-in/locked/non-diagnostic/expert-reviewed; money is manual-only. Product direction is not implementation acceptance; production processing, provider selection, operating budget, beta readiness, and release remain unapproved gates. See `ops/DECISIONS.md` and `docs/architecture/public-account-sync.md`.

This changes the release target but does not change historical evidence. Existing Flutter/web tests and Android smoke do not establish account isolation, cloud sync, complete Android support, public web security, legal readiness, iOS device acceptance, or store acceptance.

## Navigation source reconciliation — 2026-10-18

Older in-scope documents prescribed five tabs:

- [`docs/PRODUCT_SPEC.md`](../docs/PRODUCT_SPEC.md) §2 and [`design/UIKIT.md`](../design/UIKIT.md) specify five tabs: اليوم، عاداتي، مساري، متعتي، أنا.
- The newer owner-issued executive directive §7.1 explicitly supersedes the old navigation and requires four tabs: اليوم، مهني، العناية، أنا.

The app previously implemented five tabs. The latest owner instruction resolves the authority conflict; the router and tab bar now expose Today, Professional, Care, and Me. Existing Habits content remains under Care, existing Path under Professional, and Joy/Rewards is reachable as a nested Care route. Legacy `/joy` links redirect to `/habits/joy`. The feature inventory and product taxonomy still need an implementation audit; APP03 is in progress, not blocked on the old navigation question.

## Feature inventory (source-backed)

| Approved area | Existing implementation | Evidence/tests observed | Current gap/status |
|---|---|---|---|
| Today planner, energy, routines, habit completion, recovery | `lib/engine/`, `lib/ui/screens/today/`, morning/evening/focus/recovery routes | `test/engine/`, `test/widget/today_screen_test.dart`; part of current 223-test suite | Implemented in current source; runtime persistence and mobile-device acceptance still required |
| Habits, evidence library, habit studio, why-sheet | `lib/ui/screens/habits/`, `evidence/`, `studio/`, `habit/` | `test/widget/hubs_test.dart`, localization parity tests | Implemented under Care; mobile acceptance remains |
| Path, IELTS, driving, goals and review | `path/`, `ielts/`, `driving/`, `review/` | Hub tests include goal, IELTS review and driving session flows | Implemented at test-harness level; real-device acceptance pending |
| Joy, reward vault, Sparks and celebrations | `joy/`, `rewards/` and reward logic | Hub/widget tests cover reward creation and redemption | Implemented at test-harness level; real-device acceptance pending |
| Me, settings, insights, money, home/admin, help | `me/`, `settings/`, `insights/`, `money/`, `home_admin/`, `help/` | Widget tests cover money/home/help/settings flows | Implemented at test-harness level; verify persistence, export/import and delete on target device |
| Sensitive cycle/PCOS modules | `sensitive/` routes and local lock gate | Tests confirm locked state and no prediction copy | Off by default/locked behavior tested; mobile device privacy review remains |
| Local-first storage, export/import, delete | Repository interfaces and Hive implementation in `lib/data/` | Repository tests include Hive close/reopen and export/delete/import | Unit/widget-tested; cold start/restart test in an actual browser/device remains |
| Arabic/English, RTL/LTR, accessibility | ARB localization, theme tokens, semantic labels and target constraints | Localization parity, English LTR, text-scale 2.0, 44pt tests | 223 tests pass; assistive-technology/device evaluation remains |
| Notifications, prayer-time cues, biometrics, sharing | Dependencies and service abstractions in `lib/services/` | Services tests exist | Platform-specific runtime permissions and iOS/device verification not established |
| Visual identity | Existing Wejdan theme/tokens, IBM Plex fonts and current UI kit | `design/UIKIT.md`, `lib/ui/theme/`, bundled fonts | Preserved; no redesign introduced |
| Primary navigation | Four owner-authorized top-level tabs; Joy nested under Care | `test/widget/hubs_test.dart` verifies four labels, nested Joy, and legacy route redirects | Implemented and targeted widget tests pass; full release track remains open |
| iOS installation/build | Flutter app has iOS source | Windows host; no Xcode/macOS evidence | `BLOCKED_PLATFORM`: iOS build/signing and iPhone run require a supported macOS/Xcode environment and owner signing choices |
| Local web preview | Existing Flutter web target | Flutter stable 3.47.5 release build completed to `build/web` | Build verified; browser navigation/persistence smoke PASS at 375×812, onboarding/sample profile persisted across reload; broader flows remain pending |

## APP00 source, test, and data classification audit

| Requirement family | Source and route | Existing tests/evidence | Data class / boundary | Gap |
|---|---|---|---|---|
| Day planning, energy, routines, focus, recovery | `lib/ui/screens/today/`, `lib/engine/`; `/today`, `/brief`, `/routine/:id`, `/focus/:itemId`, `/recovery/:habitId`, `/evening` | Engine tests, Today widget tests, 223-test suite | Personal schedules, energy and habit records stored locally; current browser smoke uses a synthetic profile | Cold-start persistence and mobile-device flows pending |
| Habits and care routines | `lib/ui/screens/habits/`, `studio/`, `habit/`; `/habits`, `/studio`, `/today/why/:itemId` | Hub/engine tests; four-tab tests | Personal habit/routine data; local-only repository | Full Care route and feature audit on device pending |
| Professional learning and goals | `lib/ui/screens/path/`, `ielts/`, `driving/`, `review/`; `/path`, `/path/ielts`, `/path/driving`, `/ielts/review`, `/review` | Hub tests cover goals, IELTS and driving interactions | Personal education, driving and career planning records; local storage | Device persistence and full module review pending |
| Joy and rewards | `lib/ui/screens/joy/`, `rewards/`; `/habits/joy`, `/habits/joy/reward`; old `/joy` redirects | Reward create/redeem tests and nested route tests | Personal preferences/reward records stored locally; nonpunitive design retained | Current browser test covers route resolution; full browser interaction pending |
| Me, settings and personal modules | `me/`, `settings/`, `insights/`, `money/`, `home_admin/`, `evidence/`, `help/`; `/me/*` | Hub/widget tests for settings, money, home and help | Potentially personal financial/home/profile data; sample test fixtures only | Device privacy/export/delete review pending |
| Sensitive health modules | `lib/ui/screens/sensitive/`; `/me/cycle`, `/me/pcos` | Lock-gate and copy tests | Sensitive health data; modules remain disabled/locked by default | Device privacy review and target-platform lock test pending |
| Local persistence and data lifecycle | `lib/data/`, Hive repository, bootstrap; export/import/delete settings routes | Repository close/reopen, import/export/delete tests; browser IndexedDB reload smoke | Personal app database and user-exported JSON; no remote sync configured | Browser/phone cold start and recovery acceptance pending |
| Device and notification services | `lib/services/`, `lib/engine/notifications_service.dart` | Service/widget tests and compile checks | Device notification/biometric/share APIs; no external account access | Real permission prompt and OS behavior need device |
| Permissioned AI | No consumer-AI route or authorized data boundary found in audited source | No live AI consumer-flow test | Personal data must not be sent to agent runtime by default | APP05 NOT_STARTED; consent and isolation must precede integration |
| Cloud sync and accounts | No production sync/account integration asserted by current app source | Repository/local tests only | New owner direction requires account-scoped cloud sync; local edits remain offline-capable | Architecture specified in `docs/architecture/public-account-sync.md`; provider, region, credentials, budget, legal/security review and implementation remain open |
| Public platform coverage | Existing iOS source and local web preview; no Android project scaffold | Flutter tests, web route/persistence smoke; no public platform acceptance | No public consumer account data processed | iOS device/store acceptance pending macOS/Xcode; Android scaffolding missing; web smoke is not deployment/security acceptance |
| Consumer AI boundary | No consumer-AI flow or authorized data boundary | No live consumer-AI test | Local-first; cloud AI needs explicit purpose-specific consent; health/money excluded by default | APP05 remains not started; consent, minimization, service-boundary authorization, and privacy review required before integration |

APP00 inventory covers the current approved feature families, source routes, test evidence, data sensitivity and blockers. It does not assert that every screen is production complete. The new browser route evidence is `ops/evidence/flutter-navigation-browser-20261018.json`; widget evidence verifies branch index/destination mapping. APP00 can close as an inventory/audit gate while APP03 and later functional gates remain open.

## Current reproducible Flutter verification

- Existing global `C:\src\flutter` is Flutter 3.41.9 / Dart 3.11.5 and was left untouched because it is a non-clean checkout and below the project SDK constraint.
- Official Flutter 3.47.5 / Dart 3.13.4 was installed side-by-side at `C:\src\flutter-3.47.5`; verified archive SHA-256: `0ccd71931f49c2fbe394b1eeb6d79af3d624058a043ea0d03d34160581624fb8`.
- `flutter pub get`: PASS.
- `flutter test`: PASS, 223 tests after four-tab route migration.
- `flutter build web --release`: PASS, output `build/web`.
- `flutter analyze` at the original Arabic path initially failed because the analysis-server JSON/LSP frame was truncated. Running it through a temporary `W:` drive alias completed successfully: **No issues found**. `dart analyze lib test` also completed with **No issues found** after repairing the notification API calls.
- Fixed `lib/engine/notifications_service.dart` to use the named parameters required by the locked `flutter_local_notifications` 22.3.1 API (initialize, zonedSchedule, cancel).
- `flutter build web --release --no-pub`: PASS after fixing notification code and configuring Flutter's CanvasKit loader to use the same-origin `canvaskit/` assets instead of the default Google CDN.
- `node ops/local-live/runtime/test-flutter-web-smoke.mjs` with installed Chrome via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`: PASS at 375×812 after migration. It rendered Arabic onboarding, exercised the sample-profile action, reloaded, verified `wlo_meta` persists `onboardingDone=true`, observed 30 local IndexedDB databases, zero browser errors and zero cross-origin requests. Screenshot/report refreshed at `ops/evidence/flutter-web-smoke-375.png` and `ops/evidence/flutter-web-smoke-20261018.json`. The bundled Playwright Chromium path was missing; installed Chrome solved it without downloading a browser.

## Release blockers and next work

1. APP00 inventory and APP03 route inventory are verified under the four-tab taxonomy. Continue APP03 with complete feature journeys and persistence checks for each domain.
2. Run supported device/emulator acceptance for notification permissions, biometrics, share/export, delete, and sensitive-module privacy.
3. Complete APP04–APP07 evidence, including accessibility and offline/recovery behavior; personal app data must not be sent to the agent runtime by default.
4. Windows cannot build/sign iOS; iOS release remains blocked on macOS/Xcode and owner signing. APP08 remains open until prior gates and device release checks pass.
No app data, external API, analytics, cloud backend, public endpoint, Cloud n8n workflow, or paid service was used in these checks.
## APP03 route coverage audit — 2026-10-18

| Area | Route family verified in browser | Widget/feature evidence | Result and boundary |
|---|---|---|---|
| Today | `/today` | Today and planner engine tests in 223-test suite | Route loads; feature logic remains unit/widget tested |
| Professional | `/path`, `/path/ielts`, `/path/driving` | Path/IELTS/Driving hub flows in `test/widget/hubs_test.dart` | All three routes load in system Chrome; widget interactions pass |
| Care | `/habits`, `/habits/joy`, `/habits/joy/reward` | Habits, Joy redemption and reward creation widget cases | All three routes load; four-tab shell retains Care selection for Joy |
| Me | `/me`, `/me/insights`, `/me/money`, `/me/home`, `/me/evidence`, `/me/settings`, `/me/help`, `/me/cycle`, `/me/pcos` | Corresponding hub/widget coverage, including sensitive-module lock tests | All nine routes load; sensitive modules still require device/privacy review |

Browser evidence: `ops/evidence/flutter-navigation-browser-20261018.json` (16 routes, zero page errors, zero non-loopback requests, 375×812). Tab semantics and interaction evidence: `test/widget/hubs_test.dart` actively taps each tab, checks branch index and destination, and verifies selected accessibility state. This closes APP00 inventory and the route-inventory portion of APP03 only; it does not close device workflows, persistence recovery, or module acceptance.

- Android attempt: an existing Android 15 emulator boots, but this repository has no Android target folder/manifest; `flutter test integration_test/app_smoke_test.dart -d emulator-5554` is blocked before install. Project platform scaffolding was not generated. iOS device integration requires macOS/Xcode and an owner-signed environment.

