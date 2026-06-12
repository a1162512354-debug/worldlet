import { describe, it, expect } from 'vitest';
import { importMultipleLorebooks, importMultiplePresets, renameLorebook, renamePreset } from './importer';
import type { SillyTavernLorebookExport } from './types';

const stub = (name: string): SillyTavernLorebookExport => ({
  name,
  description: '',
  entries: {},
});

describe('importer multi/rename', () => {
  it('returns success and failure lists', () => {
    const results = importMultipleLorebooks([
      { fileName: 'a.json', json: stub('a') },
      { fileName: 'b.json', json: 'broken' as any },
    ]);
    expect(results.successes).toHaveLength(1);
    expect(results.failures).toHaveLength(1);
    expect(results.successes[0].lorebook.name).toBe('a');
    expect(results.failures[0].fileName).toBe('b.json');
  });

  it('renameLorebook replaces only the name', () => {
    const lb = { id: '1', name: 'old', entries: [], createdAt: 0, updatedAt: 0,
                 recursiveScanning: true, caseSensitive: false, matchWholeWords: false };
    const next = renameLorebook(lb, 'new');
    expect(next.name).toBe('new');
    expect(next.id).toBe('1');
    expect(next.updatedAt).toBeGreaterThanOrEqual(lb.updatedAt);
  });

  it('imports multiple SillyTavern presets and reports invalid files', () => {
    const results = importMultiplePresets([
      { fileName: 'story.json', json: { preset: '剧情预设', temp_openai: 0.7 } },
      { fileName: 'broken.json', json: [] },
    ]);

    expect(results.successes).toHaveLength(1);
    expect(results.successes[0].preset.name).toBe('剧情预设');
    expect(results.successes[0].preset.settings.temp_openai).toBe(0.7);
    expect(results.failures).toEqual([
      { fileName: 'broken.json', error: 'Invalid preset JSON: expected an object' },
    ]);
  });

  it('renamePreset preserves preset settings and replaces name', () => {
    const preset = {
      id: 'p1',
      name: 'old',
      settings: { temp_openai: 0.8 },
      createdAt: 0,
      updatedAt: 0,
    };

    const next = renamePreset(preset, 'new');

    expect(next.name).toBe('new');
    expect(next.settings).toEqual({ temp_openai: 0.8 });
    expect(next.id).toBe('p1');
  });
});
