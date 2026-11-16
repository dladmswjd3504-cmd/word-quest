import { Button, ProgressBar, SpeechBubble } from '../../components/ui.tsx';
import { Mascot } from '../../components/Mascot.tsx';
import { getWordsOfDay } from '../../data/words.ts';
import { localDateString } from '../../logic/date.ts';
import { getActiveMission, STEP_LABELS, stepPosition } from '../../logic/mission.ts';
import { useSave } from '../../state/GameContext.tsx';
import { useWords } from '../../state/useWords.ts';
import type { MissionState, SaveData } from '../../types.ts';
import { LearnStep } from './LearnStep.tsx';
import m from './mission.module.css';
import s from '../screens.module.css';

/** 하루 미션 화면. 단계(학습 → 듣기 → 짝맞추기 → 복습/보스)를 이어서 보여 준다. 매 단계 진행은 즉시 저장된다. */
export function MissionScreen({ onExit }: { onExit: () => void }) {
  const { save, update } = useSave();
  const course = save.settings.course;
  const words = useWords(course);
  const today = localDateString();
  const mission = getActiveMission(save, course, today);

  if (!mission) {
    return (
      <main className={`${s.page} ${s.full} ${s.center}`}>
        <Mascot size={110} mood="think" />
        <SpeechBubble>진행 중인 모험이 없어요. 홈에서 시작해 줘!</SpeechBubble>
        <Button onClick={onExit}>홈으로</Button>
      </main>
    );
  }
  if (!words) return <main className={`${s.page} ${s.full} ${s.center}`}>불러오는 중…</main>;

  const dayWords = getWordsOfDay(words, mission.day);
  const pos = stepPosition(mission);
  /** 저장 데이터와 진행 중 미션을 함께 바꾼다 (한 번에 저장) */
  const updateMission = (fn: (save: SaveData, mission: MissionState) => SaveData) =>
    update((sv) => (sv.currentMission ? fn(sv, sv.currentMission) : sv));

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
          <LearnStep
            key={`${mission.day}-${mission.date}`}
            mission={mission}
            dayWords={dayWords}
            settings={save.settings}
            today={today}
            updateMission={updateMission}
          />
        ) : (
          <ComingSoonStep label={STEP_LABELS[mission.step]} onExit={onExit} />
        )}
      </div>
    </main>
  );
}

/** 아직 만들지 않은 단계 (M4·M5에서 채움) */
function ComingSoonStep({ label, onExit }: { label: string; onExit: () => void }) {
  return (
    <div className={`${s.stack} ${s.center}`} style={{ flex: 1, justifyContent: 'center' }}>
      <Mascot size={120} mood="cheer" />
      <SpeechBubble>
        단어 학습 완료! 🎉
        <br />
        다음 단계 <b>‘{label}’</b>는 곧 열려요. 진행 상황은 저장됐어!
      </SpeechBubble>
      <Button onClick={onExit}>홈으로</Button>
    </div>
  );
}
