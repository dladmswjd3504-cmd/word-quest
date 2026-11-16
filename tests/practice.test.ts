import { describe, expect, it } from 'vitest';
import { gameConfig } from '../src/config/gameConfig.ts';
import {
  buildDex,
  buildPracticeRound,
  finishPractice,
  learnedWords,
  needsBackupReminder,
  PRACTICE_QUESTIONS,
  recordPracticeAnswer,
  switchCourse,
  weakWords,
} from '../src/logic/practice.ts';
import type { Question } from '../src/logic/questions.ts';
import { createRng } from '../src/logic/random.ts';
import { TITLES } from '../src/logic/titles.ts';
import type { SaveData, WordProgress } from '../src/types.ts';
import { fakeWords, newSave } from './helpers.ts';

const T = '2026-11-16';
const WORDS = fakeWords(5);
const wp = (over: Partial<WordProgress> = {}): WordProgress => ({
  mastery: 0, spellingStage: 1, streak: 0, wrongCount: 0, weak: false, weakStreak: 0, lastSeenDate: T, ...over,
});

/** Day 1~2 완료, Day 3 단어 하나를 미션 중에 만남, 약점 단어 2개 */
function playedSave(): SaveData {
  const save = newSave();
  save.progress.middle.completedDays = [1, 2];
  save.progress.middle.words = {
    'mid-d01-01': wp({ weak: true, wrongCount: 2 }),
    'mid-d02-05': wp({ weak: true, wrongCount: 1 }),
    'mid-d01-02': wp({ mastery: 5 }),
    'mid-d03-01': wp(),
  };
  return save;
}

describe('자유 복습 게임', () => {
  it('배운 단어 = 완료한 Day 단어 + 미션 중 만난 단어', () => {
    const learned = learnedWords(WORDS, playedSave().progress.middle).map((w) => w.id);
    expect(learned).toHaveLength(21);
    expect(learned).toContain('mid-d03-01');
    expect(learned).not.toContain('mid-d03-02');
  });

  it('복습 퀴즈는 배운 단어에서만 10문제, 약점 복습은 약점 단어만', () => {
    const p = playedSave().progress.middle;
    const learned = new Set(learnedWords(WORDS, p).map((w) => w.id));
    const review = buildPracticeRound('review', WORDS, p, createRng(1));
    expect(review).toHaveLength(PRACTICE_QUESTIONS);
    expect(review.every((q) => learned.has(q.wordId))).toBe(true);

    const weak = buildPracticeRound('weak', WORDS, p, createRng(1));
    expect(weak.map((q) => q.wordId).sort()).toEqual(['mid-d01-01', 'mid-d02-05']);
    expect(weakWords(WORDS, p)).toHaveLength(2);
  });

  it('아무것도 안 배웠으면 문제가 없다', () => {
    expect(buildPracticeRound('review', WORDS, newSave().progress.middle, createRng(1))).toEqual([]);
  });

  it('복습 게임 정답은 숙련도·약점에 반영되고 경험치는 없다', () => {
    let save = playedSave();
    const q: Question = { kind: 'choice', mode: 'listen-ko', wordId: 'mid-d01-01', choices: [], answerIndex: 0 };
    save = recordPracticeAnswer(save, { course: 'middle', question: q, wordId: 'mid-d01-01', correct: true, today: T });
    save = recordPracticeAnswer(save, { course: 'middle', question: q, wordId: 'mid-d01-01', correct: true, today: T });
    expect(save.progress.middle.words['mid-d01-01']).toMatchObject({ weak: false, mastery: 2 });
    expect(save.stats.weakConquered).toBe(1);
    expect(save.player.xp).toBe(0);
  });

  it('철자 문제는 스펠링 단계에도 반영된다', () => {
    const q: Question = { kind: 'spelling', wordId: 'mid-d01-02', stage: 1, tiles: [] };
    const save = recordPracticeAnswer(playedSave(), { course: 'middle', question: q, wordId: 'mid-d01-02', correct: true, today: T });
    expect(save.progress.middle.words['mid-d01-02'].streak).toBe(1);
  });

  it('오늘 이 과정을 클리어한 뒤에만 "클리어 후 복습" 횟수가 오르고, 칭호도 지급된다', () => {
    const before = playedSave();
    expect(finishPractice(before, 'middle', T).save.stats.reviewPlaysAfterClear).toBe(0);

    const cleared = playedSave();
    cleared.progress.middle.lastClearDate = T;
    cleared.stats.reviewPlaysAfterClear = gameConfig.titles.reviewMaster - 1;
    const r = finishPractice(cleared, 'middle', T);
    expect(r.save.stats.reviewPlaysAfterClear).toBe(gameConfig.titles.reviewMaster);
    expect(r.newTitles).toContain('review-master');
    expect(r.save.player.titles).toContain('review-master');
  });
});

describe('설정', () => {
  it('과정을 바꿔도 레벨·경험치·골드·칭호는 그대로, 진도는 과정별로 따로', () => {
    const save = playedSave();
    save.player = { ...save.player, xp: 300, level: 5, gold: 90, titles: ['first-adventure'] };
    const high = switchCourse(save, 'high');
    expect(high.settings.course).toBe('high');
    expect(high.player).toEqual(save.player);
    expect(high.progress.high.completedDays).toEqual([]);
    expect(switchCourse(high, 'middle').progress.middle.completedDays).toEqual([1, 2]);
  });

  it('백업 알림: 마지막 백업(없으면 첫 출석) 후 설정 일수가 지나면', () => {
    const save = newSave();
    expect(needsBackupReminder(save, T)).toBe(false); // 아직 플레이 안 함
    save.player.attendanceDates = ['2026-11-10'];
    expect(needsBackupReminder(save, '2026-11-14')).toBe(false);
    expect(needsBackupReminder(save, '2026-11-15')).toBe(true);
    save.lastBackupDate = '2026-11-14';
    expect(needsBackupReminder(save, '2026-11-15')).toBe(false);
  });
});

describe('도감·업적', () => {
  it('도감은 Day별로 묶고 배우지 않은 단어는 잠근다', () => {
    const dex = buildDex(WORDS, playedSave().progress.middle);
    expect(dex.map((d) => d.day)).toEqual([1, 2, 3, 4, 5]);
    expect(dex.map((d) => d.unlockedCount)).toEqual([10, 10, 1, 0, 0]);
    const first = dex[0].words.find((e) => e.word.id === 'mid-d01-01')!;
    expect(first).toMatchObject({ unlocked: true, weak: true });
  });

  it('횟수형 칭호는 진행도를 보여 준다 (목표에서 멈춤)', () => {
    const save = newSave();
    save.stats.listenCorrect = 37;
    save.stats.matchPlays = 999;
    const listen = TITLES.find((t) => t.id === 'listen-master')!;
    const match = TITLES.find((t) => t.id === 'match-doctor')!;
    expect(listen.progress!(save)).toEqual({ current: 37, target: gameConfig.titles.listenMaster });
    expect(match.progress!(save)).toEqual({ current: gameConfig.titles.matchDoctor, target: gameConfig.titles.matchDoctor });
  });
});
