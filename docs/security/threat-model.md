# n8n development-agent mock threat model

Assets: workflow definitions and exports, synthetic task payloads, role registry, and future secret references. Trust boundaries: local project filesystem; n8n Cloud project; any future provider or collaboration service. Current workflows have no provider credentials configured and remain unpublished/inactive.

Threats include accidental publish/scheduling, importing unreviewed nodes, replayed approvals, forged or mismatched task/trace IDs, unsafe budget races, secrets in exports/logs, real data entering fixtures, and overstating deterministic mocks as AI agents. Controls in this prototype: synthetic fixtures, separate copies, manual triggers, inactive status, fail-closed mock decisions, no external endpoints, export backups, and explicit `MOCK_ONLY` role state.

Limitations: local scripts and n8n Code nodes are not authoritative security controls; in-memory deduplication is not durable/atomic; cloud quota and retention settings are not fully verified; the Command Center is static and unauthenticated. Do not expose it or use it with sensitive data. A database-backed transaction, access controls, retention decisions, and independent review are required before any production use.
