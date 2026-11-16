import { gameConfig } from '../config/gameConfig.ts';
import type { Course, CourseProgress, SaveData, Word } from '../types.ts';
import { daysBetween } from './date.ts';
import { recordAnswer, recordSpelling } from './progress.ts';
import type { Question } from './questions.ts';
import { sampleWeighted, type Rng } from './random.ts';
import { buildMixedQuestions, isWeak, masteryWeight } from './review.ts';
import { grantTitles } from './titles.ts';

/**
 * 자유 복습 게임 (PRD 3.2, 4.6): 경험치는 없고 숙련도·약점·"복습 마스터" 통계에만 반영된다.
 * - review: 지금까지 배운 단어에서 숙련도 낮은 단어 위주
 * - weak: 약점 단어 노트에서
 */
export type PracticeKind = 'review' | 'weak';

/** 한 판 문제 수 (복습 퀴즈 최대 문제 수와 같게) */
export const PRACTICE_QUESTIONS = gameConfig.review.maxQuestions;

/** 한 번이라도 만난 단어 (완료한 Day의 단어 + 미션 중에 답해 본 단어) */
export function learnedWords(words: readonly Word[], progress: CourseProgress): Word[] {
  const done = new Set(progress.completedDays);
  return words.filter((w) => done.has(w.day) || progress.words[w.id] !== undefined);
}

export function weakWords(words: readonly Word[], progress: CourseProgress): Word[] {
  return words.filter((w) => isWeak(w, progress));
}

export function practiceTargets(kind: PracticeKind, words: readonly Word[], progress: CourseProgress, rng: Rng): Word[] {
  const pool = kind === 'weak' ? weakWords(words, progress) : learnedWords(words, progress);
  return sampleWeighted(pool, PRACTICE_QUESTIONS, (w) => masteryWeight(w, progress), rng);
}

export function buildPracticeRound(kind: PracticeKind, words: readonly Word[], progress: CourseProgress, rng: Rng): Question[] {
  const targets = practiceTargets(kind, words, progress, rng);
  return buildMixedQuestions({ targets, pool: words, progress, rng });
}

/** 복습 게임 한 문제 결과 (철자 문제는 스펠링 단계에도 반영) */
export function recordPracticeAnswer(
  save: SaveData,
  params: { course: Course; question: Question; wordId: string; correct: boolean; today: string },
): SaveData {
  const { course, question, wordId, correct, today } = params;
  return question.kind === 'spelling'
    ? recordSpelling(save, course, wordId, correct, today)
    : recordAnswer(save, course, wordId, correct, today);
}

/**
 * 복습 게임 한 판을 끝냈다. 오늘 이 과정을 클리어한 뒤라면 "클리어 후 복습" 횟수 +1.
 * 약점 정복 등으로 새로 달성한 칭호도 지급한다.
 */
export function finishPractice(save: SaveData, course: Course, today: string): { save: SaveData; newTitles: string[] } {
  const afterClear = save.progress[course].lastClearDate === today;
  const counted = afterClear
    ? { ...save, stats: { ...save.stats, reviewPlaysAfterClear: save.stats.reviewPlaysAfterClear + 1 } }
    : save;
  return grantTitles(counted);
}

// ── 설정 ──

/** 과정 전환 (PRD 4.9): 진도·숙련도·약점은 과정별로 따로, 레벨·경험치·골드·칭호는 공유 */
export function switchCourse(save: SaveData, course: Course): SaveData {
  return { ...save, settings: { ...save.settings, course } };
}

/** 마지막 백업 후 며칠이 지나 백업을 권할 때인지 (한 번도 안 했으면 첫 출석일 기준) */
export function needsBackupReminder(save: SaveData, today: string): boolean {
  const base = save.lastBackupDate ?? save.player.attendanceDates[0] ?? null;
  if (!base) return false;
  return daysBetween(base, today) >= gameConfig.backupReminderDays;
}

// ── 도감 ──

export interface DexDay {
  day: number;
  words: { word: Word; unlocked: boolean; mastery: number; weak: boolean }[];
  /** 이 Day에서 열린 단어 수 */
  unlockedCount: number;
}

/** 단어 도감: Day별로 묶고, 아직 배우지 않은 단어는 잠금 (PRD 4.6) */
export function buildDex(words: readonly Word[], progress: CourseProgress): DexDay[] {
  const learned = new Set(learnedWords(words, progress).map((w) => w.id));
  const days = new Map<number, DexDay>();
  for (const w of words) {
    const entry = days.get(w.day) ?? { day: w.day, words: [], unlockedCount: 0 };
    const wp = progress.words[w.id];
    const unlocked = learned.has(w.id);
    entry.words.push({ word: w, unlocked, mastery: wp?.mastery ?? 0, weak: wp?.weak ?? false });
    if (unlocked) entry.unlockedCount++;
    days.set(w.day, entry);
  }
  return [...days.values()].sort((a, b) => a.day - b.day);
}
