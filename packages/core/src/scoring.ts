import type { Card, GameState, PlayerState } from '@pokergame/shared';

/** 计算单张牌的分值 */
export function cardScore(card: Card): number {
  if (card.kind !== 'normal') return 0;
  if (card.rank === 5) return 5;
  if (card.rank === 10 || card.rank === 13) return 10;
  return 0;
}

/** 计算一组牌的总分 */
export function handScore(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + cardScore(c), 0);
}

/** 计算玩家总分（已收集计分牌） */
export function playerScore(player: PlayerState): number {
  return handScore(player.collectedScore);
}

/** 计算所有玩家分数 */
export function allScores(state: GameState): number[] {
  return state.players.map(playerScore);
}

/** 2V2 队伍总分 */
export function teamScores(state: GameState): [number, number] {
  const t0 = state.players
    .filter((p) => p.index % 2 === 0)
    .reduce((sum, p) => sum + playerScore(p), 0);
  const t1 = state.players
    .filter((p) => p.index % 2 === 1)
    .reduce((sum, p) => sum + playerScore(p), 0);
  return [t0, t1];
}

/** 全场计分牌总数 */
export function totalScoringCards(): number {
  return 20; // 4×5(5分) + 4×10(10分) + 4×K(10分) = 100分
}

/** 检查是否所有计分牌都已落地（被收集） */
export function allScoringCollected(state: GameState): boolean {
  const total = state.players.reduce((sum, p) => sum + p.collectedScore.length, 0);
  return total >= totalScoringCards();
}
