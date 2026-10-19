import { randomUUID } from 'node:crypto';

const ROLE_ID = /^[A-Z]{1,8}(?:-[A-Z0-9]{1,8}){0,2}$/;
const KEY = /^[a-z0-9][a-z0-9._-]{0,127}$/i;
const TASK_ID = /^task_[a-zA-Z0-9_-]{1,96}$/;
const TRACE_ID = /^trace_[a-zA-Z0-9_-]{1,96}$/;
const PROJECT_ID = 'wejdan-life-os';
const MAX_ITEM_CHARS = 6000;
const MAX_SCOPE_CHARS = 64000;

export function ensureGovernedMemorySchema(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS governed_memory (
    record_id TEXT PRIMARY KEY, task_id TEXT NOT NULL, trace_id TEXT NOT NULL,
    memory_key TEXT NOT NULL, version INTEGER NOT NULL, content TEXT NOT NULL,
    source_json TEXT NOT NULL, conflict_state TEXT NOT NULL DEFAULT 'clear',
    supersedes_record_id TEXT, created_at TEXT NOT NULL,
    UNIQUE(task_id,memory_key,version),
    FOREIGN KEY(task_id) REFERENCES tasks(task_id)
  );
  CREATE INDEX IF NOT EXISTS governed_memory_task_key ON governed_memory(task_id,memory_key,version);
  CREATE INDEX IF NOT EXISTS governed_memory_trace ON governed_memory(task_id,trace_id);
  CREATE TABLE IF NOT EXISTS agent_project_memory (
    record_id TEXT PRIMARY KEY,
    scope_kind TEXT NOT NULL CHECK(scope_kind IN ('agent','project')),
    project_id TEXT NOT NULL,
    role_id TEXT,
    memory_key TEXT NOT NULL,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    source_task_id TEXT NOT NULL,
    source_trace_id TEXT NOT NULL,
    source_role_id TEXT NOT NULL,
    evidence_refs_json TEXT NOT NULL,
    confidence REAL NOT NULL,
    sensitivity TEXT NOT NULL CHECK(sensitivity='non_personal'),
    status TEXT NOT NULL CHECK(status IN ('PROPOSED','APPROVED','SUPERSEDED','REJECTED')),
    conflict_state TEXT NOT NULL DEFAULT 'clear' CHECK(conflict_state IN ('clear','needs_review')),
    supersedes_record_id TEXT,
    created_at TEXT NOT NULL,
    reviewed_at TEXT,
    reviewed_by TEXT,
    review_note TEXT,
    expires_at TEXT,
    UNIQUE(scope_kind,project_id,role_id,memory_key,version)
  );
  CREATE INDEX IF NOT EXISTS agent_project_memory_scope_lookup
    ON agent_project_memory(scope_kind,project_id,role_id,status,conflict_state,memory_key,version);
  CREATE INDEX IF NOT EXISTS agent_project_memory_source
    ON agent_project_memory(source_task_id,source_trace_id);
  CREATE TABLE IF NOT EXISTS governed_memory_audit (
    audit_id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    task_id TEXT,
    trace_id TEXT,
    details_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS governed_memory_audit_record ON governed_memory_audit(record_id,created_at);`);
}

function validateScope(input) {
  if (input?.projectId !== PROJECT_ID) throw new Error('INVALID_MEMORY_PROJECT_SCOPE');
  if (input.scopeKind === 'agent') {
    if (typeof input.roleId !== 'string' || !ROLE_ID.test(input.roleId)) throw new Error('INVALID_MEMORY_ROLE_SCOPE');
    return { scopeKind: 'agent', projectId: PROJECT_ID, roleId: input.roleId };
  }
  if (input.scopeKind === 'project' && (input.roleId == null || input.roleId === '')) {
    return { scopeKind: 'project', projectId: PROJECT_ID, roleId: null };
  }
  throw new Error('INVALID_MEMORY_SCOPE');
}

function validateProposal(db, input) {
  if (!input || !TASK_ID.test(input.taskId || '') || !TRACE_ID.test(input.traceId || '')) throw new Error('INVALID_MEMORY_CORRELATION');
  if (typeof input.key !== 'string' || !KEY.test(input.key)) throw new Error('INVALID_MEMORY_KEY');
  if (typeof input.content !== 'string' || !input.content.trim() || input.content.length > MAX_ITEM_CHARS) throw new Error('INVALID_MEMORY_CONTENT');
  if (input.sensitivity !== 'non_personal') throw new Error('PERSONAL_OR_SENSITIVE_MEMORY_NOT_ALLOWED');
  if (typeof input.confidence !== 'number' || !Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) throw new Error('INVALID_MEMORY_CONFIDENCE');
  const refs = input.evidenceRefs;
  if (!Array.isArray(refs) || refs.length < 1 || refs.length > 20 || refs.some(ref => typeof ref !== 'string' || !ref.trim() || ref.length > 500)) throw new Error('MEMORY_EVIDENCE_REQUIRED');
  const scope = validateScope(input);
  const task = db.prepare('SELECT task_id,trace_id,role_id,status FROM tasks WHERE task_id=?').get(input.taskId);
  if (!task || task.trace_id !== input.traceId) throw new Error('MEMORY_SOURCE_TASK_NOT_FOUND_OR_MISMATCHED');
  const step = db.prepare('SELECT 1 AS ok FROM task_steps WHERE task_id=? AND trace_id=? AND role_id=? LIMIT 1').get(input.taskId, input.traceId, input.sourceRoleId);
  if (!ROLE_ID.test(input.sourceRoleId || '') || (task.role_id !== input.sourceRoleId && !step)) throw new Error('MEMORY_SOURCE_ROLE_NOT_IN_TASK_TRACE');
  if (task.status !== 'completed' && task.status !== 'approved') throw new Error('MEMORY_SOURCE_TASK_NOT_COMPLETED');
  if (scope.scopeKind === 'agent' && scope.roleId !== input.sourceRoleId) throw new Error('AGENT_MEMORY_SOURCE_ROLE_SCOPE_MISMATCH');
  const supersedesId = input.supersedesRecordId == null ? null : String(input.supersedesRecordId);
  if (supersedesId && !/^mem_[a-f0-9-]{36}$/i.test(supersedesId)) throw new Error('INVALID_SUPERSEDED_MEMORY_ID');
  if (input.expiresAt != null && (!Number.isFinite(Date.parse(input.expiresAt)) || Date.parse(input.expiresAt) <= Date.now())) throw new Error('INVALID_MEMORY_EXPIRY');
  return { ...scope, key: input.key.toLowerCase(), content: input.content.trim(), taskId: input.taskId, traceId: input.traceId, task, sourceRoleId: input.sourceRoleId, evidenceRefs: [...new Set(refs.map(ref => ref.trim()))], confidence: input.confidence, expiresAt: input.expiresAt || null, supersedesId };
}

function scopePredicate(scopeKind, projectId, roleId) {
  return scopeKind === 'agent'
    ? { sql: "scope_kind='agent' AND project_id=? AND role_id=?", args: [projectId, roleId] }
    : { sql: "scope_kind='project' AND project_id=? AND role_id IS NULL", args: [projectId] };
}

function recordFromRow(row) {
  if (!row) return row;
  return {
    record_id: row.record_id, scope_kind: row.scope_kind, project_id: row.project_id,
    role_id: row.role_id, memory_key: row.memory_key, version: row.version,
    content: row.content, source: { task_id: row.source_task_id, trace_id: row.source_trace_id, role_id: row.source_role_id, evidence_refs: JSON.parse(row.evidence_refs_json) },
    confidence: row.confidence, sensitivity: row.sensitivity, status: row.status,
    conflict_state: row.conflict_state, supersedes_record_id: row.supersedes_record_id,
    created_at: row.created_at, reviewed_at: row.reviewed_at, reviewed_by: row.reviewed_by,
    review_note: row.review_note, expires_at: row.expires_at,
  };
}

function audit(db, recordId, action, actor, details, taskId = null, traceId = null) {
  db.prepare('INSERT INTO governed_memory_audit(audit_id,record_id,action,actor,task_id,trace_id,details_json,created_at) VALUES(?,?,?,?,?,?,?,?)')
    .run(`maud_${randomUUID()}`, recordId, action, actor, taskId, traceId, JSON.stringify(details || {}), new Date().toISOString());
}

export function proposeGovernedMemory(db, input) {
  const packet = validateProposal(db, input);
  const scope = scopePredicate(packet.scopeKind, packet.projectId, packet.roleId);
  const total = db.prepare(`SELECT COALESCE(SUM(length(content)),0) AS chars FROM agent_project_memory WHERE ${scope.sql} AND status IN ('PROPOSED','APPROVED')`).get(...scope.args).chars;
  if (total + packet.content.length > MAX_SCOPE_CHARS) throw new Error('MEMORY_SCOPE_LIMIT_EXCEEDED');
  const latest = db.prepare(`SELECT * FROM agent_project_memory WHERE ${scope.sql} AND memory_key=? ORDER BY version DESC LIMIT 1`).get(...scope.args, packet.key);
  if (latest?.content === packet.content && latest.status === 'APPROVED' && latest.conflict_state === 'clear') {
    audit(db, latest.record_id, 'duplicate_proposal_ignored', 'owner', { source_task_id: packet.taskId }, packet.taskId, packet.traceId);
    return { ...recordFromRow(latest), unchanged: true };
  }
  if (packet.supersedesId) {
    const superseded = db.prepare(`SELECT * FROM agent_project_memory WHERE record_id=? AND ${scope.sql}`).get(packet.supersedesId, ...scope.args);
    if (!superseded || superseded.status !== 'APPROVED' || superseded.memory_key !== packet.key) throw new Error('INVALID_MEMORY_SUPERSESSION_TARGET');
  }
  const version = (latest?.version || 0) + 1;
  const now = new Date().toISOString();
  const id = `mem_${randomUUID()}`;
  db.prepare(`INSERT INTO agent_project_memory(record_id,scope_kind,project_id,role_id,memory_key,version,content,source_task_id,source_trace_id,source_role_id,evidence_refs_json,confidence,sensitivity,status,conflict_state,supersedes_record_id,created_at,expires_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'PROPOSED','clear',?,?,?)`)
    .run(id, packet.scopeKind, packet.projectId, packet.roleId, packet.key, version, packet.content, packet.taskId, packet.traceId, packet.sourceRoleId, JSON.stringify(packet.evidenceRefs), packet.confidence, 'non_personal', packet.supersedesId, now, packet.expiresAt);
  audit(db, id, 'proposed', 'owner', { scope_kind: packet.scopeKind, memory_key: packet.key, version }, packet.taskId, packet.traceId);
  return { ...recordFromRow(db.prepare('SELECT * FROM agent_project_memory WHERE record_id=?').get(id)), unchanged: false };
}

export function reviewGovernedMemory(db, recordId, { decision, note = '', actor = 'owner' } = {}) {
  if (!/^mem_[a-f0-9-]{36}$/i.test(recordId || '')) throw new Error('INVALID_MEMORY_ID');
  if (decision !== 'approved' && decision !== 'rejected') throw new Error('INVALID_MEMORY_DECISION');
  const row = db.prepare('SELECT * FROM agent_project_memory WHERE record_id=?').get(recordId);
  if (!row) throw new Error('MEMORY_RECORD_NOT_FOUND');
  if (row.status !== 'PROPOSED') throw new Error('MEMORY_RECORD_ALREADY_REVIEWED');
  const now = new Date().toISOString();
  if (decision === 'approved') {
    const scope = scopePredicate(row.scope_kind, row.project_id, row.role_id);
    const existing = db.prepare(`SELECT * FROM agent_project_memory WHERE ${scope.sql} AND memory_key=? AND status='APPROVED' AND record_id<>?`).all(...scope.args, row.memory_key, row.record_id);
    const target = row.supersedes_record_id ? existing.find(item => item.record_id === row.supersedes_record_id) : null;
    if (existing.length && !target) {
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare(`UPDATE agent_project_memory SET conflict_state='needs_review' WHERE record_id=?`).run(row.record_id);
        for (const item of existing) if (item.content !== row.content) db.prepare(`UPDATE agent_project_memory SET conflict_state='needs_review' WHERE record_id=?`).run(item.record_id);
        db.prepare(`UPDATE agent_project_memory SET reviewed_at=?,reviewed_by=?,review_note=? WHERE record_id=?`).run(now, actor, String(note).slice(0,1000), row.record_id);
        audit(db, row.record_id, 'conflict_detected', actor, { conflicting_record_ids: existing.filter(item => item.content !== row.content).map(item => item.record_id) });
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      throw new Error('MEMORY_CONFLICT_REQUIRES_EXPLICIT_SUPERSESSION');
    }
    db.exec('BEGIN IMMEDIATE');
    try {
      if (target) {
        for (const item of existing) {
          db.prepare(`UPDATE agent_project_memory SET status='SUPERSEDED',conflict_state='clear',reviewed_at=?,reviewed_by=?,review_note=? WHERE record_id=?`).run(now, actor, `Superseded by ${row.record_id}`, item.record_id);
          audit(db, item.record_id, 'superseded', actor, { superseded_by: row.record_id, explicitly_resolved_by: target.record_id });
        }
      }
      db.prepare(`UPDATE agent_project_memory SET status='APPROVED',conflict_state='clear',reviewed_at=?,reviewed_by=?,review_note=? WHERE record_id=? AND status='PROPOSED'`).run(now, actor, String(note).slice(0,1000), row.record_id);
      audit(db, row.record_id, 'approved', actor, { note: String(note).slice(0,1000) });
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  } else {
    db.prepare(`UPDATE agent_project_memory SET status='REJECTED',reviewed_at=?,reviewed_by=?,review_note=? WHERE record_id=? AND status='PROPOSED'`).run(now, actor, String(note).slice(0,1000), row.record_id);
    audit(db, row.record_id, 'rejected', actor, { note: String(note).slice(0,1000) });
  }
  return recordFromRow(db.prepare('SELECT * FROM agent_project_memory WHERE record_id=?').get(row.record_id));
}

export function retrieveGovernedMemory(db, { roleId, projectId = PROJECT_ID, limitAgent = 10, limitProject = 20 } = {}) {
  if (projectId !== PROJECT_ID || !ROLE_ID.test(roleId || '')) throw new Error('INVALID_MEMORY_RETRIEVAL_SCOPE');
  const now = new Date().toISOString();
  const agent = db.prepare(`SELECT * FROM agent_project_memory WHERE scope_kind='agent' AND project_id=? AND role_id=? AND status='APPROVED' AND conflict_state='clear' AND (expires_at IS NULL OR expires_at>?) ORDER BY reviewed_at DESC,version DESC LIMIT ?`).all(projectId, roleId, now, Math.max(0, Math.min(20, limitAgent)));
  const shared = db.prepare(`SELECT * FROM agent_project_memory WHERE scope_kind='project' AND project_id=? AND status='APPROVED' AND conflict_state='clear' AND (expires_at IS NULL OR expires_at>?) ORDER BY reviewed_at DESC,version DESC LIMIT ?`).all(projectId, now, Math.max(0, Math.min(30, limitProject)));
  return { role_id: roleId, project_id: projectId, agent: agent.map(recordFromRow), project: shared.map(recordFromRow) };
}

export function listGovernedMemory(db, { scopeKind, roleId = null, status = null, limit = 100 } = {}) {
  if (!['agent','project'].includes(scopeKind) || (scopeKind === 'agent' && !ROLE_ID.test(roleId || ''))) throw new Error('INVALID_MEMORY_LIST_SCOPE');
  const scope = scopePredicate(scopeKind, PROJECT_ID, scopeKind === 'agent' ? roleId : null);
  const states = ['PROPOSED','APPROVED','SUPERSEDED','REJECTED'];
  if (status && !states.includes(status)) throw new Error('INVALID_MEMORY_STATUS_FILTER');
  const statusClause = status ? ' AND status=?' : '';
  const args = [...scope.args, ...(status ? [status] : []), Math.max(1, Math.min(500, Number.isInteger(limit) ? limit : 100))];
  return db.prepare(`SELECT * FROM agent_project_memory WHERE ${scope.sql}${statusClause} ORDER BY created_at DESC LIMIT ?`).all(...args).map(recordFromRow);
}

export function deleteGovernedMemory(db, recordId, { explicitOwnerAction = false, actor = 'owner' } = {}) {
  if (explicitOwnerAction !== true) throw new Error('EXPLICIT_OWNER_MEMORY_DELETE_REQUIRED');
  if (!/^mem_[a-f0-9-]{36}$/i.test(recordId || '')) throw new Error('INVALID_MEMORY_ID');
  const row = db.prepare('SELECT * FROM agent_project_memory WHERE record_id=?').get(recordId);
  if (!row) throw new Error('MEMORY_RECORD_NOT_FOUND');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM governed_memory_audit WHERE record_id=?').run(recordId);
    db.prepare('DELETE FROM agent_project_memory WHERE record_id=?').run(recordId);
    const auditId = `maud_${randomUUID()}`;
    db.prepare('INSERT INTO governed_memory_audit(audit_id,record_id,action,actor,task_id,trace_id,details_json,created_at) VALUES(?,?,?,?,?,?,?,?)')
      .run(auditId, recordId, 'deleted', actor, row.source_task_id, row.source_trace_id, JSON.stringify({ scope_kind: row.scope_kind, project_id: row.project_id, role_id: row.role_id, memory_key: row.memory_key }), new Date().toISOString());
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return { record_id: recordId, deleted: true, explicit_owner_action: true };
}

export function listGovernedMemoryAudit(db, recordId) {
  if (!/^mem_[a-f0-9-]{36}$/i.test(recordId || '')) throw new Error('INVALID_MEMORY_ID');
  return db.prepare('SELECT audit_id,record_id,action,actor,task_id,trace_id,details_json,created_at FROM governed_memory_audit WHERE record_id=? ORDER BY created_at,audit_id').all(recordId).map(row => ({ ...row, details: JSON.parse(row.details_json), details_json: undefined }));
}

// Retained task-scoped memory API for existing task exports and lifecycle.
export function saveGovernedTaskMemory(db, input) {
  if (!input || !TASK_ID.test(input.taskId || '') || !TRACE_ID.test(input.traceId || '') || typeof input.key !== 'string' || !KEY.test(input.key) || typeof input.content !== 'string' || !input.content.trim()) throw new Error('INVALID_MEMORY_PACKET');
  if (input.content.length > 24000) throw new Error('INVALID_MEMORY_CONTENT');
  const source = input.source;
  if (!source || !ROLE_ID.test(source.roleId || '') || typeof source.provider !== 'string' || !source.provider || typeof source.stage !== 'string' || !source.stage) throw new Error('MEMORY_PROVENANCE_REQUIRED');
  const key = input.key.toLowerCase();
  const total = db.prepare('SELECT COALESCE(SUM(length(content)),0) AS chars FROM governed_memory WHERE task_id=?').get(input.taskId).chars;
  if (total + input.content.length > 64000) throw new Error('TASK_MEMORY_LIMIT_EXCEEDED');
  const latest = db.prepare('SELECT * FROM governed_memory WHERE task_id=? AND memory_key=? ORDER BY version DESC LIMIT 1').get(input.taskId, key);
  if (latest?.content === input.content.trim()) return { ...latest, source: JSON.parse(latest.source_json), unchanged: true };
  const version = (latest?.version || 0) + 1;
  const conflict = Boolean(latest && latest.content.trim() !== input.content.trim());
  const createdAt = input.createdAt || new Date().toISOString();
  const id = `mem_${randomUUID()}`;
  if (conflict) db.prepare("UPDATE governed_memory SET conflict_state='needs_review' WHERE record_id=?").run(latest.record_id);
  const sourceRecord={role_id:source.roleId,provider:source.provider,model:source.model||null,stage:source.stage,evidence_refs:Array.isArray(source.evidenceRefs)?source.evidenceRefs.slice(0,20):[]};
  db.prepare('INSERT INTO governed_memory(record_id,task_id,trace_id,memory_key,version,content,source_json,conflict_state,supersedes_record_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,input.taskId,input.traceId,key,version,input.content.trim(),JSON.stringify(sourceRecord),conflict?'needs_review':'clear',latest?.record_id||null,createdAt);
  return {record_id:id,task_id:input.taskId,trace_id:input.traceId,memory_key:key,version,content:input.content.trim(),source:sourceRecord,conflict_state:conflict?'needs_review':'clear',supersedes_record_id:latest?.record_id||null,created_at:createdAt,unchanged:false};
}

export function saveGovernedMemory(db, input) { return saveGovernedTaskMemory(db, input); }

export function previewGovernedMemory(db, taskId) {
  if (!TASK_ID.test(taskId || '')) throw new Error('INVALID_MEMORY_TASK_ID');
  return db.prepare('SELECT record_id,task_id,trace_id,memory_key,version,content,source_json,conflict_state,supersedes_record_id,created_at FROM governed_memory WHERE task_id=? ORDER BY memory_key,version').all(taskId).map(row => ({...row,source:JSON.parse(row.source_json),source_json:undefined}));
}

export function exportGovernedMemory(db, taskId) {
  return { schema_version: 'governed-task-memory-export.v1', task_id: taskId, retention: 'manual owner deletion; no automatic TTL', records: previewGovernedMemory(db, taskId) };
}

export function deleteGovernedMemoryForTask(db, taskId, { explicitOwnerAction = false } = {}) {
  if (explicitOwnerAction !== true) throw new Error('EXPLICIT_OWNER_MEMORY_DELETE_REQUIRED');
  if (!TASK_ID.test(taskId || '')) throw new Error('INVALID_MEMORY_TASK_ID');
  const ids = db.prepare('SELECT record_id FROM agent_project_memory WHERE source_task_id=?').all(taskId).map(row => row.record_id);
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const id of ids) {
      db.prepare('DELETE FROM governed_memory_audit WHERE record_id=?').run(id);
      db.prepare('DELETE FROM agent_project_memory WHERE record_id=?').run(id);
    }
    const taskDeleted = db.prepare('DELETE FROM governed_memory WHERE task_id=?').run(taskId).changes;
    const hasSessionMemory = db.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='task_memory'").get();
    const sessionDeleted = hasSessionMemory ? db.prepare('DELETE FROM task_memory WHERE task_id=?').run(taskId).changes : 0;
    db.exec('COMMIT');
    return { task_id: taskId, deleted_records: taskDeleted + sessionDeleted + ids.length, explicit_owner_action: true };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
