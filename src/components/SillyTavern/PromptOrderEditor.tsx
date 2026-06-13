import { movePromptItem } from '../../sillytavern/editor-utils';

export interface PromptOrderItem {
  identifier: string;
  name?: string;
  role?: 'system' | 'user' | 'assistant';
  enabled?: boolean;
}

export function PromptOrderEditor({
  value,
  onChange,
}: {
  value: PromptOrderItem[];
  onChange: (next: PromptOrderItem[]) => void;
}) {
  const setEnabled = (idx: number, enabled: boolean) => {
    const next = value.slice();
    next[idx] = { ...next[idx], enabled };
    onChange(next);
  };

  const move = (from: number, to: number) => {
    const next = movePromptItem(value, from, to);
    if (next !== value) onChange(next);
  };

  if (value.length === 0) {
    return (
      <div className="st-text-secondary st-text-13 st-p-12">
        当前预设没有 prompt_order 数组。导入 SillyTavern 预设或新建默认预设以获得标准顺序。
      </div>
    );
  }

  return (
    <ol className="st-list-reset">
      {value.map((item, idx) => (
        <li
          key={item.identifier}
          className="st-flex-row st-gap-8 st-border-bottom"
          style={{ padding: '6px 8px' }}
        >
          <input
            type="checkbox"
            checked={item.enabled !== false}
            onChange={(e) => setEnabled(idx, e.target.checked)}
          />
          <code className="st-text-12 st-text-muted" style={{ minWidth: 140 }}>{item.identifier}</code>
          <span className="st-flex-1">{item.name ?? item.identifier}</span>
          <button
            disabled={idx === 0}
            onClick={() => move(idx, idx - 1)}
            className="st-btn-xxs"
            title="上移"
          >
            ↑
          </button>
          <button
            disabled={idx === value.length - 1}
            onClick={() => move(idx, idx + 1)}
            className="st-btn-xxs"
            title="下移"
          >
            ↓
          </button>
        </li>
      ))}
    </ol>
  );
}
