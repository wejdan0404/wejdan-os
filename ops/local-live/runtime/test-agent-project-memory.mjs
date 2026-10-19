import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureGovernedMemorySchema, proposeGovernedMemory, reviewGovernedMemory,
  retrieveGovernedMemory, listGovernedMemory, deleteGovernedMemory,
  listGovernedMemoryAudit,
} from './memory-governance.mjs';

const db = new DatabaseSync(':memory:');
db.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE tasks(task_id TEXT PRIMARY KEY,trace_id TEXT NOT NULL UNIQUE,role_id TEXT NOT NULL,status TEXT NOT NULL);
CREATE TABLE task_steps(task_id TEXT NOT NULL,trace_id TEXT NOT NULL,role_id TEXT NOT NULL);
CREATE TABLE task_memory(memory_id TEXT PRIMARY KEY,task_id TEXT NOT NULL,trace_id TEXT NOT NULL,source_step INTEGER NOT NULL,memory_kind TEXT NOT NULL,content TEXT NOT NULL,created_at TEXT NOT NULL);
INSERT INTO tasks VALUES('task_memory_a','trace_memory_a','AI-09','completed'),('task_memory_b','trace_memory_b','AI-12','completed');
INSERT INTO task_steps VALUES('task_memory_a','trace_memory_a','AI-QA'),('task_memory_b','trace_memory_b','AI-12');`);
ensureGovernedMemorySchema(db);

const proposal = (overrides = {}) => ({
  taskId: 'task_memory_a', traceId: 'trace_memory_a', sourceRoleId: 'AI-09',
  projectId: 'wejdan-life-os', scopeKind: 'agent', roleId: 'AI-09',
  key: 'workflow.revision', content: 'A revision must resolve the named reviewer findings.',
  evidenceRefs: ['ops/agent-acceptance/roles/AI-09/evidence.json'], confidence: 0.9,
  sensitivity: 'non_personal', ...overrides,
});

const first = proposeGovernedMemory(db, proposal());
assert.equal(first.status, 'PROPOSED');
assert.equal(retrieveGovernedMemory(db, { roleId: 'AI-09' }).agent.length, 0, 'unreviewed memory is never retrieved');
assert.throws(() => reviewGovernedMemory(db, first.record_id, {}), /INVALID_MEMORY_DECISION/);
const approved = reviewGovernedMemory(db, first.record_id, { decision: 'approved', note: 'Synthetic evidence reviewed.' });
assert.equal(approved.status, 'APPROVED');
assert.equal(retrieveGovernedMemory(db, { roleId: 'AI-09' }).agent[0].record_id, first.record_id);
assert.equal(retrieveGovernedMemory(db, { roleId: 'AI-12' }).agent.length, 0, 'private role memory is isolated');

const project = proposeGovernedMemory(db, proposal({ taskId: 'task_memory_b', traceId: 'trace_memory_b', sourceRoleId: 'AI-12', scopeKind: 'project', roleId: null, key: 'project.approval', content: 'Memory updates require explicit owner approval.', evidenceRefs: ['agents/governance/IMPROVEMENT_LOOP.md#stage'] }));
reviewGovernedMemory(db, project.record_id, { decision: 'approved' });
assert.equal(retrieveGovernedMemory(db, { roleId: 'AI-12' }).project[0].record_id, project.record_id, 'approved project memory is shared');

const conflict = proposeGovernedMemory(db, proposal({ content: 'A revision may repeat the original draft.' }));
assert.throws(() => reviewGovernedMemory(db, conflict.record_id, { decision: 'approved' }), /MEMORY_CONFLICT_REQUIRES_EXPLICIT_SUPERSESSION/);
assert.equal(retrieveGovernedMemory(db, { roleId: 'AI-09' }).agent.length, 0, 'conflicting approved records fail closed');
const resolution = proposeGovernedMemory(db, proposal({ content: 'Revisions must resolve review findings and retain the previous version.', supersedesRecordId: first.record_id }));
reviewGovernedMemory(db, resolution.record_id, { decision: 'approved', note: 'Explicitly resolves conflicting version.' });
assert.equal(listGovernedMemory(db, { scopeKind: 'agent', roleId: 'AI-09' }).find(record => record.record_id === first.record_id).status, 'SUPERSEDED');
assert.equal(retrieveGovernedMemory(db, { roleId: 'AI-09' }).agent[0].record_id, resolution.record_id);

assert.throws(() => proposeGovernedMemory(db, proposal({ sensitivity: 'personal' })), /PERSONAL_OR_SENSITIVE_MEMORY_NOT_ALLOWED/);
assert.throws(() => proposeGovernedMemory(db, proposal({ scopeKind: 'agent', roleId: 'AI-12', sourceRoleId: 'AI-09' })), /AGENT_MEMORY_SOURCE_ROLE_SCOPE_MISMATCH/);
assert.throws(() => proposeGovernedMemory(db, proposal({ evidenceRefs: [] })), /MEMORY_EVIDENCE_REQUIRED/);
assert.throws(() => proposeGovernedMemory(db, proposal({ taskId: 'task_memory_b' })), /MEMORY_SOURCE_TASK_NOT_FOUND_OR_MISMATCHED/);
assert.throws(() => proposeGovernedMemory(db, proposal({ content: 'x'.repeat(6001) })), /INVALID_MEMORY_CONTENT/);

const auditBeforeDelete = listGovernedMemoryAudit(db, resolution.record_id);
assert.equal(auditBeforeDelete.some(event => event.action === 'approved'), true);
assert.throws(() => deleteGovernedMemory(db, resolution.record_id), /EXPLICIT_OWNER_MEMORY_DELETE_REQUIRED/);
deleteGovernedMemory(db, resolution.record_id, { explicitOwnerAction: true });
assert.equal(listGovernedMemory(db, { scopeKind: 'agent', roleId: 'AI-09' }).some(record => record.record_id === resolution.record_id), false);
assert.equal(listGovernedMemoryAudit(db, resolution.record_id).some(event => event.action === 'deleted'), true);
assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');

console.log(JSON.stringify({result:'PASS',suite:'in-memory-synthetic-agent-project-memory',checks:['proposed memory not retrieved before review','role-private read isolation','approved shared project memory','source task/trace/role provenance','sensitive data rejection','evidence required','conflict blocks retrieval until explicit supersession','version retention and supersession','owner-only delete with audit','SQLite integrity'],live_inference:false,paid_calls:0,external_actions:0}));
db.close();
