import { gameConfig } from '../config/gameConfig.ts';
import equipmentList from '../data/equipment.json';
import type { Course, CourseProgress, SaveData } from '../types.ts';
import { bossKindOf } from './boss.ts';
import { applyAnswer, applySpelling } from './mastery.ts';
import { grantTitles } from './titles.ts';
import { levelFromXp } from './xp.ts';

// ── 진도 (PRD 3.3) ──

/** 다음에 할 Day: 완료한 Day의 다음 번호 (날짜가 아니라 완료 기준) */
export function nextDayOf(progress: CourseProgress): number {
  return progress.completedDays.length ? Math.max(...progress.completedDays) + 1 : 1;
}

export type DayStatus =
  /** 오늘 할 Day가 있다 */
  | { kind: 'ready'; day: number }
  /** 이 과정은 오늘 이미 클리어했다 → "오늘은 클리어 완료! 복습 게임 해볼래?" */
  | { kind: 'clearedToday'; nextDay: number }
  /** 열려 있는 Day를 모두 끝냈다 → "다음 모험 준비 중!" */
  | { kind: 'allDone'; lastDay: number };

export function getDayStatus(progress: CourseProgress, today: string, lastDay: number): DayStatus {
  const next = nextDayOf(progress);
  if (progress.lastClearDate === today) return { kind: 'clearedToday', nextDay: next };
  if (next > lastDay) return { kind: 'allDone', lastDay };
  return { kind: 'ready', day: next };
}

/** 오늘 아직 어떤 과정도 클리어하지 않았으면 경험치·골드를 받을 수 있다 (하루 1회, 과정 무관) */
export function isRewardEligible(save: SaveData, today: string): boolean {
  return save.lastClearedDate?.date !== today;
}

// ── 문제 결과 반영 ──

function updateCourse(save: SaveData, course: Course, fn: (p: CourseProgress) => CourseProgress): SaveData {
  return { ...save, progress: { ...save.progress, [course]: fn(save.progress[course]) } };
}

/** 듣기·짝맞추기·복습·보스 문제 한 개의 결과를 저장 데이터에 반영한다 */
export function recordAnswer(save: SaveData, course: Course, wordId: string, correct: boolean, today: string): SaveData {
  const { next, conqueredWeak } = applyAnswer(save.progress[course].words[wordId], correct, today);
  const updated = updateCourse(save, course, (p) => ({ ...p, words: { ...p.words, [wordId]: next } }));
  return conqueredWeak
    ? { ...updated, stats: { ...updated.stats, weakConquered: updated.stats.weakConquered + 1 } }
    : updated;
}

/** 스펠링 문제 결과: 숙련도·약점 + 스펠링 단계 + "철자의 달인" 통계 */
export function recordSpelling(save: SaveData, course: Course, wordId: string, correct: boolean, today: string): SaveData {
  const stageBefore = save.progress[course].words[wordId]?.spellingStage ?? 1;
  const afterAnswer = recordAnswer(save, course, wordId, correct, today);
  const withStage = updateCourse(afterAnswer, course, (p) => ({
    ...p,
    words: { ...p.words, [wordId]: applySpelling(p.words[wordId], correct) },
  }));
  if (correct && stageBefore === 3) {
    return { ...withStage, stats: { ...withStage.stats, spellingStage3Correct: withStage.stats.spellingStage3Correct + 1 } };
  }
  return withStage;
}

// ── 하루 미션 클리어 (PRD 3.2, 4.4, 4.5, 4.9) ──

export interface ClearResult {
  xpGained: number;
  goldGained: number;
  /** 오늘 첫 클리어라서 경험치·골드를 받았는지 */
  rewardEligible: boolean;
  levelBefore: number;
  levelAfter: number;
  bossKind: 'mid' | 'final' | null;
  /** 이번에 처음 이긴 보스라서 보스 보상을 받았는지 */
  bossRewarded: boolean;
  newEquipment: string[];
  newTitles: string[];
  /** 오늘 처음 출석으로 인정됐는지 */
  newAttendance: boolean;
}

export type CompleteMissionResult =
  | { ok: true; save: SaveData; result: ClearResult }
  | { ok: false; reason: 'alreadyCompleted' | 'alreadyClearedToday' | 'notNextDay' | 'bossNotWon' };

/**
 * 하루 미션을 클리어 처리한다.
 * - 경험치·골드: 오늘 첫 클리어(과정 무관)일 때만. 두 번째 과정은 진도·숙련도만 반영
 * - missionXp: 미션 중 게임에서 모은 경험치 (듣기 정답, 짝맞추기, 복습 정답)
 * - 보스 Day: 보스전 승리가 필요. 보스 보상은 과정별로 처음 이겼을 때 1회
 */
export function completeMission(
  save: SaveData,
  input: { course: Course; day: number; missionXp: number; bossWon?: boolean },
  today: string,
): CompleteMissionResult {
  const { course, day } = input;
  const progress = save.progress[course];

  if (progress.completedDays.includes(day)) return { ok: false, reason: 'alreadyCompleted' };
  if (progress.lastClearDate === today) return { ok: false, reason: 'alreadyClearedToday' };
  if (day !== nextDayOf(progress)) return { ok: false, reason: 'notNextDay' };

  const bossKind = bossKindOf(day);
  if (bossKind && !input.bossWon) return { ok: false, reason: 'bossNotWon' };

  const rewardEligible = isRewardEligible(save, today);
  let xpGained = rewardEligible ? gameConfig.xp.dailyClear + Math.max(0, input.missionXp) : 0;
  let goldGained = rewardEligible ? gameConfig.gold.dailyClear : 0;

  const bossRewarded = bossKind !== null && !progress.bossWins.includes(day);
  const newEquipment: string[] = [];
  if (bossRewarded) {
    xpGained += bossKind === 'final' ? gameConfig.xp.finalBossWin : gameConfig.xp.midBossWin;
    goldGained += gameConfig.gold.bossWin;
    const item = equipmentList.find((e) => e.bossDay === day);
    if (item && !save.player.equipment.includes(item.id)) newEquipment.push(item.id);
  }

  const newAttendance = !save.player.attendanceDates.includes(today);
  const totalXp = save.player.xp + xpGained;

  let next: SaveData = {
    ...save,
    player: {
      ...save.player,
      xp: totalXp,
      level: levelFromXp(totalXp),
      gold: save.player.gold + goldGained,
      attendanceDates: newAttendance ? [...save.player.attendanceDates, today] : save.player.attendanceDates,
      totalAttendanceDays: save.player.totalAttendanceDays + (newAttendance ? 1 : 0),
      equipment: [...save.player.equipment, ...newEquipment],
    },
    progress: {
      ...save.progress,
      [course]: {
        ...progress,
        completedDays: [...progress.completedDays, day].sort((a, b) => a - b),
        bossWins: bossRewarded ? [...progress.bossWins, day].sort((a, b) => a - b) : progress.bossWins,
        lastClearDate: today,
      },
    },
    lastClearedDate: rewardEligible ? { date: today, course } : save.lastClearedDate,
    lastPlayedDate: today,
    currentMission: null,
  };

  const granted = grantTitles(next);
  next = granted.save;

  return {
    ok: true,
    save: next,
    result: {
      xpGained,
      goldGained,
      rewardEligible,
      levelBefore: save.player.level,
      levelAfter: next.player.level,
      bossKind,
      bossRewarded,
      newEquipment,
      newTitles: granted.newTitles,
      newAttendance,
    },
  };
}
