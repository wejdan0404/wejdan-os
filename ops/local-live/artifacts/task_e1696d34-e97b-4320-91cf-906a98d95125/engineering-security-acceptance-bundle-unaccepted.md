<!-- Wejdan local artifact · task=task_e1696d34-e97b-4320-91cf-906a98d95125 · trace=trace_908a4749-e367-4cd7-b273-70082ad13100 · role=BE-02 · provider=ollama-local · model=qwen3:8b -->

# Synthetic local task export endpoint design and threat review — unaccepted draft

Task: task_e1696d34-e97b-4320-91cf-906a98d95125
Trace: trace_908a4749-e367-4cd7-b273-70082ad13100
Provider/model: Ollama local / qwen3:8b
Review verdict: PASS

## Consolidated bounded revision — Threat Modeler

## **Security/Runtime Report: Synthetic Local Task Export Endpoint Design and Threat Review**

**Task ID:** task_e1696d34-e97b-4320-91cf-906a98d95125  
**Trace ID:** trace_908a4749-e367-4cd7-b273-70082ad13100  
**Role ID:** SEC-02  

---

### **Endpoint Overview**

The endpoint `GET /api/tasks/{task_id}/export` returns a synthetic local-task-export.v1 artifact containing task metadata, steps, memory, and approvals. It is bound to `127.0.0.1:8766`, and CORS is configured to allow `http://127.0.0.1:8765`. No user authentication, route-level RBAC, or external data access is implemented. The endpoint is synthetic, local, and not production-deployed.

---

### **Security/Runtime Controls and Checks**

1. **Schema/Identity Check**: Ensures the returned JSON conforms to the expected schema and includes identity fields like `task_id` and `trace_id`.  
2. **Exact Step Task+Trace Correlation**: Validates that steps are correlated with the correct task and trace.  
3. **Memory Trace/Source-Step Scope**: Ensures memory data is scoped to the trace and source step, not exposing broader context.  
4. **Approvals Task Scope**: Confirms approvals are scoped to the task, not including external or unrelated entities.  
5. **Raw Result JSON Internal Duplicate Exclusion**: Prevents internal duplicates in `result_json` while returning parsed `task.result`.  
6. **Unknown ID 404**: Ensures invalid task IDs return a 404 response.  
7. **POST 404**: Prevents unintended POST requests to the endpoint.

---

### **Runtime Response Hash**

The verified runtime response for the synthetic task `task_87cc1e0c-f999-4486-9bee-500d22f2c843` and trace `trace_c0822c7d-fc24-4d77-9f6f-c88559b5d35b` has a SHA-256 hash of:  
`6a1096364ec3bb8e8d5a3989f5584d545e4cea4552a56a80b41136c84a3d0211`.

---

### **Residual Risks and Owner Decisions**

- **Local Access Only**: The endpoint is accessible only by local processes, which may include untrusted internal services. No mechanism exists to restrict access to specific processes or containers.  
- **No Correlation ID**: The absence of a `correlation_id` field may lead to ambiguity in tracing and debugging, especially in distributed systems.  
- **CORS Allowlist Misuse**: While CORS is configured to allow `http://127.0.0.1:8765`, this does not constitute authorization. No mechanism exists to enforce access control via CORS.  
- **No User Authentication/Authorization**: The endpoint is not protected against unauthorized access, a critical risk in any production system.  
- **Synthetic Data Isolation**: The synthetic data lifecycle is strictly local, created as a single SQLite task, retrieved by exact task ID, and not merged with other tasks or real records. This ensures data isolation but limits scalability and integration.  
- **No External Data Access**: The endpoint does not access external systems, databases, or user data, reducing the attack surface but limiting functionality.

---

### **Threat Model Summary**

**Assets:**  
- The endpoint `GET /api/tasks/{task_id}/export` and its associated synthetic data (task metadata, steps, memory, approvals).

**Data Flow:**  
- **Input:** Synthetic task ID and trace ID via HTTP GET.  
- **Processing:** The endpoint retrieves a local SQLite task by exact task ID, validates correlation with trace ID, and returns a structured export artifact.  
- **Output:** Local-task-export.v1 artifact (JSON) with task, steps, memory, and approvals.

**Trust Boundaries:**  
- **Internal Trust:** The endpoint is bound to `127.0.0.1:8766`, and CORS is configured to allow `http://127.0.0.1:8765`.  
- **External Trust:** No external trust is established; CORS is not used for authorization.  
- **Local Trust:** Only local processes can access the endpoint.

**Attackers:**  
- **Local Process:** Can access the endpoint if it runs on the same machine.  
- **Untrusted Local Process:** Could potentially access the endpoint if it is not properly sandboxed.  
- **Internal User (Unauthenticated):** Can access the endpoint if it is not protected by authentication or RBAC.

**Abuse Cases:**  
- **Data Exposure:** Unauthorized local processes could access sensitive synthetic data.  
- **Data Tampering:** Local processes could modify or inject data into the export artifact.  
- **Denial of Service (DoS):** High volume of requests could exhaust system resources.  
- **Information Disclosure:** Exposing internal structures (e.g., `result_json`) could reveal implementation details.

**Control Owners:**  
- **Data Access Control:** Owned by the API/Contract Engineer.  
- **Data Validation:** Owned by the API/Contract Engineer.  
- **CORS Configuration:** Owned by the API/Contract Engineer.  
- **Local Process Isolation:** Owned by the System Security Engineer.

---

### **Final Summary**

This synthetic local task export endpoint is designed for internal use only and is not production-deployed. It is bound to a local IP and does not support user authentication or RBAC. While it includes seven verified runtime checks, the lack of access control and isolation mechanisms presents residual risks. The endpoint is intended for synthetic testing and should not be used for real data or external access.

## Reviewer feedback
{
  "verdict": "PASS",
  "findings": [
    "The revised deliverable accurately reflects the synthetic, local, and non-production nature of the endpoint.",
    "All seven runtime checks (schema/identity, exact step correlation, memory scope, approvals scope, result JSON handling, 404 for unknown IDs, and POST 404) are explicitly detailed and verified.",
    "The absence of user authentication, RBAC, and external data access is clearly stated and not misrepresented as implemented.",
    "The CORS allowlist is correctly noted as not being authorization, and no external users are claimed to be blocked by CORS.",
    "The synthetic data lifecycle is accurately described as being created, retrieved by exact task ID, and not merged with other tasks or real records.",
    "The report does not use `correlation_id` or imply that human approval or deployment has occurred.",
    "The report includes all required controls, checks, residual risks, and owner decisions as per the original request."
  ],
  "missing_requirements": [],
  "evidence_limits": [
    "The report does not claim to have executed any real-world tests or deployed any real systems.",
    "No real records, external calls, code deployment, credentials, or shell execution are referenced.",
    "The synthetic data and test environment are clearly distinguished from production systems."
  ]
}

## Acceptance state
FAILED/BLOCKED: SCENARIO_DETERMINISTIC_TRUTH_CHECK_FAILED:The existing task export route has no user-level RBAC; do not claim authorization that was not implemented.
This draft is preserved for inspection and is not accepted, approved, deployed, or a factual/professional certification.