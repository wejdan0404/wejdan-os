import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileRoleCapabilityRegistry } from './role-capabilities.mjs';
import { createArtifactPipeline } from './artifact-pipeline.mjs';

const registry = JSON.parse(await readFile('roles/role_registry.json', 'utf8'));
const roles = compileRoleCapabilityRegistry(registry).roles.map(policy => {
  const role = registry.roles.find(item => item.role_id === policy.role_id);
  return { ...role, ...policy };
});
const responses = [
  JSON.stringify({ title: 'Synthetic Home Plan', outline: ['Scope', 'Steps'], acceptance_checks: ['Trace IDs retained'] }),
  '```markdown\n# Synthetic plan\n\nDraft with an unsupported statement.\n```',
  JSON.stringify({ verdict: 'REVISE', feedback: 'Remove the unsupported statement.', unsupported_claims: ['unsupported statement'] }),
  '```md\n# Synthetic plan\n\nDraft revised using only the supplied test request.\n```',
  JSON.stringify({ verdict: 'PASS', feedback: 'The unsupported statement was removed.', unsupported_claims: [] }),
];
const calls = [];
const written = [];
const infer = async input => {
  calls.push(input);
  return { output: responses.shift(), provider: 'deterministic-stub', model: null, elapsed_ms: 0, usage: null };
};
const writeArtifact = async input => { written.push(input); return { path: 'ops/local-live/artifacts/test/synthetic-home-plan.md', sha256: 'a'.repeat(64), provenance: { task_id: calls[0].task_id, trace_id: calls[0].trace_id, role_id: 'PMO-01' } }; };
const run = createArtifactPipeline({ roles, infer, writeArtifact });
const result = await run({ request: 'Create a short synthetic plan and preserve correlation.', specialistRoleId: 'PMO-01', taskId: 'task_ll12_stub', traceId: 'trace_ll12_stub' });
assert.equal(result.status, 'completed');
assert.equal(result.revision_count, 1);
assert.equal(result.stages.length, 5);
assert.equal(calls.every(call => call.task_id === 'task_ll12_stub' && call.trace_id === 'trace_ll12_stub'), true);
assert.deepEqual(calls.map(call => call.role_id), ['D-00', 'PMO-01', 'QA-01', 'PMO-01', 'QA-01']);
assert.equal(written.length, 1);
assert.equal(written[0].content.includes('only the supplied test request'), true);
assert.equal(written[0].content.startsWith('```'), false);
assert.equal(result.review_scope, 'structural only; no independent factual certification');
await assert.rejects(run({ request: 'synthetic', specialistRoleId: 'UNKNOWN' }), /SPECIALIST_ROLE_NOT_REGISTERED/);
console.log(JSON.stringify({ result: 'PASS', mode: 'deterministic-stub-only', checks: ['planner-specialist-review sequence', 'one bounded revision maximum', 'task and trace correlation preserved at every stage', 'artifact written only after reviewer PASS', 'unknown role rejected', 'review scope does not claim factual certification'], live_codex_calls: 0, paid_calls: 0, n8n_runs: 0 }));
