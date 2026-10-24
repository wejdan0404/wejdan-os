/**
 * Notes & decisions, global search, change log, sources & import review (E1).
 */
import { describe, expect, it } from 'vitest';
import {
  type LifeStore, InMemoryLifeRepository, ImportFileError, changesFor, createLifeStore, dayKey, decisions, failedSources,
  kMaxChangeLog, mkDate, needsReview, needsReviewCount, normalizeArabic, notesLinkedTo, notesView, parseImportFile,
  provenanceOf, readCsv, search, sourceReport, tasksForDay, todayView,
} from '../../src/domain';
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

// ---------------------------------------------------------------------------
describe('normalizeArabic', () => {
  it('strips tashkeel and tatweel, unifies alef / taa marbuta / alef maqsura, digits', () => {
    expect(normalizeArabic('مُـــدَرِّسَة')).toBe('مدرسه');
    expect(normalizeArabic('أحمد إبراهيم آمال')).toBe('احمد ابراهيم امال');
    expect(normalizeArabic('مستشفى')).toBe('مستشفي');
    expect(normalizeArabic('٢٠٢٦/١١')).toBe('2026 11');
    expect(normalizeArabic('  IELTS — Writing!  ')).toBe('ielts writing');
  });
});

// ---------------------------------------------------------------------------
describe('notes & decisions', () => {
  it('adds, edits, pins, links, deletes with undo; empty notes refused', async () => {
    const { store, advance } = await freshStore();
    expect(await store.addNote({ title: '  ', body: '' })).toBeNull();
    const a = await store.addNote({ title: 'فكرة للمحفظة', body: 'نبدأ بدراسة حالة' });
    advance(1000);
    const d = await store.addNote({ title: 'قرار: أوقف الكورس الثاني', isDecision: true, links: [{ kind: 'project', id: 'p1' }, { kind: 'project', id: 'p1' }] });
    expect(a && d).toBeTruthy();
    expect(d!.links).toHaveLength(1);
    let s = store.getSnapshot();
    expect(notesView(s).map((n) => n.id)).toEqual([d!.id, a!.id]);
    expect(decisions(s).map((n) => n.id)).toEqual([d!.id]);
    expect(notesLinkedTo(s, 'project', 'p1').map((n) => n.id)).toEqual([d!.id]);

    advance(1000);
    await store.setNotePinned(a!.id, true);
    s = store.getSnapshot();
    expect(notesView(s)[0].id).toBe(a!.id);
    await store.linkNote(a!.id, { kind: 'goal', id: 'g1' });
    await store.unlinkNote(d!.id, { kind: 'project', id: 'p1' });
    s = store.getSnapshot();
    expect(notesLinkedTo(s, 'goal', 'g1').map((n) => n.id)).toEqual([a!.id]);
    expect(notesLinkedTo(s, 'project', 'p1')).toEqual([]);

    const undo = await store.deleteNote(a!.id);
    expect(store.getSnapshot().notes.some((n) => n.id === a!.id)).toBe(false);
    expect(await store.undoDelete(undo!.token)).toBe(true);
    expect(store.getSnapshot().notes.some((n) => n.id === a!.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('global search', () => {
  it('matches across kinds with Arabic normalisation, ranks title hits first, groups results', async () => {
    const { store } = await freshStore();
    await store.addTask({ title: 'حجز موعد المدرسة', notes: '' });
    await store.addTask({ title: 'شراء دفتر', notes: 'للمدرسه الجديدة' });
    await store.addNote({ title: 'ملاحظات مقابلة', body: 'اسأل عن المدرسة' });
    await store.quickAdd('فكرة: مشروع مَدرَسة صيفية', 'idea');

    const r = store.search('مدرسة');
    expect(r.total).toBe(4);
    const tasks = r.groups.find((g) => g.kind === 'task')!;
    expect(tasks.label).toBe('المهام');
    // Title hit ranks above a notes/body hit.
    expect(tasks.results[0].title).toBe('حجز موعد المدرسة');
    expect(r.groups.map((g) => g.kind)).toEqual(expect.arrayContaining(['task', 'note', 'inbox']));

    // Multi-token: every token must match.
    expect(store.search('موعد مدرسه').total).toBe(1);
    expect(store.search('موعد بحر').total).toBe(0);
    // Diacritics / tatweel in the query.
    expect(store.search('المـــدْرَسة').total).toBe(4);
    expect(store.search('   ').groups).toEqual([]);
  });

  it('keeps done items findable but ranked lower; can exclude them; kinds filter', async () => {
    const { store } = await freshStore();
    const done = await store.addTask({ title: 'تقرير المشروع' });
    await store.completeTask(done.id);
    await store.addNote({ title: 'تقرير المشروع النهائي' });
    const r = store.search('تقرير');
    const all = r.groups.flatMap((g) => g.results);
    expect(all.find((x) => x.id === done.id)!.inactive).toBe(true);
    expect(search(store.getSnapshot(), 'تقرير', { includeInactive: false }).groups.flatMap((g) => g.results).some((x) => x.id === done.id)).toBe(false);
    expect(store.search('تقرير', { kinds: ['note'] }).groups.map((g) => g.kind)).toEqual(['note']);
  });
});

// ---------------------------------------------------------------------------
describe('change log', () => {
  it('logs edits and deletes, skips no-ops, restores old versions (and logs the restore)', async () => {
    const { store, advance } = await freshStore();
    const t = await store.addTask({ title: 'مسودة السيرة' });
    advance(10);
    await store.updateTask(t.id, { title: 'السيرة الذاتية النهائية' });
    advance(10);
    await store.updateTask(t.id, { notes: '' }); // no-op (notes already '') except updatedAt? → skipped only if identical JSON
    let s = store.getSnapshot();
    const hist = changesFor(s, 'task', t.id);
    expect(hist[hist.length - 1].op).toBe('create');
    const edit = hist.find((e) => e.op === 'update' && e.after?.['title'] === 'السيرة الذاتية النهائية')!;
    expect(edit.before?.['title']).toBe('مسودة السيرة');

    // Restore the old title.
    expect(await store.restoreChange(edit.id)).toBe(true);
    s = store.getSnapshot();
    expect(s.tasks.find((x) => x.id === t.id)!.title).toBe('مسودة السيرة');
    expect(changesFor(s, 'task', t.id)[0].op).toBe('restore');

    // Delete then restore from the log (after the undo window is long gone).
    await store.deleteTask(t.id);
    advance(60_000);
    s = store.getSnapshot();
    const del = changesFor(s, 'task', t.id).find((e) => e.op === 'delete')!;
    expect(await store.restoreChange(del.id)).toBe(true);
    expect(store.getSnapshot().tasks.some((x) => x.id === t.id)).toBe(true);
  });

  it('restoring a create removes the item; log is capped', async () => {
    const { store, advance } = await freshStore();
    const n = await store.addNote({ title: 'مؤقت' });
    const created = changesFor(store.getSnapshot(), 'note', n!.id).find((e) => e.op === 'create')!;
    expect(await store.restoreChange(created.id)).toBe(true);
    expect(store.getSnapshot().notes.some((x) => x.id === n!.id)).toBe(false);

    const t = await store.addTask({ title: 'عداد' });
    for (let i = 0; i < kMaxChangeLog + 20; i++) {
      advance(1);
      await store.updateTask(t.id, { title: `عداد ${i}` });
    }
    expect(store.getSnapshot().changeLog).toHaveLength(kMaxChangeLog);
  });
});

// ---------------------------------------------------------------------------
describe('export / import compatibility', () => {
  it('exports the new boxes; a schemaVersion 1 file without them imports and keeps them on the device', async () => {
    const { store } = await freshStore();
    await store.addNote({ title: 'تبقى' });
    const exp = await store.exportAll();
    for (const b of ['notes', 'changelog', 'sources', 'importBatches', 'provenance']) expect(exp.boxes).toHaveProperty(b);
    expect(exp.schemaVersion).toBe(1);
    const legacy = JSON.parse(JSON.stringify(exp)) as typeof exp;
    for (const b of ['notes', 'changelog', 'sources', 'importBatches', 'provenance']) delete legacy.boxes[b];
    const preview = await store.previewImport(legacy);
    expect(preview.ok).toBe(true);
    await store.importAll(legacy, { confirm: true });
    expect(store.getSnapshot().notes.map((n) => n.title)).toContain('تبقى');

    // Round trip with them restores notes exactly.
    const other = await freshStore();
    await other.store.importAll(exp, { confirm: true });
    expect(other.store.getSnapshot().notes.map((n) => n.title)).toEqual(['تبقى']);
  });
});

// ---------------------------------------------------------------------------
describe('parsers', () => {
  it('JSON: explicit types (Arabic/English, keyed lists); strings; ISO dates only', () => {
    const json = JSON.stringify({
      مهام: ['اتصل على المكتب', { عنوان: 'تجديد الهوية', التاريخ: '2026-11-02' }],
      ideas: [{ title: 'بودكاست عن التصميم' }],
      items: [{ title: 'موعد الأسنان', type: 'موعد', date: 'الثلاثاء الجاي' }, { title: 'شي غريب', type: 'xyz' }],
    });
    const p = parseImportFile('خطة.json', json);
    expect(p.kind).toBe('json');
    const byTitle = new Map(p.candidates.map((c) => [c.title, c]));
    expect(byTitle.get('اتصل على المكتب')!.type).toBe('task');
    expect(byTitle.get('اتصل على المكتب')!.typeExplicit).toBe(true);
    expect(byTitle.get('تجديد الهوية')!.date).toBe('2026-11-02');
    expect(byTitle.get('تجديد الهوية')!.sourceRef).toEqual({ file: 'خطة.json', location: 'مهام › عنصر 2' });
    expect(byTitle.get('بودكاست عن التصميم')!.type).toBe('idea');
    const appt = byTitle.get('موعد الأسنان')!;
    expect(appt.type).toBe('appointment');
    expect(appt.date).toBeNull();
    expect(appt.rawDate).toBe('الثلاثاء الجاي');
    expect(appt.missing).toContain('date');
    expect(byTitle.get('شي غريب')!.missing).toContain('type');
  });

  it('JSON: an app backup and broken JSON give clear Arabic errors naming the file', () => {
    expect(() => parseImportFile('backup.json', JSON.stringify({ schemaVersion: 1, boxes: {} }))).toThrowError(/backup\.json.*الإعدادات/);
    try {
      parseImportFile('x.json', '{oops');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ImportFileError);
      expect((e as ImportFileError).reason).toBe('invalid_json');
      expect((e as Error).message).toContain('«x.json»');
    }
  });

  it('CSV: quotes, semicolons, Arabic headers, line numbers; header without a title column is refused', () => {
    const { rows } = readCsv('a,"b, c","say ""hi"""\n1,2,3');
    expect(rows[0]).toEqual(['a', 'b, c', 'say "hi"']);
    const csv = 'العنوان;النوع;التاريخ;الوقت\n"راجعي الميزانية; الشهرية";مهمة;2026-11-01;9:30\nقهوة الصباح;تفضيل;;\n';
    const p = parseImportFile('list.csv', csv);
    expect(p.candidates).toHaveLength(2);
    expect(p.candidates[0]).toMatchObject({
      title: 'راجعي الميزانية; الشهرية', type: 'task', date: '2026-11-01', time: '09:30', typeExplicit: true,
      sourceRef: { file: 'list.csv', location: 'سطر 2' },
    });
    expect(p.candidates[1].type).toBe('preference');
    expect(() => parseImportFile('bad.csv', 'a,b\n1,2')).toThrowError(/عمود للعنوان/);
  });

  it('Markdown/text: headings give context and type, checkboxes are tasks, URLs references, dates never guessed', () => {
    const md = [
      '# الأسبوع',
      '## مهام',
      '- [ ] أرسل الإيميل 2026-11-03',
      '- [x] رتبت الملفات',
      '## أفكار',
      '* سلسلة بوستات',
      '',
      'https://example.com/guide دليل مفيد',
      '---',
    ].join('\n');
    const p = parseImportFile('notes.md', md);
    expect(p.candidates.map((c) => c.type)).toEqual(['task', 'task', 'idea', 'idea']);
    expect(p.candidates[0].date).toBeNull();
    expect(p.candidates[0].title).toContain('2026-11-03');
    expect(p.candidates[1].body).toContain('منتهية');
    expect(p.candidates[0].sourceRef.location).toBe('الأسبوع › مهام · سطر 3');
    expect(p.candidates.every((c) => !c.typeExplicit)).toBe(true);
    const txt = parseImportFile('a.txt', 'https://ielts.org  مرجع الاختبار\nكلام عادي');
    expect(txt.candidates.map((c) => c.type)).toEqual(['reference', 'note']);
  });

  it('unreadable files: empty, binary, unsupported type', () => {
    expect(() => parseImportFile('e.txt', '   \n ')).toThrowError(/فاضي/);
    expect(() => parseImportFile('b.txt', 'abc\u0000def')).toThrowError(/ما يبان كنص/);
    expect(() => parseImportFile('cv.pdf', '%PDF')).toThrowError(/«cv\.pdf».*pdf/);
  });
});

// ---------------------------------------------------------------------------
describe('import review pipeline', () => {
  it('reviews, flags duplicates/conflicts, commits only approved items with provenance, never touches the day plan', async () => {
    const { store } = await freshStore();
    const today = store.today();
    const existing = await store.addTask({ title: 'تجديد الهوية', dueDate: '2026-11-05' });
    await store.addNote({ title: 'قهوة الصباح' });
    const planBefore = JSON.stringify(store.getSnapshot().dayPlans);
    const todayTasksBefore = tasksForDay(store.getSnapshot(), today).length;

    const csv = [
      'title,type,date',
      'تجديد الهوية,مهمة,2026-11-02', // conflict with existing (different date)
      'قهوة الصباح,تفضيل,', // duplicate of a note
      `اتصل على البنك,task,${dayKey(today)}`, // explicit date = today → still NOT on today
      'مشروع الموقع,project,',
      'فكرة بودكاست,idea,',
      'موعد العيادة,موعد,', // appointment without date → missing
      'اتصل على البنك,task,2026-12-01', // duplicate in-file with a different date → conflict
    ].join('\n');
    const res = await store.startImport('plan.csv', csv);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const b = res.batch;
    const c = (t: string, i = 0) => b.candidates.filter((x) => x.title === t)[i];
    expect(c('تجديد الهوية').status).toBe('conflict');
    expect(c('تجديد الهوية').matches[0]).toMatchObject({ entity: 'task', id: existing.id, relation: 'conflict' });
    expect(c('قهوة الصباح').matches[0]).toMatchObject({ entity: 'note', relation: 'duplicate' });
    expect(c('موعد العيادة').status).toBe('missing');
    expect(c('اتصل على البنك').status).toBe('conflict');
    expect(c('اتصل على البنك', 1).status).toBe('conflict');
    expect(c('مشروع الموقع').status).toBe('confirmed');
    expect(b.candidates.every((x) => x.decision === 'pending')).toBe(true);
    expect(needsReviewCount(store.getSnapshot())).toBe(7);

    // Bulk approve touches only the safe ones.
    const bulk = (await store.decideAll(b.id, 'approved'))!;
    expect(bulk.candidates.filter((x) => x.decision === 'approved').map((x) => x.title).sort()).toEqual(['فكرة بودكاست', 'مشروع الموقع'].sort());

    // She fixes the appointment and approves it, approves the first bank call, ignores the rest.
    const appt = c('موعد العيادة');
    const edited = (await store.editCandidate(b.id, appt.id, { date: '2026-11-10', time: '16:00' }))!;
    expect(edited.candidates.find((x) => x.id === appt.id)!.status).toBe('confirmed');
    await store.reviewCandidate(b.id, appt.id, 'approved');
    await store.reviewCandidate(b.id, c('اتصل على البنك').id, 'approved');
    await store.decideAll(b.id, 'ignored');

    const out = await store.commitImport(b.id);
    expect(out.added).toBe(4);
    const s = store.getSnapshot();
    // Nothing on today's plan; the dated task did not become a planned task.
    expect(JSON.stringify(s.dayPlans)).toBe(planBefore);
    expect(tasksForDay(s, today)).toHaveLength(todayTasksBefore);
    expect(todayView(s, today).plan.items.some((i) => i.title.ar.includes('البنك'))).toBe(false);
    const bank = s.tasks.find((t) => t.title === 'اتصل على البنك')!;
    expect(bank.status).toBe('inbox');
    expect(bank.dueDate).toBeNull();
    expect(bank.notes).toContain(`التاريخ في الملف: ${dayKey(today)}`);
    expect(bank.notes).toContain('«plan.csv» · سطر 4');
    expect(s.projects.find((p) => p.titleAr === 'مشروع الموقع')!.status).toBe('idea');
    expect(s.inbox.find((i) => i.title === 'فكرة بودكاست')!.kind).toBe('idea');
    const apptNote = s.notes.find((n) => n.title === 'موعد العيادة')!;
    expect(apptNote.tag).toBe('appointment');
    expect(apptNote.body).toContain('2026-11-10');
    // Provenance links each item back to its file line.
    const prov = provenanceOf(s, 'task', bank.id)!;
    expect(prov.sourceRef).toEqual({ file: 'plan.csv', location: 'سطر 4' });
    expect(prov.originalDate).toBe(dayKey(today));
    expect(prov.source!.status).toBe('committed');
    expect(sourceReport(s, res.source.id).summary!.approved).toBe(4);
    expect(needsReview(s)).toHaveLength(0);
    // The existing conflicting task is untouched.
    expect(s.tasks.find((t) => t.id === existing.id)!.dueDate).toBe('2026-11-05');

    // Undo the whole commit.
    expect(await store.undoDelete(out.undo!.token)).toBe(true);
    const u = store.getSnapshot();
    expect(u.tasks.some((t) => t.title === 'اتصل على البنك')).toBe(false);
    expect(u.notes.some((n) => n.title === 'موعد العيادة')).toBe(false);
    expect(u.provenance).toHaveLength(0);
    expect(u.importBatches[0].committedAt).toBeNull();
  });

  it('records unreadable files as failed sources; discard drops a batch', async () => {
    const { store } = await freshStore();
    const bad = await store.startImport('scan.png', 'xx');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain('«scan.png»');
    expect(failedSources(store.getSnapshot()).map((x) => x.fileName)).toEqual(['scan.png']);

    const ok = await store.startImport('ideas.md', '- فكرة واحدة');
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.batch.candidates[0].status).toBe('suggested');
    expect(await store.discardImport(ok.batch.id)).toBe(true);
    const s = store.getSnapshot();
    expect(s.importBatches).toHaveLength(0);
    expect(s.sources.find((x) => x.id === ok.source.id)!.status).toBe('discarded');
  });
});

// ---------------------------------------------------------------------------
describe('import batch writes are serialised', () => {
  it('quick taps on the same batch (approve + edit + approve, not awaited) never overwrite each other', async () => {
    const { store, repo } = await freshStore();
    const res = await store.startImport('ideas.md', ['- فكرة أولى', '- فكرة ثانية', '- فكرة ثالثة'].join('\n'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const [a, b, c] = res.batch.candidates;
    // Fired together, exactly like fast taps in the review screen.
    await Promise.all([
      store.reviewCandidate(res.batch.id, a.id, 'approved'),
      store.editCandidate(res.batch.id, b.id, { title: 'فكرة ثانية معدّلة' }),
      store.reviewCandidate(res.batch.id, c.id, 'ignored'),
      store.reviewCandidate(res.batch.id, b.id, 'approved'),
    ]);
    const after = store.getSnapshot().importBatches.find((x) => x.id === res.batch.id)!;
    const byId = (id: string) => after.candidates.find((x) => x.id === id)!;
    expect(byId(a.id).decision).toBe('approved');
    expect(byId(b.id).title).toBe('فكرة ثانية معدّلة');
    expect(byId(b.id).decision).toBe('approved');
    expect(byId(c.id).decision).toBe('ignored');
    // Persisted copy matches the in-memory one.
    const stored = (await repo.importBatches.get(res.batch.id))!;
    expect(stored.candidates.map((x) => [x.id, x.decision, x.title])).toEqual(after.candidates.map((x) => [x.id, x.decision, x.title]));
  });

  it('a commit fired right after decisions waits for them and adds exactly the approved items', async () => {
    const { store } = await freshStore();
    const res = await store.startImport('ideas.md', ['- أ', '- ب'].join('\n'));
    if (!res.ok) throw new Error('import failed');
    const [a, b] = res.batch.candidates;
    const [, , commit] = await Promise.all([
      store.reviewCandidate(res.batch.id, a.id, 'approved'),
      store.reviewCandidate(res.batch.id, b.id, 'approved'),
      store.commitImport(res.batch.id),
    ]);
    expect(commit.added).toBe(2);
  });
});
