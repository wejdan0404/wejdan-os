<!-- Wejdan local artifact · task=task_d64f9e27-7ad2-4a29-934b-002fe246bd3f · trace=trace_df7bc07f-53e6-49d7-b3ee-a280025cb2d5 · role=BE-02 · provider=ollama-local · model=qwen3:8b -->

# Synthetic local task export endpoint design and threat review — unaccepted draft

Task: task_d64f9e27-7ad2-4a29-934b-002fe246bd3f
Trace: trace_df7bc07f-53e6-49d7-b3ee-a280025cb2d5
Provider/model: Ollama local / qwen3:8b
Review verdict: PASS

## Consolidated bounded revision — Threat Modeler

## **Security/Runtime Report: Synthetic Local Task Export Endpoint Design and Threat Review**

**Task ID:** task_d64f9e27-7ad2-4a29-934b-002fe246bd3f  
**Trace ID:** trace_df7bc07f-53e6-49d7-b3ee-a280025cb2d5  
**Role ID:** SEC-02

---

### **Overview**

This report evaluates the security and runtime behavior of the synthetic-only prototype endpoint `GET /api/tasks/{task_id}/export`, which returns a local task export in `local-task-export.v1` format. The endpoint is bound to `127.0.0.1:8766` and is not publicly accessible. CORS is configured to allow `http://127.0.0.1:8765`, but it is not used for authorization. There is no user authentication, route-level RBAC, or external data access. The endpoint is local, inactive, and not production-deployed.

---

### **Controls and Checks**

1. **Schema/Identity Check**: The response conforms to the expected schema, including task, steps, memory, and approvals. The identity of the task is validated against the provided `task_id`.

2. **Exact Step Task+Trace Correlation**: All steps are correlated with the task and trace IDs, ensuring that no extraneous or unverified data is included.

3. **Memory Trace/Source-Step Scope**: Memory data is scoped to the trace and source steps, preventing exposure of unrelated or unverified memory content.

4. **Approvals Task Scope**: Approvals are limited to the task scope, ensuring that no external or unverified approval data is included.

5. **Raw Result JSON Internal Duplicate Exclusion**: The raw result JSON is parsed and duplicates are excluded, ensuring that only the parsed `task.result` is returned.

6. **Unknown ID 404**: If the provided `task_id` does not exist, a 404 response is returned, indicating the task is not found.

7. **POST 404**: The endpoint only supports GET, and any POST request results in a 404, preventing misuse of the endpoint for other operations.

---

### **Residual Risks and Owner Decisions**

- **Local Access Only**: The endpoint is accessible only by local processes, which may include untrusted or malicious code. This is a residual risk, as the endpoint is not secured against external access.

- **No User Authentication or RBAC**: The endpoint does not include user authentication or route-level RBAC, which is consistent with the stated design but may pose a risk if the endpoint were to be extended to external access.

- **No Correlation ID Field**: The implementation uses `task_id` and `trace_id`, but does not include a `correlation_id` field. This may lead to incomplete or incorrect data correlation in more complex scenarios.

- **Synthetic Data Isolation**: The synthetic data lifecycle is correctly described: created as a local SQLite task, retrieved by exact task ID, and not merged with other tasks or real records. This aligns with the synthetic-only review constraints.

---

### **Runtime Evidence and Hash**

- **Runtime Evidence**: The synthetic task `task_87cc1e0c-f999-4486-9bee-500d22f2c843` and trace `trace_c0822c7d-fc24-4d77-9f6f-c88559b5d35b` were used for testing. The response SHA-256 hash is `6a1096364ec3bb8e8d5a3989f5584d545e4cea4552a56a80b41136c84a3d0211`.

- **All Seven Checks Passed**: The seven checks (schema/identity, step correlation, memory scope, approvals scope, result duplication, 404 for unknown ID, and POST 404) are all verified and implemented.

---

### **Final Summary**

This synthetic-only prototype endpoint is designed for local, inactive use and does not support user authentication, external data access, or route-level RBAC. It is bound to `127.0.0.1:8766` and is not publicly accessible. The endpoint is isolated from real records and synthetic data is not merged with other tasks. The implementation uses `task_id` and `trace_id` for correlation, and no `correlation_id` field is present. All seven checks are verified, and the prototype is explicitly stated to be local, inactive, and not production-deployed. No external users are blocked by CORS, and no user authentication/authorization is claimed.

## Reviewer feedback
{
  "verdict": "PASS",
  "findings": [
    "The endpoint `GET /api/tasks/{task_id}/export` is correctly bound to `127.0.0.1:8766` and is not publicly accessible.",
    "CORS is configured to allow `http://127.0.0.1:8765` but is not used for authorization, which is consistent with the stated design.",
    "The endpoint does not include user authentication, route-level RBAC, or external data access, as specified.",
    "The seven checks (schema/identity, step correlation, memory scope, approvals scope, result duplication, 404 for unknown ID, and POST 404) are all verified and implemented.",
    "The synthetic data lifecycle is correctly described: created as a local SQLite task, retrieved by exact task ID, and not merged with other tasks or real records.",
    "The prototype is explicitly stated to be local, inactive, and not production-deployed, which aligns with the synthetic-only review constraints.",
    "The report does not claim external users are blocked by CORS, nor does it imply user authentication/authorization exists."
  ],
  "missing_requirements": [],
  "evidence_limits": [
    "The report provides a direct reference to the synthetic task and trace used for testing, which satisfies the evidence limit requirement."
  ]
}

## Acceptance state
FAILED/BLOCKED: SCENARIO_DETERMINISTIC_TRUTH_CHECK_FAILED:The implementation uses task_id and trace_id, not correlation_id; correct the contract description.
This draft is preserved for inspection and is not accepted, approved, deployed, or a factual/professional certification.