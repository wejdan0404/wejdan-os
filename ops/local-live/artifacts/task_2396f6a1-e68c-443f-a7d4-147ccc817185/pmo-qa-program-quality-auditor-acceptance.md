<!-- Wejdan local artifact · task=task_2396f6a1-e68c-443f-a7d4-147ccc817185 · trace=trace_5479c641-0d24-4a8a-93a6-4abe177d1799 · role=PMO-QA · provider=ollama-local · model=qwen3:8b -->

# Program Quality Auditor — Synthetic specialist acceptance artifact

Role: PMO-QA · Team: PMO · Contract: role.PMO-QA.v1

## Role output

```markdown
# PMO-QA Draft QA Result for Task ID: task_2396f6a1-e68c-443f-a7d4-147ccc817185

## Deliverable Summary
The task packet for Task ID `task_2396f6a1-e68c-443f-a7d4-147ccc817185` has been reviewed as part of the Program Quality Auditor (PMO-QA) role. The task appears to be a fictional local-first personal planning exercise. The following findings, missing requirements, and evidence limitations have been identified.

## Findings
- The task lacks clear acceptance criteria, which is a mandatory requirement for task completion.
- There is no evidence of task completion, despite the status indicating "Completed."
- The task does not specify any ownership or decision-maker for the task, which is a critical requirement for accountability.
- No evidence of tool usage or external system interaction has been provided, which is required for any task involving external systems or tools.

## Missing Requirements
- Acceptance criteria for the task must be defined and verified.
- Evidence of task completion must be provided.
- Ownership and decision-maker for the task must be identified.
- Tool usage or external system interaction must be documented and approved.

## Evidence and Assumptions
- The task is part of a fictional local-first personal planning product team's one-week planning exercise.
- The task status is "Completed," but no evidence of completion has been provided.
- The task lacks any defined acceptance criteria, which is a standard requirement for task completion.
- The task does not specify any ownership or decision-maker, which is necessary for accountability.
- No tools or external systems have been used, but this is not explicitly stated in the task packet.

## Boundaries and Unknowns
- The exact nature of the planning exercise is not defined, and any domain-specific facts not provided are considered unknown.
- The task does not include any user facts, budgets, cost amounts, staffing availability, or legal findings.
- The task does not include any evidence of tool usage, test execution, purchases, publication, deployment, or completed file actions.
- The task does not include any human sign-off or approval, which is required for any task involving external systems or tools.

## Status
This task is marked as **REJECT** due to the lack of acceptance criteria, evidence of completion, and ownership.

## Draft Note
This is a draft QA result and does not imply approval. Further verification and clarification are required before the task can be considered complete.
```

## Independent QA-01 review

{
  "verdict": "REJECT",
  "findings": [
    "The task lacks clear acceptance criteria, which is a mandatory requirement for task completion.",
    "There is no evidence of task completion, despite the status indicating 'Completed.'",
    "The task does not specify any ownership or decision-maker for the task, which is a critical requirement for accountability.",
    "No evidence of tool usage or external system interaction has been provided, which is required for any task involving external systems or tools."
  ],
  "missing_requirements": [
    "Acceptance criteria for the task must be defined and verified.",
    "Evidence of task completion must be provided.",
    "Ownership and decision-maker for the task must be identified.",
    "Tool usage or external system interaction must be documented and approved."
  ],
  "evidence_limits": [
    "No evidence of tool usage or external system interaction has been provided.",
    "No evidence of task completion has been provided despite the status indicating 'Completed.'",
    "No ownership or decision-maker has been identified for the task."
  ]
}

## Automated acceptance limits

Structural result: FAIL.
Matched expected-output cues: result.
Review parser result: CAPTURED; verdict: REJECT.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.