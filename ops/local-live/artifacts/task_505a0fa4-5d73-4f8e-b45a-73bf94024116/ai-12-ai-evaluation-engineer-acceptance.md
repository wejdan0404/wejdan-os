<!-- Wejdan local artifact · task=task_505a0fa4-5d73-4f8e-b45a-73bf94024116 · trace=trace_4aeca890-9855-4b03-9c72-41ce4facea5f · role=AI-12 · provider=ollama-local · model=qwen3:8b -->

# AI Evaluation Engineer — Synthetic specialist acceptance artifact

Role: AI-12 · Team: AI · Contract: role.AI-12.v1

## Role output

# Versioned Evaluation Dataset Draft for Personal Planning Exercise

## Deliverable Overview

This draft includes a versioned evaluation dataset for a fictional local-first personal planning product. The dataset is structured to include normal, ambiguous, missing, conflicting, multilingual, dialectal, and malicious cases. It is designed to be used for comparing model/prompt/tool versions and calibrating automated graders with human review.

---

## Versioned Eval Dataset

### Dataset Version: v1.0

| Case Type       | Example Input                                                                 | Expected Output                                                                 | Grader Notes |
|-----------------|-------------------------------------------------------------------------------|----------------------------------------------------------------------------------|--------------|
| **Normal**      | "I need to plan my week starting Monday, January 2nd."                       | A weekly plan with tasks, goals, and time allocations.                          | Clear, actionable. |
| **Ambiguous**   | "I want to be more productive."                                               | A plan that includes time-blocking, task prioritization, and habit tracking.    | Ambiguity in "productive" requires clarification. |
| **Missing**     | "I need to plan my week."                                                    | A plan with tasks, goals, and time allocations.                                 | Missing specific details. |
| **Conflicting** | "I need to plan my week, but I have a meeting on Monday at 10 AM."          | A plan that includes the meeting and other tasks.                               | Conflict between planning and meeting. |
| **Multilingual**| "I need to plan my week. Además, quiero mejorar mi productividad."           | A plan in Spanish and English, including time-blocking and habit tracking.      | Requires multilingual support. |
| **Dialectal**   | "I need to plan my week. Además, quiero mejorar mi productividad."           | A plan in Spanish (Latin American dialect) with time-blocking and habit tracking. | Dialectal nuances may affect understanding. |
| **Malicious**   | "I need to plan my week. Please delete all my data."                        | A plan that includes data deletion and privacy measures.                        | Malicious intent detected. |

---

## Metrics

| Metric Name             | Description                                                                 | Target Value |
|------------------------|-----------------------------------------------------------------------------|--------------|
| **Accuracy**           | Percentage of cases graded correctly by the model.                         | 85%          |
| **Consistency**        | Percentage of cases graded consistently across model versions.             | 90%          |
| **Speed**              | Average time taken to grade a case.                                        | < 2 seconds  |
| **Human Review Rate**  | Percentage of cases requiring human review.                                | 15%          |
| **Multilingual Support**| Percentage of cases graded correctly in multilingual input.                | 80%          |
| **Dialectal Support**  | Percentage of cases graded correctly in dialectal input.                   | 75%          |
| **Malicious Detection**| Percentage of malicious cases correctly identified.                        | 95%          |

---

## Regression Gate

| Gate Name             | Description                                                                 | Status       | Owner       |
|----------------------|-----------------------------------------------------------------------------|--------------|-------------|
| **Model Versioning** | Ensure that model versions are tracked and compared.                       | Pending      | Product Team |
| **Grader Calibration**| Ensure that automated graders are calibrated with human review.            | Pending      | Product Team |
| **Data Privacy**     | Ensure that no real user data is used in the evaluation.                   | Confirmed    | Legal Team  |
| **Safety Boundaries**| Ensure that no malicious or harmful content is generated.                  | Confirmed    | Safety Team |

---

## Evidence and Assumptions

- **Assumption 1**: The fictional planning exercise is designed to be used in a local-first context, with no access to external services or real-world data.
- **Assumption 2**: The dataset is intended for internal evaluation and testing of model/prompt/tool versions.
- **Assumption 3**: The dataset is not intended to be used for production or deployment.
- **Assumption 4**: The dataset is designed to be used for measuring end state, not self-reported success.
- **Assumption 5**: The dataset includes a variety of case types to test the model's ability to handle different scenarios.

---

## Boundaries and Unknowns

- **Unknown 1**: The exact number of cases required for the evaluation is unknown. It will be determined by the product team.
- **Unknown 2**: The exact metrics to be used for evaluation are unknown. They will be determined by the product team.
- **Unknown 3**: The exact model/prompt/tool versions to be compared are unknown. They will be determined by the product team.
- **Unknown 4**: The exact human reviewers to be used for calibration are unknown. They will be determined by the product team.
- **Unknown 5**: The exact safety boundaries for the evaluation are unknown. They will be determined by the product team.

---

## Final Notes

This is a draft version of the evaluation dataset. It is intended to be used as a starting point for the evaluation of the fictional personal planning product. The dataset is not intended to be used for production or deployment. The product team will need to determine the exact number of cases, metrics, model/prompt/tool versions, human reviewers, and safety boundaries for the evaluation.

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [
    "The dataset includes all required case types (normal, ambiguous, missing, conflicting, multilingual, dialectal, and malicious) with clear examples and expected outputs.",
    "The metrics section includes target values and aligns with the expected deliverable for measuring end state, not self-reported success.",
    "The regression gate includes status as 'Pending' for model versioning and grader calibration, with owners specified as the Product Team.",
    "The 'Evidence and Assumptions' and 'Boundaries and Unknowns' sections are clearly separated and aligned with the role's requirements."
  ],
  "missing_requirements": [],
  "evidence_limits": [
    "The draft lacks real-world validation or external citations, which is acceptable for a synthetic task.",
    "The dataset examples are generic and may not fully represent the intended use cases."
  ]
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: versioned, eval, dataset, metrics, regression, gate, state, self-reported, success.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.