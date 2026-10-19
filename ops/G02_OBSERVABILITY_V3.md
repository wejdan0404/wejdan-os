# G02 Observability V3 — cloud verification evidence

Date: 2026-10-16. Scope: input-driven `monitor_event.v1` processing with synthetic events only.

## Implementation and persistence

- Workflow: `Wejdan Life OS | AI Observability | V3 Mock`, ID `L0WmUEpHLESFF9rv`, [n8n workflow](https://wejdan404.app.n8n.cloud/workflow/L0WmUEpHLESFF9rv).
- Created on a blank canvas from `workflows/n8n/source/v3/g02/observability-v3.json`; 3 nodes and 2 trigger-to-Code edges. Inactive, unpublished; no credential/provider/schedule/webhook/public endpoint nodes.
- Official export after reload: `workflows/n8n/backups/g02-working-20261016/observability-v3-post-reload-export.json`, SHA-256 `2B34D05AE90DBEBBBC307979282E18F4C0E49D45770863077A5FC1753EC3428C`; all 14,125 JavaScript characters exactly match local code.
- The worker consumes supplied monitor events. It does not generate fixture events. Validation rejects unknown top-level keys per `monitor_event.v1` `additionalProperties:false`; batch duplicate event IDs and malformed records become handled `error.v1` outputs. Valid events preserve input values and status; they do not claim a successful run. Unknown usage and cost remain unknown/null. Synthetic runtime is preserved separately from measured runtime. Incoming workflow execution references are preserved as supplied; the worker does not misstate its own `$execution.id` as the upstream run ID.

## Cloud synthetic test run

- Inactive private harness: `66Ej2OgZCmv4Nd6M`, [n8n harness](https://wejdan404.app.n8n.cloud/workflow/66Ej2OgZCmv4Nd6M), official post-reload export `workflows/n8n/backups/g02-working-20261016/observability-v3-test-harness-post-reload-export.json`, SHA-256 `AF10B3C29328B074D9AA3C31D86ABC4C1538FC7F584A087012BB749B3F95B3D0`.
- Harness execution 23 succeeded with eight inputs; child Observability execution 24 succeeded. Cases included completed, failed, timed-out, cancelled, duplicate event ID, blank trace, and unexpected top-level property.
- Worker output panel visibly showed 8 items. First valid record kept event/task/root-task/trace IDs, status `completed`, source `unknown`, runtime `null`, synthetic runtime `1200`, usage `unknown`, tokens and costs `null`. The execution panel confirms an 8-item worker output, but its visible JSON pane exposed only the first record in the accessibility view. The cloud run therefore verifies input consumption and successful processing, while a full per-output cloud schema audit is still pending. Local tests cover the malformed trace and extra-field errors; duplicate IDs are tested within one batch only, with no cross-run deduplication claim.

## Remaining audit item

A complete per-item cloud schema/semantic audit of all eight outputs is not yet written to the evidence files. Therefore G02 remains IN_PROGRESS and G03 stays NOT_STARTED until that audit is completed and recorded.
