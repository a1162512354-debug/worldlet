import { useState, useMemo, useCallback } from 'react';
import type {
  VariableSchema,
  VariableDefinition,
  VariableType,
  VariableDisplayMode,
  VariableTypeConfig,
} from '../../sillytavern/types';
import { useSillytavern } from '../../hooks/useSillytavern';

// --- helpers ---
let _defSeq = 0;
function newDefId(): string {
  return `def_${Date.now()}_${++_defSeq}`;
}

function newSchemaId(): string {
  return `schema_${Date.now()}_${++_defSeq}`;
}

function createEmptySchema(): VariableSchema {
  const now = Date.now();
  return { id: newSchemaId(), name: '新模板', description: '', definitions: [], createdAt: now, updatedAt: now };
}

function createEmptyDef(sortOrder: number): VariableDefinition {
  const now = Date.now();
  return {
    id: newDefId(),
    type: 'number',
    displayName: '',
    aiDescription: '',
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

const VAR_TYPES: { value: VariableType; label: string }[] = [
  { value: 'number', label: '数值' },
  { value: 'enum', label: '枚举' },
  { value: 'list', label: '列表' },
  { value: 'boolean', label: '布尔' },
  { value: 'text', label: '文本' },
  { value: 'bar', label: '进度条' },
];

const DISPLAY_MODES: { value: VariableDisplayMode; label: string }[] = [
  { value: 'progress', label: '进度条' },
  { value: 'badge', label: '徽章' },
  { value: 'text', label: '文本' },
  { value: 'icon', label: '图标' },
  { value: 'grid', label: '网格' },
];

function configForType(type: VariableType): VariableTypeConfig | undefined {
  switch (type) {
    case 'number':
    case 'bar':
      return { min: 0, max: 100, step: 1 };
    case 'enum':
      return { options: [] };
    case 'list':
      return { allowDuplicates: false, maxItems: 20 };
    default:
      return undefined;
  }
}

function defaultForType(type: VariableType): any {
  switch (type) {
    case 'number':
    case 'bar':
      return 0;
    case 'boolean':
      return false;
    case 'list':
      return [];
    default:
      return '';
  }
}

// --- label helpers ---
function defLabel(d: VariableDefinition): string {
  if (d.displayName?.trim()) return d.displayName;
  if (d.id) return d.id;
  return '(未命名)';
}

// --- main component ---
export function VariableSchemaEditorModal({ onClose }: { onClose: () => void }) {
  const {
    variableSchemas,
    addVariableSchema,
    updateVariableSchema,
    deleteVariableSchema,
    showToast,
  } = useSillytavern();

  const [drafts, setDrafts] = useState<VariableSchema[]>(() =>
    variableSchemas.map((s) => structuredClone(s)),
  );
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(
    drafts[0]?.id ?? null,
  );
  const [selectedDefId, setSelectedDefId] = useState<string | null>(null);

  const selectedSchema = useMemo(
    () => drafts.find((s) => s.id === selectedSchemaId) ?? null,
    [drafts, selectedSchemaId],
  );

  // --- dirty ---
  const dirty = useMemo(() => {
    if (drafts.length !== variableSchemas.length) return true;
    for (const d of drafts) {
      const orig = variableSchemas.find((s) => s.id === d.id);
      if (!orig) return true;
      if (d.name !== orig.name || d.description !== orig.description) return true;
      if (d.definitions.length !== orig.definitions.length) return true;
      for (let i = 0; i < d.definitions.length; i++) {
        if (JSON.stringify(d.definitions[i]) !== JSON.stringify(orig.definitions[i])) return true;
      }
    }
    return false;
  }, [drafts, variableSchemas]);

  const tryClose = () => {
    if (dirty && !confirm('放弃未保存的修改?')) return;
    onClose();
  };

  // --- schema CRUD ---
  const handleAddSchema = () => {
    const s = createEmptySchema();
    setDrafts((prev) => [...prev, s]);
    setSelectedSchemaId(s.id);
    setSelectedDefId(null);
  };

  const handleDeleteSchema = (id: string) => {
    if (!confirm('确定删除此模板?')) return;
    setDrafts((prev) => prev.filter((s) => s.id !== id));
    if (selectedSchemaId === id) {
      const remaining = drafts.filter((s) => s.id !== id);
      setSelectedSchemaId(remaining[0]?.id ?? null);
      setSelectedDefId(null);
    }
  };

  const handleSchemaField = useCallback(
    (field: keyof VariableSchema, value: any) => {
      if (!selectedSchemaId) return;
      setDrafts((prev) =>
        prev.map((s) =>
          s.id === selectedSchemaId ? { ...s, [field]: value, updatedAt: Date.now() } : s,
        ),
      );
    },
    [selectedSchemaId],
  );

  // --- definition CRUD ---
  const handleAddDef = () => {
    if (!selectedSchema) return;
    const def = createEmptyDef(selectedSchema.definitions.length);
    def.config = configForType(def.type);
    def.defaultValue = defaultForType(def.type);
    setDrafts((prev) =>
      prev.map((s) =>
        s.id === selectedSchemaId
          ? { ...s, definitions: [...s.definitions, def], updatedAt: Date.now() }
          : s,
      ),
    );
    setSelectedDefId(def.id);
  };

  const handleDeleteDef = (defId: string) => {
    if (!selectedSchema) return;
    setDrafts((prev) =>
      prev.map((s) =>
        s.id === selectedSchemaId
          ? {
              ...s,
              definitions: s.definitions.filter((d) => d.id !== defId),
              updatedAt: Date.now(),
            }
          : s,
      ),
    );
    if (selectedDefId === defId) setSelectedDefId(null);
  };

  const handleMoveDef = (defId: string, dir: -1 | 1) => {
    if (!selectedSchema) return;
    const idx = selectedSchema.definitions.findIndex((d) => d.id === defId);
    const target = idx + dir;
    if (target < 0 || target >= selectedSchema.definitions.length) return;
    setDrafts((prev) =>
      prev.map((s) => {
        if (s.id !== selectedSchemaId) return s;
        const arr = [...s.definitions];
        [arr[idx], arr[target]] = [arr[target], arr[idx]];
        arr.forEach((d, i) => (d.sortOrder = i));
        return { ...s, definitions: arr, updatedAt: Date.now() };
      }),
    );
  };

  const handleDefField = useCallback(
    (defId: string, patch: Partial<VariableDefinition>) => {
      setDrafts((prev) =>
        prev.map((s) => {
          if (s.id !== selectedSchemaId) return s;
          return {
            ...s,
            definitions: s.definitions.map((d) =>
              d.id === defId ? { ...d, ...patch, updatedAt: Date.now() } : d,
            ),
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [selectedSchemaId],
  );

  const handleDefConfigField = useCallback(
    (defId: string, key: keyof VariableTypeConfig, value: any) => {
      setDrafts((prev) =>
        prev.map((s) => {
          if (s.id !== selectedSchemaId) return s;
          return {
            ...s,
            definitions: s.definitions.map((d) => {
              if (d.id !== defId) return d;
              return {
                ...d,
                config: { ...d.config, [key]: value },
                updatedAt: Date.now(),
              };
            }),
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [selectedSchemaId],
  );

  const handleDefTypeChange = useCallback(
    (defId: string, newType: VariableType) => {
      setDrafts((prev) =>
        prev.map((s) => {
          if (s.id !== selectedSchemaId) return s;
          return {
            ...s,
            definitions: s.definitions.map((d) => {
              if (d.id !== defId) return d;
              return {
                ...d,
                type: newType,
                config: configForType(newType),
                defaultValue: defaultForType(newType),
                updatedAt: Date.now(),
              };
            }),
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [selectedSchemaId],
  );

  // --- save all ---
  const handleSave = async () => {
    try {
      // Add new schemas (not in original list)
      for (const d of drafts) {
        const orig = variableSchemas.find((s) => s.id === d.id);
        if (!orig) {
          await addVariableSchema(d);
        } else {
          await updateVariableSchema(d);
        }
      }
      // Delete removed schemas
      for (const orig of variableSchemas) {
        if (!drafts.find((d) => d.id === orig.id)) {
          await deleteVariableSchema(orig.id);
        }
      }
      showToast('已保存');
    } catch (e) {
      alert('保存失败: ' + (e as Error).message);
    }
  };

  return (
    <div className="legacy-modal-overlay" onClick={tryClose}>
      <div className="legacy-modal-shell wide" onClick={(e) => e.stopPropagation()}>
        <header className="legacy-modal-header">
          <strong>变量模板编辑器</strong>
          <button
            onClick={handleSave}
            disabled={!dirty}
            className="ds-save st-btn-sm"
          >
            保存全部
          </button>
          <button onClick={tryClose}>×</button>
        </header>

        <div className="st-flex-1 st-flex st-overflow-hidden">
          {/* ---- Left sidebar: schema list ---- */}
          <aside className="st-sidebar-panel-wide">
            <button
              onClick={handleAddSchema}
              className="st-w-full st-btn-sm st-mb-8"
            >
              + 新建模板
            </button>
            <ul className="st-list-reset">
              {drafts.map((s) => (
                <li
                  key={s.id}
                  onClick={() => {
                    setSelectedSchemaId(s.id);
                    setSelectedDefId(null);
                  }}
                  className={`st-flex-row st-gap-6 st-text-13 st-items-center ${s.id === selectedSchemaId ? 'ds-selected' : ''}`}
                  style={{ padding: '6px 8px', cursor: 'pointer', borderRadius: 4 }}
                >
                  <span
                    className="st-flex-1"
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {s.name || '(未命名)'}
                    <span className="st-text-muted st-text-11" style={{ marginLeft: 6 }}>
                      ({s.definitions.length})
                    </span>
                  </span>
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      handleDeleteSchema(s.id);
                    }}
                    className="ds-danger st-border-none st-bg-transparent"
                    style={{ fontSize: 16 }}
                    title="删除模板"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            {drafts.length === 0 && (
              <div className="st-empty-state st-text-13">
                暂无模板,点上方按钮新建
              </div>
            )}
          </aside>

          {/* ---- Right main: schema editor ---- */}
          <main className="st-two-panel-main st-overflow-y-auto">
            {!selectedSchema ? (
              <div className="st-empty-state-lg">
                选择左侧模板或新建一个
              </div>
            ) : (
              <div className="st-flex-col st-gap-8" style={{ padding: 12 }}>
                {/* schema header fields */}
                <div className="st-flex-col st-gap-4">
                  <label className="st-text-12 st-text-muted">模板名称</label>
                  <input
                    type="text"
                    className="st-input st-text-14"
                    value={selectedSchema.name}
                    onChange={(e) => handleSchemaField('name', e.target.value)}
                    placeholder="输入模板名称"
                  />
                </div>
                <div className="st-flex-col st-gap-4">
                  <label className="st-text-12 st-text-muted">描述</label>
                  <textarea
                    className="st-textarea st-text-13"
                    rows={2}
                    value={selectedSchema.description ?? ''}
                    onChange={(e) => handleSchemaField('description', e.target.value)}
                    placeholder="可选描述"
                  />
                </div>

                {/* definitions list header */}
                <div className="st-flex-row st-items-center st-justify-between st-border-bottom st-pb-8 st-mb-4">
                  <span className="st-text-13 st-font-bold">变量定义 ({selectedSchema.definitions.length})</span>
                  <button onClick={handleAddDef} className="st-btn-xs st-btn-sm">
                    + 添加变量
                  </button>
                </div>

                {/* definitions */}
                {selectedSchema.definitions.length === 0 ? (
                  <div className="st-empty-state st-text-13">暂无变量定义</div>
                ) : (
                  <div className="st-flex-col st-gap-4">
                    {/* list of defs (compact rows) */}
                    {selectedSchema.definitions.map((def, idx) => (
                      <div
                        key={def.id}
                        onClick={() => setSelectedDefId(def.id === selectedDefId ? null : def.id)}
                        style={{
                          border: '1px solid var(--space-border-medium)',
                          borderRadius: 6,
                          background: def.id === selectedDefId ? 'rgba(110,207,207,0.08)' : 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        {/* compact row */}
                        <div
                          className="st-flex-row st-items-center st-gap-6"
                          style={{ padding: '8px 10px' }}
                        >
                          <span className="st-text-11 st-text-muted" style={{ minWidth: 18 }}>
                            {idx + 1}
                          </span>
                          <span className="st-mono st-text-12 st-flex-1">
                            {def.id}
                          </span>
                          <span className="st-text-11 st-text-secondary">
                            {VAR_TYPES.find((t) => t.value === def.type)?.label ?? def.type}
                          </span>
                          <span className="st-text-12 st-flex-1">
                            {defLabel(def)}
                          </span>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleMoveDef(def.id, -1);
                            }}
                            disabled={idx === 0}
                            className="st-btn-xxs st-border-none st-bg-transparent st-text-muted"
                            title="上移"
                          >
                            ↑
                          </button>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleMoveDef(def.id, 1);
                            }}
                            disabled={idx === selectedSchema.definitions.length - 1}
                            className="st-btn-xxs st-border-none st-bg-transparent st-text-muted"
                            title="下移"
                          >
                            ↓
                          </button>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleDeleteDef(def.id);
                            }}
                            className="ds-danger st-border-none st-bg-transparent"
                            style={{ fontSize: 16 }}
                            title="删除"
                          >
                            ×
                          </button>
                        </div>

                        {/* expanded detail form */}
                        {def.id === selectedDefId && (
                          <div
                            className="st-flex-col st-gap-6"
                            style={{ padding: '8px 10px 12px', borderTop: '1px solid var(--space-border-medium)' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DefEditor
                              def={def}
                              onChange={(patch) => handleDefField(def.id, patch)}
                              onConfigChange={(key, val) => handleDefConfigField(def.id, key, val)}
                              onTypeChange={(t) => handleDefTypeChange(def.id, t)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// --- sub-component: single definition editor form ---
function DefEditor({
  def,
  onChange,
  onConfigChange,
  onTypeChange,
}: {
  def: VariableDefinition;
  onChange: (patch: Partial<VariableDefinition>) => void;
  onConfigChange: (key: keyof VariableTypeConfig, value: any) => void;
  onTypeChange: (type: VariableType) => void;
}) {
  const config = def.config ?? {};

  return (
    <div className="st-flex-col st-gap-6">
      {/* row 1: id + type */}
      <div className="st-flex-row st-gap-8">
        <div className="st-flex-col st-gap-2 st-flex-1">
          <label className="st-text-11 st-text-muted">变量 ID (key)</label>
          <input
            type="text"
            className="st-input st-mono st-text-12"
            value={def.id}
            onChange={(e) => onChange({ id: e.target.value })}
            placeholder="my_var"
          />
        </div>
        <div className="st-flex-col st-gap-2" style={{ minWidth: 100 }}>
          <label className="st-text-11 st-text-muted">类型</label>
          <select
            className="st-input st-text-12"
            value={def.type}
            onChange={(e) => onTypeChange(e.target.value as VariableType)}
          >
            {VAR_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="st-flex-col st-gap-2" style={{ minWidth: 100 }}>
          <label className="st-text-11 st-text-muted">显示模式</label>
          <select
            className="st-input st-text-12"
            value={def.displayMode ?? ''}
            onChange={(e) => onChange({ displayMode: (e.target.value || undefined) as VariableDisplayMode | undefined })}
          >
            <option value="">默认</option>
            {DISPLAY_MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* row 2: display name + display format */}
      <div className="st-flex-row st-gap-8">
        <div className="st-flex-col st-gap-2 st-flex-1">
          <label className="st-text-11 st-text-muted">显示名称</label>
          <input
            type="text"
            className="st-input st-text-12"
            value={def.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="玩家看到的名称"
          />
        </div>
        <div className="st-flex-col st-gap-2 st-flex-1">
          <label className="st-text-11 st-text-muted">显示格式</label>
          <input
            type="text"
            className="st-input st-mono st-text-12"
            value={def.displayFormat ?? ''}
            onChange={(e) => onChange({ displayFormat: e.target.value || undefined })}
            placeholder="例: {value}/{max}"
          />
        </div>
      </div>

      {/* description fields */}
      <div className="st-flex-col st-gap-2">
        <label className="st-text-11 st-text-muted">玩家描述</label>
        <textarea
          className="st-textarea st-text-12"
          rows={2}
          value={def.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value || undefined })}
          placeholder="面向玩家的说明文字"
        />
      </div>

      <div className="st-flex-col st-gap-2">
        <label className="st-text-11 st-text-muted">AI 描述 *</label>
        <textarea
          className="st-textarea st-text-12"
          rows={2}
          value={def.aiDescription}
          onChange={(e) => onChange({ aiDescription: e.target.value })}
          placeholder="告诉 AI 这个变量是什么"
        />
      </div>

      <div className="st-flex-row st-gap-8">
        <div className="st-flex-col st-gap-2 st-flex-1">
          <label className="st-text-11 st-text-muted">AI 更新规则</label>
          <textarea
            className="st-textarea st-text-12"
            rows={2}
            value={def.aiUpdateRules ?? ''}
            onChange={(e) => onChange({ aiUpdateRules: e.target.value || undefined })}
            placeholder="AI 应何时/如何更新此变量"
          />
        </div>
        <div className="st-flex-col st-gap-2 st-flex-1">
          <label className="st-text-11 st-text-muted">AI 合法值</label>
          <textarea
            className="st-textarea st-text-12"
            rows={2}
            value={def.aiValidValues ?? ''}
            onChange={(e) => onChange({ aiValidValues: e.target.value || undefined })}
            placeholder="此变量可接受的值范围"
          />
        </div>
      </div>

      {/* type-specific config */}
      {(def.type === 'number' || def.type === 'bar') && (
        <fieldset className="st-fieldset" style={{ padding: '8px 10px' }}>
          <legend>数值范围</legend>
          <div className="st-flex-row st-gap-8">
            <div className="st-flex-col st-gap-2 st-flex-1">
              <label className="st-text-11 st-text-muted">最小值</label>
              <input
                type="number"
                className="st-input st-text-12"
                value={config.min ?? 0}
                onChange={(e) => onConfigChange('min', Number(e.target.value))}
              />
            </div>
            <div className="st-flex-col st-gap-2 st-flex-1">
              <label className="st-text-11 st-text-muted">最大值</label>
              <input
                type="number"
                className="st-input st-text-12"
                value={config.max ?? 100}
                onChange={(e) => onConfigChange('max', Number(e.target.value))}
              />
            </div>
            <div className="st-flex-col st-gap-2 st-flex-1">
              <label className="st-text-11 st-text-muted">步长</label>
              <input
                type="number"
                className="st-input st-text-12"
                value={config.step ?? 1}
                onChange={(e) => onConfigChange('step', Number(e.target.value))}
              />
            </div>
          </div>
          <div className="st-flex-col st-gap-2 st-mt-4">
            <label className="st-text-11 st-text-muted">默认值</label>
            <input
              type="number"
              className="st-input st-text-12"
              value={def.defaultValue ?? 0}
              onChange={(e) => onChange({ defaultValue: Number(e.target.value) })}
            />
          </div>
        </fieldset>
      )}

      {def.type === 'enum' && (
        <fieldset className="st-fieldset" style={{ padding: '8px 10px' }}>
          <legend>枚举选项</legend>
          <EnumOptionsEditor
            options={config.options ?? []}
            onChange={(opts) => onConfigChange('options', opts)}
          />
          <div className="st-flex-col st-gap-2 st-mt-4">
            <label className="st-text-11 st-text-muted">默认值</label>
            <select
              className="st-input st-text-12"
              value={def.defaultValue ?? ''}
              onChange={(e) => onChange({ defaultValue: e.target.value })}
            >
              <option value="">(无)</option>
              {(config.options ?? []).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </fieldset>
      )}

      {def.type === 'list' && (
        <fieldset className="st-fieldset" style={{ padding: '8px 10px' }}>
          <legend>列表配置</legend>
          <div className="st-flex-row st-gap-8">
            <div className="st-flex-col st-gap-2 st-flex-1">
              <label className="st-text-11 st-text-muted">最大条目数</label>
              <input
                type="number"
                className="st-input st-text-12"
                value={config.maxItems ?? 20}
                onChange={(e) => onConfigChange('maxItems', Number(e.target.value))}
              />
            </div>
            <div className="st-flex-col st-gap-2 st-items-center" style={{ paddingTop: 18 }}>
              <label className="st-text-12 st-flex-row st-gap-4 st-items-center">
                <input
                  type="checkbox"
                  checked={config.allowDuplicates ?? false}
                  onChange={(e) => onConfigChange('allowDuplicates', e.target.checked)}
                />
                允许重复
              </label>
            </div>
          </div>
        </fieldset>
      )}

      {def.type === 'boolean' && (
        <fieldset className="st-fieldset" style={{ padding: '8px 10px' }}>
          <legend>布尔配置</legend>
          <label className="st-text-12 st-flex-row st-gap-4 st-items-center">
            <input
              type="checkbox"
              checked={def.defaultValue ?? false}
              onChange={(e) => onChange({ defaultValue: e.target.checked })}
            />
            默认开启
          </label>
        </fieldset>
      )}

      {def.type === 'text' && (
        <fieldset className="st-fieldset" style={{ padding: '8px 10px' }}>
          <legend>文本配置</legend>
          <div className="st-flex-col st-gap-2">
            <label className="st-text-11 st-text-muted">默认值</label>
            <input
              type="text"
              className="st-input st-text-12"
              value={def.defaultValue ?? ''}
              onChange={(e) => onChange({ defaultValue: e.target.value })}
              placeholder="默认文本"
            />
          </div>
        </fieldset>
      )}
    </div>
  );
}

// --- sub-component: enum options list editor ---
function EnumOptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const handleAdd = () => {
    const v = draft.trim();
    if (!v || options.includes(v)) return;
    onChange([...options, v]);
    setDraft('');
  };

  const handleRemove = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  return (
    <div className="st-flex-col st-gap-4">
      <div className="st-flex-row st-gap-6 st-items-center">
        <input
          type="text"
          className="st-input st-text-12 st-flex-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="输入选项值后回车"
        />
        <button onClick={handleAdd} className="st-btn-xs st-btn-sm">添加</button>
      </div>
      {options.length > 0 && (
        <div className="st-flex-wrap st-gap-4">
          {options.map((opt, idx) => (
            <span
              key={idx}
              className="st-flex-row st-items-center st-gap-4"
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                background: 'rgba(110,207,207,0.12)',
                fontSize: 12,
              }}
            >
              {opt}
              <button
                onClick={() => handleRemove(idx)}
                className="st-border-none st-bg-transparent ds-danger"
                style={{ fontSize: 14, lineHeight: 1, cursor: 'pointer' }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {options.length === 0 && (
        <span className="st-text-11 st-text-muted">暂无选项</span>
      )}
    </div>
  );
}
