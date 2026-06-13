import { useState } from 'react';
import { useSillytavern } from '../../hooks/useSillytavern';

export function HistoryDrawer({ onClose }: { onClose: () => void }) {
  const st = useSillytavern();
  const messages = st.activeChat?.messages ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const startEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditText(content);
  };

  const confirmEdit = async () => {
    if (editingId == null) return;
    await st.editMessage(editingId, editText);
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

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
            const isEditing = editingId === m.id;
            return (
              <li key={m.id} className="history-floor-card">
                <div className="history-floor-meta">#{i} · {m.role} · {new Date(m.timestamp).toLocaleTimeString()}</div>
                {isEditing ? (
                  <div className="st-flex-col st-gap-6 st-mt-4">
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      rows={6}
                      className="st-textarea"
                      autoFocus
                    />
                    <div className="st-flex-row st-gap-6 st-justify-end">
                      <button onClick={cancelEdit} className="st-btn-xs">取消</button>
                      <button onClick={() => void confirmEdit()} className="st-btn-xs st-btn-save st-border-none st-rounded-3">保存</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="history-floor-summary">{summary}…</div>
                    <div className="history-floor-actions">
                      <button onClick={() => { void st.jumpToFloor(m.id); onClose(); }}>跳转</button>
                      <button onClick={() => startEdit(m.id, m.content)}>编辑</button>
                      <button onClick={() => { void st.branchFromMessage(m.id); onClose(); }}>分支</button>
                      <button onClick={() => {
                        if (confirm(`确定删除 #${i} 之后的所有消息？此操作不可撤销。`)) {
                          void st.rollbackTo(m.id);
                        }
                      }}>删后续</button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}
