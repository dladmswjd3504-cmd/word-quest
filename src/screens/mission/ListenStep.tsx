import { useState } from 'react';
import { Button, Card, SpeechBubble } from '../../components/ui.tsx';
import { Mascot } from '../../components/Mascot.tsx';
import { speak, useTtsStatus } from '../../lib/tts.ts';
import { advanceStep, answerListen } from '../../logic/mission.ts';
import { silentHint, type ChoiceQuestion } from '../../logic/questions.ts';
import { usePhrase } from '../../state/usePhrase.ts';
import type { MissionState, SaveData, Settings, Word } from '../../types.ts';
import { AnswerFeedback } from './AnswerFeedback.tsx';
import { SilentToggle } from './SilentToggle.tsx';
import m from './mission.module.css';
import s from '../screens.module.css';

interface Feedback {
  correct: boolean;
  phrase: string;
  word: Word;
  chosen: string;
}

const MODE_LABEL = {
  'listen-ko': '알맞은 뜻을 골라 줘',
  'listen-en': '알맞은 철자를 골라 줘',
} as const;

/**
 * [2] 듣고 맞추기 (PRD 4.2)
 * 발음을 듣고 4지선다. 유형 A(뜻 고르기)·B(철자 고르기)가 섞여 나온다.
 * 소리 없이 하기 모드이거나 영어 음성이 없으면 글자 힌트로 같은 문제를 푼다.
 */
export function ListenStep({
  mission,
  dayWords,
  settings,
  today,
  updateMission,
  onSetSilent,
}: {
  mission: MissionState;
  dayWords: Word[];
  settings: Settings;
  today: string;
  updateMission: (fn: (save: SaveData, mission: MissionState) => SaveData) => void;
  onSetSilent: (silent: boolean) => void;
}) {
  const phrase = usePhrase();
  const tts = useTtsStatus();
  const silent = settings.silentMode || tts === 'unavailable';
  const [started, setStarted] = useState(mission.stepIndex > 0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const questions = mission.questions as ChoiceQuestion[];
  const index = mission.stepIndex;
  const total = questions.length;
  const wordOf = (q: ChoiceQuestion | undefined) => (q ? dayWords.find((w) => w.id === q.wordId) : undefined);
  /** 다음 문제 발음을 바로 들려준다 (버튼을 누른 순간이라 iOS에서도 재생됨) */
  const playQuestion = (i: number) => {
    const w = wordOf(questions[i]);
    if (w && !silent) speak(w.en, settings.ttsRate);
  };
  const finishStep = () => updateMission((sv, mi) => ({ ...sv, currentMission: advanceStep(mi) }));

  // ── 피드백 (답을 고른 직후) ──
  if (feedback) {
    const isLast = index >= total;
    return (
      <AnswerFeedback
        correct={feedback.correct}
        phrase={feedback.phrase}
        word={feedback.word}
        yourAnswer={feedback.chosen}
        nextLabel={isLast ? '듣기 끝! 다음 단계로 ▶' : '다음 문제 ▶'}
        onNext={() => {
          setFeedback(null);
          if (isLast) finishStep();
          else playQuestion(index);
        }}
      />
    );
  }

  // ── 완료 (마지막 답을 내고 앱을 닫았다가 다시 연 경우) ──
  if (index >= total) {
    return (
      <div className={`${s.stack} ${s.center}`} style={{ flex: 1, justifyContent: 'center' }}>
        <Mascot size={120} mood="cheer" />
        <SpeechBubble>듣고 맞추기 완료! 🎧</SpeechBubble>
        <Button onClick={finishStep}>다음 단계로 ▶</Button>
      </div>
    );
  }

  // ── 시작 안내 ──
  if (!started) {
    return (
      <div className={`${s.stack} ${s.center}`} style={{ flex: 1, justifyContent: 'center' }}>
        <Mascot size={110} mood="happy" />
        <SpeechBubble>
          {silent ? (
            <>
              🔇 <b>소리 없이</b> 해 볼까?
              <br />
              글자 힌트를 보고 알맞은 답을 골라 줘!
            </>
          ) : (
            <>
              🎧 발음을 잘 듣고
              <br />
              알맞은 답을 골라 줘! ({total}문제)
            </>
          )}
        </SpeechBubble>
        <Button
          onClick={() => {
            playQuestion(index);
            setStarted(true);
          }}
        >
          시작하기 ▶
        </Button>
        <SilentToggle silent={settings.silentMode} disabled={tts === 'unavailable'} onChange={onSetSilent} />
      </div>
    );
  }

  // ── 문제 ──
  const q = questions[index];
  const word = wordOf(q);
  if (!word) {
    // 단어 데이터가 바뀌어 문제가 맞지 않으면 건너뛴다
    return (
      <Button onClick={() => updateMission((sv, mi) => ({ ...sv, currentMission: { ...mi, stepIndex: index + 1 } }))}>
        다음 ▶
      </Button>
    );
  }

  const choose = (choiceIndex: number) => {
    const correct = choiceIndex === q.answerIndex;
    // 기록 + 다음 위치를 한 번에 저장 → 앱을 닫아도 같은 문제를 두 번 기록하지 않음
    updateMission((sv) => answerListen(sv, { question: q, choiceIndex, today }).save);
    setFeedback({ correct, phrase: correct ? phrase.correct() : phrase.wrong(), word, chosen: q.choices[choiceIndex] });
  };

  const hint = silentHint(word, q.mode);
  const choicesAreEnglish = q.mode === 'listen-en';

  return (
    <>
      <div className={m.counter}>
        {silent ? '🔇' : '🎧'} 듣고 맞추기 {index + 1} / {total}
      </div>
      <Card className={m.prompt}>
        <span className={m.stageTag}>{MODE_LABEL[q.mode]}</span>
        {silent ? (
          <>
            <span className={q.mode === 'listen-ko' ? m.word : m.promptMeaning} lang={q.mode === 'listen-ko' ? 'en' : 'ko'}>
              {hint.main}
            </span>
            {hint.sub && (
              <span className={m.hint} lang="en">
                {hint.sub}
              </span>
            )}
          </>
        ) : (
          <button type="button" className={m.bigSpeak} onClick={() => playQuestion(index)} aria-label="발음 다시 듣기">
            <span aria-hidden>🔊</span>
            <span className={m.bigSpeakLabel}>다시 듣기</span>
          </button>
        )}
      </Card>
      <div className={m.choices}>
        {q.choices.map((text, i) => (
          <button
            key={i}
            type="button"
            className={`${m.choice} ${choicesAreEnglish ? m.choiceEn : ''}`}
            onClick={() => choose(i)}
            lang={choicesAreEnglish ? 'en' : 'ko'}
          >
            {text}
          </button>
        ))}
      </div>
      <SilentToggle silent={settings.silentMode} disabled={tts === 'unavailable'} onChange={onSetSilent} />
    </>
  );
}
