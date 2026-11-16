import { gameConfig } from '../config/gameConfig.ts';
import type { CourseProgress, Word } from '../types.ts';
import { buildChoiceQuestion, buildSpellingQuestion, type Question } from './questions.ts';
import { sampleWeighted, shuffle, type Rng } from './random.ts';

const MAX_MASTERY = gameConfig.mastery.max;

/** 숙련도가 낮을수록 자주 나오게 하는 가중치 (mastery 0 → 6, 5 → 1) */
export function masteryWeight(word: Word, progress: CourseProgress): number {
  const m = progress.words[word.id]?.mastery ?? 0;
  return MAX_MASTERY + 1 - m;
}

export function isWeak(word: Word, progress: CourseProgress): boolean {
  return progress.words[word.id]?.weak === true;
}

/** 오늘이 Day N이면 복습할 Day 번호들 (N-1, N-3, N-7 중 1 이상인 것) */
export function reviewDayNumbers(day: number): number[] {
  return gameConfig.review.intervals.map((i) => day - i).filter((d) => d >= 1);
}

/**
 * 복습 퀴즈에 낼 단어를 고른다 (PRD 4.3).
 * 1) 약점 단어를 우선 (최대 절반)
 * 2) N-1, N-3, N-7 Day에서 번갈아 하나씩 (숙련도 낮은 단어일수록 잘 뽑힘)
 * 3) Day 1~2처럼 복습 대상이 적으면 오늘 단어로 채운다
 */
export function selectReviewWords(params: {
  day: number;
  words: readonly Word[];
  progress: CourseProgress;
  rng: Rng;
}): Word[] {
  const { day, words, progress, rng } = params;
  const { minQuestions, maxQuestions } = gameConfig.review;
  const weight = (w: Word) => masteryWeight(w, progress);

  const groups = reviewDayNumbers(day).map((d) => words.filter((w) => w.day === d));
  if (day <= 2) groups.push(words.filter((w) => w.day === day));

  const available = words.filter((w) => w.day <= day);
  const count = Math.min(maxQuestions, available.length);
  const picked = new Set<Word>();

  // 1) 약점 단어 우선
  const weakCap = Math.floor(count * gameConfig.weakMaxShare);
  const weak = available.filter((w) => isWeak(w, progress));
  for (const w of sampleWeighted(weak, weakCap, weight, rng)) picked.add(w);

  // 2) 복습 Day에서 번갈아 하나씩
  const remaining = groups.map((g) => g.filter((w) => !picked.has(w)));
  let progressed = true;
  while (picked.size < count && progressed) {
    progressed = false;
    for (const group of remaining) {
      if (picked.size >= count) break;
      const candidates = group.filter((w) => !picked.has(w));
      const [w] = sampleWeighted(candidates, 1, weight, rng);
      if (w) {
        picked.add(w);
        progressed = true;
      }
    }
  }

  // 3) 최소 문제 수에 못 미치면 지금까지 배운 단어 전체에서 채운다
  if (picked.size < Math.min(minQuestions, available.length)) {
    const rest = available.filter((w) => !picked.has(w));
    for (const w of sampleWeighted(rest, minQuestions - picked.size, weight, rng)) picked.add(w);
  }

  return shuffle([...picked], rng);
}

/** 단어 목록을 듣고 맞추기 A/B + 철자 입력이 섞인 문제로 만든다 (복습 퀴즈·보스전 공용) */
export function buildMixedQuestions(params: {
  targets: readonly Word[];
  pool: readonly Word[];
  progress: CourseProgress;
  rng: Rng;
}): Question[] {
  const { targets, pool, progress, rng } = params;
  const kinds = ['listen-ko', 'listen-en', 'spelling'] as const;
  const order = shuffle(
    targets.map((_, i) => kinds[i % kinds.length]),
    rng,
  );
  return targets.map((w, i) => {
    const kind = order[i];
    if (kind === 'spelling') {
      const stage = progress.words[w.id]?.spellingStage ?? 1;
      return buildSpellingQuestion(w, stage, rng);
    }
    return buildChoiceQuestion(w, kind, pool, rng);
  });
}

export function buildReviewRound(params: {
  day: number;
  words: readonly Word[];
  progress: CourseProgress;
  rng: Rng;
}): Question[] {
  const targets = selectReviewWords(params);
  return buildMixedQuestions({ targets, pool: params.words, progress: params.progress, rng: params.rng });
}
