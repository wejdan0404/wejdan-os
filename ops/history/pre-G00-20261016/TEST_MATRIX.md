# M11 — Verification matrix

| Area | Check | Evidence | Result / limit |
|---|---|---|---|
| Role roster | 85 unique IDs, duty text, bilingual registry and 85 contract files | `roles/build_role_registry.ps1`, acceptance runner | PASS; 3 `MOCK_TESTED` deterministically, 82 `SPECIFIED`; all runtime inactive |
| Schemas/contracts | JSON parse and contract assertions | `workflows/n8n/tests/run_acceptance.ps1` | PASS; no full JSON Schema validator is installed |
| Synthetic cases | Missing IDs, duplicate IDs, invalid budget, unknown usage | `mock_cases.v1.json`, acceptance runner | PASS; fixture tests are deterministic |
| Ledger | Fixed-point SAR micro-units; reserve/settle/release/idempotence/caps/kill switch/unknown usage | `mock-ledger-v2.ps1` | PASS in-memory only; not an atomic backend |
| Approval | Task/trace/action binding, expiry, replay and pending behavior | `mock-approval.ps1` | PASS mock only; no human approval endpoint |
| Live n8n originals | Four exact exports and prior manual execution evidence | `workflows/n8n/backups/` | Export identity/active state verified; execution evidence is historical from earlier task context unless explicitly stated fresh |
| Live n8n V2 | Program Director and Finance copies; Observability internal input plumbing | Exact final exports and editor run notices | PD/Finance manual synthetic one-item runs passed; Observability has trigger wiring but still emits six fixtures; all unpublished/inactive; no provider calls |
| Command Center | Bilingual rendering, role/task counts, filtering, trace dialog, redacted export, mobile viewport and page errors | `command-center/smoke-test.mjs` | PASS; local static mock only |
| Full schema conformance | Draft 2020-12 validation | None | NOT RUN; validator unavailable without dependency installation |
| End-to-end cloud orchestration | Parent calling all workers and collecting their outputs | None | BLOCKED; no verified parent workflow wired to V2 workers |
| Flutter app | Existing unrelated app regression suite | None | Not changed by this work; not run |
