import type { Course, MissionState, MissionStep, SaveData, Word } from '../types.ts';
import { bossKindOf } from './boss.ts';
import { buildSpellingQuestion, type SpellingQuestion } from './questions.ts';
import { shuffle, type Rng } from './random.ts';

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
