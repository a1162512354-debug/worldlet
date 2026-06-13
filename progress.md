# Progress Log — 独立酒馆前端

---

## ⚠️ 给 AI：读完本文件后，读 `task_plan.md` 了解当前进度和下一步任务。

---

## Session 1 - 2026-06-13

### 完成
- 审查废案（D:\酒馆\酒馆前端卡项目）：了解架构、功能、失败原因
- 读取 tavernlike skill：了解核心集成功能和生成模板
- 读取其他 skills：playwright（测试）、ui-ux-pro-max（UI）、superpowers（子代理）
- 创建规划文件：task_plan.md, findings.md, progress.md
- 初始化 Git 仓库并推送到 https://github.com/a1162512354-debug/worldlet.git

### 关键决策（已更新到 task_plan.md）
1. **仅保留游戏模式**（去掉聊天模式）
2. **保留管线系统**（合并为单引擎 FlowGroup）
3. **MOD 工坊重新定位**：开局模板 + 自定义变量 + 可视化面板
4. **可扩展变量架构**：插件化设计，支持组合/插件/脚本扩展
5. **双描述变量系统**：玩家描述 + AI 描述 + 更新规则
6. **变量自动提取**：显式 `<vars>` + 隐式 AI 提取
7. **变量快照回档**：每条消息带变量快照，支持回档/分支

### Git 提交记录
- `2d6d777` - init: 项目规划文件
- `f9e3b98` - update: 保留管线系统，明确聊天/游戏模式区别
- `1795914` - update: 仅保留游戏模式，明确变量快照回档系统
- `bbacdfa` - update: MOD工坊重新定位，新增Phase 3
- `7f6855e` - update: 可扩展变量架构
- `e11e2bf` - update: 变量自动提取机制
- `60003fc` - update: 双描述变量系统

### 下一步
- **Phase 0 基本完成**，待用户确认后进入 Phase 1
- Phase 1：使用 tavernlike skill 初始化项目，生成核心模块

### API 截断后恢复 - 2026-06-13

#### 已确认
- 当前可用 skills：deep-research、update-config、keybindings-help、verify、code-review、simplify、fewer-permission-prompts、loop、claude-api、run、init、review、security-review。
- 旧规划中提到的 tavernlike / ui-ux-pro-max / playwright / superpowers / planning-with-files 不在当前会话可用 skills 列表中，因此本轮直接基于已生成文件继续。
- React + TypeScript + Vite 基础项目、SillyTavern 核心模块、Hooks、游戏视图与管理 Modal 已在磁盘中存在。

#### 本轮修复
- 将 `useSillytavern` 改为 Provider + Context，避免 App、GameView、Modal 各自创建独立状态导致新开局/弹窗/变量不同步。
- `main.tsx` 增加 `SillytavernProvider` 包裹。
- 项目仅保留游戏模式：`AppSettings.uiMode` 收窄为 `'game'`，设置界面移除“聊天模式”切换，改为说明。
- 为 `tsconfig.node.json` 增加 `composite: true`，降低 `tsc -b` 项目引用失败风险。
- `sendGameMessage` 增加无预设保护，避免默认预设被删除时崩溃。
- 提示词组装改为传入发送前历史，避免当前用户输入被重复发送。
- API 流式请求传递 `AbortSignal`，让中止按钮能取消底层 fetch。
- `rollbackTo` 与 `jumpToFloor` 统一按历史消息恢复变量快照。
- `.gitignore` 增加 `.claude/worktrees/`，避免子代理临时 worktree 被误提交。

#### 受阻处理
- 已通过 `winget install OpenJS.NodeJS.LTS` 安装 Node.js LTS 24.16.0 / npm 11.13.0。
- 当前 Git Bash 进程未自动刷新 PATH，验证命令统一使用临时 PATH：`PATH="/c/Program Files/nodejs:$PATH" npm ...`。

#### Phase 1 验证结果
- `npm install` 通过，生成 `package-lock.json`。
- 首次 `npm run typecheck` 发现 `tsconfig` 项目引用与 CSS 类型声明问题；已修复：移除根 `tsconfig.json` 对 `tsconfig.node.json` 的 references，新增 `src/vite-env.d.ts`。
- `npm run typecheck` ✅ 通过。
- `npm run build` ✅ 通过（Vite 构建成功，仅有动态导入 chunk 提示，不阻塞）。
- `npm test` ✅ 通过：7 个测试文件 / 41 个测试。
- `npm run dev -- --host 127.0.0.1` ✅ 启动成功，地址 `http://127.0.0.1:5173/`。

### UI 迁移 - 2026-06-13

#### 完成
- 参考废案 `D:\酒馆\酒馆前端卡项目` 的 Deep Space 终端 UI，迁移主题变量、星空/扫描线背景、终端状态栏、卡片式导航、六边形核心面板、会话卡片和深色面板样式。
- 新增 `src/components/Shell/SpacePortal.tsx`，用精简版终端外壳替换原 `App` 顶层布局；仅保留当前产品需要的会话、对话终端、资料库、设置入口，未迁移废案 Agent/MOD 复杂逻辑。
- 改造 `GameView` 为消息时间线布局：用户/AI 气泡、头像、时间、选项 chips、底部终端输入框、自动滚动。
- `ThinkingFold`、`MainTextPane`、`OptionList`、`Toast` 改为 Deep Space class 驱动样式。
- 当前 Modal/Drawer 外层深色化：Settings、Lorebook、Preset、Variables、LorebookEditor、HistoryDrawer。
- 修复明确运行问题：
  - `regenerateLast` 使用旧闭包导致重 roll 追加到旧历史后的问题。
  - 批量导入世界书后未同步 Provider state，导致 prompt 不立即使用新世界书的问题。
  - opaque `<thinking>` 流式显示闭合标签污染的问题。
- `vite.config.ts` 排除 `.claude/**`，避免 Vitest 扫描子代理 worktree 中的重复测试。

#### 验证
- `npm run typecheck` ✅
- `npm run build` ✅（仍有 `INEFFECTIVE_DYNAMIC_IMPORT` 提示，不阻塞构建）
- `npm test` ✅：7 个测试文件 / 41 个测试
- `npm run dev -- --host 127.0.0.1` ✅：5173 被占用时自动启动在 `http://127.0.0.1:5174/`

### Phase 2 核心验证补强 - 2026-06-13

#### 完成
- 创建隔离 worktree：`D:\酒馆\独立前端\.claude\worktrees\phase2-core-validation`，分支 `worktree-phase2-core-validation`。
- 基线验证通过：`npm install`、`npm run typecheck`、`npm run build`、`npm test`。
- 变量快照 helper 补强：`truncateChatAt` / `branchChat` 优先使用 `variablesAfter` 快照，确保回档/分支恢复 AI 回复后的完整变量状态。
- 预设管理补强：新增批量导入预设、预设重命名、预设导出 JSON；`PresetModal` 增加“导入 JSON / 重命名 / 导出”入口。
- 消息分支入口补强：`useSillytavern` 新增 `branchFromMessage`，`HistoryDrawer` 增加“分支”按钮，创建分支后自动切换到新会话。
- 隐式变量提取补强：dual API 且 secondary enabled 时，剧情回复完成后调用 `vars` 任务，要求 AI 只输出 JSON 对象，并在显式 `<vars>` 后合并隐式更新；失败时保留显式变量并提示。
- 新增/扩展测试：`importer.test.ts` 覆盖批量预设导入/重命名；`variables.test.ts` 覆盖快照恢复、分支变量、显式+隐式变量合并、隐式提取提示词。

#### 验证
- `npm run typecheck` ✅
- `npm run build` ✅（仍有 `INEFFECTIVE_DYNAMIC_IMPORT` 提示，不阻塞构建）
- `npm test` ✅：7 个测试文件 / 47 个测试

### Phase 2 合并与 UI 精简 - 2026-06-13

#### 完成
- `phase2-core-validation` 工作树改动合并到 main 分支（16 个文件，+577/-733 行）
- **工具栏精简**：
  - GameView 内部重复工具栏删除（历史/设置/世界书/预设/变量/重roll/Badge 组件）
  - 「历史」按钮移至 SpacePortal 顶部栏（返回会话 | 历史 | 变量 | 世界书 | 预设 | 设置）
  - HistoryDrawer 控制权从 GameView 转移到 SpacePortal
  - ↻ 重 roll 和停止按钮移至输入框区域（发送按钮左侧）
- **模态框重构**：LorebookModal 大幅重构，PresetModal 新增
- **Hook 增强**：useSillytavern / useApiRouter 改进
- **变量/导入扩展**：importer.ts、variables.ts 功能增强，测试覆盖增加
- **样式**：新增 `.space-input-action-button` 按钮样式

#### Git 提交
- `60b88e0` - ui: phase2 核心验证 - 工具栏精简、模态框重构、变量系统增强
- 已推送到 origin/main

#### 验证
- `npm run typecheck` ✅
- `npm run build` ✅
- 开发服务器 `http://localhost:5173/` 正常运行

### Phase 2 代码级修复 - 2026-06-13

#### 完成
- **VariablesModal 提示修正**：第 85 行旧格式 `<var name="hp" value="100" />` 改为正确的 `<vars>{"hp": 100}</vars>`
- **删除死代码**：`variables.ts` 中 `extractVariables()` 函数（解析旧 `<var>` 格式）从未被调用，已删除
- **HistoryDrawer 重构**：
  - `prompt('编辑内容')` 替换为 textarea 模态编辑器（支持多行内容）
  - "删后续" 按钮增加 `confirm()` 确认对话框（显示楼层号，提示不可撤销）
- **OptionList 空选项过滤**：`options.filter(opt => opt.trim().length > 0)` 过滤 AI 输出中的空行
- **lorebook-engine 单元测试**：新增 22 个测试，覆盖：
  - 基本关键词匹配（单/多关键词、大小写、全词匹配）
  - 常量条目（constant entries 始终匹配）
  - 选择逻辑（and_any、not_all、not_any、and_all + secondary keys）
  - 排序（order 升序）
  - 递归扫描（递归发现、深度限制）
  - 分组和格式化

#### 验证
- `npm run build` ✅
- `npm test` ✅：8 个测试文件 / 69 个测试（+22 新增）
- 开发服务器 `http://localhost:5173/` 正常运行

#### Git 提交
- `7c46087` - fix: Phase 2 代码级修复 - HistoryDrawer 确认框+textarea 编辑、OptionList 空过滤、VariablesModal 提示修正、lorebook-engine 测试、删除死代码

#### 待人工体验验证（需真实 API）
- 世界书导入/管理体验
- 游戏模式流式输出 + XML 解析
- 变量快照回档
- 消息编辑/删除/分支
- 选项点选

### Phase 2 完成 + 深色主题全局修复 - 2026-06-13

#### API 验证
- 用户手动测试 API 功能：流式输出、变量更新、选项点选均正常
- Phase 2 核心功能验证全部完成

#### 深色主题全局修复
- **问题**：6 个模态框组件内联了大量亮色硬编码颜色（`#f0f0f0`、`#e6f0ff`、`#eee`、`#555` 等），与 Deep Space 暗色主题冲突，导致白色背景、文字不可见
- **CSS 层修复**（styles.css）：
  - 新增 `.legacy-modal-shell` 按钮全覆盖规则（`!important`）
  - 新增 `.ds-save` / `.ds-danger` / `.ds-purple` / `.ds-green` 语义按钮类（排除默认覆盖）
  - 新增 `.ds-selected` 选中项高亮类
  - 新增 `.modal-chip` 芯片类、`.modal-warn` 警告框类
  - 覆盖 `aside` / `footer` / `details` / `fieldset` / `legend` / `summary` / `hr` 边框和文字颜色
- **组件层修复**（7 个文件）：
  - LorebookEditorModal：新建按钮、选中条目、保存按钮、边框
  - EntryForm：芯片背景、标签文字、字段集、高级设置折叠区
  - PresetModal：标签页按钮、选中预设、保存按钮、自定义 prompt 边框
  - SettingsModal：标签页、警告框、标签芯片、字段集、备份按钮
  - VariablesModal：提示文字、代码高亮、禁用按钮、边框
  - PromptOrderEditor：列表分隔线
  - HistoryDrawer：（已纯 CSS，无需修改）

#### 内联样式现状分析
- 14 个组件中 7 个纯 CSS（GameView、LorebookModal、OptionList、Toast、ThinkingFold、MainTextPane、SpacePortal）
- 7 个组件仍有 175 处内联样式（SettingsModal 57、EntryForm 38、PresetModal 36、VariablesModal 16、LorebookEditorModal 13、PromptOrderEditor 7、HistoryDrawer 5）
- **决策**：Phase 2 完成后，下一步做 CSS 迁移，联动 Phase 3 MOD 工坊一起

#### 验证
- `npm run build` ✅
- `npm test` ✅：8 个测试文件 / 69 个测试

#### Git 提交
- `0b6f23f` - ui: 全局深色主题修复 - 消除模态框中所有白色/亮色背景、低对比度文字、亮色边框

### Phase 3 启动：CSS 迁移 + 主题系统 + MOD 工坊 - 2026-06-13

#### 计划
- 合并原 Phase 3（MOD 工坊）和 Phase 4（UI 美化）为新 Phase 3
- 优先做 3.1 CSS 迁移（7 个组件 → CSS class + 变量）
- 建立主题切换系统（`data-theme` + 主题配置）
- 新增第二套主题验证切换
- 然后做 3.2 MOD 工坊（变量编辑器、开局模板、展示面板）

#### 3.1.1 CSS 提取完成 - 2026-06-13
- **通用工具类**：在 `styles.css` 新增 `.st-*` 系列 60+ 工具类（布局、间距、文字、边框、按钮、表单、侧边栏等）
- **PromptOrderEditor**：7/7 内联样式 → CSS class（`st-list-reset`、`st-flex-row`、`st-text-muted`、`st-btn-xxs` 等）
- **HistoryDrawer**：5/5 内联样式 → CSS class（`st-flex-col`、`st-textarea`、`st-btn-xs`、`st-btn-save` 等）
- **LorebookEditorModal**：13/13 内联样式 → CSS class（`st-sidebar-panel-wide`、`st-two-panel-main`、`st-empty-state-lg` 等）
- **VariablesModal**：16/16 内联样式 → CSS class（条件样式 `st-btn-save` + `canSave` 切换）
- **PresetModal**：36/36 内联样式 → CSS class（`st-tab`/`st-tab-active` 标签页系统、`st-sidebar-panel` 等）
- **EntryForm**：38/38 内联样式 → CSS class（`st-border`、`st-fieldset`、`st-flex-wrap` 等）
- **SettingsModal**：57/57 内联样式 → CSS class（`st-tab` 标签页、`st-fieldset`、`st-hidden` 等）
- **硬编码颜色映射**：`#888` → `var(--color-text-muted)`、`#666` → `var(--color-text-secondary)`、`fontFamily: 'monospace'` → `var(--font-mono)`
- 保留备份 tab 的语义颜色（`#2c8`绿、`#8a8acc`紫、`#c44`红）用于区分操作类型

#### 验证
- `npm run typecheck` ✅
- `npm run build` ✅
- `npm test` ✅：8 文件 / 69 测试

#### 3.1.2 主题切换系统完成 - 2026-06-13
- **类型定义**：`types.ts` 中 `theme: 'dark' | 'light'` → `theme: 'deep-space' | 'parchment'`
- **CSS 分离**：`:root` 仅保留非颜色默认值（font/radius/clip），主题变量移入 `[data-theme="..."]` 选择器
- **新增羊皮纸主题**：`[data-theme="parchment"]` — 暖色系（米色背景 `#f5f0e6`、深棕文字 `#2c1810`、金色强调 `#b8860b`）
- **主题应用**：SpacePortal.tsx 从 `settings.theme` 读取并设置 `data-theme` 属性，监听变化实时切换
- **设置界面**：SettingsModal「显示」tab 新增主题选择器（Deep Space / 古典羊皮纸）
- **CSS 变量化**：`ds-save`/`ds-green` 按钮从硬编码 `#2c8` 改为 `var(--color-success)`

#### 3.1.4 移动端响应式适配完成 - 2026-06-13
- 宽模态框（`.legacy-modal-shell.wide`）在 640px 以下全屏显示
- 双面板布局（`.st-two-panel`）在移动端纵向堆叠
- 侧边栏面板在移动端收起为 200px 高度，取消右边框改为底边框
- 模态框头部在移动端自动换行
- 模态框 overlay padding 缩小到 8px

#### 验证
- `npm run typecheck` ✅
- `npm run build` ✅
- `npm test` ✅：8 文件 / 69 测试

#### 待做清单
- ~~3.1.1 CSS 提取：7 个内联组件 → CSS class~~ ✅
- ~~3.1.2 主题系统：`data-theme` 切换 + 主题配置文件~~ ✅
- ~~3.1.3 新增第二套主题~~ ✅
- ~~3.1.4 移动端响应式适配~~ ✅
- 3.2.1 变量结构编辑器
- 3.2.2 开局模板系统
- 3.2.3 自定义展示面板
- 3.2.4 导入/导出
