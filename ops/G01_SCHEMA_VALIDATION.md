# G01 — shared data contracts and validation

Status: **VERIFIED_COMPLETE** — 2026-10-16.

## Contracts

Eleven Draft 2020-12 dialect schemas are present and indexed in `ops/SCHEMA_REGISTRY.json`: `task.v1`, `task_assignment.v1`, `budget_decision.v1`, `approval_request.v1`, `approval_result.v1`, `execution_result.v1`, `monitor_event.v1`, `agent_profile.v1`, `handoff.v1`, `audit_event.v1`, and `error.v1`.

Contracts define task/root/parent/correlation identifiers where applicable; bilingual actor/role identity; workflow execution references; status and UTC timestamps; data classification and permission scope; approval state; cost bucket and integer micro-SAR fields; schema/contract versions; idempotency; error classification; artifact references; and acceptance evidence.

Each schema has a deterministic valid fixture and wrong-version invalid fixture under `workflows/n8n/fixtures/contracts/`. The G01 gate was reopened during completeness review. During sequential preflight, G02 interface design exposed three omissions in task.v1/monitor_event.v1: task status and typed execution references; monitoring status, retry/runtime, usage, separate costs and errors; and Finance cost-estimate/usage fields. These were added with nullable unknowns preserved. The full suite was rerun after all amendments before G02 started.

## Validation and limitations

Available tools inspected: Node.js 24.21.0; `ajv` unavailable; Python `jsonschema` unavailable. No packages were installed. `workflows/n8n/tests/validate-contracts.mjs` checks the documented schema keyword subset and semantic invariants: local `$ref`, supported types, required/properties/additionalProperties, enum/const, string length/pattern/date-time, numeric bounds, array bounds/uniqueness, registry role membership, batch uniqueness, task/trace correlations, state transition allow-list, and payload size.

This checker is **not a standards-compliant JSON Schema Draft 2020-12 implementation**. Schema dialect declarations do not change that limitation. A future fully standards-conformant meta-schema validation requires an already-available validator or separately authorized dependency installation.

No cloud workflow was edited for G01. Live runtime contract enforcement was not claimed; this gate establishes the shared schema/fixture/checker foundation. Workflow-specific contract integration belongs to its later ordered implementation gate.

## Tests run

- `node workflows/n8n/tests/generate-contract-fixtures.mjs` — generated valid/invalid fixture pairs for 11 contracts.
- `node workflows/n8n/tests/validate-contracts.mjs` — 95 assertions passed, 0 failed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File workflows/n8n/tests/run_acceptance.ps1` — 16 existing acceptance assertions passed; invokes the 95-assertion contract validator as part of the suite.
- `powershell -NoProfile -ExecutionPolicy Bypass -File ops/validate_g00.ps1` — 57 G00 regression assertions passed.

G01 (including the monitoring, task, assignment, budget and handoff amendments) satisfies its gate-level acceptance: all required contract files exist, the actual validation scope is stated without an overclaim, and the available reproducible suite passes. No cloud state, credentials, paid provider use, or external side effects were involved.






