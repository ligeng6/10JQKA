# 架构说明

## 技术栈
- **Taro 4** + React 18 + TypeScript 5.7
- **Zustand 5** 状态管理
- **Vitest 3** 单元测试
- **pnpm workspace** monorepo

## 目录结构

```
pokergame/
├── apps/
│   └── miniapp/          # Taro 微信小程序
│       ├── src/
│       │   ├── pages/     # index(首页) / game(对局)
│       │   ├── components/ # card(牌面组件)
│       │   └── app.ts
│       └── config/
├── packages/
│   ├── shared/            # 共享类型与常量
│   │   └── src/
│   │       ├── types.ts   # Card / Pattern / GameState 等
│   │       └── constants.ts
│   └── core/              # 纯 TS 规则引擎（零依赖）
│       ├── src/
│       │   ├── cards.ts   # 点数序/比较/牌组工具
│       │   ├── patterns.ts # 牌型识别+比较
│       │   ├── engine.ts  # 回合状态机
│       │   ├── scoring.ts # 计分
│       │   └── victory.ts # 胜负判定
│       └── __tests__/     # 56 项单测
├── docs/
└── package.json
```

## 设计原则
1. **core 纯零依赖**：可被小程序/浏览器/Node 服务端/小游戏复用
2. **shared 类型中心**：所有类型定义集中管理
3. **UI 与逻辑分离**：miniapp 只做展示和交互
4. **可测试**：核心规则全部有单测覆盖

## 顺子实现
- 普通顺：3–A 范围内连续点数（不含 2）
- 循环顺：A,2,3[,4,5] — A 开头，含 2，同长度最大
- `analyzeStraight()` 判断合法性
- `straightCompareValue()` 用于同长度比较

## 牌型识别
`patterns.ts` 中 `identifyPatterns()` 对输入牌组尝试所有检测器：
1. 单张（王不可）
2. 对子（王变配）
3. 三张（王变配）
4. 顺子（王填 gap）
5. 四张炸弹（王变配）
6. 同花顺（王变花色+点数）

`bestPattern()` 自动选出最优牌型。
`canBeat()` 实现炸弹层级比较。
