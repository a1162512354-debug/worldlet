import { useEffect, useMemo, useState } from 'react';
import { useSillytavern } from '../../hooks/useSillytavern';
import { importMultipleLorebooks, renameLorebook } from '../../sillytavern/importer';
import type { Lorebook } from '../../sillytavern/types';
import { LorebookEditorModal } from './LorebookEditorModal';

export function LorebookModal({ onClose }: { onClose: () => void }) {
  const {
    settings,
    lorebooks,
    toggleLorebook,
    addLorebook,
    addLorebookFromDefault,
    updateLorebook,
    deleteLorebook,
  } = useSillytavern();
  const [editing, setEditing] = useState<Lorebook | null>(null);
  const [query, setQuery] = useState('');
  const [importing, setImporting] = useState(false);

  const activeIds = useMemo(
    () => new Set(settings?.activeLorebookIds ?? []),
    [settings?.activeLorebookIds],
  );

  const filteredLorebooks = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return lorebooks;
    return lorebooks.filter((book) => {
      const haystack = `${book.name} ${book.description ?? ''}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [lorebooks, query]);

  useEffect(() => {
    if (editing) {
      const latest = lorebooks.find((book) => book.id === editing.id);
      if (latest) setEditing(latest);
    }
  }, [editing, lorebooks]);

  const handleImport = async (files: File[]) => {
    if (files.length === 0) return;
    setImporting(true);
    try {
      const inputs = await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          json: JSON.parse(await file.text()),
        })),
      );
      const { successes, failures } = importMultipleLorebooks(inputs);

      for (const item of successes) {
        const lorebook: Lorebook = {
          ...item.lorebook,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await addLorebook(lorebook);
      }

      if (failures.length) {
        alert('导入失败：\n' + failures.map((failure) => `${failure.fileName}: ${failure.error}`).join('\n'));
      }
    } catch (error) {
      alert('导入失败: ' + (error as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const handleCreate = async () => {
    const name = prompt('新世界书名称', '新世界书');
    if (!name) return;
    const lorebook = await addLorebookFromDefault(name);
    setEditing(lorebook);
  };

  const handleRename = async (book: Lorebook) => {
    const nextName = prompt('新名称', book.name);
    if (!nextName || nextName === book.name) return;

    const existing = lorebooks.find((item) => item.name === nextName && item.id !== book.id);
    if (existing) {
      const shouldMerge = confirm(`已存在名为 "${nextName}" 的世界书。\n确定 = 删除旧世界书并使用当前内容覆盖名称\n取消 = 放弃重命名`);
      if (!shouldMerge) return;
      await deleteLorebook(existing.id);
    }

    const renamed = renameLorebook(book, nextName);
    await updateLorebook(renamed);
    if (editing?.id === book.id) setEditing(renamed);
  };

  const activeCount = activeIds.size;
  const entryCount = lorebooks.reduce((sum, book) => sum + book.entries.length, 0);

  return (
    <div className="legacy-modal-overlay" onClick={onClose}>
      <aside className="legacy-modal-shell lorebook-shell" onClick={(event) => event.stopPropagation()}>
        <header className="legacy-modal-header lorebook-header">
          <div>
            <span className="lorebook-kicker">WORLD INFO</span>
            <strong>世界书管理</strong>
          </div>
          <button onClick={onClose} aria-label="关闭世界书管理">×</button>
        </header>

        <section className="lorebook-command-panel" aria-label="世界书操作区">
          <div className="lorebook-stats">
            <span><b>{lorebooks.length}</b> 本世界书</span>
            <span><b>{activeCount}</b> 已激活</span>
            <span><b>{entryCount}</b> 条目</span>
          </div>

          <label className="lorebook-search">
            <span>检索</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="按名称或描述过滤..."
            />
          </label>

          <div className="lorebook-actions-row">
            <label className={`lorebook-file-button ${importing ? 'disabled' : ''}`}>
              <input
                type="file"
                multiple
                accept=".json,application/json"
                disabled={importing}
                onChange={(event) => {
                  void handleImport(Array.from(event.target.files ?? []));
                  event.target.value = '';
                }}
              />
              {importing ? '导入中...' : '批量导入 JSON'}
            </label>
            <button onClick={handleCreate}>新建世界书</button>
          </div>
        </section>

        <ul className="lorebook-list" aria-label="世界书列表">
          {filteredLorebooks.map((book) => {
            const isActive = activeIds.has(book.id);
            return (
              <li key={book.id} className={`lorebook-card ${isActive ? 'active' : ''}`}>
                <div className="lorebook-card-main">
                  <label className="lorebook-toggle-row">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => toggleLorebook(book.id)}
                    />
                    <span className="lorebook-status-dot" aria-hidden="true" />
                    <span className="lorebook-title" title={book.name}>{book.name}</span>
                  </label>
                  <p>{book.description || '暂无描述。'}</p>
                  <div className="lorebook-card-meta">
                    <span>{book.entries.length} 条目</span>
                    <span>{isActive ? 'ACTIVE' : 'STANDBY'}</span>
                  </div>
                </div>

                <div className="lorebook-card-actions">
                  <button onClick={() => void handleRename(book)}>重命名</button>
                  <button onClick={() => setEditing(book)}>编辑</button>
                  <button
                    className="danger"
                    onClick={async () => {
                      if (!confirm(`确定删除世界书 "${book.name}"？`)) return;
                      await deleteLorebook(book.id);
                      if (editing?.id === book.id) setEditing(null);
                    }}
                  >
                    删除
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {filteredLorebooks.length === 0 && (
          <div className="lorebook-empty-state">
            <strong>{lorebooks.length === 0 ? '资料库为空' : '没有匹配结果'}</strong>
            <p>{lorebooks.length === 0 ? '导入 SillyTavern 世界书 JSON，或创建一本新世界书。' : '尝试换一个关键词。'}</p>
          </div>
        )}
      </aside>

      {editing && (
        <LorebookEditorModal
          lorebook={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
