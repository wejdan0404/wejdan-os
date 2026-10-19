# Provider adapter boundary (mock only)

The registry and task contracts describe roles independently from inference providers. Each future adapter must separately report product entitlement, API entitlement, credential reference presence, rate limits, and an owner-approved spend policy. Unknown values fail closed.

This repo only contains a mock entitlement fixture. It stores no keys and cannot make requests. Chat subscription access, a provider API account, and API billing are separate states and must not be conflated. Any live adapter remains blocked pending owner approval, entitlement verification, and secure secret handling.
