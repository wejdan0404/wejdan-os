# Local and n8n mock operations

## Current mode

Use synthetic inputs and manual editor runs only. Existing original workflows remain intact; V2 copies are unpublished and inactive. Confirm the `active` field and workflow ID from a fresh export before describing cloud state. Do not add credentials, schedules, public webhooks, provider nodes, or external side effects.

## Backup and restore

Export each live workflow from n8n Cloud and preserve the exact JSON under `workflows/n8n/backups/`. Record workflow ID, active flag, export time, node inventory, and SHA-256. Restore only by importing into a separate inactive copy unless the owner explicitly approves an overwrite.

## Local tests

Run `pwsh -NoProfile -File workflows/n8n/tests/run_acceptance.ps1`, `mock-ledger-v2.ps1`, and `mock-approval.ps1`. For the dashboard run its preview server then `node command-center/smoke-test.mjs` with the existing bundled Playwright module path. Tests use mock records and make no network calls.

## Incident handling

If credentials, real personal data, a public endpoint, an active schedule, an unexpected provider node, or a spend event appears, stop the affected workflow without deleting evidence. Export its current state, record the timestamp and workflow ID, and notify the owner through this task. Do not send third-party messages.

## Future deployment gates

Plan entitlement, privacy/retention policy, real backend ledger and approval transaction, secret management, backups/restore drill, independent security review, and explicit owner approval before activation or exposure. This runbook does not deploy or activate anything.
