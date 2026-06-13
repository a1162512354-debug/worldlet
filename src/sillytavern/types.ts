/**
 * SillyTavern Web - Core Types
 */

// ========== World Book (Lorebook) Types ==========

export interface LorebookEntry {
  id: string;
  keys: string[];
  secondaryKeys: string[];
  content: string;
  comment?: string;
  order: number;
  /** SillyTavern position: 0=before_char, 1=after_char, 2=before_example(AN top), 3=after_example(AN bottom), 4=at_depth, 5=example_msg_top, 6=example_msg_bottom, 7=outlet */
  position: 'before_char' | 'after_char' | 'before_example' | 'after_example' | 'at_depth' | 'example_msg_top' | 'example_msg_bottom' | 'outlet';
  depth?: number;
  role?: number;
  selective: boolean;
  /** 0=and_any(not_any?), 1=or(not_all?), actual SillyTavern has 4 logics but we normalize to and/or where possible */
  selectiveLogic: 'and_any' | 'not_all' | 'not_any' | 'and_all';
  constant: boolean;
  probability: number;
  useProbability?: boolean;
  addMemo: boolean;
  sticky?: number;
  cooldown?: number;
  delay?: number;
  weight?: number;
  scanDepth?: number;
  caseSensitive?: boolean;
  matchWholeWords?: boolean;
  excludeRecursion?: boolean;
  preventRecursion?: boolean;
  useGroupScoring?: boolean;
  matchPersonaDescription?: boolean;
  matchCharacterDescription?: boolean;
  matchCharacterPersonality?: boolean;
  matchCharacterDepthPrompt?: boolean;
  matchScenario?: boolean;
  matchCreatorNotes?: boolean;
  group?: string;
  decorators?: string[];
  characterFilter?: {
    isExclude?: boolean;
    names?: string[];
    tags?: number[];
  };
}

export interface Lorebook {
  id: string;
  name: string;
  description?: string;
  entries: LorebookEntry[];
  recursiveScanning: boolean;
  caseSensitive: boolean;
  matchWholeWords: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SillyTavernLorebookExport {
  name: string;
  description?: string;
  entries: Record<string, {
    uid: number;
    key: string[];
    keysecondary: string[];
    comment: string;
    content: string;
    constant: boolean;
    selective: boolean;
    selectiveLogic: 0 | 1 | 2 | 3;
    addMemo: boolean;
    order: number;
    position: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
    role: number;
    disable: boolean;
    probability: number;
    depth: number;
    group: string;
    useProbability: boolean;
    excluded: boolean;
    sticky: number;
    cooldown: number;
    delay: number;
    weight: number;
    scanDepth: number;
    caseSensitive: boolean;
    matchWholeWords: boolean;
    excludeRecursion: boolean;
    preventRecursion: boolean;
    useGroupScoring: boolean;
    matchPersonaDescription: boolean;
    matchCharacterDescription: boolean;
    matchCharacterPersonality: boolean;
    matchCharacterDepthPrompt: boolean;
    matchScenario: boolean;
    matchCreatorNotes: boolean;
    decorators: string[];
    characterFilter: {
      isExclude?: boolean;
      names?: string[];
      tags?: number[];
    };
  }>;
  settings?: {
    recursive_scanning?: boolean;
    case_sensitive?: boolean;
    match_whole_words?: boolean;
  };
}

export interface MatchedEntry {
  entry: LorebookEntry;
  score: number;
  matchedKeywords: string[];
}

// ========== Preset Types ==========

/** SillyTavern-compatible chat completion preset.
 *  `settings` stores the raw SillyTavern preset JSON (temp_openai, prompt_order, prompts, etc.)
 */
export interface ChatPreset {
  id: string;
  name: string;
  description?: string;
  /** Raw SillyTavern preset fields. For OpenAI presets this includes temp_openai, prompt_order, prompts, etc. */
  settings: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

// ========== Settings Types ==========

export interface ApiSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeout: number;
  secondary?: {
    enabled: boolean;
    baseUrl: string;
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface AppSettings {
  key?: string;
  api: ApiSettings;
  /** 'single' = primary API handles all tasks. 'dual' = primary handles story, secondary handles variables. */
  apiMode: 'single' | 'dual';
  activePresetId: string | null;
  activeLorebookIds: string[];
  userName: string;
  characterName: string;
  theme: 'deep-space' | 'parchment';
  language: 'zh' | 'en';
  autoSave: boolean;
  autoSaveInterval: number;
  uiMode: 'game';
  customTags: string[];
  formatPromptTemplate: string;
  thinkingDisplay: 'fold' | 'hide' | 'inline';
}

export const DEFAULT_FORMAT_PROMPT = `你必须严格按照以下 XML 标签格式输出回复，不要使用 Markdown 包裹：
<thinking>……</thinking>     ← 可选；内部任何字符都视为思考过程，不被解析
<maintext>……</maintext>     ← 必填；本回合的剧情正文，可多段，保留换行
<option>选项 A
选项 B
选项 C</option>              ← 必填；至少 2 项，每行一个
<sum>……</sum>               ← 必填；本回合一句话总结
<vars>{ "金钱": +10, "HP": 38 }</vars>   ← 选填；JSON 深合并`;

export const DEFAULT_TAGS = ['maintext', 'option', 'sum', 'vars', 'thinking', 'think'] as const;
export const DEFAULT_OPAQUE_TAGS = ['thinking', 'think'] as const;

export const DEFAULT_SETTINGS: AppSettings = {
  api: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    timeout: 60000,
  },
  apiMode: 'single',
  activePresetId: null,
  activeLorebookIds: [],
  userName: '用户',
  characterName: 'AI',
  theme: 'deep-space',
  language: 'zh',
  autoSave: true,
  autoSaveInterval: 30,
  uiMode: 'game',
  customTags: ['maintext', 'option', 'sum', 'vars', 'thinking', 'think'],
  formatPromptTemplate: DEFAULT_FORMAT_PROMPT,
  thinkingDisplay: 'fold',
};

// ========== Chat Types ==========

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
  variables?: Record<string, string | number>;
  metadata?: {
    tokenCount?: number;
    lorebookEntries?: string[];
    processingTime?: number;
  };
  parsed?: ParsedTags;
  variablesAfter?: Record<string, any>;
  apiUsed?: ApiTarget;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  characterName: string;
  userName: string;
  presetId: string | null;
  lorebookIds: string[];
  variables: Record<string, any>;
  /** 背包系统 */
  inventory: Inventory;
  createdAt: number;
  updatedAt: number;
}

// ========== Constants ==========

/** Common SillyTavern prompt_order identifiers used in OpenAI presets. */
export const DEFAULT_PROMPT_ORDER = [
  { identifier: 'main', name: 'Main Prompt', role: 'system' as const },
  { identifier: 'worldInfoBefore', name: 'World Info (Before)', role: 'system' as const },
  { identifier: 'charDescription', name: 'Character Description', role: 'system' as const },
  { identifier: 'charPersonality', name: 'Character Personality', role: 'system' as const },
  { identifier: 'scenario', name: 'Scenario', role: 'system' as const },
  { identifier: 'personaDescription', name: 'Persona Description', role: 'system' as const },
  { identifier: 'dialogueExamples', name: 'Dialogue Examples', role: 'system' as const },
  { identifier: 'chatHistory', name: 'Chat History', role: 'system' as const },
  { identifier: 'worldInfoAfter', name: 'World Info (After)', role: 'system' as const },
  { identifier: 'groupNudge', name: 'Group Nudge', role: 'system' as const },
];

/** 创建空背包 */
export function createEmptyInventory(): Inventory {
  return {
    weapons: [],
    armor: [],
    consumables: [],
    materials: [],
    other: [],
  };
}

export function createDefaultPreset(): Omit<ChatPreset, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: '默认预设',
    description: 'SillyTavern 兼容的默认 OpenAI 预设',
    settings: {
      temp_openai: 0.8,
      freq_pen_openai: 0,
      pres_pen_openai: 0,
      top_p_openai: 0.9,
      top_k_openai: 0,
      top_a_openai: 0,
      min_p_openai: 0,
      repetition_penalty_openai: 1,
      openai_max_context: 4096,
      openai_max_tokens: 2048,
      stream_openai: false,
      max_context_unlocked: false,
      chat_completion_source: 'openai',
      openai_model: 'gpt-3.5-turbo',
      main: 'Write {{char}}\'s next reply in a fictional chat between {{char}} and {{user}}.',
      nsfw: '',
      jailbreak: '',
      enhanceDefinitions: '',
      impersonation_prompt: '',
      new_chat_prompt: '',
      new_group_chat_prompt: '',
      new_example_chat_prompt: '',
      continue_nudge_prompt: '',
      wi_format: '',
      group_nudge_prompt: '',
      scenario_format: '',
      personality_format: '',
      prompts: [],
      prompt_order: DEFAULT_PROMPT_ORDER.map((p, i) => ({ ...p, enabled: true })),
    },
  };
}

// ========== v3 Game Mode Types ==========

export interface ParsedTags {
  thinking: string;
  maintext: string;
  options: string[];
  sum: string;
  varsRaw: string;
  varsCommands: VarsPatch;
  unknown: Record<string, string>;
}

export interface VarsPatch {
  /** Object that will be deep-merged into chat.variables */
  merge: Record<string, any>;
}

export type Task = 'story' | 'summary' | 'vars';
export type ApiTarget = 'primary' | 'secondary';

// ========== Variable Schema Types (MOD 工坊) ==========

/** 变量类型枚举 */
export type VariableType = 'number' | 'enum' | 'list' | 'boolean' | 'text' | 'bar';

/** 变量展示方式 */
export type VariableDisplayMode = 'progress' | 'badge' | 'text' | 'icon' | 'grid';

/** 单个变量定义（Schema） */
export interface VariableDefinition {
  id: string;
  type: VariableType;

  // 给玩家看的
  displayName: string;
  displayFormat?: string;        // e.g. "{value}/{max}"
  description?: string;
  displayMode?: VariableDisplayMode;

  // 给 AI 看的
  aiDescription: string;
  aiUpdateRules?: string;        // e.g. "物理攻击: -10~-30, 治疗: +20~+50"
  aiValidValues?: string;        // e.g. "0-100的整数"

  // 类型相关配置
  config?: VariableTypeConfig;

  // 默认值
  defaultValue?: any;

  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

/** 变量类型配置 */
export interface VariableTypeConfig {
  // number / bar 类型
  min?: number;
  max?: number;
  step?: number;

  // enum 类型
  options?: string[];            // e.g. ["练气期", "筑基期", "金丹期"]

  // list 类型
  allowDuplicates?: boolean;
  maxItems?: number;
}

/** 变量 Schema 集合（一个场景模板的变量定义集） */
export interface VariableSchema {
  id: string;
  name: string;
  description?: string;
  definitions: VariableDefinition[];
  createdAt: number;
  updatedAt: number;
}

/** 开局模板 */
export interface ScenarioTemplate {
  id: string;
  name: string;
  description?: string;
  lorebookIds: string[];
  presetId: string | null;
  variableSchemaId: string | null;
  initialVariables: Record<string, any>;
  systemPrompt?: string;         // 开局系统提示词
  userName?: string;
  characterName?: string;
  createdAt: number;
  updatedAt: number;
}

// ========== Panel Layout Types (自定义展示面板) ==========

/** 面板组件类型 */
export type WidgetType = 'progress' | 'badge' | 'list' | 'grid' | 'text' | 'separator' | 'inventory-category' | 'inventory-item' | 'nested-layout';

/** 单个面板组件 */
export interface PanelWidget {
  id: string;
  widgetType: WidgetType;
  variableKey: string;            // 对应的变量名
  label?: string;                 // 自定义标签（覆盖 displayName）
  displayMode?: VariableDisplayMode;
  sortOrder: number;

  // 布局
  row: number;                    // 所在行（0-based）
  col: number;                    // 所在列（0-based）
  colSpan?: number;               // 跨列数（默认1）

  // 样式覆盖
  color?: string;                 // 自定义颜色
  icon?: string;                  // 图标标识
}

/** 面板布局配置 */
export interface PanelLayout {
  id: string;
  name: string;
  description?: string;
  columns: number;                // 列数（1-4）
  widgets: PanelWidget[];
  isDefault?: boolean;            // 是否为默认面板
  createdAt: number;
  updatedAt: number;
}

/** 预设面板模板 */
export interface PanelTemplate {
  name: string;
  description: string;
  icon: string;
  columns: number;
  widgets: Omit<PanelWidget, 'id'>[];
}

// ========== MOD 系统类型 ==========

/** MOD 类型 */
export type ModType = 'worldbook' | 'item' | 'skill' | 'plot';

/** 背包物品实例 */
export interface InventoryItem {
  /** 物品实例ID */
  id: string;
  /** 引用的变量结构ID */
  schemaId: string;
  /** 物品名称 */
  name: string;
  /** 物品描述 */
  description?: string;
  /** 数量 */
  quantity: number;
  /** 字段值 */
  values: Record<string, any>;
  /** 是否装备中 */
  equipped?: boolean;
  /** 创建时间 */
  createdAt: number;
}

/** 背包系统 */
export interface Inventory {
  /** 武器 */
  weapons: InventoryItem[];
  /** 防具 */
  armor: InventoryItem[];
  /** 消耗品 */
  consumables: InventoryItem[];
  /** 材料 */
  materials: InventoryItem[];
  /** 其他 */
  other: InventoryItem[];
}

/** MOD 内容 — 歧义联合类型 */
export type ModContent =
  | ModContentWorldbook
  | ModContentItem
  | ModContentSkill
  | ModContentPlot;

export interface ModContentWorldbook {
  type: 'worldbook';
  /** 引用的世界书 ID */
  lorebookIds: string[];
}

export interface ModContentItem {
  type: 'item';
  /** 引用的变量结构 ID */
  schemaId: string | null;
  /** 物品名称 */
  itemName: string;
  /** 物品描述 */
  itemDescription: string;
  /** 数量 */
  quantity: number;
  /** 字段值，如 { attack: 10, durability: 100 } */
  values: Record<string, any>;
  /** 背包分类：weapons, armor, consumables, materials, other */
  category: 'weapons' | 'armor' | 'consumables' | 'materials' | 'other';
}

export interface ModContentSkill {
  type: 'skill';
  /** 引用的变量结构 ID */
  schemaId: string | null;
  /** 字段值 */
  values: Record<string, any>;
}

export interface ModContentPlot {
  type: 'plot';
  /** 开局剧情/背景文本 */
  openingText: string;
}

/** MOD 实体 */
export interface Mod {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji 或图标标识
  type: ModType;
  content: ModContent;
  tags: string[]; // 分类标签
  /** 开局描述，注入到第一层消息 */
  openingDescription: string;
  author?: string;
  version?: string;
  createdAt: number;
  updatedAt: number;
}

/** MOD 导出包 */
export interface ModExportPackage {
  format: 'worldlet-mod-v1';
  mod: Omit<Mod, 'id' | 'createdAt' | 'updatedAt'>;
  /** 世界书 MOD 内嵌的世界书数据 */
  embeddedLorebooks?: Lorebook[];
}
