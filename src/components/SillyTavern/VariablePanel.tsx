import { useMemo } from 'react';
import type { VariableSchema, VariableDefinition, Inventory, InventoryItem } from '../../sillytavern/types';
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

/** Find a schema whose definitions cover at least one key in the variables map */
function findMatchingSchema(
  variables: Record<string, any>,
  schemas: VariableSchema[],
): VariableSchema | null {
  const keys = Object.keys(variables);
  if (keys.length === 0) return null;

  // Score each schema by how many variable keys it covers
  let best: VariableSchema | null = null;
  let bestScore = 0;

  for (const schema of schemas) {
    const defIds = new Set(schema.definitions.map((d) => d.id));
    let score = 0;
    for (const k of keys) {
      if (defIds.has(k)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = schema;
    }
  }

  return bestScore > 0 ? best : null;
}

/** Build a lookup map: variableKey -> definition */
function buildDefMap(schema: VariableSchema): Map<string, VariableDefinition> {
  const map = new Map<string, VariableDefinition>();
  for (const def of schema.definitions) {
    map.set(def.id, def);
  }
  return map;
}

// ---- component ----

export interface VariablePanelProps {
  onClose?: () => void;
}

export function VariablePanel({ onClose }: VariablePanelProps) {
  const { activeChat, variableSchemas } = useSillytavern();
  const variables = activeChat?.variables ?? {};
  const inventory = activeChat?.inventory ?? { weapons: [], armor: [], consumables: [], materials: [], other: [] };

  const matchedSchema = useMemo(
    () => findMatchingSchema(variables, variableSchemas),
    [variables, variableSchemas],
  );

  const defMap = useMemo(
    () => (matchedSchema ? buildDefMap(matchedSchema) : new Map()),
    [matchedSchema],
  );

  // Sort entries by definition sortOrder if schema available, otherwise alphabetical
  const sortedEntries = useMemo(() => {
    const entries = Object.entries(variables);
    if (matchedSchema) {
      return entries.sort((a, b) => {
        const da = defMap.get(a[0]);
        const db = defMap.get(b[0]);
        const sa = da?.sortOrder ?? 9999;
        const sb = db?.sortOrder ?? 9999;
        if (sa !== sb) return sa - sb;
        return a[0].localeCompare(b[0]);
      });
    }
    return entries.sort((a, b) => a[0].localeCompare(b[0]));
  }, [variables, matchedSchema, defMap]);

  const isEmpty = sortedEntries.length === 0 && Object.values(inventory).flat().length === 0;

  // ---- render ----

  const content = (
    <main className="st-flex-1 st-overflow-y-auto" style={{ padding: 16 }}>
      {!activeChat ? (
        <div className="st-empty-state-lg">请先创建或选择一个对话</div>
      ) : isEmpty ? (
        <div className="st-empty-state st-text-13">
          暂无变量。AI 回复中包含 <code>{'<vars>{"hp": 100}</vars>'}</code> 时会自动提取。
        </div>
      ) : (
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
                  className="st-flex-wrap st-gap-8"
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
                      schema={variableSchemas.find((s) => s.id === item.schemaId)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* 普通变量 */}
          {sortedEntries.length > 0 && (
            <div>
              <div className="st-text-12 st-font-bold st-mb-8">
                📊 变量 ({sortedEntries.length})
              </div>
              <div
                className="st-flex-wrap st-gap-8"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 8,
                }}
              >
                {sortedEntries.map(([key, value]) => (
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
      )}

      {matchedSchema && (
        <div
          className="st-mt-12 st-p-8 st-text-11 st-text-muted st-border-top"
          style={{ borderColor: 'var(--space-border-medium)' }}
        >
          使用模板: <strong className="st-text-secondary">{matchedSchema.name}</strong>
          {matchedSchema.description && (
            <span> — {matchedSchema.description}</span>
          )}
        </div>
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
              {matchedSchema ? `📊 ${matchedSchema.name}` : '📊 变量面板'}
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

function InventoryItemCard({
  item,
  schema,
}: {
  item: InventoryItem;
  schema?: VariableSchema;
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
          const def = schema?.definitions.find((d) => d.id === key);
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
