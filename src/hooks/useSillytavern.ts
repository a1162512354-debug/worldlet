import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStreamParser } from './useStreamParser';
import { useApiRouter } from './useApiRouter';
import { applyParsedToChat, branchChat, buildImplicitVarsMessages } from '../sillytavern/variables';
import { assemblePrompt } from '../sillytavern/prompt-assembler';
import {
  DEFAULT_TAGS,
  DEFAULT_OPAQUE_TAGS,
  DEFAULT_SETTINGS,
  type AppSettings,
  type ChatPreset,
  type ChatSession,
  type ChatMessage,
  type Lorebook,
  type VariableSchema,
  type ScenarioTemplate,
  type PanelLayout,
  type Mod,
} from '../sillytavern/types';
import {
  getDatabase,
  initializeDatabase,
  getLorebooks,
  getPresets,
  getSettings,
  getChats,
  saveLorebook,
  savePreset,
  saveSettings,
  saveChat,
  deleteChat,
  deleteLorebook as deleteLorebookDb,
  deletePreset as deletePresetDb,
  getVariableSchemas,
  saveVariableSchema,
  deleteVariableSchema as deleteVariableSchemaDb,
  getScenarios,
  saveScenario,
  deleteScenario as deleteScenarioDb,
  getPanelLayouts,
  savePanelLayout,
  deletePanelLayout as deletePanelLayoutDb,
  getMods,
  saveMod,
  deleteMod as deleteModDb,
} from '../sillytavern/database';
import { createDefaultLorebook } from '../sillytavern/editor-utils';
import { parseVarsBlock } from '../sillytavern/vars-merger';
import type { ParserEvent } from '../sillytavern/stream-parser';

function assistantContentFromEvents(events: ParserEvent[]): string {
  return events
    .filter((e) => e.type === 'tag-chunk' || e.type === 'raw')
    .map((e) => e.chunk)
    .join('');
}
import { createDefaultPreset } from '../sillytavern/types';

const db = getDatabase();

function useSillytavernState() {
  // ---- core state ----
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [presets, setPresets] = useState<ChatPreset[]>([]);
  const [lorebooks, setLorebooks] = useState<Lorebook[]>([]);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // ---- MOD 工坊 state ----
  const [variableSchemas, setVariableSchemas] = useState<VariableSchema[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioTemplate[]>([]);
  const [panelLayouts, setPanelLayouts] = useState<PanelLayout[]>([]);
  const [mods, setMods] = useState<Mod[]>([]);

  // ---- modal toggles ----
  const [showSettings, setShowSettings] = useState(false);
  const [showLorebooks, setShowLorebooks] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);
  const [showScenarioManager, setShowScenarioManager] = useState(false);
  const [showPanelEditor, setShowPanelEditor] = useState(false);
  const [showModWorkshop, setShowModWorkshop] = useState(false);
  const [showCharacterCreation, setShowCharacterCreation] = useState(false);

  // ---- toast ----
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // ---- derived ----
  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [chats, activeChatId]
  );
  const activePreset = useMemo(
    () => presets.find((p) => p.id === settings?.activePresetId) ?? presets[0] ?? null,
    [presets, settings]
  );

  // ---- init ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initializeDatabase();
      const [l, p, s, c, vs, sc, pl, m] = await Promise.all([
        getLorebooks(),
        getPresets(),
        getSettings(),
        getChats(),
        getVariableSchemas().catch(() => []),
        getScenarios().catch(() => []),
        getPanelLayouts().catch(() => []),
        getMods().catch(() => []),
      ]);
      if (cancelled) return;
      setLorebooks(l);
      setPresets(p);
      setSettings(s ? { ...DEFAULT_SETTINGS, ...s } : { ...DEFAULT_SETTINGS });
      setChats(c);
      setVariableSchemas(vs);
      setScenarios(sc);
      setPanelLayouts(pl);
      setMods(m);
      if (c.length > 0) setActiveChatId(c[0].id);
      setInitialized(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- chat helpers ----
  const createChat = useCallback(
    async (name: string, options?: { presetId?: string; lorebookIds?: string[]; scenarioId?: string }) => {
      let variables: Record<string, any> = {};
      let presetId = options?.presetId ?? settings?.activePresetId ?? null;
      let lorebookIds = options?.lorebookIds ?? settings?.activeLorebookIds ?? [];
      let characterName = settings?.characterName ?? DEFAULT_SETTINGS.characterName;
      let userName = settings?.userName ?? DEFAULT_SETTINGS.userName;

      // Apply scenario template if specified
      if (options?.scenarioId) {
        const scenario = scenarios.find((s) => s.id === options.scenarioId);
        if (scenario) {
          variables = { ...scenario.initialVariables };
          if (scenario.presetId) presetId = scenario.presetId;
          if (scenario.lorebookIds.length > 0) lorebookIds = scenario.lorebookIds;
          if (scenario.characterName) characterName = scenario.characterName;
          if (scenario.userName) userName = scenario.userName;
        }
      }

      const chat: ChatSession = {
        id: crypto.randomUUID(),
        name,
        messages: [],
        characterName,
        userName,
        presetId,
        lorebookIds,
        variables,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveChat(chat);
      setChats((prev) => [...prev, chat]);
      setActiveChatId(chat.id);
      return chat.id;
    },
    [settings, scenarios]
  );

  const selectChat = useCallback((id: string) => setActiveChatId(id), []);

  const removeChat = useCallback(
    async (id: string) => {
      await deleteChat(id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (activeChatId === id) {
        const remaining = chats.filter((c) => c.id !== id);
        setActiveChatId(remaining[0]?.id ?? null);
      }
    },
    [activeChatId, chats]
  );

  const sendMessage = useCallback(
    async (text: string, role: ChatMessage['role'] = 'user') => {
      if (!activeChat) return;
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role,
        content: text,
        timestamp: Date.now(),
      };
      const next = { ...activeChat, messages: [...activeChat.messages, msg], updatedAt: Date.now() };
      await saveChat(next);
      setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    },
    [activeChat]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!activeChat) return;
      const next = {
        ...activeChat,
        messages: activeChat.messages.filter((m) => m.id !== messageId),
        updatedAt: Date.now(),
      };
      await saveChat(next);
      setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    },
    [activeChat]
  );

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!activeChat) return;
      const next = {
        ...activeChat,
        messages: activeChat.messages.map((m) =>
          m.id === messageId ? { ...m, content: newContent } : m
        ),
        updatedAt: Date.now(),
      };
      await saveChat(next);
      setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    },
    [activeChat]
  );

  const restoreVariablesAtMessage = useCallback(
    (messageId: string) => {
      if (!activeChat) return {};
      const idx = activeChat.messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return activeChat.variables ?? {};
      for (let i = idx; i >= 0; i -= 1) {
        const snapshot = activeChat.messages[i].variablesAfter;
        if (snapshot) return snapshot;
      }
      return {};
    },
    [activeChat]
  );

  const rollbackTo = useCallback(
    async (messageId: string) => {
      if (!activeChat) return;
      const idx = activeChat.messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return;
      const next = {
        ...activeChat,
        messages: activeChat.messages.slice(0, idx + 1),
        variables: restoreVariablesAtMessage(messageId),
        updatedAt: Date.now(),
      };
      await saveChat(next);
      setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    },
    [activeChat, restoreVariablesAtMessage]
  );

  // ---- settings / preset / lorebook mutations ----
  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const addPreset = useCallback(async (preset: ChatPreset) => {
    await savePreset(preset);
    setPresets((prev) => [...prev, preset]);
  }, []);

  const addLorebook = useCallback(async (book: Lorebook) => {
    await saveLorebook(book);
    setLorebooks((prev) => [...prev, book]);
  }, []);

  const updateLorebook = useCallback(async (book: Lorebook) => {
    const next: Lorebook = { ...book, updatedAt: Date.now() };
    await saveLorebook(next);
    setLorebooks((prev) => prev.map((b) => (b.id === next.id ? next : b)));
  }, []);

  const deleteLorebook = useCallback(async (id: string) => {
    await deleteLorebookDb(id);
    setLorebooks((prev) => prev.filter((b) => b.id !== id));
    setSettings((prev) => {
      if (!prev) return prev;
      if (!prev.activeLorebookIds?.includes(id)) return prev;
      const next = {
        ...prev,
        activeLorebookIds: prev.activeLorebookIds.filter((x) => x !== id),
      };
      saveSettings(next);
      return next;
    });
  }, []);

  const addLorebookFromDefault = useCallback(async (name: string) => {
    const book = createDefaultLorebook(name);
    await saveLorebook(book);
    setLorebooks((prev) => [...prev, book]);
    return book;
  }, []);

  const updatePreset = useCallback(async (preset: ChatPreset) => {
    const next: ChatPreset = { ...preset, updatedAt: Date.now() };
    await savePreset(next);
    setPresets((prev) => prev.map((p) => (p.id === next.id ? next : p)));
  }, []);

  const deletePreset = useCallback(async (id: string) => {
    await deletePresetDb(id);
    setPresets((prev) => prev.filter((p) => p.id !== id));
    setSettings((prev) => {
      if (!prev) return prev;
      if (prev.activePresetId !== id) return prev;
      const next = { ...prev, activePresetId: null };
      saveSettings(next);
      return next;
    });
  }, []);

  const addPresetFromDefault = useCallback(async (name: string) => {
    const base = createDefaultPreset();
    const preset: ChatPreset = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...base,
      name,
    };
    await savePreset(preset);
    setPresets((prev) => [...prev, preset]);
    return preset;
  }, []);

  const toggleLorebook = useCallback(
    (id: string) => {
      setSettings((prev) => {
        if (!prev) return prev;
        const ids = new Set(prev.activeLorebookIds ?? []);
        if (ids.has(id)) ids.delete(id);
        else ids.add(id);
        const next = { ...prev, activeLorebookIds: Array.from(ids) };
        saveSettings(next);
        return next;
      });
    },
    []
  );

  // ---- MOD 工坊: Variable Schema CRUD ----
  const addVariableSchema = useCallback(async (schema: VariableSchema) => {
    await saveVariableSchema(schema);
    setVariableSchemas((prev) => [...prev, schema]);
  }, []);

  const updateVariableSchema = useCallback(async (schema: VariableSchema) => {
    const next: VariableSchema = { ...schema, updatedAt: Date.now() };
    await saveVariableSchema(next);
    setVariableSchemas((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  }, []);

  const deleteVariableSchema = useCallback(async (id: string) => {
    await deleteVariableSchemaDb(id);
    setVariableSchemas((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ---- MOD 工坊: Scenario Template CRUD ----
  const addScenario = useCallback(async (scenario: ScenarioTemplate) => {
    await saveScenario(scenario);
    setScenarios((prev) => [...prev, scenario]);
  }, []);

  const updateScenario = useCallback(async (scenario: ScenarioTemplate) => {
    const next: ScenarioTemplate = { ...scenario, updatedAt: Date.now() };
    await saveScenario(next);
    setScenarios((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  }, []);

  const deleteScenario = useCallback(async (id: string) => {
    await deleteScenarioDb(id);
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ---- MOD 工坊: Panel Layout CRUD ----
  const addPanelLayout = useCallback(async (layout: PanelLayout) => {
    await savePanelLayout(layout);
    setPanelLayouts((prev) => [...prev, layout]);
  }, []);

  const updatePanelLayout = useCallback(async (layout: PanelLayout) => {
    const next: PanelLayout = { ...layout, updatedAt: Date.now() };
    await savePanelLayout(next);
    setPanelLayouts((prev) => prev.map((l) => (l.id === next.id ? next : l)));
  }, []);

  const deletePanelLayout = useCallback(async (id: string) => {
    await deletePanelLayoutDb(id);
    setPanelLayouts((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // ---- MOD 系统: Mod CRUD ----
  const addMod = useCallback(async (mod: Mod) => {
    await saveMod(mod);
    setMods((prev) => [...prev, mod]);
  }, []);

  const updateMod = useCallback(async (mod: Mod) => {
    const next: Mod = { ...mod, updatedAt: Date.now() };
    await saveMod(next);
    setMods((prev) => prev.map((m) => (m.id === next.id ? next : m)));
  }, []);

  const deleteMod = useCallback(async (id: string) => {
    await deleteModDb(id);
    setMods((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // ---- MOD 系统: 使用 MOD 创建会话 ----
  const createChatWithMods = useCallback(
    async (
      name: string,
      selectedModIds: string[],
      options?: { scenarioId?: string; presetId?: string }
    ): Promise<string> => {
      let variables: Record<string, any> = {};
      let presetId = options?.presetId ?? settings?.activePresetId ?? null;
      let lorebookIds: string[] = settings?.activeLorebookIds ?? [];
      let characterName = settings?.characterName ?? DEFAULT_SETTINGS.characterName;
      let userName = settings?.userName ?? DEFAULT_SETTINGS.userName;

      // 1. 应用场景模板（如果有）
      if (options?.scenarioId) {
        const scenario = scenarios.find((s) => s.id === options.scenarioId);
        if (scenario) {
          variables = { ...scenario.initialVariables };
          if (scenario.presetId) presetId = scenario.presetId;
          if (scenario.lorebookIds.length > 0) lorebookIds = scenario.lorebookIds;
          if (scenario.characterName) characterName = scenario.characterName;
          if (scenario.userName) userName = scenario.userName;
        }
      }

      // 2. 解析选中的 MOD
      const selectedMods = mods.filter((m) => selectedModIds.includes(m.id));

      // 3. 合并物品/属性 MOD 的变量注入
      for (const mod of selectedMods) {
        if (mod.content.type === 'item' || mod.content.type === 'attribute') {
          variables = { ...variables, ...mod.content.variableInjections };
        }
      }

      // 4. 合并世界书 MOD 的世界书引用
      for (const mod of selectedMods) {
        if (mod.content.type === 'worldbook') {
          lorebookIds = [...new Set([...lorebookIds, ...mod.content.lorebookIds])];
        }
      }

      // 5. 构建开局描述
      const openingParts: string[] = [];
      for (const mod of selectedMods) {
        if (mod.openingDescription) openingParts.push(mod.openingDescription);
        if (mod.content.type === 'plot') openingParts.push(mod.content.openingText);
      }
      const openingBlock = openingParts.join('\n\n');

      // 6. 创建会话
      const chat: ChatSession = {
        id: crypto.randomUUID(),
        name,
        messages: [],
        characterName,
        userName,
        presetId,
        lorebookIds,
        variables,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 7. 如果有开局描述，注入为系统消息
      if (openingBlock) {
        chat.messages.push({
          id: crypto.randomUUID(),
          role: 'system',
          content: openingBlock,
          timestamp: Date.now(),
        });
      }

      await saveChat(chat);
      setChats((prev) => [...prev, chat]);
      setActiveChatId(chat.id);
      return chat.id;
    },
    [settings, scenarios, mods]
  );

  // ---- v3 game mode: streaming + parser + variables ----
  const parser = useStreamParser(
    settings?.customTags ?? [...DEFAULT_TAGS],
    [...DEFAULT_OPAQUE_TAGS]
  );
  const router = useApiRouter(settings?.api ?? DEFAULT_SETTINGS.api);

  const sendGameMessage = useCallback(
    async (userText: string, baseChat?: ChatSession) => {
      const sourceChat = baseChat ?? activeChat;
      if (!sourceChat || !settings) return;
      if (!activePreset) {
        showToast('请先创建或导入预设');
        return;
      }

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userText,
        timestamp: Date.now(),
      };
      const updatedChat: ChatSession = {
        ...sourceChat,
        messages: [...sourceChat.messages, userMsg],
        updatedAt: Date.now(),
      };
      await db.chats.put(updatedChat);
      setChats((prev) => prev.map((c) => (c.id === updatedChat.id ? updatedChat : c)));

      const activeLorebookIds = new Set(settings.activeLorebookIds ?? []);
      const { messages } = assemblePrompt({
        userInput: userText,
        history: sourceChat.messages,
        preset: activePreset,
        lorebooks: lorebooks.filter((l) => activeLorebookIds.has(l.id)),
        userName: settings.userName,
        characterName: settings.characterName,
        extraVariables: updatedChat.variables,
        formatPrompt: settings.formatPromptTemplate,
      });

      parser.start();
      try {
        await router.sendStream({
          task: 'story',
          messages,
          onChunk: (delta) => parser.feed(delta),
        });
      } catch (e) {
        parser.reset();
        throw e;
      }

      const { events, parsed } = parser.finish();
      let implicitUpdates: Record<string, any> = {};
      if (settings.apiMode === 'dual' && settings.api.secondary?.enabled) {
        try {
          const rawVars = await router.sendJson({
            task: 'vars',
            messages: buildImplicitVarsMessages(parsed.maintext || assistantContentFromEvents(events), updatedChat.variables ?? {}),
          });
          implicitUpdates = parseVarsBlock(rawVars).merge;
        } catch {
          showToast('隐式变量提取失败，已保留显式变量更新');
        }
      }
      const { nextVariables, snapshot } = applyParsedToChat(
        updatedChat.variables ?? {},
        parsed,
        implicitUpdates,
      );

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantContentFromEvents(events),
        timestamp: Date.now(),
        parsed,
        variablesAfter: snapshot,
        apiUsed: 'primary',
      };
      const finalChat: ChatSession = {
        ...updatedChat,
        messages: [...updatedChat.messages, assistantMsg],
        variables: nextVariables,
        updatedAt: Date.now(),
      };
      await db.chats.put(finalChat);
      setChats((prev) => prev.map((c) => (c.id === finalChat.id ? finalChat : c)));
    },
    [activeChat, settings, lorebooks, activePreset, parser, router, showToast]
  );

  const jumpToFloor = useCallback(
    async (messageId: string) => {
      if (!activeChat) return;
      const idx = activeChat.messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return;
      const truncated = activeChat.messages.slice(0, idx + 1);
      const restoredVars = restoreVariablesAtMessage(messageId);
      const next: ChatSession = {
        ...activeChat,
        messages: truncated,
        variables: restoredVars,
        updatedAt: Date.now(),
      };
      await db.chats.put(next);
      setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    },
    [activeChat, restoreVariablesAtMessage]
  );

  const branchFromMessage = useCallback(
    async (messageId: string, name?: string) => {
      if (!activeChat) return;
      const idx = activeChat.messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return;
      const branchCount = chats.filter((c) => c.name.startsWith(`${activeChat.name} · 分支`)).length;
      const next = branchChat(activeChat, idx, {
        name: name ?? `${activeChat.name} · 分支 ${branchCount + 1}`,
        presetId: activeChat.presetId ?? settings?.activePresetId ?? null,
        lorebookIds: [...(activeChat.lorebookIds ?? settings?.activeLorebookIds ?? [])],
      });
      await db.chats.put(next);
      setChats((prev) => [...prev, next]);
      setActiveChatId(next.id);
      showToast('已创建分支会话');
    },
    [activeChat, chats, settings, showToast]
  );

  const regenerateLast = useCallback(async () => {
    if (!activeChat) return;
    const lastUserIdx = [...activeChat.messages]
      .reverse()
      .findIndex((m) => m.role === 'user');
    if (lastUserIdx < 0) return;
    const targetIdx = activeChat.messages.length - 1 - lastUserIdx;
    const truncated = activeChat.messages.slice(0, targetIdx);
    const restoredVars =
      truncated.length > 0
        ? restoreVariablesAtMessage(truncated[truncated.length - 1].id)
        : {};
    const next: ChatSession = {
      ...activeChat,
      messages: truncated,
      variables: restoredVars,
      updatedAt: Date.now(),
    };
    await db.chats.put(next);
    setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    await sendGameMessage(activeChat.messages[targetIdx].content, next);
  }, [activeChat, restoreVariablesAtMessage, sendGameMessage]);

  const setChatVariables = useCallback(
    async (vars: Record<string, any>) => {
      if (!activeChat) return;
      const next: ChatSession = {
        ...activeChat,
        variables: vars,
        updatedAt: Date.now(),
      };
      await db.chats.put(next);
      setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    },
    [activeChat]
  );

  return {
    // state
    settings,
    presets,
    lorebooks,
    chats,
    activeChat,
    activePreset,
    initialized,

    // chat actions
    createChat,
    selectChat,
    removeChat,
    sendMessage,
    deleteMessage,
    editMessage,
    rollbackTo,

    // settings / lorebook / preset mutations
    updateSettings,
    addPreset,
    addLorebook,
    toggleLorebook,
    updateLorebook,
    deleteLorebook,
    addLorebookFromDefault,
    updatePreset,
    deletePreset,
    addPresetFromDefault,

    // v3 game mode
    sendGameMessage,
    jumpToFloor,
    branchFromMessage,
    regenerateLast,
    streamState: parser.state,
    abortStream: router.abort,
    openSettings: () => setShowSettings(true),
    openLorebooks: () => setShowLorebooks(true),
    openPresets: () => setShowPresets(true),
    openVariables: () => setShowVariables(true),

    // modal states (for binding)
    showSettings,
    setShowSettings,
    showLorebooks,
    setShowLorebooks,
    showPresets,
    setShowPresets,
    showVariables,
    setShowVariables,

    // variables
    setChatVariables,

    // MOD 工坊
    variableSchemas,
    addVariableSchema,
    updateVariableSchema,
    deleteVariableSchema,
    scenarios,
    addScenario,
    updateScenario,
    deleteScenario,
    panelLayouts,
    addPanelLayout,
    updatePanelLayout,
    deletePanelLayout,

    // MOD 系统
    mods,
    addMod,
    updateMod,
    deleteMod,
    createChatWithMods,

    // 模态框状态
    showSchemaEditor,
    setShowSchemaEditor,
    showScenarioManager,
    setShowScenarioManager,
    showPanelEditor,
    setShowPanelEditor,
    showModWorkshop,
    setShowModWorkshop,
    showCharacterCreation,
    setShowCharacterCreation,
    openSchemaEditor: () => setShowSchemaEditor(true),
    openScenarioManager: () => setShowScenarioManager(true),
    openPanelEditor: () => setShowPanelEditor(true),
    openModWorkshop: () => setShowModWorkshop(true),
    openCharacterCreation: () => setShowCharacterCreation(true),

    // toast
    toast,
    showToast,
  };
}

type SillytavernContextValue = ReturnType<typeof useSillytavernState>;

const SillytavernContext = createContext<SillytavernContextValue | null>(null);

export function SillytavernProvider({ children }: { children: ReactNode }) {
  const value = useSillytavernState();
  return createElement(SillytavernContext.Provider, { value }, children);
}

export function useSillytavern() {
  const value = useContext(SillytavernContext);
  if (!value) {
    throw new Error('useSillytavern must be used within SillytavernProvider');
  }
  return value;
}
