import { describe, expect, it } from 'vitest';
import { gameConfig } from '../src/config/gameConfig.ts';
import {
  advanceStep,
  answerListen,
  answerQuiz,
  bossResult,
  finishMatch,
  finishMission,
  prepareStep,
  retryBoss,
  startMission,
  type FinishMissionResult,
} from '../src/logic/mission.ts';
import { getDayStatus, recordSpelling } from '../src/logic/progress.ts';
import type { ChoiceQuestion, Question, SpellingQuestion } from '../src/logic/questions.ts';
import { createRng } from '../src/logic/random.ts';
import { levelFromXp } from '../src/logic/xp.ts';
import { migrateSave } from '../src/storage/migrate.ts';
import type { Course, SaveData, Word } from '../src/types.ts';
import { fakeWords, newSave } from './helpers.ts';

const WORDS: Record<Course, Word[]> = { middle: fakeWords(5, 'middle'), high: fakeWords(5, 'high') };
const DATES = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'];
const wordById = (course: Course, id: string) => WORDS[course].find((w) => w.id === id)!;

/** 다음 단계로 넘어가고 그 단계의 문제를 만든다 (화면에서 하는 일과 같음) */
function nextStep(save: SaveData, course: Course, seed: number): SaveData {
  const mission = advanceStep(save.currentMission!);
  const dayWords = WORDS[course].filter((w) => w.day === mission.day);
  return {
    ...save,
    currentMission: prepareStep(mission, { dayWords, pool: WORDS[course], progress: save.progress[course], rng: createRng(seed) }),
  };
}

/** 복습·보스 문제를 모두 푼다. right=true면 전부 정답, false면 전부 오답 */
function answerAll(save: SaveData, course: Course, date: string, right: boolean): SaveData {
  let sv = save;
  for (const q of sv.currentMission!.questions as Question[]) {
    const word = wordById(course, q.wordId);
    const answer = q.kind === 'spelling' ? (right ? word.en : 'zzz') : right ? q.answerIndex : (q.answerIndex + 1) % 4;
    sv = answerQuiz(sv, { question: q, answer, word, today: date }).save;
  }
  return sv;
}

/** 하루 미션을 마지막 단계(복습/보스) 직전까지 진행: 학습 → 듣기(전부 정답) → 짝맞추기(실수 없음) */
function playUntilLastStep(save: SaveData, course: Course, day: number, date: string): SaveData {
  const dayWords = WORDS[course].filter((w) => w.day === day);
  let sv = startMission(save, { course, day, dayWords, today: date, rng: createRng(day) });
  for (const q of sv.currentMission!.questions as SpellingQuestion[]) sv = recordSpelling(sv, course, q.wordId, true, date);
  sv = nextStep(sv, course, day * 10 + 1); // 듣기
  for (const q of sv.currentMission!.questions as ChoiceQuestion[]) {
    sv = answerListen(sv, { question: q, choiceIndex: q.answerIndex, today: date }).save;
  }
  sv = nextStep(sv, course, day * 10 + 2); // 짝맞추기
  sv = finishMatch(sv, { wrongCounts: {}, seconds: 30, today: date }).save;
  return nextStep(sv, course, day * 10 + 3); // 복습 or 보스
}

function cleared(r: FinishMissionResult) {
  if (!r.ok) throw new Error(`클리어 실패: ${r.reason}`);
  return r;
}

describe('5일 시뮬레이션 (M5 완료 기준)', () => {
  it('Day 1~4 복습 퀴즈, Day 5 중간 보스전(한 번 지고 재도전 후 승리)까지 규칙대로 보상된다', () => {
    let save = newSave();
    const gained: number[] = [];

    for (let day = 1; day <= 4; day++) {
      const date = DATES[day - 1];
      save = playUntilLastStep(save, 'middle', day, date);
      expect(save.currentMission!.step).toBe('review');
      const reviewCount = save.currentMission!.questions.length;
      expect(reviewCount).toBeGreaterThanOrEqual(gameConfig.review.minQuestions);
      save = answerAll(save, 'middle', date, true);

      const r = cleared(finishMission(save, date));
      save = r.save;
      const expectedXp =
        gameConfig.xp.dailyClear +
        gameConfig.listen.questions * gameConfig.xp.listenCorrect +
        gameConfig.xp.matchComplete +
        gameConfig.xp.matchSpeedBonusMax +
        reviewCount * gameConfig.xp.reviewCorrect;
      expect(r.result.xpGained).toBe(expectedXp);
      expect(r.result.goldGained).toBe(gameConfig.gold.dailyClear);
      expect(save.currentMission).toBeNull();
      expect(getDayStatus(save.progress.middle, date, 5)).toEqual({ kind: 'clearedToday', nextDay: day + 1 });
      gained.push(r.result.xpGained);
      if (day === 1) expect(r.result.newTitles).toContain('first-adventure');
    }

    // Day 5: 보스전
    const date5 = DATES[4];
    save = playUntilLastStep(save, 'middle', 5, date5);
    expect(save.currentMission!.step).toBe('boss');
    expect(save.currentMission!.questions).toHaveLength(gameConfig.boss.questions);

    // 1) 모두 틀려서 패배 → 클리어 불가, 벌점 없이 다시 도전
    const xpBeforeBoss = save.player.xp;
    save = answerAll(save, 'middle', date5, false);
    expect(bossResult(save.currentMission!)).toMatchObject({ correct: 0, passed: false, needed: 7 });
    const lost = finishMission(save, date5);
    expect(lost).toMatchObject({ ok: false, reason: 'bossNotWon' });
    expect(lost.save.player.xp).toBe(xpBeforeBoss);
    expect(lost.save.currentMission).not.toBeNull();

    const retried = retryBoss(save.currentMission!, { pool: WORDS.middle, progress: save.progress.middle, rng: createRng(77) });
    expect(retried).toMatchObject({ step: 'boss', stepIndex: 0, correctCount: 0 });
    expect(retried.questions).toHaveLength(gameConfig.boss.questions);
    save = { ...save, currentMission: retried };

    // 2) 재도전 승리
    save = answerAll(save, 'middle', date5, true);
    const r5 = cleared(finishMission(save, date5));
    save = r5.save;
    expect(r5.result).toMatchObject({ bossKind: 'mid', bossRewarded: true, newEquipment: ['wooden-shield'] });
    expect(r5.result.newTitles).toContain('mid-boss-slayer');
    expect(r5.result.xpGained).toBe(
      gameConfig.xp.dailyClear +
        gameConfig.listen.questions * gameConfig.xp.listenCorrect +
        gameConfig.xp.matchComplete +
        gameConfig.xp.matchSpeedBonusMax +
        gameConfig.xp.midBossWin,
    );
    gained.push(r5.result.xpGained);

    // 최종 상태
    const total = gained.reduce((a, b) => a + b, 0);
    expect(save.player.xp).toBe(total);
    expect(save.player.level).toBe(levelFromXp(total));
    expect(save.player.level).toBeGreaterThan(1);
    expect(save.player.gold).toBe(gameConfig.gold.dailyClear * 5 + gameConfig.gold.bossWin);
    expect(save.player.totalAttendanceDays).toBe(5);
    expect(save.player.equipment).toEqual(['wooden-shield']);
    expect(save.progress.middle.completedDays).toEqual([1, 2, 3, 4, 5]);
    expect(save.progress.middle.bossWins).toEqual([5]);
    expect(getDayStatus(save.progress.middle, date5, 5)).toEqual({ kind: 'clearedToday', nextDay: 6 });
    expect(getDayStatus(save.progress.middle, '2026-11-21', 5)).toEqual({ kind: 'allDone', lastDay: 5 });
  });

  it('보스전 도중 앱을 다시 열어도 맞힌 수가 유지된다', () => {
    let save = newSave();
    for (let day = 1; day <= 4; day++) {
      save = cleared(finishMission(answerAll(playUntilLastStep(save, 'middle', day, DATES[day - 1]), 'middle', DATES[day - 1], true), DATES[day - 1])).save;
    }
    save = playUntilLastStep(save, 'middle', 5, DATES[4]);
    const qs = save.currentMission!.questions as Question[];
    for (const q of qs.slice(0, 4)) {
      const word = wordById('middle', q.wordId);
      save = answerQuiz(save, { question: q, answer: q.kind === 'spelling' ? word.en : q.answerIndex, word, today: DATES[4] }).save;
    }
    const reloaded = migrateSave(JSON.parse(JSON.stringify(save)))!;
    expect(reloaded.currentMission).toMatchObject({ step: 'boss', stepIndex: 4, correctCount: 4 });
  });

  it('같은 날 두 번째 과정을 클리어하면 진도는 오르지만 경험치·골드는 없다', () => {
    const date = DATES[0];
    let save = cleared(finishMission(answerAll(playUntilLastStep(newSave(), 'middle', 1, date), 'middle', date, true), date)).save;
    const xp = save.player.xp;
    save = { ...save, settings: { ...save.settings, course: 'high' } };
    const r = cleared(finishMission(answerAll(playUntilLastStep(save, 'high', 1, date), 'high', date, true), date));
    expect(r.result).toMatchObject({ rewardEligible: false, xpGained: 0, goldGained: 0 });
    expect(r.save.player.xp).toBe(xp);
    expect(r.save.progress.high.completedDays).toEqual([1]);
    expect(r.save.player.totalAttendanceDays).toBe(1);
  });

  it('복습 퀴즈 오답은 약점으로 기록되고, 철자 문제는 스펠링 단계에도 반영된다', () => {
    const date = DATES[0];
    let save = playUntilLastStep(newSave(), 'middle', 1, date);
    const qs = save.currentMission!.questions as Question[];
    const spelling = qs.find((q) => q.kind === 'spelling')!;
    const choice = qs.find((q) => q.kind === 'choice')!;
    const sw = wordById('middle', spelling.wordId);
    const cw = wordById('middle', choice.wordId);
    save = answerQuiz(save, { question: spelling, answer: 'nope', word: sw, today: date }).save;
    save = answerQuiz(save, { question: choice, answer: (choice.answerIndex + 1) % 4, word: cw, today: date }).save;
    expect(save.progress.middle.words[sw.id]).toMatchObject({ weak: true, streak: 0 });
    expect(save.progress.middle.words[cw.id]).toMatchObject({ weak: true });
    expect(save.currentMission).toMatchObject({ stepIndex: 2, correctCount: 0 });
  });
});
