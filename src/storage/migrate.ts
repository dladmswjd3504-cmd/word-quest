import { isDateString } from '../logic/date.ts';
import {
  COURSES,
  SAVE_VERSION,
  type Course,
  type CourseProgress,
  type MissionState,
  type MissionStep,
  type SaveData,
  type SpellingStage,
  type WordProgress,
} from '../types.ts';

/**
 * 저장 데이터(또는 백업 코드에서 꺼낸 데이터)를 검사하고 현재 버전의 SaveData로 바꾼다.
 * - 꼭 있어야 하는 값(프로필, 버전)이 잘못되면 null → 안전하게 거절
 * - 나중에 추가된 필드가 없으면 기본값으로 채운다 (같은 버전 안의 이전 저장 데이터 호환)
 * - 버전이 올라가면 여기에 단계별 변환을 추가한다: `if (v === 1) data = from1to2(data)`
 */
export function migrateSave(data: unknown): SaveData | null {
  if (!isObject(data)) return null;
  if (data.version !== SAVE_VERSION) return null; // 현재는 v1만 존재. 더 새 버전(미래 앱)의 코드도 거절

  const profile = data.profile;
  if (!isObject(profile)) return null;
  if (typeof profile.nickname !== 'string' || profile.nickname.trim() === '') return null;
  if (!isInt(profile.attendanceNo) || profile.attendanceNo < 1 || profile.attendanceNo > 99) return null;

  const settings = isObject(data.settings) ? data.settings : {};
  const player = isObject(data.player) ? data.player : {};
  const stats = isObject(data.stats) ? data.stats : {};
  const progress = isObject(data.progress) ? data.progress : {};

  const attendanceDates = stringArray(player.attendanceDates).filter(isDateString);

  return {
    version: SAVE_VERSION,
    profile: {
      nickname: profile.nickname,
      attendanceNo: profile.attendanceNo,
      createdAt: typeof profile.createdAt === 'string' ? profile.createdAt : new Date().toISOString(),
    },
    settings: {
      sfx: bool(settings.sfx, true),
      ttsRate: settings.ttsRate === 'slow' ? 'slow' : 'normal',
      silentMode: bool(settings.silentMode, false),
      fontSize: settings.fontSize === 'large' ? 'large' : 'normal',
      course: isCourse(settings.course) ? settings.course : 'middle',
    },
    player: {
      level: clampInt(player.level, 1, 999, 1),
      xp: clampInt(player.xp, 0, Number.MAX_SAFE_INTEGER, 0),
      gold: clampInt(player.gold, 0, Number.MAX_SAFE_INTEGER, 0),
      totalAttendanceDays: clampInt(player.totalAttendanceDays, 0, 100_000, attendanceDates.length),
      attendanceDates,
      titles: stringArray(player.titles),
      equipment: stringArray(player.equipment),
    },
    progress: {
      middle: normalizeCourseProgress(progress.middle),
      high: normalizeCourseProgress(progress.high),
    },
    stats: {
      listenCorrect: clampInt(stats.listenCorrect, 0, Number.MAX_SAFE_INTEGER, 0),
      matchPlays: clampInt(stats.matchPlays, 0, Number.MAX_SAFE_INTEGER, 0),
      spellingStage3Correct: clampInt(stats.spellingStage3Correct, 0, Number.MAX_SAFE_INTEGER, 0),
      reviewPlaysAfterClear: clampInt(stats.reviewPlaysAfterClear, 0, Number.MAX_SAFE_INTEGER, 0),
      weakConquered: clampInt(stats.weakConquered, 0, Number.MAX_SAFE_INTEGER, 0),
    },
    lastClearedDate:
      isObject(data.lastClearedDate) &&
      isDateString(data.lastClearedDate.date) &&
      isCourse(data.lastClearedDate.course)
        ? { date: data.lastClearedDate.date, course: data.lastClearedDate.course }
        : null,
    lastPlayedDate: isDateString(data.lastPlayedDate) ? data.lastPlayedDate : null,
    lastBackupDate: isDateString(data.lastBackupDate) ? data.lastBackupDate : null,
    currentMission: normalizeMission(data.currentMission),
  };
}

function normalizeCourseProgress(value: unknown): CourseProgress {
  const p = isObject(value) ? value : {};
  const words: Record<string, WordProgress> = {};
  if (isObject(p.words)) {
    for (const [id, raw] of Object.entries(p.words)) {
      if (!isObject(raw)) continue;
      const stage = raw.spellingStage;
      words[id] = {
        mastery: clampInt(raw.mastery, 0, 5, 0),
        spellingStage: (stage === 1 || stage === 2 || stage === 3 ? stage : 1) as SpellingStage,
        streak: clampInt(raw.streak, 0, 1000, 0),
        wrongCount: clampInt(raw.wrongCount, 0, Number.MAX_SAFE_INTEGER, 0),
        weak: bool(raw.weak, false),
        weakStreak: clampInt(raw.weakStreak, 0, 1000, 0),
        lastSeenDate: isDateString(raw.lastSeenDate) ? raw.lastSeenDate : '',
      };
    }
  }
  return {
    completedDays: uniqueSortedDays(p.completedDays),
    bossWins: uniqueSortedDays(p.bossWins),
    words,
  };
}

const MISSION_STEPS: readonly MissionStep[] = ['learn', 'listen', 'match', 'review', 'boss', 'done'];

function normalizeMission(value: unknown): MissionState | null {
  if (!isObject(value)) return null;
  if (!isCourse(value.course) || !isInt(value.day) || value.day < 1) return null;
  if (!isDateString(value.date)) return null;
  if (!MISSION_STEPS.includes(value.step as MissionStep)) return null;
  return {
    course: value.course,
    day: value.day,
    date: value.date,
    step: value.step as MissionStep,
    stepIndex: clampInt(value.stepIndex, 0, 1000, 0),
    questions: Array.isArray(value.questions) ? value.questions : [],
    earnedXp: clampInt(value.earnedXp, 0, 100_000, 0),
  };
}

// ── 작은 검사 도우미 ──
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function isInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v);
}
function isCourse(v: unknown): v is Course {
  return COURSES.includes(v as Course);
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  return isInt(v) ? Math.min(max, Math.max(min, v)) : fallback;
}
function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}
function uniqueSortedDays(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is number => isInt(x) && x >= 1 && x <= 999))].sort((a, b) => a - b);
}
