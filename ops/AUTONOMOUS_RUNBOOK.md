# التشغيل المحلي — Wejdan Life OS

## الحالة

هذا المسار محلي مستقل. بوابة G05 الخاصة بـ n8n Cloud تظل `BLOCKED_EXTERNAL` إلى أن ينجح اختبار Cloud المطلوب. Ollama وQwen3 يستخدمان inference محليًا فقط؛ لا توجد مفاتيح API مدفوعة أو أدوات مسموحة للأدوار.

## منافذ خاصة

- Ollama: `http://127.0.0.1:11434`
- n8n المحلي: `http://127.0.0.1:5678`
- API للمهام: `http://127.0.0.1:8766`
- Command Center: `http://127.0.0.1:8765/command-center/`

لا تستخدم `0.0.0.0` أو tunnel أو webhook عام. عند غياب n8n أو النموذج، يجب أن يفشل إرسال المهمة بوضوح.

## التشغيل (PowerShell، من جذر المشروع)

1. Ollama يبدأ بعد تثبيته كتطبيق للمستخدم. تحقق بـ `ollama list` و `Invoke-RestMethod http://127.0.0.1:11434/api/version`.
2. n8n بعد اكتمال تثبيت الحزمة: `$env:N8N_LISTEN_ADDRESS='127.0.0.1'; $env:N8N_HOST='127.0.0.1'; $env:N8N_PORT='5678'; $env:N8N_USER_FOLDER=(Resolve-Path 'ops/local-live/runtime/n8n-userdata').Path; node ops/local-live/runtime/n8n/node_modules/n8n/bin/n8n start`.
3. استورد `ops/local-live/runtime/workflow.local-agent.json` باستخدام CLI الرسمي، وتحقق من تفعيله محليًا فقط قبل استخدام webhook الإنتاجي.
4. API: `node ops/local-live/runtime/server.mjs`.
5. Command Center: `node command-center/preview-server.mjs`.

## الإيقاف والاسترداد

أوقف كل عملية في نافذتها بـ Ctrl+C. بيانات المهام المحلية موجودة في `ops/local-live/data/wejdan-local.sqlite` مع SQLite WAL. خذ نسخة من ملفات قاعدة البيانات الثلاثة بعد إيقاف API، أو استخدم SQLite backup API. لا تحذف ملفات Cloud أو تاريخ الأدلة. لا توجد خدمة تشغيل خفية أو مجدولة.

## التكلفة والحدود

استدعاءات النموذج من هذا التشغيل تذهب إلى Ollama loopback فقط. تكاليف الكهرباء والأجهزة والاشتراكات القائمة غير مقاسة. النموذج لا ينفذ إجراءات خارجية، والأدوار الـ85 تملك ملفات إعداد لا صلاحيات تنفيذ تلقائية.


## التعاون المحلي والذاكرة (LL06)

يمكن تفعيل مراجعة محلية اختيارية من نموذج المهمة. يمر الطلب أولًا بالدور المحدد ثم بدور مراجعة مسموح في سجل الدور (الافتراضي QA-01 عند توفره). المرحلتان تستخدمان task_id وtrace_id نفسيهما مع n8n execution منفصل لكل مرحلة. تفاصيل التنفيذ والذاكرة محدودة بالمهمة وتعرض من GET /api/tasks/{task_id}. الذاكرة تسجل الإدخال/المخرج والمصدر، ولا يوجد حتى الآن استرجاع دلالي عابر للمهام أو حذف/مدة احتفاظ من الواجهة؛ لا تُدخل معلومات شخصية أو سرية. حكم QA مولد محلي وليس اعتمادًا بشريًا.

اختبار المنطق السلبي: node ops/local-live/runtime/test-collaboration.mjs — يستخدم خادم stub محليًا على منفذين مؤقتين، لا يستدعي Ollama أو n8n Cloud، ويحذف قاعدة الاختبار بعد التشغيل.

## متابعة LL09 بعد LL08

- `CODEX_SUBSCRIPTION` remains disabled in the production adapter/API/UI until separate owner approval for exactly one live app invocation. Do not attempt a real CLI/API task during mock validation.
- The current persistent API source is `ops/local-live/runtime/server.mjs`. Restart it using the existing local launcher/console after source updates. After restart, verify `GET http://127.0.0.1:8766/api/provider-status` before using the Command Center. If process control is blocked, leave the old process untouched and mark LL09 runtime activation incomplete.
- Current runtime PID 45096 was verified as this API and runs under a Codex-launched PowerShell parent; no Windows service or graceful shutdown endpoint is registered. The safe owner action is Ctrl+C in the API's owning console followed by the normal `node ops/local-live/runtime/server.mjs` launch. Before that, the verified snapshot is `ops/history/20261018-ll09-pre-restart-wejdan-local.sqlite`; keep `deny_codex_pending_approval` in place.
- Safe tests: `node ops/local-live/runtime/test-codex-subscription-adapter.mjs`, `node ops/local-live/runtime/test-codex-subscription-integration.mjs`, `node ops/local-live/runtime/test-local-capabilities-tools.mjs`, and `node ops/local-live/runtime/test-artifact-pipeline.mjs`. The Playwright smoke can use the installed Chrome binary and mock API routes; no new browser installation is needed.
- LL13 memory model preparation: `node ops/local-live/runtime/test-memory-governance.mjs` uses an in-memory synthetic SQLite database only. It is not wired to the persistent API database yet.
- LL14 preparation: `node ops/local-live/runtime/test-role-evaluation.mjs` generates 85 distinct registry-derived scenarios/deliverables, tests two negative cases per role and cross-cutting failures. It validates contract shape and evidence pointers only, not subject-matter truth.
- Real synthetic local artifacts use `ops/local-live/runtime/run-artifact-pipeline-demo.mjs`; this calls loopback Ollama only (three roles, bounded revision) and writes under `ops/local-live/artifacts/<task_id>/`. It is not connected to task SQLite yet; do not count it as an LL12 completion.
- CLI `--sandbox read-only` is not proof of network denial or absence of every tool action. The adapter reports tool activity unverified unless explicit events are observed and rejected.
- Cloud G05 is still `BLOCKED_EXTERNAL`. Do not modify or execute Cloud/Company OS workflows in this local track.

## 2026-10-18 — LL09 verified runtime and local continuation

- LL09 managed restart is now verified complete. Current observed runtime was PID `70264`; always call `ops/local-live/runtime/manage-local-api.ps1 status` before acting because PIDs change. The script implements owner-checked graceful stop/start, snapshot, SQLite checks, health checks and logs.
- Current runtime endpoints are `/api/health` and `/api/provider-status` (both under `http://127.0.0.1:8766`). `/health` is not an API route. Provider dispatch remains disabled; Ollama is the effective default. Do not remove `deny_codex_pending_approval`.
- LL10 is blocked on inability to prove included-usage-only/no-overage behavior. Do not invoke Codex live; continue with local Ollama.
- D-00 acceptance evidence is not green: the last real task has saved output and independent review but failed deterministic specialist checks, including a missing dependency overview. Preserve the failed artifact and do not reinterpret QA-01's model PASS as specialist acceptance.
- D-00 quality evaluator tests: `node ops/local-live/runtime/test-role-acceptance-evaluator.mjs` (3 checks). The role runner `ops/local-live/runtime/run-role-acceptance.mjs` has testable exported evaluator and maintains attempt history. Work the 85-role queue in bounded sequential batches only; never concurrent inference.
- Flutter release toolchain lives side-by-side at `C:\src\flutter-3.47.5`; run the exact versioned `flutter.bat`, do not alter the existing `C:\src\flutter` checkout. Current checks: pub get PASS, 222 tests PASS, web release compile PASS, analyzer unresolved. See `ops/APP_FEATURE_GAP_MATRIX.md` and `ops/APP_GATE_QUEUE.json`.
- A final app decision is pending because the executive directive calls for four primary tabs while `docs/PRODUCT_SPEC.md` and `design/UIKIT.md` define five. Preserve the current five-tab behavior until owner resolves; continue non-conflicting quality and functional work.
