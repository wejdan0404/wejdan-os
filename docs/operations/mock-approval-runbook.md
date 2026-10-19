# Mock approval and replay rules

`approval_request.v1.schema.json` defines the request envelope. Offline tests cover exact task/trace/action binding, expiry, replay, and pending decisions. The mock ledger does not contact an approver and does not authorize a real side effect.

For any future external action, the backend must atomically verify the immutable action hash, task and trace, actor authority, expiry, single-use nonce, budget reservation, and current kill switch in one transaction. Browser/UI state and an n8n Code node are not security boundaries. A pending or unknown decision stays pending; deny by default. The local simulation does not provide these backend guarantees.
