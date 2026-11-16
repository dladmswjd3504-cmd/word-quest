import { SAVE_VERSION, type Course, type CourseProgress, type SaveData } from '../types.ts';
import { migrateSave } from './migrate.ts';
import type { KeyValueStore } from './storage.ts';

export const SAVE_KEY = 'wordquest.save';
/** 읽을 수 없는 저장 데이터를 버리지 않고 보관해 두는 키 (복구용) */
export const CORRUPT_KEY = 'wordquest.save.corrupt';

export function createEmptyCourseProgress(): CourseProgress {
  return { completedDays: [], bossWins: [], lastClearDate: null, words: {} };
}

export function createInitialSave(input: {
  nickname: string;
  attendanceNo: number;
  course: Course;
  now?: Date;
}): SaveData {
  const now = input.now ?? new Date();
  return {
    version: SAVE_VERSION,
    profile: { nickname: input.nickname, attendanceNo: input.attendanceNo, createdAt: now.toISOString() },
    settings: { sfx: true, ttsRate: 'normal', silentMode: false, fontSize: 'normal', course: input.course },
    player: {
      level: 1,
      xp: 0,
      gold: 0,
      totalAttendanceDays: 0,
      attendanceDates: [],
      titles: [],
      equipment: [],
    },
    progress: { middle: createEmptyCourseProgress(), high: createEmptyCourseProgress() },
    stats: { listenCorrect: 0, matchPlays: 0, spellingStage3Correct: 0, reviewPlaysAfterClear: 0, weakConquered: 0 },
    lastClearedDate: null,
    lastPlayedDate: null,
    lastBackupDate: null,
    currentMission: null,
  };
}

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; save: SaveData }
  /** 저장 데이터가 깨져 있음. 원본은 CORRUPT_KEY에 보관해 두었다. */
  | { status: 'corrupt' };

export function loadSave(store: KeyValueStore): LoadResult {
  const raw = store.get(SAVE_KEY);
  if (raw === null) return { status: 'empty' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  const save = migrateSave(parsed);
  if (!save) {
    store.set(CORRUPT_KEY, raw);
    return { status: 'corrupt' };
  }
  return { status: 'ok', save };
}

/** 매 단계 완료 시 호출한다. 실패하면 false (용량 초과 등) */
export function writeSave(store: KeyValueStore, save: SaveData): boolean {
  try {
    return store.set(SAVE_KEY, JSON.stringify(save));
  } catch {
    return false;
  }
}

/** 설정 > 기록 초기화 */
export function clearSave(store: KeyValueStore): void {
  store.remove(SAVE_KEY);
}
