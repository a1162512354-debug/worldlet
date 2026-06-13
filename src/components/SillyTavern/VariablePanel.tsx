import { useMemo } from 'react';
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

/** Find the best matching layout for current variables/inventory */
function findMatchingLayout(
  layouts: PanelLayout[],
  variables: Record<string, any>,
  inventory: Inventory,
): PanelLayout | null {
  if (layouts.length === 0) return null;

  // Find default layout first
  const defaultLayout = layouts.find((l) => l.isDefault);
  if (defaultLayout) return defaultLayout;

  // Otherwise find the first layout
  return layouts[0] ?? null;
}

// ---- component ----

export interface VariablePanelProps {
  onClose?: () => void;
}

export function VariablePanel({ onClose }: VariablePanelProps) {
  const { activeChat, variableSchemas, panelLayouts } = useSillytavern();
  const variables = activeChat?.variables ?? {};
  const inventory = activeChat?.inventory ?? { weapons: [], armor: [], consumables: [], materials: [], other: [] };

  const defMap = useMemo(() => buildDefMap(variableSchemas), [variableSchemas]);

  // Find matching layout
  const activeLayout = useMemo(
    () => findMatchingLayout(panelLayouts, variables, inventory),
    [panelLayouts, variables, inventory],
  );

  const isEmpty = Object.keys(variables).length === 0 && Object.values(inventory).flat().length === 0;

  // ---- render ----

  const content = (
    <main className="st-flex-1 st-overflow-y-auto" style={{ padding: 16 }}>
      {!activeChat ? (
        <div className="st-empty-state-lg">请先创建或选择一个对话</div>
      ) : isEmpty ? (
        <div className="st-empty-state st-text-13">
          暂无变量。AI 回复中包含 <code>{'<vars>{"hp": 100}</vars>'}</code> 时会自动提取。
        </div>
      ) : activeLayout ? (
        <LayoutRenderer
          layout={activeLayout}
          variables={variables}
          inventory={inventory}
          defMap={defMap}
        />
      ) : (
        <DefaultRenderer
          variables={variables}
          inventory={inventory}
          defMap={defMap}
        />
      )}
    </main>
  );

  // If onClose is provided, render as modal overlay
  if (onClose) {
    return (
      <div className="legacy-modal-overlay" onClick={onClose}>
        <div className="legacy-modal-shell" onClick={(e) => e.stopPropagation()}>
          <header className="legacy-modal-header">
            <strong>
              {activeLayout ? `📊 ${activeLayout.name}` : '📊 变量面板'}
            </strong>
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
      {content}
    </div>
  );
}

// ---- layout renderer ----

function LayoutRenderer({
  layout,
  variables,
  inventory,
  defMap,
}: {
  layout: PanelLayout;
  variables: Record<string, any>;
  inventory: Inventory;
  defMap: Map<string, VariableDefinition>;
}) {
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
          {item.quantity > 1 && (
            <span className="st-text-11 st-text-muted">×{item.quantity}</span>
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
          布局为空，请在编辑器中添加组件
        </div>
      )}
    </div>
  );
}

// ---- default renderer (no layout) ----

function DefaultRenderer({
  variables,
  inventory,
  defMap,
}: {
  variables: Record<string, any>;
  inventory: Inventory;
  defMap: Map<string, VariableDefinition>;
}) {
  return (
    <div className="st-flex-col st-gap-16">
      {/* 背包物品 */}
      {Object.entries(inventory).map(([category, items]) => {
        if ((items as InventoryItem[]).length === 0) return null;
        const { label, icon } = CATEGORY_LABELS[category as keyof Inventory];
        return (
          <div key={category}>
            <div className="st-text-12 st-font-bold st-mb-8">
              {icon} {label} ({(items as InventoryItem[]).length})
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 8,
              }}
            >
              {(items as InventoryItem[]).map((item) => (
                <InventoryItemCard
                  key={item.id}
                  item={item}
                  schemaId={item.schemaId}
                  defMap={defMap}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* 普通变量 */}
      {Object.keys(variables).length > 0 && (
        <div>
          <div className="st-text-12 st-font-bold st-mb-8">
            📊 变量 ({Object.keys(variables).length})
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 8,
            }}
          >
            {Object.entries(variables).map(([key, value]) => (
              <div
                key={key}
                className="st-border st-border-light st-rounded"
                style={{
                  padding: '8px 10px',
                  background: 'var(--space-surface-deep)',
                }}
              >
                <VariableBadge
                  varKey={key}
                  value={value}
                  definition={defMap.get(key)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryItemCard({
  item,
  schemaId,
  defMap,
}: {
  item: InventoryItem;
  schemaId: string;
  defMap: Map<string, VariableDefinition>;
}) {
  return (
    <div
      className="st-border st-border-light st-rounded"
      style={{
        padding: '8px 10px',
        background: 'var(--space-surface-deep)',
      }}
    >
      <div className="st-flex-row st-items-center st-justify-between st-mb-4">
        <span className="st-text-13 st-font-bold">{item.name}</span>
        {item.quantity > 1 && (
          <span className="st-text-11 st-text-muted">×{item.quantity}</span>
        )}
      </div>
      {item.description && (
        <div className="st-text-11 st-text-muted st-mb-4">{item.description}</div>
      )}
      <div className="st-flex-col st-gap-2">
        {Object.entries(item.values).slice(0, 3).map(([key, value]) => {
          const def = defMap.get(key);
          return (
            <div key={key} className="st-flex-row st-gap-4 st-text-11">
              <span className="st-text-muted">{def?.displayName || key}:</span>
              <span className="st-mono">{String(value)}</span>
            </div>
          );
        })}
        {Object.keys(item.values).length > 3 && (
          <div className="st-text-11 st-text-muted">
            +{Object.keys(item.values).length - 3} 更多属性
          </div>
        )}
      </div>
    </div>
  );
}
