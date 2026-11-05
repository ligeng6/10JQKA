# 10JQKA

原创扑克对战游戏 — 一副牌就能玩的掼蛋玩法，微信小程序。

## 技术栈
- Taro 4 + React 18 + TypeScript
- Zustand 5 + Vitest 3
- pnpm workspace monorepo

## 快速开始
```bash
pnpm install
pnpm test           # 运行核心规则测试
pnpm --filter @pokergame/miniapp dev:weapp   # 开发小程序
```

## 项目结构
```
packages/shared/   # 共享类型与常量
packages/core/     # 纯 TS 规则引擎
apps/miniapp/      # Taro 微信小程序
docs/              # 规则与架构文档
```
