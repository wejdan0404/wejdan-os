---
name: team-context
description: Selects the smallest useful team-specific project context, knowledge and supporting skill set for a role task while preserving ownership, source provenance and context budget. Use when assembling prompts or handoffs.
---

# Team context selection

1. Resolve the canonical role ID/team and read `agents/roles/<ROLE_ID>.md` plus its contract.
2. Select project context and only knowledge that directly affects the requested deliverable; apply access controls first.
3. Include only named, relevant skills from that role card. Load detailed references only when the workflow calls for them.
4. Include source dates/status and unresolved conflicts. Put current task state in the working context, not persistent memory.
5. Create a context manifest listing included references and versions. Omit unrelated role cards, full history, broad corpora and duplicate facts.
6. If a critical source is missing or conflicts, mark the decision blocked/unknown and route to the source owner; do not fill the gap with a guess.
