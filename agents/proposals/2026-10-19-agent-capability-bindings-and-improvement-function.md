# Proposal: Complete role capability bindings and define improvement function

**Status:** `PROPOSED`  
**Created:** 2026-10-19  
**Owner:** AI-01  
**Independent reviewers required:** AI-QA, QA-01; AI-09/AI-11/SEC-06/PMO-04 for memory, safety, privacy and knowledge changes.  
**Human approval:** Proposal-space authoring and local synthetic evaluation authorized by Wejdan on 2026-10-19. Live promotion, activation, shared knowledge/memory approval and runtime changes are not authorized here.

## Evidence and diagnosis

- The 85 role bindings now include per-role skills, baseline knowledge/context and memory-policy refs; card-to-binding consistency was checked across all 85 roles.
- All 85 role cards exist. Code review of `ops/local-live/runtime/server.mjs#rolePrompt` and `ops/local-live/runtime/memory-governance.mjs#retrieveGovernedMemory` shows an inference path for approved role/project memories, role cards, project context, baseline knowledge and card-linked skills. This does not prove end-to-end isolation or which runtime version is active.
- The 2026-10-19 registry reports 85 live inference passes, 77 specialist artifact passes, 78 reviewer passes, 77 verified tool receipts and zero human-expert approvals. This is not a single quality score.
- Eight unchanged synthetic residual failures are preserved in `agents/evals/regressions/residual-failures.v1.json`; most have missing completion/role deliverable evidence. They have not been replayed to verify a fix.
- `agents/memory/RUNTIME.md` reports focused unit and local API integration checks for approval, source checks, role isolation, shared retrieval, conflict resolution, auth rejection and task deletion. Their n8n endpoint is a synthetic local stub; they do not establish production deployment or backup erasure.
- `AI-14` is absent from the canonical contract catalogue; `agents/README.md` and the existing improvement loop correctly place the improvement function under AI-01 with independent review.

## Proposed change

The binding implementation adds per-role skill paths, baseline knowledge refs, shared context, memory-policy refs and namespace metadata for all 85 roles. The improvement-function specification adds operating roles, stage boundaries, context-manifest requirements, proposal-only candidate skill/eval authoring, and local synthetic evaluation under AI-01. References do not by themselves prove runtime behavior; memory status reflects the discovered code path and pending independent validation.

## Hypothesis

Explicit, validated bindings and an advisory improvement operating contract will reduce context omissions and ambiguity in future task assembly while preserving scoped retrieval and independent approval. This is a design hypothesis only; no behavior improvement has been measured.

## Validation and limits

- Structural audit: 85 registry rows, 85 role cards, every role has skill/knowledge/context/memory bindings, all assigned skill files exist. `PASS` for file/reference consistency only.
- Behavioral evaluation for role bindings/improvement quality: `NOT_RUN`.
- New-skill candidate quality: `NOT_RUN`; the proposal-space write boundary and evidence threshold are specified, but no candidate skill has yet been generated or promoted.
- Memory-control regression suite: `PASS` 3/3 local suites (synthetic SQLite/API, n8n stub; no paid/external calls). One stale default-approval bug was corrected; the regression is recorded as `regression-memory-runtime-current`.
- Runtime retrieval/memory wiring: local code path and focused synthetic unit/API evidence exist; the active runtime version and end-to-end production isolation remain unverified. Skill binding/loading and truncation behavior are not exhaustively validated.
- Independent review and human approval: `PENDING`.
- Protected controls: no tool grants, runtime activation, contracts, approved knowledge, persistent memories, paid services, production data or external side effects changed. The already delegated ability to write candidate files under `agents/proposals/` and run local synthetic checks is documented; no live skill or runtime was changed here.

## Rollback

Restore the prior `agents/registry.json`, `agents/governance/IMPROVEMENT_LOOP.md`, `agents/knowledge/README.md`, and remove `agents/governance/IMPROVEMENT_FUNCTION.md` and this proposal. Preserve current and previous versions in version control; no generated/runtime migration exists.

## Research basis

See `agents/research/AGENT_SYSTEM_RESEARCH.md`. Sources support compact role-specific context, progressive skill disclosure, traces plus repeatable evaluations, and keeping memory separate from run compaction. They do not prove local quality. The OpenAI Evals and Agent Builder pages reviewed for this proposal include deprecation timelines; avoid building long-term workflow dependencies on those surfaces without checking their current status.
