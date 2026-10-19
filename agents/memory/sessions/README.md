# Session memory namespace

Future namespace pattern: `session/<role-id>/<task-id>/`. This holds temporary working state, task-specific summaries and compaction checkpoints. It is not durable memory. Follow owner-approved retention and deletion policy; no automatic retention extension is authorized.
