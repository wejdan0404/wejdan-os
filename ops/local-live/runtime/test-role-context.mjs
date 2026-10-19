import assert from 'node:assert/strict';
import { assembleRoleContext } from './role-context.mjs';

const role = { role_id: 'AI-09', contract_id: 'role.AI-09.v1', team_id: 'AI', team_name: 'AI', name_en: 'Memory Engineer', name_ar: 'مهندس الذاكرة', trigger: 'Design memory safely.', responsibilities: 'Review scoped memory.', expected_outputs: 'Memory policy.', forbidden_actions: ['Store personal data'], tool_policy: 'No tools.' };
const record = { record_id: 'mem_00000000-0000-4000-8000-000000000001', memory_key: 'workflow.output', version: 1, reviewed_at: '2026-10-19T00:00:00Z', source: { task_id: 'task_source', trace_id: 'trace_source', evidence_refs: ['agents/README.md#memory'] }, content: 'Preserve the declared output and label unavailable evidence unknown.' };
const common = { role, card: '## Specialist focus\n- Keep each record scoped.\n\n## Work method\n1. Follow provenance.', projectContext: '# Shared project context\nLocal-first.', knowledge: [{ path: 'agents/knowledge/project-facts.md', text: 'Approved facts.', reason: 'baseline' }], skills: [{ path: 'agents/skills/role-deliverable/SKILL.md', text: '---\nname: role-deliverable\n---\n\n1. Provide evidence.', always: true }, { path: 'agents/skills/agent-memory/SKILL.md', text: '---\nname: agent-memory\n---\n\n1. Preserve scope.', relevance: 'role-critical' }], memory: { agent: [record], project: [] }, taskInput: 'Write the role deliverable' };

const assembled = assembleRoleContext(common);
assert.ok(assembled.systemPrompt.length <= 7900);
assert.match(assembled.systemPrompt, /workflow\.output[\s\S]*Preserve the declared output/);
assert.match(assembled.systemPrompt, /agent-memory/);
assert.equal(assembled.manifest.role_id, 'AI-09');
assert.equal(assembled.manifest.sources.find(item => item.id === record.record_id).status, 'included');
assert.ok(assembled.manifest.sources.every(item => item.sha256 && item.scope));

const filled = assembleRoleContext({ ...common, projectContext: 'context\n'.repeat(4000), knowledge: [{ path: 'agents/knowledge/project-facts.md', text: 'facts\n'.repeat(1000) }], skills: common.skills.map(skill => ({ ...skill, text: 'skill procedure\n'.repeat(2000) })), memory: { agent: [{ ...record, content: 'Never truncate this approved memory record. '.repeat(30) }], project: [record] } });
assert.ok(filled.systemPrompt.length <= 7900, 'over-budget sources cannot exceed runtime limit');
assert.ok(filled.manifest.sources.filter(item => item.scope.endsWith('memory')).every(item => item.status === 'included' || item.status === 'omitted_context_budget'), 'memory records are included whole or explicitly omitted');
assert.ok(filled.manifest.omitted_count > 0 || filled.manifest.truncated_count > 0, 'budget omissions/truncations are explicit');
console.log(JSON.stringify({ result: 'PASS', suite: 'role-context-assembly', checks: ['contracted role context', 'relevant skill selection', 'memory provenance', 'hard 7900 character limit', 'no silent memory truncation', 'manifest hashes and omission reasons'] }));
