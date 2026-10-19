<!-- Wejdan local artifact · task=task_fac5a905-f9b8-4da0-a98c-c704be59acc1 · trace=trace_2f3331aa-591e-471c-8a1f-05cb262089b2 · role=AI-10 · provider=ollama-local · model=qwen3:8b -->

# Tooling and Integration Engineer — Synthetic specialist acceptance artifact

Role: AI-10 · Team: AI · Contract: role.AI-10.v1

## Role output

# Tool Registry and Contract Tests Draft (Role: AI-10)

## Deliverable Overview

This document outlines a **tool registry** and **contract tests** for a fictional local-first personal planning product. The focus is on **narrow tool contracts**, **read/write separation**, **schema validation**, and **implementation of idempotency, timeout, retry, error meaning, audit, and least-privilege grants**. The backend is considered **authoritative for writes**, and the system is designed to be **safe, auditable, and scalable** for a small team's one-week planning exercise.

---

## Tool Registry

| Tool Name | Description | Read/Write Access | Schema Validation | Idempotency | Timeout | Retry | Error Meaning | Audit | Least-Privilege Grants |
|----------|-------------|-------------------|-------------------|------------|---------|-------|----------------|-------|--------------------------|
| `plan.create` | Creates a new planning task | Write | ✅ | ✅ | 5s | 3 | ✅ | ✅ | `user:plan:write` |
| `plan.read` | Reads a planning task | Read | ✅ | ❌ | N/A | N/A | ✅ | ✅ | `user:plan:read` |
| `plan.update` | Updates a planning task | Write | ✅ | ✅ | 5s | 3 | ✅ | ✅ | `user:plan:write` |
| `plan.delete` | Deletes a planning task | Write | ✅ | ✅ | 5s | 3 | ✅ | ✅ | `user:plan:write` |
| `plan.list` | Lists all planning tasks | Read | ✅ | ❌ | N/A | N/A | ✅ | ✅ | `user:plan:read` |
| `plan.audit` | Audits all planning tasks | Read | ✅ | ❌ | N/A | N/A | ✅ | ✅ | `user:plan:audit` |

---

## Contract Tests

### 1. `plan.create` Contract Test

**Input:**
```json
{
  "task": "Prepare for the one-week planning exercise",
  "due_date": "2025-04-01",
  "priority": "high"
}
```

**Expected Output:**
```json
{
  "task_id": "task_12345",
  "status": "created",
  "message": "Task created successfully."
}
```

**Validation:**
- Schema must include `task`, `due_date`, and `priority`.
- If `due_date` is not in ISO 8601 format, return error.
- If `priority` is not one of `high`, `medium`, or `low`, return error.
- If `task_id` already exists, return idempotency response.

---

### 2. `plan.read` Contract Test

**Input:**
```json
{
  "task_id": "task_12345"
}
```

**Expected Output:**
```json
{
  "task_id": "task_12345",
  "task": "Prepare for the one-week planning exercise",
  "due_date": "2025-04-01",
  "priority": "high",
  "status": "active"
}
```

**Validation:**
- Schema must include `task_id`, `task`, `due_date`, `priority`, and `status`.
- If `task_id` does not exist, return error.
- If `task_id` is invalid, return error.

---

### 3. `plan.update` Contract Test

**Input:**
```json
{
  "task_id": "task_12345",
  "task": "Finalize planning exercise",
  "priority": "medium"
}
```

**Expected Output:**
```json
{
  "task_id": "task_12345",
  "status": "updated",
  "message": "Task updated successfully."
}
```

**Validation:**
- Schema must include `task_id`, `task`, and `priority`.
- If `task_id` does not exist, return error.
- If `task_id` is invalid, return error.
- If `priority` is not one of `high`, `medium`, or `low`, return error.

---

### 4. `plan.delete` Contract Test

**Input:**
```json
{
  "task_id": "task_12345"
}
```

**Expected Output:**
```json
{
  "task_id": "task_12345",
  "status": "deleted",
  "message": "Task deleted successfully."
}
```

**Validation:**
- Schema must include `task_id`.
- If `task_id` does not exist, return error.
- If `task_id` is invalid, return error.

---

### 5. `plan.list` Contract Test

**Input:**
```json
{
  "filter": "active"
}
```

**Expected Output:**
```json
{
  "tasks": [
    {
      "task_id": "task_12345",
      "task": "Prepare for the one-week planning exercise",
      "due_date": "2025-04-01",
      "priority": "high",
      "status": "active"
    }
  ]
}
```

**Validation:**
- Schema must include `tasks` array.
- Each task must include `task_id`, `task`, `due_date`, `priority`, and `status`.
- If `filter` is not `active` or `all`, return error.

---

## Evidence and Assumptions

- **Assumption 1:** The planning exercise is a fictional one-week task, and the system is designed for a small team.
- **Assumption 2:** The backend is authoritative for writes, and all read operations are handled by the frontend or client.
- **Assumption 3:** All tools are designed to be idempotent where applicable, and errors are clearly defined.
- **Assumption 4:** Schema validation is enforced for all input and output.
- **Assumption 5:** Audit logs are stored and accessible to users with `user:plan:audit` privileges.
- **Assumption 6:** All tools are designed with least-privilege grants to prevent unauthorized access.

---

## Boundaries and Unknowns

- **Unknown 1:** The exact number of users or team size is not specified.
- **Unknown 2:** The exact structure of the planning exercise is not provided.
- **Unknown 3:** The exact schema for `plan.create` or `plan.update` is not fully defined.
- **Unknown 4:** The exact error messages or audit log format is not provided.
- **Unknown 5:** The exact timeout and retry configurations are not specified.
- **Unknown 6:** The exact data types for `due_date` or `priority` are not defined.
- **Unknown 7:** The exact permissions model for `user:plan:write` or `user:plan:read` is not provided.

## Independent QA-01 review

{
  "verdict": "REVISE",
  "findings": [
    "The `plan.list` tool's contract test assumes a `filter` parameter, but the tool registry does not specify whether this is part of the tool's contract.",
    "The `plan.list` tool's schema validation is not fully defined in the contract test, and the exact data types for `due_date` or `priority` are not specified.",
    "The `plan.list` tool's error handling for invalid `filter` values is not clearly defined in the contract test."
  ],
  "missing_requirements": [
    "Explicit schema definitions for all input and output parameters, including data types and validation rules.",
    "Clear error handling definitions for all tools, including invalid input and missing resources."
  ],
  "evidence_limits": [
    "The `plan.list` tool's contract test and registry entry are incomplete, making it impossible to verify compliance with the role's responsibilities.",
    "The exact error messages, audit log format, and permission model are not provided, limiting the ability to validate the system's safety and integrity."
  ]
}

## Automated acceptance limits

Structural result: FAIL.
Matched expected-output cues: tool, registry, contract, tests, backend, authoritative, writes.
Review parser result: CAPTURED; verdict: REVISE.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.