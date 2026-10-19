import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('ops/local-live/data/wejdan-local.sqlite');
try {
  db.exec('BEGIN IMMEDIATE');
  const active = db.prepare("SELECT COUNT(*) AS count FROM tasks WHERE status IN ('queued','running','cancel_requested')").get().count;
  if (active !== 0) throw new Error('ACTIVE_TASKS_PRESENT_REFUSE_INTERLOCK_CHANGE');
  db.exec(`CREATE TRIGGER IF NOT EXISTS deny_codex_pending_approval
    BEFORE INSERT ON tasks
    WHEN NEW.provider = 'codex-subscription'
    BEGIN
      SELECT RAISE(ABORT, 'CODEX_APP_LIVE_APPROVAL_REQUIRED');
    END;`);
  db.exec('COMMIT');
  const installed = db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='trigger' AND name='deny_codex_pending_approval'").get().count;
  if (installed !== 1) throw new Error('CODEX_INTERLOCK_NOT_INSTALLED');
  let blocked = false;
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare("INSERT INTO tasks(task_id,trace_id,role_id,input,status,created_at,provider) VALUES('task_interlock_probe','trace_interlock_probe','D-00','synthetic-only probe','queued',datetime('now'),'codex-subscription')").run();
  } catch (error) {
    if (String(error.message).includes('CODEX_APP_LIVE_APPROVAL_REQUIRED')) blocked = true;
    else throw error;
  } finally { db.exec('ROLLBACK'); }
  if (!blocked) throw new Error('CODEX_INTERLOCK_PROBE_WAS_NOT_BLOCKED');
  const count = db.prepare("SELECT COUNT(*) AS count FROM tasks WHERE provider='codex-subscription'").get().count;
  if (count !== 0) throw new Error('UNEXPECTED_CODEX_TASK_ROW');
  const integrity = db.prepare('PRAGMA integrity_check').get().integrity_check;
  if (integrity !== 'ok') throw new Error(`SQLITE_INTEGRITY_FAILED:${integrity}`);
  console.log(JSON.stringify({ result: 'PASS', interlock: 'deny_codex_pending_approval', probe: 'blocked-before-row-creation', existing_codex_rows: count, active_tasks_before_change: active, integrity, purpose: 'temporary safety interlock until restarted API source is verified; remove only after LL10 authorization and source-level dispatch gate validation' }));
} finally { db.close(); }
