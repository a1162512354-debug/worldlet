/**
 * Variable System Utilities
 */

import type { ChatSession, ParsedTags } from './types';
import type { ParserEvent } from './stream-parser';
import { parseVarsBlock, applyVarsPatch } from './vars-merger';

export function mergeVariables(
  base: Record<string, string | number> = {},
  updates: Record<string, string | number> = {}
): Record<string, string | number> {
  return { ...base, ...updates };
}

export function formatVariablesForPrompt(variables: Record<string, string | number>): string {
  const entries = Object.entries(variables);
  if (entries.length === 0) return '';
  const lines = entries.map(([k, v]) => `${k}: ${v}`);
  return `[当前状态]\n${lines.join('\n')}`;
}

export const USER_ROLE = 'user' as const;

function cloneVariables<T extends Record<string, any>>(variables: T): T {
  return JSON.parse(JSON.stringify(variables));
}

function variablesAtMessage(chat: ChatSession, index: number): Record<string, any> {
  for (let i = index; i >= 0; i -= 1) {
    const message = chat.messages[i];
    if (message.variablesAfter) return cloneVariables(message.variablesAfter);
    if (message.variables) return cloneVariables(message.variables);
  }
  return {};
}

/** Truncate chat at message index and restore variables from the last remaining message (or provided snapshot). */
export function truncateChatAt(
  chat: ChatSession,
  index: number,
  variables?: Record<string, string | number>
): ChatSession {
  const truncated = chat.messages.slice(0, index);
  const restoredVars = variables ? cloneVariables(variables) : variablesAtMessage(chat, index - 1);
  return { ...chat, messages: truncated, variables: restoredVars, updatedAt: Date.now() };
}

/** Create a branched chat session from a message index (inclusive). */
export function branchChat(
  source: ChatSession,
  index: number,
  options: {
    name: string;
    presetId: string | null;
    lorebookIds: string[];
    variables?: Record<string, string | number>;
  }
): ChatSession {
  return {
    id: crypto.randomUUID(),
    name: options.name,
    messages: source.messages.slice(0, index + 1).map(m => ({ ...m })),
    characterName: source.characterName,
    userName: source.userName,
    presetId: options.presetId,
    lorebookIds: [...options.lorebookIds],
    variables: options.variables ? cloneVariables(options.variables) : variablesAtMessage(source, index),
    inventory: source.inventory ? { ...source.inventory } : { weapons: [], armor: [], consumables: [], materials: [], other: [] },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ========== v3: stream parser event aggregation ==========

export function aggregateEvents(events: ParserEvent[]): ParsedTags {
  const parsed: ParsedTags = {
    thinking: '',
    maintext: '',
    options: [],
    sum: '',
    varsRaw: '',
    varsCommands: { merge: {} },
    unknown: {},
  };
  for (const ev of events) {
    if (ev.type === 'tag-close') {
      if (ev.tag === 'thinking' || ev.tag === 'think') parsed.thinking = ev.full;
      else if (ev.tag === 'maintext') parsed.maintext = ev.full;
      else if (ev.tag === 'sum') parsed.sum = ev.full;
      else if (ev.tag === 'vars') {
        parsed.varsRaw = ev.full;
        parsed.varsCommands = parseVarsBlock(ev.full);
      } else if (ev.tag === 'option') {
        // option-line events accumulate options below
      } else {
        parsed.unknown[ev.tag] = ev.full;
      }
    } else if (ev.type === 'option-line') {
      parsed.options.push(ev.line);
    }
  }
  return parsed;
}

export function buildImplicitVarsMessages(
  storyText: string,
  currentVariables: Record<string, any>,
): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    {
      role: 'system',
      content: '你是变量提取器。根据剧情正文推断当前变量变化，只输出 JSON 对象；没有明确变化则输出 {}。不要解释，不要 Markdown。',
    },
    {
      role: 'user',
      content: `当前变量：\n${JSON.stringify(currentVariables)}\n\n剧情正文：\n${storyText}`,
    },
  ];
}

export function applyParsedToChat(
  current: Record<string, any>,
  parsed: ParsedTags,
  implicitUpdates: Record<string, any> = {},
): { nextVariables: Record<string, any>; snapshot: Record<string, any> } {
  const explicitNext = applyVarsPatch(current, parsed.varsCommands);
  const next = applyVarsPatch(explicitNext, { merge: implicitUpdates });
  const snapshot = JSON.parse(JSON.stringify(next));
  return { nextVariables: next, snapshot };
}
