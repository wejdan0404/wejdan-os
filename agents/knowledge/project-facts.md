# Approved reusable project facts

Status: curated baseline; verify referenced live sources before making time-sensitive claims.

- Wejdan Life OS is a local-first personal planning app; privacy is a core design constraint. Evidence: `docs/PRODUCT_SPEC.md`, `ops/DECISIONS.md` DEC-007/008.
- Wejdan retains final authority for sensitive access, spend, external side effects and release. Evidence: `roles/role_registry.json` forbidden actions and approval requirements; `ops/DECISIONS.md`.
- The role registry has 85 canonical roles. Registry/role activation is not proof of 85 running agents. Evidence: `roles/role_registry.json`, `roles/activation_matrix.md`, `ops/DECISIONS.md` DEC-002/010.
- Agent quality must be measured at the specialist deliverable and end-state level, with independent review and traceable evidence. Invocation/correlation smoke is narrower than domain competence. Evidence: `ops/evidence/role-matrix-independent-audit-20261018.json`, `ops/LOCAL_AI_EVAL_MATRIX.json`.
- Current local runtime gives tools no default grants. Exact task packets must authorize any tools; sensitive actions require owner approval. Evidence: `ops/local-live/runtime/role-capabilities.mjs`, canonical contracts.
- Existing task memory is per task. Governed memory records have provenance, versions and conflict states, plus inspection/export and explicit owner deletion; durable role/project scopes and context injection are not implemented in the cited runtime. Evidence: `ops/local-live/runtime/memory-governance.mjs`, `ops/local-live/runtime/server.mjs`.

These facts are a navigation aid, not replacements for the source documents. Revalidate current state before acting.
