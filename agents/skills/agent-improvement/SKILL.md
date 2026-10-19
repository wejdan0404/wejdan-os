---
name: agent-improvement
description: Diagnoses role-agent failures from traces and reviewed artifacts, proposes a minimal versioned context, memory, knowledge, instruction, skill, evaluator, or runtime change, creates candidate skills/evals in the isolated proposal space, and validates with local synthetic regression cases. Use for agent quality audits and improvement work.
---

# Agent improvement

Follow `../../governance/IMPROVEMENT_LOOP.md` and `../../README.md`.

1. Start from a failing or drifting case with task and trace IDs. Read the canonical contract and reviewer/evaluator record.
2. Reproduce the finding from sanitized source artifacts. State what the record proves and what it does not prove.
3. Locate the failure before changing anything: task, context, memory, knowledge/retrieval, prompt/skill, model, tool contract, orchestration or evaluator.
4. Propose the smallest change in one primary layer. Preserve the failing case and acceptance criteria. Add a candidate skill only with evidence from at least two independent cases or one documented high-risk mandatory process; otherwise improve task guidance, an existing skill or an eval.
5. Compare baseline and candidate on the failed case, role-specific regressions and safety/privacy controls. Report sample counts and keep unknown metrics null.
6. Save the change under `agents/proposals/<proposal-id>/`. You may create a candidate `skills/<name>/SKILL.md` and synthetic eval/regression files there, then run only explicitly scoped local checks. Never write to live `agents/skills/`, role cards, registry, contracts, approved knowledge/memory or runtime.
7. Include exact diff, source evidence, regression results, limitations, independent reviewers, approval state and rollback. Keep the candidate `PROPOSED`; do not promote, activate, or approve it yourself.

## Daily portfolio review

- AI-01 runs `node ops/local-live/runtime/run-daily-agent-review.mjs` daily and after any recorded rejection/regression. The report is read-only and contains metadata, role/task/trace IDs, hashes, pass counts and gate status; do not add raw operational task content or personal data.
- Inspect all 85 role rows, their skill/context/knowledge refs, current acceptance evidence and the latest candidate evaluation. Compare with recent daily reports and preserve unresolved failures.
- The 850-case synthetic suite is for candidate-change evaluation: run `node ops/local-live/runtime/run-agent-eval-suite.mjs --execute` only when evaluating a candidate or preparing the full release gate. It performs local Ollama calls and model-generated reviewer checks, never paid provider calls.
- A blocked gate results in a diagnosis and isolated `PROPOSED` report/diff. No live skill, role card, registry, runtime, memory approval or activation changes without the separate owner-approved promotion task.
