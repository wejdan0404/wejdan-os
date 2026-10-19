# Wejdan Life OS financial control boundary

## Unit and policy model

Amounts are integer micro-SAR (`1 SAR = 1,000,000 micro-SAR`). The planning ceiling of SAR 100 per month is a decision boundary, not authority to spend, not subscription fees, and not the n8n execution allowance. Task mock caps are separate scenario fixtures. `actual_paid_cost_micro_sar` is always zero only in the provider-disabled synthetic tests; unknown real metering is `UNKNOWN_PENDING`, never a zero-cost settlement.

The implemented PowerShell ledger is in-memory, deterministic and single-process. It tests reserve/settle/release arithmetic, duplicate event handling, and kill-switch simulation. It does not provide durable append-only storage, atomic concurrency control, access control, or real billing coverage. Do not use it to approve or permit a paid provider call.

## Required backend before any real spend

- Authenticated service boundary; only a server-side gateway can call vendors.
- Transactional reservation against monthly, agent, and task limits; fail closed on uncertainty.
- Idempotency keys, unique constraints, append-only reserve/settle/release/reconcile events and explicit adjustment entries.
- Human approval bound to action snapshot hash, scope, task, amount, requestor and expiry; expired or replayed decisions reject.
- Global kill switch enforced at the provider gateway, tested against every provider path.
- Reconciliation against vendor bills; unknown usage remains pending and blocks further spend.
- Database transaction race tests, audit retention, least-privilege access, backup/restore and alerting.

## Explicit limitation

n8n code and workflow controls are orchestration conveniences, not a financial root of trust. Live cloud roles remain inactive, provider calls are disabled, actual spend recorded for this work is SAR 0, and no change here creates an entitlement or money permission.
