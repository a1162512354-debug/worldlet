import type { VariableDefinition } from '../../sillytavern/types';

// ---- helpers ----

/** Apply displayFormat template: replaces {value}, {max}, {min} */
function formatValue(template: string | undefined, value: any, def: VariableDefinition): string {
  if (!template) return String(value);
  const min = def.config?.min ?? 0;
  const max = def.config?.max ?? 100;
  return template
    .replace(/\{value\}/gi, String(value ?? ''))
    .replace(/\{max\}/gi, String(max))
    .replace(/\{min\}/gi, String(min));
}

/** Clamp a number between min and max */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Derive the effective display mode for a variable */
function effectiveMode(def: VariableDefinition): string {
  if (def.displayMode) return def.displayMode;
  switch (def.type) {
    case 'number':
    case 'bar':
      return 'progress';
    case 'enum':
    case 'boolean':
      return 'badge';
    case 'list':
      return 'grid';
    case 'text':
    default:
      return 'text';
  }
}

// ---- sub-renderers ----

function ProgressDisplay({ value, def }: { value: any; def: VariableDefinition }) {
  const min = def.config?.min ?? 0;
  const max = def.config?.max ?? 100;
  const num = clamp(Number(value) || 0, min, max);
  const pct = max > min ? ((num - min) / (max - min)) * 100 : 0;
  const label = formatValue(def.displayFormat, num, def);

  // Color: green > 60%, yellow > 30%, red otherwise
  let barColor = 'var(--color-success)';
  if (pct <= 30) barColor = 'var(--color-error)';
  else if (pct <= 60) barColor = 'var(--color-warning)';

  return (
    <div className="st-flex-col st-gap-4">
      <div className="st-flex-row st-items-center st-justify-between">
        <span className="st-text-12 st-font-bold">{def.displayName}</span>
        <span className="st-mono st-text-12" style={{ color: barColor }}>{label}</span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: 'var(--space-surface-deep)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 3,
            background: barColor,
            transition: 'width 300ms ease',
          }}
        />
      </div>
    </div>
  );
}

function BadgeDisplay({ value, def }: { value: any; def: VariableDefinition }) {
  const isBoolean = def.type === 'boolean';
  const boolVal = isBoolean ? !!value : false;
  const options = def.config?.options ?? [];
  const isKnownOption = def.type === 'enum' && options.includes(String(value));

  let chipBg = 'rgba(110, 207, 207, 0.12)';
  let chipBorder = 'var(--space-accent-border)';
  let chipColor = 'var(--color-text)';

  if (isBoolean) {
    chipBg = boolVal ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.1)';
    chipBorder = boolVal ? 'var(--color-success)' : 'var(--color-error)';
    chipColor = boolVal ? 'var(--color-success)' : 'var(--color-error)';
  } else if (isKnownOption) {
    chipBg = 'rgba(110, 207, 207, 0.18)';
    chipBorder = 'var(--color-accent)';
    chipColor = 'var(--color-accent)';
  }

  const displayText = isBoolean
    ? (boolVal ? `✓ ${def.displayName}` : `✗ ${def.displayName}`)
    : String(value ?? '');

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 4,
        border: `1px solid ${chipBorder}`,
        background: chipBg,
        color: chipColor,
        fontSize: 13,
        lineHeight: 1.4,
      }}
    >
      {def.displayName && !isBoolean && (
        <span className="st-text-muted st-text-11">{def.displayName}:</span>
      )}
      <span className="st-font-bold">{displayText}</span>
    </span>
  );
}

function GridDisplay({ value, def }: { value: any; def: VariableDefinition }) {
  const items: string[] = Array.isArray(value) ? value.map(String) : [];

  return (
    <div className="st-flex-col st-gap-4">
      <span className="st-text-12 st-font-bold">{def.displayName}</span>
      {items.length === 0 ? (
        <span className="st-text-11 st-text-muted">(空列表)</span>
      ) : (
        <div className="st-flex-wrap st-gap-4">
          {items.map((item, i) => (
            <span key={i} className="modal-chip" style={{ fontSize: 12, padding: '3px 8px' }}>
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TextDisplay({ value, def }: { value: any; def: VariableDefinition }) {
  const text = formatValue(def.displayFormat, value, def);
  return (
    <div className="st-flex-col st-gap-2">
      <span className="st-text-12 st-font-bold">{def.displayName}</span>
      <span className="st-text-13" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {text || <span className="st-text-muted">(空)</span>}
      </span>
    </div>
  );
}

function FallbackDisplay({ varKey, value }: { varKey: string; value: any }) {
  const display = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
  return (
    <div className="st-flex-row st-items-center st-gap-8">
      <span className="st-mono st-text-12 st-text-secondary" style={{ minWidth: 80 }}>{varKey}</span>
      <span className="st-text-13">{display || <span className="st-text-muted">(空)</span>}</span>
    </div>
  );
}

// ---- main component ----

export interface VariableBadgeProps {
  varKey: string;
  value: any;
  definition?: VariableDefinition;
}

export function VariableBadge({ varKey, value, definition }: VariableBadgeProps) {
  if (!definition) {
    return <FallbackDisplay varKey={varKey} value={value} />;
  }

  const mode = effectiveMode(definition);

  switch (mode) {
    case 'progress':
      return <ProgressDisplay value={value} def={definition} />;
    case 'badge':
    case 'icon':
      return <BadgeDisplay value={value} def={definition} />;
    case 'grid':
      return <GridDisplay value={value} def={definition} />;
    case 'text':
    default:
      return <TextDisplay value={value} def={definition} />;
  }
}
