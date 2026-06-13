import { useState, useMemo } from 'react';
import type { Lorebook, LorebookEntry } from '../../sillytavern/types';
import { EntryForm } from './EntryForm';
import {
  createDefaultEntry,
  updateEntry,
  removeEntry,
} from '../../sillytavern/editor-utils';
import { useSillytavern } from '../../hooks/useSillytavern';

function entryLabel(e: LorebookEntry): string {
  if (e.comment?.trim()) return e.comment;
  if (e.content.trim()) return e.content.trim().slice(0, 30);
  if (e.keys.length) return e.keys.join(', ');
  return '(未命名条目)';
}

export function LorebookEditorModal({
  lorebook,
  onClose,
}: {
  lorebook: Lorebook;
  onClose: () => void;
}) {
  const { updateLorebook, showToast } = useSillytavern();
  const [draft, setDraft] = useState<Lorebook>(lorebook);
  const [selectedId, setSelectedId] = useState<string | null>(
    lorebook.entries[0]?.id ?? null,
  );

  const dirty = useMemo(() => {
    if (!draft) return false;
    return (
      draft.name !== lorebook.name ||
      draft.entries.length !== lorebook.entries.length ||
      draft.entries.some((e, i) => e !== lorebook.entries[i]) ||
      draft.recursiveScanning !== lorebook.recursiveScanning ||
      draft.caseSensitive !== lorebook.caseSensitive ||
      draft.matchWholeWords !== lorebook.matchWholeWords
    );
  }, [draft, lorebook]);

  const selected = useMemo(
    () => draft.entries.find((e) => e.id === selectedId) ?? null,
    [draft.entries, selectedId],
  );

  const tryClose = () => {
    if (dirty && !confirm('放弃未保存的修改?')) return;
    onClose();
  };

  const handleSave = async () => {
    try {
      await updateLorebook(draft);
      showToast('已保存');
    } catch (e) {
      alert('保存失败: ' + (e as Error).message);
    }
  };

  const handleAddEntry = () => {
    const e = createDefaultEntry();
    setDraft((prev) => ({
      ...prev,
      entries: [...prev.entries, e],
      updatedAt: Date.now(),
    }));
    setSelectedId(e.id);
  };

  const handleDeleteEntry = (id: string) => {
    if (!confirm('确定删除此条目?')) return;
    setDraft((prev) => removeEntry(prev, id));
    if (selectedId === id) {
      const remaining = draft.entries.filter((e) => e.id !== id);
      setSelectedId(remaining[0]?.id ?? null);
    }
  };

  const handleEntryChange = (patch: Partial<LorebookEntry>) => {
    if (!selected) return;
    setDraft((prev) => updateEntry(prev, selected.id, patch));
  };

  return (
    <div className="legacy-modal-overlay" onClick={tryClose}>
      <div className="legacy-modal-shell wide" onClick={(e) => e.stopPropagation()}>
        <header className="legacy-modal-header">
          <strong>编辑世界书:</strong>
          <input
            type="text"
            value={draft.name}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, name: e.target.value, updatedAt: Date.now() }))
            }
            className="st-flex-1 st-p-6 st-text-14"
          />
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
          <aside className="st-sidebar-panel-wide">
            <button
              onClick={handleAddEntry}
              className="st-w-full st-btn-sm st-mb-8"
            >
              + 新建条目
            </button>
            <ul className="st-list-reset">
              {draft.entries.map((e) => (
                <li
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={`st-flex-row st-gap-6 st-text-13 ${e.id === selectedId ? 'ds-selected' : ''}`}
                  style={{ padding: '6px 8px', cursor: 'pointer', borderRadius: 4 }}
                >
                  <span
                    className="st-flex-1"
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {entryLabel(e)}
                  </span>
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      handleDeleteEntry(e.id);
                    }}
                    className="ds-danger st-border-none st-bg-transparent"
                    style={{ fontSize: 16 }}
                    title="删除"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            {draft.entries.length === 0 && (
              <div className="st-empty-state st-text-13">
                暂无条目,点上方按钮新建
              </div>
            )}
          </aside>

          <main className="st-two-panel-main">
            {selected ? (
              <EntryForm value={selected} onChange={handleEntryChange} />
            ) : (
              <div className="st-empty-state-lg">
                选择左侧条目或新建一条
              </div>
            )}
          </main>
        </div>

        <footer
          className="st-flex-row st-gap-16 st-text-12 st-text-secondary"
          style={{ padding: '8px 16px', borderTop: '1px solid var(--space-border-medium)' }}
        >
          <label>
            <input
              type="checkbox"
              checked={draft.recursiveScanning}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  recursiveScanning: e.target.checked,
                  updatedAt: Date.now(),
                }))
              }
            />
            递归扫描
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.caseSensitive}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  caseSensitive: e.target.checked,
                  updatedAt: Date.now(),
                }))
              }
            />
            区分大小写
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.matchWholeWords}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  matchWholeWords: e.target.checked,
                  updatedAt: Date.now(),
                }))
              }
            />
            全词匹配
          </label>
        </footer>
      </div>
    </div>
  );
}
