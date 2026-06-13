import { useState } from 'react';
import { useSillytavern } from '../../hooks/useSillytavern';

export function VariablesModal({ onClose }: { onClose: () => void }) {
  const { activeChat, setChatVariables } = useSillytavern();
  const vars = activeChat?.variables ?? {};
  const [draftKey, setDraftKey] = useState('');
  const [draftValue, setDraftValue] = useState('');

  const handleAdd = async () => {
    const k = draftKey.trim();
    if (!k) return;
    if (vars[k] !== undefined) {
      alert('变量名已存在');
      return;
    }
    await setChatVariables({ ...vars, [k]: draftValue });
    setDraftKey('');
    setDraftValue('');
  };

  const handleEdit = async (oldKey: string, newKey: string, newValue: string) => {
    const next: Record<string, any> = { ...vars };
    if (oldKey !== newKey) {
      delete next[oldKey];
    }
    next[newKey] = newValue;
    await setChatVariables(next);
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`删除变量 "${key}"?`)) return;
    const next = { ...vars };
    delete next[key];
    await setChatVariables(next);
  };

  return (
    <div className="legacy-modal-overlay" onClick={onClose}>
      <div className="legacy-modal-shell" onClick={(e) => e.stopPropagation()}>
        <header className="legacy-modal-header">
          <strong>📊 变量面板</strong>
          <button onClick={onClose}>×</button>
        </header>

        {!activeChat ? (
          <div className="st-empty-state-lg">
            请先创建或选择一个对话
          </div>
        ) : (
          <main className="st-flex-1 st-overflow-y-auto" style={{ padding: 16 }}>
            <div
              className="st-flex-row st-gap-8 st-mb-16"
              style={{ paddingBottom: 12, borderBottom: '1px solid var(--space-border-medium)' }}
            >
              <input
                type="text"
                placeholder="变量名"
                value={draftKey}
                onChange={(e) => setDraftKey(e.target.value)}
                className="st-flex-1 st-p-6"
              />
              <input
                type="text"
                placeholder="值"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                className="st-flex-2 st-p-6"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                }}
              />
              <button onClick={handleAdd} className="st-btn-sm">
                + 添加
              </button>
            </div>

            {Object.keys(vars).length === 0 ? (
              <div className="st-empty-state st-text-13">
                暂无变量。AI 回复中包含 <code>{'<vars>{"hp": 100}</vars>'}</code> 时会自动提取。
              </div>
            ) : (
              <ul className="st-list-reset">
                {Object.entries(vars).map(([key, value]) => (
                  <VariableRow
                    key={key}
                    varKey={key}
                    varValue={String(value)}
                    onSave={handleEdit}
                    onDelete={() => handleDelete(key)}
                  />
                ))}
              </ul>
            )}

            <div
              className="st-mt-12 st-p-12 st-text-12 st-text-secondary"
              style={{ background: 'rgba(110,207,207,0.08)', borderRadius: 6 }}
            >
              <strong style={{ color: 'var(--color-accent)' }}>提示:</strong> 变量随当前对话保存。AI 回复包含
              <code style={{ padding: '0 4px', margin: '0 4px' }}>
                {'<vars>{"hp": 80}</vars>'}
              </code>
              块时也会自动合并。
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

function VariableRow({
  varKey,
  varValue,
  onSave,
  onDelete,
}: {
  varKey: string;
  varValue: string;
  onSave: (oldKey: string, newKey: string, newValue: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(varKey);
  const [value, setValue] = useState(varValue);
  const dirty = name !== varKey || value !== varValue;
  const canSave = dirty && !!name.trim();

  return (
    <li
      className="st-flex-row st-gap-8 st-items-center st-border-bottom"
      style={{ padding: '6px 0' }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="st-flex-1 st-mono st-p-4"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="st-flex-2 st-p-4"
      />
      <button
        onClick={() => onSave(varKey, name.trim() || varKey, value)}
        disabled={!canSave}
        className={`st-btn-xs st-border-none st-rounded-3 st-text-12 ${canSave ? 'st-btn-save' : ''}`}
        style={!canSave ? { background: 'rgba(90, 98, 112, 0.2)', color: 'var(--color-text-muted)', cursor: 'not-allowed' } : undefined}
      >
        保存
      </button>
      <button
        onClick={onDelete}
        className="st-btn-xxs st-btn-danger-border st-bg-transparent st-rounded-3 st-text-12"
      >
        删除
      </button>
    </li>
  );
}
