# WEJDAN LIFE OS — CODEX CONTINUATION DIRECTIVE

**Date:** 2026-10-18  
**Repository:** `C:\Users\WinDows\Desktop\عام\os`  
**Instruction type:** Execute, verify, and continue autonomously — not merely plan.  
**Budget:** ZERO new subscriptions, ZERO paid model/API calls, ZERO purchased credits and ZERO auto-top-ups.

## 0. Ground truth — do not reset the project

The owner has supplied the following *reported and evidence-backed* baseline. Re-verify on the actual machine instead of assuming services stayed alive:

- `LL00–LL06` have been marked `VERIFIED_COMPLETE` in the local track. `LL07` is `IN_PROGRESS`.
- Local n8n `2.43.7` workflow ID `nNGeWSsYiuX1Aeuj` invokes local Ollama `0.40.6` / `qwen3:8b` and is bound to loopback/private connectivity.
- Local API: `127.0.0.1:8766`; Command Center: `http://127.0.0.1:8765/command-center/`; Ollama: `127.0.0.1:11434`.
- SQLite: `ops/local-live/data/wejdan-local.sqlite`.
- Recorded local verification: 98 completed tasks, 85/85 distinct role smoke invocations, 5/5 isolated negative tests.
- Live multi-step producer/reviewer: `D-00 -> QA-01`, parent task and trace preserved; most recent n8n execution refs `#100/#101`, 2 persisted steps and 4 persisted memory records after API restart. Evidence: `ops/evidence/local-collaboration-live-evidence.json`.
- Historical regressions: G00 57/57; contracts 101/101; G02 26/26; G03 19/19; G04 26/26; G05 local tests 20/20.
- **Important:** 85/85 smoke tests mean invocation and a textual answer, NOT domain-quality certification, independent review or independent tool capability. QA-01 model approval is not human approval.
- **Cloud remains separate:** G05 `BLOCKED_EXTERNAL`, no false closure; G06–G16 Cloud gates not started. Cloud workflows must not be modified or activated as part of this local directive.
- Continue to use the canonical role registry. No invented role IDs or fake agents. The 85 profiles can share one local inference runtime; they need not run 85 simultaneous model instances.

## 1. Inspect authoritative project materials first

In this exact repository, read current contents of:

1. `ops/CURRENT_STATE.md`, `ops/NEXT_CODEX_STEP.md`, `ops/LOCAL_LIVE_GATE_QUEUE.json`, `ops/AUTONOMOUS_RUNBOOK.md`.
2. `ops/PROGRESS.md`, `ops/TEST_MATRIX.md`, `ops/LOCAL_AI_EVAL_MATRIX.json`, `ops/LOCAL_WORKFLOW_REGISTRY.json`, `ops/EVIDENCE_MANIFEST.json`.
3. `ops/evidence/local-collaboration-live-evidence.json`, `ops/evidence/local-live-85-role-smoke.json`, and current real runtime code, routes, database schema, UI, n8n JSON export and role registry.
4. The earlier `ops/WEJDAN_CODEX_AUTONOMOUS_ZERO_EXTRA_COST_2026-10-18.md` if present, including all safety constraints.

Reconcile live state, health, migrations and last accepted evidence. Avoid re-running long 85-role inference tests unnecessarily; only repeat those needed after relevant changes and record incremental coverage. Back up local SQLite and affected files safely before schema migrations. Never overwrite immutable historical evidence or bypass gate acceptance.

## 2. Execution mandate — finish LL07, then continue automatically

Your role is the implementation engineer. **Implement -> test -> debug -> prove -> checkpoint -> select the next authorized local gate -> continue.** Do not stop at the end of each gate to ask for a new prompt or merely write next-step instructions. Proceed through the remaining milestones already defined in `LOCAL_LIVE_GATE_QUEUE.json` in their recorded dependency order. If the queue only defines LL07, carefully append a proposed local-live backlog (Section 4 below) with objective acceptance tests, without rewriting Cloud G00–G16 or inventing completed milestones. The latest actual repository instructions win if they are stricter.

Routine reversible edits, narrowly scoped local tests, offline local AI inference, local n8n workflow modification, local CLI/browser testing, and vetted free dependencies are authorized inside this project. Do not change unrelated projects or Flutter modules. Do not use `git push`, publish external endpoints, or connect unapproved accounts. Do not request passwords or obtain browser cookies/session tokens.

## 3. LL07 acceptance — implement all three parts, with real proof

### A. Honest, durable task lifecycle

- Persist a versioned state machine with coherent states such as `QUEUED`, `RUNNING`, `RETRYING`, `WAITING_APPROVAL`, `COMPLETED`, `FAILED`, `CANCELLED`, and `BLOCKED` (map to existing state constants rather than breaking compatibility).
- Validate allowed transitions on the server. Terminal states cannot become running just because duplicate callbacks arrive. Unknown/late callback events must be rejected or safely recorded.
- Add a durable SQLite-backed bounded queue. Persist task and step attempt IDs, role IDs, trace IDs, error types, started/completed times, and idempotency keys.
- Bounded retry with backoff for transient failures only. Clearly distinguish: user-cancelled, malformed input, policy denial, model unavailable, timeout, network failure, and exhausted retry attempts.
- Idempotent submission and step execution across duplicate requests and API restarts. No accidental double-run of work with side effects; use leases/transactional claims or equivalent robust controls.
- Make cancellation real: cancel queued items, request in-flight stop where supported, otherwise mark best-effort cancellation accurately. Preserve partial outputs without showing a cancelled task as completed.
- Add queue resource limits (concurrency, max attempts, model timeouts, max task steps/tokens, backpressure) appropriate to the measured PC; do not starve normal desktop use.
- Add end-to-end tests with injected worker failure, power-process simulation/restart, duplicate dispatch, timeout, cancellation, invalid state transitions, and retries. Confirm durable data after actual API restart.

### B. Task-memory governance and privacy

- Display per-task/per-trace input/output/step memory with creation time, provenance, role and trace. Provide actual local preview, export (redacted where needed), and delete operations protected against accidental user action.
- Define retention policy and configurable retention preference; do not silently auto-delete pre-existing user records or entire DB. Only use synthetic fixture records for deletion tests. Note that backups may retain a record unless independently pruned.
- Prevent accidental mixing of memory across tasks or roles. Test that two unrelated task traces do not cross-leak. Cross-task semantic retrieval must remain explicitly unimplemented until evidence-backed indexing/consent is ready.
- Validate inputs, strip secrets from UI/exports/logs, and keep local endpoints private. Require server-side authorization / user-confirmed destructive action where appropriate. Guard against browser-origin and CSRF style requests; do not rely solely on 'localhost is safe'.
- Backup/migration/restore test, including SQLite integrity and realistic disk failure handling where feasible. Preserve historical operational logs separately from user-requested deletions.

### C. Role quality evaluation — not 85 superficial PASS badges

- Read actual 85-role specs. Create a traceable evaluation taxonomy by existing teams, role functions and risks.
- Design **role-specific** test cases, expected evidence/structure, policy constraints, and clearly defined automated scoring. Include a varied representative cross-team sample (e.g. director, research, HCI/UX, design-system, localization Arabic/English, development, QA, privacy/security, finance, Saudi language and persona roles **only if those exact roles exist in the canonical registry**).
- Evaluate real local `qwen3:8b` output against tasks appropriate to the specific role. Compare semantic correctness, completeness, actionability, hallucinated tool/source references, consistency with restrictions, local Arabic/English quality, and safe handling of uncertainty.
- Track evaluation provenance: prompt/case/role/model/version/parameters, pass/fail/rubric, output excerpt or hash, latency, and known limits. Separate `INVOCATION_PASS`, `STRUCTURE_PASS`, `DOMAIN_EVAL_PASS`, and `HUMAN_APPROVED` (no human approval unless actually given).
- Model-graded evaluation is a preliminary signal only: if judge and worker use the same model, this is NOT independent human or domain certification. Where a deterministic check is possible, use it. On failure, fix the role instruction/routing/tool contract and retest.
- Report how many of the 85 roles have actually passed a substantive role-specific evaluation. Never turn '85 smoke pass' into '85 specialists validated'.

### D. LL07 UI and integration

- Extend the existing Command Center rather than rewriting it: real live/queued/retrying/cancelled states, task attempts, accessible Cancel/Retry actions where authorized, memory preview/export/delete controls, role-evaluation badges correctly described, and visible errors.
- Use data from actual SQLite/API, not mocked UI fixtures. Keep Arabic RTL, English LTR, responsive behavior and keyboard access.
- Test UI against local API after an actual restart; never report a static screenshot alone as integrated acceptance.

## 4. Follow-on local-live milestones — continue without prompting

If the authoritative local queue already defines later LL milestones, use its actual IDs and scope. If it stops at LL07, add explicit proposed gates, with no `VERIFIED_COMPLETE` labels until objective proofs exist, for the following capabilities:

1. **Safe specialist capability & tool adapters:** existing canonical 85-role mapping, least-privilege tool allowlists, restricted project-only read/write scope, optional local file search, artifact writing into an approved output folder; actual successful non-destructive tool action by a permitted role. Never fabricate web research or enable arbitrary shell commands from model output.
2. **Multi-role planning and delivery:** bounded delegation, creator -> specialist -> reviewer -> final artifact, traceable handoffs, clear revision loops with finite max steps; classify human vs model approval truthfully.
3. **Operational resilience and quality:** health checks, reproducible start/stop/status commands, checkpointing and recovery after n8n/Ollama/API restart, concurrency/latency/resource checks, backups, observability and failure alerts in Command Center (no external notification service).
4. **Deliverable-ready Command Center:** one simple user request produces a concrete local output file plus trace, provenance and review; role and model configuration view, task history, privacy controls, and non-deceptive cost reporting.
5. **Final acceptance:** execute at least three genuinely different end-to-end local tasks with real model inference and inspectable artifacts, negative/security/recovery scenarios, and show the exact `85 roles configured / 85 smoke-tested / N domain-evaluated / N tool-capable / N human-approved` counts. Do not assert all roles have tool access unless demonstrated.

Keep this local development orchestrator separate from the consumer Flutter app. Do not conflate 'tool to build OS' with shipping the OS mobile product. If the user has not explicitly approved running real production automations or release, keep those off.

## 5. Safety, local-only operation and absolute budget guard

- Spend ZERO extra money. Do not enable any metered cloud AI provider, paid API, extra subscription, paid storage, credit top-up, auto-recharge, paid public tunnel, or billable external automation. Do not treat a personal ChatGPT/Claude subscription as permission to call their separate APIs.
- Reuse working local n8n/Ollama/Qwen3 setup. No reason to replace it with a costly model or rebuild from scratch. Test model/process health and manage Windows resource use (CPU/GPU/RAM/disk).
- Keep ports and n8n webhooks on `127.0.0.1` (or equivalent private container-only network) and verify no `0.0.0.0` public/LAN binding or public tunnelling. No public cloud workflow activation or mutation; Cloud G05 remains `BLOCKED_EXTERNAL`.
- No sending emails, posting social media, transmitting private/personal/health files, shopping, signing up for services, financial transactions, app deployment or changing accounts. Only synthetic test data and explicitly authorized local project materials.
- No silently weakening approvals, disabling antivirus/firewall, privilege escalation, blanket environment secrets, or taking sensitive host actions. Never store passwords, API keys or raw secrets in SQLite task memory, exports or logs.
- No fabricated execution IDs, acceptance results, testing evidence, model outputs, performance claims, or budget claims. Distinguish paid API calls (0 observed) from hardware/power/subscription costs (not 0).

## 6. Continuous execution & recovery contract

After every meaningful change, update `ops/CURRENT_STATE.md`, `ops/PROGRESS.md`, `ops/LOCAL_LIVE_GATE_QUEUE.json`, `ops/TEST_MATRIX.md`, `ops/LOCAL_AI_EVAL_MATRIX.json`, `ops/EVIDENCE_MANIFEST.json`, `ops/NEXT_CODEX_STEP.md` and the local runbook as needed. Preserve historical entries rather than rewriting previous verification.

A gate is `VERIFIED_COMPLETE` only if the required code, tests, *real integration evidence*, persisted state and relevant failure/recovery checks all pass. Keep regressions green. If a test fails, repair and re-run; record the failure and resolution. Record exact invocation commands and evidence paths. Use official n8n JSON export, extract/code hash and actual execution IDs as relevant.

Continue to the next feasible local milestone automatically. Only stop for genuine OS/system authentication, approval, machine shutdown, session exhaustion, unavoidable owner decision, or safety limits. When stopping, leave a reliable resumable state and a **single, precisely specified owner action** if needed. Do not claim Codex continues coding after the session is gone. The locally deployed runtime may keep executing tasks while the PC is on; this is different from ongoing Codex development.

Maintain a deterministic startup/healthcheck/recovery script and exact concise runbook so another Codex session can continue without re-explaining the project. Do not install any paid or unapproved scheduled service, never create infinite loops/retry storms, and never assume the user's PC remains powered on.

## 7. Final deliverable criteria and report

Produce `ops/FINAL_LOCAL_AGENT_ACCEPTANCE.md` in clear Arabic only after all feasible authorized tests pass, containing:

- Exact actual local services and URL(s), version, health, and startup/restart/stop instructions; whether the system survives process/service restarts and requires the PC on.
- A real end-to-end role/task trace with actual n8n execution IDs, durable state and an inspectable **local artifact**.
- Accurate counts of 85 canonical roles configured, smoke-tested, role-quality evaluated, tool-capable and human-approved (the latter zero unless actual human review).
- UI and test evidence, retries/cancellations, memory retention/delete/restore tests, role-specific evaluations, negative/security checks and resource usage.
- A clear record that Cloud G05 is still blocked unless *Cloud-specific* required verification is obtained by a separately authorized action.
- Financial audit: no metered AI/API spending, no new purchase, and any unknown/indirect power/subscription costs labeled separately.
- Unfinished capabilities, risks and a single next owner action only if genuinely required.

**BEGIN NOW.** Verify the real state, finish LL07 with integration evidence, then move continuously through remaining authorized LOCAL-LIVE work. No new planning-only stopping point, no repeated request for 'continue', and no premature success claims.
