# Task Plan: 独立酒馆前端

> **给 AI**：请先读完本文件，再读 `findings.md`（废案分析）、`progress.md`（改动日志）。
> 本文件是你的"磁盘工作记忆"，丢失上下文后重新读取即可恢复。

## Goal
构建一个**独立于 SillyTavern**、可正常游玩的类酒馆前端，兼容 SillyTavern 的世界书/用户/变量/预设格式，支持聊天/游戏双模式，未来适配 Android/iOS/Win 多平台。

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
- [ ] 验证聊天/游戏模式切换
- [ ] 验证流式输出和标签解析
- [ ] 验证变量系统（提取、编辑、回溯）
- [ ] 验证消息编辑/删除/分支功能
- [ ] 推送到 Git
- **Status:** `pending`
- **依赖**: Phase 1 完成

### Phase 3: UI 设计与美化 `pending`
- [ ] 使用 ui-ux-pro-max 设计主界面
- [ ] 设计聊天/游戏视图
- [ ] 设计设置面板
- [ ] 设计世界书/预设管理界面
- [ ] 移动端初步适配（响应式布局）
- [ ] 推送到 Git
- **Status:** `pending`
- **依赖**: Phase 2 完成

### Phase 4: 测试与质量保证 `pending`
- [ ] 使用 playwright 编写端到端测试
- [ ] 测试核心流程：创建对话 → 发送消息 → 流式回复 → 变量更新
- [ ] 测试世界书：导入 → 激活 → 关键词触发
- [ ] 测试预设：导入 → 切换 → 参数生效
- [ ] 修复发现的 bug
- [ ] 推送到 Git
- **Status:** `pending`
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

## 核心架构（精简版）

### 与废案的区别
| 废案 | 新项目 |
|------|--------|
| Agent 系统（22 工具） | ❌ 不需要 |
| MOD 工坊系统 | ❌ 不需要 |
| 管线系统（双引擎） | ❌ 不需要，用默认流程即可 |
| 3 套主题 | ✅ 保留，但解耦 |
| Deep Space 终端 UI | ✅ 简化版，响应式 |
| 核心 SillyTavern 集成 | ✅ 完整保留 |

### 保留的核心模块
```
src/
├── sillytavern/          # 核心系统（tavernlike skill 生成）
│   ├── types.ts          # 类型定义
│   ├── database.ts       # IndexedDB (Dexie)
│   ├── lorebook-engine.ts # 世界书匹配引擎
│   ├── prompt-assembler.ts # 提示词拼装
│   ├── api-router.ts     # API 调用
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
| 世界书 / 预设 / 对话 / 设置 | IndexedDB (Dexie) | 结构化数据 |
| 变量 | 跟随 ChatSession | 每条消息带变量快照 |

### 默认输出格式
```xml
<thinking>思考过程（可选）</thinking>
<maintext>剧情正文</maintext>
<option>选项A
选项B
选项C</option>
<sum>本回合总结</sum>
<vars>{ "HP": 80, "gold": 15 }</vars>
```

---

## Skills 使用计划

| Skill | Phase | 用途 |
|-------|-------|------|
| **tavernlike** | Phase 1 | `/sillytavern-web` 初始化项目，生成核心模块 |
| **ui-ux-pro-max** | Phase 3 | 设计和实现 UI，响应式布局，多平台适配 |
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
| （暂无） | | |

## Notes
- 废案在 `D:\酒馆\酒馆前端卡项目`，可参考其架构但不要复制复杂功能
- 本文件是"磁盘工作记忆"，丢失上下文后重新读取即可恢复
- 更新 phase status：`pending` → `in_progress` → `complete`
- 每完成一个 Phase 都要推送到 Git
