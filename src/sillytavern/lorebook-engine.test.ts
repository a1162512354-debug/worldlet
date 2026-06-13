import { describe, it, expect } from 'vitest';
import { LorebookEngine, createLorebookEngine } from './lorebook-engine';
import type { Lorebook, LorebookEntry } from './types';

function makeEntry(overrides: Partial<LorebookEntry> = {}): LorebookEntry {
  return {
    id: crypto.randomUUID(),
    keys: ['test'],
    secondaryKeys: [],
    content: 'Test content',
    order: 100,
    position: 'before_char',
    selective: false,
    selectiveLogic: 'and_any',
    constant: false,
    probability: 100,
    addMemo: false,
    ...overrides,
  };
}

function makeLorebook(overrides: Partial<Lorebook> = {}): Lorebook {
  return {
    id: crypto.randomUUID(),
    name: 'Test Lorebook',
    entries: [],
    recursiveScanning: false,
    caseSensitive: false,
    matchWholeWords: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('LorebookEngine', () => {
  describe('basic keyword matching', () => {
    it('matches a single keyword (case-insensitive)', () => {
      const engine = new LorebookEngine(makeLorebook({
        entries: [makeEntry({ keys: ['dragon'] })],
      }));
      const result = engine.scan('I see a Dragon in the cave');
      expect(result).toHaveLength(1);
      expect(result[0].matchedKeywords).toContain('dragon');
    });

    it('does not match when keyword absent', () => {
      const engine = new LorebookEngine(makeLorebook({
        entries: [makeEntry({ keys: ['unicorn'] })],
      }));
      const result = engine.scan('I see a dragon');
      expect(result).toHaveLength(0);
    });

    it('matches when ANY primary keyword matches (default and_any)', () => {
      const engine = new LorebookEngine(makeLorebook({
        entries: [makeEntry({ keys: ['dragon', 'wyrm', 'drake'] })],
      }));
      const result = engine.scan('the wyrm attacks');
      expect(result).toHaveLength(1);
    });

    it('returns empty when keys array is empty', () => {
      const engine = new LorebookEngine(makeLorebook({
        entries: [makeEntry({ keys: [] })],
      }));
      const result = engine.scan('anything');
      expect(result).toHaveLength(0);
    });
  });

  describe('caseSensitive mode', () => {
    it('respects caseSensitive=true', () => {
      const engine = new LorebookEngine(makeLorebook({
        caseSensitive: true,
        entries: [makeEntry({ keys: ['Dragon'] })],
      }));
      expect(engine.scan('dragon')).toHaveLength(0);
      expect(engine.scan('Dragon')).toHaveLength(1);
    });

    it('is case-insensitive by default', () => {
      const engine = new LorebookEngine(makeLorebook({
        entries: [makeEntry({ keys: ['Dragon'] })],
      }));
      expect(engine.scan('DRAGON')).toHaveLength(1);
    });
  });

  describe('matchWholeWords', () => {
    it('matches whole words only when enabled', () => {
      const engine = new LorebookEngine(makeLorebook({
        matchWholeWords: true,
        entries: [makeEntry({ keys: ['cat'] })],
      }));
      expect(engine.scan('the cat sat')).toHaveLength(1);
      expect(engine.scan('concatenate')).toHaveLength(0);
    });

    it('matches substrings when disabled', () => {
      const engine = new LorebookEngine(makeLorebook({
        matchWholeWords: false,
        entries: [makeEntry({ keys: ['cat'] })],
      }));
      expect(engine.scan('concatenate')).toHaveLength(1);
    });
  });

  describe('constant entries', () => {
    it('always matches constant entries regardless of keywords', () => {
      const engine = new LorebookEngine(makeLorebook({
        entries: [makeEntry({ keys: ['nonexistent'], constant: true })],
      }));
      const result = engine.scan('anything at all');
      expect(result).toHaveLength(1);
      expect(result[0].matchedKeywords).toEqual(['constant']);
    });
  });

  describe('selective logic', () => {
    it('and_any: matches when any primary keyword matches', () => {
      const engine = new LorebookEngine(makeLorebook({
        entries: [makeEntry({
          keys: ['fire', 'ice'],
          selective: false,
          selectiveLogic: 'and_any',
        })],
      }));
      expect(engine.scan('fire burns')).toHaveLength(1);
    });

    it('not_all: matches when NOT all primary keywords match', () => {
      const engine = new LorebookEngine(makeLorebook({
        entries: [makeEntry({
          keys: ['fire', 'ice'],
          selective: false,
          selectiveLogic: 'not_all',
        })],
      }));
      // only fire matches, not all -> match
      expect(engine.scan('fire burns')).toHaveLength(1);
      // both fire and ice match -> all match -> NOT all = no match
      expect(engine.scan('fire and ice')).toHaveLength(0);
    });

    it('not_any: matches when NO primary keyword matches', () => {
      const engine = new LorebookEngine(makeLorebook({
        entries: [makeEntry({
          keys: ['fire', 'ice'],
          selective: false,
          selectiveLogic: 'not_any',
        })],
      }));
      expect(engine.scan('water flows')).toHaveLength(1);
      expect(engine.scan('fire burns')).toHaveLength(0);
    });

    it('and_all with secondary keys: requires all secondary to match', () => {
      const engine = new LorebookEngine(makeLorebook({
        entries: [makeEntry({
          keys: ['sword'],
          secondaryKeys: ['enchanted', 'glowing'],
          selective: true,
          selectiveLogic: 'and_all',
        })],
      }));
      // primary matches, but secondary not all present
      expect(engine.scan('I have a sword')).toHaveLength(0);
      // primary + all secondary
      expect(engine.scan('I have an enchanted glowing sword')).toHaveLength(1);
    });

    it('and_any with secondary keys: requires any secondary to match', () => {
      const engine = new LorebookEngine(makeLorebook({
        entries: [makeEntry({
          keys: ['sword'],
          secondaryKeys: ['enchanted', 'glowing'],
          selective: true,
          selectiveLogic: 'and_any',
        })],
      }));
      // primary matches, one secondary matches
      expect(engine.scan('I have an enchanted sword')).toHaveLength(1);
      // primary matches, no secondary
      expect(engine.scan('I have a plain sword')).toHaveLength(0);
    });
  });

  describe('order scoring', () => {
    it('sorts matched entries by order (ascending)', () => {
      const engine = new LorebookEngine(makeLorebook({
        entries: [
          makeEntry({ keys: ['dragon'], order: 200, content: 'second' }),
          makeEntry({ keys: ['dragon'], order: 50, content: 'first' }),
          makeEntry({ keys: ['dragon'], order: 100, content: 'third' }),
        ],
      }));
      const result = engine.scan('dragon');
      expect(result).toHaveLength(3);
      expect(result[0].entry.content).toBe('first');
      expect(result[1].entry.content).toBe('third');
      expect(result[2].entry.content).toBe('second');
    });
  });

  describe('recursiveScan', () => {
    it('returns basic scan results when recursiveScanning is false', () => {
      const engine = new LorebookEngine(makeLorebook({
        recursiveScanning: false,
        entries: [
          makeEntry({ keys: ['dragon'], content: 'Dragon lore' }),
          makeEntry({ keys: ['fire'], content: 'Fire magic' }),
        ],
      }));
      const result = engine.recursiveScan('dragon');
      expect(result).toHaveLength(1);
    });

    it('discovers new matches through recursive scanning', () => {
      const engine = new LorebookEngine(makeLorebook({
        recursiveScanning: true,
        entries: [
          makeEntry({ id: '1', keys: ['dragon'], content: 'Dragon breathes fire', order: 1 }),
          makeEntry({ id: '2', keys: ['fire'], content: 'Fire is magical', order: 2 }),
        ],
      }));
      // 'dragon' matches entry 1, whose content mentions 'fire', which matches entry 2
      const result = engine.recursiveScan('dragon', 3);
      expect(result).toHaveLength(2);
      expect(result.map(r => r.entry.id)).toContain('1');
      expect(result.map(r => r.entry.id)).toContain('2');
    });

    it('respects maxDepth limit', () => {
      const engine = new LorebookEngine(makeLorebook({
        recursiveScanning: true,
        entries: [
          makeEntry({ id: '1', keys: ['dragon'], content: 'fire', order: 1 }),
          makeEntry({ id: '2', keys: ['fire'], content: 'ice', order: 2 }),
          makeEntry({ id: '3', keys: ['ice'], content: 'snow', order: 3 }),
        ],
      }));
      // depth 1: dragon -> finds fire entry
      const result1 = engine.recursiveScan('dragon', 1);
      expect(result1).toHaveLength(1);
      // depth 2: dragon -> fire -> finds ice entry
      const result2 = engine.recursiveScan('dragon', 2);
      expect(result2).toHaveLength(2);
    });
  });

  describe('groupByPosition', () => {
    it('groups matched entries by position', () => {
      const engine = new LorebookEngine(makeLorebook({ entries: [] }));
      const matched = [
        { entry: makeEntry({ position: 'before_char' }), score: 1, matchedKeywords: ['a'] },
        { entry: makeEntry({ position: 'after_char' }), score: 2, matchedKeywords: ['b'] },
        { entry: makeEntry({ position: 'before_char' }), score: 3, matchedKeywords: ['c'] },
      ];
      const grouped = engine.groupByPosition(matched as any);
      expect(grouped.before_char).toHaveLength(2);
      expect(grouped.after_char).toHaveLength(1);
      expect(grouped.at_depth).toHaveLength(0);
    });
  });

  describe('formatEntriesContent', () => {
    it('joins entry contents with double newlines', () => {
      const engine = new LorebookEngine(makeLorebook({ entries: [] }));
      const matched = [
        { entry: makeEntry({ content: 'First' }), score: 1, matchedKeywords: [] },
        { entry: makeEntry({ content: 'Second' }), score: 2, matchedKeywords: [] },
      ];
      expect(engine.formatEntriesContent(matched as any)).toBe('First\n\nSecond');
    });

    it('returns empty string for empty input', () => {
      const engine = new LorebookEngine(makeLorebook({ entries: [] }));
      expect(engine.formatEntriesContent([])).toBe('');
    });
  });

  describe('createLorebookEngine', () => {
    it('creates a LorebookEngine instance', () => {
      const engine = createLorebookEngine(makeLorebook());
      expect(engine).toBeInstanceOf(LorebookEngine);
    });
  });
});
