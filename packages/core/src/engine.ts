import type {
  Card,
  GameMode,
  GameState,
  Pattern,
  PlayerState,
  TrickPlay,
} from '@pokergame/shared';
import {
  BENLIU_TOTAL,
  EMPTY_DECK_ROUNDS_TO_SHUFFLE,
  PLAYER_COUNT,
  STARTING_HAND_SIZE,
  createDeck,
  isScoringCard,
} from '@pokergame/shared';
import { shuffle, drawCards, sortByRank } from './cards';
import { bestPattern, canBeat, countSteals, hasEight } from './patterns';

// ─── 随机源（可注入） ───────────────────────────────────────
let rng: () => number = Math.random;
export function setRng(fn: () => number): void {
  rng = fn;
}

// ─── 创建游戏 ─────────────────────────────────────────────

export interface GameConfig {
  mode: GameMode;
  seed?: number;
}

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function createGame(config: GameConfig): GameState {
  const r = config.seed !== undefined ? seededRng(config.seed) : rng;
  const deck = shuffle(createDeck(), r);

  const hands: Card[][] = [];
  let remaining = deck;
  for (let i = 0; i < PLAYER_COUNT; i++) {
    const { drawn, deck: rest } = drawCards(remaining, STARTING_HAND_SIZE);
    hands.push(sortByRank(drawn));
    remaining = rest;
  }

  const players: PlayerState[] = hands.map((hand, i) => ({
    index: i,
    hand,
    benliu: [],
    collectedScore: [],
    teammateIndex: config.mode === '2v2' ? (i % 2 === 0 ? i + 1 : i - 1) : null,
  }));

  return {
    players,
    deck: remaining,
    scoreZone: [],
    currentPlayerIndex: 0,
    currentTrick: [],
    trickLeaderIndex: null,
    passCount: 0,
    emptyDeckRounds: 0,
    phase: 'playing',
    pendingStealFrom: null,
    roundNumber: 1,
    mode: config.mode,
    winnerIndexes: [],
    victoryType: null,
    log: [`游戏开始（${config.mode === '2v2' ? '2V2' : '混战'}）`],
  };
}

// ─── 工具 ─────────────────────────────────────────────────

function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      hand: [...p.hand],
      benliu: [...p.benliu],
      collectedScore: [...p.collectedScore],
    })),
    deck: [...state.deck],
    scoreZone: [...state.scoreZone],
    currentTrick: state.currentTrick.map((t) => ({ ...t })),
    winnerIndexes: [...state.winnerIndexes],
    log: [...state.log],
  };
}

function nextPlayerIndex(current: number): number {
  return (current + 1) % PLAYER_COUNT;
}

function addLog(state: GameState, msg: string): void {
  state.log.push(`[${state.roundNumber}] ${msg}`);
}

// ─── 出牌 ─────────────────────────────────────────────────

export interface PlayResult {
  state: GameState;
  error?: string;
}

export function playCards(
  state: GameState,
  playerIndex: number,
  cards: Card[],
  stealTargetIndex?: number, stealCardId?: string,
): PlayResult {
  if (state.phase !== 'playing') return { state, error: '游戏已结束或不在出牌阶段' };
  if (state.currentPlayerIndex !== playerIndex) return { state, error: '不是你的回合' };
  if (cards.length === 0) return { state, error: '未选择任何牌' };

  const player = state.players[playerIndex]!;

  // 验证手牌持有（手牌 + 奔流区）
  const allAvailable = [...player.hand, ...player.benliu];
  for (const card of cards) {
    const found = allAvailable.find((c) => c.id === card.id);
    if (!found) return { state, error: '手牌中没有该牌' };
  }

  // 识别牌型
  const pattern = bestPattern(cards);
  if (!pattern) return { state, error: '无法识别的牌型' };

  // 检查是否能压当前牌（如果需要压）
  const trickHasPlay = state.currentTrick.some((t) => !t.isPass);
  if (trickHasPlay && state.trickLeaderIndex !== null) {
    // 找到当前最大牌型
    const lastNonPass = [...state.currentTrick].reverse().find((t) => !t.isPass && t.pattern);
    if (lastNonPass?.pattern) {
      if (!canBeat(pattern, lastNonPass.pattern)) {
        return { state, error: '所出牌无法压制上家' };
      }
    }
  }

  const next = cloneState(state);

  // 从手牌/奔流区移除
  for (const card of cards) {
    const handIdx = next.players[playerIndex]!.hand.findIndex((c) => c.id === card.id);
    if (handIdx >= 0) {
      next.players[playerIndex]!.hand.splice(handIdx, 1);
    } else {
      const benIdx = next.players[playerIndex]!.benliu.findIndex((c) => c.id === card.id);
      if (benIdx >= 0) {
        next.players[playerIndex]!.benliu.splice(benIdx, 1);
      }
    }
  }

  // 记录出牌
  const stealCount = countSteals(cards);
  const trickPlay: TrickPlay = {
    playerIndex,
    cards: [...cards],
    pattern,
    isPass: false,
    stealTriggered: stealCount > 0,
  };
  next.currentTrick.push(trickPlay);
  next.trickLeaderIndex = playerIndex;
  next.passCount = 0;

  addLog(
    next,
    `玩家${playerIndex}出牌：${cards.map((c) => (c.kind === 'joker' ? (c.joker === 'big' ? '大王' : '小王') : `${c.rank}`)).join(',')}（${pattern.type}）`,
  );

  // 8 偷牌
  if (stealCount > 0) {
    const target = stealTargetIndex ?? findStealTarget(next, playerIndex);
    if (target !== null) {
      for (let i = 0; i < stealCount; i++) {
        executeSteal(next, playerIndex, target, stealCardId);
      }
    }
  }

  // 打空手牌 → 获得奔流牌
  if (next.players[playerIndex]!.hand.length === 0) {
    awardBenliu(next, playerIndex);
  }

  // 检查奔流胜利
  if (next.players[playerIndex]!.benliu.length >= BENLIU_TOTAL) {
    next.phase = 'finished';
    next.victoryType = 'benliu';
    next.winnerIndexes = [playerIndex];
    addLog(next, `玩家${playerIndex}集齐${BENLIU_TOTAL}张奔流牌，奔流胜利！`);
    return { state: next };
  }

  // 切换到下一玩家
  next.currentPlayerIndex = nextPlayerIndex(playerIndex);
  next.passCount = 0;

  // 检查是否本轮结束（连续3人pass）
  checkTrickEnd(next);

  return { state: next };
}

// ─── 过牌 ─────────────────────────────────────────────────

export function passTurn(state: GameState, playerIndex: number): PlayResult {
  if (state.phase !== 'playing') return { state, error: '游戏已结束' };
  if (state.currentPlayerIndex !== playerIndex) return { state, error: '不是你的回合' };

  const trickHasPlay = state.currentTrick.some((t) => !t.isPass);


  const next = cloneState(state);

  next.currentTrick.push({
    playerIndex,
    cards: [],
    pattern: null,
    isPass: true,
    stealTriggered: false,
  });
  next.passCount += 1;
  addLog(next, `玩家${playerIndex}过牌`);

  next.currentPlayerIndex = nextPlayerIndex(playerIndex);

  checkTrickEnd(next);

  return { state: next };
}

// ─── 本轮结束检测 ─────────────────────────────────────────

function checkTrickEnd(state: GameState): void {
  if (state.passCount >= PLAYER_COUNT - 1) {
    endTrick(state);
  }
}

function endTrick(state: GameState): void {
  const leaderIdx = state.trickLeaderIndex;
  if (leaderIdx === null) {
    // 全场都过 → 清空本轮，当前玩家重新首出
    state.currentTrick = [];
    state.passCount = 0;
    return;
  }

  // 收取本轮落地的计分牌
  const scoringCards: Card[] = [];
  for (const play of state.currentTrick) {
    for (const card of play.cards) {
      if (isScoringCard(card)) {
        scoringCards.push(card);
        state.scoreZone.push(card);
      }
    }
  }

  state.players[leaderIdx]!.collectedScore.push(...scoringCards);

  addLog(
    state,
    `玩家${leaderIdx}获得本轮${scoringCards.length}张计分牌`,
  );

  // 清空本轮
  state.currentTrick = [];
  state.passCount = 0;
  state.trickLeaderIndex = null;

  // 补牌
  refillHands(state);

  // 检查分数胜利
  checkScoreVictory(state);

  if (state.phase === 'playing') {
    // 下一轮由夺牌权者先出
    state.currentPlayerIndex = leaderIdx;
    state.roundNumber += 1;

    skipEmptyPlayers(state);

    // 检查牌库打空
    if (state.deck.length === 0) {
      state.emptyDeckRounds += 1;
      if (state.emptyDeckRounds >= EMPTY_DECK_ROUNDS_TO_SHUFFLE) {
        shuffleReset(state);
      }
    } else {
      state.emptyDeckRounds = 0;
    }
  }
}

// ─── 补牌 ─────────────────────────────────────────────────

function refillHands(state: GameState): void {
  for (const player of state.players) {
    const needed = STARTING_HAND_SIZE - player.hand.length;
    if (needed > 0 && state.deck.length > 0) {
      const { drawn, deck } = drawCards(state.deck, Math.min(needed, state.deck.length));
      player.hand.push(...sortByRank(drawn));
      state.deck = deck;
    }
  }
}

// ─── 偷牌 ─────────────────────────────────────────────────

function findStealTarget(state: GameState, thiefIndex: number): number | null {
  for (let i = 0; i < PLAYER_COUNT; i++) {
    if (i === thiefIndex) continue;
    if (state.players[i]!.hand.length > 0) return i;
  }
  return null;
}

function executeSteal(state: GameState, thiefIndex: number, targetIndex: number, stealCardId?: string): void {
  const target = state.players[targetIndex]!;
  if (target.hand.length === 0) return;

  let randomIdx = Math.floor(rng() * target.hand.length); if (stealCardId) { const fi = target.hand.findIndex(c => c.id === stealCardId); if (fi >= 0) randomIdx = fi; }
  const stolen = target.hand.splice(randomIdx, 1)[0]!;
  state.players[thiefIndex]!.hand.push(stolen);

  addLog(state, `玩家${thiefIndex}从玩家${targetIndex}偷了1张牌`);
}

// ─── 奔流牌 ───────────────────────────────────────────────

function awardBenliu(state: GameState, playerIndex: number): void {
  if (state.deck.length === 0) return;

  const { drawn, deck } = drawCards(state.deck, 1);
  state.deck = deck;

  if (drawn.length > 0) {
    state.players[playerIndex]!.benliu.push(drawn[0]!);
    addLog(state, `玩家${playerIndex}打空手牌，获得奔流牌`);
  }
}

// ─── 洗牌重置 ─────────────────────────────────────────────

function shuffleReset(state: GameState): void {
  // 收集所有已打出的非计分牌
  const discardPile: Card[] = [];
  // 从 log 中无法恢复，改为：将非计分牌从 scoreZone 之外的地方回收
  // 实际上已打出的牌不在任何地方（被丢弃了），需要重新生成
  // 这里用简化方案：从所有玩家手中回收多余的非计分牌（>STARTING_HAND_SIZE 的部分）

  // 重置牌库为剩余非计分牌
  const nonScoring = state.deck.filter((c) => !isScoringCard(c));
  const shuffled = shuffle(nonScoring, rng);
  state.deck = shuffled;
  state.emptyDeckRounds = 0;

  addLog(state, `牌库打空${EMPTY_DECK_ROUNDS_TO_SHUFFLE}轮，洗牌重置`);
}

// ─── 胜利判定 ─────────────────────────────────────────────

function checkScoreVictory(state: GameState): void {
  // 计算所有计分牌是否已落地（被收集）
  const totalCollected = state.players.reduce((sum, p) => sum + p.collectedScore.length, 0);
  const totalScoringInScoreZone = state.scoreZone.length;

  // 检查是否所有计分牌都被收集
  // 一副牌：4×5 + 4×10 + 4×K = 20 张计分牌
  const TOTAL_SCORING_CARDS = 20;
  if (totalCollected >= TOTAL_SCORING_CARDS || totalScoringInScoreZone >= TOTAL_SCORING_CARDS) {
    // 计算分数
    const scores = state.players.map((p) => {
      return p.collectedScore.reduce((sum, card) => {
        if (card.kind === 'normal') {
          if (card.rank === 5) return sum + 5;
          if (card.rank === 10 || card.rank === 13) return sum + 10;
        }
        return sum;
      }, 0);
    });

    const maxScore = Math.max(...scores);
    const winners = scores
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s === maxScore)
      .map(({ i }) => i);

    state.phase = 'finished';
    state.victoryType = 'score';
    state.winnerIndexes = winners;
    addLog(state, `分数胜利！最高分${maxScore}，胜者：玩家${winners.join(',')}`);
  }
}

// ─── 导出 ─────────────────────────────────────────────────

export function getPlayerHand(state: GameState, playerIndex: number): Card[] {
  return state.players[playerIndex]?.hand ?? [];
}

export function getPlayerBenliu(state: GameState, playerIndex: number): Card[] {
  return state.players[playerIndex]?.benliu ?? [];
}

export function getScores(state: GameState): number[] {
  return state.players.map((p) =>
    p.collectedScore.reduce((sum, card) => {
      if (card.kind === 'normal') {
        if (card.rank === 5) return sum + 5;
        if (card.rank === 10 || card.rank === 13) return sum + 10;
      }
      return sum;
    }, 0),
  );
}

/**
 * 自动跳过无手牌玩家（手牌+奔流区都为空）
 * 牌库空且手牌空 = 终局，自动让过牌权
 */
export function skipEmptyPlayers(state: GameState): void {
  let guard = 0;
  while (guard < PLAYER_COUNT) {
    const p = state.players[state.currentPlayerIndex];
    if (!p) break;
    if (p.hand.length + p.benliu.length > 0) break;
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % PLAYER_COUNT;
    guard++;
  }
  // 检查是否所有人都没牌了
  const allEmpty = state.players.every((p) => p.hand.length + p.benliu.length === 0);
  if (allEmpty && state.phase === 'playing') {
    endTrick(state);
    checkScoreVictory(state);
    if (state.phase === 'playing') {
      state.phase = 'finished';
      const scores = state.players.map((p) =>
        p.collectedScore.reduce((s, c) => {
          if (c.kind === 'normal') {
            if (c.rank === 5) return s + 5;
            if (c.rank === 10 || c.rank === 13) return s + 10;
          }
          return s;
        }, 0),
      );
      const maxScore = Math.max(...scores);
      state.winnerIndexes = scores.map((s, i) => ({ s, i })).filter(({ s }) => s === maxScore).map(({ i }) => i);
      state.victoryType = 'score';
      state.log.push('所有玩家手牌已空，终局结算');
    }
  }
}

// ─── 弃小牌换牌 ─────────────────────────────────────

/** 手牌是否全为小牌（点数 <= 8，即 3,4,5,6,7,8） */
export function canDiscardSmall(state: GameState, playerIndex: number): boolean {
  const player = state.players[playerIndex];
  if (!player) return false;
  if (player.hand.length === 0) return false;
  return player.hand.every((c) => c.kind === 'normal' && c.rank <= 8);
}

/**
 * 弃小牌换牌：弃掉所有手牌（不触发计分/偷牌/奔流），摸5张新牌
 */
export function discardSmall(state: GameState, playerIndex: number): PlayResult {
  if (state.phase !== 'playing') return { state, error: '游戏已结束' };
  if (state.currentPlayerIndex !== playerIndex) return { state, error: '不是你的回合' };

  const player = state.players[playerIndex];
  if (!player) return { state, error: '玩家不存在' };
  if (!canDiscardSmall(state, playerIndex)) return { state, error: '手牌不全为小牌(≤8)' };

  const next = cloneState(state);
  const discarded = [...next.players[playerIndex]!.hand];
  next.players[playerIndex]!.hand = [];

  const { drawn, deck } = drawCards(next.deck, STARTING_HAND_SIZE);
  next.deck = deck;
  next.players[playerIndex]!.hand = sortByRank(drawn);

  addLog(next, '玩家' + playerIndex + '弃小牌换牌（弃' + discarded.length + '张，摸' + drawn.length + '张）');

  next.currentPlayerIndex = (playerIndex + 1) % PLAYER_COUNT;
  next.passCount = 0;
  skipEmptyPlayers(next);

  return { state: next };
}
