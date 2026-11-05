import type { Rank, Suit, Card, NormalCard, JokerCard } from './types';

export const SUITS: Suit[] = ['spade', 'heart', 'diamond', 'club'];

/** 一副牌的点数（按从小到大） */
export const RANKS: Rank[] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export const RANK_LABEL: Record<number, string> = {
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
  15: '2',
};

export const SUIT_LABEL: Record<Suit, string> = {
  spade: '♠',
  heart: '♥',
  diamond: '♦',
  club: '♣',
};

/** 计分牌点数 → 分值 */
export const SCORE_VALUE: Partial<Record<number, number>> = {
  5: 5,
  10: 10,
  13: 10,
};

/** 全局总分 */
export const TOTAL_SCORE = 100;

/** 起始手牌数 */
export const STARTING_HAND_SIZE = 5;

/** 顺子最短长度 */
export const MIN_STRAIGHT_LENGTH = 3;

/** 奔流牌总数（集齐即胜） */
export const BENLIU_TOTAL = 4;

/** 牌库连续打空几轮后洗牌重置 */
export const EMPTY_DECK_ROUNDS_TO_SHUFFLE = 3;

/** 人数 */
export const PLAYER_COUNT = 4;

/** 数字 8 的点数 */
export const STEAL_RANK = 8;

export function isScoringCard(card: Card): boolean {
  return card.kind === 'normal' && SCORE_VALUE[card.rank] !== undefined;
}

export function cardScoreValue(card: Card): number {
  if (card.kind !== 'normal') return 0;
  return SCORE_VALUE[card.rank] ?? 0;
}

export function rankLabel(rank: number): string {
  return RANK_LABEL[rank] ?? String(rank);
}

export function cardLabel(card: Card): string {
  if (card.kind === 'joker') return card.joker === 'big' ? '大王' : '小王';
  return `${SUIT_LABEL[card.suit]}${rankLabel(card.rank)}`;
}

export function makeNormalCard(suit: Suit, rank: Rank): NormalCard {
  return { kind: 'normal', suit, rank, id: `${suit}-${rank}` };
}

export function makeJokerCard(joker: 'small' | 'big'): JokerCard {
  return { kind: 'joker', joker, id: `joker-${joker}` };
}

/** 生成标准一副 54 张牌 */
export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push(makeNormalCard(suit, rank));
    }
  }
  cards.push(makeJokerCard('small'));
  cards.push(makeJokerCard('big'));
  return cards;
}
