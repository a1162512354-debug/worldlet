import { useState, useMemo, useCallback } from 'react';
import type { Mod, ModType, ModContent } from '../../sillytavern/types';
import { useSillytavern } from '../../hooks/useSillytavern';

// ---- helpers ----
let _seq = 0;
function newModId(): string {
  return `mod_${Date.now()}_${++_seq}`;
}

const MOD_TYPE_INFO: Record<ModType, { label: string; icon: string; desc: string }> = {
  worldbook: { label: '世界书', icon: '📚', desc: '注入世界书设定（世界观、NPC、地点）' },
  item: { label: '物品', icon: '🎒', desc: '注入物品到初始变量（装备、道具、消耗品）' },
  skill: { label: '技能', icon: '⚔️', desc: '注入技能（剑术、火球术、治疗术等）' },
  plot: { label: '剧情', icon: '📖', desc: '注入开局剧情/背景设定' },
};

function createEmptyMod(): Mod {
  const now = Date.now();
  return {
    id: newModId(),
    name: '新 MOD',
    description: '',
    icon: '📦',
    type: 'item',
    content: {
      type: 'item',
      schemaId: null,
      itemName: '',
      itemDescription: '',
      quantity: 1,
      values: {},
      category: 'other',
    },
    tags: [],
    openingDescription: '',
    createdAt: now,
    updatedAt: now,
  };
}

function createContentForType(type: ModType): ModContent {
  switch (type) {
    case 'worldbook': return { type: 'worldbook', lorebookIds: [] };
    case 'item': return {
      type: 'item',
      schemaId: null,
      itemName: '',
      itemDescription: '',
      quantity: 1,
      values: {},
      category: 'other',
    };
    case 'skill': return {
      type: 'skill',
      schemaId: null,
      values: {},
    };
    case 'plot': return { type: 'plot', openingText: '' };
  }
}

// ---- main component ----
export function ModWorkshopPage({ onClose }: { onClose: () => void }) {
  const { mods, addMod, updateMod, deleteMod, lorebooks, variableSchemas, showToast } = useSillytavern();

  const [drafts, setDrafts] = useState<Mod[]>(() => mods.map((m) => structuredClone(m)));
  const [selectedId, setSelectedId] = useState<string | null>(drafts[0]?.id ?? null);

  const selected = useMemo(
    () => drafts.find((m) => m.id === selectedId) ?? null,
    [drafts, selectedId],
  );

  // ---- dirty check ----
  const dirty = useMemo(() => {
    if (drafts.length !== mods.length) return true;
    for (const d of drafts) {
      const orig = mods.find((m) => m.id === d.id);
      if (!orig) return true;
      if (JSON.stringify(d) !== JSON.stringify(orig)) return true;
    }
    return false;
  }, [drafts, mods]);

  const tryClose = () => {
    if (dirty && !confirm('放弃未保存的修改?')) return;
    onClose();
  };

  // ---- CRUD ----
  const handleAdd = () => {
    const mod = createEmptyMod();
    setDrafts((prev) => [...prev, mod]);
    setSelectedId(mod.id);
  };

  const handleDelete = (id: string) => {
    if (!confirm('确定删除此 MOD?')) return;
    setDrafts((prev) => prev.filter((m) => m.id !== id));
    if (selectedId === id) {
      const remaining = drafts.filter((m) => m.id !== id);
      setSelectedId(remaining[0]?.id ?? null);
    }
  };

  const handleField = useCallback(
    (field: keyof Mod, value: any) => {
      if (!selectedId) return;
      setDrafts((prev) =>
        prev.map((m) =>
          m.id === selectedId ? { ...m, [field]: value, updatedAt: Date.now() } : m,
        ),
      );
    },
    [selectedId],
  );

  const handleTypeChange = useCallback(
    (newType: ModType) => {
      if (!selectedId) return;
      setDrafts((prev) =>
        prev.map((m) =>
          m.id === selectedId
            ? { ...m, type: newType, content: createContentForType(newType), updatedAt: Date.now() }
            : m,
        ),
      );
    },
    [selectedId],
  );

  const handleContentField = useCallback(
    (key: string, value: any) => {
      if (!selectedId) return;
      setDrafts((prev) =>
        prev.map((m) => {
          if (m.id !== selectedId) return m;
          return {
            ...m,
            content: { ...m.content, [key]: value },
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [selectedId],
  );

  // ---- value editor ----
  const handleValueChange = useCallback(
    (fieldKey: string, value: any) => {
      if (!selectedId) return;
      setDrafts((prev) =>
        prev.map((m) => {
          if (m.id !== selectedId) return m;
          if (m.content.type !== 'item' && m.content.type !== 'skill') return m;
          return {
            ...m,
            content: {
              ...m.content,
              values: { ...m.content.values, [fieldKey]: value },
            },
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [selectedId],
  );

  // ---- tag editor ----
  const handleTagAdd = useCallback(() => {
    if (!selectedId) return;
    const tag = prompt('输入标签:');
    if (!tag?.trim()) return;
    setDrafts((prev) =>
      prev.map((m) => {
        if (m.id !== selectedId) return m;
        if (m.tags.includes(tag.trim())) return m;
        return { ...m, tags: [...m.tags, tag.trim()], updatedAt: Date.now() };
      }),
    );
  }, [selectedId]);

  const handleTagRemove = useCallback(
    (tag: string) => {
      if (!selectedId) return;
      setDrafts((prev) =>
        prev.map((m) => {
          if (m.id !== selectedId) return m;
          return { ...m, tags: m.tags.filter((t) => t !== tag), updatedAt: Date.now() };
        }),
      );
    },
    [selectedId],
  );

  // ---- lorebook toggle ----
  const toggleLorebook = useCallback(
    (lorebookId: string) => {
      if (!selectedId) return;
      setDrafts((prev) =>
        prev.map((m) => {
          if (m.id !== selectedId) return m;
          if (m.content.type !== 'worldbook') return m;
          const ids = m.content.lorebookIds.includes(lorebookId)
            ? m.content.lorebookIds.filter((id) => id !== lorebookId)
            : [...m.content.lorebookIds, lorebookId];
          return { ...m, content: { ...m.content, lorebookIds: ids }, updatedAt: Date.now() };
        }),
      );
    },
    [selectedId],
  );

  // ---- save ----
  const handleSave = async () => {
    try {
      const now = Date.now();
      for (const d of drafts) {
        const orig = mods.find((m) => m.id === d.id);
        const saved = { ...d, updatedAt: now };
        if (!orig) await addMod(saved);
        else await updateMod(saved);
      }
      for (const orig of mods) {
        if (!drafts.find((d) => d.id === orig.id)) await deleteMod(orig.id);
      }
      // 保存后同步 drafts
      setDrafts((prev) => prev.map((d) => ({ ...d, updatedAt: now })));
      showToast('已保存');
    } catch (e) {
      alert('保存失败: ' + (e as Error).message);
    }
  };

  // ---- import/export ----
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const pkg = JSON.parse(text);
        if (pkg.format === 'worldlet-mod-v1' && pkg.mod) {
          const imported: Mod = {
            ...pkg.mod,
            id: newModId(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          setDrafts((prev) => [...prev, imported]);
          setSelectedId(imported.id);
        } else {
          alert('无效的 MOD 文件格式');
        }
      } catch {
        alert('导入失败: 文件解析错误');
      }
    };
    input.click();
  };

  const handleExport = () => {
    if (!selected) return;
    const pkg = {
      format: 'worldlet-mod-v1',
      mod: { ...selected, id: undefined, createdAt: undefined, updatedAt: undefined },
    };
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selected.name || 'mod'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- render content editor based on type ----
  const renderContentEditor = () => {
    if (!selected) return null;
    const { content } = selected;

    switch (content.type) {
      case 'worldbook':
        return (
          <div className="st-fieldset">
            <span className="st-text-12 st-text-secondary">绑定世界书</span>
            {lorebooks.length === 0 ? (
              <span className="st-text-12 st-text-muted">暂无世界书</span>
            ) : (
              <div className="st-flex-col st-gap-4 st-mt-4">
                {lorebooks.map((lb) => (
                  <label key={lb.id} className="st-flex st-items-center st-gap-4 st-text-13" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={content.lorebookIds.includes(lb.id)}
                      onChange={() => toggleLorebook(lb.id)}
                    />
                    {lb.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        );

      case 'item':
        // 获取当前绑定的变量结构
        const boundSchema = content.schemaId
          ? variableSchemas.find((s) => s.id === content.schemaId)
          : null;
        const schemaFields = boundSchema?.definitions ?? [];
        const values = content.values ?? {};

        return (
          <div className="st-flex-col st-gap-12">
            {/* 物品基本信息 */}
            <div className="st-fieldset">
              <span className="st-text-12 st-font-bold">物品信息</span>
              <div className="st-flex-col st-gap-4 st-mt-4">
                <div className="st-flex-row st-gap-8">
                  <label className="st-flex-col st-gap-2 st-flex-1">
                    <span className="st-text-11 st-text-muted">物品名称</span>
                    <input
                      className="st-input st-text-12"
                      value={content.itemName || ''}
                      onChange={(e) => handleContentField('itemName', e.target.value)}
                      placeholder="如：铁剑、治疗药水"
                    />
                  </label>
                  <label className="st-flex-col st-gap-2" style={{ width: 100 }}>
                    <span className="st-text-11 st-text-muted">数量</span>
                    <input
                      type="number"
                      className="st-input st-text-12"
                      value={content.quantity || 1}
                      onChange={(e) => handleContentField('quantity', Math.max(1, Number(e.target.value)))}
                      min={1}
                    />
                  </label>
                </div>
                <label className="st-flex-col st-gap-2">
                  <span className="st-text-11 st-text-muted">物品描述</span>
                  <input
                    className="st-input st-text-12"
                    value={content.itemDescription || ''}
                    onChange={(e) => handleContentField('itemDescription', e.target.value)}
                    placeholder="物品的简要描述"
                  />
                </label>
                <label className="st-flex-col st-gap-2">
                  <span className="st-text-11 st-text-muted">背包分类</span>
                  <select
                    className="st-input st-text-12"
                    value={content.category || 'other'}
                    onChange={(e) => handleContentField('category', e.target.value)}
                  >
                    <option value="weapons">⚔️ 武器</option>
                    <option value="armor">🛡️ 防具</option>
                    <option value="consumables">🧪 消耗品</option>
                    <option value="materials">📦 材料</option>
                    <option value="other">📋 其他</option>
                  </select>
                </label>
              </div>
            </div>

            {/* 变量结构选择 */}
            <div className="st-fieldset">
              <div className="st-flex-row st-gap-8 st-items-center">
                <span className="st-text-12 st-font-bold">变量结构</span>
                <select
                  className="st-input st-flex-1 st-text-12"
                  value={content.schemaId ?? ''}
                  onChange={(e) => {
                    const schemaId = e.target.value || null;
                    handleContentField('schemaId', schemaId);
                    // 切换结构时自动填充默认值
                    if (schemaId && schemaId !== content.schemaId) {
                      const schema = variableSchemas.find((s) => s.id === schemaId);
                      if (schema) {
                        const defaultValues: Record<string, any> = {};
                        for (const def of schema.definitions) {
                          if (def.defaultValue !== undefined) {
                            defaultValues[def.id] = def.defaultValue;
                          }
                        }
                        handleContentField('values', defaultValues);
                      }
                    } else if (!schemaId) {
                      handleContentField('values', {});
                    }
                  }}
                >
                  <option value="">-- 选择变量结构 --</option>
                  {variableSchemas.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.definitions.length} 个字段)
                    </option>
                  ))}
                </select>
              </div>
              {!boundSchema && (
                <div className="st-text-11 st-text-muted st-mt-4">
                  请先在「变量结构」中创建结构，然后在此处选择
                </div>
              )}
            </div>

            {/* 字段值设置 */}
            {boundSchema && (
              <div className="st-fieldset">
                <span className="st-text-12 st-text-secondary">默认值设置</span>
                <div className="st-text-11 st-text-muted st-mb-8">
                  使用「{boundSchema.name}」结构的字段
                </div>
                {schemaFields.length === 0 ? (
                  <span className="st-text-12 st-text-muted">该结构无字段定义</span>
                ) : (
                  <div className="st-flex-col st-gap-4">
                    {schemaFields.map((field) => (
                      <div key={field.id} className="st-flex-row st-gap-8 st-items-center">
                        <span className="st-text-12 st-text-secondary" style={{ minWidth: 80 }}>
                          {field.displayName || field.id}
                        </span>
                        {field.type === 'number' || field.type === 'bar' ? (
                          <input
                            type="number"
                            className="st-input st-text-12 st-flex-1"
                            value={values[field.id] ?? field.defaultValue ?? 0}
                            onChange={(e) => handleValueChange(field.id, Number(e.target.value))}
                            min={field.config?.min}
                            max={field.config?.max}
                          />
                        ) : field.type === 'boolean' ? (
                          <label className="st-flex-row st-gap-4 st-items-center">
                            <input
                              type="checkbox"
                              checked={values[field.id] ?? field.defaultValue ?? false}
                              onChange={(e) => handleValueChange(field.id, e.target.checked)}
                            />
                            <span className="st-text-12">{values[field.id] ? '是' : '否'}</span>
                          </label>
                        ) : field.type === 'enum' ? (
                          <select
                            className="st-input st-text-12 st-flex-1"
                            value={values[field.id] ?? field.defaultValue ?? ''}
                            onChange={(e) => handleValueChange(field.id, e.target.value)}
                          >
                            <option value="">请选择</option>
                            {(field.config?.options ?? []).map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="st-input st-text-12 st-flex-1"
                            value={String(values[field.id] ?? field.defaultValue ?? '')}
                            onChange={(e) => handleValueChange(field.id, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'plot':
        return (
          <div className="st-fieldset">
            <span className="st-text-12 st-text-secondary">开局剧情文本</span>
            <textarea
              className="st-textarea st-mt-4"
              rows={6}
              value={content.openingText}
              onChange={(e) => handleContentField('openingText', e.target.value)}
              placeholder="输入开局剧情/背景设定..."
            />
          </div>
        );
    }
  };

  // ---- render ----
  return (
    <div className="legacy-modal-overlay" onClick={tryClose}>
      <div className="legacy-modal-shell wide" onClick={(e) => e.stopPropagation()}>
        <header className="legacy-modal-header">
          <strong>MOD 工坊</strong>
          <div className="st-flex st-items-center st-gap-8">
            <button className="st-btn-sm" onClick={handleImport}>导入</button>
            {selected && <button className="st-btn-sm" onClick={handleExport}>导出</button>}
            {dirty && <span className="st-text-12 st-text-muted">未保存</span>}
            <button className="st-btn-save st-btn-sm" onClick={handleSave}>保存</button>
            <button onClick={tryClose}>&times;</button>
          </div>
        </header>

        <div className="st-flex-1 st-flex st-overflow-hidden">
          {/* ---- 左侧边栏: MOD 列表 ---- */}
          <aside className="st-sidebar-panel-wide">
            <button className="st-btn-sm st-btn-save st-w-full st-mb-8" onClick={handleAdd}>
              + 新建 MOD
            </button>
            <ul className="st-list-reset">
              {drafts.length === 0 && (
                <li className="st-text-12 st-text-muted st-p-8">暂无 MOD</li>
              )}
              {drafts.map((m) => (
                <li
                  key={m.id}
                  className={`st-flex st-items-center st-justify-between st-py-2 st-px-8 st-text-13 ${m.id === selectedId ? 'ds-selected' : ''}`}
                  style={{ cursor: 'pointer', borderRadius: 3 }}
                  onClick={() => setSelectedId(m.id)}
                >
                  <span className="st-flex-1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.icon} {m.name || '(未命名)'}
                    <span className="st-text-11 st-text-muted st-ml-4">
                      {MOD_TYPE_INFO[m.type].label}
                    </span>
                  </span>
                  <button
                    className="st-btn-xxs st-btn-danger-text"
                    onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* ---- 主编辑区 ---- */}
          <main className="st-two-panel-main st-overflow-y-auto">
            {!selected ? (
              <div className="st-empty-state st-empty-state-lg">
                选择左侧 MOD 或新建一个
              </div>
            ) : (
              <div className="st-flex-col st-gap-12 st-flex">
                {/* 基本信息 */}
                <div className="st-flex-col st-gap-4">
                  <div className="st-flex-row st-gap-8">
                    <label className="st-fieldset st-flex-1">
                      <span className="st-text-12 st-text-secondary">名称</span>
                      <input
                        className="st-input"
                        value={selected.name}
                        onChange={(e) => handleField('name', e.target.value)}
                      />
                    </label>
                    <label className="st-fieldset" style={{ width: 80 }}>
                      <span className="st-text-12 st-text-secondary">图标</span>
                      <input
                        className="st-input st-text-center"
                        value={selected.icon}
                        onChange={(e) => handleField('icon', e.target.value)}
                        maxLength={2}
                      />
                    </label>
                  </div>
                  <label className="st-fieldset">
                    <span className="st-text-12 st-text-secondary">描述</span>
                    <input
                      className="st-input"
                      value={selected.description}
                      onChange={(e) => handleField('description', e.target.value)}
                      placeholder="MOD 的简要描述"
                    />
                  </label>
                </div>

                {/* 类型选择 */}
                <div className="st-fieldset">
                  <span className="st-text-12 st-text-secondary">MOD 类型</span>
                  <div className="st-flex-row st-gap-8 st-mt-4 st-flex-wrap">
                    {(Object.keys(MOD_TYPE_INFO) as ModType[]).map((type) => {
                      const info = MOD_TYPE_INFO[type];
                      return (
                        <label
                          key={type}
                          className={`st-flex-row st-gap-4 st-items-center st-p-8 st-rounded st-cursor-pointer ${selected.type === type ? 'ds-selected' : ''}`}
                          style={{ border: '1px solid var(--space-border-medium)', cursor: 'pointer' }}
                        >
                          <input
                            type="radio"
                            name="modType"
                            checked={selected.type === type}
                            onChange={() => handleTypeChange(type)}
                          />
                          <span>{info.icon}</span>
                          <span className="st-text-13 st-font-bold">{info.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="st-text-11 st-text-muted st-mt-4">
                    {MOD_TYPE_INFO[selected.type].desc}
                  </div>
                </div>

                {/* 内容编辑器 */}
                {renderContentEditor()}

                {/* 开局描述 */}
                <div className="st-fieldset">
                  <span className="st-text-12 st-text-secondary">开局描述</span>
                  <textarea
                    className="st-textarea st-mt-4"
                    rows={3}
                    value={selected.openingDescription}
                    onChange={(e) => handleField('openingDescription', e.target.value)}
                    placeholder="注入到第一层消息的描述，让 AI 理解你获得了什么..."
                  />
                </div>

                {/* 标签 */}
                <div className="st-fieldset">
                  <div className="st-flex st-items-center st-justify-between st-mb-4">
                    <span className="st-text-12 st-text-secondary">标签</span>
                    <button className="st-btn-xs" onClick={handleTagAdd}>+ 添加</button>
                  </div>
                  {selected.tags.length === 0 ? (
                    <span className="st-text-12 st-text-muted">无标签</span>
                  ) : (
                    <div className="st-flex-wrap st-gap-4">
                      {selected.tags.map((tag) => (
                        <span
                          key={tag}
                          className="st-flex-row st-items-center st-gap-4"
                          style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            background: 'rgba(110,207,207,0.12)',
                            fontSize: 12,
                          }}
                        >
                          {tag}
                          <button
                            onClick={() => handleTagRemove(tag)}
                            className="st-border-none st-bg-transparent ds-danger"
                            style={{ fontSize: 14, lineHeight: 1, cursor: 'pointer' }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
