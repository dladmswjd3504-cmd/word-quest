import { describe, expect, it } from 'vitest';
import { evolutionOf, levelFromXp, levelProgress, matchSpeedBonus, totalXpForLevel, xpToNext } from '../src/logic/xp.ts';

describe('경험치·레벨', () => {
  it('xpToNext(n) = 40 + 10n', () => {
    expect(xpToNext(1)).toBe(50);
    expect(xpToNext(29)).toBe(330);
  });

  it('누적 경험치 경계에서 정확히 레벨업한다', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(49)).toBe(1);
    expect(levelFromXp(50)).toBe(2);
    expect(levelFromXp(259)).toBe(4);
    expect(levelFromXp(260)).toBe(5);
    expect(levelFromXp(totalXpForLevel(30))).toBe(30);
  });

  it('최대 레벨 30을 넘지 않는다', () => {
    expect(levelFromXp(1_000_000)).toBe(30);
    expect(levelProgress(1_000_000)).toMatchObject({ level: 30, isMax: true, needed: 0 });
  });

  it('경험치 바: 현재 레벨에서 모은 양과 필요한 양', () => {
    expect(levelProgress(270)).toEqual({ level: 5, current: 10, needed: 90, isMax: false });
  });
});

describe('진화 단계', () => {
  it.each([
    [1, 1], [4, 1], [5, 2], [9, 2], [10, 3], [15, 3],
    [16, 4], [21, 4], [22, 5], [27, 5], [28, 6], [30, 6],
  ])('Lv %i → %i단계', (level, stage) => {
    expect(evolutionOf(level).stage).toBe(stage);
  });
});

describe('짝맞추기 속도 보너스', () => {
  it('40초 이내 최대 5, 80초 이상 0, 사이는 비례', () => {
    expect(matchSpeedBonus(10)).toBe(5);
    expect(matchSpeedBonus(40)).toBe(5);
    expect(matchSpeedBonus(60)).toBe(3);
    expect(matchSpeedBonus(80)).toBe(0);
    expect(matchSpeedBonus(500)).toBe(0);
  });
});
