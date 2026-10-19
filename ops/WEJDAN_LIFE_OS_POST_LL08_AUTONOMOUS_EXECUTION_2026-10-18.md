# Wejdan Life OS — Post-LL08 Autonomous Delivery Contract

**Prepared:** 2026-10-18  
**Target repository:** `C:\Users\WinDows\Desktop\عام\os`  
**Product:** Wejdan Life OS, **NOT** Company OS.  
**Execution mode:** Autonomous engineering within clear, local-only, zero-additional-spend boundaries.  
**Authority:** This document governs new work after LL08. Existing accepted gate history and immutable evidence outrank this document for historical facts. The two restored plans bundled with it are historical context; their stale instructions to reimplement LL07/LL08 do not authorize repeated testing or overrides.

## A. Mission and exact starting point

Your objective is a reliable, useful, private Life OS development-agent system: an actual task submitted to the Command Center is assigned to a canonical role, processed through an authorized inference provider, optionally reviewed by another role, traced and remembered accurately, and ultimately produces an inspectable local artifact with bounded quality gates. Keep developing it instead of repeatedly stopping to write plans.

Read **actual on-disk repository state first** and reconcile it with the owner's evidence. Never assume a completed label proves current runtime health.

- The owner reports `LL00–LL08 VERIFIED_COMPLETE`. The original `ops/LOCAL_LIVE_GATE_QUEUE.json` stops at LL08; no historical LL09+ definitions have been established. Proposed LL09–LL16 below are **NEW PROPOSED gates**, not historical work or previously approved specifications. Preserve the existing LL00–LL08 rows and evidence.
- LL07: local task state, cancellation, retries, restart recovery, task-memory preview/export/delete, approval and 10 role-specific structural/safety evaluation cases; 10/10 isolated lifecycle tests, latest 10/10 representative role tests. These are **not human/domain competency certifications**. No TTL-based automatic retention; deletion is manual. Existing memory guards: 24,000 characters/record, 64,000/task, database 512 MiB.
- LL08: `CODEX_SUBSCRIPTION` adapter added as an **optional** provider; historical `OLLAMA_LOCAL` remains the working default. `codex login status` reportedly showed `Logged in using ChatGPT`. Exactly **one** read-only direct Codex CLI synthetic invocation succeeded **before** integration, reporting 20,441 input and 40 output tokens. The CLI pilot evidence file is reported at `ops/evidence/codex-subscription-pilot.json`, but was not supplied in this handoff: independently inspect it on the machine before relying on precise pilot details.
- The adapter/API/SQLite/Command Center after integration were tested using a **mock/stub CLI**. `ops/evidence/codex-subscription-integration.json` says `mode: mock-only`, `live_codex_calls: 0`, `n8n_runs: 0`. Therefore **real Codex-through-API execution has NOT been validated or persisted as a live Codex task**.
- Local n8n/Ollama/Qwen3:8b had real synthetic role invocations and two-role collaboration; keep existing runtime working. The 85/85 prior smoke result is **invocation evidence, not expert correctness and not Codex-based 85-role coverage**.
- n8n Cloud G05 is still `BLOCKED_EXTERNAL`. Cloud project `p5MRQODVi7djfuZf` is the **Life OS Cloud project** and must remain untouched by this post-LL08 local track. Company OS project `bJnN5b7wCUxDoWuz` is strictly out of scope. Do not use or alter either cloud project.
- The target is the agent development/control plane; the separate consumer Flutter app is not thereby finished.

## B. HARD STOP policies

1. **Zero additional purchases, top-ups, new subscriptions, paid API invocations, API keys, Claude calls, hosted model calls, paid external services, remote deployment or automatic credit spending.** The Codex ChatGPT sign-in path is allowed only within existing subscription usage limits; this is quota-limited, not unlimited or cost-free in the general sense.
2. **No second LIVE Codex inference call until the owner explicitly authorizes it.** The first pilot is a spent historical allowance, not permission for unlimited repetition. Tests may use deterministic stub/mock CLI without quota. Resume independent local work while live Codex E2E remains pending. Do not burn through subscription quota by running 85 live-role probes.
3. **No n8n workflow mutation, activation, execution, new public endpoint, schedule or cloud access** as part of hardening/testing the Codex adapter. Preserve existing local n8n/Ollama behavior. Previously permitted synthetic local Ollama/n8n acceptance may be run in its independently scoped tasks only if necessary, without modifying verified workflows, and must be logged separately from adapter verification.
4. Keep all services bound to `127.0.0.1` / private loopback. No public binding, tunnels, LAN access, uploads, emails, messages or external actions. Inspect original host permissions before assuming localhost is trusted.
5. Only synthetic data in automated tests; never read personal files, user credentials or production records, and never print or store secrets or OAuth tokens. No searching through browser sessions/cookies or Codex auth cache files.
6. No API-to-Codex `shell: true`, shell-command interpolation, arbitrary executable paths from UI input, or unrestricted model-generated filesystem commands. Least-privilege allowlists, enforced server-side; validate all task/trace/role IDs.
7. No `git push`, deployment, new payment method, privileged OS changes, broad firewall/antivirus changes, or package upgrade with meaningful privacy/security ramifications without an owner approval. Routine reversible local source edits/tests are authorized.
8. Stop Codex calls on auth uncertainty, any API-key/provider-billing ambiguity, quota exhaustion, repeated errors, cancellation, elevated resource use, or missing spending protection. **No silent fallback** from requested Codex to Ollama/Claude/API; the user may deliberately choose `OLLAMA_LOCAL` as a separate provider.
9. Never fabricate tests, approval, screenshots, live execution identifiers, costs, timing, or domain-quality scores. The labels `LIVE`, `INTEGRATED`, `DOMAIN_EVALUATED`, and `HUMAN_APPROVED` need separate actual evidence.

## C. Required inspection and reconciliation — do immediately

1. Open `ops/CURRENT_STATE.md`, `ops/LOCAL_LIVE_GATE_QUEUE.json`, `ops/NEXT_CODEX_STEP.md`, `ops/PROGRESS.md`, `ops/AUTONOMOUS_RUNBOOK.md`, `ops/TEST_MATRIX.md`, `ops/EVIDENCE_MANIFEST.json`, `ops/LOCAL_AI_EVAL_MATRIX.json`, existing user instructions and the actual SQLite/API/Command Center source.
2. Read `ops/evidence/codex-subscription-pilot.json` (if it really exists), `ops/evidence/codex-subscription-integration.json`, LL07 tests and role evaluation results, and `ops/local-live/runtime/codex-subscription-adapter.mjs`.
3. Confirm installed CLI capabilities and ChatGPT login mode with documented no-secret-output status commands. Read `codex exec --help` for the local version; do not depend on guessed flags. Do not run live inference for inspection.
4. Run non-inference syntax and mock tests and determine exact existing `npm test`, `npm run build` and Playwright entrypoints; run only where scripts actually exist. Report `NOT_APPLICABLE` when absent and give evidence.
5. Backup affected local source and SQLite with a safe snapshot strategy, record integrity/checksums; do not copy auth stores or mutable runtime state into public archives.
6. Reconcile stale statements in older plans. Mark this plan as a **proposal** until verified against any stronger on-disk owner-approved requirements. Then record it as the accepted local engineering queue if nonconflicting, with every new gate initially `NOT_STARTED`.

## D. Fix the Codex adapter before any new live call (LL09)

Static finding in the handed-over adapter source: `spawn(..., { env: process.env })` passes the *entire* parent environment to the Codex subprocess. This creates an avoidable risk of API-key/other secret inheritance, even when the reported login is ChatGPT. **Do not treat the previous one-call pilot as proof that all future environments are safe.**

Implement and test all of the following:

- Build an explicit, minimal environment allowlist needed for an authenticated ChatGPT-subscription CLI on Windows (basic OS/runtime path and required Codex configuration, if proven safe). Scrub `OPENAI_API_KEY`, `CODEX_API_KEY`, `AZURE_OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, alternate `*_API_KEY`, and metered model-provider routing/base-URL overrides, without logging values. If the CLI stops working safely under this environment, fail closed rather than restoring all of `process.env`.
- Verify that the effective Codex auth method is **ChatGPT account sign-in**; `login status` is not a guarantee against injected API-key-based overrides. Validate a safe subprocess environment before dispatch; preserve secure CLI-managed tokens without exposing their bytes.
- Pin or allowlist the trusted installed Codex entrypoint and Node executable; no user-prompt-supplied executable paths or arbitrary override. Recheck flags for installed version. Keep read-only sandbox, isolated temporary project workspace and `--ephemeral` if supported. Never use `--dangerously-bypass-approvals-and-sandbox` or `--yolo`.
- Clamp both stdout **and** stderr bytes, not just per-chunk truncation. Enforce wall-clock timeout, abort/cancellation and safe subprocess-tree cleanup on Windows. Clean the temporary directory in all success/failure paths; honor signal propagation and concurrency cap default `1`.
- Parse actual CLI JSONL events defensively; validate terminal completion, bounded final output, expected role/task/trace metadata, output content/schema and sanitized error categories. Token usage is **reported usage only**; don't invent cost. Do not fall back to a hardcoded model name as if proven by the CLI. Keep `provider_execution_id` separate from `adapter_run_id`.
- Verify the subprocess did not invoke tools/file/network actions when the task forbids those actions; a read-only filesystem sandbox alone does **not** prove no network/tool behavior. Prefer programmatically enforceable configuration and inspect emitted events; label unverifiable restrictions as unknown. Treat user-provided prompt text as untrusted data and never allow it to direct the agent to use tools.
- Persist a clear provider state model in SQLite/UI: `CLI_AUTH_VERIFIED`, `CLI_DIRECT_LIVE_VERIFIED`, `APP_MOCK_INTEGRATION_VERIFIED`, `APP_CODEX_E2E_LIVE_VERIFIED` (false until demonstrated), `EFFECTIVE_PROVIDER`, `DESIRED_PROVIDER`, `EVIDENCE_REF`, `USAGE_KNOWN`, errors and last verified timestamp. Existing `CODEX_SUBSCRIPTION_LIVE` may remain a **CLI-direct** sub-status, but must not masquerade as successful API integration.
- Run deterministic tests for missing CLI, API-key presence, wrong auth mode, misconfiguration, invalid CLI output, oversized stdout/stderr, non-zero exit, quota, timeout, cancellation, failure to kill child, inherited secrets, concurrent queue limit, duplicate dispatch, retry safety, and cleanup. Tests must prove **zero live inference calls**.

**LL09 acceptance:** adapter hardened + credential tests + mocked persistence/UI + audit record + regressions + no real model call. Only then mark `LL09 VERIFIED_COMPLETE`.

## E. Proposed new LOCAL-LIVE gate scope — LL09 through LL16

> These identifiers are **new proposals**, not pre-existing/approved gate definitions. Check for an existing canonical plan before adding anything. Use `STRICT_SEQUENTIAL_WITH_SAFE_INDEPENDENT_WORK`: later independent preparatory work is allowed, but never mark a later gate `VERIFIED_COMPLETE` when its mandatory dependency remains incomplete. Preserve the Cloud G00–G16 gate queue unchanged.

| Gate | Proposed deliverable | Required acceptance proof |
| --- | --- | --- |
| **LL09** | Codex subscription adapter hardening / zero-paid-route guard | Static patch, secure-env tests, stubs for all error classes, UI states, no live calls; 0 n8n mutations/runs. |
| **LL10** | Codex-through-app end-to-end verification | **Only with fresh owner approval for ONE additional live subscription call**: submit one tiny synthetic role task from API/Command Center → adapter → authenticated Codex CLI → SQLite/task/trace/output; inspect actual DB record, usage, latency, failure handling, UI screenshot and redacted evidence. Without approval, status `WAITING_OWNER_APPROVAL`, NOT PASS. Avoid misleading `APP_LIVE` badge. |
| **LL11** | Canonical specialist routing and least-privilege tool boundary | 85 existing role records mapped to typed capabilities/input-output policies; honest counts; one approved local project-scoped file-read/write tool demo with a **stub or local Ollama only**, no shell generated by LLM; deny out-of-root and forbidden roles. No 85 Codex calls. |
| **LL12** | Actual multi-role artifact-producing pipeline | Project request → planner → specialist → reviewer → bounded revision → local output artifact (MD/JSON/design spec/test plan) under explicit export directory, verifiable artifacts, task/trace provenance; deterministic mocks plus optional local Ollama synthetic inference. Approval-before-sensitive-actions respected. |
| **LL13** | Provenance-aware memory and knowledge governance | Versioned task memory, source provenance, contradiction flags, task isolation, memory preview/export/delete, backup caveats and optional retention UX; no automatic TTL unless specifically approved. Tests prove no cross-task leakage. |
| **LL14** | Role evaluation and anti-hallucination coverage | 85 routing checks, 10 existing representative tests retained, broaden expert rubrics by risk/team, deterministic and independently inspectable tests. Distinguish output format from factual correctness and never invent sources/studies/user evidence. |
| **LL15** | Operational reliability and Command Center acceptance | Start/stop/health recovery/runbook, resource/backpressure limits, idempotency, failure injection, audit log, keyboard + Arabic RTL/English LTR + 375px Playwright; genuine live-vs-stub display labels. |
| **LL16** | End-to-end local acceptance and owner handoff | Three distinct local synthetic use cases produce inspectable local artifacts, persisted traces and reviews; role/eval/tool-ability counts truthfully separate; verify owner-safe limits; `ops/FINAL_LOCAL_AGENT_ACCEPTANCE.md` in Arabic. Codex-app-E2E proof remains explicit pending item unless approved and tested; do not claim COMPLETE if its LL10 dependency has not passed. |

For each gate: document schema changes, code tests, tests deliberately NOT run, evidence files, real vs stub runtime, failures + fixes, paid API calls observed, live subscription calls, device resource metrics (where measured), and a truthful gate state. No branch should be declared verified just because static files or 85 role cards exist.

## F. Expected user experience and actual finished deliverable

Within the locally running Life OS Command Center:

- Create request in Arabic or English; choose a known role/provider or let an **explainable** router propose one (never pretend the model made a decision if rule-based).
- Show queued/running/reviewing/waiting approval/completed/failed/cancelled, along with step execution, trace, provider and model **when known**, measured vs unknown usage, and real retry/cancel constraints.
- Preview and export the actual produced local file and reviewer feedback, with provenance (which role, which model/provider, input task IDs, revisions, tests). Avoid simulated "deliverable generated" indicators.
- Show privacy and approval controls and avoid deleting pre-existing user memory without explicit action.
- Keep the original `OLLAMA_LOCAL` explicit and usable; offer `CODEX_SUBSCRIPTION` as user-selectable after proper auth and adapter safety checks. Do not make it default silently. If later owner explicitly requests Codex default, switch desired default only after real app-E2E proof and with quota/failure behavior surfaced prominently. Failure never calls Claude or a paid API.

## G. Autonomous execution loop and exact stop conditions

Operate in an iterative cycle without pausing for each routine engineering decision:

1. Inspect next gate and repository reality → design only the necessary delta.
2. Implement reversible project-scoped changes with safe backup and tests.
3. Run unit/integration/UI tests that do not call paid providers or additional live Codex inferences.
4. Correct failures, run relevant regressions, verify file hashes and persistent DB state.
5. Append accurate checkpoint to `ops/PROGRESS.md`; update `ops/CURRENT_STATE.md`, `ops/LOCAL_LIVE_GATE_QUEUE.json`, `ops/TEST_MATRIX.md`, `ops/NEXT_CODEX_STEP.md`, runbook and manifest as appropriate.
6. Move to next feasible independent engineering work; **do not ask for a fresh prompt** when a local subtask succeeds. Record `PREPARED_PENDING_LL10` for independent later scopes when LL10 awaits owner approval rather than falsely marking dependencies complete.
7. At session interruption, leave a precise resumable checkpoint: next file/function/command, expected output, blocker, and one smallest owner action if necessary. Never claim Codex itself keeps coding after its process/session ends.

**Stop only** when asked for credential authentication, paid subscription/credit approval, a second live Codex subscription invocation, deployment, destructive action with real data, exposed endpoint, protected tool permission, or unavoidably exhausted device/quota limits. Proceed with independent mock/local-only work while blocked. Do not weaken safety guardrails to suppress a blocker.

## H. Reports / evidence naming

Required new outputs (adjust to actual project conventions without faking paths):

- `ops/POST_LL08_BASELINE_AUDIT.md`
- `ops/CODEX_SUBSCRIPTION_SECURITY_AUDIT.md`
- `ops/evidence/LL09_adapter_mock_negative_tests.json`
- `ops/PROPOSED_LOCAL_LIVE_LL09_LL16.md` (copy of approved/reconciled gate definitions)
- `ops/evidence/LL10_codex_app_live_evidence.json` **only after** separately approved true end-to-end inference; otherwise `ops/LL10_APPROVAL_REQUIRED.md` (no fabricated live evidence)
- `ops/evidence/LL11-LL16_*.json` only when respective tests actually run
- `ops/FINAL_LOCAL_AGENT_ACCEPTANCE.md` in Arabic only after genuine acceptance. When LL10 is pending, publish a **partial handoff** instead with explicit remaining requirements.

The final human-readable report must list: running addresses, providers, exact role coverage, current gate states, genuine CLI usage, whether any **app** live Codex call occurred, mock versus real tests, security controls, production limitations, manual memory retention, subscription quota limitations, actual extra purchases (if any), previous historical Cloud G05 blocker, and which projects were untouched.

## I. References (verify installed version & applicability)

- Official Codex CLI options: https://learn.chatgpt.com/docs/cli/reference
- Codex with ChatGPT subscription: https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan
- Historical local plan restored with this bundle: `ops/WEJDAN_CODEX_LL07_TO_AUTONOMOUS_DELIVERY_2026-10-18.md`
- Historical Codex adapter plan restored with this bundle: `ops/WEJDAN_LIFE_OS_CODEX_SUBSCRIPTION_ADAPTER_2026-10-18.md`

**Start now:** verify on-disk state; patch the adapter environment/timeout/security issues **without a second live Codex call**; run mock regression tests; create the proposed LL09+ backlog transparently; continue independent implementation as far as safely possible; checkpoint. Do not stop merely because there was no later gate document, and do not misstate Codex CLI as already proven end-to-end in the app.
