# Memory scope layout

This directory defines namespaces and governance. The local runtime now provides durable database persistence and inference-time retrieval for approved role and project memories; see `RUNTIME.md` for operations and validation boundaries.

```text
agents/memory/
  sessions/<task_id>/                 ephemeral working/compacted context
  roles/<role_id>/approved/            isolated role-specific reusable lessons
  project/approved/                    shared owner-approved project memory
  proposals/<proposal_id>/             pending write/change, with provenance
```

## Record envelope

```json
{
  "schema_version": "agent-memory-record.v1",
  "memory_id": "mem_<uuid>",
  "scope": {"kind": "agent", "role_id": "AI-09", "team_id": "AI", "project_id": "wejdan-life-os"},
  "kind": "workflow_lesson",
  "key": "stable-key",
  "content": "One reusable, evidence-backed fact or procedure.",
  "status": "PROPOSED",
  "source": {"task_id": "task_<id>", "trace_id": "trace_<id>", "role_id": "AI-09", "evidence_refs": ["path#record"]},
  "confidence": 0.0,
  "sensitivity": "non_personal",
  "created_at": "ISO-8601 UTC",
  "review_by": "ISO-8601 UTC",
  "expires_at": null,
  "version": 1,
  "supersedes": null,
  "conflict_state": "clear",
  "approved_by": null,
  "approval_evidence": null
}
```

The example is a schema sketch, not a validated runtime contract. `status` must distinguish `PROPOSED`, `APPROVED`, `SUPERSEDED`, and `REJECTED`; approval fields are populated only by an authorized person/service. Conflicting records remain inspectable and flagged until a custodian resolves them.

## Access and lifecycle requirements

- Resolve the authenticated task's project, team, and role server-side; never trust model-supplied scope IDs.
- Authorization-filter before lexical/vector search and after candidate retrieval. Enforce per-role isolation in both application and database policy; test direct-object-ID access.
- Sessions can compact within one task; compaction is lossy and must preserve task goal, constraints, decisions, IDs, evidence, open questions and timeline. Apply the documented task retention policy.
- Role memory stores reusable role workflow lessons only. Project memory stores approved reusable shared facts/decisions only. Case findings stay in task artifacts; personal/user data requires a separately authorized feature and consent.
- Every write is append/version based, provenance-required and idempotent. Detect conflict rather than overwrite. Separate suggestion authority from approval and application authority.
- Provide owner inspection, export, correction, revocation/deletion and an audit trail. Retention expiry and backup deletion semantics must be defined before production.
- Do not put memory text, sensitive values or raw prompts in observability logs. Log IDs, scope labels, policy decisions and redacted evidence pointers.

## Current implementation evidence and gap

`ops/local-live/runtime/memory-governance.mjs` defines governed `agent_project_memory`, provenance, versions, conflict states, inspection, and deletion audit; `retrieveGovernedMemory()` selects approved, clear, unexpired records by role/project scope. `ops/local-live/runtime/server.mjs` calls it in `rolePrompt()` and injects both scopes with context/skills. Thus local inference has an implementation path. The record shown by `rolePrompt()` uses the role ID from the canonical server-side role routing; verify the caller cannot control that identity.

Runtime implementation alone does not verify authorization end-to-end, information-flow isolation, task/purpose binding, persistence/backup deletion, context completeness after truncation, or active deployed version. The focused security/privacy/replay gate remains pending until AI-09, BE-05/BE-06, AI-08, AI-11, SEC-06, AI-12, AI-QA and QA-01 review relevant traces/code and negative access tests. Keep synthetic state separate from real personal-data use.
