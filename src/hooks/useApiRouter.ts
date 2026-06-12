import { useCallback, useMemo, useRef } from 'react';
import { createApiRouter, type ApiRouter } from '../sillytavern/api-router';
import type { ApiSettings, Task } from '../sillytavern/types';

export interface SendStreamArgs {
  task: Task;
  messages: Array<{ role: string; content: string }>;
  onChunk: (text: string) => void;
}

export interface SendJsonArgs {
  task: Task;
  messages: Array<{ role: string; content: string }>;
}

export function useApiRouter(api: ApiSettings) {
  const abortRef = useRef<AbortController | null>(null);
  const router: ApiRouter = useMemo(() => createApiRouter(api), [api]);

  const sendStream = useCallback(async (args: SendStreamArgs) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { task, messages, onChunk } = args;
    const { response } = await router.call(task, { messages, stream: true, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No body');
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      if (controller.signal.aborted) {
        await reader.cancel();
        throw new Error('aborted');
      }
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop() ?? '';
      for (const part of parts) {
        const lines = part.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;
          try {
            const json = JSON.parse(data);
            const delta: string = json?.choices?.[0]?.delta?.content ?? '';
            if (delta) onChunk(delta);
          } catch {
            // ignore bad line
          }
        }
      }
    }
  }, [router]);

  const sendJson = useCallback(async (args: SendJsonArgs): Promise<string> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { response } = await router.call(args.task, { messages: args.messages, stream: false, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data?.choices?.[0]?.message?.content ?? '';
  }, [router]);

  const abort = useCallback(() => abortRef.current?.abort(), []);

  return { sendStream, sendJson, abort, targetFor: router.targetFor };
}
