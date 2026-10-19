# Agent system research — 2026-10-19

## Finding

Reliable agent improvement comes from a compact, well-documented agent interface, fit-for-purpose orchestration, scoped tools, traceable evidence, progressive skill loading, memory separate from current-run compaction, and iterative evaluations that preserve regressions. A memory write is not itself truth; reviewed artifacts and authoritative project sources remain the basis for decisions.

## Design implications for this project

- Use three memory scopes: per-run working/session state, isolated role memory, and approved shared project memory. Keep the curated knowledge base and case artifacts separate. The local runtime has an inference code path for governed role/project memory in `server.mjs#rolePrompt`; code presence is not evidence of end-to-end isolation or production readiness.
- Retrieve after authorization; attach role/team/project scope, status, source, version, freshness and sensitivity metadata. Never expose one role's private memory to another by default.
- Provide all 85 roles a role card generated from the canonical contract, but use readiness metadata honestly. A role contract or passing inference is not an active or domain-approved agent.
- Assign a small set of task-triggered skills rather than bloating each always-on prompt. Package instructions and references progressively; validate the portable `SKILL.md` shape.
- Improve from task/trace/artifact/reviewer evidence. Reproduce, localize, make a minimal change, evaluate the same failure plus regressions and adversarial cases, then require an independent review/authorized owner before rollout.
- Keep the optimizer advisory and non-authorizing. Otherwise, it could convert its own incorrect diagnosis into system-wide policy or permissions.

## Sources consulted

- OpenAI, [Agents SDK](https://developers.openai.com/api/docs/guides/agents/sdk), accessed 2026-10-19: build in code; add tools and handoffs as needed; inspect traces and then evaluate.
- OpenAI, [Guardrails and human review](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals), accessed 2026-10-19: enforce review at the side-effecting tool boundary; pending approvals pause and resume the same run, and SDK applications must implement their own review controls.
- OWASP GenAI Security Project, [LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/), accessed 2026-10-19: excess functionality, permissions, or autonomy create risk; multi-agent and indirect-injection paths are part of the threat model.
- OpenAI, [Evaluate agent workflows](https://developers.openai.com/api/docs/guides/agent-evals), accessed 2026-10-19: trace grading to identify workflow-level tool/handoff/policy behavior; dataset/eval cycles to find regressions.
- OpenAI, [Building Reliable Agents with Memory and Compaction](https://developers.openai.com/cookbook/examples/agents_sdk/building_reliable_agents_memory_compaction), accessed 2026-10-19: distinguish compaction for the current long run from memory for future runs; keep reviewed artifacts as source of truth; use reusable workflow lessons, not case findings.
- OpenAI, [Context Engineering — Short-Term Memory Management with Sessions](https://developers.openai.com/cookbook/examples/agents_sdk/session_memory), accessed 2026-10-19: trimming/summarization tradeoffs, context size, summary drift and replay-based evaluation.
- Anthropic, [Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents), accessed 2026-10-19: prefer the simplest composable pattern that meets the need; carefully document and test the agent-computer interface; evaluate and iterate.
- Anthropic, [Trustworthy Agents in Practice](https://www.anthropic.com/research/trustworthy-agents), accessed 2026-10-19: retain human control, security, transparency and privacy as agent autonomy grows.
- Anthropic, [Claude Code Memory](https://docs.anthropic.com/en/docs/claude-code/memory), accessed 2026-10-19: distinguish project instructions from user preferences; keep memory specific, structured and regularly reviewed.
- Agent Skills, [Specification](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx) and [Best Practices](https://github.com/agentskills/agentskills/blob/main/docs/skill-creation/best-practices.mdx), accessed 2026-10-19: standard folder with metadata, instructions and optional references/scripts; progressive disclosure; keep primary skill concise and task-triggered.

## Limits

These sources provide design guidance, not empirical proof that this particular project will improve without local evals. Web guidance is time-sensitive and was checked on 2026-10-19. Independent runtime/security/privacy review and controlled evaluations are required to prove role/project memory isolation, context completeness, and improvement-loop outcomes.
