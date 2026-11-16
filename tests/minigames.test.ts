import { describe, expect, it } from 'vitest';
import { gameConfig } from '../src/config/gameConfig.ts';
import { advanceStep, answerListen, finishMatch, needsQuestions, prepareStep, startMission } from '../src/logic/mission.ts';
import type { ChoiceQuestion, MatchCard } from '../src/logic/questions.ts';
import { createRng } from '../src/logic/random.ts';
import { migrateSave } from '../src/storage/migrate.ts';
import type { SaveData } from '../src/types.ts';
import { fakeWords, newSave } from './helpers.ts';

const T = '2026-11-16';
const words = fakeWords(3);
const day1 = words.filter((w) => w.day === 1);
const save0 = newSave();

/** Day 1 미션을 시작해서 학습을 끝내고 원하는 단계까지 넘어간 저장 데이터 */
function saveAt(step: 'listen' | 'match'): SaveData {
  const save = startMission(newSave(), { course: 'middle', day: 1, dayWords: day1, today: T, rng: createRng(1) });
  let mission = advanceStep(save.currentMission!);
  if (step === 'match') mission = advanceStep(mission);
  return { ...save, currentMission: prepareStep(mission, { dayWords: day1, pool: words, progress: save0.progress.middle, rng: createRng(2) }) };
}

describe('단계 문제 준비', () => {
  it('듣고 맞추기 단계에 들어가면 6문제를 만든다 (유형 A/B 혼합, 오늘 단어에서)', () => {
    const qs = saveAt('listen').currentMission!.questions as ChoiceQuestion[];
    expect(qs).toHaveLength(gameConfig.listen.questions);
    expect(new Set(qs.map((q) => q.mode))).toEqual(new Set(['listen-ko', 'listen-en']));
    expect(qs.every((q) => q.wordId.startsWith('mid-d01-'))).toBe(true);
    expect(qs.every((q) => q.choices.length === 4 && new Set(q.choices).size === 4)).toBe(true);
  });

  it('짝맞추기 단계에 들어가면 6쌍(12장)을 만든다', () => {
    const cards = saveAt('match').currentMission!.questions as MatchCard[];
    expect(cards).toHaveLength(12);
    expect(new Set(cards.map((c) => c.wordId)).size).toBe(6);
  });

  it('이미 문제가 있으면 다시 만들지 않는다 → 앱을 다시 열어도 같은 문제', () => {
    const save = saveAt('listen');
    const reloaded = migrateSave(JSON.parse(JSON.stringify(save)))!;
    expect(needsQuestions(reloaded.currentMission!)).toBe(false);
    const again = prepareStep(reloaded.currentMission!, { dayWords: day1, pool: words, progress: save0.progress.middle, rng: createRng(99) });
    expect(again.questions).toEqual(save.currentMission!.questions);
  });

  it('학습·복습 단계에서는 아무것도 만들지 않는다', () => {
    const save = startMission(newSave(), { course: 'middle', day: 1, dayWords: day1, today: T, rng: createRng(1) });
    const learn = { ...save.currentMission!, questions: [] };
    expect(prepareStep(learn, { dayWords: day1, pool: words, progress: save0.progress.middle, rng: createRng(1) })).toBe(learn);
  });
});

describe('듣고 맞추기 답하기', () => {
  it('정답: 숙련도 +1, 경험치·듣기 통계 증가, 다음 문제로', () => {
    const save = saveAt('listen');
    const q = (save.currentMission!.questions as ChoiceQuestion[])[0];
    const r = answerListen(save, { question: q, choiceIndex: q.answerIndex, today: T });
    expect(r.correct).toBe(true);
    expect(r.save.progress.middle.words[q.wordId].mastery).toBe(1);
    expect(r.save.stats.listenCorrect).toBe(1);
    expect(r.save.currentMission).toMatchObject({ stepIndex: 1, earnedXp: gameConfig.xp.listenCorrect });
  });

  it('오답: 약점 단어로 기록, 경험치 없음, 다음 문제로', () => {
    const save = saveAt('listen');
    const q = (save.currentMission!.questions as ChoiceQuestion[])[0];
    const r = answerListen(save, { question: q, choiceIndex: (q.answerIndex + 1) % 4, today: T });
    expect(r.correct).toBe(false);
    expect(r.save.progress.middle.words[q.wordId]).toMatchObject({ weak: true, wrongCount: 1 });
    expect(r.save.stats.listenCorrect).toBe(0);
    expect(r.save.currentMission).toMatchObject({ stepIndex: 1, earnedXp: 0 });
  });
});

describe('카드 짝맞추기 끝내기', () => {
  it('틀린 횟수에 따라 숙련도·약점을 반영하고 경험치·통계를 준다', () => {
    const save = saveAt('match');
    const ids = [...new Set((save.currentMission!.questions as MatchCard[]).map((c) => c.wordId))];
    const r = finishMatch(save, { wrongCounts: { [ids[0]]: 1, [ids[1]]: 2 }, seconds: 30, today: T });
    const wp = r.save.progress.middle.words;
    expect(wp[ids[0]]?.mastery ?? 0).toBe(0); // 1번 틀림 → 변화 없음
    expect(wp[ids[1]]).toMatchObject({ weak: true }); // 2번 틀림 → 약점
    expect(wp[ids[2]].mastery).toBe(1); // 안 틀림 → 정답 처리
    expect(r.summary).toEqual({
      xp: gameConfig.xp.matchComplete + gameConfig.xp.matchSpeedBonusMax,
      speedBonus: gameConfig.xp.matchSpeedBonusMax,
      seconds: 30,
      weakWordIds: [ids[1]],
    });
    expect(r.save.stats.matchPlays).toBe(1);
    expect(r.save.currentMission).toMatchObject({ step: 'match', stepIndex: 1, earnedXp: r.summary.xp });
  });

  it('이미 끝낸 판은 다시 기록하지 않는다', () => {
    const first = finishMatch(saveAt('match'), { wrongCounts: {}, seconds: 30, today: T }).save;
    const second = finishMatch(first, { wrongCounts: {}, seconds: 30, today: T });
    expect(second.save).toBe(first);
    expect(second.summary.xp).toBe(0);
  });

  it('오래 걸리면 속도 보너스가 없다', () => {
    const r = finishMatch(saveAt('match'), { wrongCounts: {}, seconds: 999, today: T });
    expect(r.summary).toMatchObject({ speedBonus: 0, xp: gameConfig.xp.matchComplete });
  });
});
