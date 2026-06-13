import { useState, useMemo } from 'react';
import { useSillytavern } from '../../hooks/useSillytavern';
import type { VariableSchema, VariableDefinition } from '../../sillytavern/types';

export function VariablesModal({ onClose }: { onClose: () => void }) {
  const { activeChat, setChatVariables, variableSchemas } = useSillytavern();
  const vars = activeChat?.variables ?? {};
  const [draftKey, setDraftKey] = useState('');
  const [draftValue, setDraftValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 按变量结构分组变量
  const groupedVars = useMemo(() => {
    const groups: Map<string, { schema: VariableSchema | null; vars: Array<{ key: string; value: any; def?: VariableDefinition }> }> = new Map();
    const ungrouped: Array<{ key: string; value: any; def?: VariableDefinition }> = [];

    // 找到每个变量所属的结构
    for (const [key, value] of Object.entries(vars)) {
      let found = false;
      for (const schema of variableSchemas) {
        const def = schema.definitions.find((d) => d.id === key);
        if (def) {
          if (!groups.has(schema.id)) {
            groups.set(schema.id, { schema, vars: [] });
          }
          groups.get(schema.id)!.vars.push({ key, value, def });
          found = true;
          break;
        }
      }
      if (!found) {
        ungrouped.push({ key, value });
      }
    }

    // 搜索过滤
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      for (const [, group] of groups) {
        group.vars = group.vars.filter((v) =>
          v.key.toLowerCase().includes(q) ||
          (v.def?.displayName?.toLowerCase().includes(q)) ||
          String(v.value).toLowerCase().includes(q)
        );
      }
      return { groups, ungrouped: ungrouped.filter((v) =>
        v.key.toLowerCase().includes(q) || String(v.value).toLowerCase().includes(q)
      )};
    }

    return { groups, ungrouped };
  }, [vars, variableSchemas, searchQuery]);

  const toggleGroup = (schemaId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(schemaId)) next.delete(schemaId);
      else next.add(schemaId);
      return next;
    });
  };

  const toggleItem = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

  const totalVars = Object.keys(vars).length;

  return (
    <div className="legacy-modal-overlay" onClick={onClose}>
      <div className="legacy-modal-shell" onClick={(e) => e.stopPropagation()}>
        <header className="legacy-modal-header">
          <strong>📊 变量面板 ({totalVars})</strong>
          <button onClick={onClose}>×</button>
        </header>

        {!activeChat ? (
          <div className="st-empty-state-lg">
            请先创建或选择一个对话
          </div>
        ) : (
          <main className="st-flex-1 st-overflow-y-auto" style={{ padding: 16 }}>
            {/* 搜索栏 */}
            <div className="st-mb-12">
              <input
                type="text"
                placeholder="搜索变量..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="st-w-full st-p-6"
              />
            </div>

            {/* 添加变量 */}
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

            {totalVars === 0 ? (
              <div className="st-empty-state st-text-13">
                暂无变量。AI 回复中包含 <code>{'<vars>{"hp": 100}</vars>'}</code> 时会自动提取。
              </div>
            ) : (
              <div className="st-flex-col st-gap-8">
                {/* 按结构分组的变量 */}
                {Array.from(groupedVars.groups.entries()).map(([schemaId, group]) => (
                  group.vars.length > 0 && (
                    <div key={schemaId} className="st-border st-rounded" style={{ borderColor: 'var(--space-border-medium)' }}>
                      {/* 组标题 */}
                      <button
                        onClick={() => toggleGroup(schemaId)}
                        className="st-flex-row st-items-center st-justify-between st-w-full st-p-8"
                        style={{
                          background: 'rgba(110,207,207,0.08)',
                          borderBottom: expandedGroups.has(schemaId) ? '1px solid var(--space-border-medium)' : 'none',
                        }}
                      >
                        <span className="st-text-13 st-font-bold">
                          📦 {group.schema?.name || '未分组'}
                          <span className="st-text-11 st-text-muted st-ml-4">
                            ({group.vars.length} 个变量)
                          </span>
                        </span>
                        <span className="st-text-12 st-text-muted">
                          {expandedGroups.has(schemaId) ? '▼' : '▶'}
                        </span>
                      </button>

                      {/* 组内容 */}
                      {expandedGroups.has(schemaId) && (
                        <ul className="st-list-reset">
                          {group.vars.map(({ key, value, def }) => (
                            <VariableItem
                              key={key}
                              varKey={key}
                              varValue={value}
                              definition={def}
                              isExpanded={expandedItems.has(key)}
                              onToggle={() => toggleItem(key)}
                              onSave={handleEdit}
                              onDelete={() => handleDelete(key)}
                            />
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                ))}

                {/* 未分组的变量 */}
                {groupedVars.ungrouped.length > 0 && (
                  <div className="st-border st-rounded" style={{ borderColor: 'var(--space-border-medium)' }}>
                    <button
                      onClick={() => toggleGroup('__ungrouped__')}
                      className="st-flex-row st-items-center st-justify-between st-w-full st-p-8"
                      style={{
                        background: 'rgba(110,207,207,0.08)',
                        borderBottom: expandedGroups.has('__ungrouped__') ? '1px solid var(--space-border-medium)' : 'none',
                      }}
                    >
                      <span className="st-text-13 st-font-bold">
                        📋 其他变量
                        <span className="st-text-11 st-text-muted st-ml-4">
                          ({groupedVars.ungrouped.length} 个变量)
                        </span>
                      </span>
                      <span className="st-text-12 st-text-muted">
                        {expandedGroups.has('__ungrouped__') ? '▼' : '▶'}
                      </span>
                    </button>

                    {expandedGroups.has('__ungrouped__') && (
                      <ul className="st-list-reset">
                        {groupedVars.ungrouped.map(({ key, value }) => (
                          <VariableItem
                            key={key}
                            varKey={key}
                            varValue={value}
                            isExpanded={expandedItems.has(key)}
                            onToggle={() => toggleItem(key)}
                            onSave={handleEdit}
                            onDelete={() => handleDelete(key)}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
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

function VariableItem({
  varKey,
  varValue,
  definition,
  isExpanded,
  onToggle,
  onSave,
  onDelete,
}: {
  varKey: string;
  varValue: any;
  definition?: VariableDefinition;
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (oldKey: string, newKey: string, newValue: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(varKey);
  const [value, setValue] = useState(String(varValue));
  const dirty = name !== varKey || value !== String(varValue);
  const canSave = dirty && !!name.trim();

  const displayName = definition?.displayName || varKey;
  const displayValue = String(varValue);

  // 简短显示：如果是数字或短文本，直接显示
  const isShort = typeof varValue === 'number' || (typeof varValue === 'string' && varValue.length < 20);

  return (
    <li style={{ borderBottom: '1px solid var(--space-border-light)' }}>
      {/* 简洁行 */}
      <div
        className="st-flex-row st-items-center st-gap-8 st-p-8"
        style={{ cursor: 'pointer' }}
        onClick={onToggle}
      >
        <span className="st-text-13 st-flex-1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </span>
        <span className="st-mono st-text-12 st-text-secondary">
          {isShort ? displayValue : displayValue.substring(0, 20) + '...'}
        </span>
        <span className="st-text-11 st-text-muted">
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {/* 展开编辑 */}
      {isExpanded && (
        <div className="st-p-8 st-pt-0" onClick={(e) => e.stopPropagation()}>
          <div className="st-flex-row st-gap-8 st-items-center st-mt-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="st-flex-1 st-mono st-p-4 st-text-12"
            />
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="st-flex-2 st-p-4 st-text-12"
            />
          </div>
          <div className="st-flex-row st-gap-8 st-mt-4 st-justify-end">
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
          </div>
        </div>
      )}
    </li>
  );
}
