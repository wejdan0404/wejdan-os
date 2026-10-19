import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

const [sourceArg, targetArg] = process.argv.slice(2);
if (!sourceArg || !targetArg) throw new Error('USAGE: snapshot-local-db.mjs <source> <new-target>');
const source = resolve(sourceArg);
const target = resolve(targetArg);
const db = new DatabaseSync(source);
const facts = connection => ({
  integrity: connection.prepare('PRAGMA integrity_check').get().integrity_check,
  tasks: connection.prepare('SELECT COUNT(*) AS n FROM tasks').get().n,
  steps: connection.prepare('SELECT COUNT(*) AS n FROM task_steps').get().n,
  memory: connection.prepare('SELECT COUNT(*) AS n FROM task_memory').get().n,
  active: connection.prepare("SELECT COUNT(*) AS n FROM tasks WHERE status IN ('queued','running','cancel_requested','reviewing')").get().n,
  codex: connection.prepare("SELECT COUNT(*) AS n FROM tasks WHERE provider='codex-subscription'").get().n,
  guard: Boolean(connection.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name='deny_codex_pending_approval'").get()),
});
const before = facts(db);
if (before.integrity !== 'ok' || before.active !== 0 || before.codex !== 0 || !before.guard) {
  db.close();
  throw new Error(`SNAPSHOT_PRECONDITION_FAILED:${JSON.stringify(before)}`);
}
db.exec(`VACUUM INTO '${target.replaceAll("'", "''")}'`);
db.close();
const snapshot = new DatabaseSync(target, { readOnly: true });
const after = facts(snapshot);
snapshot.close();
if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error(`SNAPSHOT_FACTS_MISMATCH:${JSON.stringify({ before, after })}`);
process.stdout.write(`${JSON.stringify({ result: 'PASS', source, target, facts: after })}\n`);
