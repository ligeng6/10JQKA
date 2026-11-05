import { describe, it, expect } from 'vitest';
import {
  isJoker,
  isNormal,
  getRank,
  compareRank,
  sortByRank,
  sortByRankDesc,
  shuffle,
  drawCards,
  analyzeStraight,
  straightCompareValue,
} from '../src/cards';
import { makeNormalCard, makeJokerCard, createDeck } from '@pokergame/shared';

describe('cards.ts', () => {
  describe('isJoker / isNormal', () => {
    it('joker card', () => {
      const j = makeJokerCard('big');
      expect(isJoker(j)).toBe(true);
      expect(isNormal(j)).toBe(false);
    });

    it('normal card', () => {
      const c = makeNormalCard('spade', 3);
      expect(isJoker(c)).toBe(false);
      expect(isNormal(c)).toBe(true);
    });
  });

  describe('getRank', () => {
    it('normal card returns rank', () => {
      expect(getRank(makeNormalCard('heart', 10))).toBe(10);
    });

    it('joker returns -1', () => {
      expect(getRank(makeJokerCard('small'))).toBe(-1);
    });
  });

  describe('compareRank', () => {
    it('compares normal cards', () => {
      const a = makeNormalCard('spade', 5);
      const b = makeNormalCard('heart', 10);
      expect(compareRank(a, b)).toBeLessThan(0);
    });

    it('joker is lowest', () => {
      const j = makeJokerCard('big');
      const c = makeNormalCard('spade', 3);
      expect(compareRank(j, c)).toBeLessThan(0);
    });
  });

  describe('sortByRank', () => {
    it('sorts ascending', () => {
      const cards = [
        makeNormalCard('spade', 15),
        makeNormalCard('heart', 3),
        makeJokerCard('small'),
        makeNormalCard('club', 10),
      ];
      const sorted = sortByRank(cards);
      expect(getRank(sorted[0]!)).toBe(-1);
      expect(getRank(sorted[1]!)).toBe(3);
      expect(getRank(sorted[2]!)).toBe(10);
      expect(getRank(sorted[3]!)).toBe(15);
    });
  });

  describe('sortByRankDesc', () => {
    it('sorts descending', () => {
      const cards = [
        makeNormalCard('heart', 3),
        makeNormalCard('spade', 15),
      ];
      const sorted = sortByRankDesc(cards);
      expect(getRank(sorted[0]!)).toBe(15);
      expect(getRank(sorted[1]!)).toBe(3);
    });
  });

  describe('shuffle', () => {
    it('preserves all elements', () => {
      const deck = createDeck();
      const shuffled = shuffle(deck, () => 0.5);
      expect(shuffled.length).toBe(54);
    });
  });

  describe('drawCards', () => {
    it('draws n cards', () => {
      const deck = [makeNormalCard('spade', 3), makeNormalCard('heart', 5), makeNormalCard('club', 10)];
      const { drawn, deck: rest } = drawCards(deck, 2);
      expect(drawn.length).toBe(2);
      expect(rest.length).toBe(1);
    });
  });

  describe('analyzeStraight', () => {
    it('valid normal straight 345', () => {
      const result = analyzeStraight([3, 4, 5]);
      expect(result).not.toBeNull();
      expect(result!.valid).toBe(true);
      expect(result!.isCircular).toBe(false);
      expect(result!.high).toBe(5);
    });

    it('valid QKA', () => {
      const result = analyzeStraight([12, 13, 14]);
      expect(result).not.toBeNull();
      expect(result!.valid).toBe(true);
      expect(result!.isCircular).toBe(false);
    });

    it('A23 is circular straight', () => {
      const result = analyzeStraight([14, 15, 3]);
      expect(result).not.toBeNull();
      expect(result!.valid).toBe(true);
      expect(result!.isCircular).toBe(true);
    });

    it('A234 is circular straight', () => {
      const result = analyzeStraight([14, 15, 3, 4]);
      expect(result).not.toBeNull();
      expect(result!.isCircular).toBe(true);
    });

    it('KA2 is NOT a straight', () => {
      const result = analyzeStraight([13, 14, 15]);
      expect(result).toBeNull();
    });

    it('234 is NOT a straight', () => {
      const result = analyzeStraight([15, 3, 4]);
      expect(result).toBeNull();
    });

    it('less than 3 cards is invalid', () => {
      expect(analyzeStraight([3, 4])).toBeNull();
    });

    it('duplicate ranks are invalid', () => {
      expect(analyzeStraight([3, 3, 4])).toBeNull();
    });
  });

  describe('straightCompareValue', () => {
    it('normal straight uses high card', () => {
      expect(straightCompareValue(false, 5)).toBe(5);
    });

    it('circular straight beats all normals', () => {
      expect(straightCompareValue(true, 14)).toBeGreaterThan(straightCompareValue(false, 14));
    });
  });
});
