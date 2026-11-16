/** 공용 타입 정의 (PRD 5.2, 7.4) */

export type Course = 'middle' | 'high';
export const COURSES: readonly Course[] = ['middle', 'high'];

/** 단어 데이터 (src/data/words.*.json 의 한 항목) */
export interface Word {
  /** 고유하고 변하지 않는 ID: {mid|high}-d{DD}-{NN} */
  id: string;
  course: Course;
  day: number;
  en: string;
  pos: string;
  ko: string;
  exampleEn: string;
  exampleKo: string;
  difficulty: 1 | 2 | 3;
  tip: string;
}

export type SpellingStage = 1 | 2 | 3;

/** 단어별 학습 기록 */
export interface WordProgress {
  /** 0~5 */
  mastery: number;
  spellingStage: SpellingStage;
  /** 현재 스펠링 단계에서의 연속 정답 수 */
  streak: number;
  wrongCount: number;
  weak: boolean;
  /** 약점 단어일 때 연속 정답 수 (약점 해제 판정용) */
  weakStreak: number;
  lastSeenDate: string;
}

export interface CourseProgress {
  completedDays: number[];
  bossWins: number[];
  words: Record<string, WordProgress>;
}

export interface Profile {
  nickname: string;
  attendanceNo: number;
  createdAt: string;
}

export interface Settings {
  sfx: boolean;
  ttsRate: 'normal' | 'slow';
  silentMode: boolean;
  fontSize: 'normal' | 'large';
  course: Course;
}

export interface Player {
  level: number;
  xp: number;
  gold: number;
  totalAttendanceDays: number;
  attendanceDates: string[];
  titles: string[];
  equipment: string[];
}

export interface Stats {
  listenCorrect: number;
  matchPlays: number;
  spellingStage3Correct: number;
  reviewPlaysAfterClear: number;
  weakConquered: number;
}

export type MissionStep = 'learn' | 'listen' | 'match' | 'review' | 'boss' | 'done';

/** 진행 중인 하루 미션 (중간 종료 후 이어하기) */
export interface MissionState {
  course: Course;
  day: number;
  /** 시작한 로컬 날짜 (YYYY-MM-DD) */
  date: string;
  step: MissionStep;
  stepIndex: number;
  /** 미리 생성해 둔 문제 (재접속 시 같은 문제 유지). 형태는 M2에서 정의 */
  questions: unknown[];
  earnedXp: number;
}

export const SAVE_VERSION = 1;

export interface SaveData {
  version: typeof SAVE_VERSION;
  profile: Profile;
  settings: Settings;
  player: Player;
  progress: Record<Course, CourseProgress>;
  stats: Stats;
  lastClearedDate: { date: string; course: Course } | null;
  lastPlayedDate: string | null;
  lastBackupDate: string | null;
  currentMission: MissionState | null;
}
