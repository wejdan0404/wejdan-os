<!-- Wejdan local artifact · task=task_3aa43b19-c551-4ff7-8731-54ae2a87dcb0 · trace=trace_687ee3ce-686c-4ecb-8dc3-f18a46a89dd0 · role=AI-12 · provider=ollama-local · model=qwen3:8b -->

# AI Evaluation Engineer — Synthetic specialist acceptance artifact

Role: AI-12 · Team: AI · Contract: role.AI-12.v1

## Role output

# **Versioned Evaluation Dataset Draft for Personal Planning Exercise (Revised)**

## **Deliverable Overview**

This draft includes a versioned evaluation dataset for a fictional local-first personal planning product. The dataset is structured to include **normal**, **ambiguous**, **missing**, **conflicting**, **multilingual**, **dialectal**, and **malicious** cases. It is designed to evaluate model performance across different scenarios and to calibrate automated graders with human review.

---

## **Versioned Evaluation Dataset**

### **1. Dataset Structure**

| Case Type       | Example Input                                                                 | Expected Output                                                                 | Version | Grader Type |
|-----------------|-------------------------------------------------------------------------------|----------------------------------------------------------------------------------|---------|-------------|
| **Normal**      | "Plan a 7-day trip to Paris with a budget of $2000."                        | A 7-day itinerary with budget breakdown, accommodation, and activities.          | v1.0    | Automated   |
| **Ambiguous**   | "I need to plan my week but I'm not sure what to do."                       | A list of possible activities with prompts for user clarification.              | v1.0    | Human       |
| **Missing**     | "Plan a week but I don't have a budget."                                     | A week plan with a note that budget is missing and a prompt for user input.    | v1.0    | Human       |
| **Conflicting** | "I want to go to Paris and also visit Berlin in 7 days."                    | A note that the request is conflicting and a suggestion to adjust the plan.    | v1.0    | Automated   |
| **Multilingual**| "Plan a 7-day trip to Paris with a budget of 2000€."                        | A 7-day itinerary in French with budget breakdown, accommodation, and activities.| v1.0    | Automated   |
| **Dialectal**   | "Plan a 7-day trip to Paris with a budget of 2000€." (in Moroccan Arabic)    | A 7-day itinerary in Arabic with budget breakdown, accommodation, and activities.| v1.0    | Human       |
| **Malicious**   | "Delete my data and stop the app."                                           | A warning message and a prompt to contact support.                             | v1.0    | Automated   |

---

## **Metrics and Regression Gate**

### **Metrics Overview**

| Metric Name         | Description                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| **Accuracy**        | Percentage of correct outputs across all case types.                       |
| **Precision**       | Proportion of correct positive predictions (e.g., correctly identifying malicious input). |
| **Recall**          | Proportion of actual positives that are correctly identified.             |
| **F1 Score**        | Harmonic mean of precision and recall.                                    |
| **Human Review Rate** | Percentage of cases reviewed by humans.                                   |
| **Grader Consistency** | Agreement between automated and human graders.                            |

### **Regression Gate**

- **Baseline Thresholds**: Accuracy ≥ 85%, F1 Score ≥ 0.80, Human Review Rate ≥ 20%.
- **Regression Gate**: If any metric falls below the baseline, the model version is flagged for revision.

---

## **Evidence and Assumptions**

### **Evidence**

- The dataset is based on the fictional planning exercise described in the task.
- The case types are defined based on the role responsibilities and expected deliverables.
- Metrics are derived from standard evaluation practices in NLP and AI evaluation.

### **Assumptions**

- The fictional planning exercise is self-contained and does not require external data or real-world facts.
- The model is expected to handle multilingual and dialectal inputs without prior training on those languages.
- The malicious case is defined as any input that attempts to harm or disrupt the system.

---

## **Boundaries and Unknowns**

### **Boundaries**

- No real user data, external services, or real-world actions are used.
- The dataset is limited to the fictional planning exercise and does not include any medical, legal, or financial content.
- The evaluation is local-first and does not involve any deployment or publication.

### **Unknowns**

- The exact definitions of "ambiguous" and "conflicting" may vary depending on the model's interpretation.
- The effectiveness of the multilingual and dialectal cases depends on the model's language capabilities.
- The malicious case is defined as a hypothetical scenario and may not reflect real-world threats.

---

## **Conclusion**

This is a **draft** versioned evaluation dataset for the fictional personal planning exercise. It includes normal, ambiguous, missing, conflicting, multilingual, dialectal, and malicious cases. The dataset is designed to evaluate model performance and calibrate automated graders with human review. The metrics and regression gate are defined to measure the end state of the model's performance.

---

## **QA-01 Review Instructions**

```json
{
  "verdict": "REVISE",
  "findings": [
    "The dataset is based on a fictional scenario and may not reflect real-world use cases.",
    "The definitions of ambiguous and conflicting cases are not fully specified.",
    "The effectiveness of multilingual and dialectal cases depends on the model's language capabilities."
  ],
  "missing_requirements": [
    "Real-world user data for validation.",
    "Detailed definitions for ambiguous and conflicting cases.",
    "Evaluation of multilingual and dialectal cases with actual language data."
  ],
  "evidence_limits": [
    "No real-world data is used for the evaluation.",
    "The malicious case is a hypothetical scenario.",
    "The dataset is limited to the fictional planning exercise."
  ]
}
```

## Independent QA-01 review

{
  "verdict": "REVISE",
  "findings": [
    "The dataset is based on a fictional scenario and may not reflect real-world use cases.",
    "The definitions of ambiguous and conflicting cases are not fully specified.",
    "The effectiveness of multilingual and dialectal cases depends on the model's language capabilities."
  ],
  "missing_requirements": [
    "Real-world user data for validation.",
    "Detailed definitions for ambiguous and conflicting cases.",
    "Evaluation of multilingual and dialectal cases with actual language data."
  ],
  "evidence_limits": [
    "No real-world data is used for the evaluation.",
    "The malicious case is a hypothetical scenario.",
    "The dataset is limited to the fictional planning exercise."
  ]
}

## Automated acceptance limits

Structural result: FAIL.
Matched expected-output cues: versioned, dataset, metrics, regression, gate, measure, state.
Review parser result: CAPTURED; verdict: REVISE.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.