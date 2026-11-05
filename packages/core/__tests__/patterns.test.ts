import { describe, it, expect } from 'vitest';
import { identifyPatterns, bestPattern, canBeat, comparePatterns, countSteals, hasEight } from '../src/patterns';
import { makeNormalCard, makeJokerCard } from '@pokergame/shared';

describe('patterns.ts', () => {
  describe('single', () => {
    it('single normal card', () => {
      const p = bestPattern([makeNormalCard('spade', 10)]);
      expect(p).not.toBeNull();
      expect(p!.type).toBe('single');
      expect(p!.compareKey).toBe(10);
    });

    it('joker cannot be single', () => {
      const patterns = identifyPatterns([makeJokerCard('big')]);
      expect(patterns.length).toBe(0);
    });
  });

  describe('pair', () => {
    it('pair of same rank', () => {
      const p = bestPattern([makeNormalCard('spade', 7), makeNormalCard('heart', 7)]);
      expect(p).not.toBeNull();
      expect(p!.type).toBe('pair');
      expect(p!.compareKey).toBe(7);
    });

    it('joker + normal = pair', () => {
      const p = bestPattern([makeJokerCard('small'), makeNormalCard('heart', 7)]);
      expect(p).not.toBeNull();
      expect(p!.type).toBe('pair');
      expect(p!.compareKey).toBe(7);
    });

    it('two jokers = pair of 2s', () => {
      const p = bestPattern([makeJokerCard('small'), makeJokerCard('big')]);
      expect(p).not.toBeNull();
      expect(p!.type).toBe('pair');
      expect(p!.compareKey).toBe(15);
    });

    it('different ranks is not a pair', () => {
      const patterns = identifyPatterns([makeNormalCard('spade', 7), makeNormalCard('heart', 8)]);
      expect(patterns.length).toBe(0);
    });
  });

  describe('triple', () => {
    it('three of same rank', () => {
      const p = bestPattern([makeNormalCard('spade', 7), makeNormalCard('heart', 7), makeNormalCard('club', 7)]);
      expect(p).not.toBeNull();
      expect(p!.type).toBe('triple');
    });

    it('joker fills triple', () => {
      const p = bestPattern([makeNormalCard('spade', 7), makeNormalCard('heart', 7), makeJokerCard('big')]);
      expect(p).not.toBeNull();
      expect(p!.type).toBe('triple');
      expect(p!.compareKey).toBe(7);
    });
  });

  describe('straight', () => {
    it('345 straight', () => {
      const p = bestPattern([
        makeNormalCard('spade', 3),
        makeNormalCard('heart', 4),
        makeNormalCard('club', 5),
      ]);
      expect(p).not.toBeNull();
      expect(p!.type).toBe('straight');
      expect(p!.isCircular).toBe(false);
    });

    it('A23 circular straight', () => {
      const p = bestPattern([
        makeNormalCard('spade', 14),
        makeNormalCard('heart', 15),
        makeNormalCard('club', 3),
      ]);
      expect(p).not.toBeNull();
      expect(p!.type).toBe('straight');
      expect(p!.isCircular).toBe(true);
    });

    it('KA2 is not a straight', () => {
      const patterns = identifyPatterns([
        makeNormalCard('spade', 13),
        makeNormalCard('heart', 14),
        makeNormalCard('club', 15),
      ]);
      expect(patterns.filter((p) => p.type === 'straight').length).toBe(0);
    });

    it('joker fills straight gap', () => {
      const p = bestPattern([
        makeNormalCard('spade', 3),
        makeJokerCard('big'),
        makeNormalCard('club', 5),
      ]);
      expect(p).not.toBeNull();
      expect(p!.type).toBe('straight');
    });
  });

  describe('bomb4', () => {
    it('four of a kind', () => {
      const p = bestPattern([
        makeNormalCard('spade', 7),
        makeNormalCard('heart', 7),
        makeNormalCard('club', 7),
        makeNormalCard('diamond', 7),
      ]);
      expect(p).not.toBeNull();
      expect(p!.type).toBe('bomb4');
      expect(p!.isBomb).toBe(true);
    });

    it('joker fills bomb', () => {
      const p = bestPattern([
        makeNormalCard('spade', 7),
        makeNormalCard('heart', 7),
        makeNormalCard('club', 7),
        makeJokerCard('big'),
      ]);
      expect(p).not.toBeNull();
      expect(p!.type).toBe('bomb4');
    });
  });

  describe('flushStraight', () => {
    it('spade flush straight', () => {
      const p = bestPattern([
        makeNormalCard('spade', 3),
        makeNormalCard('spade', 4),
        makeNormalCard('spade', 5),
      ]);
      expect(p).not.toBeNull();
      expect(p!.type).toBe('flushStraight');
      expect(p!.isBomb).toBe(true);
    });

    it('joker fills flush straight', () => {
      const p = bestPattern([
        makeNormalCard('spade', 3),
        makeJokerCard('big'),
        makeNormalCard('spade', 5),
      ]);
      expect(p).not.toBeNull();
      expect(p!.type).toBe('flushStraight');
    });
  });

  describe('canBeat', () => {
    it('bomb beats normal', () => {
      const bomb = bestPattern([
        makeNormalCard('spade', 7),
        makeNormalCard('heart', 7),
        makeNormalCard('club', 7),
        makeNormalCard('diamond', 7),
      ])!;
      const single = bestPattern([makeNormalCard('spade', 15)])!;
      expect(canBeat(bomb, single)).toBe(true);
    });

    it('four-of-a-kind beats flush straight', () => {
      const bomb4 = bestPattern([
        makeNormalCard('spade', 7),
        makeNormalCard('heart', 7),
        makeNormalCard('club', 7),
        makeNormalCard('diamond', 7),
      ])!;
      const flush = bestPattern([
        makeNormalCard('spade', 3),
        makeNormalCard('spade', 4),
        makeNormalCard('spade', 5),
        makeNormalCard('spade', 6),
        makeNormalCard('spade', 7),
      ])!;
      expect(canBeat(bomb4, flush)).toBe(true);
    });

    it('higher pair beats lower pair', () => {
      const high = bestPattern([makeNormalCard('spade', 15), makeNormalCard('heart', 15)])!;
      const low = bestPattern([makeNormalCard('spade', 5), makeNormalCard('heart', 5)])!;
      expect(canBeat(high, low)).toBe(true);
      expect(canBeat(low, high)).toBe(false);
    });

    it('different length straights cannot beat each other', () => {
      const s3 = bestPattern([
        makeNormalCard('spade', 3),
        makeNormalCard('heart', 4),
        makeNormalCard('club', 5),
      ])!;
      const s4 = bestPattern([
        makeNormalCard('spade', 3),
        makeNormalCard('heart', 4),
        makeNormalCard('club', 5),
        makeNormalCard('diamond', 6),
      ])!;
      expect(canBeat(s4, s3)).toBe(false);
      expect(canBeat(s3, s4)).toBe(false);
    });

    it('circular straight beats normal of same length', () => {
      const circular = bestPattern([
        makeNormalCard('spade', 14),
        makeNormalCard('heart', 15),
        makeNormalCard('club', 3),
      ])!;
      const normal = bestPattern([
        makeNormalCard('spade', 12),
        makeNormalCard('heart', 13),
        makeNormalCard('club', 14),
      ])!;
      expect(canBeat(circular, normal)).toBe(true);
    });
  });

  describe('countSteals / hasEight', () => {
    it('counts eights', () => {
      expect(countSteals([makeNormalCard('spade', 8), makeNormalCard('heart', 8)])).toBe(2);
    });

    it('detects eight', () => {
      expect(hasEight([makeNormalCard('spade', 8)])).toBe(true);
      expect(hasEight([makeNormalCard('spade', 5)])).toBe(false);
    });
  });
});
