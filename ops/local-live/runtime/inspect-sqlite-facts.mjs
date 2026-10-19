import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

const path = process.argv[2];
if (!path) throw new Error('USAGE: node inspect-sqlite-facts.mjs <sqlite-path>');
const db = new DatabaseSync(resolve(path), { readOnly: true });
const facts = {
  integrity: db.prepare('PRAGMA integrity_check').get().integrity_check,
  tasks: db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n,
  steps: db.prepare('SELECT COUNT(*) AS n FROM task_steps').get().n,
  memory: db.prepare('SELECT COUNT(*) AS n FROM task_memory').get().n,
  active: db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE status IN ('queued','running','cancel_requested','reviewing')").get().n,
  codex: db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE provider='codex-subscription'").get().n,
  guard: Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name='deny_codex_pending_approval'").get()),
};
db.close();
process.stdout.write(`${JSON.stringify(facts)}\n`);
