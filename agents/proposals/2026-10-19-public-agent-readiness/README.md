# Proposal: public-product agent readiness and bounded optimizer

**Status:** `PROPOSED`  
**Owner direction:** `ops/DECISIONS.md` DEC-011–DEC-018  
**Scope:** all 85 canonical roles and the AI-01 improvement function  
**Live changes:** none; role cards, registry, skills, approved knowledge/memory, evaluators, runtime, grants, and approval state remain unchanged.

## Verified baseline

Source: `ops/agent-acceptance/role_matrix.json` and `ops/evidence/role-output-residual-review-20261018.json`, recorded 2026-10-18/19.

- Registered/routable/live-inference: 85/85.
- Specialist artifact pass: 77/85; eight residual failures remain and their original fixtures must be preserved.
- Independent reviewer pass: 78/85; zero human expert approvals.
- Scoped capability receipts: 77/85, harness-mediated; these do not prove autonomous safe tool use.
- A canonical contract/routing smoke is plumbing evidence, not role quality or production readiness.

| Role | Attempts | Observed evaluator/reviewer issue | First diagnostic target; not yet proven root cause |
|---|---:|---|---|
| PMO-QA | 6 | Task incomplete; unchanged revision; missing role deliverables; acceptance/ownership/approval evidence absent | Task packet and role-specific deliverable; separate real approval from generated text |
| AI-QA | 5 | Task incomplete; unchanged revision; missing role cues; unsupported user/evidence assertions | Task completion and evidence boundary; trace context and grader criterion |
| FE-03 | 4 | Task incomplete; requested device/test evidence absent | Task packet/platform capability; require explicit NOT_RUN/BLOCKED evidence when hardware is unavailable |
| FE-07 | 4 | Task incomplete and missing role cues; reviewer requested Redux despite this Flutter/Riverpod project | Reviewer/task-context mismatch is a candidate; verify source-of-truth context before changing role |
| FE-QA | 4 | Specialist evaluator failed role cues while reviewer passed; screen/browser/RTL/a11y evidence absent | Evaluator/reviewer agreement and task evidence completeness |
| BE-QA | 5 | Task incomplete; authz, migrations, idempotency/partial failure evidence absent | Task packet scope and service evidence; distinguish requirements from implemented features |
| INF-QA | 4 | Task incomplete; staging, rollback, restore, alert, isolation evidence absent | Environment unavailable vs deliverable omission; preserve BLOCKED/NOT_RUN truth |
| QA-01 | 5 | Task incomplete and reviewer-step evidence invalid; Android/iOS/native assistive evidence absent | Task completion/correlation and platform capabilities; no synthetic claim of device review |

Counts and issue summaries are not substitutes for opening each linked trace and artifact. Root-cause confidence remains `UNVERIFIED` until task packet, assembled context, role version, skill versions, tool trace, output, evaluator and reviewer evidence are reproduced together.

## Candidate runtime behavior

1. Trigger after a rejection, regression, repeated revision failure, or the weekly portfolio review. Read only authorized sanitized evidence; use synthetic data by default.
2. Create an immutable case bundle with task/trace IDs, source/version manifest, hashes, evaluator and reviewer findings, and privacy classification. If a required trace is missing, stop at `UNVERIFIED` and improve evidence collection first.
3. Diagnose the responsible layer(s) before proposing a change. Preserve the original failure and distinguish task/environment mismatch, evaluator mismatch, and actual role deficiency.
4. Write candidates only to a uniquely versioned isolated proposal workspace. Do not edit live role cards, skills, approved knowledge or memories, registry, evaluator, grants, runtime policy, or credentials.
5. Replay the unchanged failure, all existing regressions for affected roles, ambiguous/missing/conflicting inputs, Arabic/English cases where relevant, prompt-injection/tool misuse, and unaffected controls.
6. Require deterministic boundary checks to pass with zero unauthorized actions and zero cross-scope memory access. AI-QA and QA-01 review evaluator validity/evidence; the relevant specialist reviews deliverable truth; security/privacy reviewers join on boundary changes. Domain experts are required for health, finance, security and legal truth. Model-generated grades never substitute for expert approval.
7. Low-risk automatic staging may be considered only after the independent gates pass, all protected metrics are non-regressing, the candidate diff and rollback are recorded, and the runtime enforces promotion outside the model's authority. No candidate may grant itself more tools, scope, data, budget, or approval authority.
8. Policy, permission, evaluator, memory-boundary, sensitive-data, external-service, production, and deletion/retention changes remain blocked for explicit owner authorization and a separate review task.
9. On protected regression, missing evidence, reviewer disagreement, or unbounded cost/latency, retain the candidate as `PROPOSED`, do not stage, and report the blocker. Revert any staged ordinary change if a protected metric regresses.

## Evaluation contract

For each role, maintain role-specific expected artifacts and explicit pass/fail criteria derived from its canonical contract. Evaluate task completion, deliverable completeness, evidence/provenance, uncertainty handling, tool boundary, memory scope, reviewer resolution, latency and cost when available. Report numerator/denominator, case types, time window and confidence separately for deterministic checks, model graders, specialist reviewers and human experts. Never collapse them into one role-strength score.

Before any role is marked ready, its regression suite must pass; role-specific quality must meet pre-registered risk-tier criteria; and all mandatory expert reviews for that role must be recorded. A successful inference or one passing artifact cannot certify a role.

## Context and memory candidate delta

- Product context must point to `docs/PRODUCT_SPEC.md`, `docs/PRODUCT_DELIVERY_PLAN.md`, `ops/DECISIONS.md`, and current app/agent evidence. DEC-018 is the latest owner direction: iOS, Android, and web are public launch requirements, superseding DEC-016's platform deferral. DEC-016's SwiftUI/native iOS choice remains; Flutter is the Android/web foundation. Account/sync provider, credentials, live data, and budget remain separately gated.
- Every invocation receives only the task packet, applicable root/nested instructions, shared project context, its own role contract/card, approved project memory, its own approved role memory, approved task-relevant knowledge, and skills selected for the task.
- Context manifests record provenance/version/status/date, access scope, selection reason, and omitted/stale/conflicting sources. Retrieved material never grants authority.
- Case data stays in task artifacts. Persistent memory writes retain the required provenance, sensitivity, confidence, dates, review status, and approval; cross-role private-memory reads stay denied by default.
- All 85 roles receive an evidence row, not a claim of active workers. The registry remains metadata until independent runtime validation and authorized activation.

## Validation and approval status

- Baseline counts and eight residual roles were read from the cited evidence: `PASS` for transcription only.
- Reproduction of the eight failures against the current runtime: `NOT_RUN`.
- Candidate role/context/skill/evaluator changes: `NOT_CREATED`.
- Cross-role memory, runtime promotion guard, and autonomous staging end-to-end tests: `NOT_RUN`.
- Independent review: `PENDING` (AI-QA, QA-01, AI-09, AI-11, SEC-06, PMO-04, plus applicable domain experts).
- Owner direction authorizes bounded low-risk staging as a target capability, not current production activation or an exemption from the project review gates.

## Rollback and promotion

No live state changes in this proposal. Promotion requires independent signed review records, exact version/hash, full regression evidence, external enforcement of the staging boundary, owner authorization where specified above, and an archived rollback target. Preserve all prior failures and candidate artifacts.


