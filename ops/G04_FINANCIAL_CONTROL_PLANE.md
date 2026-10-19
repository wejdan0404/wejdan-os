# G04 — Synthetic financial control plane and mock ledger

## Implemented

- Offline fixed-point ledger uses signed 64-bit integer micro-SAR. No floating-point amount is authoritative.
- `Reserve -> Settle` releases the reservation; `Reserve -> Release` releases the whole reservation. Each event has a deterministic idempotency key.
- Approval states `pending`, `rejected`, and `expired` return `WAITING_APPROVAL`; only `not_required` and the explicitly synthetic `approved_test_fixture` may proceed.
- Task caps and the SAR 100 planning ceiling are separate inputs. The planning cap is 5,000,000 micro-SAR in the bounded test, while task limits vary per invocation. It does not include subscription fees or n8n execution quotas.
- Settlement is checked against the same planning ceiling. Additive or corrective adjustments append a separate event and never rewrite the prior settlement. Reconciliation sums immutable settlements plus appended adjustments and separately sums active reservations.
- `UNKNOWN` usage adds an unknown event with a null amount. It does not create a zero settlement or change actual totals.
- A simulated kill switch blocks subsequent reservations in the local mock only.

## Evidence and limits

- `workflows/n8n/tests/mock-ledger-v3.ps1`: **26 deterministic assertions passed** (reserve, settle, release, duplicate/idempotency, cap denial, approval wait/reject, invalid IDs, unknown usage, append-only adjustment, negative-balance guard, reconciliation, simulated halt).
- Contract sketch: `workflows/n8n/schemas/mock_ledger_event.v1.schema.json`.
- G02 Finance Controller remains an n8n Code-node decision mock with `policy_is_atomic=false`. This offline ledger does not back or enforce its decisions.
- Ledger data is in-memory and single-process. No database, persistence, transaction isolation, concurrent reservation guarantee, real billing measurement, or actual provider kill switch was implemented. No database dependency or service was installed or exposed.
- The monthly planning ceiling is planning policy, not a hard production spend cap.

## Gate decision

G04 can be verified for deterministic local mock semantics only. Persistent transaction behavior remains explicitly unimplemented and unclaimed.
