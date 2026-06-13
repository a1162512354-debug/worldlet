import { useState, useMemo, useCallback } from 'react';
import type {
  PanelLayout,
  PanelWidget,
  WidgetType,
  PanelTemplate,
  VariableDefinition,
} from '../../sillytavern/types';
import { useSillytavern } from '../../hooks/useSillytavern';
import { VariableBadge } from './VariableBadge';

// ---- preset templates ----

const PRESET_TEMPLATES: PanelTemplate[] = [
  {
    name: 'RPG 状态栏',
    description: 'HP/MP 进度条 + 等级/经验 + 属性文字',
    icon: '⚔️',
    columns: 2,
    widgets: [
      { widgetType: 'progress', variableKey: 'hp', label: 'HP', sortOrder: 0, row: 0, col: 0 },
      { widgetType: 'progress', variableKey: 'mp', label: 'MP', sortOrder: 1, row: 0, col: 1 },
      { widgetType: 'badge', variableKey: 'level', label: '等级', sortOrder: 2, row: 1, col: 0 },
      { widgetType: 'progress', variableKey: 'exp', label: '经验', sortOrder: 3, row: 1, col: 1 },
      { widgetType: 'text', variableKey: 'strength', label: '力量', sortOrder: 4, row: 2, col: 0 },
      { widgetType: 'text', variableKey: 'agility', label: '敏捷', sortOrder: 5, row: 2, col: 1 },
      { widgetType: 'text', variableKey: 'intelligence', label: '智力', sortOrder: 6, row: 3, col: 0 },
    ],
  },
  {
    name: '背包网格',
    description: '金币徽章 + 物品格子展示',
    icon: '🎒',
    columns: 3,
    widgets: [
      { widgetType: 'badge', variableKey: 'gold', label: '金币', sortOrder: 0, row: 0, col: 0, colSpan: 3 },
      { widgetType: 'grid', variableKey: 'items', label: '物品', sortOrder: 1, row: 1, col: 0, colSpan: 3 },
    ],
  },
  {
    name: '好感度列表',
    description: '角色名 + 好感度进度条',
    icon: '💕',
    columns: 2,
    widgets: [
      { widgetType: 'text', variableKey: 'charName1', label: '角色', sortOrder: 0, row: 0, col: 0 },
      { widgetType: 'progress', variableKey: 'affection1', label: '好感度', sortOrder: 1, row: 0, col: 1 },
      { widgetType: 'text', variableKey: 'charName2', label: '角色', sortOrder: 2, row: 1, col: 0 },
      { widgetType: 'progress', variableKey: 'affection2', label: '好感度', sortOrder: 3, row: 1, col: 1 },
    ],
  },
];

const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  progress: '进度条',
  badge: '徽章',
  list: '列表',
  grid: '网格',
  text: '文字',
  separator: '分隔线',
  'inventory-category': '背包分类',
  'inventory-item': '背包物品',
};

const INVENTORY_CATEGORIES = [
  { key: 'weapons', label: '武器', icon: '⚔️' },
  { key: 'armor', label: '防具', icon: '🛡️' },
  { key: 'consumables', label: '消耗品', icon: '🧪' },
  { key: 'materials', label: '材料', icon: '📦' },
  { key: 'other', label: '其他', icon: '📋' },
];

// ---- helpers ----

function newId(): string {
  return crypto.randomUUID();
}

function emptyLayout(): PanelLayout {
  return {
    id: newId(),
    name: '新布局',
    description: '',
    columns: 2,
    widgets: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function layoutFromTemplate(tpl: PanelTemplate): PanelLayout {
  return {
    id: newId(),
    name: tpl.name,
    description: tpl.description,
    columns: tpl.columns,
    widgets: tpl.widgets.map((w, i) => ({ ...w, id: newId() })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/** Find the next empty (row, col) position in a widget grid */
function nextPosition(widgets: PanelWidget[], columns: number): { row: number; col: number } {
  if (widgets.length === 0) return { row: 0, col: 0 };
  const maxRow = Math.max(...widgets.map((w) => w.row));
  // find first gap, or append to end
  for (let r = 0; r <= maxRow + 1; r++) {
    for (let c = 0; c < columns; c++) {
      const occupied = widgets.some(
        (w) => w.row === r && c >= w.col && c < w.col + (w.colSpan ?? 1),
      );
      if (!occupied) return { row: r, col: c };
    }
  }
  return { row: maxRow + 1, col: 0 };
}

/** Collect all variable keys from all schemas + active chat */
function allVariableKeys(
  schemas: { definitions: { id: string; displayName: string }[] }[],
  chatVars: Record<string, any>,
): { key: string; label: string }[] {
  const seen = new Set<string>();
  const result: { key: string; label: string }[] = [];
  // from schemas
  for (const s of schemas) {
    for (const d of s.definitions) {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        result.push({ key: d.id, label: d.displayName });
      }
    }
  }
  // from chat variables (catch keys not in schemas)
  for (const k of Object.keys(chatVars)) {
    if (!seen.has(k)) {
      seen.add(k);
      result.push({ key: k, label: k });
    }
  }
  return result;
}

/** Build definition lookup: variableKey -> VariableDefinition */
function buildDefMap(
  schemas: { definitions: VariableDefinition[] }[],
): Map<string, VariableDefinition> {
  const map = new Map<string, VariableDefinition>();
  for (const s of schemas) {
    for (const d of s.definitions) {
      map.set(d.id, d);
    }
  }
  return map;
}

// ---- widget row editor ----

function WidgetRow({
  widget,
  index,
  variableOptions,
  columns,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  widget: PanelWidget;
  index: number;
  variableOptions: { key: string; label: string }[];
  columns: number;
  onChange: (w: PanelWidget) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const isInventoryCategory = widget.widgetType === 'inventory-category';
  const isInventoryItem = widget.widgetType === 'inventory-item';

  return (
    <div
      className="st-border st-rounded st-p-8 st-mb-8"
      style={{ background: 'rgba(110, 207, 207, 0.04)' }}
    >
      <div className="st-flex-row st-gap-8 st-items-center st-mb-4">
        <span className="st-mono st-text-11 st-text-muted" style={{ minWidth: 24 }}>
          #{index + 1}
        </span>

        {/* variable key or inventory selector */}
        {isInventoryCategory ? (
          <select
            value={widget.variableKey}
            onChange={(e) => onChange({ ...widget, variableKey: e.target.value })}
            className="st-p-4 st-flex-1 st-text-12"
          >
            <option value="">-- 选择背包分类 --</option>
            {INVENTORY_CATEGORIES.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
        ) : isInventoryItem ? (
          <select
            value={widget.variableKey}
            onChange={(e) => onChange({ ...widget, variableKey: e.target.value })}
            className="st-p-4 st-flex-1 st-text-12"
          >
            <option value="">-- 选择背包物品 --</option>
            {variableOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label} ({o.key})
              </option>
            ))}
          </select>
        ) : (
          <select
            value={widget.variableKey}
            onChange={(e) => onChange({ ...widget, variableKey: e.target.value })}
            className="st-p-4 st-flex-1 st-text-12"
          >
            <option value="">-- 选择变量 --</option>
            {variableOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label} ({o.key})
              </option>
            ))}
          </select>
        )}

        {/* widget type */}
        <select
          value={widget.widgetType}
          onChange={(e) => onChange({ ...widget, widgetType: e.target.value as WidgetType })}
          className="st-p-4 st-text-12"
          style={{ width: 100 }}
        >
          {Object.entries(WIDGET_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {/* move buttons */}
        <button onClick={onMoveUp} className="st-btn-xxs" title="上移" disabled={index === 0}>
          ▲
        </button>
        <button onClick={onMoveDown} className="st-btn-xxs" title="下移">
          ▼
        </button>
        <button onClick={onRemove} className="st-btn-xxs st-btn-danger-text" title="删除">
          ✕
        </button>
      </div>

      <div className="st-flex-row st-gap-8 st-items-center">
        {/* label */}
        <input
          type="text"
          value={widget.label ?? ''}
          placeholder="自定义标签"
          onChange={(e) => onChange({ ...widget, label: e.target.value || undefined })}
          className="st-p-4 st-text-12 st-flex-1"
        />

        {/* row / col / colSpan */}
        <label className="st-text-11 st-text-muted st-flex-row st-items-center st-gap-4">
          行
          <input
            type="number"
            min={0}
            value={widget.row}
            onChange={(e) => onChange({ ...widget, row: Math.max(0, +e.target.value) })}
            className="st-p-4 st-text-12"
            style={{ width: 50 }}
          />
        </label>
        <label className="st-text-11 st-text-muted st-flex-row st-items-center st-gap-4">
          列
          <input
            type="number"
            min={0}
            max={columns - 1}
            value={widget.col}
            onChange={(e) =>
              onChange({ ...widget, col: Math.max(0, Math.min(columns - 1, +e.target.value)) })
            }
            className="st-p-4 st-text-12"
            style={{ width: 50 }}
          />
        </label>
        <label className="st-text-11 st-text-muted st-flex-row st-items-center st-gap-4">
          跨列
          <input
            type="number"
            min={1}
            max={columns}
            value={widget.colSpan ?? 1}
            onChange={(e) =>
              onChange({ ...widget, colSpan: Math.max(1, Math.min(columns, +e.target.value)) })
            }
            className="st-p-4 st-text-12"
            style={{ width: 50 }}
          />
        </label>
      </div>
    </div>
  );
}

// ---- preview ----

function LayoutPreview({
  layout,
  variables,
  inventory,
  defMap,
}: {
  layout: PanelLayout;
  variables: Record<string, any>;
  inventory: { weapons: any[]; armor: any[]; consumables: any[]; materials: any[]; other: any[] };
  defMap: Map<string, VariableDefinition>;
}) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // group widgets by row
  const rowMap = new Map<number, PanelWidget[]>();
  for (const w of layout.widgets) {
    const list = rowMap.get(w.row) ?? [];
    list.push(w);
    rowMap.set(w.row, list);
  }
  const rows = Array.from(rowMap.entries()).sort(([a], [b]) => a - b);

  const renderWidget = (w: PanelWidget) => {
    if (w.widgetType === 'separator') {
      return (
        <div
          style={{
            borderTop: '1px solid var(--space-border-medium)',
            margin: '8px 0',
          }}
        />
      );
    }

    if (w.widgetType === 'inventory-category') {
      const category = w.variableKey as keyof typeof inventory;
      const items = inventory[category] ?? [];
      const catInfo = INVENTORY_CATEGORIES.find((c) => c.key === category);
      const isExpanded = expandedCategory === category;

      return (
        <div className="st-border st-rounded" style={{ background: 'var(--space-surface-deep)' }}>
          <button
            onClick={() => setExpandedCategory(isExpanded ? null : category)}
            className="st-flex-row st-items-center st-justify-between st-w-full st-p-8"
            style={{ cursor: 'pointer', background: 'transparent' }}
          >
            <div className="st-text-12 st-font-bold">
              {catInfo?.icon || '📦'} {catInfo?.label || category}
              <span className="st-text-11 st-text-muted st-ml-4">({items.length})</span>
            </div>
            <span className="st-text-11 st-text-muted">{isExpanded ? '▼' : '▶'}</span>
          </button>

          {isExpanded && (
            <div className="st-p-8 st-border-top" style={{ borderColor: 'var(--space-border-medium)' }}>
              {items.length === 0 ? (
                <div className="st-text-11 st-text-muted">空</div>
              ) : (
                <div className="st-flex-col st-gap-4">
                  {items.map((item: any) => (
                    <div key={item.id}>
                      <button
                        onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                        className="st-flex-row st-items-center st-justify-between st-w-full st-text-12"
                        style={{ cursor: 'pointer', background: 'transparent', padding: '4px 0' }}
                      >
                        <span>
                          {item.name} {item.quantity > 1 ? `×${item.quantity}` : ''}
                        </span>
                        <span className="st-text-11 st-text-muted">
                          {expandedItem === item.id ? '▼' : '▶'}
                        </span>
                      </button>
                      {expandedItem === item.id && (
                        <div className="st-ml-12 st-mt-4 st-flex-col st-gap-2">
                          {item.description && (
                            <div className="st-text-11 st-text-muted">{item.description}</div>
                          )}
                          {Object.entries(item.values).map(([key, value]) => {
                            const def = defMap.get(key);
                            return (
                              <div key={key} className="st-flex-row st-gap-8 st-text-11">
                                <span className="st-text-muted" style={{ minWidth: 60 }}>
                                  {def?.displayName || key}
                                </span>
                                <span className="st-mono">{String(value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (w.widgetType === 'inventory-item') {
      const allItems = Object.values(inventory).flat();
      const item = allItems.find((i: any) => i.id === w.variableKey);
      if (!item) {
        return <div className="st-text-12 st-text-muted">物品未找到</div>;
      }
      return (
        <div className="st-border st-rounded st-p-8" style={{ background: 'var(--space-surface-deep)' }}>
          <div className="st-text-12 st-font-bold">{(item as any).name}</div>
          {(item as any).quantity > 1 && (
            <span className="st-text-11 st-text-muted">×{(item as any).quantity}</span>
          )}
        </div>
      );
    }

    return (
      <VariableBadge
        varKey={w.variableKey}
        value={variables[w.variableKey]}
        definition={defMap.get(w.variableKey)}
      />
    );
  };

  return (
    <div
      className="st-border st-rounded st-p-12"
      style={{
        background: 'rgba(110, 207, 207, 0.03)',
        display: 'grid',
        gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
        gap: 8,
      }}
    >
      {rows.map(([rowIdx, widgets]) =>
        widgets
          .sort((a, b) => a.col - b.col)
          .map((w) => (
            <div
              key={w.id}
              style={{
                gridColumn: `span ${w.colSpan ?? 1}`,
                minHeight: 32,
              }}
            >
              {renderWidget(w)}
            </div>
          )),
      )}
      {layout.widgets.length === 0 && (
        <div
          className="st-text-muted st-text-13 st-text-center"
          style={{ gridColumn: `1 / -1`, padding: 24 }}
        >
          添加组件后在此预览
        </div>
      )}
    </div>
  );
}

// ---- main component ----

export function PanelLayoutEditorModal({ onClose }: { onClose: () => void }) {
  const {
    panelLayouts,
    addPanelLayout,
    updatePanelLayout,
    deletePanelLayout,
    variableSchemas,
    activeChat,
  } = useSillytavern();

  const variables = activeChat?.variables ?? {};
  const defMap = useMemo(() => buildDefMap(variableSchemas), [variableSchemas]);
  const varOptions = useMemo(
    () => allVariableKeys(variableSchemas, variables),
    [variableSchemas, variables],
  );

  // selected layout id (null = none selected)
  const [selectedId, setSelectedId] = useState<string | null>(panelLayouts[0]?.id ?? null);
  // local draft
  const original = useMemo(
    () => panelLayouts.find((l) => l.id === selectedId) ?? null,
    [panelLayouts, selectedId],
  );
  const [draft, setDraft] = useState<PanelLayout | null>(original);

  // sync draft when selection changes
  const handleSelect = useCallback(
    (id: string) => {
      if (draft && original && JSON.stringify(draft) !== JSON.stringify(original)) {
        if (!confirm('当前布局有未保存修改，确定切换?')) return;
      }
      setSelectedId(id);
      const next = panelLayouts.find((l) => l.id === id) ?? null;
      setDraft(next);
    },
    [draft, original, panelLayouts],
  );

  const dirty = useMemo(() => {
    if (!draft) return false;
    // 新建布局（original 不存在）时 dirty 为 true
    if (!original) return true;
    return JSON.stringify(draft) !== JSON.stringify(original);
  }, [draft, original]);

  // -- actions --

  const handleNew = () => {
    const layout = emptyLayout();
    setDraft(layout);
    setSelectedId(layout.id);
  };

  const handleApplyTemplate = (tpl: PanelTemplate) => {
    const layout = layoutFromTemplate(tpl);
    setDraft(layout);
    setSelectedId(layout.id);
  };

  const handleSave = async () => {
    if (!draft) return;
    try {
      const exists = panelLayouts.some((l) => l.id === draft.id);
      if (exists) {
        await updatePanelLayout(draft);
      } else {
        await addPanelLayout(draft);
      }
      // 保存后同步 draft
      setDraft((prev) => prev ? { ...prev, updatedAt: Date.now() } : prev);
    } catch (e) {
      alert('保存失败: ' + (e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!draft) return;
    if (!confirm(`删除布局 "${draft.name}"?`)) return;
    await deletePanelLayout(draft.id);
    const remaining = panelLayouts.filter((l) => l.id !== draft.id);
    setSelectedId(remaining[0]?.id ?? null);
    setDraft(remaining[0] ?? null);
  };

  const handleAddWidget = () => {
    if (!draft) return;
    const pos = nextPosition(draft.widgets, draft.columns);
    const w: PanelWidget = {
      id: newId(),
      widgetType: 'text',
      variableKey: '',
      sortOrder: draft.widgets.length,
      row: pos.row,
      col: pos.col,
    };
    setDraft({ ...draft, widgets: [...draft.widgets, w] });
  };

  const handleWidgetChange = (index: number, updated: PanelWidget) => {
    if (!draft) return;
    const next = draft.widgets.slice();
    next[index] = updated;
    setDraft({ ...draft, widgets: next });
  };

  const handleWidgetRemove = (index: number) => {
    if (!draft) return;
    setDraft({ ...draft, widgets: draft.widgets.filter((_, i) => i !== index) });
  };

  const handleMoveWidget = (index: number, direction: -1 | 1) => {
    if (!draft) return;
    const target = index + direction;
    if (target < 0 || target >= draft.widgets.length) return;
    const next = draft.widgets.slice();
    [next[index], next[target]] = [next[target], next[index]];
    // update sortOrder to match new order
    const reordered = next.map((w, i) => ({ ...w, sortOrder: i }));
    setDraft({ ...draft, widgets: reordered });
  };

  const tryClose = () => {
    if (dirty && !confirm('放弃未保存的修改?')) return;
    onClose();
  };

  return (
    <div className="legacy-modal-overlay" onClick={tryClose}>
      <div className="legacy-modal-shell wide" onClick={(e) => e.stopPropagation()}>
        <header className="legacy-modal-header">
          <strong>展示面板编辑器</strong>
          <span className="st-flex-1" />
          <button onClick={handleNew}>+ 新建</button>
          <button
            onClick={handleSave}
            disabled={!dirty}
            className="st-btn-save st-btn-sm"
          >
            保存
          </button>
          <button onClick={tryClose}>×</button>
        </header>

        <div className="st-flex-1 st-flex st-overflow-hidden">
          {/* left sidebar */}
          <aside className="st-sidebar-panel" style={{ width: 220, overflowY: 'auto' }}>
            {/* saved layouts */}
            <div className="st-p-8 st-border-bottom">
              <span className="st-text-11 st-font-bold st-text-muted">已保存布局</span>
            </div>
            {panelLayouts.length === 0 && (
              <div className="st-empty-state st-text-12" style={{ padding: 12 }}>
                暂无布局
              </div>
            )}
            <ul className="st-list-reset">
              {panelLayouts.map((l) => (
                <li
                  key={l.id}
                  onClick={() => handleSelect(l.id)}
                  className={`st-text-13 ${l.id === selectedId ? 'ds-selected' : ''}`}
                  style={{
                    padding: '6px 8px',
                    cursor: 'pointer',
                    borderRadius: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {l.name}
                  {l.isDefault ? ' ★' : ''}
                </li>
              ))}
            </ul>

            {/* templates */}
            <div className="st-p-8 st-border-bottom st-border-top st-mt-4">
              <span className="st-text-11 st-font-bold st-text-muted">预设模板</span>
            </div>
            <ul className="st-list-reset">
              {PRESET_TEMPLATES.map((tpl) => (
                <li
                  key={tpl.name}
                  onClick={() => handleApplyTemplate(tpl)}
                  style={{
                    padding: '6px 8px',
                    cursor: 'pointer',
                    borderRadius: 4,
                  }}
                >
                  <div className="st-flex-row st-items-center st-gap-4">
                    <span>{tpl.icon}</span>
                    <span className="st-text-13 st-font-bold">{tpl.name}</span>
                  </div>
                  <div className="st-text-11 st-text-muted" style={{ marginTop: 2 }}>
                    {tpl.description}
                  </div>
                </li>
              ))}
            </ul>
          </aside>

          {/* main area */}
          <main className="st-two-panel-main st-flex-col st-overflow-y-auto" style={{ padding: 12 }}>
            {!draft ? (
              <div className="st-empty-state-lg">
                选择左侧布局、新建或点击预设模板
              </div>
            ) : (
              <>
                {/* layout metadata */}
                <div className="st-flex-row st-gap-8 st-mb-12 st-items-center">
                  <label className="st-text-12 st-text-secondary">名称</label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="st-p-6 st-flex-1"
                  />
                  <label className="st-text-12 st-text-secondary">列数</label>
                  <select
                    value={draft.columns}
                    onChange={(e) => setDraft({ ...draft, columns: +e.target.value })}
                    className="st-p-4"
                    style={{ width: 60 }}
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  {panelLayouts.some((l) => l.id === draft.id) && (
                    <button onClick={handleDelete} className="st-btn-xs st-btn-danger-text">
                      删除布局
                    </button>
                  )}
                </div>

                <div className="st-mb-12">
                  <input
                    type="text"
                    value={draft.description ?? ''}
                    placeholder="布局描述 (可选)"
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    className="st-p-6 st-w-full st-text-12"
                  />
                </div>

                {/* widget list */}
                <div className="st-flex-row st-items-center st-justify-between st-mb-8">
                  <span className="st-text-12 st-font-bold">
                    组件列表 ({draft.widgets.length})
                  </span>
                  <button onClick={handleAddWidget} className="st-btn-sm">
                    + 添加组件
                  </button>
                </div>

                {draft.widgets.length === 0 ? (
                  <div className="st-empty-state st-text-13 st-mb-12">
                    点击"添加组件"开始设计布局
                  </div>
                ) : (
                  <div className="st-mb-12">
                    {draft.widgets.map((w, i) => (
                      <WidgetRow
                        key={w.id}
                        widget={w}
                        index={i}
                        variableOptions={varOptions}
                        columns={draft.columns}
                        onChange={(updated) => handleWidgetChange(i, updated)}
                        onRemove={() => handleWidgetRemove(i)}
                        onMoveUp={() => handleMoveWidget(i, -1)}
                        onMoveDown={() => handleMoveWidget(i, 1)}
                      />
                    ))}
                  </div>
                )}

                {/* preview */}
                <div className="st-border-top st-pt-12">
                  <span className="st-text-12 st-font-bold st-mb-8" style={{ display: 'block' }}>
                    实时预览
                  </span>
                  <LayoutPreview layout={draft} variables={variables} inventory={activeChat?.inventory ?? { weapons: [], armor: [], consumables: [], materials: [], other: [] }} defMap={defMap} />
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
