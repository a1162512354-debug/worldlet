import { useState, useMemo } from 'react';
import type { VariableSchema, VariableDefinition, Inventory, InventoryItem, PanelLayout, PanelWidget } from '../../sillytavern/types';
import { useSillytavern } from '../../hooks/useSillytavern';
import { VariableBadge } from './VariableBadge';

// ---- helpers ----

const CATEGORY_LABELS: Record<keyof Inventory, { label: string; icon: string }> = {
  weapons: { label: '武器', icon: '⚔️' },
  armor: { label: '防具', icon: '🛡️' },
  consumables: { label: '消耗品', icon: '🧪' },
  materials: { label: '材料', icon: '📦' },
  other: { label: '其他', icon: '📋' },
};

/** Build a lookup map: variableKey -> definition */
function buildDefMap(schemas: VariableSchema[]): Map<string, VariableDefinition> {
  const map = new Map<string, VariableDefinition>();
  for (const schema of schemas) {
    for (const def of schema.definitions) {
      map.set(def.id, def);
    }
  }
  return map;
}

/** Find layout by name or default */
function findLayout(layouts: PanelLayout[], name?: string): PanelLayout | null {
  if (name) {
    const found = layouts.find((l) => l.name === name);
    if (found) return found;
  }
  return layouts.find((l) => l.isDefault) ?? layouts[0] ?? null;
}

// ---- types ----

type DetailView =
  | { type: 'main' }
  | { type: 'inventory'; category: keyof Inventory }
  | { type: 'variables' }
  | { type: 'layout'; layoutName: string };

// ---- component ----

export interface VariablePanelProps {
  onClose?: () => void;
}

export function VariablePanel({ onClose }: VariablePanelProps) {
  const { activeChat, variableSchemas, panelLayouts } = useSillytavern();
  const variables = activeChat?.variables ?? {};
  const inventory = activeChat?.inventory ?? { weapons: [], armor: [], consumables: [], materials: [], other: [] };
  const [view, setView] = useState<DetailView>({ type: 'main' });

  const defMap = useMemo(() => buildDefMap(variableSchemas), [variableSchemas]);

  const isEmpty = Object.keys(variables).length === 0 && Object.values(inventory).flat().length === 0;

  // Count items in each category
  const categoryCounts = useMemo(() => {
    const counts: Record<keyof Inventory, number> = {
      weapons: 0,
      armor: 0,
      consumables: 0,
      materials: 0,
      other: 0,
    };
    for (const [key, items] of Object.entries(inventory)) {
      counts[key as keyof Inventory] = (items as InventoryItem[]).length;
    }
    return counts;
  }, [inventory]);

  const totalItems = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
  const totalVars = Object.keys(variables).length;

  // ---- render ----

  const renderContent = () => {
    if (!activeChat) {
      return <div className="st-empty-state-lg">请先创建或选择一个对话</div>;
    }

    if (isEmpty) {
      return (
        <div className="st-empty-state st-text-13">
          暂无变量。AI 回复中包含 <code>{'<vars>{"hp": 100}</vars>'}</code> 时会自动提取。
        </div>
      );
    }

    switch (view.type) {
      case 'main':
        return (
          <MainMenu
            inventory={inventory}
            variables={variables}
            categoryCounts={categoryCounts}
            totalItems={totalItems}
            totalVars={totalVars}
            layouts={panelLayouts}
            onSelect={(v) => setView(v)}
          />
        );
      case 'inventory':
        return (
          <InventoryDetail
            category={view.category}
            items={inventory[view.category]}
            defMap={defMap}
            onBack={() => setView({ type: 'main' })}
          />
        );
      case 'variables':
        return (
          <VariablesDetail
            variables={variables}
            defMap={defMap}
            onBack={() => setView({ type: 'main' })}
          />
        );
      case 'layout':
        return (
          <LayoutDetail
            layoutName={view.layoutName}
            layouts={panelLayouts}
            variables={variables}
            inventory={inventory}
            defMap={defMap}
            onBack={() => setView({ type: 'main' })}
          />
        );
    }
  };

  const getTitle = () => {
    switch (view.type) {
      case 'main':
        return '📊 变量面板';
      case 'inventory':
        return `${CATEGORY_LABELS[view.category].icon} ${CATEGORY_LABELS[view.category].label}`;
      case 'variables':
        return '📊 变量详情';
      case 'layout':
        return `📊 ${view.layoutName}`;
    }
  };

  const content = <main className="st-flex-1 st-overflow-y-auto" style={{ padding: 16 }}>{renderContent()}</main>;

  // If onClose is provided, render as modal overlay
  if (onClose) {
    return (
      <div className="legacy-modal-overlay" onClick={onClose}>
        <div className="legacy-modal-shell" onClick={(e) => e.stopPropagation()}>
          <header className="legacy-modal-header">
            <strong>{getTitle()}</strong>
            {view.type !== 'main' && (
              <button onClick={() => setView({ type: 'main' })} className="st-btn-xs">
                ← 返回
              </button>
            )}
            <span className="st-flex-1" />
            <button onClick={onClose}>×</button>
          </header>
          {content}
        </div>
      </div>
    );
  }

  // Otherwise, render as embedded panel
  return (
    <div className="st-flex-col" style={{ height: '100%' }}>
      {view.type !== 'main' && (
        <div className="st-p-8 st-border-bottom">
          <button onClick={() => setView({ type: 'main' })} className="st-btn-xs">
            ← 返回主菜单
          </button>
        </div>
      )}
      {content}
    </div>
  );
}

// ---- main menu ----

function MainMenu({
  inventory,
  variables,
  categoryCounts,
  totalItems,
  totalVars,
  layouts,
  onSelect,
}: {
  inventory: Inventory;
  variables: Record<string, any>;
  categoryCounts: Record<keyof Inventory, number>;
  totalItems: number;
  totalVars: number;
  layouts: PanelLayout[];
  onSelect: (view: DetailView) => void;
}) {
  return (
    <div className="st-flex-col st-gap-16">
      {/* 背包分类 */}
      <div>
        <div className="st-text-13 st-font-bold st-mb-8">
          🎒 背包 ({totalItems})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => {
            const count = categoryCounts[key as keyof Inventory];
            return (
              <button
                key={key}
                onClick={() => onSelect({ type: 'inventory', category: key as keyof Inventory })}
                className="st-border st-rounded st-p-12 st-text-left"
                style={{
                  background: count > 0 ? 'var(--space-surface-deep)' : 'transparent',
                  opacity: count > 0 ? 1 : 0.5,
                  cursor: count > 0 ? 'pointer' : 'default',
                }}
                disabled={count === 0}
              >
                <div className="st-text-16">{icon}</div>
                <div className="st-text-13 st-font-bold">{label}</div>
                <div className="st-text-11 st-text-muted">{count} 个物品</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 变量 */}
      {totalVars > 0 && (
        <div>
          <div className="st-text-13 st-font-bold st-mb-8">
            📊 变量 ({totalVars})
          </div>
          <button
            onClick={() => onSelect({ type: 'variables' })}
            className="st-border st-rounded st-p-12 st-w-full st-text-left"
            style={{ background: 'var(--space-surface-deep)', cursor: 'pointer' }}
          >
            <div className="st-text-13 st-font-bold">查看所有变量</div>
            <div className="st-text-11 st-text-muted">
              {Object.entries(variables).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ')}
              {totalVars > 3 && `... 共 ${totalVars} 个`}
            </div>
          </button>
        </div>
      )}

      {/* 自定义布局 */}
      {layouts.length > 0 && (
        <div>
          <div className="st-text-13 st-font-bold st-mb-8">
            🎨 自定义布局 ({layouts.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {layouts.map((layout) => (
              <button
                key={layout.id}
                onClick={() => onSelect({ type: 'layout', layoutName: layout.name })}
                className="st-border st-rounded st-p-12 st-text-left"
                style={{ background: 'var(--space-surface-deep)', cursor: 'pointer' }}
              >
                <div className="st-text-13 st-font-bold">
                  {layout.name}
                  {layout.isDefault && <span className="st-text-11 st-text-muted"> ★</span>}
                </div>
                <div className="st-text-11 st-text-muted">{layout.widgets.length} 个组件</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- inventory detail ----

function InventoryDetail({
  category,
  items,
  defMap,
  onBack,
}: {
  category: keyof Inventory;
  items: InventoryItem[];
  defMap: Map<string, VariableDefinition>;
  onBack: () => void;
}) {
  const { icon, label } = CATEGORY_LABELS[category];

  if (items.length === 0) {
    return (
      <div className="st-empty-state st-text-13">
        {icon} {label}为空
      </div>
    );
  }

  return (
    <div className="st-flex-col st-gap-12">
      <div className="st-text-12 st-text-muted">
        {icon} {label} - {items.length} 个物品
      </div>
      {items.map((item) => (
        <InventoryItemDetail key={item.id} item={item} defMap={defMap} />
      ))}
    </div>
  );
}

function InventoryItemDetail({
  item,
  defMap,
}: {
  item: InventoryItem;
  defMap: Map<string, VariableDefinition>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="st-border st-rounded" style={{ borderColor: 'var(--space-border-medium)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="st-flex-row st-items-center st-justify-between st-w-full st-p-12"
        style={{
          background: 'var(--space-surface-deep)',
          cursor: 'pointer',
        }}
      >
        <div className="st-flex-col">
          <span className="st-text-14 st-font-bold">{item.name}</span>
          {item.description && (
            <span className="st-text-12 st-text-muted">{item.description}</span>
          )}
        </div>
        <div className="st-flex-row st-gap-8 st-items-center">
          {item.quantity > 1 && (
            <span className="st-text-12 st-text-secondary">×{item.quantity}</span>
          )}
          <span className="st-text-12 st-text-muted">{expanded ? '▼' : '▶'}</span>
        </div>
      </button>

      {expanded && (
        <div className="st-p-12 st-border-top" style={{ borderColor: 'var(--space-border-medium)' }}>
          <div className="st-flex-col st-gap-8">
            {Object.entries(item.values).map(([key, value]) => {
              const def = defMap.get(key);
              return (
                <div key={key} className="st-flex-row st-gap-8 st-items-center">
                  <span className="st-text-12 st-text-secondary" style={{ minWidth: 80 }}>
                    {def?.displayName || key}
                  </span>
                  <span className="st-mono st-text-13">{String(value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- variables detail ----

function VariablesDetail({
  variables,
  defMap,
  onBack,
}: {
  variables: Record<string, any>;
  defMap: Map<string, VariableDefinition>;
  onBack: () => void;
}) {
  return (
    <div className="st-flex-col st-gap-8">
      <div className="st-text-12 st-text-muted">
        📊 共 {Object.keys(variables).length} 个变量
      </div>
      {Object.entries(variables).map(([key, value]) => {
        const def = defMap.get(key);
        return (
          <div
            key={key}
            className="st-border st-rounded st-p-12"
            style={{ borderColor: 'var(--space-border-medium)', background: 'var(--space-surface-deep)' }}
          >
            <div className="st-flex-row st-items-center st-justify-between">
              <span className="st-text-13 st-font-bold">
                {def?.displayName || key}
              </span>
              <span className="st-mono st-text-14">{String(value)}</span>
            </div>
            {def?.description && (
              <div className="st-text-11 st-text-muted st-mt-4">{def.description}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- layout detail ----

function LayoutDetail({
  layoutName,
  layouts,
  variables,
  inventory,
  defMap,
  onBack,
}: {
  layoutName: string;
  layouts: PanelLayout[];
  variables: Record<string, any>;
  inventory: Inventory;
  defMap: Map<string, VariableDefinition>;
  onBack: () => void;
}) {
  const layout = findLayout(layouts, layoutName);

  if (!layout) {
    return (
      <div className="st-empty-state st-text-13">
        布局 "{layoutName}" 未找到
      </div>
    );
  }

  // Group widgets by row
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
        <div style={{ borderTop: '1px solid var(--space-border-medium)', margin: '8px 0' }} />
      );
    }

    if (w.widgetType === 'inventory-category') {
      const category = w.variableKey as keyof typeof inventory;
      const items = inventory[category] ?? [];
      const catInfo = CATEGORY_LABELS[category];
      return (
        <div className="st-border st-rounded st-p-8" style={{ background: 'var(--space-surface-deep)' }}>
          <div className="st-text-12 st-font-bold st-mb-4">
            {catInfo?.icon || '📦'} {catInfo?.label || category}
            <span className="st-text-11 st-text-muted st-ml-4">({items.length})</span>
          </div>
          {items.length === 0 ? (
            <div className="st-text-11 st-text-muted">空</div>
          ) : (
            <div className="st-flex-col st-gap-2">
              {items.map((item) => (
                <div key={item.id} className="st-text-12">
                  {item.name} {item.quantity > 1 ? `×${item.quantity}` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (w.widgetType === 'inventory-item') {
      const allItems = Object.values(inventory).flat();
      const item = allItems.find((i) => i.id === w.variableKey);
      if (!item) {
        return <div className="st-text-12 st-text-muted">物品未找到</div>;
      }
      return (
        <div className="st-border st-rounded st-p-8" style={{ background: 'var(--space-surface-deep)' }}>
          <div className="st-text-12 st-font-bold">{item.name}</div>
          {item.quantity > 1 && <span className="st-text-11 st-text-muted">×{item.quantity}</span>}
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
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
        gap: 8,
      }}
    >
      {rows.map(([, widgets]) =>
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
          布局为空
        </div>
      )}
    </div>
  );
}
