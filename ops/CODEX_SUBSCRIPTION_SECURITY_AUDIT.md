# CODEX_SUBSCRIPTION security audit — LL09

**Date:** 2026-10-18  
**Scope:** local adapter/API/Command Center only. No n8n workflows or Cloud projects were contacted.

## Changes applied

- Replaced whole-process environment inheritance with a small allowlist of Windows runtime variables plus `CODEX_HOME`; `PATH` and unrelated variables are not passed to the CLI. API keys, tokens, credentials and alternate-provider routing variables cause fail-closed rejection by variable **name**; values are never logged.
- Removed environment-controlled executable overrides. The Node executable is `process.execPath`; the Codex JS entrypoint is derived from the installed per-user npm location under `APPDATA`.
- Production adapter now refuses dispatch with `CODEX_APP_LIVE_APPROVAL_REQUIRED`. The API rejects Codex submissions before task insertion, and the Command Center option is disabled. The test-only adapter factory can launch deterministic synthetic CLI stubs; it cannot be activated via an environment variable.
- Before a future explicitly approved live dispatch, production code runs `codex login status` in the scrubbed environment and requires the exact ChatGPT login wording. It does not read auth storage. Current dispatch is disabled, so this preflight was not run by the adapter during LL09.
- Child process uses absolute executable paths, argument-array `spawn`, `shell:false`, `--ignore-user-config`, `--ephemeral`, `--sandbox read-only`, and a unique temporary working directory. It applies a single-run concurrency cap, wall-clock timeout, abort handling, Windows process-tree termination with child-kill fallback, output byte limits, strict JSONL parsing, terminal-event validation, and unconditional temporary directory cleanup.
- Errors are reduced to stable categories and no raw stderr is persisted. Usage is returned only from the actual completion event; cost stays `null`; absent model metadata stays unknown; adapter run IDs are separate from provider thread IDs.
- Tool/activity event types are rejected when observed, including nested `item.type`. The result reports `tool_execution_status: unverified-no-tool-event-observed`; read-only sandbox and a prompt are not represented as proof that network or tool access is impossible.
- Added SQLite provider-status records and a read-only API view distinguishing historical CLI authentication/pilot, historical mock app integration, current app-live E2E (not verified), effective Ollama default, selected-per-task provider policy, and pilot-only reported usage. Command Center states that app-live Codex execution is unverified.
- Codex CLI use remains blocked pending separate owner approval for one additional live synthetic task. Ollama stays the effective default.

## Verification performed

- Adapter syntax and API syntax checks passed.
- Stub-only adapter suite passed, covering production dispatch denial, environment allowlisting and key/route rejection, ChatGPT auth preflight dependency, valid output/usage and unknown cost, malformed JSONL, nonzero exit, missing terminal completion, nested tool event, stdout/stderr caps, quota classification, timeout, cancellation, Windows kill fallback, concurrency cap, missing CLI and cleanup.
- Isolated API/SQLite test passed: provider-state rows persisted, historical/current status distinction holds, Codex request receives 403 before task creation, effective provider remains Ollama, usage remains unknown for app E2E, API binds to loopback.
- Playwright with the already installed Chrome binary passed a routed mock-only UI test: 85 canonical role records display, Codex option disabled, historical direct pilot distinguished from unverified app execution, mock API denies dispatch, no browser errors.
- No live inference, paid API call, n8n run, workflow mutation, installation, deployment, schedule or public endpoint occurred.

## Limitations and open items

- The updated API source is not active in the persistent PID 45096 yet. It must be restarted using the project's normal local service launcher; the current process still exposes the old routes. Isolated test API used the updated source successfully. To protect the active process, a tested SQLite trigger `deny_codex_pending_approval` now blocks any `codex-subscription` task insert. A real synthetic negative POST against the old API failed before task creation: task count stayed 118, Codex task count stayed 0, and SQLite integrity remained `ok`.
- Keep the SQLite interlock installed until a separately approved LL10 sequence deliberately removes it after verifying the new source. Do not treat its current generic 400 response as the final API error contract.
- A direct Codex app E2E remains unverified and is intentionally blocked until separately approved. Do not call the provider live to validate this audit.
- The CLI's read-only sandbox does not establish a network-denial guarantee. No live provider subprocess was run in LL09. Future tests must preserve this limitation and inspect emitted activity events; they must not claim no network based only on the sandbox name.
- The API's historical retry behavior is task-level retry with new task/trace IDs. Codex live retries remain unverified because live dispatch is disabled. No automatic adapter retry is implemented.
