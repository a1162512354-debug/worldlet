import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage } from '../../sillytavern/types';
import { useSillytavern } from '../../hooks/useSillytavern';
import { ThinkingFold } from './ThinkingFold';
import { MainTextPane } from './MainTextPane';
import { OptionList } from './OptionList';

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const text = isUser ? message.content : message.parsed?.maintext ?? message.content;
  const options = message.role === 'assistant' ? message.parsed?.options ?? [] : [];

  return (
    <article className={`st-message st-message-${isUser ? 'user' : 'assistant'}`}>
      <div className={`st-message-avatar st-message-avatar-${isUser ? 'user' : 'assistant'}`}>
        {isUser ? 'YOU' : 'AI'}
      </div>
      <div className={`st-message-bubble st-message-bubble-${isUser ? 'user' : 'assistant'}`}>
        <div className="st-message-header">
          <span>{isUser ? '玩家' : '叙事核心'}</span>
          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
        </div>
        <div className="st-message-text">{text}</div>
        {options.length > 0 && (
          <div className="st-message-options">
            {options.map((option, index) => (
              <span key={`${option}-${index}`} className="st-message-option">
                {index + 1}. {option}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function GameView() {
  const st = useSillytavern();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const messages = st.activeChat?.messages ?? [];
  const lastAssistant = useMemo(
    () => [...messages].reverse().find(m => m.role === 'assistant'),
    [messages],
  );

  const isStreaming = st.streamState.isStreaming;
  const display = isStreaming
    ? st.streamState
    : {
        thinking: lastAssistant?.parsed?.thinking ?? '',
        maintext: lastAssistant?.parsed?.maintext ?? lastAssistant?.content ?? '',
        options: lastAssistant?.parsed?.options ?? [],
        sum: lastAssistant?.parsed?.sum ?? '',
      };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, display.maintext, isStreaming]);

  const sendDraft = () => {
    const text = draft.trim();
    if (!text || isStreaming) return;
    setDraft('');
    void st.sendGameMessage(text);
  };

  return (
    <div className="st-gameview">
      <div className="st-message-list">
        {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
        {isStreaming && (
          <article className="st-message st-message-assistant">
            <div className="st-message-avatar st-message-avatar-assistant">AI</div>
            <div className="st-message-bubble st-message-bubble-assistant streaming">
              <ThinkingFold text={display.thinking} mode={st.settings?.thinkingDisplay ?? 'fold'} />
              <MainTextPane text={display.maintext} isStreaming={isStreaming} />
            </div>
          </article>
        )}
        {!isStreaming && messages.length === 0 && (
          <div className="space-empty-state">
            <h2>频道待机</h2>
            <p>输入第一条行动，启动这段冒险。</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {!isStreaming && display.options.length > 0 && (
        <OptionList options={display.options} disabled={isStreaming} onPick={(text) => void st.sendGameMessage(text)} showCustomInput={false} />
      )}

      {display.sum && (
        <details className="st-summary-section">
          <summary className="st-summary-toggle">📜 本回合总结</summary>
          <p>{display.sum}</p>
        </details>
      )}

      <div className="space-chat-input-shell">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendDraft();
            }
          }}
          placeholder="输入行动或补充描述..."
          disabled={isStreaming}
        />
        <div className="space-chat-actions">
          <button
            className="space-input-action-button"
            disabled={!lastAssistant || isStreaming}
            onClick={() => void st.regenerateLast()}
            title="重 roll"
          >
            ↻ 重 roll
          </button>
          {isStreaming && (
            <button className="space-input-action-button" onClick={st.abortStream} title="停止">
              停止
            </button>
          )}
          <button className="space-icon-button" disabled={isStreaming || !draft.trim()} onClick={sendDraft} title="发送">
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
