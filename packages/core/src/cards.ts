import type { Card, NormalCard, Rank, Suit } from '@pokergame/shared';
import { RANKS, isScoringCard, cardScoreValue } from '@pokergame/shared';

/**
 * 点数序（从小到大）：3,4,5,6,7,8,9,10,J,Q,K,A,2
 * Rank 数值：3→3 … 10→10, J→11, Q→12, K→13, A→14, 2→15
 */

export function isJoker(card: Card): boolean {
  return card.kind === 'joker';
}

export function isNormal(card: Card): card is NormalCard {
  return card.kind === 'normal';
}

/** 获取点数数值（王返回 -1） */
export function getRank(card: Card): number {
  return card.kind === 'normal' ? card.rank : -1;
}

/** 比较两张牌的点数（王视为 -1） */
export function compareRank(a: Card, b: Card): number {
  return getRank(a) - getRank(b);
}

/** 比较两张牌的花色（王视为 null，排最后） */
export function compareSuit(a: Card, b: Card): number {
  const order: Record<Suit, number> = { spade: 0, heart: 1, diamond: 2, club: 3 };
  const ra = a.kind === 'normal' ? order[a.suit] : 99;
  const rb = b.kind === 'normal' ? order[b.suit] : 99;
  return ra - rb;
}

/** 按点数升序排序（王在最前） */
export function sortByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => compareRank(a, b));
}

/** 按点数降序排序 */
export function sortByRankDesc(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => compareRank(b, a));
}

/** Fisher-Yates 洗牌（可注入随机源便于测试） */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** 从牌库顶抽 n 张 */
export function drawCards(deck: Card[], n: number): { drawn: Card[]; deck: Card[] } {
  const drawn = deck.slice(0, n);
  const remaining = deck.slice(n);
  return { drawn, deck: remaining };
}

/**
 * 顺子点数序（不含 2）：
 *   3→3, 4→4, …, 10→10, J→11, Q→12, K→13, A→14
 * 特殊循环顺（含 2）：A,2,3[,4,5] — A 开头，2 为第二位
 */

/** 顺子合法点数集合（不含 2=15） */
export const STRAIGHT_RANKS: number[] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/**
 * 判断一组点数是否构成顺子（已排序去重）。
 * 返回 { valid, isCircular, low, high } 或 null。
 *
 * 普通顺：在 3–A 范围内连续，≥3 张。
 * 循环顺：A,2,3[,4,5] — 包含 A 和 2，从 A 开头连续（A=14, 2=15, 3=3, 4=4, 5=5）。
 */
export function analyzeStraight(ranks: number[]): {
  valid: boolean;
  isCircular: boolean;
  low: number;
  high: number;
} | null {
  const sorted = [...new Set(ranks)].sort((a, b) => a - b);
  if (sorted.length < 3) return null;

  // 尝试普通顺：所有点数在 3–14 范围内，且连续
  const allInRange = sorted.every((r) => r >= 3 && r <= 14);
  if (allInRange) {
    let consecutive = true;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i]! - sorted[i - 1]! !== 1) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) {
      return {
        valid: true,
        isCircular: false,
        low: sorted[0]!,
        high: sorted[sorted.length - 1]!,
      };
    }
  }

  // 尝试循环顺：必须包含 A(14) 和 2(15)，其余为 3,4,5… 起始连续
  const hasA = sorted.includes(14);
  const has2 = sorted.includes(15);
  if (hasA && has2) {
    // 去掉 A 和 2 后剩余部分应为 3,4,5… 连续
    const rest = sorted.filter((r) => r !== 14 && r !== 15);
    // rest 必须从 3 开始连续
    const expected: number[] = [];
    for (let r = 3; r < 3 + rest.length; r++) expected.push(r);
    const restOk =
      rest.length === expected.length && rest.every((r, i) => r === expected[i]);
    // 总长度 = rest.length + 2（A 和 2）
    const totalLen = rest.length + 2;
    if (restOk && totalLen >= 3 && totalLen <= 5) {
      return {
        valid: true,
        isCircular: true,
        low: 3,
        high: 14, // 循环顺最大牌为 A（比大小用）
      };
    }
  }

  return null;
}

/**
 * 顺子比较值（同长度内比大小）。
 * 普通顺 → high（最大牌点数）；循环顺 → 100 + high（永远 > 任何普通顺）。
 */
export function straightCompareValue(
  isCircular: boolean,
  high: number,
): number {
  return isCircular ? 100 + high : high;
}

export { isScoringCard, cardScoreValue };
