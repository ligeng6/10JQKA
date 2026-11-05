import type { Card, NormalCard, Pattern, PatternType, Suit } from '@pokergame/shared';
import { isJoker, getRank, sortByRank, analyzeStraight, straightCompareValue } from './cards';

/**
 * 牌型识别与比较
 *
 * 牌型：单张 / 对子 / 三张 / 顺子 / 四张炸弹 / 同花顺（炸弹）
 * 大小王：万能牌，不能单独出，只能参与组合
 * 炸弹层级：四张炸弹 > 同花顺；同花顺之间长者大，同长度比最大牌
 */

// ─── 内部工具 ───────────────────────────────────────────────

/** 提取点数数组（王 = -1） */
function ranks(cards: Card[]): number[] {
  return cards.map(getRank);
}

/** 统计非王牌的点数 → 张数 */
function rankCounts(cards: Card[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const c of cards) {
    if (c.kind === 'normal') {
      m.set(c.rank, (m.get(c.rank) ?? 0) + 1);
    }
  }
  return m;
}

/** 非王牌数 */
function jokerCount(cards: Card[]): number {
  return cards.filter((c) => c.kind === 'joker').length;
}

/** 非王牌 */
function normals(cards: Card[]): NormalCard[] {
  return cards.filter((c): c is NormalCard => c.kind === 'normal');
}

// ─── 单张 ─────────────────────────────────────────────────

function detectSingle(cards: Card[]): Pattern | null {
  if (cards.length !== 1) return null;
  if (isJoker(cards[0]!)) return null; // 王不能单独出
  const c = cards[0]!;
  return {
    type: 'single',
    compareKey: getRank(c),
    length: 1,
    isCircular: false,
    isBomb: false,
    cards: [...cards],
    resolvedRanks: [getRank(c)],
    resolvedSuits: [c.kind === 'normal' ? c.suit : null],
  };
}

// ─── 对子 ─────────────────────────────────────────────────

function detectPair(cards: Card[]): Pattern | null {
  if (cards.length !== 2) return null;
  const jokers = jokerCount(cards);
  const ns = normals(cards);

  if (jokers === 2) {
    // 两个王 → 变成任意对子，选最大点数 2(15)
    return {
      type: 'pair',
      compareKey: 15,
      length: 2,
      isCircular: false,
      isBomb: false,
      cards: [...cards],
      resolvedRanks: [15, 15],
      resolvedSuits: [null, null],
    };
  }

  if (jokers === 1 && ns.length === 1) {
    const r = ns[0]!.rank;
    return {
      type: 'pair',
      compareKey: r,
      length: 2,
      isCircular: false,
      isBomb: false,
      cards: [...cards],
      resolvedRanks: [r, r],
      resolvedSuits: [ns[0]!.suit, null],
    };
  }

  if (jokers === 0 && ns.length === 2 && ns[0]!.rank === ns[1]!.rank) {
    const r = ns[0]!.rank;
    return {
      type: 'pair',
      compareKey: r,
      length: 2,
      isCircular: false,
      isBomb: false,
      cards: [...cards],
      resolvedRanks: [r, r],
      resolvedSuits: [ns[0]!.suit, ns[1]!.suit],
    };
  }

  return null;
}

// ─── 三张 ─────────────────────────────────────────────────

function detectTriple(cards: Card[]): Pattern | null {
  if (cards.length !== 3) return null;
  const jokers = jokerCount(cards);
  const ns = normals(cards);

  // 非王牌点数必须一致（可能 0/1/2 张非王）
  const distinctRanks = new Set(ns.map((c) => c.rank));
  if (distinctRanks.size > 1) return null;

  const r = ns.length > 0 ? ns[0]!.rank : 15; // 全王 → 变 2

  return {
    type: 'triple',
    compareKey: r,
    length: 3,
    isCircular: false,
    isBomb: false,
    cards: [...cards],
    resolvedRanks: [r, r, r],
    resolvedSuits: ns.map((c) => c.suit),
  };
}

// ─── 四张炸弹 ─────────────────────────────────────────────

function detectBomb4(cards: Card[]): Pattern | null {
  if (cards.length !== 4) return null;
  const jokers = jokerCount(cards);
  const ns = normals(cards);

  const distinctRanks = new Set(ns.map((c) => c.rank));
  if (distinctRanks.size > 1) return null;

  const r = ns.length > 0 ? ns[0]!.rank : 15;

  return {
    type: 'bomb4',
    compareKey: r,
    length: 4,
    isCircular: false,
    isBomb: true,
    cards: [...cards],
    resolvedRanks: [r, r, r, r],
    resolvedSuits: ns.map((c) => c.suit),
  };
}

// ─── 顺子（非同花） ────────────────────────────────────────

function detectStraight(cards: Card[]): Pattern | null {
  if (cards.length < 3 || cards.length > 5) return null;
  const jokers = jokerCount(cards);
  const ns = normals(cards);

  // 非王牌不能有重复点数
  const nsRanks = ns.map((c) => c.rank);
  const uniqueNsRanks = new Set<number>(nsRanks);
  if (uniqueNsRanks.size !== nsRanks.length) return null;

  // 尝试将 jokers 填入 gap 构成顺子
  const knownRanks = [...uniqueNsRanks].sort((a, b) => a - b);
  const totalLen = cards.length;

  // 搜索所有可能的起始点，看能否用 jokers 填满
  for (let start = 3; start <= 15 - totalLen + 1; start++) {
    // 普通顺候选
    const candidate: number[] = [];
    for (let r = start; r < start + totalLen; r++) candidate.push(r);

    // 检查非王牌是否都在候选中
    const allInCandidate = knownRanks.every((r) => candidate.includes(r));
    if (!allInCandidate) continue;

    // 检查非王牌是否连续（允许 jokers 填 gap）
    // 用 set 匹配
    const candidateSet = new Set(candidate);
    const missing = [...candidateSet].filter((r) => !uniqueNsRanks.has(r));
    if (missing.length !== jokers) continue; // gap 数量必须等于 joker 数

    const result = analyzeStraight(candidate);
    if (result && result.valid) {
      const resolved = cards.map((c) =>
        c.kind === 'normal' ? c.rank : -1, // 实际解析在下方
      );
      // 为 joker 分配缺失点数
      const missQueue = [...missing];
      const resolvedRanks: number[] = [];
      for (const c of cards) {
        if (c.kind === 'normal') {
          resolvedRanks.push(c.rank);
        } else {
          resolvedRanks.push(missQueue.shift() ?? candidate[0]!);
        }
      }

      return {
        type: 'straight',
        compareKey: straightCompareValue(result.isCircular, result.high),
        length: totalLen,
        isCircular: result.isCircular,
        isBomb: false,
        cards: [...cards],
        resolvedRanks,
        resolvedSuits: cards.map((c) => (c.kind === 'normal' ? c.suit : null)),
      };
    }
  }

  // 尝试循环顺（A,2,3[,4,5]）
  if (totalLen >= 3 && totalLen <= 5) {
    const circularCandidate: number[] = [14, 15]; // A,2
    for (let r = 3; r < 3 + totalLen - 2; r++) circularCandidate.push(r);
    circularCandidate.sort((a, b) => a - b);

    const circSet = new Set(circularCandidate);
    const allIn = knownRanks.every((r) => circSet.has(r));
    if (allIn) {
      const missing = [...circSet].filter((r) => !uniqueNsRanks.has(r));
      if (missing.length === jokers) {
        const missQueue = [...missing];
        const resolvedRanks: number[] = [];
        for (const c of cards) {
          if (c.kind === 'normal') {
            resolvedRanks.push(c.rank);
          } else {
            resolvedRanks.push(missQueue.shift() ?? 14);
          }
        }

        return {
          type: 'straight',
          compareKey: straightCompareValue(true, 14),
          length: totalLen,
          isCircular: true,
          isBomb: false,
          cards: [...cards],
          resolvedRanks,
          resolvedSuits: cards.map((c) => (c.kind === 'normal' ? c.suit : null)),
        };
      }
    }
  }

  return null;
}

// ─── 同花顺（炸弹） ────────────────────────────────────────

function detectFlushStraight(cards: Card[]): Pattern | null {
  if (cards.length < 3 || cards.length > 5) return null;
  const jokers = jokerCount(cards);
  const ns = normals(cards);

  // 非王牌必须同花色
  const suits = new Set(ns.map((c) => c.suit));
  if (suits.size > 1) return null;

  const targetSuit: Suit | null = suits.size === 1 ? [...suits][0]! : null;

  // 非王牌不能有重复点数
  const nsRanks = ns.map((c) => c.rank);
  const uniqueNsRanks = new Set<number>(nsRanks);
  if (uniqueNsRanks.size !== nsRanks.length) return null;

  const knownRanks = [...uniqueNsRanks].sort((a, b) => a - b);
  const totalLen = cards.length;

  // 普通同花顺候选
  for (let start = 3; start <= 15 - totalLen + 1; start++) {
    const candidate: number[] = [];
    for (let r = start; r < start + totalLen; r++) candidate.push(r);

    const allInCandidate = knownRanks.every((r) => candidate.includes(r));
    if (!allInCandidate) continue;

    const candidateSet = new Set(candidate);
    const missing = [...candidateSet].filter((r) => !uniqueNsRanks.has(r));
    if (missing.length !== jokers) continue;

    const result = analyzeStraight(candidate);
    if (result && result.valid) {
      const missQueue = [...missing];
      const resolvedRanks: number[] = [];
      const resolvedSuits: (Suit | null)[] = [];
      for (const c of cards) {
        if (c.kind === 'normal') {
          resolvedRanks.push(c.rank);
          resolvedSuits.push(c.suit);
        } else {
          resolvedRanks.push(missQueue.shift() ?? candidate[0]!);
          resolvedSuits.push(targetSuit); // joker 变成目标花色
        }
      }

      return {
        type: 'flushStraight',
        compareKey: straightCompareValue(result.isCircular, result.high),
        length: totalLen,
        isCircular: result.isCircular,
        isBomb: true,
        cards: [...cards],
        resolvedRanks,
        resolvedSuits,
      };
    }
  }

  // 循环同花顺
  if (totalLen >= 3 && totalLen <= 5) {
    const circularCandidate: number[] = [14, 15];
    for (let r = 3; r < 3 + totalLen - 2; r++) circularCandidate.push(r);
    const circSet = new Set(circularCandidate);
    const allIn = knownRanks.every((r) => circSet.has(r));
    if (allIn) {
      const missing = [...circSet].filter((r) => !uniqueNsRanks.has(r));
      if (missing.length === jokers) {
        const missQueue = [...missing];
        const resolvedRanks: number[] = [];
        const resolvedSuits: (Suit | null)[] = [];
        for (const c of cards) {
          if (c.kind === 'normal') {
            resolvedRanks.push(c.rank);
            resolvedSuits.push(c.suit);
          } else {
            resolvedRanks.push(missQueue.shift() ?? 14);
            resolvedSuits.push(targetSuit);
          }
        }

        return {
          type: 'flushStraight',
          compareKey: straightCompareValue(true, 14),
          length: totalLen,
          isCircular: true,
          isBomb: true,
          cards: [...cards],
          resolvedRanks,
          resolvedSuits,
        };
      }
    }
  }

  return null;
}

// ─── 公开 API ─────────────────────────────────────────────

/**
 * 识别一组牌能构成的所有合法牌型。
 * 返回数组可能为空（无法构成任何牌型）。
 */
export function identifyPatterns(cards: Card[]): Pattern[] {
  const results: Pattern[] = [];

  for (const detect of [
    detectSingle,
    detectPair,
    detectTriple,
    detectStraight,
    detectBomb4,
    detectFlushStraight,
  ]) {
    const p = detect(cards);
    if (p) results.push(p);
  }

  return results;
}

/**
 * 选出最优牌型（炸弹优先，其次点数最大）。
 * 用于自动识别场景。
 */
export function bestPattern(cards: Card[]): Pattern | null {
  const patterns = identifyPatterns(cards);
  if (patterns.length === 0) return null;
  return patterns.reduce((best, cur) => {
    if (cur.isBomb && !best.isBomb) return cur;
    if (!cur.isBomb && best.isBomb) return best;
    return cur.compareKey > best.compareKey ? cur : best;
  });
}

/**
 * 比较两个牌型：a 是否能压 b。
 *
 * 炸弹 > 普通牌型。
 * 四张炸弹 > 同花顺。
 * 同花顺之间：长者大，同长度比 compareKey。
 * 四张炸弹之间：比 compareKey。
 * 普通牌型之间：同类型 + 同长度才能比，比 compareKey。
 */
export function canBeat(candidate: Pattern, target: Pattern): boolean {
  const cIsBomb = candidate.isBomb;
  const tIsBomb = target.isBomb;

  // 炸弹 vs 普通
  if (cIsBomb && !tIsBomb) return true;
  if (!cIsBomb && tIsBomb) return false;

  // 都是炸弹
  if (cIsBomb && tIsBomb) {
    // 四张炸弹 > 同花顺
    const cIs4 = candidate.type === 'bomb4';
    const tIs4 = target.type === 'bomb4';
    if (cIs4 && !tIs4) return true;
    if (!cIs4 && tIs4) return false;

    // 同类型炸弹
    if (cIs4 && tIs4) {
      return candidate.compareKey > target.compareKey;
    }

    // 都是同花顺
    if (candidate.length !== target.length) {
      return candidate.length > target.length;
    }
    return candidate.compareKey > target.compareKey;
  }

  // 都是普通牌型
  if (candidate.type !== target.type) return false;
  if (candidate.length !== target.length) return false;

  return candidate.compareKey > target.compareKey;
}

/**
 * 比较两个牌型（返回 -1/0/1）。
 * 仅同类型同长度可比，否则返回 0（不可比）。
 */
export function comparePatterns(a: Pattern, b: Pattern): number {
  if (!canBeat(a, b) && !canBeat(b, a)) return 0;
  return canBeat(a, b) ? 1 : -1;
}

/** 从牌组中找出包含 N 个 8 的数量（用于偷牌触发） */
export function countSteals(cards: Card[]): number {
  return cards.filter((c) => c.kind === 'normal' && c.rank === 8).length;
}

/** 是否包含数字 8 */
export function hasEight(cards: Card[]): boolean {
  return cards.some((c) => c.kind === 'normal' && c.rank === 8);
}
