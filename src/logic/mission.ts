import { gameConfig } from '../config/gameConfig.ts';
import type { Course, MissionState, MissionStep, SaveData, Word } from '../types.ts';
import { bossKindOf } from './boss.ts';
import { recordAnswer, recordMatchResult } from './progress.ts';
import {
  buildListenRound,
  buildMatchRound,
  buildSpellingQuestion,
  type ChoiceQuestion,
  type MatchCard,
  type SpellingQuestion,
} from './questions.ts';
import { shuffle, type Rng } from './random.ts';
import { matchSpeedBonus } from './xp.ts';

/** 하루 미션 단계 순서. 보스 Day는 복습 퀴즈 대신 보스전 (PRD 3.2) */
export function missionSteps(day: number): MissionStep[] {
  return ['learn', 'listen', 'match', bossKindOf(day) ? 'boss' : 'review', 'done'];
}

/** 오늘·이 과정의 진행 중 미션. 날짜가 바뀌었거나 다른 과정이면 null (같은 Day를 새로 시작) */
export function getActiveMission(save: SaveData, course: Course, today: string): MissionState | null {
  const m = save.currentMission;
  if (!m || m.course !== course || m.date !== today) return null;
  return m;
}

/**
 * 미션을 시작한다. [1] 단어 학습 단계의 스펠링 문제(단어당 1회)를 미리 만들어 저장한다
 * → 중간에 앱을 닫았다 열어도 같은 문제로 이어진다.
 */
export function startMission(
  save: SaveData,
  params: { course: Course; day: number; dayWords: readonly Word[]; today: string; rng: Rng },
): SaveData {
  const { course, day, dayWords, today, rng } = params;
  const progress = save.progress[course];
  const spelling: SpellingQuestion[] = shuffle(dayWords, rng).map((w) =>
    buildSpellingQuestion(w, progress.words[w.id]?.spellingStage ?? 1, rng),
  );
  return {
    ...save,
    lastPlayedDate: today,
    currentMission: { course, day, date: today, step: 'learn', stepIndex: 0, questions: spelling, earnedXp: 0 },
  };
}

/** 다음 단계로 넘어간다. 새 단계의 문제는 그 단계에 들어갈 때 만든다. */
export function advanceStep(mission: MissionState): MissionState {
  const steps = missionSteps(mission.day);
  const i = steps.indexOf(mission.step);
  const next = steps[Math.min(i + 1, steps.length - 1)];
  return { ...mission, step: next, stepIndex: 0, questions: [] };
}

/**
 * 듣고 맞추기·짝맞추기 단계에 들어왔는데 문제가 아직 없으면 만들어 넣는다.
 * (advanceStep은 문제를 비우므로, 단계에 들어간 직후 한 번 호출 → 저장 → 다시 열어도 같은 문제)
 * pool: 오답 보기를 고를 같은 과정의 단어 목록
 */
export function prepareStep(
  mission: MissionState,
  params: { dayWords: readonly Word[]; pool: readonly Word[]; rng: Rng },
): MissionState {
  if (!needsQuestions(mission)) return mission;
  const { dayWords, pool, rng } = params;
  const questions =
    mission.step === 'listen' ? buildListenRound(dayWords, pool, rng) : buildMatchRound(dayWords, rng);
  return { ...mission, stepIndex: 0, questions };
}

export function needsQuestions(mission: MissionState): boolean {
  return (mission.step === 'listen' || mission.step === 'match') && mission.questions.length === 0;
}

/**
 * 듣고 맞추기 한 문제에 답했다 (PRD 4.2).
 * 숙련도·약점 반영 + 정답이면 경험치·"듣기 달인" 통계 + 다음 문제로. 한 번에 저장해서 같은 답이 두 번 기록되지 않게 한다.
 */
export function answerListen(
  save: SaveData,
  params: { question: ChoiceQuestion; choiceIndex: number; today: string },
): { save: SaveData; correct: boolean } {
  const mission = save.currentMission;
  if (!mission) return { save, correct: false };
  const { question, choiceIndex, today } = params;
  const correct = choiceIndex === question.answerIndex;
  const recorded = recordAnswer(save, mission.course, question.wordId, correct, today);
  return {
    correct,
    save: {
      ...recorded,
      stats: correct ? { ...recorded.stats, listenCorrect: recorded.stats.listenCorrect + 1 } : recorded.stats,
      currentMission: {
        ...mission,
        stepIndex: mission.stepIndex + 1,
        earnedXp: mission.earnedXp + (correct ? gameConfig.xp.listenCorrect : 0),
      },
    },
  };
}

export interface MatchSummary {
  xp: number;
  speedBonus: number;
  seconds: number;
  /** 2번 이상 틀려서 약점으로 기록된 단어 */
  weakWordIds: string[];
}

/**
 * 카드 짝맞추기 한 판을 끝냈다 (PRD 4.2).
 * - 단어별 틀린 횟수로 숙련도·약점 반영 (0번 → 정답, 1번 → 변화 없음, 2번 이상 → 약점)
 * - 완료 경험치 + 속도 보너스, "짝맞추기 박사" 통계
 * - stepIndex를 1로 바꿔 '끝난 판'으로 표시 (다시 열어도 두 번 기록하지 않음)
 */
export function finishMatch(
  save: SaveData,
  params: { wrongCounts: Readonly<Record<string, number>>; seconds: number; today: string },
): { save: SaveData; summary: MatchSummary } {
  const mission = save.currentMission;
  const empty = { xp: 0, speedBonus: 0, seconds: params.seconds, weakWordIds: [] };
  if (!mission || mission.step !== 'match' || mission.stepIndex > 0) return { save, summary: empty };

  const { wrongCounts, seconds, today } = params;
  const wordIds = [...new Set((mission.questions as MatchCard[]).map((c) => c.wordId))];
  let next = save;
  for (const id of wordIds) next = recordMatchResult(next, mission.course, id, wrongCounts[id] ?? 0, today);

  const speedBonus = matchSpeedBonus(seconds);
  const xp = gameConfig.xp.matchComplete + speedBonus;
  const weakWordIds = wordIds.filter((id) => (wrongCounts[id] ?? 0) >= gameConfig.mastery.matchWrongToWeak);
  return {
    summary: { xp, speedBonus, seconds, weakWordIds },
    save: {
      ...next,
      stats: { ...next.stats, matchPlays: next.stats.matchPlays + 1 },
      currentMission: { ...mission, stepIndex: 1, earnedXp: mission.earnedXp + xp },
    },
  };
}

/** 화면 위쪽 진행 표시용: 몇 번째 단계인지 (1부터), 전체 단계 수 ('done' 제외) */
export function stepPosition(mission: MissionState): { index: number; total: number } {
  const steps: MissionStep[] = missionSteps(mission.day).filter((s) => s !== 'done');
  return { index: Math.max(0, steps.indexOf(mission.step)) + 1, total: steps.length };
}

export const STEP_LABELS: Record<MissionStep, string> = {
  learn: '오늘의 단어',
  listen: '듣고 맞추기',
  match: '카드 짝맞추기',
  review: '복습 퀴즈',
  boss: '보스전',
  done: '클리어',
};
