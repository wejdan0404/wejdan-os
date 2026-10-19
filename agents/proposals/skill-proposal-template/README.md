# Candidate skill proposal template

**Status:** `PROPOSED`  
**Candidate only:** files in this folder are not live skills and are not loaded by runtime.

## Skill candidate

Store the draft at `skills/<skill-name>/SKILL.md` with valid frontmatter (`name`, `description`), a narrow trigger, clear inputs/outputs, steps, boundaries and links to approved sources. Keep instructions concise and load references progressively. Require evidence from two independent cases or one documented high-risk mandatory procedure. Extend an existing skill or add task guidance when evidence does not justify another skill.

## Evidence packet

- Stable proposal ID and affected role/contract/version.
- Source task/trace/evidence IDs and failure layer diagnosis with confidence.
- Why a new skill is preferable to task guidance or an existing skill.
- Exact diff and source versions.
- Candidate regression/eval fixtures and unchanged acceptance criteria.
- Baseline/candidate counts and outcomes; unknowns remain null.
- Prompt-injection, unsafe-tool, privacy and cross-scope checks.
- AI-QA, relevant specialist, QA-01, and security/privacy review status.
- Owner decision, promotion task, rollout and rollback.

## Promotion boundary

The candidate remains `PROPOSED` until independent review and explicit owner approval. A separate authorized task must copy it to `agents/skills/`, update approved role bindings if needed, validate runtime loading, and record rollback. The improvement function cannot perform that promotion.
