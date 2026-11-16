/**
 * 게임 수치 설정 — 경험치·레벨·보스·문제 수·복습 간격은 이 파일에서만 바꾼다.
 * (교사가 "경험치 줄여줘"라고 하면 여기만 수정)
 */
export const gameConfig = {
  mascotName: '퀘스티',

  /** 하루 학습 단어 수 */
  wordsPerDay: 10,

  /** 경험치 (PRD 4.5) */
  xp: {
    dailyClear: 100,
    listenCorrect: 2,
    matchComplete: 10,
    matchSpeedBonusMax: 5,
    /** 이 시간(초) 안에 끝내면 속도 보너스 최대, 2배 시간부터는 0 */
    matchSpeedBonusFullSec: 40,
    reviewCorrect: 3,
    midBossWin: 50,
    finalBossWin: 100,
  },

  /** 골드 */
  gold: {
    dailyClear: 30,
    bossWin: 50,
  },

  /** 레벨: Lv n → n+1 에 필요한 경험치 = base + perLevel * n */
  level: {
    max: 30,
    xpBase: 40,
    xpPerLevel: 10,
  },

  /** 진화 단계 (minLevel 이상이면 해당 단계) */
  evolution: [
    { stage: 1, minLevel: 1, name: '초보 모험가' },
    { stage: 2, minLevel: 5, name: '견습 전사' },
    { stage: 3, minLevel: 10, name: '숙련 기사' },
    { stage: 4, minLevel: 16, name: '영웅' },
    { stage: 5, minLevel: 22, name: '전설의 용사' },
    { stage: 6, minLevel: 28, name: '워드 마스터' },
  ],

  /** 미니게임 문제 수 */
  listen: { questions: 6, choices: 4 },
  match: { pairs: 6 },
  /** 미션 [1]에서 단어당 스펠링 연습 횟수 */
  spellingRepsPerWord: 1,

  /** 스펠링 단계 상승에 필요한 연속 정답 수 */
  spelling: { streakToAdvance: 3 },

  /** 숙련도 (PRD 4.3) */
  mastery: {
    max: 5,
    onCorrect: 1,
    onWrong: -2,
    /** 이 값 이상이면 숙련 상태 */
    masteredAt: 4,
    /** 약점 단어를 이만큼 연속으로 맞히면 약점 해제 */
    weakClearStreak: 2,
    /** 짝맞추기에서 이 횟수 이상 틀리면 약점 기록 */
    matchWrongToWeak: 2,
  },

  /** 복습 퀴즈 */
  review: {
    /** 오늘 Day 기준 며칠 전 Day를 복습할지 */
    intervals: [1, 3, 7],
    minQuestions: 8,
    maxQuestions: 10,
  },

  /** 보스전 */
  boss: {
    midEveryDays: 5,
    finalDay: 30,
    questions: 10,
    /** 승리에 필요한 정답률 */
    passRate: 0.7,
  },

  /** 복습 퀴즈·보스전에서 약점 단어가 차지할 수 있는 최대 비율 */
  weakMaxShare: 0.5,

  /** 칭호 달성 기준 (PRD 4.5) */
  titles: {
    attendance: [7, 15, 30],
    listenMaster: 100,
    matchDoctor: 20,
    weakConqueror: 10,
    spellingMaster: 50,
    reviewMaster: 30,
  },

  /** 마지막 백업 후 며칠이 지나면 백업 알림 */
  backupReminderDays: 5,

  /** 발음 속도 */
  tts: {
    lang: 'en-US',
    rate: { normal: 0.9, slow: 0.6 },
  },
} as const;

export type GameConfig = typeof gameConfig;
