import { useState } from 'react';
import { Button, SpeechBubble } from '../../components/ui.tsx';
import { Mascot } from '../../components/Mascot.tsx';
import { speak } from '../../lib/tts.ts';
import { isSpellingCorrect } from '../../logic/mastery.ts';
import { advanceStep } from '../../logic/mission.ts';
import { recordSpelling } from '../../logic/progress.ts';
import type { SpellingQuestion } from '../../logic/questions.ts';
import { usePhrase } from '../../state/usePhrase.ts';
import type { MissionState, SaveData, Settings, Word } from '../../types.ts';
import { AnswerFeedback } from './AnswerFeedback.tsx';
import { SpellingInput } from './SpellingInput.tsx';
import { WordCard } from './WordCard.tsx';
import m from './mission.module.css';
import s from '../screens.module.css';

interface Feedback {
  correct: boolean;
  phrase: string;
  word: Word;
  input: string;
}

/**
 * [1] 오늘의 단어 10개 만나기 (PRD 3.2)
 * stepIndex 0~9: 단어 카드 / 10~19: 스펠링 따라 쓰기(단어당 1회) / 20: 완료
 */
export function LearnStep({
  mission,
  dayWords,
  settings,
  today,
  updateMission,
}: {
  mission: MissionState;
  dayWords: Word[];
  settings: Settings;
  today: string;
  updateMission: (fn: (save: SaveData, mission: MissionState) => SaveData) => void;
}) {
  const phrase = usePhrase();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const n = dayWords.length;
  const index = mission.stepIndex;
  const spelling = mission.questions as SpellingQuestion[];

  const setIndex = (i: number) =>
    updateMission((sv, mi) => ({ ...sv, currentMission: { ...mi, stepIndex: Math.max(0, i) } }));
  const finishStep = () => updateMission((sv, mi) => ({ ...sv, currentMission: advanceStep(mi) }));

  // ── 피드백 (스펠링 답을 낸 직후) ──
  if (feedback) {
    const isLast = index >= n * 2;
    return (
      <AnswerFeedback
        correct={feedback.correct}
        phrase={feedback.phrase}
        word={feedback.word}
        yourAnswer={feedback.input}
        nextLabel={isLast ? '단어 학습 끝! 다음 단계로 ▶' : '다음'}
        onNext={() => {
          setFeedback(null);
          if (isLast) finishStep();
        }}
      />
    );
  }

  // ── 완료 (마지막 답을 내고 앱을 닫았다가 다시 연 경우) ──
  if (index >= n * 2) {
    return (
      <div className={`${s.stack} ${s.center}`} style={{ flex: 1, justifyContent: 'center' }}>
        <Mascot size={120} mood="cheer" />
        <SpeechBubble>오늘의 단어 10개를 모두 만났어! 🎉</SpeechBubble>
        <Button onClick={finishStep}>다음 단계로 ▶</Button>
      </div>
    );
  }

  // ── 단어 카드 ──
  if (index < n) {
    const word = dayWords[index];
    const go = (dir: 'next' | 'prev') => {
      const nextIndex = dir === 'next' ? index + 1 : index - 1;
      if (nextIndex < 0) return;
      // 다음 카드의 발음을 바로 들려준다 (버튼을 누른 순간이라 iOS에서도 재생됨)
      if (nextIndex < n && !settings.silentMode) speak(dayWords[nextIndex].en, settings.ttsRate);
      setIndex(nextIndex);
    };
    return (
      <>
        <div className={m.counter}>
          단어 카드 {index + 1} / {n}
        </div>
        <WordCard key={word.id} word={word} settings={settings} showHint={index === 0} onSwipe={go} />
        <div className={m.nav}>
          <Button variant="secondary" onClick={() => go('prev')} disabled={index === 0} aria-label="이전 카드">
            ◀
          </Button>
          <Button onClick={() => go('next')}>{index === n - 1 ? '스펠링 연습하기 ✏️' : '다음 ▶'}</Button>
        </div>
      </>
    );
  }

  // ── 스펠링 따라 쓰기 ──
  const q = spelling[index - n];
  const word = q && dayWords.find((w) => w.id === q.wordId);
  if (!q || !word) {
    // 단어 데이터가 바뀌어 문제가 맞지 않으면 건너뛴다
    return <Button onClick={() => setIndex(index + 1)}>다음 ▶</Button>;
  }

  const submit = (input: string) => {
    const correct = isSpellingCorrect(input, word.en);
    // 기록 + 다음 위치를 한 번에 저장 → 앱을 닫아도 같은 문제를 두 번 기록하지 않음
    updateMission((sv, mi) => ({
      ...recordSpelling(sv, mi.course, word.id, correct, today),
      currentMission: { ...mi, stepIndex: index + 1 },
    }));
    setFeedback({ correct, phrase: correct ? phrase.correct() : phrase.wrong(), word, input });
  };

  return (
    <>
      <div className={m.counter}>
        ✏️ 스펠링 연습 {index - n + 1} / {n}
      </div>
      <SpellingInput key={q.wordId} question={q} word={word} settings={settings} onSubmit={submit} />
    </>
  );
}
