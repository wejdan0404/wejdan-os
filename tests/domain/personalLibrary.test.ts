import { describe, expect, it } from 'vitest';
import actionsJson from '../../src/domain/data/actions.json';
import actionsArJson from '../../src/domain/data/actions_ar.json';
import {
  PersonalLibraryError,
  clearPersonalLibrary,
  hasPersonalLibrary,
  mergeLibraries,
  parsePersonalLibrary,
  parseSeedLibrary,
  readPersonalLibrary,
  savePersonalLibrary,
  type Json,
  type KeyValueStore,
} from '../../src/domain';

function memKv(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

const shippedEn = actionsJson as unknown as Json[];
const shippedAr = actionsArJson as unknown as Record<string, Json>;

describe('public library privacy guard', () => {
  const blob = JSON.stringify(actionsJson) + JSON.stringify(actionsArJson);
  it('ships no personal fields, places, career targets or women\'s-health actions', () => {
    for (const bad of [
      'priority_for_her', 'PCOS', 'تكيّس', 'تكيس', 'Makkah', 'Jeddah', 'مكة', 'جدة', 'Google UX', 'Figma',
      'home-workout days', 'المنزلي الـ4', 'up to age 30', 'بعمر حتى 30', 'brand kit', 'وجدان', 'Wejdan',
    ]) {
      expect(blob.includes(bad), bad).toBe(false);
    }
    const ids = shippedEn.map((a) => a['action_id']);
    for (const id of ['FOOD-17', 'FOOD-18', 'FOOD-19']) expect(ids).not.toContain(id);
    expect(Object.keys(shippedAr)).not.toContain('FOOD-19');
  });
});

describe('personal library (local only)', () => {
  const personal = {
    kind: 'wejdan-action-library',
    version: 1,
    actions: [
      { ...(shippedEn.find((a) => a['action_id'] === 'BODY-01') as Json), cue_suggestion: 'PERSONAL CUE' },
      { ...(shippedEn.find((a) => a['action_id'] === 'BODY-02') as Json), action_id: 'FOOD-99', name_en: 'Extra private action' },
    ],
    actions_ar: { 'FOOD-99': { card_title_ar: 'فعل خاص' } },
  };

  it('validates the file and rejects anything else', () => {
    expect(parsePersonalLibrary(JSON.stringify(personal)).actions).toHaveLength(2);
    expect(() => parsePersonalLibrary('{nope')).toThrow(PersonalLibraryError);
    expect(() => parsePersonalLibrary({ kind: 'other', actions: [] })).toThrow(PersonalLibraryError);
    expect(() => parsePersonalLibrary({ kind: 'wejdan-action-library', actions: [{}] })).toThrow(PersonalLibraryError);
  });

  it('saves, reads and clears locally', () => {
    const kv = memKv();
    expect(hasPersonalLibrary(kv)).toBe(false);
    expect(savePersonalLibrary(personal, kv)).toBe(2);
    expect(readPersonalLibrary(kv)?.actions).toHaveLength(2);
    clearPersonalLibrary(kv);
    expect(readPersonalLibrary(kv)).toBeNull();
  });

  it('merges over the shipped library: personal wins per id, extra ids are added', () => {
    const merged = mergeLibraries(shippedEn, shippedAr, parsePersonalLibrary(personal));
    const lib = parseSeedLibrary(merged.en, merged.ar);
    const body01 = lib.actions.find((a) => a.actionId === 'BODY-01');
    expect(body01?.cueSuggestion).toBe('PERSONAL CUE');
    const extra = lib.actions.find((a) => a.actionId === 'FOOD-99');
    expect(extra?.ar?.cardTitle).toBe('فعل خاص');
    expect(lib.actions.length).toBe(parseSeedLibrary(shippedEn, shippedAr).actions.length + 1);
    expect(mergeLibraries(shippedEn, shippedAr, null).en).toBe(shippedEn);
  });
});
