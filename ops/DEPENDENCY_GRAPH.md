# Wejdan Life OS — dependency graph (G00 baseline)

This graph records the strict gate order in the owner-provided execution instruction. Each gate depends on the verified outputs of the immediately preceding gate; later gates cannot start while the current gate is incomplete.

```mermaid
flowchart TD
  G00[G00 Rebaseline, backups, dependency audit] --> G01[G01 Contracts and schema enforcement]
  G01 --> G02[G02 Shared task lifecycle]
  G02 --> G03[G03 Input-driven V2 workers]
  G03 --> G04[G04 Live parent orchestration]
  G04 --> G05[G05 Integrated scenarios]
  G05 --> G06[G06 Mock financial controls]
  G06 --> G07[G07 Approval controls]
  G07 --> G08[G08 Observability event pipeline]
  G08 --> G09[G09 Command Center]
  G09 --> G10[G10 85-role implementation framework]
  G10 --> G11[G11 Shared handoff system]
  G11 --> G12[G12 Provider entitlement boundary]
  G12 --> G13[G13 Security and operational hardening]
  G13 --> G14[G14 Comprehensive verification]
  G14 --> G15[G15 Operations and recoverability]
  G15 --> G16[G16 Final consolidation]
```

## Current gate

G00 and G01 are **VERIFIED_COMPLETE**. G02 is **IN_PROGRESS**. G03–G16 are **NOT_STARTED**. This is a program dependency chain mandated by the request, not a claim that every technical artifact has a direct runtime dependency on its predecessor.

## Known runtime dependencies from the current n8n baseline

- Pilot (`KvMjR2lx81qsuCPL`) is a standalone manual-triggered synthetic flow.
- The four original standalone role/pilot flows are not connected to a cloud parent.
- Each V2 flow has a manual trigger and an `executeWorkflowTrigger` feeding its Code node. No verified parent calls these child workflows.
- Program Director and Finance Code nodes have input-processing logic. Observability V2 Code still returns fixed fixtures; treat it as not yet event-driven.
- Local `agent-mock-orchestrator-v2.json` is only a template and has no matching live workflow.
- All seven workflows are inactive; credential inventory is empty and exported nodes have no credentials.

## Source evidence

`ops/GATE_QUEUE.json`, `ops/WORKFLOW_REGISTRY.json`, `ops/G00_BACKUP_MANIFEST.json`, and `ops/G00_SOURCE_DRIFT.md`.


