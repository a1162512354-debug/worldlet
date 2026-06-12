# Worldlet 独立酒馆前端

独立于 SillyTavern 的类酒馆游戏前端，目标是兼容 SillyTavern 世界书、预设、变量与游戏式 XML 输出流程。

## 当前阶段

项目处于 Phase 1 初始化完成阶段：React + TypeScript + Vite 基础结构已创建，SillyTavern 核心模块已接入。

## 开发命令

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## 验证状态

- `npm run typecheck` ✅
- `npm run build` ✅
- `npm test` ✅（7 个测试文件 / 41 个测试）
- `npm run dev -- --host 127.0.0.1` ✅（Vite 5173 启动成功）

## 规划文件

- `task_plan.md` — 主规划与阶段进度
- `findings.md` — 技术发现和废案分析
- `progress.md` — 会话进度日志
