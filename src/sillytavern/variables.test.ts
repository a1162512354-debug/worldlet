import { describe, it, expect } from 'vitest';
import { StreamTagParser } from './stream-parser';
import { aggregateEvents, applyParsedToChat, branchChat, buildImplicitVarsMessages, truncateChatAt } from './variables';

const TAGS = ['maintext', 'option', 'sum', 'vars', 'thinking', 'think'];
const OPAQUE = ['thinking', 'think'];

describe('variables aggregator', () => {
  it('aggregates tag-close events into ParsedTags', () => {
    const p = new StreamTagParser(TAGS, OPAQUE);
    const events = [
      ...p.feed('<thinking>plan</thinking>'),
      ...p.feed('<maintext>hi\nthere</maintext>'),
      ...p.feed('<option>A\nB</option>'),
      ...p.feed('<sum>summary</sum>'),
      ...p.feed('<vars>{"hp":10}</vars>'),
      ...p.finish(),
    ];
    const parsed = aggregateEvents(events);
    expect(parsed.thinking).toBe('plan');
    expect(parsed.maintext).toBe('hi\nthere');
    expect(parsed.options).toEqual(['A', 'B']);
    expect(parsed.sum).toBe('summary');
    expect(parsed.varsRaw).toBe('{"hp":10}');
    expect(parsed.varsCommands.merge).toEqual({ hp: 10 });
  });

  it('applyParsedToChat returns next chat.variables and message.variablesAfter clones', () => {
    const parsed = aggregateEvents([
      { type: 'tag-close', tag: 'vars', full: '{"hp":80}' },
    ] as any);
    const { nextVariables, snapshot } = applyParsedToChat({ hp: 100, gold: 5 }, parsed);
    expect(nextVariables).toEqual({ hp: 80, gold: 5 });
    expect(snapshot).toEqual({ hp: 80, gold: 5 });
    expect(snapshot).not.toBe(nextVariables);
  });

  it('applyParsedToChat merges implicit variable updates after explicit vars', () => {
    const parsed = aggregateEvents([
      { type: 'tag-close', tag: 'vars', full: '{"hp":80,"gold":5}' },
    ] as any);

    const { nextVariables, snapshot } = applyParsedToChat(
      { hp: 100, gold: 1, location: '城镇' },
      parsed,
      { gold: 8, mood: '紧张' },
    );

    expect(nextVariables).toEqual({ hp: 80, gold: 8, location: '城镇', mood: '紧张' });
    expect(snapshot).toEqual(nextVariables);
    expect(snapshot).not.toBe(nextVariables);
  });

  it('buildImplicitVarsMessages asks for JSON updates from story text and current variables', () => {
    const messages = buildImplicitVarsMessages('你受伤了，HP 下降。', { hp: 100 });

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('只输出 JSON 对象');
    expect(messages[1]).toEqual({
      role: 'user',
      content: '当前变量：\n{"hp":100}\n\n剧情正文：\n你受伤了，HP 下降。',
    });
  });

  it('truncateChatAt restores variables from variablesAfter on last remaining message', () => {
    const chat = {
      id: 'c1',
      name: '测试会话',
      messages: [
        { id: 'u1', role: 'user' as const, content: 'go', timestamp: 1 },
        { id: 'a1', role: 'assistant' as const, content: 'ok', timestamp: 2, variablesAfter: { hp: 80, gold: 5 } },
        { id: 'u2', role: 'user' as const, content: 'next', timestamp: 3 },
      ],
      characterName: 'AI',
      userName: '用户',
      presetId: null,
      lorebookIds: [],
      variables: { hp: 20, gold: 99 },
      createdAt: 0,
      updatedAt: 0,
      inventory: { weapons: [], armor: [], consumables: [], materials: [], other: [] },
    };

    const truncated = truncateChatAt(chat, 2);

    expect(truncated.messages.map((m) => m.id)).toEqual(['u1', 'a1']);
    expect(truncated.variables).toEqual({ hp: 80, gold: 5 });
  });

  it('branchChat restores variables from the branched message variablesAfter snapshot', () => {
    const chat = {
      id: 'c1',
      name: '测试会话',
      messages: [
        { id: 'u1', role: 'user' as const, content: 'go', timestamp: 1 },
        { id: 'a1', role: 'assistant' as const, content: 'ok', timestamp: 2, variablesAfter: { hp: 80 } },
      ],
      characterName: 'AI',
      userName: '用户',
      presetId: null,
      lorebookIds: [],
      variables: { hp: 20 },
      createdAt: 0,
      updatedAt: 0,
      inventory: { weapons: [], armor: [], consumables: [], materials: [], other: [] },
    };

    const branch = branchChat(chat, 1, {
      name: '分支',
      presetId: null,
      lorebookIds: [],
    });

    expect(branch.messages.map((m) => m.id)).toEqual(['u1', 'a1']);
    expect(branch.variables).toEqual({ hp: 80 });
  });
});
