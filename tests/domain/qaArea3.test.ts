/**
 * Final QA area 3 (Path / IELTS / Driving) — domain fixes:
 * weekly-open tasks reach suggestions (driving plan), «حطيها لليوم» idempotency + task↔step link,
 * step-delete undo against the current project, vocab logical day, deletable mocks/sessions,
 * idea → active project.
 */
import { describe, expect, it } from 'vitest';
import {
  InMemoryLifeRepository, createLifeStore, dayKey, drivingTemplate, makeProject, makeProjectStep, mkDate, todayView, vocabDue,
} from '../../src/domain';
import { library } from './helpers';

async function storeAt(at: Date = mkDate(2026, 10, 5, 9)) {
  let now = at;
  const repo = new InMemoryLifeRepository();
  const store = await createLifeStore({ repo, now: () => now, library });
  return { store, setNow: (d: Date) => { now = d; } };
}

async function withProject(store: Awaited<ReturnType<typeof storeAt>>['store']) {
  const p = makeProject({
    id: 'prj_test', domain: 'career', titleAr: 'test', titleEn: 'test', status: 'active',
    steps: [
      makeProjectStep({ id: 's1', titleAr: 'test 1', titleEn: 'test 1' }),
      makeProjectStep({ id: 's2', titleAr: 'test 2', titleEn: 'test 2' }),
      makeProjectStep({ id: 's3', titleAr: 'test 3', titleEn: 'test 3' }),
    ],
  });
  await store.upsertProject(p, true);
  return p;
}

describe('driving weekly plan surfaces as suggestions (area 3 #2)', () => {
  it('active weekly tasks without a fixed day are offered with «باقي X من Y» until done; not while the area rests', async () => {
    const { store } = await storeAt();
    for (const t of drivingTemplate()) await store.upsertWeeklyTask({ ...t, active: true });
    let v = todayView(store.getSnapshot(), store.today());
    expect(v.suggestions.some((x) => x.item.itemId === 'wt_driving_videos')).toBe(false); // driving rests by default
    await store.setDomainState('driving', 'maintain', true);
    v = todayView(store.getSnapshot(), store.today());
    const vids = v.suggestions.find((x) => x.item.itemId === 'wt_driving_videos');
    expect(vids).toBeDefined();
    expect(vids!.item.why.code).toBe('weeklyOpen');
    expect(vids!.item.why.text.ar).toContain('باقي 3 من 3');
    expect(v.thisWeek).toEqual([]);
    await store.acceptSuggestion(vids!.item.id);
    expect(todayView(store.getSnapshot(), store.today()).plan.items.some((i) => i.id === vids!.item.id)).toBe(true);
  });
});

describe('«حطيها لليوم» (area 3 #3)', () => {
  it('is idempotent even for two calls in flight at once', async () => {
    const { store } = await storeAt();
    await withProject(store);
    const day = dayKey(store.today());
    const [a, b] = await Promise.all([store.planProjectStep('prj_test', 's1', day), store.planProjectStep('prj_test', 's1', day)]);
    expect(a!.task.id).toBe(b!.task.id);
    expect([a!.created, b!.created].filter(Boolean)).toHaveLength(1);
    expect(store.getSnapshot().tasks.filter((t) => t.projectStepId === 's1')).toHaveLength(1);
    const again = await store.planProjectStep('prj_test', 's1', day);
    expect(again!.created).toBe(false);
  });

  it('finishing the task ticks the step (and un-finishing unticks); ticking the step finishes the task', async () => {
    const { store } = await storeAt();
    await withProject(store);
    const day = dayKey(store.today());
    const r = await store.planProjectStep('prj_test', 's1', day);
    await store.completeTask(r!.task.id);
    let p = store.getSnapshot().projects.find((x) => x.id === 'prj_test')!;
    expect(p.steps.find((x) => x.id === 's1')!.done).toBe(true);
    // a second «حطيها لليوم» now targets the next step — no duplicate of the finished one
    const next = await store.planProjectStep('prj_test', 's2', day);
    expect(next!.created).toBe(true);
    await store.updateTask(r!.task.id, { status: 'planned' });
    p = store.getSnapshot().projects.find((x) => x.id === 'prj_test')!;
    expect(p.steps.find((x) => x.id === 's1')!.done).toBe(false);
    await store.markProjectStep('prj_test', 's2', true);
    expect(store.getSnapshot().tasks.find((t) => t.id === next!.task.id)!.status).toBe('done');
  });
});

describe('step delete undo uses the current project (area 3 #5)', () => {
  it('restores the step without wiping later ticks and notes', async () => {
    const { store } = await storeAt();
    await withProject(store);
    const tok = await store.deleteProjectStep('prj_test', 's3');
    await store.markProjectStep('prj_test', 's2', true);
    await store.patchProject('prj_test', { notes: 'test note' });
    expect(await store.undoDelete(tok!.token)).toBe(true);
    const p = store.getSnapshot().projects.find((x) => x.id === 'prj_test')!;
    expect(p.steps.map((x) => x.id)).toEqual(['s1', 's2', 's3']);
    expect(p.steps.find((x) => x.id === 's2')!.done).toBe(true);
    expect(p.notes).toBe('test note');
  });
});

describe('IELTS / driving records (area 3 #8, #17)', () => {
  it('a card added at 03:30 is reviewable on the logical day', async () => {
    const { store } = await storeAt(mkDate(2026, 10, 6, 3, 30));
    await store.addVocabCard('test', 'test');
    expect(vocabDue(store.getSnapshot(), store.today())).toHaveLength(1);
  });

  it('mock results and driving sessions can be deleted with undo', async () => {
    const { store } = await storeAt();
    await store.addMockTest({ id: 'm1', date: '2026-10-05', reading: 6, listening: 6, writing: 6, speaking: 6, note: '' });
    await store.addDrivingSession({ id: 'd1', date: '2026-10-05', minutes: 15, conditions: [], supervised: false, kind: 'video', note: '' });
    const t1 = await store.deleteMockTest('m1');
    const t2 = await store.deleteDrivingSession('d1');
    expect(store.getSnapshot().mockTests).toHaveLength(0);
    expect(store.getSnapshot().drivingSessions).toHaveLength(0);
    await store.undoDelete(t1!.token);
    await store.undoDelete(t2!.token);
    expect(store.getSnapshot().mockTests).toHaveLength(1);
    expect(store.getSnapshot().drivingSessions).toHaveLength(1);
  });
});

describe('idea → project (area 3 #13)', () => {
  it('can become an active project', async () => {
    const { store } = await storeAt();
    const it0 = await store.quickAdd('test', 'idea');
    const p = await store.convertInbox(it0.id, 'project', { projectStatus: 'active', domain: 'ielts' });
    expect(p && 'status' in p ? p.status : null).toBe('active');
  });
});
