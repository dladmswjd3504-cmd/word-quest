import { gameConfig } from '../config/gameConfig.ts';
import type { CourseProgress, Word } from '../types.ts';
import type { Question } from './questions.ts';
import { sampleWeighted, shuffle, type Rng } from './random.ts';
import { buildMixedQuestions, isWeak, masteryWeight } from './review.ts';

export type BossKind = 'mid' | 'final';

/** 이 Day가 보스전 Day인지 (Day 5, 10, 15 … 중간 / Day 30 최종). 보스전이 아니면 null */
export function bossKindOf(day: number): BossKind | null {
  if (day === gameConfig.boss.finalDay) return 'final';
  if (day > 0 && day % gameConfig.boss.midEveryDays === 0) return 'mid';
  return null;
}

/** 보스전 출제 범위: 중간 보스는 지난 5일(오늘 포함), 최종 보스는 전체 */
export function bossWordPool(day: number, kind: BossKind, words: readonly Word[]): Word[] {
  if (kind === 'final') return words.filter((w) => w.day <= day);
  const from = day - gameConfig.boss.midEveryDays + 1;
  return words.filter((w) => w.day >= from && w.day <= day);
}

/** 약한 단어 중심으로 보스전 단어를 고른다: 약점 단어 우선(최대 절반), 나머지는 숙련도 낮을수록 잘 뽑힘 */
export function selectBossWords(params: {
  day: number;
  kind: BossKind;
  words: readonly Word[];
  progress: CourseProgress;
  rng: Rng;
}): Word[] {
  const { day, kind, words, progress, rng } = params;
  const pool = bossWordPool(day, kind, words);
  const count = Math.min(gameConfig.boss.questions, pool.length);
  const weight = (w: Word) => masteryWeight(w, progress);

  const weakCap = Math.floor(count * gameConfig.weakMaxShare);
  const weak = sampleWeighted(
    pool.filter((w) => isWeak(w, progress)),
    weakCap,
    weight,
    rng,
  );
  const rest = sampleWeighted(
    pool.filter((w) => !weak.includes(w)),
    count - weak.length,
    weight,
    rng,
  );
  return shuffle([...weak, ...rest], rng);
}

export function buildBossRound(params: {
  day: number;
  kind: BossKind;
  words: readonly Word[];
  progress: CourseProgress;
  rng: Rng;
}): Question[] {
  const targets = selectBossWords(params);
  return buildMixedQuestions({ targets, pool: params.words, progress: params.progress, rng: params.rng });
}

/** 보스전 승리 판정: 정답률이 기준(기본 70%) 이상 */
export function isBossPassed(correct: number, total: number): boolean {
  if (total <= 0) return false;
  return correct / total >= gameConfig.boss.passRate - 1e-9;
}
