import type { GameState, VictoryType } from '@pokergame/shared';
import { BENLIU_TOTAL } from '@pokergame/shared';
import { allScoringCollected, allScores, teamScores } from './scoring';

export interface VictoryResult {
  type: VictoryType;
  winnerIndexes: number[];
  scores: number[];
}

/** 检查奔流胜利 */
export function checkBenliuVictory(state: GameState): VictoryResult | null {
  for (const p of state.players) {
    if (p.benliu.length >= BENLIU_TOTAL) {
      return {
        type: 'benliu',
        winnerIndexes: [p.index],
        scores: allScores(state),
      };
    }
  }
  return null;
}

/** 检查分数胜利 */
export function checkScoreVictory(state: GameState): VictoryResult | null {
  if (!allScoringCollected(state)) return null;

  const scores = allScores(state);
  const maxScore = Math.max(...scores);
  const winners = scores
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s === maxScore)
    .map(({ i }) => i);

  return {
    type: 'score',
    winnerIndexes: winners,
    scores,
  };
}

/** 检查 2V2 队伍胜利 */
export function checkTeamVictory(state: GameState): VictoryResult | null {
  // 奔流：队伍任一人集齐
  for (const p of state.players) {
    if (p.benliu.length >= BENLIU_TOTAL) {
      const team = p.index % 2 === 0 ? [0, 2] : [1, 3];
      return {
        type: 'benliu',
        winnerIndexes: team,
        scores: allScores(state),
      };
    }
  }

  // 分数：队伍总分最高
  if (allScoringCollected(state)) {
    const [t0, t1] = teamScores(state);
    const maxTeam = Math.max(t0, t1);
    const winners = maxTeam === t0 ? [0, 2] : [1, 3];
    return {
      type: 'score',
      winnerIndexes: winners,
      scores: allScores(state),
    };
  }

  return null;
}

/** 综合胜利判定 */
export function checkVictory(state: GameState): VictoryResult | null {
  if (state.mode === '2v2') {
    return checkTeamVictory(state);
  }
  return checkBenliuVictory(state) ?? checkScoreVictory(state);
}
