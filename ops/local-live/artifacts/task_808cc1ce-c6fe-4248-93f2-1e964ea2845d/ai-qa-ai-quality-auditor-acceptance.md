<!-- Wejdan local artifact · task=task_808cc1ce-c6fe-4248-93f2-1e964ea2845d · trace=trace_cde02c80-9f23-44fd-8051-b20fcc815425 · role=AI-QA · provider=ollama-local · model=qwen3:8b -->

# AI Quality Auditor — Synthetic specialist acceptance artifact

Role: AI-QA · Team: AI · Contract: role.AI-QA.v1

## Role output

```markdown
# AI-QA Draft Decision: Task ID: task_808cc1ce-c6fe-4248-93f2-1e964ea2845d

## Deliverable: QA Decision

**Verdict:** REVISE  
**Findings:**  
- The candidate output includes unsupported claims such as "the user confirmed a $2,000 budget" and "90% of users prefer this" without any evidence or data provided.  
- These claims are not aligned with the synthetic local evaluation task, which explicitly prohibits inventing user facts, research, or evidence.  
- The output appears to simulate real-world data and user behavior, which is not allowed in a synthetic, privacy-compliant evaluation.  

**Missing Requirements:**  
- The candidate output must not invent user facts, research, or evidence.  
- All claims must be based on the provided synthetic data or marked as unknown/pending.  
- The output must not simulate real-world behavior or user confirmation without explicit approval.  

## Evidence and Assumptions

- The synthetic evaluation task does not provide any user facts, budgets, or user preferences.  
- The candidate output invents user confirmation and user preference data, which is not allowed under the synthetic evaluation rules.  
- The AI-QA role must ensure that all outputs are based on the provided synthetic data or marked as unknown.  
- The AI-QA role must not simulate real-world behavior or user confirmation without explicit approval.  

## Boundaries and Unknowns

- The synthetic evaluation task does not provide any user facts, budgets, or user preferences.  
- The AI-QA role must not invent user facts, research, or evidence.  
- The AI-QA role must not simulate real-world behavior or user confirmation without explicit approval.  
- The AI-QA role must ensure that all outputs are based on the provided synthetic data or marked as unknown.  

## Conclusion

The candidate output violates the synthetic evaluation rules by inventing user facts and user preferences. The AI-QA role must revise the output to ensure that all claims are based on the provided synthetic data or marked as unknown. The output must not simulate real-world behavior or user confirmation without explicit approval. The AI-QA role must ensure that all outputs are based on the provided synthetic data or marked as unknown.
```

## Independent QA-01 review

{
  "verdict": "REVISE",
  "findings": [
    "The candidate output includes unsupported claims such as 'the user confirmed a $2,000 budget' and '90% of users prefer this' without any evidence or data provided.",
    "These claims are not aligned with the synthetic local evaluation task, which explicitly prohibits inventing user facts, research, or evidence.",
    "The output appears to simulate real-world data and user behavior, which is not allowed in a synthetic, privacy-compliant evaluation."
  ],
  "missing_requirements": [
    "The candidate output must not invent user facts, research, or evidence.",
    "All claims must be based on the provided synthetic data or marked as unknown/pending.",
    "The output must not simulate real-world behavior or user confirmation without explicit approval."
  ],
  "evidence_limits": [
    "The synthetic evaluation task does not provide any user facts, budgets, or user preferences.",
    "The AI-QA role must ensure that all outputs are based on the provided synthetic data or marked as unknown.",
    "The AI-QA role must not simulate real-world behavior or user confirmation without explicit approval."
  ]
}

## Automated acceptance limits

Structural result: FAIL.
Matched expected-output cues: decision.
Review parser result: CAPTURED; verdict: REVISE.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.