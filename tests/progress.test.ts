import { describe, expect, it } from 'vitest';
import { pickPhrase } from '../src/logic/feedback.ts';
import { completeMission, getDayStatus, nextDayOf, recordAnswer, recordSpelling } from '../src/logic/progress.ts';
import { createRng } from '../src/logic/random.ts';
import { grantTitles } from '../src/logic/titles.ts';
import { createEmptyCourseProgress } from '../src/storage/save.ts';
import type { SaveData } from '../src/types.ts';
import { newSave } from './helpers.ts';

const D1 = '2026-11-16';
const D2 = '2026-11-17';

function clear(save: SaveData, course: 'middle' | 'high', today: string, missionXp = 0, bossWon?: boolean) {
  const day = nextDayOf(save.progress[course]);
  const r = completeMission(save, { course, day, missionXp, bossWon }, today);
  if (!r.ok) throw new Error(r.reason);
  return r;
}

describe('진도 상태 (PRD 3.3)', () => {
  it('완료한 Day 다음부터 이어진다 (날짜와 무관)', () => {
    const p = createEmptyCourseProgress();
    expect(nextDayOf(p)).toBe(1);
    p.completedDays = [1, 2, 3, 4, 5];
    expect(getDayStatus(p, '2026-12-25', 30)).toEqual({ kind: 'ready', day: 6 });
  });

  it('오늘 이미 클리어했으면 clearedToday', () => {
    const p = { ...createEmptyCourseProgress(), completedDays: [1], lastClearDate: D1 };
    expect(getDayStatus(p, D1, 30)).toEqual({ kind: 'clearedToday', nextDay: 2 });
    expect(getDayStatus(p, D2, 30)).toEqual({ kind: 'ready', day: 2 });
  });

  it('열린 Day를 다 끝냈으면 allDone (다음 모험 준비 중)', () => {
    const p = { ...createEmptyCourseProgress(), completedDays: [1, 2, 3, 4, 5], lastClearDate: '2026-11-01' };
    expect(getDayStatus(p, D1, 5)).toEqual({ kind: 'allDone', lastDay: 5 });
  });
});

describe('하루 미션 클리어', () => {
  it('첫 클리어: 경험치 100 + 게임 경험치, 골드 30, 출석 1일, 칭호 "첫 모험"', () => {
    const { save, result } = clear(newSave(), 'middle', D1, 42);
    expect(result).toMatchObject({ xpGained: 142, goldGained: 30, rewardEligible: true, newAttendance: true });
    expect(result.newTitles).toContain('first-adventure');
    expect(save.player).toMatchObject({ xp: 142, gold: 30, totalAttendanceDays: 1, level: 3 });
    expect(save.progress.middle).toMatchObject({ completedDays: [1], lastClearDate: D1 });
    expect(save.lastClearedDate).toEqual({ date: D1, course: 'middle' });
    expect(save.lastPlayedDate).toBe(D1);
    expect(save.currentMission).toBeNull();
  });

  it('같은 날 같은 과정은 다시 클리어할 수 없다', () => {
    const { save } = clear(newSave(), 'middle', D1);
    expect(completeMission(save, { course: 'middle', day: 2, missionXp: 0 }, D1)).toEqual({ ok: false, reason: 'alreadyClearedToday' });
    expect(completeMission(save, { course: 'middle', day: 1, missionXp: 0 }, D2)).toEqual({ ok: false, reason: 'alreadyCompleted' });
    expect(completeMission(save, { course: 'middle', day: 3, missionXp: 0 }, D2)).toEqual({ ok: false, reason: 'notNextDay' });
  });

  it('같은 날 다른 과정: 진도는 오르지만 경험치·골드는 0, 출석도 중복 없음', () => {
    const first = clear(newSave(), 'middle', D1, 30).save;
    const { save, result } = clear(first, 'high', D1, 30);
    expect(result).toMatchObject({ xpGained: 0, goldGained: 0, rewardEligible: false, newAttendance: false });
    expect(save.progress.high.completedDays).toEqual([1]);
    expect(save.player.xp).toBe(first.player.xp);
    expect(save.player.totalAttendanceDays).toBe(1);
    expect(save.lastClearedDate).toEqual({ date: D1, course: 'middle' });
  });

  it('다음 날에는 다시 경험치를 받는다', () => {
    const first = clear(newSave(), 'middle', D1).save;
    const { result, save } = clear(first, 'middle', D2);
    expect(result.xpGained).toBe(100);
    expect(save.player.totalAttendanceDays).toBe(2);
  });

  it('5일 시뮬레이션: Day 5 보스전은 승리해야 클리어, 보상(경험치·골드·장비·칭호)은 1회', () => {
    let save = newSave();
    const dates = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-20', '2026-11-23']; // 중간에 쉬어도 이어짐
    for (let i = 0; i < 4; i++) save = clear(save, 'middle', dates[i], 50).save;
    expect(save.progress.middle.completedDays).toEqual([1, 2, 3, 4]);

    expect(completeMission(save, { course: 'middle', day: 5, missionXp: 50 }, dates[4])).toEqual({ ok: false, reason: 'bossNotWon' });
    expect(completeMission(save, { course: 'middle', day: 5, missionXp: 50, bossWon: false }, dates[4])).toEqual({ ok: false, reason: 'bossNotWon' });

    const r = clear(save, 'middle', dates[4], 50, true);
    expect(r.result).toMatchObject({ bossKind: 'mid', bossRewarded: true, xpGained: 100 + 50 + 50, goldGained: 30 + 50 });
    expect(r.result.newEquipment).toEqual(['wooden-shield']);
    expect(r.result.newTitles).toContain('mid-boss-slayer');
    save = r.save;
    expect(save.player).toMatchObject({ xp: 4 * 150 + 200, gold: 5 * 30 + 50, totalAttendanceDays: 5, level: 9 });
    expect(save.progress.middle.bossWins).toEqual([5]);
  });

  it('다른 과정의 같은 보스도 처음이면 보스 보상, 장비는 중복 지급 안 함', () => {
    // 매일 중학교 → 고등학교 순서로 둘 다 클리어
    let save = newSave();
    for (let i = 1; i <= 4; i++) {
      save = clear(save, 'middle', `2026-12-0${i}`).save;
      save = clear(save, 'high', `2026-12-0${i}`).save;
    }
    save = clear(save, 'middle', '2026-12-05', 0, true).save;
    const r = clear(save, 'high', '2026-12-05', 0, true);
    expect(r.result).toMatchObject({ bossRewarded: true, rewardEligible: false, xpGained: 50, goldGained: 50, newEquipment: [] });
    expect(r.save.player.equipment).toEqual(['wooden-shield']);
  });
});

describe('문제 결과 기록', () => {
  it('약점을 정복하면 통계가 오른다', () => {
    let save = newSave();
    save = recordAnswer(save, 'middle', 'mid-d01-01', false, D1);
    expect(save.progress.middle.words['mid-d01-01'].weak).toBe(true);
    save = recordAnswer(save, 'middle', 'mid-d01-01', true, D1);
    save = recordAnswer(save, 'middle', 'mid-d01-01', true, D1);
    expect(save.progress.middle.words['mid-d01-01'].weak).toBe(false);
    expect(save.stats.weakConquered).toBe(1);
  });

  it('스펠링: 단계 반영 + 3단계 정답 통계', () => {
    let save = newSave();
    for (let i = 0; i < 6; i++) save = recordSpelling(save, 'high', 'high-d01-01', true, D1);
    expect(save.progress.high.words['high-d01-01'].spellingStage).toBe(3);
    expect(save.stats.spellingStage3Correct).toBe(0);
    save = recordSpelling(save, 'high', 'high-d01-01', true, D1);
    expect(save.stats.spellingStage3Correct).toBe(1);
    save = recordSpelling(save, 'high', 'high-d01-01', false, D1);
    expect(save.progress.high.words['high-d01-01']).toMatchObject({ spellingStage: 2, weak: true });
  });

  it('과정별 기록은 서로 섞이지 않는다', () => {
    const save = recordAnswer(newSave(), 'high', 'high-d01-01', true, D1);
    expect(save.progress.middle.words).toEqual({});
  });
});

describe('칭호', () => {
  it('조건을 만족하면 한 번만 지급된다', () => {
    let save = newSave();
    save.stats.listenCorrect = 100;
    const a = grantTitles(save);
    expect(a.newTitles).toEqual(['listen-master']);
    save = a.save;
    expect(grantTitles(save).newTitles).toEqual([]);
    expect(save.player.titles).toEqual(['listen-master']);
  });

  it('총 출석 7/15/30일', () => {
    const save = newSave();
    save.player.totalAttendanceDays = 15;
    expect(grantTitles(save).newTitles).toEqual(['attendance-7', 'attendance-15']);
  });
});

describe('피드백 문구', () => {
  it('같은 문구가 연속으로 나오지 않는다', () => {
    const list = ['A', 'B', 'C'];
    const rng = createRng(9);
    let last: string | null = null;
    for (let i = 0; i < 200; i++) {
      const p = pickPhrase(list, last, rng);
      expect(p).not.toBe(last);
      last = p;
    }
    expect(pickPhrase(['only'], 'only', rng)).toBe('only');
  });
});
