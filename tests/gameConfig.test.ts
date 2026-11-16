import { describe, expect, it } from 'vitest';
import { gameConfig } from '../src/config/gameConfig.ts';

describe('gameConfig', () => {
  it('진화 단계는 Lv 1부터 시작하고 레벨 오름차순이며 최대 레벨을 넘지 않는다', () => {
    const levels = gameConfig.evolution.map((e) => e.minLevel);
    expect(levels[0]).toBe(1);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
    expect(Math.max(...levels)).toBeLessThanOrEqual(gameConfig.level.max);
  });

  it('누적 경험치 곡선이 PRD 부록 A 표와 일치한다', () => {
    const { xpBase, xpPerLevel } = gameConfig.level;
    const cumulativeTo = (level: number) => {
      let sum = 0;
      for (let n = 1; n < level; n++) sum += xpBase + xpPerLevel * n;
      return sum;
    };
    expect(cumulativeTo(5)).toBe(260);
    expect(cumulativeTo(10)).toBe(810);
    expect(cumulativeTo(15)).toBe(1610);
    expect(cumulativeTo(20)).toBe(2660);
    expect(cumulativeTo(30)).toBe(5510);
  });

  it('보스전 통과 기준은 0~1 사이 비율이다', () => {
    expect(gameConfig.boss.passRate).toBeGreaterThan(0);
    expect(gameConfig.boss.passRate).toBeLessThanOrEqual(1);
  });
});
