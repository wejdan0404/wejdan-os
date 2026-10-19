import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw new Error('USAGE: node snapshot-sqlite.mjs <source> <destination>');
const sourceDb = new DatabaseSync(resolve(source));
sourceDb.exec(`VACUUM INTO '${resolve(destination).replaceAll("'", "''")}'`);
sourceDb.close();
const snapshot = new DatabaseSync(resolve(destination), { readOnly: true });
const integrity = snapshot.prepare('PRAGMA integrity_check').get().integrity_check;
const tasks = snapshot.prepare('SELECT COUNT(*) AS count FROM tasks').get().count;
snapshot.close();
if (integrity !== 'ok') throw new Error(`SNAPSHOT_INTEGRITY_FAILED:${integrity}`);
console.log(JSON.stringify({ result: 'PASS', integrity, task_count: tasks }));
