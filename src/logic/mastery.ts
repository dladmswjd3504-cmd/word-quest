import { gameConfig } from '../config/gameConfig.ts';
import type { SpellingStage, WordProgress } from '../types.ts';

const M = gameConfig.mastery;

export function createWordProgress(): WordProgress {
  return { mastery: 0, spellingStage: 1, streak: 0, wrongCount: 0, weak: false, weakStreak: 0, lastSeenDate: '' };
}

export function isMastered(wp: WordProgress | undefined): boolean {
  return (wp?.mastery ?? 0) >= M.masteredAt;
}

export interface AnswerResult {
  next: WordProgress;
  /** 이번 정답으로 약점에서 벗어났는지 ("약점 정복" 카운트용) */
  conqueredWeak: boolean;
}

/**
 * 모든 문제(듣기·짝맞추기·스펠링·복습·보스)의 정답/오답을 숙련도와 약점에 반영한다 (PRD 4.3).
 * - 정답 mastery +1, 오답 mastery -2 (0~5)
 * - 오답이면 약점 단어로 표시
 * - 약점 단어를 연속 2회 맞히면 약점 해제
 */
export function applyAnswer(prev: WordProgress | undefined, correct: boolean, today: string): AnswerResult {
  const wp = { ...(prev ?? createWordProgress()), lastSeenDate: today };
  if (!correct) {
    return {
      next: {
        ...wp,
        mastery: clamp(wp.mastery + M.onWrong, 0, M.max),
        wrongCount: wp.wrongCount + 1,
        weak: true,
        weakStreak: 0,
      },
      conqueredWeak: false,
    };
  }

  const mastery = clamp(wp.mastery + M.onCorrect, 0, M.max);
  if (!wp.weak) return { next: { ...wp, mastery }, conqueredWeak: false };

  const weakStreak = wp.weakStreak + 1;
  if (weakStreak >= M.weakClearStreak) {
    return { next: { ...wp, mastery, weak: false, weakStreak: 0 }, conqueredWeak: true };
  }
  return { next: { ...wp, mastery, weakStreak }, conqueredWeak: false };
}

/**
 * 카드 짝맞추기 한 판의 결과를 단어에 반영한다.
 * 틀린 횟수 0 → 정답 처리, 1 → 변화 없음, 2 이상 → 오답 처리(약점 기록)
 */
export function applyMatchResult(prev: WordProgress | undefined, wrongTimes: number, today: string): AnswerResult {
  if (wrongTimes >= M.matchWrongToWeak) return applyAnswer(prev, false, today);
  if (wrongTimes === 0) return applyAnswer(prev, true, today);
  return { next: { ...(prev ?? createWordProgress()), lastSeenDate: today }, conqueredWeak: false };
}

/**
 * 스펠링 단계 규칙 (PRD 4.1)
 * - 1단계: 연속 3회 정답 → 2단계 / 오답이면 연속 기록만 초기화
 * - 2단계: 연속 3회 정답 → 3단계 / 오답 → 1단계로
 * - 3단계: 오답 → 2단계로
 * 단계가 바뀌면 streak은 0으로 초기화한다.
 */
export function applySpelling(prev: WordProgress | undefined, correct: boolean): WordProgress {
  const wp = prev ?? createWordProgress();
  const need = gameConfig.spelling.streakToAdvance;

  if (!correct) {
    const down: SpellingStage = wp.spellingStage === 3 ? 2 : 1;
    return { ...wp, spellingStage: down, streak: 0 };
  }
  const streak = wp.streak + 1;
  if (wp.spellingStage < 3 && streak >= need) {
    return { ...wp, spellingStage: (wp.spellingStage + 1) as SpellingStage, streak: 0 };
  }
  return { ...wp, streak };
}

/** 스펠링 정답 판정: 대소문자 무시, 앞뒤 공백 무시 */
export function isSpellingCorrect(input: string, answer: string): boolean {
  return input.trim().toLowerCase() === answer.trim().toLowerCase();
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
