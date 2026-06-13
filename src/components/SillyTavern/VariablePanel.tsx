import { useMemo } from 'react';
import type { VariableSchema, VariableDefinition } from '../../sillytavern/types';
import { useSillytavern } from '../../hooks/useSillytavern';
import { VariableBadge } from './VariableBadge';

// ---- helpers ----

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

  const isEmpty = sortedEntries.length === 0;

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
