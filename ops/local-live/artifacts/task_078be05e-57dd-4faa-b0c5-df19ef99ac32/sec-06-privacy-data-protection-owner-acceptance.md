<!-- Wejdan local artifact · task=task_078be05e-57dd-4faa-b0c5-df19ef99ac32 · trace=trace_38c1c984-2288-48e5-992b-80cd063a0ead · role=SEC-06 · provider=ollama-local · model=qwen3:8b -->

# Privacy/Data Protection Owner — Synthetic specialist acceptance artifact

Role: SEC-06 · Team: SEC · Contract: role.SEC-06.v1

## Role output

```markdown
# Privacy/Data Protection Draft Review - Task ID: task_078be05e-57dd-4faa-b0c5-df19ef99ac32

## Data Map

| Data Type | Description | Collection Method | Storage Location | Retention Period | Deletion Method |
|----------|------------|-------------------|------------------|------------------|----------------|
| Personal Identifiers | Names, email addresses, usernames | User registration and login | Local device (encrypted) | 1 week | Automatic deletion after 7 days |
| Usage Data | Time spent on tasks, task completion status | Application tracking | Local device (encrypted) | 1 week | Automatic deletion after 7 days |
| Preferences | User-selected task categories, reminders | User settings | Local device (encrypted) | 1 week | Manual deletion by user |
| Device Information | Device type, OS version | System detection | Local device (encrypted) | 1 week | Automatic deletion after 7 days |
| Consent Status | User consent for data collection | User settings | Local device (encrypted) | 1 week | Manual deletion by user |

## DPIA-Style Risk Notes

- **Data Minimization**: Only minimal data is collected, which reduces the risk of exposure.
- **Storage Location**: All data is stored locally on the user's device, which minimizes the risk of data breaches or unauthorized access.
- **Retention Period**: Data is retained for a maximum of 7 days, which aligns with the product's one-week planning exercise and reduces long-term exposure.
- **Deletion Mechanism**: Data is automatically or manually deleted after the retention period, which supports data minimization and privacy by design.
- **No Third-Party Sharing**: The product does not share data with external services, which reduces the risk of international data transfers and third-party data use.
- **User Control**: Users have control over their data through settings and deletion options, which supports user autonomy and transparency.

## Open Legal Questions

- **Consent Mechanism**: How is user consent documented and verified? Is there a clear and accessible mechanism for users to withdraw consent?
- **Data Retention Policy**: What is the legal basis for retaining data for 7 days? Is there a legal requirement or user agreement that supports this?
- **Data Deletion Verification**: How can we ensure that data is completely deleted from the device and not retained in cache or logs?
- **User Consent for Data Use**: Is there a clear explanation of how data is used (e.g., for improving the product), and is this communicated to users?
- **Data Retention for Legal Purposes**: Are there any legal obligations that require data to be retained beyond the 7-day period?

## Evidence and Assumptions

- **Assumption**: The product is designed to be a local-first application, with no data shared with external services.
- **Assumption**: All data is stored locally on the user's device and is encrypted.
- **Assumption**: The one-week planning exercise is the sole purpose of data collection, and no additional data is collected beyond this scope.
- **Assumption**: Users are informed of data collection and retention practices through in-app prompts or settings.
- **Assumption**: Data is deleted automatically after the 7-day retention period, and this process is verified through internal testing.

## Boundaries and Unknowns

- **Unknown**: The exact legal basis for data retention and deletion is not specified.
- **Unknown**: The method of data deletion (e.g., secure erase, overwrite) is not defined.
- **Unknown**: The legal requirements for data retention in the jurisdictions where users may reside are not known.
- **Unknown**: The exact mechanism for user consent and withdrawal is not defined.
- **Unknown**: The legal implications of storing data locally on user devices are not fully understood.

## Draft Status

This is a **draft** and does not imply approval. Further review and verification by legal counsel are required to ensure compliance with applicable data protection laws and regulations.
```

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [],
  "missing_requirements": [],
  "evidence_limits": [
    "The legal basis for data retention and deletion is not specified, but this is acknowledged as an unknown."
  ]
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: data, dpia-style, risk, notes, open, legal, questions, compliance.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.