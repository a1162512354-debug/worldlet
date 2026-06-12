import { useSillytavern } from '../../hooks/useSillytavern';

export function HistoryDrawer({ onClose }: { onClose: () => void }) {
  const st = useSillytavern();
  const messages = st.activeChat?.messages ?? [];

  return (
    <div className="legacy-modal-overlay" onClick={onClose}>
      <aside className="legacy-modal-shell side left" onClick={e => e.stopPropagation()}>
        <header className="legacy-modal-header">
          <strong>历史楼层</strong>
          <button onClick={onClose}>×</button>
        </header>
        <ol className="history-floor-list">
          {messages.map((m, i) => {
            const summary = m.role === 'assistant'
              ? (m.parsed?.maintext ?? m.content).slice(0, 60)
              : m.content.slice(0, 60);
            return (
              <li key={m.id} className="history-floor-card">
                <div className="history-floor-meta">#{i} · {m.role} · {new Date(m.timestamp).toLocaleTimeString()}</div>
                <div className="history-floor-summary">{summary}…</div>
                <div className="history-floor-actions">
                  <button onClick={() => { void st.jumpToFloor(m.id); onClose(); }}>跳转</button>
                  <button onClick={() => { const t = prompt('编辑内容', m.content); if (t != null) void st.editMessage(m.id, t); }}>编辑</button>
                  <button onClick={() => { void st.branchFromMessage(m.id); onClose(); }}>分支</button>
                  <button onClick={() => void st.rollbackTo(m.id)}>删后续</button>
                </div>
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}
