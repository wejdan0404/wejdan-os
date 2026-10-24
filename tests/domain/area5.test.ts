/**
 * QA area 5 (Me · inbox · notes · search · sources · settings) — domain-side fixes.
 */
import { describe, expect, it } from 'vitest';
import { InMemoryLifeRepository, arDayLabel, createLifeStore, mkDate, type LifeStore } from '../../src/domain';
import { library } from './helpers';

interface Ctx {
  store: LifeStore;
  repo: InMemoryLifeRepository;
  advance: (ms: number) => void;
}

async function freshStore(at: Date = mkDate(2026, 10, 5, 8)): Promise<Ctx> {
  let now = at;
  const repo = new InMemoryLifeRepository();
  const store = await createLifeStore({ repo, now: () => now, library });
  return { store, repo, advance: (ms) => (now = new Date(now.getTime() + ms)) };
}

describe('inbox → note (#1)', () => {
  it('creates a real note that keeps the link, and undo removes the note and restores the item', async () => {
    const { store } = await freshStore();
    const s = () => store.getSnapshot();
    const item = await store.quickAdd('test', 'link', { url: 'https://example.com/test' });
    const { result, undo } = await store.convertInboxWithUndo(item.id, 'note');
    expect(result).not.toBeNull();
    const note = s().notes.find((n) => n.id === result!.id)!;
    expect(note).toMatchObject({ title: 'test', tag: 'reference' });
    expect(note.body).toContain('https://example.com/test');
    expect(s().inbox.find((x) => x.id === item.id)).toMatchObject({ archived: true, convertedTo: { type: 'note', id: note.id } });

    expect(undo).not.toBeNull();
    expect(await store.undoDelete(undo!.token)).toBe(true);
    expect(s().notes.some((n) => n.id === note.id)).toBe(false);
    const back = s().inbox.find((x) => x.id === item.id)!;
    expect(back.archived).toBe(false);
    expect(back.convertedTo ?? null).toBeNull();
  });

  it('a plain text item becomes a «note»-tagged note without an empty link line', async () => {
    const { store } = await freshStore();
    const item = await store.quickAdd('test');
    const n = (await store.convertInbox(item.id, 'note')) as { tag: string; body: string };
    expect(n.tag).toBe('note');
    expect(n.body).toBe('');
  });
});

describe('search (#9)', () => {
  it('does not list an inbox item twice once it became a task / note', async () => {
    const { store } = await freshStore();
    const item = await store.quickAdd('test مراجعة');
    expect(store.search('مراجعة').groups.flatMap((g) => g.results).filter((r) => r.kind === 'inbox')).toHaveLength(1);
    await store.convertInbox(item.id, 'task');
    const hits = store.search('مراجعة').groups.flatMap((g) => g.results);
    expect(hits.filter((r) => r.kind === 'inbox')).toHaveLength(0);
    expect(hits.filter((r) => r.kind === 'task')).toHaveLength(1);
  });
});

describe('sources: remove a failed / discarded row (#20)', () => {
  it('removes a failed source with undo; refuses a source still in review', async () => {
    const { store } = await freshStore();
    const s = () => store.getSnapshot();
    const bad = await store.startImport('test.png', 'xx');
    expect(bad.ok).toBe(false);
    const tok = await store.removeSource(bad.source.id);
    expect(tok).not.toBeNull();
    expect(s().sources.some((x) => x.id === bad.source.id)).toBe(false);
    expect(await store.undoDelete(tok!.token)).toBe(true);
    expect(s().sources.find((x) => x.id === bad.source.id)!.status).toBe('failed');

    const ok = await store.startImport('test.md', '- test');
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(await store.removeSource(ok.source.id)).toBeNull();
    expect(s().sources.some((x) => x.id === ok.source.id)).toBe(true);
    // once discarded it has nothing left to review → can be removed
    await store.discardImport(ok.batch.id);
    expect(await store.removeSource(ok.source.id)).not.toBeNull();
    expect(s().sources.some((x) => x.id === ok.source.id)).toBe(false);
  });

  it('never removes a source whose items were added', async () => {
    const { store } = await freshStore();
    const ok = await store.startImport('test.md', '- test');
    if (!ok.ok) throw new Error('import failed');
    await store.decideAll(ok.batch.id, 'approved');
    await store.commitImport(ok.batch.id);
    expect(await store.removeSource(ok.source.id)).toBeNull();
  });
});

describe('backups (#11)', () => {
  it('the safety copy taken before a restore is labelled before-restore, not before-import', async () => {
    const { store, repo, advance } = await freshStore();
    await store.quickAdd('test');
    const manual = await repo.createBackup('manual', mkDate(2026, 10, 5, 8));
    advance(60_000);
    await store.restoreBackup(manual.id);
    const reasons = (await store.listBackups()).map((b) => b.reason);
    expect(reasons).toContain('before-restore');
    expect(reasons).not.toContain('before-import');
  });
});

describe('import conflicts speak Arabic dates (#3)', () => {
  it('formats ISO days as Arabic day + month + year', () => {
    expect(arDayLabel('2026-11-20')).toMatch(/20/);
    expect(arDayLabel('2026-11-20')).toMatch(/نوفمبر/);
    expect(arDayLabel('2026-11-20')).not.toContain('2026-11-20');
    expect(arDayLabel('not a date')).toBe('not a date');
  });

  it('conflict details never show raw ISO dates', async () => {
    const { store } = await freshStore();
    await store.addTask({ title: 'test', dueDate: '2026-11-05' });
    const csv = ['title,type,date', 'test,task,2026-11-02', 'test ثاني,task,2026-11-02', 'test ثاني,task,2026-12-01'].join('\n');
    const res = await store.startImport('test.csv', csv);
    if (!res.ok) throw new Error('import failed');
    const details = res.batch.candidates.flatMap((c) => c.matches.map((m) => m.detail));
    expect(details.length).toBeGreaterThan(0);
    for (const d of details) expect(d).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(details.some((d) => d.startsWith('بالملف'))).toBe(true);
  });
});
