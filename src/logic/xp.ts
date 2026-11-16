import { gameConfig } from '../config/gameConfig.ts';

const { max: MAX_LEVEL, xpBase, xpPerLevel } = gameConfig.level;

/** Lv n → n+1 에 필요한 경험치 */
export function xpToNext(level: number): number {
  return xpBase + xpPerLevel * level;
}

/** 해당 레벨에 도달하기 위한 누적 경험치 */
export function totalXpForLevel(level: number): number {
  let sum = 0;
  for (let n = 1; n < level; n++) sum += xpToNext(n);
  return sum;
}

/** 누적 경험치로 레벨을 계산한다 (최대 레벨에서 멈춤) */
export function levelFromXp(totalXp: number): number {
  let level = 1;
  let remaining = totalXp;
  while (level < MAX_LEVEL && remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  return level;
}

export interface LevelProgress {
  level: number;
  /** 현재 레벨에서 모은 경험치 */
  current: number;
  /** 다음 레벨까지 필요한 경험치 (만렙이면 0) */
  needed: number;
  isMax: boolean;
}

/** 경험치 바 표시용 */
export function levelProgress(totalXp: number): LevelProgress {
  const level = levelFromXp(totalXp);
  const isMax = level >= MAX_LEVEL;
  return {
    level,
    current: totalXp - totalXpForLevel(level),
    needed: isMax ? 0 : xpToNext(level),
    isMax,
  };
}

/** 레벨에 맞는 진화 단계 (1~6) */
export function evolutionOf(level: number): (typeof gameConfig.evolution)[number] {
  let found: (typeof gameConfig.evolution)[number] = gameConfig.evolution[0];
  for (const e of gameConfig.evolution) if (level >= e.minLevel) found = e;
  return found;
}

/** 카드 짝맞추기 속도 보너스: 기준 시간 안이면 최대, 기준의 2배 시간이면 0, 사이는 비례 */
export function matchSpeedBonus(seconds: number): number {
  const { matchSpeedBonusMax: max, matchSpeedBonusFullSec: full } = gameConfig.xp;
  if (seconds <= full) return max;
  if (seconds >= full * 2) return 0;
  return Math.round(max * (1 - (seconds - full) / full));
}
