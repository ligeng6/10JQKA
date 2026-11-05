export type Suit = 'spade' | 'heart' | 'diamond' | 'club';
export type JokerKind = 'small' | 'big';

/**
 * 点数数值表示（越大越强）：
 * 3→3, 4→4, ..., 10→10, J→11, Q→12, K→13, A→14, 2→15
 */
export type Rank = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export interface NormalCard {
  kind: 'normal';
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface JokerCard {
  kind: 'joker';
  joker: JokerKind;
  id: string;
}

export type Card = NormalCard | JokerCard;

export type PatternType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'straight'
  | 'flushStraight'
  | 'bomb4';

export interface Pattern {
  type: PatternType;
  /** 同型比较用的键（顺子为最大牌点数；循环顺子额外标记） */
  compareKey: number;
  /** 牌张数 */
  length: number;
  /** A 开头循环顺子（A23/A234/...）= 同长度最大 */
  isCircular: boolean;
  /** 该牌型是否为炸弹（可压所有普通牌型） */
  isBomb: boolean;
  /** 出牌的原始手牌 */
  cards: Card[];
  /** 大小王变身后各牌的点数（与 cards 对齐） */
  resolvedRanks: number[];
  /** 大小王变身后各牌的花色（与 cards 对齐，仅同花顺用） */
  resolvedSuits: (Suit | null)[];
}

export type PlayAction =
  | {
      type: 'play';
      playerIndex: number;
      cards: Card[];
      /** 出牌声明的牌型；不传则自动识别 */
      declared?: {
        patternType: PatternType;
        /** 单张/对子/三张/炸弹的目标点数 */
        rank?: number;
        /** 顺子/同花顺的目标起始点数（用于校验） */
        straightLow?: number;
      };
      /** 触发 8 偷牌时的声明 */
      steal?: {
        targetPlayerIndex: number;
      };
    }
  | {
      type: 'pass';
      playerIndex: number;
    }
  | {
      type: 'steal-resolve';
      playerIndex: number;
      targetPlayerIndex: number;
      /** 偷到的牌（由引擎随机决定，此处回填） */
      stolenCard?: Card;
    };

export type GamePhase = 'playing' | 'awaiting-steal' | 'finished';

export interface PlayerState {
  index: number;
  hand: Card[];
  /** 奔流区：个人专属明置区 */
  benliu: Card[];
  /** 已收取的计分牌 */
  collectedScore: Card[];
  /** 2V2 队友索引（混战为 null） */
  teammateIndex: number | null;
}

export interface TrickPlay {
  playerIndex: number;
  cards: Card[];
  pattern: Pattern | null;
  isPass: boolean;
  /** 本出牌是否触发偷牌 */
  stealTriggered: boolean;
}

export interface GameState {
  players: PlayerState[];
  /** 牌库（抽牌堆） */
  deck: Card[];
  /** 分数区：本轮及历史落地的计分牌 */
  scoreZone: Card[];
  /** 当前应操作的玩家 */
  currentPlayerIndex: number;
  /** 本轮（墩）已出的牌 */
  currentTrick: TrickPlay[];
  /** 本轮最后一个非 PASS 的玩家（夺牌权候选） */
  trickLeaderIndex: number | null;
  /** 连续 PASS 计数 */
  passCount: number;
  /** 牌库连续打空轮数 */
  emptyDeckRounds: number;
  phase: GamePhase;
  /** 偷牌待选目标（phase = awaiting-steal 时有效） */
  pendingStealFrom: number | null;
  roundNumber: number;
  mode: GameMode;
  winnerIndexes: number[];
  victoryType: VictoryType | null;
  log: string[];
}

export type GameMode = 'ffa' | '2v2';
export type VictoryType = 'score' | 'benliu';
