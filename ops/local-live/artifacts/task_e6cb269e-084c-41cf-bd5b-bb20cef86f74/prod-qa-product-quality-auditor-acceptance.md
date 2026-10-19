<!-- Wejdan local artifact · task=task_e6cb269e-084c-41cf-bd5b-bb20cef86f74 · trace=trace_93f8aa36-13bb-4fd3-bdb6-bca630386ea2 · role=PROD-QA · provider=ollama-local · model=qwen3:8b -->

# Product Quality Auditor — Synthetic specialist acceptance artifact

Role: PROD-QA · Team: PROD · Contract: role.PROD-QA.v1

## Role output

```markdown
# Product Quality Audit Findings Draft

## Feature Overview
The feature under review is a fictional one-week personal planning exercise designed for a local-first personal planning product. The goal is to help users structure their week by setting goals, scheduling tasks, and tracking progress.

## Findings

### Evidence-to-Problem Link
- The planning exercise is intended to solve the problem of poor time management and lack of structured planning.
- The evidence provided includes a brief description of the exercise and its intended purpose, but no user data or usage metrics are available to confirm the problem exists or is being addressed effectively.

### Measurable Outcome
- The feature is expected to improve user productivity and task completion rates.
- However, no measurable outcome or KPI is defined. For example, there is no mention of how success will be measured (e.g., increased task completion, reduced procrastination, etc.).

### Coherent Scope
- The scope of the feature is limited to a one-week planning exercise, which is coherent with the product's local-first focus.
- However, the scope is not clearly defined in terms of user roles, use cases, or integration with other features.

### Edge Cases
- Edge cases such as users who are not able to commit to a one-week plan, users who may need more flexibility, or users who may need to adjust their plans mid-week are not addressed.
- The feature does not account for potential interruptions or changes in user priorities.

### Truthful Claims
- The feature claims to help users "structure their week" and "improve productivity," but these claims are not supported by evidence or user data.
- There is no mention of user feedback, testing, or validation of these claims.

## Evidence and Assumptions

| Item | Evidence | Assumption |
|------|----------|------------|
| Problem Statement | None | The problem of poor time management is assumed to exist based on common user feedback. |
| Measurable Outcome | None | The outcome of improved productivity is assumed to be the intended result. |
| Scope | Description of the one-week planning exercise | The scope is assumed to be limited to the described feature. |
| Edge Cases | None | Edge cases are assumed to be potential issues that need to be addressed. |
| Truthful Claims | None | Claims are assumed to be truthful based on the feature description. |

## Boundaries and Unknowns

- **User Data**: No user data is available to validate the problem or the effectiveness of the feature.
- **Testing**: No test or validation process has been described or executed.
- **User Feedback**: No user feedback is provided to support the feature's value or usability.
- **Integration**: No information is provided about how this feature integrates with other features or the broader product ecosystem.
- **Scalability**: No information is provided about how the feature scales with more users or longer planning periods.

## Conclusion
This feature brief lacks evidence, measurable outcomes, and a defined scope. It also does not address edge cases or provide truthful claims with supporting data. The feature requires further testing, validation, and user feedback before it can be considered for development.

**Draft Status**: This is a draft audit finding and does not represent approval or endorsement of the feature.
```

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [
    "The planning exercise is intended to solve the problem of poor time management and lack of structured planning, but no user data or usage metrics are available to confirm the problem exists or is being addressed effectively.",
    "The feature is expected to improve user productivity and task completion rates, but no measurable outcome or KPI is defined.",
    "The scope of the feature is limited to a one-week planning exercise, which is coherent with the product's local-first focus, but the scope is not clearly defined in terms of user roles, use cases, or integration with other features.",
    "Edge cases such as users who are not able to commit to a one-week plan, users who may need more flexibility, or users who may need to adjust their plans mid-week are not addressed.",
    "The feature claims to help users 'structure their week' and 'improve productivity,' but these claims are not supported by evidence or user data.",
    "There is no mention of user feedback, testing, or validation of these claims."
  ],
  "missing_requirements": [],
  "evidence_limits": [
    "No user data is available to validate the problem or the effectiveness of the feature.",
    "No test or validation process has been described or executed.",
    "No user feedback is provided to support the feature's value or usability.",
    "No information is provided about how this feature integrates with other features or the broader product ecosystem.",
    "No information is provided about how the feature scales with more users or longer planning periods."
  ]
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: findings, feature.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.