import { useState, useMemo } from 'react';
import type { Mod, ModType } from '../../sillytavern/types';
import { useSillytavern } from '../../hooks/useSillytavern';

const MOD_TYPE_ICONS: Record<ModType, string> = {
  worldbook: '📚',
  item: '🎒',
  skill: '⚔️',
  plot: '📖',
};

const MOD_TYPE_LABELS: Record<ModType, string> = {
  worldbook: '世界书',
  item: '物品',
  skill: '技能',
  plot: '剧情',
};

export function CharacterCreationPage({ onClose }: { onClose: () => void }) {
  const { mods, scenarios, createChatWithMods, showToast } = useSillytavern();

  const [chatName, setChatName] = useState('');
  const [selectedModIds, setSelectedModIds] = useState<string[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ModType | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [creating, setCreating] = useState(false);

  // ---- 筛选 MOD ----
  const filteredMods = useMemo(() => {
    let result = mods;
    if (filterType !== 'all') {
      result = result.filter((m) => m.type === filterType);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [mods, filterType, searchText]);

  // ---- 选中的 MOD ----
  const selectedMods = useMemo(
    () => mods.filter((m) => selectedModIds.includes(m.id)),
    [mods, selectedModIds],
  );

  // ---- 合并预览 ----
  const mergedVariables = useMemo(() => {
    const vars: Record<string, any> = {};
    for (const mod of selectedMods) {
      if (mod.content.type === 'item' || mod.content.type === 'skill') {
        // 合并字段值到变量
        for (const [key, value] of Object.entries(mod.content.values)) {
          vars[key] = value;
        }
      }
    }
    return vars;
  }, [selectedMods]);

  const mergedLorebookIds = useMemo(() => {
    const ids: string[] = [];
    for (const mod of selectedMods) {
      if (mod.content.type === 'worldbook') {
        ids.push(...mod.content.lorebookIds);
      }
    }
    return [...new Set(ids)];
  }, [selectedMods]);

  const openingTexts = useMemo(() => {
    const parts: string[] = [];
    for (const mod of selectedMods) {
      if (mod.openingDescription) parts.push(mod.openingDescription);
      if (mod.content.type === 'plot') parts.push(mod.content.openingText);
    }
    return parts;
  }, [selectedMods]);

  // ---- toggle mod ----
  const toggleMod = (modId: string) => {
    setSelectedModIds((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId],
    );
  };

  // ---- create game ----
  const handleCreate = async () => {
    const name = chatName.trim() || `新游戏 ${new Date().toLocaleString()}`;
    setCreating(true);
    try {
      await createChatWithMods(name, selectedModIds, {
        scenarioId: selectedScenarioId ?? undefined,
      });
      showToast('游戏已创建');
      onClose();
    } catch (e) {
      alert('创建失败: ' + (e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="legacy-modal-overlay" onClick={onClose}>
      <div className="legacy-modal-shell wide" onClick={(e) => e.stopPropagation()}>
        <header className="legacy-modal-header">
          <strong>🎮 开局设置</strong>
          <span className="st-flex-1" />
          <button onClick={onClose}>&times;</button>
        </header>

        <div className="st-flex-1 st-flex st-overflow-hidden">
          {/* ---- 左侧: MOD 选择 ---- */}
          <aside className="st-sidebar-panel-wide" style={{ width: 320 }}>
            {/* 会话名称 */}
            <div className="st-mb-8">
              <input
                className="st-input st-w-full"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                placeholder="会话名称（留空自动生成）"
              />
            </div>

            {/* 场景模板选择 */}
            {scenarios.length > 0 && (
              <div className="st-mb-8">
                <span className="st-text-11 st-font-bold st-text-muted">场景模板</span>
                <select
                  className="st-input st-w-full st-mt-4"
                  value={selectedScenarioId ?? ''}
                  onChange={(e) => setSelectedScenarioId(e.target.value || null)}
                >
                  <option value="">不使用模板</option>
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 搜索 */}
            <div className="st-mb-8">
              <input
                className="st-input st-w-full"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索 MOD..."
              />
            </div>

            {/* 类型筛选 */}
            <div className="st-flex-row st-gap-4 st-mb-8 st-flex-wrap">
              <button
                className={`st-btn-xs ${filterType === 'all' ? 'st-tab-active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                全部
              </button>
              {(Object.keys(MOD_TYPE_ICONS) as ModType[]).map((type) => (
                <button
                  key={type}
                  className={`st-btn-xs ${filterType === type ? 'st-tab-active' : ''}`}
                  onClick={() => setFilterType(type)}
                >
                  {MOD_TYPE_ICONS[type]} {MOD_TYPE_LABELS[type]}
                </button>
              ))}
            </div>

            {/* MOD 列表 */}
            <div className="st-flex-1 st-overflow-y-auto">
              {filteredMods.length === 0 ? (
                <div className="st-empty-state st-text-12">暂无 MOD</div>
              ) : (
                <ul className="st-list-reset">
                  {filteredMods.map((mod) => (
                    <li
                      key={mod.id}
                      className={`st-flex st-items-center st-gap-6 st-p-8 st-rounded st-cursor-pointer ${selectedModIds.includes(mod.id) ? 'ds-selected' : ''}`}
                      style={{ cursor: 'pointer', marginBottom: 4 }}
                      onClick={() => toggleMod(mod.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedModIds.includes(mod.id)}
                        onChange={() => toggleMod(mod.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span>{mod.icon}</span>
                      <div className="st-flex-1" style={{ minWidth: 0 }}>
                        <div className="st-text-13 st-font-bold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {mod.name}
                        </div>
                        <div className="st-text-11 st-text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {MOD_TYPE_LABELS[mod.type]} · {mod.description || '无描述'}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          {/* ---- 右侧: 预览 ---- */}
          <main className="st-two-panel-main st-overflow-y-auto" style={{ padding: 16 }}>
            <div className="st-text-14 st-font-bold st-mb-12">开局预览</div>

            {/* 已选 MOD */}
            {selectedMods.length === 0 ? (
              <div className="st-empty-state st-text-13">
                在左侧选择要叠加的 MOD
              </div>
            ) : (
              <>
                {/* 已选 MOD 列表 */}
                <div className="st-mb-12">
                  <span className="st-text-12 st-font-bold">已选 MOD ({selectedMods.length})</span>
                  <div className="st-flex-wrap st-gap-8 st-mt-4">
                    {selectedMods.map((mod) => (
                      <span
                        key={mod.id}
                        className="st-flex-row st-items-center st-gap-4 st-p-8 st-rounded"
                        style={{ border: '1px solid var(--space-border-medium)', fontSize: 13 }}
                      >
                        {mod.icon} {mod.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 注入变量预览 */}
                {Object.keys(mergedVariables).length > 0 && (
                  <div className="st-mb-12">
                    <span className="st-text-12 st-font-bold">注入变量</span>
                    <div className="st-border st-rounded st-p-8 st-mt-4" style={{ background: 'var(--space-surface-deep)' }}>
                      {Object.entries(mergedVariables).map(([key, value]) => (
                        <div key={key} className="st-flex-row st-gap-8 st-text-13" style={{ padding: '2px 0' }}>
                          <span className="st-mono st-text-secondary" style={{ minWidth: 100 }}>{key}</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 世界书预览 */}
                {mergedLorebookIds.length > 0 && (
                  <div className="st-mb-12">
                    <span className="st-text-12 st-font-bold">注入世界书 ({mergedLorebookIds.length})</span>
                    <div className="st-text-13 st-text-muted st-mt-4">
                      {mergedLorebookIds.length} 个世界书将被激活
                    </div>
                  </div>
                )}

                {/* 开局描述预览 */}
                {openingTexts.length > 0 && (
                  <div className="st-mb-12">
                    <span className="st-text-12 st-font-bold">开局描述</span>
                    <div className="st-border st-rounded st-p-8 st-mt-4" style={{ background: 'var(--space-surface-deep)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {openingTexts.join('\n\n')}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 创建按钮 */}
            <div className="st-flex st-justify-end st-mt-16">
              <button
                className="st-btn-save"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? '创建中...' : '🎮 开始游戏'}
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
