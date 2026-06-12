# Findings — 独立酒馆前端

## 废案分析（D:\酒馆\酒馆前端卡项目）

### 废案做了什么
- React 19 + TypeScript + Vite 8 + Zustand 5 + Dexie.js 4
- 完整的 SillyTavern 核心集成（types, database, lorebook-engine, prompt-assembler, api-router, stream-parser, variables, importer）
- Agent 系统（22 个工具，Agent 引擎，多会话，三阶段工作流）
- MOD 工坊系统（4 种 MOD 类型 + 整合包，Agent 辅助生成）
- Deep Space Terminal 主题（3 套主题，CSS 变量化）
- 管线系统（Flow Groups，组间顺序、组内并发）
- 变量系统（分类、元数据、自动提取）

### 废案为什么被推倒
1. **过度复杂**：Agent 系统 + MOD 工坊 + 管线系统 + 三套主题，代码量巨大，维护困难
2. **主题耦合太深**：所有 UI 组件都和 Deep Space 主题硬绑定，难以分离
3. **功能膨胀**：从"类酒馆前端"变成了"带 Agent 的 MOD 制作平台"
4. **管线系统混乱**：同时存在 flow-executor 和 PipelineEngine 两套并行系统
5. **没有多平台适配**：纯 Web，没有考虑移动端和桌面端

### 新项目保留的功能
- ✅ 核心 SillyTavern 集成（完整）
- ✅ 管线系统（合并为单引擎 FlowGroup，移除 DAG PipelineEngine）
- ✅ **仅游戏模式**（RPG 终端风格，去掉聊天模式）
- ✅ 变量快照回档系统（每条消息带变量快照，支持回档/分支）
- ✅ 3 套主题（解耦）
- ✅ **MOD 工坊（重新定位）**：开局模板 + 自定义变量结构 + 可视化展示面板
- ❌ Agent 系统（不保留）

### 废案中值得复用的部分
- `sillytavern/` 核心模块（types, database, lorebook-engine, prompt-assembler, api-router, stream-parser, variables, importer, vars-merger, editor-utils）
- 基本的 UI 组件结构（SettingsModal, LorebookModal, PresetModal, Chat, VariablePanel）
- 数据存储架构（IndexedDB + Dexie）

## 用户核心需求
1. **独立运行**：不依赖 SillyTavern 服务端，纯前端独立部署
2. **SillyTavern 兼容**：世界书、用户、变量、预设等数据格式兼容
3. **可正常游玩**：游戏模式（RPG 终端风格），流式输出，变量系统
4. **变量快照回档**：每条消息带变量快照，支持回档/分支
5. **MOD 工坊**：开局模板 + 自定义变量结构 + 可视化展示面板
6. **可扩展变量系统**：变量类型是插件，支持组合/插件/脚本三种扩展方式
7. **多平台适配**：Android、iOS、Win（可后续做）
8. **Git 仓库管理**：每次修改都推送到 https://github.com/a1162512354-debug/worldlet.git

## 可用 Skills
| Skill | 用途 | 使用时机 |
|-------|------|---------|
| **tavernlike** | 生成 SillyTavern 核心集成代码 | Phase 1 项目初始化 |
| **ui-ux-pro-max** | UI/UX 设计与实现 | Phase 3 UI 开发 |
| **playwright** | 端到端测试 | Phase 4 测试验证 |
| **superpowers** | 子代理驱动开发 | 全程使用，加速开发 |
| **planning-with-files** | 项目规划与进度追踪 | 全程使用，本文件 |

## 技术栈决策
- **框架**: React 19 + TypeScript + Vite（tavernlike skill 原生支持）
- **状态管理**: Zustand（轻量、TypeScript 友好）
- **存储**: Dexie.js（IndexedDB 封装，SillyTavern 兼容）
- **样式**: Tailwind CSS 或 CSS Modules（待定，需 ui-ux-pro-max 建议）
- **多平台**: 
  - Phase 1-3: 纯 Web（浏览器运行）
  - Phase 5: Capacitor（iOS/Android）+ Tauri（Windows）

## 用户偏好
- 所有 UI 文本中文
- 回复用中文
- 每次修改需推送到 Git 仓库
- 需要完整规划，以便丢失上下文后能继续工作
