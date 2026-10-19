<!-- Wejdan local artifact · task=task_04e5e9a8-7922-4ed2-b9f9-2339d45b5c75 · trace=trace_8793be2a-ce8d-4422-a853-74c34596a1d1 · role=BE-03 · provider=ollama-local · model=qwen3:8b -->

# Domain/Business-Logic Developer — Synthetic specialist acceptance artifact

Role: BE-03 · Team: BE · Contract: role.BE-03.v1

## Role output

# Domain Module Draft: One-Week Personal Planning Exercise

## Overview
This domain module models a one-week personal planning exercise for a local-first personal planning product. The system allows users to define and manage a weekly plan with tasks, goals, and state transitions. The module includes deterministic rules for task validation, state transitions, and compensating actions. This is a draft specification and does not include actual code or test execution.

## Core Features

### 1. Task Creation
- A task must have a title, a due date (within the current week), and a priority (low, medium, high).
- Tasks must be assigned to a user (placeholder for now).
- Task creation is only allowed if the due date is within the current week.

### 2. Task State Transitions
- Task states: `Pending`, `In Progress`, `Completed`, `Overdue`.
- Valid transitions:
  - `Pending` → `In Progress`
  - `In Progress` → `Completed`
  - `In Progress` → `Overdue` (if due date is passed)
  - `Completed` → `Pending` (if task is re-opened)
  - `Overdue` → `Pending` (if task is re-opened)

### 3. Validation Rules
- A task cannot be created if the due date is outside the current week.
- A task cannot be marked as `Completed` if it is not in `In Progress` state.
- A task cannot be marked as `Overdue` unless its due date has passed.
- A task cannot be re-opened (moved from `Completed` or `Overdue` to `Pending`) without user confirmation.

### 4. Compensating Actions
- If a task is moved to `Overdue`, a compensating action is to send a reminder (placeholder for now).
- If a task is re-opened from `Completed`, a compensating action is to log a note that the task was re-opened.

## Unit and Integration Tests

### Unit Tests
- `test_task_creation_with_valid_date()` – Validates that a task can be created with a valid due date.
- `test_task_creation_with_invalid_date()` – Validates that a task cannot be created with an invalid due date.
- `test_task_state_transition_from_pending_to_in_progress()` – Validates that a task can transition from `Pending` to `In Progress`.
- `test_task_state_transition_from_in_progress_to_completed()` – Validates that a task can transition from `In Progress` to `Completed`.
- `test_task_state_transition_from_in_progress_to_overdue()` – Validates that a task can transition from `In Progress` to `Overdue` if due date is passed.
- `test_task_state_transition_from_completed_to_pending()` – Validates that a task can transition from `Completed` to `Pending` with user confirmation.
- `test_task_state_transition_from_overdue_to_pending()` – Validates that a task can transition from `Overdue` to `Pending` with user confirmation.

### Integration Tests
- `test_task_creation_and_state_transition()` – Validates that a task can be created and transitioned through valid states.
- `test_compensating_actions_on_overdue_task()` – Validates that a compensating action is triggered when a task is marked as `Overdue`.
- `test_compensating_actions_on_reopened_task()` – Validates that a compensating action is triggered when a task is re-opened from `Completed` or `Overdue`.

## Evidence and Assumptions

- **Assumption 1**: The current week is defined as the week containing the current date.
- **Assumption 2**: The system does not support multi-user collaboration; tasks are assigned to a single user.
- **Assumption 3**: The system does not support task dependencies or scheduling beyond due dates.
- **Assumption 4**: The system does not support task prioritization beyond the defined priority levels.
- **Assumption 5**: The system does not support task reassignment or deletion beyond state transitions.

## Boundaries and Unknowns

- **Unknown 1**: The exact definition of "current week" is not specified. It is assumed to be the week containing the current date.
- **Unknown 2**: The system does not support task dependencies or scheduling beyond due dates.
- **Unknown 3**: The system does not support task reassignment or deletion beyond state transitions.
- **Unknown 4**: The system does not support task prioritization beyond the defined priority levels.
- **Unknown 5**: The system does not support multi-user collaboration; tasks are assigned to a single user.

## Notes
This is a draft specification of the domain module. It includes deterministic rules, state transitions, validation, and compensating actions. The module is not yet implemented in code and requires further development and testing. The system is designed for a local-first personal planning product and does not support external services or real-world actions.

## Independent QA-01 review

{
  "verdict": "REVISE",
  "findings": [
    "The draft provides a comprehensive specification of the domain module, including rules, state transitions, and compensating actions.",
    "The unit and integration test cases are well-defined and align with the expected deliverables.",
    "The draft includes a clear 'Evidence and Assumptions' section and a 'Boundaries and Unknowns' section."
  ],
  "missing_requirements": [
    "The actual implementation of the domain module in code is missing."
  ],
  "evidence_limits": [
    "The draft does not include code or test execution results, which are required for a tested domain module."
  ]
}

## Automated acceptance limits

Structural result: FAIL.
Matched expected-output cues: domain, module.
Review parser result: CAPTURED; verdict: REVISE.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.