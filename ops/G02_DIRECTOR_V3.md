# G02 Program Director V3 — cloud verification evidence

Date: 2026-10-16. Scope: Program Director only; G02 remains open until Finance and Observability independently pass.

## Source and version discrepancy

- G00 baseline: `workflows/n8n/backups/g00-rebaseline-20261016/program-director-v2.json`; workflow ID `94SV8TzA5AGWWtH5`; target Code node ID `18aad784-0f4a-4f4d-9ba4-99b5fbd285d2`; original JavaScript length 2,362; file SHA-256 `5ABE2EDCA351D1FA5C3FCE959B79D7D1584EC97D84631099E43C3A64EB976219`.
- Current pre-repair V2 export: `workflows/n8n/backups/g02-working-20261016/program-director-v2-pre-repair-live.json`; same workflow/node IDs; source was 50 characters (`NEW-CODE`); SHA-256 `617047508A5CF33317CF54EB68A95EB0B3E25D99C78551B98FD6FBED39DF08F3`.
- This demonstrates that the live V2 source drifted after the G00 snapshot. Available records do not establish who or what wrote the test snippet. Both versions remain preserved.
- The generated V2 Code source files had also been overwritten by the same short snippet. They were regenerated from checked-in templates and the 85-role registry. The Director source now rejects unexpected task fields in accordance with `task.v1` (`additionalProperties: false`). The local worker suite passes 24/24.

## Verified V3 implementation

- Current V3 workflow: `Wejdan Life OS | Program Director | V3 Mock`, ID `v85C2ImvJ9IArbJ3`, URL `https://wejdan404.app.n8n.cloud/workflow/v85C2ImvJ9IArbJ3`.
- Imported only to an empty workflow canvas. Graph has 3 nodes (manual fixture trigger, private Execute Workflow trigger, Code) and 2 trigger-to-Code edges. No credential, paid-provider, schedule, webhook, or public endpoint node. `active=false`; no publish action was taken.
- Prepared definition: `workflows/n8n/source/v3/g02/program-director-v3.json`. Code source is 15,902 Unicode characters / 17,811 UTF-8 bytes; SHA-256 `E340C90134008FD1023C264D14060B2045DD5B610AE3CB98D4B56ADB1D7F61DB`.
- After import, reloaded the workflow and obtained a fresh official n8n JSON export at `workflows/n8n/backups/g02-working-20261016/program-director-v3-post-reload-export.json`. Export SHA-256 `D3B911AFFFDA8EDD696688F5B23FF0C950DB19A847E0AF68027E550C55B41566`; workflow ID and inactive state match; exported JavaScript is 15,902 characters and byte-for-byte equal to the regenerated source (same SHA-256).
- An earlier first V3 draft is retained, not deleted: ID `SubhMY6QcfMM2PAc`, renamed `Wejdan Life OS | Program Director | V3 Draft (unverified)`. Its pre-reload export is preserved separately. It is not a current implementation.

## Actual cloud synthetic tests

- Isolated, inactive mock-only parent harness: ID `bEAOJrHpp8zDh1uW`, `Wejdan Life OS | G02 | Director V3 Synthetic Test Harness`; official post-reload export `workflows/n8n/backups/g02-working-20261016/director-v3-test-harness-post-reload-export.json`; target ID `v85C2ImvJ9IArbJ3`.
- Parent execution URL observed: `https://wejdan404.app.n8n.cloud/workflow/bEAOJrHpp8zDh1uW/8a7af7`; actual Director sub-execution ID `16`, opened from the n8n “View sub-execution” link. Execution succeeded.
- Seven synthetic task scenarios were sent in one real cloud call; the child produced 9 output items: 2 `task_assignment.v1`, 2 `handoff.v1`, and 5 `error.v1`.
- Valid cases preserved `task_id`, `root_task_id`, and `trace_id`; Director identity is `D-00`. Deterministic `mock_observability` routing assigned the valid task to `AI-13`.
- Negative cases returned handled errors for missing task ID (`MISSING_TASK_ID`), invalid trace (`INVALID_TRACE_ID`), unknown role (`UNKNOWN_OR_MISMATCHED_ROLE`), missing required objective (`MISSING_OBJECTIVE`), and unexpected field (`UNEXPECTED_FIELD_UNEXPECTED_PAYLOAD`). No invalid case emitted a success assignment.
- Cloud output audit checked every required property and rejected unknown properties against the local schemas for all 9 outputs; all checks passed. The output includes no paid API or actual spending fields. No paid provider calls occurred.
- Two exploratory runs were excluded from acceptance: an initial V3 draft run with no supplied data and a first disconnected harness import; a later harness iteration failed because n8n’s sandbox lacks `structuredClone`. The current successful harness avoids that API. These failed attempts did not activate or publish any workflow.

## G02 decision

Program Director V3 is independently cloud-verified and is the current mock implementation for D-00. Program Director V2 remains preserved and classified as broken/superseded. G02 remains `IN_PROGRESS`; Finance V3 is next and Observability V3 must follow Finance. No later gate may begin until all three V3 workers pass.
