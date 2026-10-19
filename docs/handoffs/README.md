# Shared agent handoff packets

These files define a durable, provider-neutral handoff format. A packet is a record for review and coordination; saving it does not send a message or invoke another provider.

## Required packet fields

Use `docs/handoffs/task-packet.template.json` for each task. Keep `task_id`, `root_task_id`, and `trace_id` stable across revisions. Include the exact contract/schema versions, inputs, evidence links, tests, assumptions, risks, and open decisions. Mark evidence as `verified`, `reported`, or `proposed`; never convert a proposal into a result by copying it forward.

Peer review uses `review.template.json`. Record disagreements separately with the claim, counter-evidence, impact, and owner decision required. Do not overwrite the original packet; append a revision with parent hash and reviewer identity.

## Local collaboration memory

`memory-index.json` is a small index, not a second source of truth. Link versioned decisions and deliverables by relative path and SHA-256. Keep secrets, personal data, provider credentials, and hidden reasoning out of packets. Share conclusions and evidence, not private chain-of-thought.

No peer provider integration is live in this project. Codex, Claude, and ChatGPT do not exchange packets automatically here.
