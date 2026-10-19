# Agent capability system

This directory is a version-controlled design and operating layer for the 85 canonical roles in `roles/role_registry.json`. It supplies scoped context, a private memory design per role, project-wide memory/knowledge, on-demand skills, and a governed improvement process. It does not activate providers, change tool grants, or claim professional certification.

## Files

- `registry.json`: binding for all roles: contract, readiness, individual memory namespace, project memory namespace, shared context, knowledge and skills. Bindings guide runtime retrieval; runtime status is tracked separately.
- `roles/<ROLE_ID>.md`: role card for each canonical role.
- `context/PROJECT_CONTEXT.md`: compact shared operating context.
- `knowledge/README.md`: source-of-truth map and retrieval rules.
- `knowledge/`: approved design notes and reusable project facts.
- `memory/RUNTIME.md`: local memory scopes, owner controls and validation boundary.
- `skills/`: reusable instructions grouped by capability/team; load only when task-relevant.
- `governance/IMPROVEMENT_LOOP.md`: continuous-improvement function operated under AI-01.
- `governance/IMPROVEMENT_FUNCTION.md`: bounded daily improvement function under AI-01. It may write candidate skills/evals/reports in `agents/proposals/` and run local synthetic checks; promotion, approval and live activation remain separate. New skill drafts require two independent cases or a documented high-risk mandatory procedure.
- `ops/agent-acceptance/agent-eval-suite.v1.json`: ten role-grounded synthetic regression cases per canonical role.
- `research/AGENT_SYSTEM_RESEARCH.md`: web research synthesis and source links.

## Readiness

The canonical registry currently has 85 roles. At the last recorded independent audit, 85 had local inference, 77 specialist artifacts passed, 78 reviewer verdicts passed, 77 had a tool-capability receipt, and zero had human-expert approval. The 85 inferences validate invocation/correlation, not domain truth. See `ops/evidence/role-matrix-independent-audit-20261018.json` and `ops/evidence/role-output-residual-review-20261018.json` for scope and failed roles. Runtime status stays sourced from the canonical registry and acceptance matrix.

## Memory implementation status

The local runtime has task-scoped `task_memory` and a governed `agent_project_memory` module. `rolePrompt()` retrieves approved, unexpired, conflict-free role-scoped and shared project memory and injects it with role cards, project context, baseline knowledge and skills. This is an implementation path; a full quality/security claim still requires review of auth, information-flow isolation, context truncation, retention/backup deletion and deployed runtime version before production use. Persistent-memory status remains `IMPLEMENTED_LOCAL_PATH_PENDING_INDEPENDENT_VALIDATION`, not production-ready. Owner workflows are in `agents/memory/RUNTIME.md`.

## Continuous improvement ownership

No new role was invented: `AI-14` is absent from the canonical registry. The continuous improvement function therefore sits under AI-01's architecture and version/rollback responsibility. AI-01 coordinates; AI-09 owns memory policy, AI-12 owns eval datasets, AI-QA independently checks behavior, PMO-04 curates approved knowledge, AI-11/SEC review security, and QA-01 reviews the quality gate. `agents/governance/IMPROVEMENT_LOOP.md` defines the full cycle. The function can generate proposals and evidence but cannot approve or silently deploy its own changes.

The 2026-10-19 binding and improvement-function changes are recorded as `PROPOSED` in `agents/proposals/2026-10-19-agent-capability-bindings-and-improvement-function.md`. AI-01 now has a daily read-only portfolio auditor and a full 850-case candidate evaluation runner. Candidate writing remains confined to proposals; live promotion remains gated on independent review and owner approval.

## Validation performed

Structural audit confirmed 85 role cards for 85 contracts and registry entries, all 6 skills have matching `SKILL.md` frontmatter and directories, all 85 registry rows bind existing role-relevant skills and baseline context/knowledge/memory refs, and 8 historical residual failures are retained as regression references. This checks file/metadata consistency only; it does not validate context completeness or improved model quality. Local memory unit/API tests are described in `agents/memory/RUNTIME.md`; they use a synthetic endpoint and do not prove production behavior. The new bindings and governance additions are `PROPOSED` pending independent review.
