<!-- Wejdan local artifact · task=task_31a17bec-a3cc-4dc9-b2e6-f435f4598abf · trace=trace_3ab1ae9a-4fc0-434f-8732-352e02d28f9f · role=INF-05 · provider=ollama-local · model=qwen3:8b -->

# n8n Platform Engineer — Synthetic specialist acceptance artifact

Role: INF-05 · Team: INF · Contract: role.INF-05.v1

## Role output

```markdown
# n8n Runbook Draft: Local-First Personal Planning Product Team

## Overview
This runbook outlines the operational procedures for managing n8n environments, workflows, credentials, and monitoring for a fictional local-first personal planning product team. The focus is on maintaining reliability, scalability, and security in a self-contained, non-production environment.

## n8n Runbook

### 1. Environment Setup
- **Environment Separation**: Each n8n instance must be isolated (e.g., `dev`, `staging`, `prod`).
- **Configuration**: Use environment-specific `.env` files to manage credentials and settings.
- **Storage**: Use local file storage for workflows and credentials unless cloud storage is explicitly approved.

### 2. Worker Management
- **Workers**: Run workers in a separate process or container to ensure workflow execution is decoupled from the main n8n instance.
- **Concurrency**: Monitor worker concurrency to avoid overloading the system. Use `maxConcurrentExecutions` in `config.js` to control parallel execution.
- **Scaling**: For local testing, scaling is limited to the number of available CPU cores. For production, scaling must be coordinated with BE-08.

### 3. Credential Management
- **Storage**: Use encrypted credential storage (e.g., `credentials.json`) and ensure it is not exposed in logs or environment variables.
- **Rotation**: Implement a process for rotating credentials, including testing the impact on workflows.
- **Access Control**: Limit access to credentials to only necessary team members.

### 4. Workflow Backups
- **Backup Frequency**: Back up workflows and credentials daily or after major changes.
- **Storage**: Store backups in a secure, version-controlled location (e.g., local Git or encrypted cloud storage).
- **Recovery**: Establish a recovery process to restore workflows and credentials from backups in case of corruption or loss.

### 5. Upgrades and Maintenance
- **Version Control**: Track n8n version changes and ensure compatibility with existing workflows.
- **Testing**: Perform upgrades in a staging environment before applying to production.
- **Rollback**: Maintain a rollback plan in case an upgrade causes instability.

### 6. Failed-Run Monitoring
- **Logging**: Enable detailed logging for failed runs and ensure logs are stored securely.
- **Alerting**: Set up alerts for failed runs (e.g., via email or local notifications).
- **Analysis**: Review failed runs to identify root causes and update workflows or credentials accordingly.

## Disaster Test Plan (Draft)

### 1. Test Objectives
- Validate the ability to recover workflows and credentials from backups.
- Test the resilience of the n8n environment under simulated failures (e.g., worker crash, credential loss).
- Ensure that failed runs are logged and monitored effectively.

### 2. Test Scenarios
- **Scenario 1**: Simulate a worker crash and verify that the system can restart and continue processing.
- **Scenario 2**: Simulate credential loss and test the recovery process.
- **Scenario 3**: Simulate a failed workflow and verify that the system logs the error and sends an alert.

### 3. Test Execution
- **Execution**: Conduct tests in a staging environment to avoid disrupting production workflows.
- **Documentation**: Record test results and any issues encountered.
- **Review**: Coordinate with BE-08 to review test outcomes and refine the disaster recovery plan.

## Platform Telemetry (Draft)

### 1. Metrics to Track
- **Workflow Execution Time**: Monitor average and maximum execution times.
- **Error Rate**: Track the number of failed runs and their causes.
- **Resource Usage**: Monitor CPU, memory, and disk usage for n8n instances and workers.
- **Credential Usage**: Track how often credentials are accessed and used.

### 2. Telemetry Tools
- **Local Monitoring**: Use built-in n8n metrics and logs for local telemetry.
- **External Tools**: If approved, integrate with external monitoring tools (e.g., Prometheus, Grafana) for enhanced visibility.

### 3. Reporting
- **Frequency**: Generate telemetry reports weekly or after major changes.
- **Recipients**: Share reports with the product team and BE-08 for review and analysis.

## Evidence and Assumptions

| Item | Evidence | Assumption |
|------|----------|------------|
| Environment Separation | n8n configuration files | Each environment is isolated and configured separately |
| Worker Concurrency | `maxConcurrentExecutions` in `config.js` | Concurrency is limited to prevent overloading |
| Credential Rotation | `credentials.json` | Credentials are stored securely and rotated regularly |
| Backup Frequency | Daily backups | Backups are performed daily or after major changes |
| Failed Run Monitoring | n8n logs | Failed runs are logged and monitored effectively |

## Boundaries and Unknowns

- **Budgets and Costs**: No budget or cost information is provided. These must be verified by the finance team.
- **Staffing Availability**: No staffing details are provided. These must be confirmed with the project manager.
- **User Facts**: No user data is provided. All user-related information is assumed to be unknown.
- **Legal and Compliance**: No legal or compliance requirements are specified. These must be reviewed by the legal team.
- **Tool Use**: No tools are approved for use. All actions must be coordinated with BE-08.

## Notes
- This document is a draft and should not be considered approved or final.
- All actions must be coordinated with BE-08 and verified by the appropriate stakeholders.
- No real user data, external services, or real-world actions are involved in this exercise.

```

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [],
  "missing_requirements": [],
  "evidence_limits": [
    "No real user data, external services, or real-world actions are involved in this exercise, as required by the synthetic task. This is acceptable for the scope."
  ]
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: runbook, disaster, test, platform, telemetry, be-08.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.