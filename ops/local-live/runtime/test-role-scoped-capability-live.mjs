import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { compileRoleCapabilityRegistry, getRoleCapability, authorizeTaskTools } from './role-capabilities.mjs';
import { createScopedProjectTools } from './scoped-artifact-tools.mjs';

const ROOT = process.cwd();
const roleId = process.argv[2] || 'QA-03';
if (!/^[A-Z0-9-]+$/.test(roleId)) throw new Error('INVALID_ROLE_ID');
const registry = JSON.parse(await readFile(resolve(ROOT, 'roles/role_registry.json'), 'utf8'));
const matrixPath = resolve(ROOT, 'ops/agent-acceptance/role_matrix.json');
const matrix = JSON.parse(await readFile(matrixPath, 'utf8'));
const row = matrix.roles.find(item => item.role_id === roleId);
assert(row?.task_id && row?.trace_id && row?.specialist_artifact_status === 'PASS', 'SELECTED_ROLE_MUST_HAVE_ACCEPTED_LIVE_TASK');
const taskResponse = await fetch(`http://127.0.0.1:8766/api/tasks/${row.task_id}`).then(response => response.json());
assert.equal(taskResponse.task_id, row.task_id);
assert.equal(taskResponse.trace_id, row.trace_id);
assert.equal(taskResponse.status, 'completed');

const capability = getRoleCapability(compileRoleCapabilityRegistry(registry), roleId);
const approved = ['project.read', 'artifact.write'];
const authorization = authorizeTaskTools({ capability, requestedGrants: approved, approvedGrants: approved });
assert.deepEqual(authorization.grants, approved);
assert.throws(() => authorizeTaskTools({ capability, requestedGrants: ['shell.execute'], approvedGrants: ['shell.execute'] }), /TASK_TOOL_GRANT_DENIED/);
assert.throws(() => authorizeTaskTools({ capability, requestedGrants: ['project.read'], approvedGrants: [] }), /TASK_TOOL_GRANT_DENIED/);

const contractPath = `roles/contracts/${roleId}.v1.json`;
const otherRoleId = registry.roles.find(role => role.role_id !== roleId)?.role_id;
assert(otherRoleId, 'ANOTHER_CANONICAL_ROLE_REQUIRED_FOR_ALLOWLIST_NEGATIVE_CASE');
const unauthorizedContractPath = `roles/contracts/${otherRoleId}.v1.json`;
const tools = createScopedProjectTools({ projectRoot: ROOT, taskId: row.task_id, traceId: row.trace_id, roleId, allowedReadPaths: [contractPath], writeEnabled: true, provider: 'ollama-local', model: 'qwen3:8b' });
const read = await tools.readProjectFile(contractPath);
const contract = JSON.parse(read.content);
assert.equal(contract.role_id, roleId);
await assert.rejects(() => tools.readProjectFile(unauthorizedContractPath), /PROJECT_READ_NOT_ALLOWLISTED/);
await assert.rejects(() => tools.readProjectFile('../CURRENT_STATE.md'), /INVALID_PROJECT_RELATIVE_PATH/);

const artifactContent = [
  `# Scoped capability receipt — ${roleId}`,
  '',
  `Task: ${row.task_id}`,
  `Trace: ${row.trace_id}`,
  `Authorized read: ${contractPath}`,
  `Read SHA-256: ${createHash('sha256').update(read.content).digest('hex')}`,
  'Authorized write: one new Markdown receipt in this task artifact directory.',
  'No shell, network, sensitive, publication, or production-data tools were granted.',
].join('\n');
const filename = `scoped-capability-receipt-${roleId.toLowerCase()}.md`;
const expectedArtifact = resolve(ROOT, 'ops/local-live/artifacts', row.task_id, filename);
let artifact;
let idempotent = false;
try {
  artifact = await tools.writeArtifact({ filename, content: artifactContent, artifactType: 'text/markdown' });
} catch (error) {
  if (error.message !== 'ARTIFACT_ALREADY_EXISTS') throw error;
  const existing = await readFile(expectedArtifact, 'utf8');
  if (!existing.includes(`task=${row.task_id}`) || !existing.includes(`trace=${row.trace_id}`) || !existing.includes(`role=${roleId}`)) throw new Error('EXISTING_RECEIPT_PROVENANCE_MISMATCH');
  idempotent = true;
  artifact = { path: `ops/local-live/artifacts/${row.task_id}/${filename}`, bytes: Buffer.byteLength(existing), sha256: createHash('sha256').update(existing).digest('hex'), provenance: { task_id: row.task_id, trace_id: row.trace_id, role_id: roleId, provider: 'ollama-local', model: 'qwen3:8b' } };
}
const finalFile = await readFile(resolve(ROOT, artifact.path));
assert.equal(createHash('sha256').update(finalFile).digest('hex'), artifact.sha256);
await assert.rejects(() => tools.writeArtifact({ filename, content: 'overwrite attempt', artifactType: 'text/markdown' }), /ARTIFACT_ALREADY_EXISTS/);

const evidencePath = resolve(ROOT, row.evidence_path);
const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
const receipt = {
  schema_version: 'role-tool-receipt.v1',
  authorized_by: 'explicit synthetic task packet in this bounded test; this verifies the scoped tool boundary, not a grant to run tools autonomously',
  task_id: row.task_id,
  trace_id: row.trace_id,
  role_id: roleId,
  grants: authorization.grants,
  read: { path: read.relative_path, bytes: read.bytes, sha256: createHash('sha256').update(read.content).digest('hex') },
  write: { path: artifact.path, bytes: artifact.bytes, sha256: artifact.sha256, idempotent_existing_receipt: idempotent },
  negative_checks: { ungranted_tool_denied: true, outside_allowlist_denied: true, unauthorized_path: unauthorizedContractPath, path_traversal_denied: true, overwrite_denied: true },
  sensitive_grants: [],
  external_actions: 0,
  recorded_at: new Date().toISOString(),
};
evidence.tool_receipt = receipt;
evidence.statuses.role_tool_capability = 'VERIFIED';
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
row.task_tool_grants = authorization.grants;
row.role_tool_capability_status = 'VERIFIED';
row.evidence_sha256 = createHash('sha256').update(`${JSON.stringify(evidence, null, 2)}\n`).digest('hex');
matrix.counters.tool_capability_verified_for_role = matrix.roles.filter(item => item.role_tool_capability_status === 'VERIFIED').length;
matrix.updated_at = new Date().toISOString();
await writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`);

const db = new DatabaseSync(resolve(ROOT, 'ops/local-live/data/wejdan-local.sqlite'), { readOnly: true });
const storedTask = db.prepare('SELECT task_id,trace_id,status FROM tasks WHERE task_id=?').get(row.task_id);
db.close();
assert.equal(storedTask?.task_id, row.task_id);
assert.equal(storedTask?.trace_id, row.trace_id);
assert.equal(storedTask?.status, 'completed');
console.log(JSON.stringify({ result: 'PASS', scope: 'test-harness capability exercise; not autonomous role permission', task_id: row.task_id, trace_id: row.trace_id, role_id: roleId, grants: authorization.grants, artifact: receipt.write, negative_checks: receipt.negative_checks }));
