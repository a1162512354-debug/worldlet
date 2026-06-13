# Task Plan: 独立酒馆前端

---

## ⚠️ 恢复上下文指引（给 AI）

> **如果你是新会话的 AI，请按以下步骤操作：**
>
> 1. 读取本文件 `task_plan.md`（主规划）
> 2. 读取 `findings.md`（废案分析、技术发现）
> 3. 读取 `progress.md`（改动日志）
> 4. 查看 `Current Phase` 确定当前进度
> 5. 执行 `Current Phase` 中标记为 `[ ]` 的任务
> 6. 每完成一个任务，更新本文件并推送到 Git
>
> **5-Question 快速恢复**：
> | 问题 | 答案来源 |
> |------|---------|
> | 我在哪？ | 本文件 `Current Phase` |
> | 要去哪？ | 本文件 `Phases` 中 `pending` 的任务 |
> | 目标是什么？ | 本文件 `Goal` |
> | 学到了什么？ | `findings.md` |
> | 做了什么？ | `progress.md` |
>
> **Git 仓库**：`https://github.com/a1162512354-debug/worldlet.git`
> **项目目录**：`D:\酒馆\独立前端`
> **每次修改都需要推送**
>
> **⚠️ 开发服务器注意事项**：
> - 启动前先检查 5173 端口是否已占用，如果已占用就**重启**而不是开新端口
> - 重启方式：先 kill 旧进程，再 `npm run dev`
> - 不要每次都开一个新端口（5174、5175...），会导致端口泄漏

---

## Goal
构建一个**独立于 SillyTavern**、可正常游玩的类酒馆前端，兼容 SillyTavern 的世界书/用户/变量/预设格式，**仅保留游戏模式**（RPG 终端风格），未来适配 Android/iOS/Win 多平台。

## Git 仓库
- 地址：`https://github.com/a1162512354-debug/worldlet.git`
- **每次修改都需要推送**

## Current Phase
Phase 4 — 测试与质量保证（Phase 3 已完成：CSS迁移+主题系统+MOD工坊+背包系统+嵌套布局；下一步：编写端到端测试，修复发现的bug）

## 项目目录
`D:\酒馆\独立前端`

---

## Phases

### Phase 0: 规划与准备 `complete`
- [x] 审查废案（D:\酒馆\酒馆前端卡项目）
- [x] 读取 tavernlike skill 了解核心功能
- [x] 创建 task_plan.md, findings.md, progress.md
- [x] 初始化 Git 仓库并关联远程
- [x] 确认技术栈和 UI 方案
- **Status:** `complete`

### Phase 1: 项目初始化 `complete`
- [x] 使用 tavernlike skill 初始化项目（自动检测 React + 安装依赖 + 生成核心模块）
- [x] 验证生成的代码无 TypeScript 错误（`npm run typecheck` 通过）
- [x] 验证 dev server 可启动（Vite `http://127.0.0.1:5173/` 启动成功）
- [x] 验证生产构建与单元测试（`npm run build` 通过；`npm test` 7 文件 / 41 测试通过）
- [x] 初始化 Git 并推送首次提交
- **Status:** `complete`
- **依赖**: Phase 0 完成

### Phase 2: 核心功能验证 `complete`
- [x] 验证世界书导入/管理功能（LorebookModal 已重构；lorebook-engine 22 测试覆盖关键词匹配/选择逻辑/递归扫描/排序/分组）
- [x] 验证预设导入/管理功能（已新增 JSON 导入/导出/重命名；PresetModal 新增；`importer.test.ts` 覆盖批量导入）
- [x] 验证游戏模式：流式输出 + XML 标签解析（API 验证通过，流式输出正常）
- [x] 验证变量系统：显式 `<vars>` 更新 + 隐式自动提取（dual API 时 vars 任务提取 JSON 并合并；`variables.test.ts` 覆盖）
- [x] 验证变量快照回档：点击历史消息 → 变量恢复（已统一 rollback/jump/helper 快照恢复逻辑；VariablesModal 提示已修正为 `<vars>` 格式；删除 `extractVariables()` 死代码）
- [x] 验证消息编辑/删除/分支功能（HistoryDrawer 已重构：`prompt()` 改为 textarea 模态编辑，删后续加 confirm 确认）
- [x] 验证选项点选功能（OptionList 已过滤空选项；API 验证通过）
- [x] 参考废案迁移 Deep Space 终端 UI 首轮
- [x] UI 精简：工具栏重构（历史移至顶部栏，重roll移至输入框）
- [x] 代码级修复：HistoryDrawer 确认框 + textarea 编辑、OptionList 空过滤、VariablesModal 提示修正、lorebook-engine 测试、删除死代码（`7c46087`）
- [x] 深色主题全局修复：6 个模态框组件亮色背景/低对比度文字/亮色边框全部修正（`0b6f23f`）
- [x] API 功能验证通过（用户手动测试：流式输出、变量更新、选项点选均正常）
- [x] 推送到 Git（`60b88e0` → `7c46087` → `4d0404a` → `0b6f23f` 已推送 origin/main）
- **Status:** `complete`
- **依赖**: Phase 1 完成

### Phase 3: CSS 迁移 + 主题系统 + MOD 工坊 `complete`
> 合并原 Phase 3（MOD 工坊）和 Phase 4（UI 美化），因为 CSS 迁移是两者共同基础。

#### 3.1 CSS 迁移与主题系统
- [x] 7 个内联样式组件迁移到 CSS class（SettingsModal 57处、EntryForm 38处、PresetModal 36处、VariablesModal 16处、LorebookEditorModal 13处、PromptOrderEditor 7处、HistoryDrawer 5处）→ 全部迁移到 `.st-*` 工具类 + CSS 变量
- [x] 建立主题切换系统（`data-theme` + 主题配置文件）
- [x] 新增第二套主题（古典羊皮纸风格），验证主题切换
- [x] 移动端初步适配（响应式布局）

#### 3.2 MOD 工坊系统

##### 3.2.1 变量结构系统（基础）
- [x] 新增 `VariableDefinition` 类型（type/description/default/displayFormat/aiDescription/aiUpdateRules）
- [x] 新增 `variableSchemas` IndexedDB 表
- [x] 新增 schema CRUD 函数（database.ts）
- [x] useSillytavern 暴露 schema 管理接口
- [x] VariableSchemaEditorModal 组件（定义变量类型/描述/默认值）
- [x] 预设模板（武器、防具、消耗品、技能、角色属性）

##### 3.2.2 MOD 系统重构
- [x] MOD 类型定义（ModType: worldbook/item/skill/plot）
- [x] MOD 数据结构（Mod 接口，支持 4 种内容类型）
- [x] mods IndexedDB 表（Dexie v6，索引：id, name, type, updatedAt, *tags）
- [x] MOD CRUD 函数（database.ts）
- [x] ModWorkshopPage 组件（MOD 创作页面）
- [x] CharacterCreationPage 组件（开局页面/车卡页面）
- [x] createChatWithMods 函数（MOD 注入机制）

##### 3.2.3 背包系统
- [x] Inventory/InventoryItem 类型定义
- [x] ChatSession 添加 inventory 字段
- [x] 物品 MOD 支持背包分类（weapons/armor/consumables/materials/other）
- [x] 物品 MOD 引用变量结构（schemaId）
- [x] 物品 MOD 支持物品名称、描述、数量、分类
- [x] 选择变量结构时自动填充默认值

##### 3.2.4 变量面板优化
- [x] VariablesModal 分组折叠搜索（按变量结构分组）
- [x] VariablePanel 嵌套菜单设计（主菜单 → 背包/变量/布局详情）
- [x] VariablePanel 使用保存的布局展示变量

##### 3.2.5 展示面板编辑器增强
- [x] 面板编辑器支持背包组件（inventory-category/inventory-item）
- [x] 面板编辑器支持嵌套布局（nested-layout）
- [x] 预览支持点击展开背包分类和物品详情
- [x] 新建布局时保存按钮可点击

- **Status:** `complete`
- **依赖**: Phase 2 完成

### Phase 4: 测试与质量保证 `in_progress`
- [ ] 使用 playwright 编写端到端测试
- [ ] 测试核心流程：创建对话 → 发送消息 → 流式回复 → 变量更新
- [ ] 测试世界书：导入 → 激活 → 关键词触发
- [ ] 测试预设：导入 → 切换 → 参数生效
- [ ] 测试 MOD 工坊：创建 MOD → 开局选择 → 变量/背包注入
- [ ] 测试背包系统：物品添加 → 分类展示 → 变量面板查看
- [ ] 测试展示面板：创建布局 → 嵌套布局 → 预览交互
- [ ] 修复发现的 bug
- [ ] 推送到 Git
- **Status:** `in_progress`
- **依赖**: Phase 3 完成

### Phase 5: 多平台适配 `pending`（后续规划）
- [ ] Capacitor 集成（Android/iOS）
- [ ] Tauri 集成（Windows）
- [ ] 移动端 UI 优化（触摸交互、手势、键盘适配）
- [ ] 本地文件系统访问（导入/导出）
- [ ] 推送到 Git
- **Status:** `pending`
- **依赖**: Phase 4 完成

---

## 核心架构

### 与废案的区别
| 废案 | 新项目 |
|------|--------|
| Agent 系统（22 工具） | ❌ 不需要 |
| MOD 工坊（Agent 生成 MOD） | ✅ **重新定位**：开局模板 + 变量结构 + 展示面板 |
| 管线系统（双引擎并行） | ✅ 保留，**合并为单引擎**优化 |
| 3 套主题 | ✅ 保留，但解耦 |
| Deep Space 终端 UI | ✅ 简化版，响应式 |
| 核心 SillyTavern 集成 | ✅ 完整保留 |
| 聊天/游戏双模式 | ✅ **仅保留游戏模式** |
| 变量快照回档 | ✅ 保留，这是核心功能 |

### 游戏模式（唯一模式）

**界面**：RPG 终端风格（剧情正文 + 选项列表）
**AI 输出**：XML 标签结构化
**交互**：点选选项 或 自由输入

AI 输出格式：
```xml
<thinking>AI 思考过程（折叠显示）</thinking>
<maintext>剧情正文，流式显示</maintext>
<option>选项A
选项B
选项C</option>
<sum>本回合一句话总结</sum>
<vars>{ "HP": 80, "gold": 15 }</vars>
```

### 变量快照与回档系统

**核心机制**：每条 AI 回复都携带当前变量的完整快照

```
消息1 (变量快照: {HP:100, gold:50, chapter:1})  ← 存档点1
消息2 (变量快照: {HP:80, gold:45, chapter:1})   ← 存档点2
消息3 (变量快照: {HP:60, gold:100, chapter:2})  ← 存档点3（AI 给了太多金币）
  → 回档到消息2，变量自动恢复为 {HP:80, gold:45, chapter:1}
```

**功能**：
- **回档**：点击任意历史消息，变量自动恢复到该消息时的状态
- **分支**：从任意消息创建新分支，变量从该点继续
- **存档/读档**：手动保存/加载变量状态（独立于消息）
- **变量面板**：实时查看/手动编辑当前变量
- **自动更新**：AI 读取正文，自动提取变量变化（显式 `<vars>` + 隐式提取）

**废案对比**：
- 废案的 `GameView` 已实现消息内联显示 + 变量快照
- 新项目保留此设计，去掉独立的历史抽屉（HistoryDrawer）

### 管线系统（优化版）

废案有两套并行引擎，新项目合并为一套：

| 废案 | 新项目 |
|------|--------|
| `flow-executor.ts`（FlowGroup 模型） | ✅ 保留，作为主引擎 |
| `agent/pipeline/pipeline-engine.ts`（DAG 模型） | ❌ 移除，功能合并到 FlowGroup |

**FlowGroup 模型**（保留并优化）：
- 组间**顺序**执行，组内步骤**并发**执行
- 每个步骤：选 API 端点、选世界书、配提示词、流式开关
- `{{prev_result}}` 引用上一组结果
- 模板变量：`{{chat_history}}`, `{{world_book}}`, `{{prev_result}}`, `{{variables}}`, `{{user_input}}`

**默认管线**（开箱即用）：
- 第 1 组：主剧情（流式、高温度、大 token）
- 第 2 组：变量提取 + 总结（并发非流式、低温度）

**变量提取机制**（异步 AI 自动更新）：
```
主 AI 生成剧情（<maintext> + 可选 <vars>）
    ↓
异步 AI 读取正文 + 变量描述，提取隐式变量变化
    ↓
合并显式 + 隐式更新 → 更新变量快照
```

提取策略：
| 场景 | 提取方式 | 示例 |
|------|---------|------|
| 明确数值变化 | 直接提取 | "HP减少了20" → `HP: -20` |
| 获得物品 | 列表操作 | "获得了灵石×10" → `灵石: +10` |
| 状态变化 | 枚举更新 | "突破到筑基期" → `境界: 筑基期` |
| 学会技能 | 列表添加 | "学会了御剑术" → `技能: +["御剑术"]` |
| 模糊描述 | AI 推断 | "你变得更强大了" → `灵力: +5~10` |

**管线变量选择**（选择性发送给 AI）：
```
管线步骤配置:
├── 发送变量: [HP, 灵力, 背包]  ← 只发送相关变量
├── 发送模式: 按选择 / 全部 / 不发送
└── AI 收到的上下文:
    「当前变量:
    - 生命值 (HP): 80/100。角色生命值，受攻击减少，治疗增加。
    - 灵力: 100。修炼能量，释放技能消耗。
    - 背包: [灵石×50, 基础丹药×3]。
    
    请根据剧情发展更新这些变量。」
```

好处：
- AI 知道每个变量是什么（aiDescription）
- AI 知道怎么更新（aiUpdateRules）
- 不同步骤可发送不同变量（节省 token）

**优化点**：
1. 统一为单引擎，消除 `agent/pipeline/` 目录
2. 管线配置存 IndexedDB（而非 localStorage），与世界书/预设统一
3. 简化 UI，去掉复杂的 DAG 编辑器
4. 支持导入/导出管线配置（兼容废案格式）
5. 变量提取支持自定义变量结构（根据 Variable Schema 提取对应类型）

### 保留的核心模块
```
src/
├── sillytavern/          # 核心系统（tavernlike skill 生成）
│   ├── types.ts          # 类型定义
│   ├── database.ts       # IndexedDB (Dexie)
│   ├── lorebook-engine.ts # 世界书匹配引擎
│   ├── prompt-assembler.ts # 提示词拼装
│   ├── api-router.ts     # API 调用
│   ├── flow-executor.ts  # 管线执行引擎（FlowGroup）
│   ├── stream-parser.ts  # 流式 XML 解析
│   ├── variables.ts      # 变量管理
│   ├── vars-merger.ts    # 变量合并
│   ├── importer.ts       # SillyTavern 数据导入
│   ├── editor-utils.ts   # 编辑器工具
│   └── index.ts          # 入口
├── hooks/
│   ├── useSillytavern.ts # 主 hook
│   ├── useStreamParser.ts # 流式解析
│   └── useApiRouter.ts   # API 路由
└── components/
    └── SillyTavern/      # UI 组件
```

### 数据存储
| 数据 | 存储位置 | 说明 |
|------|----------|------|
| 世界书 / 预设 / 对话 / 设置 / 管线 | IndexedDB (Dexie) | 结构化数据，统一存储 |
| 变量 | 跟随 ChatSession | 每条消息带变量快照 |

### MOD 工坊系统（重新定位）

废案的 MOD 工坊是"Agent 辅助生成 MOD"，太复杂。新项目聚焦**开局模板 + 自定义变量 + 可视化创作**。

#### 1. 开局模板（Scenario Template）
```
开局模板 = 世界书 + 初始变量 + 角色设定 + 起始道具/技能
```

示例「修仙开局」：
- 世界书：修仙世界观、门派设定
- 初始变量：`灵力:100`, `境界:练气期`, `灵兽:无`, `功法:基础吐纳`
- 角色设定：性别、性格、背景
- 起始道具：灵石×50, 基础丹药×3

#### 2. 自定义变量结构（Variable Schema）— 可扩展架构

**核心设计**：变量类型是插件，不是硬编码。支持三种扩展方式。

**内置类型**（开箱即用）：
| 类型 | 渲染器 | 编辑器 | 合并策略 |
|------|--------|--------|---------|
| `number` | 进度条 / 数字 | 滑块 / 输入框 | 数值覆盖 |
| `enum` | 阶梯 / 标签 | 下拉选择 | 覆盖 |
| `list` | 网格 / 列表 | 添加/删除/排序 | 追加/去重 |
| `boolean` | 图标 / 开关 | 勾选框 | 覆盖 |
| `text` | 文字 | 文本框 | 覆盖 |
| `bar` | 进度条 | 滑块 | 数值覆盖 |

**扩展方式**：
1. **组合扩展**（用户）：新类型 = 已有类型的组合。例如「灵兽」= name:text + species:enum + level:number + skills:list
2. **插件扩展**（开发者）：注册新类型插件，定义渲染器/编辑器/合并策略。例如「技能树」插件
3. **脚本扩展**（高级用户）：JavaScript 自定义逻辑。例如「好感度」根据对话自动增减

**双描述变量结构**（玩家看一份，AI 看一份）：
```typescript
interface VariableDefinition {
  id: string
  type: VariableType           // 变量类型

  // 给玩家看的
  displayName: string          // 显示名称 (e.g., "生命值")
  displayFormat: string        // 显示格式 (e.g., "{value}/{max}")
  description?: string         // 玩家描述

  // 给 AI 看的 ⬇️
  aiDescription: string        // AI 描述 (必须)
  aiUpdateRules?: string       // AI 更新规则
  aiValidValues?: string       // AI 有效值范围
}
```

示例「生命值」：
```typescript
{
  id: "hp",
  type: "bar",
  config: { min: 0, max: 100 },
  displayName: "生命值",
  displayFormat: "{value}/{max}",
  description: "角色的生命值，归零则死亡",
  aiDescription: "角色生命值，范围0-100。受攻击减少，治疗增加。归零死亡。",
  aiUpdateRules: "物理攻击: -10~-30, 魔法攻击: -20~-50, 治疗: +20~+50",
  aiValidValues: "0-100的整数"
}
```

**架构**：
```typescript
interface VariableTypePlugin {
  id: string                    // 类型ID
  name: string                  // 显示名
  renderer: React.Component     // 渲染组件
  editor: React.Component       // 编辑组件
  validator: (value: any) => boolean  // 验证函数
  merger: (old: any, update: any) => any  // 合并策略
}
```

#### 3. 自定义展示面板（Display Panel）
可视化编辑器，拖拽设计变量显示布局：
- RPG 状态面板（HP/MP 条 + 属性值）
- 背包网格（道具图标 + 数量）
- 技能树（连线图）
- 好感度列表（角色头像 + 进度条）

#### 4. 可视化创作
- 拖拽式变量结构设计
- 表单式开局模板编辑
- 实时预览展示效果

#### 5. 与核心系统的集成
- 开局模板 → 选择后自动设置世界书 + 变量 + 角色
- 变量结构 → 定义变量类型，影响展示面板和 AI 提示词
- 展示面板 → 游戏界面中实时显示变量状态
- 导入/导出 → 兼容 SillyTavern 格式 + 自定义格式

### API 管理
- 统一 API 端点列表（每个端点：id, name, baseUrl, apiKey, model, temperature, maxTokens）
- 标记一个为「默认 API」
- 管线步骤可选择不同端点（主剧情用贵模型，变量提取用便宜模型）

---

## Skills 使用计划

| Skill | Phase | 用途 |
|-------|-------|------|
| **tavernlike** | Phase 1 | `/sillytavern-web` 初始化项目，生成核心模块 |
| **ui-ux-pro-max** | Phase 3 | CSS 迁移、主题系统、MOD 工坊 UI、响应式布局 |
| **playwright** | Phase 4 | 编写和运行端到端测试 |
| **superpowers** | 全程 | 子代理驱动开发，加速实现 |
| **planning-with-files** | 全程 | 规划追踪，上下文恢复 |

---

## Key Questions
1. UI 框架选择？（Tailwind CSS vs CSS Modules vs 纯 CSS）→ 待 ui-ux-pro-max 建议
2. 是否需要离线支持？→ IndexedDB 已支持基本离线
3. 多平台用 Capacitor 还是 Tauri？→ Capacitor（iOS/Android）+ Tauri（Win）

## Decisions Made
| 决策 | 理由 |
|------|------|
| React + TypeScript | tavernlike skill 原生支持 |
| Dexie.js | SillyTavern 兼容的 IndexedDB 封装 |
| 精简功能 | 废案因过度复杂被推倒，聚焦核心"可游玩" |
| 先 Web 后多平台 | 先确保核心功能可用，再做平台适配 |
| 每次修改推送 Git | 用户要求，方便版本管理 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| 当前环境缺少 Node/npm | `node --version && npm --version` | 已通过 winget 安装 Node.js LTS 24.16.0；Git Bash 需临时在 PATH 前置 `/c/Program Files/nodejs` 或重启终端刷新 PATH |

## Notes
- 废案在 `D:\酒馆\酒馆前端卡项目`，可参考其架构但不要复制复杂功能
- 本文件是"磁盘工作记忆"，丢失上下文后重新读取即可恢复
- 更新 phase status：`pending` → `in_progress` → `complete`
- 每完成一个 Phase 都要推送到 Git
