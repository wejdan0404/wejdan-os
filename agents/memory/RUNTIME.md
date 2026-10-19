# Local agent memory runtime

The local inference runtime stores memory in SQLite tables `agent_project_memory` and `governed_memory_audit`. Task working memory remains under `task_memory`; actual context assembly provenance is stored per task step in `task_context_manifests`. These stores have different scopes and deletion lifecycles.

## Scope and retrieval

- `agent` scope is isolated by canonical role ID. A role receives only its own approved records.
- `project` scope is visible to all local roles in `wejdan-life-os` after approval.
- Only unexpired `APPROVED`, conflict-free, `non_personal` records enter the Ollama prompt. Proposals and rejected, superseded, expired, or conflicted records do not.
- Every proposal points at a completed/approved source task and trace, a participating source role, evidence references, and confidence. Role memory must be proposed by the same role it targets.
- Conflicts pause retrieval pending explicit supersession. Deletion requires the record ID to be repeated in the request and creates an audit tombstone.
- Runtime context is clipped to the local workflow's 8,000-character system-prompt ceiling. Check evidence and context budget when adding large skills or role cards.
- Each invocation records a context manifest with role/contract, task fingerprint, source hashes, scopes, selection reasons, included/truncated/omitted status and total prompt length. Memory records are included whole or omitted with an explicit reason; they are never silently clipped.

## Owner controls

The API listens on loopback. Its `/api/memory` endpoints require the local control token; the PowerShell helper reads the DPAPI-protected token and does not print it:

```powershell
.\ops\local-live\runtime\memory-control.ps1 -Action list
.\ops\local-live\runtime\memory-control.ps1 -Action list -ScopeKind agent -RoleId AI-09
.\ops\local-live\runtime\memory-control.ps1 -Action audit -RecordId mem_<uuid>
.\ops\local-live\runtime\memory-control.ps1 -Action approve -RecordId mem_<uuid> -Note 'Reviewed source evidence'
.\ops\local-live\runtime\memory-control.ps1 -Action reject -RecordId mem_<uuid> -Note 'Reason for rejection'
.\ops\local-live\runtime\memory-control.ps1 -Action delete -RecordId mem_<uuid>
```

Proposal submissions use `POST /api/memory/proposals` with `task_id`, `trace_id`, `source_role_id`, `project_id`, `scope_kind`, `role_id` (null for project scope), `memory_key`, `content`, `evidence_refs`, `confidence`, and `sensitivity: "non_personal"`. Review uses `POST /api/memory/:id/review` with `decision` and optional `note`. All controls are bound to the local runtime token; do not expose it or the service beyond loopback.

## Validation boundary

The focused memory unit and local API integration tests exercise approval, source checks, role isolation, shared retrieval, conflict resolution, auth rejection, and task deletion. Their n8n endpoint is a synthetic local stub; they do not prove live model quality, external agent integration, backup erasure, or production deployment state.
