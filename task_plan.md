# Task Plan: 独立酒馆前端

> **给 AI**：请先读完本文件，再读 `findings.md`（废案分析）、`progress.md`（改动日志）。
> 本文件是你的"磁盘工作记忆"，丢失上下文后重新读取即可恢复。

## Goal
构建一个**独立于 SillyTavern**、可正常游玩的类酒馆前端，兼容 SillyTavern 的世界书/用户/变量/预设格式，**仅保留游戏模式**（RPG 终端风格），未来适配 Android/iOS/Win 多平台。

## Git 仓库
- 地址：`https://github.com/a1162512354-debug/worldlet.git`
- **每次修改都需要推送**

## Current Phase
Phase 0 — 规划阶段

## 项目目录
`D:\酒馆\独立前端`

---

## Phases

### Phase 0: 规划与准备 `in_progress`
- [x] 审查废案（D:\酒馆\酒馆前端卡项目）
- [x] 读取 tavernlike skill 了解核心功能
- [x] 创建 task_plan.md, findings.md, progress.md
- [ ] 初始化 Git 仓库并关联远程
- [ ] 确认技术栈和 UI 方案
- **Status:** `in_progress`

### Phase 1: 项目初始化 `pending`
- [ ] 使用 tavernlike skill 初始化项目（自动检测 React + 安装依赖 + 生成核心模块）
- [ ] 验证生成的代码无 TypeScript 错误
- [ ] 验证 dev server 可启动
- [ ] 初始化 Git 并推送首次提交
- **Status:** `pending`
- **依赖**: Phase 0 完成

### Phase 2: 核心功能验证 `pending`
- [ ] 验证世界书导入/管理功能
- [ ] 验证预设导入/管理功能
- [ ] 验证游戏模式：流式输出 + XML 标签解析
- [ ] 验证变量系统：提取、编辑、**快照回档**
- [ ] 验证消息编辑/删除/分支功能
- [ ] 验证选项点选功能
- [ ] 推送到 Git
- **Status:** `pending`
- **依赖**: Phase 1 完成

### Phase 3: MOD 工坊系统 `pending`
- [ ] 变量结构编辑器（Variable Schema Editor）
  - 定义变量类型：数值、等级、列表、开关、文本
  - 定义展示方式：进度条、阶梯、网格、图标、文字
  - 可视化拖拽设计
- [ ] 开局模板系统（Scenario Template）
  - 创建模板：世界书 + 初始变量 + 角色设定 + 起始道具/技能
  - 模板选择界面
  - 一键应用开局
- [ ] 自定义展示面板（Display Panel）
  - 可视化布局编辑器
  - 预设面板模板（RPG 状态、背包、技能树等）
  - 实时预览
- [ ] 导入/导出
  - 模板分享格式
  - 兼容 SillyTavern 格式
- [ ] 推送到 Git
- **Status:** `pending`
- **依赖**: Phase 2 完成

### Phase 4: UI 设计与美化 `pending`
- [ ] 使用 ui-ux-pro-max 设计主界面
- [ ] 设计游戏视图（正文 + 选项 + 变量面板）
- [ ] 设计设置面板
- [ ] 设计世界书/预设管理界面
- [ ] 设计 MOD 工坊界面
- [ ] 移动端初步适配（响应式布局）
- [ ] 推送到 Git
- **Status:** `pending`
- **依赖**: Phase 3 完成

### Phase 5: 测试与质量保证 `pending`
- [ ] 使用 playwright 编写端到端测试
- [ ] 测试核心流程：创建对话 → 发送消息 → 流式回复 → 变量更新
- [ ] 测试世界书：导入 → 激活 → 关键词触发
- [ ] 测试预设：导入 → 切换 → 参数生效
- [ ] 测试 MOD 工坊：创建模板 → 应用开局 → 变量显示
- [ ] 修复发现的 bug
- [ ] 推送到 Git
- **Status:** `pending`
- **依赖**: Phase 4 完成

### Phase 6: 多平台适配 `pending`（后续规划）
- [ ] Capacitor 集成（Android/iOS）
- [ ] Tauri 集成（Windows）
- [ ] 移动端 UI 优化（触摸交互、手势、键盘适配）
- [ ] 本地文件系统访问（导入/导出）
- [ ] 推送到 Git
- **Status:** `pending`
- **依赖**: Phase 5 完成

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

**优化点**：
1. 统一为单引擎，消除 `agent/pipeline/` 目录
2. 管线配置存 IndexedDB（而非 localStorage），与世界书/预设统一
3. 简化 UI，去掉复杂的 DAG 编辑器
4. 支持导入/导出管线配置（兼容废案格式）

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
| **ui-ux-pro-max** | Phase 3, 4 | 设计 MOD 工坊 UI、游戏视图、响应式布局 |
| **playwright** | Phase 5 | 编写和运行端到端测试 |
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
| （暂无） | | |

## Notes
- 废案在 `D:\酒馆\酒馆前端卡项目`，可参考其架构但不要复制复杂功能
- 本文件是"磁盘工作记忆"，丢失上下文后重新读取即可恢复
- 更新 phase status：`pending` → `in_progress` → `complete`
- 每完成一个 Phase 都要推送到 Git
