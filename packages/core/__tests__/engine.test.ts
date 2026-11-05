import { describe, it, expect } from 'vitest';
import { createGame, playCards, passTurn, getScores, setRng } from '../src/engine';
import { cardScore, handScore, allScores, allScoringCollected } from '../src/scoring';
import { checkVictory, checkBenliuVictory, checkScoreVictory } from '../src/victory';
import { makeNormalCard, makeJokerCard } from '@pokergame/shared';

describe('engine.ts', () => {
  it('creates a game with 4 players', () => {
    const state = createGame({ mode: 'ffa', seed: 42 });
    expect(state.players.length).toBe(4);
    expect(state.phase).toBe('playing');
    expect(state.deck.length).toBe(54 - 20);
  });

  it('players have 5 cards each', () => {
    const state = createGame({ mode: 'ffa', seed: 42 });
    for (const p of state.players) {
      expect(p.hand.length).toBe(5);
    }
  });

  it('2v2 mode assigns teammates', () => {
    const state = createGame({ mode: '2v2', seed: 42 });
    expect(state.players[0]!.teammateIndex).toBe(1);
    expect(state.players[1]!.teammateIndex).toBe(0);
    expect(state.players[2]!.teammateIndex).toBe(3);
    expect(state.players[3]!.teammateIndex).toBe(2);
  });

  it('first player can play', () => {
    const state = createGame({ mode: 'ffa', seed: 42 });
    const card = state.players[0]!.hand[0]!;
    const { state: next, error } = playCards(state, 0, [card]);
    expect(error).toBeUndefined();
    expect(next.currentPlayerIndex).toBe(1);
  });

  it('wrong player cannot play', () => {
    const state = createGame({ mode: 'ffa', seed: 42 });
    const card = state.players[1]!.hand[0]!;
    const { error } = playCards(state, 1, [card]);
    expect(error).toBeDefined();
  });

  it('cannot play cards not in hand', () => {
    const state = createGame({ mode: 'ffa', seed: 42 });
    const fake = makeNormalCard('spade', 99 as any);
    const { error } = playCards(state, 0, [fake]);
    expect(error).toBeDefined();
  });

  it('pass increments passCount', () => {
    const state = createGame({ mode: 'ffa', seed: 42 });
    const card = state.players[0]!.hand[0]!;
    const { state: afterPlay } = playCards(state, 0, [card]);
    const { state: afterPass, error } = passTurn(afterPlay, 1);
    expect(error).toBeUndefined();
    expect(afterPass.passCount).toBe(1);
  });
});

describe('scoring.ts', () => {
  it('card scores', () => {
    expect(cardScore(makeNormalCard('spade', 5))).toBe(5);
    expect(cardScore(makeNormalCard('spade', 10))).toBe(10);
    expect(cardScore(makeNormalCard('spade', 13))).toBe(10);
    expect(cardScore(makeNormalCard('spade', 3))).toBe(0);
    expect(cardScore(makeJokerCard('big'))).toBe(0);
  });

  it('hand score sums', () => {
    const cards = [
      makeNormalCard('spade', 5),
      makeNormalCard('heart', 10),
      makeNormalCard('club', 13),
    ];
    expect(handScore(cards)).toBe(25);
  });

  it('all scores', () => {
    const state = createGame({ mode: 'ffa', seed: 42 });
    const scores = allScores(state);
    expect(scores.length).toBe(4);
  });

  it('allScoringCollected is false initially', () => {
    const state = createGame({ mode: 'ffa', seed: 42 });
    expect(allScoringCollected(state)).toBe(false);
  });
});

describe('victory.ts', () => {
  it('no victory at start', () => {
    const state = createGame({ mode: 'ffa', seed: 42 });
    expect(checkVictory(state)).toBeNull();
  });

  it('benliu victory when 4 benliu cards', () => {
    const state = createGame({ mode: 'ffa', seed: 42 });
    state.players[0]!.benliu = [
      makeNormalCard('spade', 3),
      makeNormalCard('heart', 4),
      makeNormalCard('club', 5),
      makeNormalCard('diamond', 6),
    ];
    const result = checkBenliuVictory(state);
    expect(result).not.toBeNull();
    expect(result!.winnerIndexes).toEqual([0]);
    expect(result!.type).toBe('benliu');
  });
});
