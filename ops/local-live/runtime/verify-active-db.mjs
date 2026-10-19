import { DatabaseSync } from 'node:sqlite';

const api = await fetch('http://127.0.0.1:8766/api/tasks').then(response => response.json());
const db = new DatabaseSync('ops/local-live/data/wejdan-local.sqlite', { readOnly: true });
const firstTaskId = api.tasks[0]?.task_id;
const matchCount = firstTaskId ? db.prepare('SELECT COUNT(*) AS count FROM tasks WHERE task_id=?').get(firstTaskId).count : 0;
const activeCount = db.prepare("SELECT COUNT(*) AS count FROM tasks WHERE status IN ('queued','running','cancel_requested')").get().count;
const grouped = db.prepare('SELECT status,provider,COUNT(*) AS count FROM tasks GROUP BY status,provider ORDER BY status,provider').all();
const dbCount = db.prepare('SELECT COUNT(*) AS count FROM tasks').get().count;
db.close();
if (matchCount !== 1) throw new Error('API_DATABASE_PATH_NOT_CONFIRMED');
if (activeCount !== 0) throw new Error('ACTIVE_TASKS_PRESENT_REFUSE_TRIGGER_INSTALL');
console.log(JSON.stringify({ result: 'PASS', api_rows_returned: api.tasks.length, api_first_task_matches_database: true, database_task_count: dbCount, grouped, active_count: activeCount }));
