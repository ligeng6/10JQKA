import type { Card, GameState, Pattern, PatternType } from '@pokergame/shared';
import { bestPattern, canBeat, identifyPatterns, countSteals } from '@pokergame/core';
import { getRank, sortByRank, isJoker, isNormal } from '@pokergame/core';

export interface AIAction {
  type: 'play' | 'pass';
  cards?: Card[];
  stealTarget?: number;
}

/**
 * AI 决策：能压就压，压不过就过牌
 * 首出时打最小的牌型
 */
export function decideAction(state: GameState, playerIndex: number): AIAction {
  const player = state.players[playerIndex];
  if (!player) return { type: 'pass' };

  const hand = player.hand;
  const benliu = player.benliu;
  const allCards = [...hand, ...benliu];

  // 找当前需要压的牌型
  const trick = state.currentTrick.filter((t) => !t.isPass);
  const lastPlay = trick[trick.length - 1];
  const targetPattern = lastPlay?.pattern ?? null;

  if (!targetPattern) {
    // 首出：打最小单张
    return leadAction(allCards);
  }

  // 有目标牌型：找能压的
  return followAction(allCards, targetPattern);
}

function leadAction(cards: Card[]): AIAction {
  if (cards.length === 0) return { type: 'pass' };

  // 优先打单张（最小的）
  const sorted = sortByRank(cards);
  const nonJokers = sorted.filter((c) => !isJoker(c));
  const pick = nonJokers[0] ?? sorted[0]!;

  return {
    type: 'play',
    cards: [pick],
    stealTarget: isNormal(pick) && pick.rank === 8 ? randomTarget(-1) : undefined,
  };
}

function followAction(cards: Card[], target: Pattern): AIAction {
  const allPatterns = findAllPlays(cards);

  // 找能压的牌型（优先小牌，保留大牌）
  const beatable = allPatterns
    .filter((p) => canBeat(p.pattern, target))
    .sort((a, b) => a.pattern.compareKey - b.pattern.compareKey);

  if (beatable.length > 0) {
    const best = beatable[0]!;
    const stealCount = countSteals(best.cards);
    return {
      type: 'play',
      cards: best.cards,
      stealTarget: stealCount > 0 ? randomTarget(-1) : undefined,
    };
  }

  return { type: 'pass' };
}

/**
 * 枚举手牌中所有可能的出牌组合（简化版：按牌型逐类搜索）
 */
function findAllPlays(cards: Card[]): { pattern: Pattern; cards: Card[] }[] {
  const results: { pattern: Pattern; cards: Card[] }[] = [];

  // 单张
  for (const c of cards) {
    if (!isJoker(c)) {
      const p = bestPattern([c]);
      if (p) results.push({ pattern: p, cards: [c] });
    }
  }

  // 对子
  const byRank = new Map<number, Card[]>();
  for (const c of cards) {
    if (isNormal(c)) {
      const arr = byRank.get(c.rank) ?? [];
      arr.push(c);
      byRank.set(c.rank, arr);
    }
  }

  for (const [, group] of byRank) {
    if (group.length >= 2) {
      const p = bestPattern(group.slice(0, 2));
      if (p) results.push({ pattern: p, cards: group.slice(0, 2) });
    }
  }

  // 王配对（王+单张=对子）
  const jokers = cards.filter((c) => isJoker(c));
  const singles = cards.filter((c) => !isJoker(c));
  for (const j of jokers) {
    for (const s of singles) {
      const p = bestPattern([j, s]);
      if (p && p.type === 'pair') {
        results.push({ pattern: p, cards: [j, s] });
      }
    }
  }

  // 三张
  for (const [, group] of byRank) {
    if (group.length >= 3) {
      const p = bestPattern(group.slice(0, 3));
      if (p) results.push({ pattern: p, cards: group.slice(0, 3) });
    }
    // 2张+王=三张
    if (group.length === 2 && jokers.length > 0) {
      const p = bestPattern([...group, jokers[0]!]);
      if (p && p.type === 'triple') {
        results.push({ pattern: p, cards: [...group, jokers[0]!] });
      }
    }
  }

  // 四张炸弹
  for (const [, group] of byRank) {
    if (group.length >= 4) {
      const p = bestPattern(group.slice(0, 4));
      if (p) results.push({ pattern: p, cards: group.slice(0, 4) });
    }
    if (group.length === 3 && jokers.length > 0) {
      const p = bestPattern([...group, jokers[0]!]);
      if (p && p.type === 'bomb4') {
        results.push({ pattern: p, cards: [...group, jokers[0]!] });
      }
    }
  }

  // 顺子（3-5张，简化搜索）
  for (let len = 3; len <= 5; len++) {
    for (let start = 3; start <= 15 - len + 1; start++) {
      const needed: number[] = [];
      for (let r = start; r < start + len; r++) needed.push(r);

      const picked: Card[] = [];
      let jokersUsed = 0;
      let ok = true;

      for (const rank of needed) {
        const match = cards.find((c) => isNormal(c) && c.rank === rank && !picked.includes(c));
        if (match) {
          picked.push(match);
        } else if (jokersUsed < jokers.length) {
          picked.push(jokers[jokersUsed]!);
          jokersUsed++;
        } else {
          ok = false;
          break;
        }
      }

      if (ok && picked.length === len) {
        const p = bestPattern(picked);
        if (p && (p.type === 'straight' || p.type === 'flushStraight')) {
          results.push({ pattern: p, cards: picked });
        }
      }
    }
  }

  return results;
}

function randomTarget(_self: number): number {
  return Math.floor(Math.random() * 4);
}

/**
 * AI 偷牌目标：随机选一个有手牌的对手
 */
export function pickStealTarget(state: GameState, thiefIndex: number): number {
  const candidates = state.players
    .filter((p) => p.index !== thiefIndex && p.hand.length > 0)
    .map((p) => p.index);
  if (candidates.length === 0) return -1;
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}
