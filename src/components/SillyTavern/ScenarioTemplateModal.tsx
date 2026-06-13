import { useState, useMemo, useCallback } from 'react';
import type { ScenarioTemplate } from '../../sillytavern/types';
import { useSillytavern } from '../../hooks/useSillytavern';

// --- helpers ---
let _seq = 0;
function newId(): string {
  return `scenario_${Date.now()}_${++_seq}`;
}

function createEmpty(): ScenarioTemplate {
  const now = Date.now();
  return {
    id: newId(),
    name: '新场景模板',
    description: '',
    lorebookIds: [],
    presetId: null,
    variableSchemaId: null,
    initialVariables: {},
    systemPrompt: '',
    userName: '',
    characterName: '',
    createdAt: now,
    updatedAt: now,
  };
}

function scenarioLabel(s: ScenarioTemplate): string {
  return s.name?.trim() || '(未命名)';
}

// --- component ---
export function ScenarioTemplateModal({ onClose }: { onClose: () => void }) {
  const {
    scenarios,
    addScenario,
    updateScenario,
    deleteScenario,
    lorebooks,
    presets,
    variableSchemas,
    createChat,
  } = useSillytavern();

  const [drafts, setDrafts] = useState<ScenarioTemplate[]>(() =>
    scenarios.map((s) => structuredClone(s)),
  );
  const [selectedId, setSelectedId] = useState<string | null>(drafts[0]?.id ?? null);

  const selected = useMemo(
    () => drafts.find((s) => s.id === selectedId) ?? null,
    [drafts, selectedId],
  );

  // --- dirty ---
  const dirty = useMemo(() => {
    if (drafts.length !== scenarios.length) return true;
    for (const d of drafts) {
      const orig = scenarios.find((s) => s.id === d.id);
      if (!orig) return true;
      if (JSON.stringify(d) !== JSON.stringify(orig)) return true;
    }
    return false;
  }, [drafts, scenarios]);

  const tryClose = () => {
    if (dirty && !confirm('放弃未保存的修改?')) return;
    onClose();
  };

  // --- CRUD ---
  const handleAdd = () => {
    const s = createEmpty();
    setDrafts((prev) => [...prev, s]);
    setSelectedId(s.id);
  };

  const handleDelete = (id: string) => {
    if (!confirm('确定删除此场景模板?')) return;
    setDrafts((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) {
      const remaining = drafts.filter((s) => s.id !== id);
      setSelectedId(remaining[0]?.id ?? null);
    }
  };

  const handleField = useCallback(
    (field: keyof ScenarioTemplate, value: any) => {
      if (!selectedId) return;
      setDrafts((prev) =>
        prev.map((s) =>
          s.id === selectedId ? { ...s, [field]: value, updatedAt: Date.now() } : s,
        ),
      );
    },
    [selectedId],
  );

  // --- lorebook toggle ---
  const toggleLorebook = useCallback(
    (lorebookId: string) => {
      if (!selectedId) return;
      setDrafts((prev) =>
        prev.map((s) => {
          if (s.id !== selectedId) return s;
          const ids = s.lorebookIds.includes(lorebookId)
            ? s.lorebookIds.filter((id) => id !== lorebookId)
            : [...s.lorebookIds, lorebookId];
          return { ...s, lorebookIds: ids, updatedAt: Date.now() };
        }),
      );
    },
    [selectedId],
  );

  // --- initial variables ---
  const handleVarChange = useCallback(
    (key: string, value: string) => {
      if (!selectedId) return;
      setDrafts((prev) =>
        prev.map((s) => {
          if (s.id !== selectedId) return s;
          return {
            ...s,
            initialVariables: { ...s.initialVariables, [key]: value },
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [selectedId],
  );

  const handleVarAdd = useCallback(() => {
    if (!selectedId) return;
    const key = prompt('输入变量名:');
    if (!key?.trim()) return;
    setDrafts((prev) =>
      prev.map((s) => {
        if (s.id !== selectedId) return s;
        if (key in s.initialVariables) {
          alert('变量名已存在');
          return s;
        }
        return {
          ...s,
          initialVariables: { ...s.initialVariables, [key]: '' },
          updatedAt: Date.now(),
        };
      }),
    );
  }, [selectedId]);

  const handleVarRemove = useCallback(
    (key: string) => {
      if (!selectedId) return;
      setDrafts((prev) =>
        prev.map((s) => {
          if (s.id !== selectedId) return s;
          const { [key]: _, ...rest } = s.initialVariables;
          return { ...s, initialVariables: rest, updatedAt: Date.now() };
        }),
      );
    },
    [selectedId],
  );

  // --- fill defaults from schema ---
  const handleSchemaChange = useCallback(
    (schemaId: string | null) => {
      if (!selectedId) return;
      setDrafts((prev) =>
        prev.map((s) => {
          if (s.id !== selectedId) return s;
          const updated: ScenarioTemplate = {
            ...s,
            variableSchemaId: schemaId,
            updatedAt: Date.now(),
          };
          // fill defaults from schema
          if (schemaId) {
            const schema = variableSchemas.find((v) => v.id === schemaId);
            if (schema) {
              const merged = { ...s.initialVariables };
              for (const def of schema.definitions) {
                const name = def.displayName || def.id;
                if (!(name in merged) && def.defaultValue !== undefined) {
                  merged[name] = String(def.defaultValue);
                }
              }
              updated.initialVariables = merged;
            }
          }
          return updated;
        }),
      );
    },
    [selectedId, variableSchemas],
  );

  // --- save ---
  const handleSave = async () => {
    try {
      for (const d of drafts) {
        const orig = scenarios.find((s) => s.id === d.id);
        if (!orig) {
          await addScenario(d);
        } else {
          await updateScenario(d);
        }
      }
      for (const orig of scenarios) {
        if (!drafts.find((d) => d.id === orig.id)) {
          await deleteScenario(orig.id);
        }
      }
      onClose();
    } catch (e) {
      alert('保存失败: ' + (e as Error).message);
    }
  };

  // --- use template ---
  const handleUseTemplate = async () => {
    if (!selected) return;
    try {
      const chatName = prompt('新建会话名称', `场景 - ${selected.name}`);
      if (!chatName?.trim()) return;
      await createChat(chatName.trim(), {
        presetId: selected.presetId ?? undefined,
        lorebookIds: selected.lorebookIds,
        scenarioId: selected.id,
      });
      onClose();
    } catch (e) {
      alert('创建会话失败: ' + (e as Error).message);
    }
  };

  // --- var keys for render ---
  const varKeys = selected ? Object.keys(selected.initialVariables) : [];

  return (
    <div className="legacy-modal-overlay" onClick={tryClose}>
      <div className="legacy-modal-shell wide" onClick={(e) => e.stopPropagation()}>
        <header className="legacy-modal-header">
          <strong>场景模板管理</strong>
          <div className="st-flex st-items-center st-gap-8">
            <label className="st-btn-sm" style={{ cursor: 'pointer' }}>
              <input
                type="file"
                accept=".json,application/json"
                className="st-hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void file.text().then((text) => {
                      try {
                        const imported = JSON.parse(text) as ScenarioTemplate;
                        if (!imported.name || !imported.id) throw new Error('格式无效');
                        imported.id = newId();
                        imported.createdAt = Date.now();
                        imported.updatedAt = Date.now();
                        setDrafts((prev) => [...prev, imported]);
                        setSelectedId(imported.id);
                      } catch (err) {
                        alert('导入失败: ' + (err as Error).message);
                      }
                    });
                    e.target.value = '';
                  }
                }}
              />
              导入
            </label>
            {selected && (
              <button
                className="st-btn-sm"
                onClick={() => {
                  const json = JSON.stringify(selected, null, 2);
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selected.name || 'scenario'}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                导出
              </button>
            )}
            {dirty && <span className="st-text-12 st-text-muted">未保存</span>}
            <button className="st-btn-save st-btn-sm" onClick={handleSave}>保存</button>
            <button onClick={tryClose}>&times;</button>
          </div>
        </header>

        <div className="st-flex-1 st-flex st-overflow-hidden">
          {/* --- left sidebar --- */}
          <aside className="st-sidebar-panel-wide">
            <button className="st-btn-sm st-btn-save st-w-full st-mb-8" onClick={handleAdd}>
              + 新场景模板
            </button>
            <ul className="st-list-reset">
              {drafts.length === 0 && (
                <li className="st-text-12 st-text-muted st-p-8">暂无模板</li>
              )}
              {drafts.map((s) => (
                <li
                  key={s.id}
                  className={`st-flex st-items-center st-justify-between st-py-2 st-px-8 st-text-13 ${s.id === selectedId ? 'ds-selected' : ''}`}
                  style={{ cursor: 'pointer', borderRadius: 3 }}
                  onClick={() => setSelectedId(s.id)}
                >
                  <span className="st-flex-1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {scenarioLabel(s)}
                  </span>
                  <button
                    className="st-btn-xxs st-btn-danger-text"
                    onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* --- main editor --- */}
          <main className="st-two-panel-main st-overflow-y-auto">
            {!selected ? (
              <div className="st-empty-state st-empty-state-lg">
                选择左侧模板或新建一个
              </div>
            ) : (
              <div className="st-flex-col st-gap-12 st-flex">
                {/* name + description */}
                <div className="st-flex-col st-gap-4 st-flex">
                  <label className="st-fieldset">
                    <span className="st-text-12 st-text-secondary">模板名称</span>
                    <input
                      className="st-input"
                      value={selected.name}
                      onChange={(e) => handleField('name', e.target.value)}
                    />
                  </label>
                  <label className="st-fieldset">
                    <span className="st-text-12 st-text-secondary">描述</span>
                    <input
                      className="st-input"
                      value={selected.description ?? ''}
                      onChange={(e) => handleField('description', e.target.value)}
                    />
                  </label>
                </div>

                {/* preset */}
                <label className="st-fieldset">
                  <span className="st-text-12 st-text-secondary">预设</span>
                  <select
                    className="st-input"
                    value={selected.presetId ?? ''}
                    onChange={(e) => handleField('presetId', e.target.value || null)}
                  >
                    <option value="">不指定</option>
                    {presets.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>

                {/* variable schema */}
                <label className="st-fieldset">
                  <span className="st-text-12 st-text-secondary">变量结构</span>
                  <select
                    className="st-input"
                    value={selected.variableSchemaId ?? ''}
                    onChange={(e) => handleSchemaChange(e.target.value || null)}
                  >
                    <option value="">不指定</option>
                    {variableSchemas.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </label>

                {/* lorebooks */}
                <div className="st-fieldset">
                  <span className="st-text-12 st-text-secondary">世界书</span>
                  {lorebooks.length === 0 ? (
                    <span className="st-text-12 st-text-muted">暂无世界书</span>
                  ) : (
                    <div className="st-flex-col st-gap-4 st-flex st-mt-4">
                      {lorebooks.map((lb) => (
                        <label key={lb.id} className="st-flex st-items-center st-gap-4 st-text-13" style={{ cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selected.lorebookIds.includes(lb.id)}
                            onChange={() => toggleLorebook(lb.id)}
                          />
                          {lb.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* initial variables */}
                <div className="st-fieldset">
                  <div className="st-flex st-items-center st-justify-between st-mb-4">
                    <span className="st-text-12 st-text-secondary">初始变量</span>
                    <button className="st-btn-xs st-btn-save" onClick={handleVarAdd}>+ 添加</button>
                  </div>
                  {varKeys.length === 0 ? (
                    <span className="st-text-12 st-text-muted">无变量</span>
                  ) : (
                    <div className="st-flex-col st-gap-4 st-flex">
                      {varKeys.map((key) => (
                        <div key={key} className="st-flex st-items-center st-gap-4">
                          <span className="st-text-12 st-mono st-text-secondary" style={{ minWidth: 80 }}>{key}</span>
                          <input
                            className="st-input st-flex-1"
                            value={String(selected.initialVariables[key] ?? '')}
                            onChange={(e) => handleVarChange(key, e.target.value)}
                          />
                          <button
                            className="st-btn-xxs st-btn-danger-text"
                            onClick={() => handleVarRemove(key)}
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* system prompt */}
                <label className="st-fieldset">
                  <span className="st-text-12 st-text-secondary">系统提示词</span>
                  <textarea
                    className="st-textarea"
                    rows={4}
                    value={selected.systemPrompt ?? ''}
                    onChange={(e) => handleField('systemPrompt', e.target.value)}
                  />
                </label>

                {/* user/character name */}
                <div className="st-flex-row st-gap-8 st-flex">
                  <label className="st-fieldset st-flex-1">
                    <span className="st-text-12 st-text-secondary">用户名</span>
                    <input
                      className="st-input"
                      value={selected.userName ?? ''}
                      onChange={(e) => handleField('userName', e.target.value)}
                      placeholder="留空使用默认"
                    />
                  </label>
                  <label className="st-fieldset st-flex-1">
                    <span className="st-text-12 st-text-secondary">角色名</span>
                    <input
                      className="st-input"
                      value={selected.characterName ?? ''}
                      onChange={(e) => handleField('characterName', e.target.value)}
                      placeholder="留空使用默认"
                    />
                  </label>
                </div>

                {/* use template button */}
                <div className="st-flex st-justify-end st-mt-4">
                  <button className="st-btn-save" onClick={handleUseTemplate}>
                    使用此模板开局
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
