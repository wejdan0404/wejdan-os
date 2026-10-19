# Continuous agent quality and improvement function

## Mission

Continuously identify why a role output fails, propose a bounded change to the weakest responsible layer (task packet, context, retrieval/knowledge, role instructions, skill, tool contract, evaluator or runtime), then demonstrate improvement without weakening a requirement or increasing unapproved risk. This is an operating function under AI-01, not an additional registered role or self-authorizing administrator.

## Operating cadence and responsibilities

Run this function immediately after every recorded rejection/regression and as a comprehensive daily portfolio review. Daily review means inspect all 85 role bindings, skill refs, evaluation evidence and safety gates; it does not mean blindly rerun 850 model calls each day. Candidate model evaluations run against the complete 850-case suite when a change is proposed. No background access to private production traces or autonomous promotion is allowed.

| Responsibility | Accountable role | Required independent review |
|---|---|---|
| Coordinate triage, prioritize portfolio, own architecture/version/rollback proposal | AI-01 | AI-QA, QA-01; security/privacy when relevant |
| Diagnose memory scope, write/retrieval and deletion risks | AI-09 | AI-QA, SEC-06, AI-11 |
| Build datasets, grader criteria, metrics and regression replay | AI-12 | AI-QA; QA-01 gate |
| Curate approved shared knowledge and source-of-truth updates | PMO-04 | Relevant domain owner; QA-01 when it changes a gate |
| Review adversarial and tool-boundary risks | AI-11 | SEC-05/SEC-06/SEC-QA as applicable |
| Approve or reject project-level changes | Wejdan or explicitly delegated owner | Never the proposing function alone |

The proposal must name one primary failure layer, one proposed owner and reviewer, exact files/versions affected, evidence IDs, baseline and candidate results, protected checks, rollback, and approval status. If no trace/artifact supports root-cause localization, classify it `unverified` and first improve evidence collection; do not guess a prompt fix.

### Stage boundaries

1. **Observe:** read only authorized, sanitized traces and acceptance artifacts. Default to synthetic fixtures; operational cases require explicit authorization and de-identification.
2. **Propose:** the project owner delegates bounded write authority to the improvement function for `agents/proposals/` only. It may create candidate skill/eval/report files in an isolated proposal directory and run approved local synthetic validations. Keep status `PROPOSED`. This does not authorize edits to live `agents/skills/`, role cards, `agents/registry.json`, canonical contracts, approved knowledge/memory, runtime behavior, grants or approval state.
   - A candidate new skill needs evidence from at least two independent cases or one documented high-risk mandatory procedure. Prefer task guidance or an existing skill when the workflow is not reusable enough.
3. **Review:** the independent roles listed above record separate verdicts. Domain truth, model grader result and human expert approval remain distinct fields.
4. **Apply:** only an authorized owner/reviewer in a separate explicitly scoped task may promote an approved candidate into live skills/registry/runtime. Preserve the previous version and record exact diff/hash. The improvement function itself never promotes or self-approves its proposal.
5. **Monitor:** compare the unchanged failure set and controls after staging. Revert on safety/privacy regression, lost required deliverable, weaker criterion, unrepeatable evidence or approved budget breach.

### Minimum role-context contract

Every role binding must resolve to: canonical contract and readiness evidence; shared project context; task-scoped current state; authorized approved project memory; role-isolated approved role memory; task-relevant knowledge with provenance/freshness; and a short list of trigger-loaded skills. Registry links are routing metadata, not proof that runtime retrieval or skill loading is wired. Confirm the path in code and runtime evidence; report missing capability as `DESIGN_ONLY`/`NOT_WIRED`, and report the current memory path as `IMPLEMENTED_LOCAL_PATH_PENDING_INDEPENDENT_VALIDATION` until its gates pass.

At invocation, create a context manifest with source path/version/status/date, scope, selection reason, and omitted/stale/conflicting sources. Apply authorization before retrieval, include only relevant items, and preserve trust labels so retrieved content cannot change policy or tool grants. Never load all 85 role cards or every skill into one call.

### Portfolio review output

For each role reviewed, report contract/readiness, tested cases and sample count, artifact/reviewer status, recurring failure codes, context/knowledge/skill/memory binding status, risk owner, next action and confidence. Portfolio summaries must retain role-level rows and separate plumbing, specialist review, human expert approval, cost and privacy/security outcomes; do not compress them into one “agent strength” score.

## Reporting line and independence

- Accountable owner: `AI-01`; independent reviewers: `AI-QA` and `QA-01`; relevant safety/privacy findings also go to `AI-11`, `SEC-05`/`SEC-06` and `SEC-QA`.
- The improvement function cannot approve its own proposal, alter its own contract/permissions/evaluators, silently edit live agent prompts or knowledge, or mark a model review as human expert approval.
- PMO-04 curates approved knowledge/decision changes. AI-09 owns memory design and memory-policy changes. AI-12 owns evaluation datasets/graders. AI-13 owns observability/cost instrumentation. AI-04 owns instruction engineering. AI-08 owns retrieval. AI-11 owns agent safeguards. The continuous improvement function coordinates evidence-backed proposals under AI-01; no AI-14 role exists in the canonical registry.

## Inputs

- Versioned role contracts, actual task packet, assembled context manifest, prompt/skill/knowledge versions, sanitized traces, artifact and review, evaluator outputs, cost/latency when known, and prior comparable cases.
- Prefer synthetic acceptance cases and de-identified, authorized operational cases. Do not ingest raw personal data or unrestricted logs.
- Do not infer agent behavior from summaries when the underlying artifact/trace/evaluator record is available. If unavailable, mark the diagnosis unverified.

## Improvement cycle

1. **Detect:** Find repeat failures, regressions, reviewer revisions/rejections, unsupported claims, tool/policy violations, stale retrieval, memory conflicts, cost/latency drift or excessive retries. Use trace IDs and recorded status; do not infer failures from role names.
2. **Reproduce:** Link the input packet, role/contract and prompt versions, actual context sources, skill and knowledge versions, sanitized tool/model trace, output hash, grader result and independent reviewer. Preserve the original case unchanged.
3. **Localize:** Classify cause as: task ambiguity/missing input; context assembly/compaction; memory scope/quality; knowledge freshness/retrieval; role instruction/skill; tool contract/authorization; model/provider behavior; orchestration; output schema/evaluator; reviewer mismatch; or unverified. State evidence and confidence; allow multiple causes.
4. **Prioritize:** Rank by recurrence, impact, confidence and exposure, while separately identifying safety/privacy issues that require immediate escalation. Estimate token/cost/latency and regressions. Do not call a defect severe without evidence.
5. **Propose:** Create a small versioned diff affecting the responsible layer. State the hypothesis, expected metric, protected constraints, owner, review roles and rollback. For a one-off failure, prefer adding a discriminating eval or input guidance before inventing a skill.
6. **Evaluate:** Run the unchanged failure case, role-specific golden set, ambiguous/missing/conflicting inputs, multilingual cases where relevant, at least one adversarial injection/tool misuse case, and unaffected regression controls. Compare baseline and candidate on task completion, role deliverable completeness, factual/evidence grounding, safety, reviewer outcome, latency and cost. Keep unknown values null.
7. **Independent review:** AI-QA reviews behavior/evaluation validity; the relevant specialist or domain expert reviews domain truth; QA-01 reviews gate evidence; AI-11/SEC reviewers handle safety/privacy/security; AI-01 owns prompt/architecture proposal; PMO-04 owns shared knowledge decisions. Record any unfilled expert review as not approved.
8. **Stage:** Store as `PROPOSED` with diff, source evidence, versions, eval results, limitations and rollback steps. A designated authorized owner approves; only an explicitly scoped task can apply a change to a live runtime. Preserve the previous version.
9. **Monitor and revert:** After authorized staging, compare the same metrics and protected controls. Revert when a required metric regresses, evidence is not reproducible, an access boundary weakens, or cost/latency exceeds the approved limit. Record the reason and reopen the issue.
10. **Learn:** Save only generalized workflow lessons to the assigned role memory after review. Store project-wide approved lessons through PMO-04. Keep case-specific facts in the case artifact.

## Candidate metrics

- Invocation/schema/correlation pass rate (plumbing only).
- Specialist deliverable acceptance and independently reviewed outcome rate.
- First-pass completion, revision effectiveness (changed output plus resolved finding), reopen rate, missing-evidence rate, unsupported-claim rate.
- Policy/tool-boundary violations, cross-scope memory leakage, retrieval grounding and citation correctness.
- Cost per accepted task, token use when known, latency, retries and human review burden.

Always report numerator, denominator, time window, test type and confidence. Do not collapse synthetic, model-reviewed, domain-reviewed and human-approved cases into a single “quality score.”

## Output template

`Improvement proposal`: role/canonical contract; observed failure and evidence IDs; reproduction; root-cause candidates with confidence; proposed layer and minimal diff; before/after metrics with sample counts; protected regressions; privacy/safety review; skill/knowledge/memory effect; cost/latency; reviewer decisions; approval state; rollback; remaining limits. Unknowns are explicit.

## Stop and escalate

Stop tool use and escalate when the proposed change needs ungranted access, sensitive data, paid provider use, external side effects, production deployment, permission changes, uncertain deletion/retention, or would weaken a safety/privacy constraint. Never self-approve or turn model confidence into authority.
