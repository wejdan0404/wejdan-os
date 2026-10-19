# Wejdan Life OS — Codex Subscription Adapter Migration
**Date:** 2026-10-18  
**Target:** `C:\Users\WinDows\Desktop\عام\os`  
**Scope:** Wejdan Life OS ONLY. This is a request to implement and verify a new provider, not a claim that the provider is already working.

## Your role and objective
You are the implementation engineer working IN the existing Wejdan Life OS repository. Implement a safe, auditable `CODEX_SUBSCRIPTION` execution adapter that uses the **existing authenticated Codex CLI signed in with ChatGPT** (subscription allowance, not separately billed OpenAI API-key traffic). Work independently through routine engineering tasks, fix test failures, and save accurate resumable checkpoints. Do not merely produce a proposal.

A prior instruction was originally drafted for **Company OS**. This document adapts it explicitly to **Life OS**; do not mix source trees, configuration, credentials, n8n project IDs, or evidence. Never touch Company OS project ID `bJnN5b7wCUxDoWuz`. The Life OS Cloud project ID, for identification ONLY, is `p5MRQODVi7djfuZf`; **do not open, edit, execute, publish, or activate its cloud workflows** as part of this adapter change.

## Verified starting point (from owner-supplied evidence; recheck locally)
- Life OS has 85 canonical roles. A separate LOCAL-LIVE track LL00–LL06 had passed; LL07 was in progress at the last checkpoint. The 85/85 previous local smoke checks used n8n + Ollama `qwen3:8b` and do **not** prove specialist quality.
- Local components include an n8n instance, Ollama, a private API (`127.0.0.1:8766`), Command Center (`127.0.0.1:8765/command-center/`), and persistent SQLite under `ops/local-live/data/`.
- G05 Cloud remains `BLOCKED_EXTERNAL`. Do not change that gate based on local success.
- Read `ops/CURRENT_STATE.md`, `ops/NEXT_CODEX_STEP.md`, `ops/LOCAL_LIVE_GATE_QUEUE.json`, `ops/LOCAL_WORKFLOW_REGISTRY.json`, `ops/LOCAL_AI_EVAL_MATRIX.json`, task/API contracts, and the actual app source. Preserve existing working Ollama/n8n implementation and historical evidence.
- The existing repository was earlier reported to have no `.git`; **do not** add a Git repository to the application root without owner approval.

## Non-negotiable restrictions
1. **ZERO additional purchases:** no paid APIs, OpenAI API keys, Claude, other model services, credits, auto-reload, subscription upgrades, paid n8n seats, or new paid products. Do not spend purchased credits or silently fall through to billable usage. Subscription entitlements and usage limits still apply. If remaining allowance or billing behavior is uncertain, stop provider testing and report uncertainty; do not claim zero-cost assurance.
2. **No credentials/secrets in code, prompts, reports, version-controlled files, logs, screenshots, or SQLite.** Do not open, copy, print, parse, or export `~/.codex/auth.json`, cookies, OAuth tokens, environment secrets, or browser session storage. `codex login status` may be used; redact personal account data from saved evidence.
3. Do not invoke the OpenAI API/Responses API with an API key, or call model APIs directly. Only the officially supported Codex CLI authenticated with ChatGPT is permitted for this adapter.
4. Do not use Claude or Claude Code, even as a fallback. Preserve existing `OLLAMA_LOCAL` as an untouched separate capability, but **do not** automatically substitute it for a failed Codex invocation. The new adapter's failure state is `MOCK/MANUAL` until explicit user selection.
5. Do not start, stop, edit, execute, schedule, activate, publish, or expose **any n8n Cloud or local workflow** during this change. The existing local n8n workflow state should remain as found. Adapter tests must invoke the CLI directly or use isolated stubs.
6. Remain within authorized local workspaces; no new public endpoint, external outbound user actions, file deletion outside test fixtures, personal-data ingestion, access escalation, or background service registration.
7. No `danger-full-access`, bypass of usage restrictions, undocumented authentication reuse, or automation intended to evade limits. Keep synthetic prompts small and minimize subscription usage.
8. Never claim `LIVE` based on mocks, installation detection, saved configuration, or merely finding an authenticated CLI. Require a completed, attributed, **real** CLI invocation.

## Phase 1 — Read-only discovery and environment proof
- Inspect the real architecture and find the provider selection, routing, role registry, task schema, task persistence, UI surfaces, and tests before editing. Do not assume Company OS scripts apply to Life OS.
- Check `codex --version`, `codex login status`, `codex exec --help`, selected runtime/provider config, and available permissions using supported, non-secret-readable commands. Verify the actual login mode is **ChatGPT**, not API key. If unable to distinguish mode, mark auth `UNVERIFIED`, do not run an inference smoke test, and provide the smallest user action needed (such as official interactive `codex login`).
- Do not trigger `codex login` in noninteractive code, request passwords, or inspect credential caches. If login requires a human, checkpoint and continue independently with mock adapter tests.
- Check for unsafe configuration (API-key fallback, custom base URL, shell profile injection) without printing variable values or secrets. Do not overwrite owner config.
- Decide how to run a synthetic read-only prompt in an isolated TEMP working directory without personal/project files. `codex exec` is documented to default to read-only sandbox. Use `--sandbox read-only`, `--ephemeral` and supported JSONL/final-output flags after confirming with `--help` for installed CLI version. If a Git repo check blocks the run, use an isolated temporary test directory initialized as a minimal Git repository, or the documented skip flag ONLY for that empty isolated directory; never initialize Git inside the Life OS source tree solely to pass the probe.

## Phase 2 — One live agent smoke test, and only then selected provider
- Choose **ONE** safe synthetic role from Life OS registry, preferably `D-00`, but use the actual canonical role identifier. No personal information, no repository content, no n8n execution.
- Send a small task such as: `Return exactly a short JSON object with role_id D-00, a one-sentence synthetic project plan, and a mock marker. Do not read files or run tools.` Keep prompt under a reasonable configured size limit. Validate output against a strict local adapter response schema.
- Run `codex exec` as a child process with an argument array and a dedicated working directory (NOT `shell: true`), read-only permissions, timeout, bounded output sizes, cancellation support, and explicit process cleanup. Ensure it cannot inherit API-key credentials that could lead to API-billed use. Do not print or save auth material. Distinguish provider commands from regular `codex exec` used by the engineer implementing this task.
- Collect sanitized: CLI version, verified auth method, provider ID, task ID, trace ID, canonical role ID, start/end UTC timestamps, elapsed milliseconds, exit code, timeout state, parse/validation result, redacted final text, JSONL completion markers, and usage reported by CLI when available. Do NOT invent cost or remaining credits. Preserve the raw final response only if synthetic and non-sensitive; keep raw credentials/verbose internal logs out of evidence.
- **ONLY IF** the actual invocation succeeds, validates, and returns a correct final output: set the new adapter status to `CODEX_SUBSCRIPTION_LIVE`, persist the role invocation linked to the existing task database, and make `CODEX_SUBSCRIPTION` the selected provider in the intended Life OS local configuration/UI. Label it `ChatGPT subscription usage; subject to plan limits; no separate OpenAI API key used`.
- If unavailable, unauthenticated, blocked by quota, denied sandbox permissions, timeout, or malformed output: set adapter status to `MOCK/MANUAL` (or `CODEX_SUBSCRIPTION_UNAVAILABLE` plus an explicit manual/mock display), save an actionable sanitized failure reason, leave prior Ollama functionality intact, do NOT reroute silently, and never label it LIVE. Keep `CODEX_SUBSCRIPTION` as the **desired** provider in config if needed, but distinguish **desired** versus **effective** clearly.

## Phase 3 — Adapter construction
- Add a clear provider interface consistent with existing Life OS conventions (avoid unnecessary refactors). Suggested logical contract:
  - `provider_id`, `auth_mode`, `availability_status`, `role_id`, `task_id`, `trace_id`, `request_id`, `prompt`, `result`, `validation_status`, `elapsed_ms`, `usage`, `error_code`, `error_message`.
  - `auth_mode = CHATGPT_SUBSCRIPTION`; never `OPENAI_API_KEY`.
- Use an allowlisted binary path found from the actual environment, non-shell spawning, allowlisted flags, dedicated scratch cwd, minimal environment, strict arguments, role-scoped instructions, controlled context, cancellation/timeout/retry budgets, maximum stdout/stderr bytes, bounded queue, and redaction. Distinguish tool instructions from untrusted user text; never execute arbitrary user-provided shell commands.
- Only a trusted local backend can spawn Codex. Do not launch CLI from browser JavaScript or expose an unauthenticated subprocess API, even on loopback. Audit local API authentication/trust before exposing a UI action.
- Save task lifecycle and role outputs to existing SQLite using atomic/idempotent operations if supported. Use foreign keys and trace linkage already defined; do not compromise existing task and memory integrity.
- Show provider (desired/effective), status LIVE/MOCK/MANUAL, actual subscription usage category, task history, test result, latency and error/timeout feedback in Command Center. Do not display currency value or `0 SAR` as measured expenditure without an authoritative cost measurement. `Paid API requests performed by this adapter: 0` may be shown ONLY when instrumented/proven.
- Existing `OLLAMA_LOCAL` stays separate and usable by explicit owner selection; do not delete or break it. Do not touch the original Cloud gate tracker.

## Phase 4 — Progressive, bounded role evaluation
- After **one** LIVE result, test 1–3 additional roles initially, then small, spaced batches if subscription availability and user-approved usage budget permit. **Default maximum concurrency = 1**; never run all 85 live in parallel or automatically burn through subscription allowance to achieve a green dashboard.
- For each role, test the input/output contract, output relevance, negative cases, timeout, cancellation, failure handling, duration, and memory/task ID consistency. Do not call an AI reviewer an independent human review.
- A role is `INVOCATION_VERIFIED` only after real execution; it is `SPECIALIST_QUALITY_VERIFIED` only after substantive task-specific evaluation with documented criteria. Never inflate percentages.
- On usage cap, auth loss, anomalous billed-credit indication, or repeated error, apply a circuit breaker and stop CLI activity. Record error, retain progress, and leave `MOCK/MANUAL` for new tasks. Never buy credits or auto-resume after a reset without review of the budget policy.

## Phase 5 — Non-n8n testing & exact evidence
- Add unit and integration tests using stubs for success, invalid JSON, login-required, quota, timeout, cancelled process, oversized output, bad role, duplicate idempotency key, concurrency limit, subprocess crash, and secrets redaction. Include ONE explicit real CLI integration test from Phase 2; **no n8n test execution**.
- Run existing relevant test suites for this Life OS project: contract validator, LOCAL-LIVE tests, `command-center/smoke-test.mjs` or equivalent Playwright against mocked provider, and UI/build checks. Run `npm test` and `npm run build` **in directories that actually define those scripts**; if absent, mark `NOT_APPLICABLE` with evidence instead of inventing success. If relevant, run Flutter analysis/tests without changing Flutter dependencies. Do not let frontend smoke trigger real n8n or repeated model calls.
- All new tests should use synthetic data. Keep local services bound to `127.0.0.1`; do not change service startup mode or publish anything.
- Evidence to add:
  - `ops/evidence/codex-subscription-adapter-smoke.json` (redacted),
  - `ops/CODEX_SUBSCRIPTION_ADAPTER_STATUS.md`,
  - `ops/evidence/codex-subscription-adapter-tests.json`,
  - link to a persisted task/trace record, if and only if actual CLI inference succeeds,
  - actual file change list / test logs / build result and recovery instructions.
- Update `ops/CURRENT_STATE.md`, `ops/PROGRESS.md`, `ops/NEXT_CODEX_STEP.md`, the LOCAL-LIVE queue, and test matrix carefully. Preserve historical append-only evidence. LL07 must not be claimed complete unless its original lifecycle/memory/quality acceptance criteria also pass. G05 Cloud stays `BLOCKED_EXTERNAL`.

## Acceptance states
- `CODEX_SUBSCRIPTION_LIVE`: Codex CLI installation + ChatGPT authentication verified; one real synthetic CLI task completed; structured output validated; persisted task/trace evidence linked to Command Center; no API-key use; tests run and passing.
- `MOCK/MANUAL`: CLI fails, auth can't be verified, or plan access unavailable. Report reason and exact smallest owner action. Do not switch to Claude, paid API, or automatically to Ollama.
- `PARTIAL`: CLI works but adapter, persistence, UI, or tests are incomplete. Do not claim LIVE integration yet; retain phase evidence accurately.

## Autonomy & final handoff
Work through all routine engineering tasks without requesting a fresh prompt after each step. If a human login/permission is indispensable, finish all feasible mocked architecture/tests, checkpoint, and ask for only the specific necessary action. Do not assume you can continue when the Codex session ends. Provide a concise final report listing: authenticated CLI status, desired/effective provider, one real test evidence, additional roles verified, subscription usage caveat, zero paid API-key traffic evidence, files changed, tests/build/Playwright results, known limitations, and next resumable step. Do not claim all 85 roles are using Codex until actually verified.

## Official references
- https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan
- https://learn.chatgpt.com/docs/auth
- https://learn.chatgpt.com/docs/non-interactive-mode
- https://learn.chatgpt.com/docs/developer-commands
- https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans
