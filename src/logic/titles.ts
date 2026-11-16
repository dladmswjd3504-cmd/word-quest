import { gameConfig } from '../config/gameConfig.ts';
import { COURSES, type SaveData } from '../types.ts';
import { bossKindOf } from './boss.ts';

const T = gameConfig.titles;

export interface TitleDef {
  id: string;
  name: string;
  description: string;
  achieved: (save: SaveData) => boolean;
  /** 업적 화면의 진행도 표시용 (예: 37 / 100). 횟수형 칭호에만 있다 */
  progress?: (save: SaveData) => { current: number; target: number };
}

const count = (current: number, target: number) => ({ current: Math.min(current, target), target });

const anyCourse = (save: SaveData, fn: (p: SaveData['progress'][keyof SaveData['progress']]) => boolean) =>
  COURSES.some((c) => fn(save.progress[c]));

/** 칭호 목록 (PRD 4.5). 획득 조건 수치는 gameConfig.titles */
export const TITLES: readonly TitleDef[] = [
  {
    id: 'first-adventure',
    name: '첫 모험',
    description: 'Day 1 클리어',
    achieved: (s) => anyCourse(s, (p) => p.completedDays.includes(1)),
  },
  ...T.attendance.map(
    (n): TitleDef => ({
      id: `attendance-${n}`,
      name: `총 출석 ${n}일`,
      description: `총 출석 ${n}일 달성`,
      achieved: (s) => s.player.totalAttendanceDays >= n,
      progress: (s) => count(s.player.totalAttendanceDays, n),
    }),
  ),
  {
    id: 'listen-master',
    name: '듣기 마스터',
    description: `듣고 맞추기 누적 정답 ${T.listenMaster}개`,
    achieved: (s) => s.stats.listenCorrect >= T.listenMaster,
    progress: (s) => count(s.stats.listenCorrect, T.listenMaster),
  },
  {
    id: 'match-doctor',
    name: '짝꿍 박사',
    description: `카드 짝맞추기 ${T.matchDoctor}판 완료`,
    achieved: (s) => s.stats.matchPlays >= T.matchDoctor,
    progress: (s) => count(s.stats.matchPlays, T.matchDoctor),
  },
  {
    id: 'weak-conqueror',
    name: '약점 정복',
    description: `약점 단어 ${T.weakConqueror}개 정복`,
    achieved: (s) => s.stats.weakConquered >= T.weakConqueror,
    progress: (s) => count(s.stats.weakConquered, T.weakConqueror),
  },
  {
    id: 'spelling-master',
    name: '철자의 달인',
    description: `스펠링 3단계 정답 ${T.spellingMaster}회`,
    achieved: (s) => s.stats.spellingStage3Correct >= T.spellingMaster,
    progress: (s) => count(s.stats.spellingStage3Correct, T.spellingMaster),
  },
  {
    id: 'mid-boss-slayer',
    name: '중간 보스 처치',
    description: '중간 보스전 승리',
    achieved: (s) => anyCourse(s, (p) => p.bossWins.some((d) => bossKindOf(d) === 'mid')),
  },
  {
    id: 'word-king',
    name: '단어 대왕',
    description: '최종 보스전 승리',
    achieved: (s) => anyCourse(s, (p) => p.bossWins.some((d) => bossKindOf(d) === 'final')),
  },
  {
    id: 'review-master',
    name: '복습 마스터',
    description: `클리어 후 복습 게임 누적 ${T.reviewMaster}판`,
    achieved: (s) => s.stats.reviewPlaysAfterClear >= T.reviewMaster,
    progress: (s) => count(s.stats.reviewPlaysAfterClear, T.reviewMaster),
  },
];

/** 조건을 새로 만족한 칭호를 지급한다. 이미 받은 칭호는 다시 주지 않는다. */
export function grantTitles(save: SaveData): { save: SaveData; newTitles: string[] } {
  const owned = new Set(save.player.titles);
  const newTitles = TITLES.filter((t) => !owned.has(t.id) && t.achieved(save)).map((t) => t.id);
  if (newTitles.length === 0) return { save, newTitles };
  return {
    save: { ...save, player: { ...save.player, titles: [...save.player.titles, ...newTitles] } },
    newTitles,
  };
}

export function titleById(id: string): TitleDef | undefined {
  return TITLES.find((t) => t.id === id);
}
