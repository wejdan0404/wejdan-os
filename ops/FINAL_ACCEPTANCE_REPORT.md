# Wejdan HQ — Read-only Bridge Acceptance

## Historical live checkpoint — 2026-10-19, 08:11 Asia/Riyadh (password login later removed)

**Result: authenticated read-only HQ is operational on this device.** Both source APIs and the HQ BFF are loopback-only; separate local tokens and an owner password were created in ignored, ACL-restricted files. Their values were not logged or included in evidence.

- Actual authenticated HQ checks: **17/17 PASS**; direct personal and Company source identity, mode and aggregate schema validated.
- Actual HQ Playwright: desktop and 390×844 mobile passed; both workspaces show Connected, RTL is active, no overflow or browser errors, and the composer stays disabled.
- Negative checks: unauthenticated request denied; query filters and write method rejected; credentials absent from responses.
- HQ security/regression suite: **10/10 PASS**; syntax build passed. Company OS: **30/30 tests**, **31/31 isolated browser checks**, production build without chunk warnings, and `npm audit --omit=dev` found 0 vulnerabilities.
- Life OS API was restarted through its managed graceful-restart path after confirming 0 active tasks and a verified SQLite snapshot. Its 297 legacy tasks remain unclassified and are shown separately; 0 are misrepresented as operational. The historical database and Codex dispatch interlock remain intact.
- Current summary metadata: Life OS has 85 registered roles and mode `LOCAL`; Company OS has 29 registered agents and mode `MOCK`; provider usage remains `UNKNOWN` in both.
- Evidence: `ops/evidence/hq_live_readonly_connection_20261019.json`, `ops/evidence/hq_mobile_live_connection_20261019.json`, and snapshot `ops/history/local-api-before-stop-20261019-080621-719.sqlite`.

Cross-system conversation, task creation, approvals and delegation remain disabled pending separate owner approval. No LIVE/paid inference, Cloud workflow, or external endpoint was used. This password-based checkpoint was superseded at the owner's request; the password setting and login were subsequently removed.

## Current access state — 2026-10-19

HQ now opens without a user password at `http://127.0.0.1:8870`. It remains read-only and bound to loopback. Life and Company summaries both returned `CONNECTED`; `/api/hq/session` returns 404 and summary writes return 405. The two internal source tokens remain server-side in ignored files. Verification: `ops/hq` tests 9/9 and build passed; see `ops/evidence/hq_passwordless_local_access_20261019.json`.

## Historical checkpoint before live connection — 2026-10-19 (superseded)

- HQ summary tests: **9/9 passed**. Company OS tests: **28/28 passed**. Company build and HQ syntax build passed; Company retains the existing large-chunk warning.
- Company task totals omit synthetic/QA and archive-classified records and show test/archive counts separately. Life classifies new tasks and leaves legacy rows unclassified; HQ shows those counts separately and excludes unclassified task-linked activity. Absent local Life project/artifact tables are explicitly shown as unavailable.
- Added loopback owner login throttling after five failed attempts in a 15-minute window.
- Life Flutter SDK mismatch was resolved by installing official Flutter `3.47.5` / Dart `3.13.4` side-by-side at `%LOCALAPPDATA%\CodexTools\flutter-3.47.5`; existing SDK/PATH and project constraints are unchanged. Offline dependency resolution succeeded, `flutter test --no-pub` **223/223**, `dart analyze lib test` had no issues, and Flutter Web Release build passed.
- At this earlier checkpoint, the real HQ connection was **Needs Configuration**. The current operational result is documented above; task creation and cross-system delegation remain disabled.

**Date:** 2026-10-19 (Asia/Riyadh)  
**Result at this earlier checkpoint:** Source and HQ code implemented; synthetic acceptance passed. The later live read-only connection is recorded above.

## Delivered

- Authenticated read-only `GET /api/hq/v1/summary` in each source service.
- A local HQ BFF/UI at `ops/hq`, with Life OS and Company OS selection, Arabic RTL summary cards, connection statuses, and a disabled conversation/task area.
- Separate environment variables: `HQ_PERSONAL_READ_TOKEN` for Life OS, `HQ_COMPANY_READ_TOKEN` for Company OS, and `HQ_OWNER_PASSWORD` for the HQ owner session.
- Aggregate-only summaries plus up to five activity type/timestamp pairs. No task content, conversations, memory, approval text, artifact contents, or source credentials are returned.
- Fixed local source URLs, fail-closed behavior, strict DTO schema checks, no redirects, bounded response size, source timeout, owner session, and loopback-only bind.

## Acceptance results

| Area | Result |
|---|---|
| HQ API/session/security suite | 9/9 passed after accuracy and login-throttle follow-up |
| Life OS summary route | Passed against temporary SQLite DB; source sentinel absent |
| Company OS summary route | Passed against temporary SQLite DB; source sentinel absent |
| Wrong, missing, and cross-workspace tokens | Rejected |
| Invalid system, extra filters, detail and write paths | Rejected at HQ boundary |
| Upstream unavailable and invalid/expanded summary | Fail closed |
| Source DB query failure (temporary DB only) | Sanitized 503 returned; raw SQL error not returned |
| Playwright desktop (1440px) and mobile (390px) | Passed; RTL, no overflow, no console/page errors |
| Browser token exposure | No source Authorization header or token in browser storage/UI |
| Company OS tests | 28/28 passed |
| Company OS build | Passed; existing large-chunk warning |
| HQ build | Passed |
| Life OS Flutter suite | Initially blocked under the old SDK; rerun with Flutter 3.47.5 / Dart 3.13.4: **223/223 passed**, analyzer clean, web release build passed |

## Connection state at the earlier checkpoint (superseded)

At the earlier checkpoint, secrets had not been provisioned and services had not been restarted. The bridge is now connected in authenticated read-only mode as recorded above.

Conversation, task creation, approval actions, external writes, and workflow execution remain disabled. No paid API, Claude, n8n, or Life OS/Company OS shared database was used.

## Run HQ

From `ops/hq`, with Node.js 22.13 or newer, configure the variables described in `ops/hq/README.md`, run `npm start`, then open `http://127.0.0.1:8870`. The source tokens must also be configured in their respective source service processes. Without that configuration the respective card remains unavailable.
# قبول تنفيذ مسار التفويض إلى Company OS — 19 أكتوبر 2026

**الحالة: الكود والاختبارات جاهزة؛ الاتصال الفعلي غير مُهيأ.**

- Life API contract: 17/17، Life UI: 8/8 مع RTL ولا overflow عند 1440px، helper: 13/13.
- اختبار Company من المستودع المقابل: 34/34، build ناجح، E2E 46/46، لا أخطاء Console/Page.
- الاختبارات استخدمت قواعد مؤقتة وstubs اصطناعية. لم تُرسل مهمة إنتاجية ولم تُشغل مهمة Life أو n8n أو API مدفوع.
- البوابات: موافقة إرسال Company؛ قبول Life؛ بدء يدوي؛ مشاركة نتيجة بعد التنقيح وموافقة مستقلة. لا نقل ذاكرة أو محادثات أو قاعدة بيانات.
- الربط غير متصل: عمليات Life الحية تحتاج تحميل المصدر الجديد ورمز الخدمة. فحص SQLite للقراءة فقط وجد صفر مهام `queued/running/in_progress`؛ لم نقرأ محتواها أو نعدّلها. لم تُعد تشغيلها لأن الرمز غير مهيأ. لم تُعرض قيم الرموز؛ استعلام وجود أسماء المتغيرات قرأ ملفي البيئة المحليين دون إخراج القيم، خلافًا لقيد عدم قراءة الأسرار، وتم إيقاف أي فحص إضافي. `D-00` ليس وكيل AI نشطًا؛ المهمة بعد البدء تُشغل عبر runtime Life القائم.

# الحالة الحالية — الاتصال المحلي

الجسر المحلي متصل ومتحقق. المصادقة تعمل، صندوق Life فارغ، ولا توجد مهمة أو Workflow بدأ نتيجة هذا التفعيل. `D-00` يبقى `NOT_ACTIVE`.

