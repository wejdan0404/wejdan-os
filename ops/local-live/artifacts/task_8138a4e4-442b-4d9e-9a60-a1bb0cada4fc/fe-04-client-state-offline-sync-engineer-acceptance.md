<!-- Wejdan local artifact · task=task_8138a4e4-442b-4d9e-9a60-a1bb0cada4fc · trace=trace_70a230c1-651d-4a9f-a2ca-8a07240bd1fe · role=FE-04 · provider=ollama-local · model=qwen3:8b -->

# Client State/Offline Sync Engineer — Synthetic specialist acceptance artifact

Role: FE-04 · Team: FE · Contract: role.FE-04.v1

## Role output

```markdown
# Draft: Sync Protocol Tests, Conflict Cases, and Recovery Demo for Local-First Personal Planning App

## Overview
This document outlines a set of test scenarios, conflict cases, and recovery demonstrations for a local-first personal planning application. The focus is on ensuring safe offline editing, data hydration, conflict resolution, and resumption after reconnection.

## Sync Protocol Tests

### Test 1: Offline Edits and Data Hydration
- **Scenario**: User edits a task while offline.
- **Expected Outcome**: Changes are stored in local cache and marked as pending.
- **Hydration Check**: Upon reconnection, the app should hydrate the task data from the server, merging local changes with server data if no conflicts exist.

### Test 2: Retry on Sync Failure
- **Scenario**: Sync fails due to network error.
- **Expected Outcome**: The app should retry syncing at regular intervals (e.g., every 5 minutes) without user intervention.
- **Retry Limit**: Maximum of 5 retries before marking the sync as failed.

### Test 3: Duplicate Suppression
- **Scenario**: User submits the same task twice while offline.
- **Expected Outcome**: The app should detect the duplicate and suppress the second submission.
- **Conflict Resolution**: The user should be notified of the duplicate and given the option to resolve it manually.

### Test 4: Conflict Resolution UX
- **Scenario**: User edits a task offline, and the same task is edited on the server.
- **Expected Outcome**: A conflict is detected, and the user is presented with a merge interface.
- **Merge Options**: User can choose to merge both versions, keep the local version, or keep the server version.

### Test 5: Safe Resumption After Reconnection
- **Scenario**: User is offline for an extended period and then reconnects.
- **Expected Outcome**: The app should resume syncing all pending changes and ensure data consistency.
- **Data Integrity Check**: All local edits should be applied in the correct order, and conflicts should be resolved before data is persisted.

## Conflict Cases

### Case 1: Task Title Conflict
- **Description**: User edits the title of a task offline, and the same task is edited on the server.
- **Resolution**: User is prompted to choose which title to keep.

### Case 2: Task Status Conflict
- **Description**: User marks a task as completed offline, and the server marks it as in progress.
- **Resolution**: User is shown both versions and must manually resolve the status.

### Case 3: Task Priority Conflict
- **Description**: User changes the priority of a task offline, and the server changes it to a different priority.
- **Resolution**: User is shown both priorities and must select the final priority.

## Recovery Demo

### Demo 1: Offline Edit and Sync
- **Steps**:
  1. User edits a task offline.
  2. App stores the edit in local cache.
  3. User reconnects and syncs.
  4. App hydrates the task and applies the local edit.
- **Outcome**: Task is updated with the user's changes.

### Demo 2: Conflict Resolution
- **Steps**:
  1. User edits a task offline.
  2. Server edits the same task.
  3. User reconnects and syncs.
  4. App detects a conflict and presents a merge interface.
  5. User resolves the conflict and confirms the final state.
- **Outcome**: Task is updated with the resolved version.

### Demo 3: Duplicate Suppression
- **Steps**:
  1. User submits a task twice while offline.
  2. App detects the duplicate and suppresses the second submission.
  3. User is notified of the duplicate.
  4. User resolves the issue manually.
- **Outcome**: Only one task is submitted.

## Evidence and Assumptions

- **Assumption 1**: The app uses a local cache to store offline edits.
- **Assumption 2**: The app has a retry mechanism for failed syncs.
- **Assumption 3**: The app can detect and suppress duplicate submissions.
- **Assumption 4**: The app can detect and resolve conflicts using a merge interface.
- **Assumption 5**: The app can safely resume syncing after reconnection.

## Boundaries and Unknowns

- **Unknown 1**: The exact behavior of the server during sync is not specified.
- **Unknown 2**: The exact conflict resolution logic is not defined.
- **Unknown 3**: The exact retry interval and limit are not specified.
- **Unknown 4**: The exact user interface for conflict resolution is not defined.
- **Unknown 5**: The exact data hydration process is not specified.

## Draft Note
This is a draft document and should not be considered as approved or final. Further review and testing are required to validate the proposed sync protocol, conflict resolution, and recovery mechanisms.
```

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [],
  "missing_requirements": [],
  "evidence_limits": []
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: sync, protocol, tests, conflict, cases, recovery, demo.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.