# Wejdan HQ — Read-only Integration Architecture

**Status:** Phase 2 read-only bridge and controlled delegation code are implemented and synthetically verified. Live source connections and delegation await separately configured credentials and service starts.  
**Last updated:** 2026-10-19 (Asia/Riyadh)  
**Scope:** local Life OS and Company OS repositories/services only. This document includes implementation and test updates. No production database, secret, workflow, external service, or pre-existing service process was changed or restarted.

## Executive decision

Keep Wejdan HQ as a local owner-facing shell and narrow server-side aggregation layer. Each workspace remains authoritative in its own application, SQLite database, registry, permission model, and runtime. The implemented release is strictly read-only. Both sources now expose purpose-built, separately authenticated summary contracts and pass synthetic isolation tests. The credentials are not configured in the real service processes, so the live integration remains **IMPLEMENTED / NOT CONNECTED**.

Do not reuse the current general-purpose dashboard, task, approval, artifact, or control-plane endpoints as bridge APIs. They return task text, results, permission details, or other fields that exceed the HQ summary need. CORS restrictions and loopback binding are not authentication.

## Verified systems and boundaries

| | Life OS | Company OS |
|---|---|---|
| Repository | `C:\Users\WinDows\Desktop\عام\os` | `C:\Users\WinDows\Desktop\wejdan-company` |
| Local web/API | `127.0.0.1:8765` Command Center; API `127.0.0.1:8766` | Web `127.0.0.1:5173`; API `127.0.0.1:4174` |
| Persistence | `ops/local-live/data/wejdan-local.sqlite` | `data/company-os.sqlite` |
| DB isolation evidence | Distinct SQLite files, schemas and service ownership; no shared connection | Same |
| Registry / executive | 85 canonical role profiles; `D-00` Program Director, not an executive secretary | 29 registered business agents; `SEC-01` executive secretary, currently MOCK |
| Runtime | Local n8n + Ollama; paid routes disabled; Codex app dispatch disabled pending explicit approval | Default MOCK; provider usage exhausted at last live health snapshot (38 used / 5 daily configured, zero remaining); n8n adapter needs configuration, 0 active workflows |
| Network / auth | API binds loopback; no user authentication. CORS permits the local Command Center origin only. | API binds loopback; control-plane reports `authentication: NOT_CONFIGURED`. CORS is not auth. |

The health endpoints were queried read-only; service processes were left running. No task text, message content, approval proposal, artifact contents, secrets, or raw database records were read for this audit. Company SQLite integrity had previously been checked `ok`; table counts only were inspected. Life OS has its own local database and independent n8n registry. Company workflow registry lists draft/inactive workflows; no Company workflow was run or changed. Life OS local n8n has one private loopback-only workflow used by its own runtime; Cloud G05 remains separately blocked. Do not connect Company OS to Life OS n8n.

### Existing API surface and risk

Life OS exposes `/api/health`, `/api/roles`, `/api/provider-status`, `/api/tasks`, `/api/approvals`, task detail/export, and mutation routes for task creation, cancellation, retry, deletion, and approval decisions. Task listing contains task input/result fields, while task export can include steps and memory. It is not suitable for cross-workspace use.

Company OS exposes `/api/health`, `/api/dashboard`, `/api/company-os`, `/api/agents`, `/api/tasks`, `/api/projects`, `/api/approvals`, `/api/artifacts`, `/api/agentops`, `/api/control-plane`, conversations, and mutation routes. Several read endpoints return full task/approval/artifact or permission records. It is not suitable for cross-workspace use.

Neither service has an authenticated, scoped, read-only HQ endpoint. Company `server/bridge.js` is a task-packet validator for an owner-approved Life-to-Company transfer; it is not an authenticated server-to-server read API and does not authorize this integration. Its transfer table is currently empty. The existing bridge is not reused for Phase 2 summaries.

## Target architecture

```text
Owner browser (local HQ UI; no provider credentials)
                 |
                 | same-origin, authenticated local session
                 v
HQ BFF / aggregator (loopback only; strict DTO allowlist)
          |                                 |
          | workspace-scoped service token  | workspace-scoped service token
          v                                 v
Life OS read-summary endpoint          Company OS read-summary endpoint
          |                                 |
Life SQLite (existing DB)              Company SQLite (existing DB)
```

The HQ layer is an aggregator, not a system of record. It has no database containing copied task or memory content. Its short-lived cache, if later needed, may store only validated aggregate DTOs and must be disabled by default until retention is specified. Each source endpoint queries only its own database and projects an explicit allowlist. No direct DB access from HQ and no database merge.

The owner-facing secretary is a **UI/routing façade**, not a third agent registry or a new autonomous agent. Personal conversation capability maps to existing Life OS `D-00`; Company conversation capability maps to Company `SEC-01`. Until separate write approval, conversation is advisory and cannot create/run tasks. The UI must clearly show which workspace is selected and which registered capability owns a request. Do not combine private memory or conversation history.

## Phase 2 summary contracts

Use versioned `GET /api/hq/v1/summary` on each source service, with a distinct service identity and token per source. Response is `application/vnd.wejdan.hq-summary.v1+json`, `Cache-Control: no-store`, bounded response size, and no user-provided query filters. The source stamps `workspace_id`, `generated_at`, and a non-sensitive health status. HQ validates exact keys, enums, bounds, workspace identity, and freshness before rendering.

```json
{
  "schema_version": "wejdan.hq-summary.v1",
  "workspace_id": "PERSONAL | COMPANY",
  "generated_at": "ISO-8601 UTC",
  "system": { "status": "HEALTHY | DEGRADED | UNAVAILABLE | BLOCKED", "mode": "LIVE | MOCK | MANUAL | LOCAL | UNKNOWN" },
  "providers": [{ "id": "bounded provider id", "status": "AVAILABLE | DISABLED | BLOCKED | UNKNOWN", "usage": "KNOWN | UNKNOWN | NOT_APPLICABLE" }],
  "agents": { "registered": 0, "by_status": { "bounded status": 0 } },
  "projects": { "total": 0, "by_status": { "bounded status": 0 } },
  "tasks": { "total": 0, "by_status": { "bounded status": 0 } },
  "approvals": { "pending": 0 },
  "artifacts": { "completed": 0 },
  "activity": { "latest_at": "ISO-8601 UTC | null", "recent_count": 0, "items": [{ "kind": "TASK | AGENT | APPROVAL | PROJECT | SYSTEM | OTHER", "at": "ISO-8601 UTC" }] },
  "trace_ref": "optional opaque local audit reference"
}
```

V1 intentionally exposes aggregate counts only. UI links may navigate into the selected system's own authenticated local application, but the bridge must not return task titles/inputs/outputs, project descriptions, approval bodies, artifact names/content/paths, conversations, memory, health details, tokens, costs not measured by the source, model prompts, or raw execution logs. If owner research establishes a need for item-level summaries, define a separately reviewed metadata contract (opaque ID, bounded status, timestamp, registered agent ID, safe display label) and test re-identification risks before adding it.

The owner asked to view real agents, tasks, projects, deliverables, and approvals. In V1, aggregate counts and local-navigation links establish a unified overview while detailed records remain inside their workspace. Deliverable counts are metadata only. Cross-workspace detail exposure requires an explicit data-scope decision before implementation.

## Authentication and fail-closed behavior

- HQ browser receives only an owner session, never source service tokens.
- HQ BFF holds independent `HQ_PERSONAL_READ_TOKEN` and `HQ_COMPANY_READ_TOKEN`; tokens are high entropy, scoped to `summary:read`, rotatable independently, and compared in constant time. Store through OS-protected secret storage/ACL, not source files, SQLite, browser storage, logs, or command output.
- Each source service accepts only its own token on the exact summary route and GET method. No wildcard CORS is needed for BFF-to-BFF requests. Enforce loopback binding and reject all other methods/routes for this principal.
- If either credential is missing/invalid, workspace identity mismatches, a DTO contains unknown keys, freshness exceeds the configured threshold, or a source is unavailable, return a workspace-local `UNAVAILABLE`/`BLOCKED` card and do not fall back to unscoped endpoints, stale private data, MOCK data, or the other workspace.
- Summary requests time out, have small response limits, and do not follow redirects. Redact authorization headers and avoid logging response bodies.
- The existing APIs are unauthenticated, so they must not be exposed to HQ until the protected source endpoints exist and are tested. Loopback and origin checks only reduce network exposure; they do not prove caller identity.

## Threat model

| Threat | Boundary / mitigation | Required test |
|---|---|---|
| Cross-workspace data leakage | Separate tokens, DTOs, DBs and provider clients; no content aggregation | Company token against Life route and vice versa both denied; poison one workspace with unique sentinel and assert absent from other response |
| Unauthenticated local process or browser calls | Exact bearer authentication; owner session for UI; loopback only | Missing, malformed, expired/rotated, wrong-workspace token denied; CORS spoof is not treated as auth |
| Overbroad endpoint or object injection | Fixed GET route, no filters, SQL projection and schema validator | Unknown keys/arrays/oversize/malformed values rejected; URL traversal and method override denied |
| Stale or fabricated status | Source-derived timestamps and explicit `UNKNOWN`, `MOCK`, `BLOCKED`; no inferred live status | Provider unknown stays unknown; stale response fails closed; simulated and live usage separated |
| Secret exposure | BFF-only secret storage, redacted logs, no frontend token | Browser bundle/storage/network and error logs contain no token sentinel |
| SSRF / redirect / arbitrary fetch | Fixed local origin per workspace; no URL from request; redirects rejected | Query/header cannot alter target; redirect response rejected |
| Confused deputy / accidental write | Read-only service scope and GET-only route; no write clients in Phase 2 | POST/PUT/PATCH/DELETE denied; source DB row counts unchanged after integration tests |
| Memory or personal data copied | Exclude input/output/memory/conversations/artifact contents and sensitive labels | Sensitive sentinel scan and response-key allowlist |
| Provider spend or hidden execution | No model/provider invocation in bridge; truthful usage status only | Network call assertion confirms no Ollama/Codex/n8n/provider invocation |
| Local compromise | Loopback, OS ACL, token rotation, minimal process privileges; local admin compromise remains out of scope | Document residual risk; never claim local-only equals user authentication |

## Screen map

1. **HQ Home:** two workspace cards and a cross-workspace high-level summary; independent availability and mode badges; no combined private feed.
2. **Workspace switcher:** Personal / Company selector, explicit current scope, last refreshed time, degraded/unavailable states.
3. **Executive conversation:** one visual entry point with workspace selector. It routes only to the selected registered secretary/coordinator; Phase 2 is read-only/advisory. No hidden fan-out.
4. **Agents:** workspace-scoped registry summary and link to that system’s own agent directory; no merged registry.
5. **Projects and tasks:** workspace-scoped aggregate status counts with “open in workspace” links. No task content in HQ in V1.
6. **Approvals:** pending counts with workspace provenance and local-system links; decisions occur only in the originating system and are not actionable from HQ during read-only phase.
7. **Deliverables and audit:** counts and safe opaque trace links; content remains in its owning system.
8. **Settings / connection status:** per-workspace authenticated/unavailable state, schema version and refresh timestamp. Never show credentials.

Reuse the existing Life Command Center visual foundation for Arabic RTL and English LTR while retaining Company OS identity inside its workspace. Use workspace-specific color/icon cues and persistent provenance labels. Do not embed one application's unrestricted app shell in the other or imply shared permissions.

## Acceptance criteria

### Phase 1 — this document

- Both repository paths, live service bindings, API surfaces, registries, coordinators, DB boundaries and execution statuses are evidence-based.
- Risks and safe DTO, trust boundaries, screens, staged rollout and acceptance are documented.
- No Company mutation or service configuration change occurs during audit.

### Phase 2 — read-only bridge

- Each source exposes a dedicated authenticated summary endpoint; no existing broad endpoint is reused.
- Positive auth tests and negative auth/workspace/schema/method/size/timeout tests pass.
- Per-workspace DTOs are validated with a strict schema; no private content or raw DB is exposed.
- SQLite hashes/row counts are unchanged by reads; provider, n8n, task, approval and mutation counters are unchanged.
- Bridge fails closed if either workspace cannot authenticate; the other workspace remains separately viewable and clearly labeled unavailable.
- Security review confirms browser receives no service token and no public listener exists.

### Phase 3 — unified owner UI

- Owner can switch workspaces and see both independently sourced health/agent/project/task/approval/artifact/provider summaries.
- Executive conversation routes only to selected workspace's existing coordinator identity; no duplicate registry or memory exchange.
- Arabic RTL and English LTR, keyboard navigation, focus and screen-reader labels pass the existing UI test approach.
- Unavailable, mock, blocked, live, unknown and stale states render honestly; no fallback fabricates data.

### Phase 4 — controlled delegation (separate approval required)

- No write capability is implemented or enabled before explicit owner approval of cross-system task creation.
- After approval: per-workspace authorization, explicit owner-authored packet, sensitivity classification, unique correlation IDs, original ownership, idempotency, approval gates, audit trail and revocation are required.
- Never transfer memory by default; never silently copy private workspace data. Sensitive/external actions remain blocked absent explicit approval.

## Migration and delivery plan

1. **Audit/design (current):** save this document and retain existing databases and services. No migrations or UI changes.
2. **Source DTO endpoints:** implement additive, separately authenticated GET-only summary routes in both repositories, tested against temporary synthetic DBs. Company changes remain confined to additive code/tests; do not migrate or mutate Company data.
3. **HQ aggregator:** add a same-origin local BFF with per-system tokens, strict DTO validation, timeouts, no-store, no broad fallback and negative tests. Initially run against test doubles only.
4. **Local protected-service verification:** configure secret storage and restart only with owner-visible operational approval where required. Until both protected routes respond with correct tokens, bridge status remains not connected.
5. **Read-only UI:** build workspace switcher and summary screens from contract fixtures, then verify against authenticated local routes. Do not make an unprotected production route reachable.
6. **Controlled delegation:** separate owner approval and a new threat-model/contract review. It is outside Phase 1–3 and must not be inferred from read-only integration authorization.

## Phase 2 implementation status — 2026-10-19

- Implemented Life OS `GET http://127.0.0.1:8766/api/hq/v1/summary` in `ops/local-live/runtime/server.mjs`. It uses only that service's existing SQLite connection and `HQ_PERSONAL_READ_TOKEN`; it returns aggregates and up to five activity kind/timestamp pairs from tasks and approvals, with a seven-day count. It rejects non-GET, query filters, missing credentials and incorrect credentials. Database failures return a sanitized 503.
- Implemented Company OS `GET http://127.0.0.1:4174/api/hq/v1/summary` in `server/index.js` plus `server/hq-summary.js`. It uses only the Company OS DB connection and `HQ_COMPANY_READ_TOKEN`; it returns aggregate counts, bounded statuses and up to five category/timestamp pairs from recent events, with a seven-day count.
- Implemented local HQ BFF and Arabic RTL interface in `ops/hq/`. It binds to loopback, exposes only owner session and summary routes, uses fixed source URLs in production, validates the exact DTO and workspace identity, applies time/size limits, rejects redirects, and never exposes source tokens to the browser. Workspace connection state is independent. The conversation/task composer is disabled.
- The BFF uses `HQ_PERSONAL_READ_TOKEN`, `HQ_COMPANY_READ_TOKEN`, and `HQ_OWNER_PASSWORD` only from environment variables. Both source tokens must be independently provisioned in the matching source and HQ processes. No token or password was added to this repository or configured in a running process during this phase; existing services were not restarted. Therefore actual workspace status remains **Needs Configuration / not connected** until the operator sets those variables and restarts each owning service.
- Synthetic tests use temporary SQLite files and fake local sources. They also break one table in each disposable DB to verify sanitized 503 handling for a source database query failure. No production database, source data, provider, n8n, workflow, or existing service process was used by the acceptance suite.
- `ops/hq/npm test`: 8/8 passed, including source API auth and aggregation against temporary databases, cross-token denial, unavailable sources, malformed/expanded DTO rejection, content/write route denial at the BFF, session boundaries, and Playwright RTL desktop/mobile checks. Browser storage and request headers were checked for source-token leakage.
- Company OS `npm test`: 28/28 passed. `npm run build`: passed (existing >500 kB JavaScript chunk warning).
- HQ `npm run build`: passed (syntax validation). `flutter test --no-pub` in Life OS could not start because the installed Dart 3.11.5 toolchain cannot load the generated `objective_c` hook kernel (expected format 127, found 138). This is an environment/toolchain blocker, not a passing Life OS full-suite result.

### Phase 2 acceptance

- Source summary success, missing/bad/cross-workspace token, invalid workspace, unavailable source, expanded/wrong-workspace DTO, detail request, and task-send request are tested with synthetic fixtures.
- Source routes were tested against temporary databases containing private-content sentinels; responses contained aggregate counts only and the sentinels were absent.
- Browser UI was tested in Playwright at 1440px and 390px widths; `dir=rtl`, no horizontal overflow, no page/console errors, no service Authorization header in browser requests, and no source token in local/session storage.
- **Connection acceptance is not yet satisfied:** source credentials are not configured in the real service processes. The BFF must continue to show **Needs Configuration** (or **Blocked** if credentials/source are rejected), not Connected.
- Phase 3 unified conversation and task creation remain disabled. Phase 4 remains unauthorized.

## Current verified status and blockers

- Phase 1 audit/design: **COMPLETE** when this document is saved and cross-checked against the observed systems.
- Phase 2 read-only integration: **IMPLEMENTED AND SYNTHETICALLY VERIFIED; NOT CONNECTED** until each source token is provisioned in its owning service and the service is restarted by its operator.
- Phase 3 read-only unified UI: **IMPLEMENTED AND PLAYWRIGHT VERIFIED**; live source cards remain unavailable until configuration. Unified conversation and task creation remain disabled.
- Phase 4 delegation: **NOT AUTHORIZED YET**; requires separate explicit owner approval.
- No provider calls, workflow execution, public exposure, DB merge, production task mutation, Company configuration change, or existing Company/Life service restart was performed during this phase.

## Evidence references

- Life source: `ops/local-live/runtime/server.mjs`, `command-center/index.html`, `command-center/app.js`, `roles/role_registry.json`, `ops/LOCAL_WORKFLOW_REGISTRY.json`, `ops/LOCAL_LIVE_GATE_QUEUE.json`.
- Company source: `C:\Users\WinDows\Desktop\wejdan-company\server\index.js`, `server\bridge.js`, `agent_registry.json`, `workflow_registry.json`, `src\App.jsx`, `README.md`.
- Live local health: `http://127.0.0.1:8766/api/health` and `http://127.0.0.1:4174/api/health`, read-only on 2026-10-18. Company web `http://127.0.0.1:5173` returned HTTP 200. Never use these unauthenticated general APIs as the HQ bridge.

## 2026-10-19 — Corrective acceptance update

- Company summaries now separate synthetic/QA and archived tasks from operational task totals and status counts. Synthetic events are excluded from the operational activity feed and reported as a separate seven-day count. Synthetic approvals and projects/artifacts are excluded from live operational counts. Company runtime mode is read from its saved runtime setting; Codex availability stays `UNKNOWN` until both saved access state and current CLI authentication support it.
- Life role states are normalized from runtime and activation fields: `MOCK_TESTED` maps to `MOCK`, `SPECIFIED`/`NOT_ACTIVE` maps to `BLOCKED`, and lower-case `waiting_approval` maps to `WAITING_FOR_APPROVAL`. Added nullable `hq_classification` with an additive migration: new tasks are classified `OPERATIONAL` or `SYNTHETIC`; pre-existing rows remain null/legacy-unclassified. Operational totals, approvals, and activity omit legacy-unclassified tasks and expose their counts separately. No existing task was reclassified or modified. The local runtime schema has no projects/artifacts tables; the UI labels those values unavailable instead of implying true zero.
- HQ owner login now rate-limits repeated failures (five per loopback address in a 15-minute window) and returns a bounded `Retry-After`; it never logs a submitted password.
- Updated synthetic acceptance: HQ **9/9** passed, including QA/archive separation, Life status normalization, DTO validation, read-only UI behavior, RTL desktop/mobile, and login throttling. Company OS **28/28** passed and build passed with the existing large-chunk warning. HQ syntax build passed.
- Initially discovered the Life SDK mismatch (`pubspec.yaml`: Dart `^3.13.4`; lockfile: Flutter `>=3.47.0`; default installed SDK: Flutter `3.41.9` / Dart `3.11.5`). Resolved it without changing existing SDKs or project constraints by installing official Flutter `3.47.5` / Dart `3.13.4` side-by-side at `%LOCALAPPDATA%\CodexTools\flutter-3.47.5`. With that SDK, `flutter pub get --offline` succeeded, **223/223** Life tests passed, `dart analyze lib test` reported no issues, and `flutter build web --release --no-pub` succeeded. The original PATH/default Flutter remains unchanged.
- Current read-only listener inventory: Life API port `8766` has a listener, but its process identity was not inspected in this pass. Company API `4174`, Company web `5173`, and HQ `8870` had no listeners. No existing service was restarted. No environment tokens or owner password are configured by this work; live status remains **Needs Configuration**.
- HQ remains read-only. Task creation, cross-system delegation, workflow execution, and source-side writes remain disabled. The report-repair request supplied no concrete task packet or per-task source/target approvals, so no task was dispatched.
# Access decision update — 2026-10-19

The later local HQ implementation initially added owner-password sessions, but Wejdan asked to remove the password. The current design drops that login and serves only aggregate read-only summaries on `127.0.0.1`. Source APIs continue to require distinct bearer tokens held by the server processes. Historical statements below describing `HQ_OWNER_PASSWORD` or a not-yet-connected bridge are design-time checkpoints and are superseded by `ops/evidence/hq_passwordless_local_access_20261019.json`.

# Update — controlled Life task delegation implementation (2026-10-19)

**Current connection:** Local delegation is now configured and verified. Company reports `CONNECTED`; Life inbox returns 200 with zero requests. No task was created or started, and no workflow ran. `D-00` remains `NOT_ACTIVE`.

The owner authorized continuing the Company OS ↔ Life OS connection discussion. A narrowly scoped delegation path is now implemented in both repositories and synthetically verified. It does **not** make the read-only HQ summary bridge writable and does not merge databases, memory, chat, agents, or credentials.

Protocol: Company owner confirms a title/request packet → Company service authenticates to Life → Life stores a pending inbox record only → Life owner approves/rejects → Life owner explicitly starts a local task → Life owner edits/redacts and separately approves sharing a short result summary → Company may poll that approved summary. No full task text/result is returned to Company. `D-00` remains `NOT_ACTIVE` as an AI agent; the deterministic role is not an autonomous model. The explicit local task start uses Life's existing runtime.

Test evidence: Company 34/34 unit tests, build pass, 46/46 Playwright checks with no page/console errors; Company delegation API 12/12; Life API 17/17; Life UI 8/8 with RTL/no overflow; Life helper 13/13. All used temporary SQLite databases and local synthetic stubs; no live/paid model calls or n8n runs.

Live connection is not enabled. Company reports `NEEDS_CONFIGURATION`; the running Life API and Command Center are stale and return 404 for the new routes. A read-only SQLite aggregate check found zero `queued/running/in_progress` tasks; no task content was read. Services were not restarted because the delegation secret is not configured. Configure `HQ_COMPANY_DELEGATION_TOKEN` for the Company↔Life service channel and ensure the Life Command Center process has its existing `WEJDAN_API_CONTROL_TOKEN`; tokens belong only in ignored local environment files, never repository content. Then restart the exact Life API and preview service and verify health/inbox without starting a delegated task.

This implementation does not supersede read-only source summary authentication, and it does not enable unified chat, automatic delegation, automatic result sharing, n8n workflows, or external actions.

