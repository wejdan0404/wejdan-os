/**
 * Garden pass: the retired aquarium stays in stored data but is hidden everywhere,
 * and converting an inbox item can be undone.
 */
import { describe, expect, it } from 'vitest';
import { InMemoryLifeRepository, createLifeStore, mkDate, openInbox } from '../../src/domain';
import { library, simpleHabit } from './helpers';

async function neutral(repo = new InMemoryLifeRepository()) {
  const now = mkDate(2026, 10, 5, 9);
  return createLifeStore({ repo, now: () => now, library });
}

describe('aquarium is retired', () => {
  it('is hidden from domains and settings, and an enabled one is switched off without deleting it', async () => {
    const repo = new InMemoryLifeRepository();
    await neutral(repo);
    const aq = (await repo.domains.all()).find((d) => d.id === 'aquarium');
    expect(aq).toBeDefined();
    await repo.domains.put({ ...aq!, enabled: true });
    await repo.saveSettings({ ...(await repo.loadSettings()), aquariumModule: true });
    await repo.habits.put(simpleHabit({ id: 'fish', domain: 'aquarium' }));

    const store = await neutral(repo);
    const s = store.getSnapshot();
    expect(s.domains.some((d) => d.id === 'aquarium')).toBe(false);
    expect(s.habits.some((h) => h.id === 'fish')).toBe(false);
    expect(s.settings.aquariumModule).toBe(false);
    expect(s.actions.some((a) => a.area.toLowerCase() === 'aquarium')).toBe(false);
    // still stored (export/import compatibility), just disabled
    const stored = (await repo.domains.all()).find((d) => d.id === 'aquarium')!;
    expect(stored.enabled).toBe(false);
    expect((await repo.habits.all()).some((h) => h.id === 'fish')).toBe(true);
  });
});

describe('inbox conversion can be undone', () => {
  it('task: undo removes the task and puts the item back in the inbox', async () => {
    const store = await neutral();
    const it = await store.quickAdd('test');
    const { result, undo } = await store.convertInboxWithUndo(it.id, 'task');
    expect(result).not.toBeNull();
    expect(undo).not.toBeNull();
    expect(openInbox(store.getSnapshot()).some((x) => x.id === it.id)).toBe(false);
    expect(store.getSnapshot().tasks.some((t) => t.id === (result as { id: string }).id)).toBe(true);
    expect(await store.undoDelete(undo!.token)).toBe(true);
    expect(openInbox(store.getSnapshot()).some((x) => x.id === it.id)).toBe(true);
    expect(store.getSnapshot().tasks.some((t) => t.id === (result as { id: string }).id)).toBe(false);
  });

  it('project: undo removes the project', async () => {
    const store = await neutral();
    const it = await store.quickAdd('test');
    const { result, undo } = await store.convertInboxWithUndo(it.id, 'project');
    const pid = (result as { id: string }).id;
    expect(store.getSnapshot().projects.some((p) => p.id === pid)).toBe(true);
    await store.undoDelete(undo!.token);
    expect(store.getSnapshot().projects.some((p) => p.id === pid)).toBe(false);
    expect(openInbox(store.getSnapshot()).some((x) => x.id === it.id)).toBe(true);
  });
});
