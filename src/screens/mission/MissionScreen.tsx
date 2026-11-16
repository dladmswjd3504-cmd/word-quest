import { useEffect, useState } from 'react';
import { Button, ProgressBar, SpeechBubble } from '../../components/ui.tsx';
import { Mascot } from '../../components/Mascot.tsx';
import { getWordsOfDay } from '../../data/words.ts';
import { localDateString } from '../../logic/date.ts';
import {
  finishMission,
  getActiveMission,
  needsQuestions,
  prepareStep,
  retryBoss,
  STEP_LABELS,
  stepPosition,
  type FinishMissionResult,
} from '../../logic/mission.ts';
import type { ClearResult } from '../../logic/progress.ts';
import { useSave } from '../../state/GameContext.tsx';
import { useWords } from '../../state/useWords.ts';
import type { MissionState, SaveData } from '../../types.ts';
import { ClearScreen } from './ClearScreen.tsx';
import { LearnStep } from './LearnStep.tsx';
import { ListenStep } from './ListenStep.tsx';
import { MatchStep } from './MatchStep.tsx';
import { QuizStep } from './QuizStep.tsx';
import m from './mission.module.css';
import s from '../screens.module.css';

/** 하루 미션 화면. 단계(학습 → 듣기 → 짝맞추기 → 복습/보스 → 클리어)를 이어서 보여 준다. 매 단계 진행은 즉시 저장된다. */
export function MissionScreen({ onExit }: { onExit: () => void }) {
  const { save, update } = useSave();
  const course = save.settings.course;
  const words = useWords(course);
  const today = localDateString();
  const mission = getActiveMission(save, course, today);
  const waitingForQuestions = !!mission && needsQuestions(mission);
  const [cleared, setCleared] = useState<{ day: number; result: ClearResult } | null>(null);
  const [finishProblem, setFinishProblem] = useState(false);

  // 듣기·짝맞추기·복습·보스 단계에 처음 들어오면 문제를 만들어 저장한다 (다시 열어도 같은 문제)
  useEffect(() => {
    if (!waitingForQuestions || !words) return;
    update((sv) => {
      const mi = sv.currentMission;
      if (!mi || !needsQuestions(mi)) return sv;
      const dayWords = getWordsOfDay(words, mi.day);
      const progress = sv.progress[mi.course];
      return { ...sv, currentMission: prepareStep(mi, { dayWords, pool: words, progress, rng: Math.random }) };
    });
  }, [waitingForQuestions, words, update]);

  // 클리어 화면은 미션이 끝난(저장에서 지워진) 뒤에도 보여 준다
  if (cleared) return <ClearScreen day={cleared.day} result={cleared.result} onHome={onExit} />;

  if (!mission) {
    return (
      <main className={`${s.page} ${s.full} ${s.center}`}>
        <Mascot size={110} mood="think" />
        <SpeechBubble>
          {finishProblem ? '이 모험은 이미 클리어했어요. 홈에서 다음 모험을 확인해 줘!' : '진행 중인 모험이 없어요. 홈에서 시작해 줘!'}
        </SpeechBubble>
        <Button onClick={onExit}>홈으로</Button>
      </main>
    );
  }
  if (!words || waitingForQuestions) return <main className={`${s.page} ${s.full} ${s.center}`}>불러오는 중…</main>;

  const dayWords = getWordsOfDay(words, mission.day);
  const pos = stepPosition(mission);
  /** 저장 데이터와 진행 중 미션을 함께 바꾼다 (한 번에 저장) */
  const updateMission = (fn: (save: SaveData, mission: MissionState) => SaveData) =>
    update((sv) => (sv.currentMission ? fn(sv, sv.currentMission) : sv));
  const setSilent = (silentMode: boolean) => update((sv) => ({ ...sv, settings: { ...sv.settings, silentMode } }));

  const finish = () => {
    const box: { r?: FinishMissionResult } = {};
    update((sv) => {
      box.r = finishMission(sv, today);
      return box.r.save;
    });
    const r = box.r;
    if (r?.ok) setCleared({ day: mission.day, result: r.result });
    else if (r && r.reason !== 'bossNotWon') setFinishProblem(true);
  };
  const retry = () =>
    updateMission((sv, mi) => ({
      ...sv,
      currentMission: retryBoss(mi, { pool: words, progress: sv.progress[mi.course], rng: Math.random }),
    }));

  const stepKey = `${mission.day}-${mission.date}-${mission.step}`;
  const common = { mission, dayWords, settings: save.settings, today, updateMission };

  return (
    <main className={m.screen}>
      <div className={m.top}>
        <button type="button" className={m.close} onClick={onExit} aria-label="그만하고 홈으로 (진행 상황은 저장돼요)">
          ✕
        </button>
        <div className={m.topMain}>
          <div className={m.stepLabel}>
            <span>
              Day {mission.day} · {STEP_LABELS[mission.step]}
            </span>
            <span>
              {pos.index}/{pos.total}
            </span>
          </div>
          <ProgressBar value={pos.index - 1} max={pos.total} label="오늘 모험 진행도" />
        </div>
      </div>

      <div className={m.body}>
        {mission.step === 'learn' ? (
          <LearnStep key={stepKey} {...common} />
        ) : mission.step === 'listen' ? (
          <ListenStep key={stepKey} {...common} onSetSilent={setSilent} />
        ) : mission.step === 'match' ? (
          <MatchStep key={stepKey} {...common} />
        ) : mission.step === 'review' || mission.step === 'boss' ? (
          <QuizStep
            key={stepKey}
            {...common}
            words={words}
            onSetSilent={setSilent}
            onFinish={finish}
            onRetryBoss={retry}
            onExit={onExit}
          />
        ) : (
          // 'done': 예전 저장 데이터 등으로 여기 오면 클리어 처리만 한다
          <div className={`${s.stack} ${s.center}`} style={{ flex: 1, justifyContent: 'center' }}>
            <Mascot size={120} mood="cheer" />
            <SpeechBubble>오늘의 모험을 모두 끝냈어! 🎉</SpeechBubble>
            <Button onClick={finish}>🎁 클리어 보상 받기</Button>
          </div>
        )}
      </div>
    </main>
  );
}
