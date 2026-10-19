import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { compileRoleCapabilityRegistry, getRoleCapability, authorizeTaskTools, assertNoSensitiveToolGrant } from './role-capabilities.mjs';
import { createScopedProjectTools } from './scoped-artifact-tools.mjs';

const registry = JSON.parse(await readFile('roles/role_registry.json', 'utf8'));
const compiled = compileRoleCapabilityRegistry(registry);
assert.equal(compiled.role_count, 85);
assert.equal(new Set(compiled.roles.map(role => role.role_id)).size, 85);
assert.equal(compiled.roles.every(role => role.default_tool_grants.length === 0 && role.registry_tool_authority === 'none-by-default'), true);
const qa = getRoleCapability(compiled, 'QA-01');
assert.throws(() => getRoleCapability(compiled, 'NOT-REGISTERED'), /ROLE_NOT_IN_CAPABILITY_REGISTRY/);
assert.deepEqual(authorizeTaskTools({ capability: qa, requestedGrants: ['project.read'], approvedGrants: ['project.read'] }).grants, ['project.read']);
assert.throws(() => authorizeTaskTools({ capability: qa, requestedGrants: ['project.read'], approvedGrants: [] }), /TASK_TOOL_GRANT_DENIED/);
assert.throws(() => authorizeTaskTools({ capability: qa, requestedGrants: ['shell.execute'], approvedGrants: ['shell.execute'] }), /TASK_TOOL_GRANT_DENIED/);
assert.throws(() => assertNoSensitiveToolGrant('publish'), /SENSITIVE_ACTION_REQUIRES_OWNER_APPROVAL/);

const temp = await mkdtemp(join(tmpdir(), 'wejdan-scoped-tools-'));
const outside = await mkdtemp(join(tmpdir(), 'wejdan-outside-'));
try {
  await mkdir(join(temp, 'docs'), { recursive: true });
  await writeFile(join(temp, 'docs', 'synthetic.md'), 'Synthetic project brief for scoped read test.');
  await writeFile(join(outside, 'outside.md'), 'Must never be read.');
  const taskId = `task_${randomUUID()}`;
  const traceId = `trace_${randomUUID()}`;
  const tools = createScopedProjectTools({ projectRoot: temp, taskId, traceId, roleId: 'QA-01', allowedReadPaths: ['docs/synthetic.md'], writeEnabled: true, provider: 'deterministic-stub', model: null });
  const read = await tools.readProjectFile('docs/synthetic.md');
  assert.equal(read.content, 'Synthetic project brief for scoped read test.');
  await assert.rejects(tools.readProjectFile('docs/private.md'), /PROJECT_READ_NOT_ALLOWLISTED/);
  await assert.rejects(tools.readProjectFile('../outside.md'), /INVALID_PROJECT_RELATIVE_PATH/);
  await assert.rejects(tools.writeArtifact({ filename: '../escape.md', content: 'escape' }), /INVALID_PROJECT_RELATIVE_PATH/);
  await assert.rejects(tools.writeArtifact({ filename: 'script.js', content: 'alert(1)' }), /ARTIFACT_FILENAME_NOT_ALLOWED/);
  await assert.rejects(tools.writeArtifact({ filename: 'too-large.md', content: 'x'.repeat(256001) }), /ARTIFACT_CONTENT_LIMIT/);
  const artifact = await tools.writeArtifact({ filename: 'quality-check.md', content: 'This artifact was generated deterministically by an isolated tool-policy test. It is not an AI agent output.', artifactType: 'text/markdown' });
  const artifactPath = resolve(temp, artifact.path);
  const artifactText = await readFile(artifactPath, 'utf8');
  assert.equal(artifactText.includes(taskId), true);
  assert.equal(artifactText.includes(traceId), true);
  assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
  await assert.rejects(tools.writeArtifact({ filename: 'quality-check.md', content: 'overwrite' }), /ARTIFACT_ALREADY_EXISTS/);
  const noWrite = createScopedProjectTools({ projectRoot: temp, taskId: `task_${randomUUID()}`, traceId: `trace_${randomUUID()}`, roleId: 'D-00', writeEnabled: false });
  await assert.rejects(noWrite.writeArtifact({ filename: 'denied.md', content: 'no' }), /ARTIFACT_WRITE_NOT_GRANTED/);
  assert.throws(() => createScopedProjectTools({ projectRoot: temp, taskId, traceId, roleId: 'QA-01', allowedReadPaths: ['../outside.md'] }), /INVALID_PROJECT_RELATIVE_PATH/);
  let symlinkCheck = 'NOT_APPLICABLE';
  try {
    await symlink(join(outside, 'outside.md'), join(temp, 'linked.md'), 'file');
    const symlinkReader = createScopedProjectTools({ projectRoot: temp, taskId, traceId, roleId: 'QA-01', allowedReadPaths: ['linked.md'] });
    await assert.rejects(symlinkReader.readProjectFile('linked.md'), /SYMLINK_PATH_DENIED/);
    symlinkCheck = 'PASS';
  } catch (error) {
    if (error.code !== 'EPERM' && error.code !== 'EACCES' && error.code !== 'UNKNOWN') throw error;
  }
  const demoTask = `task_${randomUUID()}`;
  const demoTrace = `trace_${randomUUID()}`;
  const demoTools = createScopedProjectTools({ projectRoot: process.cwd(), taskId: demoTask, traceId: demoTrace, roleId: 'QA-01', writeEnabled: true, provider: 'deterministic-stub', model: null });
  const demoArtifact = await demoTools.writeArtifact({ filename: 'tool-boundary-demo.md', content: '## Synthetic tool boundary demonstration\n\nThis file was written by a deterministic test fixture. It demonstrates a local, task-scoped Markdown artifact with task/trace/role provenance. It is not generated by an AI agent and has no database task record.\n', artifactType: 'text/markdown' });
  assert.equal(demoArtifact.path.startsWith(`ops/local-live/artifacts/${demoTask}/`), true);
  console.log(JSON.stringify({ result: 'PASS', mode: 'deterministic-local-test-fixture', role_count: compiled.role_count, checks: ['85 role policies compiled without changing role registry', 'all roles deny tools by default', 'explicit local tool grant required', 'shell tool is denied', 'read allowlist and path traversal', 'owner-only sensitive action policy encoded', 'artifact format, size, provenance and SHA-256', 'existing artifacts cannot be overwritten', 'task write disabled without grant', `symlink traversal ${symlinkCheck}`, 'demo artifact created and clearly labeled stub-only'], artifact: demoArtifact, live_codex_calls: 0, paid_calls: 0, n8n_runs: 0 }));
} finally {
  await rm(temp, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
}
