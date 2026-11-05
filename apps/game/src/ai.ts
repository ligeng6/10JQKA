import type { Card, GameState, Pattern } from '@pokergame/shared';
import { bestPattern, canBeat, countSteals } from '@pokergame/core';
import { sortByRank, isJoker, isNormal } from '@pokergame/core';

export interface AIAction {
  type: 'play' | 'pass';
  cards?: Card[];
  stealTarget?: number;
}

export function decideAction(state: GameState, playerIndex: number): AIAction {
  const player = state.players[playerIndex];
  if (!player) return { type: 'pass' };

  const allCards = [...player.hand, ...player.benliu];
  const trick = state.currentTrick.filter((t) => !t.isPass);
  const lastPlay = trick[trick.length - 1];
  const targetPattern = lastPlay?.pattern ?? null;

  if (!targetPattern) {
    return leadAction(allCards);
  }
  return followAction(allCards, targetPattern);
}

/** 首出：随机打合法牌型 */
function leadAction(cards: Card[]): AIAction {
  if (cards.length === 0) return { type: 'pass' };

  const allPlays = findAllPlays(cards);
  if (allPlays.length === 0) {
    // 兜底：打最小单张
    const sorted = sortByRank(cards);
    return { type: 'play', cards: [sorted[0]!] };
  }

  // 随机选一个合法牌型
  const pick = allPlays[Math.floor(Math.random() * allPlays.length)]!;
  return { type: 'play', cards: pick.cards };
}

/** 跟牌：找最小能压的 */
function followAction(cards: Card[], target: Pattern): AIAction {
  const allPlays = findAllPlays(cards);
  const beatable = allPlays
    .filter((p) => canBeat(p.pattern, target))
    .sort((a, b) => a.pattern.compareKey - b.pattern.compareKey);

  if (beatable.length > 0) {
    const best = beatable[0]!;
    return { type: 'play', cards: best.cards };
  }
  return { type: 'pass' };
}

/** 枚举手牌所有合法牌型组合 */
export function findAllPlays(cards: Card[]): { pattern: Pattern; cards: Card[] }[] {
  const results: { pattern: Pattern; cards: Card[] }[] = [];
  const jokers = cards.filter((c) => isJoker(c));
  const byRank = new Map<number, Card[]>();

  for (const c of cards) {
    if (isNormal(c)) {
      const arr = byRank.get(c.rank) ?? [];
      arr.push(c);
      byRank.set(c.rank, arr);
    }
  }

  // 单张
  for (const c of cards) {
    if (!isJoker(c)) {
      const p = bestPattern([c]);
      if (p) results.push({ pattern: p, cards: [c] });
    }
  }

  // 对子
  for (const [, g] of byRank) {
    if (g.length >= 2) {
      const p = bestPattern(g.slice(0, 2));
      if (p) results.push({ pattern: p, cards: g.slice(0, 2) });
    }
  }
  for (const j of jokers) {
    for (const [, g] of byRank) {
      const p = bestPattern([j, g[0]!]);
      if (p && p.type === 'pair') results.push({ pattern: p, cards: [j, g[0]!] });
    }
  }

  // 三张
  for (const [, g] of byRank) {
    if (g.length >= 3) {
      const p = bestPattern(g.slice(0, 3));
      if (p) results.push({ pattern: p, cards: g.slice(0, 3) });
    }
    if (g.length === 2 && jokers.length > 0) {
      const p = bestPattern([...g, jokers[0]!]);
      if (p && p.type === 'triple') results.push({ pattern: p, cards: [...g, jokers[0]!] });
    }
  }

  // 四张炸弹
  for (const [, g] of byRank) {
    if (g.length >= 4) {
      const p = bestPattern(g.slice(0, 4));
      if (p) results.push({ pattern: p, cards: g.slice(0, 4) });
    }
    if (g.length === 3 && jokers.length > 0) {
      const p = bestPattern([...g, jokers[0]!]);
      if (p && p.type === 'bomb4') results.push({ pattern: p, cards: [...g, jokers[0]!] });
    }
    if (g.length === 2 && jokers.length >= 2) {
      const p = bestPattern([...g, jokers[0]!, jokers[1]!]);
      if (p && p.type === 'bomb4') results.push({ pattern: p, cards: [...g, jokers[0]!, jokers[1]!] });
    }
  }

  // 顺子 3-5 张
  for (let len = 3; len <= 5; len++) {
    for (let start = 3; start <= 15 - len + 1; start++) {
      const needed: number[] = [];
      for (let r = start; r < start + len; r++) needed.push(r);

      const picked: Card[] = [];
      let jUsed = 0;
      let ok = true;

      for (const rank of needed) {
        const match = cards.find((c) => isNormal(c) && c.rank === rank && !picked.includes(c));
        if (match) {
          picked.push(match);
        } else if (jUsed < jokers.length) {
          picked.push(jokers[jUsed]!);
          jUsed++;
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

export function pickStealTarget(state: GameState, thiefIndex: number): number {
  const candidates = state.players
    .filter((p) => p.index !== thiefIndex && p.hand.length > 0)
    .map((p) => p.index);
  if (candidates.length === 0) return -1;
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}
