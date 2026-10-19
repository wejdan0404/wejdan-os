<!-- Wejdan local artifact · task=task_a3225797-0998-4209-8f9a-f945624bac54 · trace=trace_7f97724b-2395-42fe-84f5-bb03d9199a45 · role=INF-06 · provider=ollama-local · model=qwen3:8b -->

# Backup/Recovery Engineer — Synthetic specialist acceptance artifact

Role: INF-06 · Team: INF · Contract: role.INF-06.v1

## Role output

```markdown
# Backup/Recovery Engineering Draft: Restore Drill and Recovery Runbook

## Overview

This document outlines a proposed backup and recovery strategy for the fictional local-first personal planning product team. The focus is on setting Recovery Point Objective (RPO) and Recovery Time Objective (RTO), backing up databases and workflow configurations, and conducting a restore drill to document actual recovery time.

## Proposed RPO/RTO

- **Recovery Point Objective (RPO):** 1 hour  
  *Assumption:* The team can tolerate losing up to one hour of data in the event of a failure. This is based on the nature of the planning exercise, which is not mission-critical but requires some level of data integrity.

- **Recovery Time Objective (RTO):** 2 hours  
  *Assumption:* The team can afford up to 2 hours of downtime before impacting user experience. This is based on the assumption that the planning exercise is primarily used for personal planning and not for real-time collaboration.

**Note:** These values are proposed and must be confirmed with the business owner for final approval.

## Backup Strategy

- **Database Backups:**  
  - Daily full backups of the database at 2:00 AM.  
  - Hourly incremental backups during peak usage hours (9:00 AM to 5:00 PM).  
  - Backups will be stored in a secure, offsite location (e.g., cloud storage or external drive).

- **Workflow Configurations:**  
  - Workflow configurations will be backed up using version control systems (e.g., Git) or configuration management tools.  
  - Backups will be stored in a secure, versioned repository.

- **Backup Frequency:**  
  - Daily full backups.  
  - Hourly incremental backups during active hours.

## Restore Drill Plan

- **Objective:** Validate the ability to restore data and workflows within the proposed RTO.  
- **Scope:** Restore the latest full backup and the most recent incremental backup to simulate a data loss event.  
- **Steps:**
  1. Isolate the environment to prevent interference with live operations.
  2. Restore the latest full backup to a test environment.
  3. Apply the most recent incremental backup to the restored environment.
  4. Validate that all data and workflows are functional.
  5. Document the actual recovery time from start to finish.

## Recovery Runbook

### Step-by-Step Recovery Procedure

1. **Identify the Point of Failure:**  
   - Determine the cause of the failure (e.g., hardware failure, data corruption, accidental deletion).

2. **Isolate the Environment:**  
   - Ensure no active operations are running to prevent data inconsistency.

3. **Restore from Backup:**  
   - Use the latest full backup and apply the most recent incremental backup to restore the system to the last known good state.

4. **Validate Data Integrity:**  
   - Check that all user data, workflows, and configurations are intact and functional.

5. **Reconfigure and Test:**  
   - Reconfigure any settings that may have changed during the outage.
   - Conduct a test run to ensure the system is operating as expected.

6. **Document Recovery Time:**  
   - Record the actual time taken to complete the recovery process.

7. **Communicate with Stakeholders:**  
   - Inform the business owner and any affected users about the recovery status.

## Evidence and Assumptions

- **RPO/RTO Values:** Proposed values based on the nature of the planning exercise. Must be confirmed with the business owner.
- **Backup Frequency:** Daily full and hourly incremental backups are assumed to be sufficient for the RPO.
- **Restore Drill:** A simulated restore process will be conducted to validate the recovery time and process.
- **Recovery Runbook:** A step-by-step guide to ensure consistency and efficiency during a real recovery event.

## Boundaries and Unknowns

- **Business Owner Approval:** The proposed RPO/RTO values must be confirmed with the business owner.
- **Backup Tools:** Specific tools or platforms for backup and restore are not specified and must be identified.
- **Data Volume:** The actual volume of data and complexity of workflows are unknown and may affect backup and recovery times.
- **Test Environment:** A dedicated test environment for restore drills is assumed but must be verified.
- **User Impact:** The actual impact of downtime on users is unknown and must be assessed.

## Final Notes

This document is a draft and must be reviewed and approved by the business owner and relevant stakeholders before implementation. All actions must be conducted within the boundaries of the role and without making irreversible changes or using production data without explicit approval.
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
Matched expected-output cues: restore, drill, recovery, runbook.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.