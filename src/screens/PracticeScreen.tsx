import { useState, type ReactNode } from 'react';
import { Mascot } from '../components/Mascot.tsx';
import { Button, ProgressBar, SpeechBubble } from '../components/ui.tsx';
import { speak, useTtsStatus } from '../lib/tts.ts';
import { localDateString } from '../logic/date.ts';
import { isQuizAnswerCorrect } from '../logic/mission.ts';
import { buildPracticeRound, finishPractice, recordPracticeAnswer, type PracticeKind } from '../logic/practice.ts';
import type { Question } from '../logic/questions.ts';
import { titleById } from '../logic/titles.ts';
import { useSave } from '../state/GameContext.tsx';
import { usePhrase } from '../state/usePhrase.ts';
import { useWords } from '../state/useWords.ts';
import type { Word } from '../types.ts';
import { AnswerFeedback } from './mission/AnswerFeedback.tsx';
import { ChoiceQuestionView } from './mission/ChoiceQuestionView.tsx';
import { SilentToggle } from './mission/SilentToggle.tsx';
import { SpellingInput } from './mission/SpellingInput.tsx';
import m from './mission/mission.module.css';
import s from './screens.module.css';

const TITLE: Record<PracticeKind, string> = { review: '🔁 복습 게임', weak: '⚔️ 약점 정복' };

/**
 * 자유 복습 게임 (PRD 3.2): 경험치 없이 숙련도·약점만 반영. 한 판은 저장하지 않고 화면 안에서만 진행한다.
 */
export function PracticeScreen({ kind, onExit }: { kind: PracticeKind; onExit: () => void }) {
  const { save } = useSave();
  const words = useWords(save.settings.course);
  const [round, setRound] = useState(0);

  return (
    <main className={m.screen}>
      {words ? (
        <PracticeGame key={round} kind={kind} words={words} onExit={onExit} onAgain={() => setRound((r) => r + 1)} />
      ) : (
        <div className={`${s.page} ${s.center}`}>불러오는 중…</div>
      )}
    </main>
  );
}

interface Feedback {
  correct: boolean;
  phrase: string;
  word: Word;
  yourAnswer: string;
}

function PracticeGame({
  kind,
  words,
  onExit,
  onAgain,
}: {
  kind: PracticeKind;
  words: Word[];
  onExit: () => void;
  onAgain: () => void;
}) {
  const { save, update } = useSave();
  const course = save.settings.course;
  const settings = save.settings;
  const tts = useTtsStatus();
  const silent = settings.silentMode || tts === 'unavailable';
  const phrase = usePhrase();
  const [questions] = useState<Question[]>(() => buildPracticeRound(kind, words, save.progress[course], Math.random));
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<{ newTitles: string[] } | null>(null);
  const total = questions.length;
  const wordOf = (q: Question | undefined) => (q ? words.find((w) => w.id === q.wordId) : undefined);
  const setSilent = (silentMode: boolean) => update((sv) => ({ ...sv, settings: { ...sv.settings, silentMode } }));
  const playQuestion = (i: number) => {
    const q = questions[i];
    const w = wordOf(q);
    if (q?.kind === 'choice' && w && !silent) speak(w.en, settings.ttsRate);
  };

  const top = (
    <div className={m.top}>
      <button type="button" className={m.close} onClick={onExit} aria-label="그만하고 돌아가기">
        ✕
      </button>
      <div className={m.topMain}>
        <div className={m.stepLabel}>
          <span>{TITLE[kind]}</span>
          {total > 0 && (
            <span>
              {Math.min(index + (feedback ? 0 : 1), total)}/{total}
            </span>
          )}
        </div>
        <ProgressBar value={index} max={Math.max(1, total)} label="복습 게임 진행도" />
      </div>
    </div>
  );
  const centered = (children: ReactNode) => (
    <>
      {top}
      <div className={m.body}>
        <div className={`${s.stack} ${s.center}`} style={{ flex: 1, justifyContent: 'center' }}>
          {children}
        </div>
      </div>
    </>
  );

  if (total === 0) {
    return centered(
      <>
        <Mascot size={110} mood="think" />
        <SpeechBubble>
          {kind === 'weak' ? '지금은 약점 단어가 없어! 대단해 ✨' : '아직 복습할 단어가 없어. 오늘의 모험부터 시작해 줘!'}
        </SpeechBubble>
        <Button onClick={onExit}>돌아가기</Button>
      </>,
    );
  }

  if (feedback) {
    const isLast = index >= total;
    return (
      <>
        {top}
        <div className={m.body}>
          <AnswerFeedback
            correct={feedback.correct}
            phrase={feedback.phrase}
            word={feedback.word}
            yourAnswer={feedback.yourAnswer}
            nextLabel={isLast ? '결과 보기 ▶' : '다음 문제 ▶'}
            onNext={() => {
              setFeedback(null);
              if (isLast) {
                const box: { newTitles: string[] } = { newTitles: [] };
                update((sv) => {
                  const r = finishPractice(sv, course, localDateString());
                  box.newTitles = r.newTitles;
                  return r.save;
                });
                setResult(box);
              } else playQuestion(index);
            }}
          />
        </div>
      </>
    );
  }

  if (result) {
    const titles = result.newTitles.map(titleById).filter((x) => x !== undefined);
    return centered(
      <>
        <Mascot size={120} mood="cheer" bounce />
        <SpeechBubble>
          {total}문제 중 <b>{correctCount}문제</b> 맞혔어! 🎉
          <br />
          맞힌 단어는 숙련도가 올라갔어.
        </SpeechBubble>
        {titles.map((x) => (
          <p key={x.id} className={m.newItem}>
            <span className={m.newItemEmoji} aria-hidden>
              🏅
            </span>
            <span>
              <span className={m.newItemLabel}>새 칭호</span>
              <br />
              <b>{x.name}</b>
            </span>
          </p>
        ))}
        <Button onClick={onAgain}>🔁 한 판 더</Button>
        <Button variant="secondary" onClick={onExit}>
          돌아가기
        </Button>
      </>,
    );
  }

  if (!started) {
    return centered(
      <>
        <Mascot size={110} mood="happy" />
        <SpeechBubble>
          {kind === 'weak' ? '⚔️ 약점 단어를 정복하러 가자!' : '🔁 배운 단어를 다시 만나 보자!'}
          <br />
          {total}문제 · 경험치는 없지만 숙련도가 올라가!
        </SpeechBubble>
        <Button
          onClick={() => {
            playQuestion(0);
            setStarted(true);
          }}
        >
          시작하기 ▶
        </Button>
        <SilentToggle silent={settings.silentMode} disabled={tts === 'unavailable'} onChange={setSilent} />
      </>,
    );
  }

  const q = questions[index];
  const word = wordOf(q);
  if (!word) {
    return centered(<Button onClick={() => setIndex(index + 1)}>다음 ▶</Button>);
  }

  const submit = (answer: number | string) => {
    const correct = isQuizAnswerCorrect(q, answer, word);
    update((sv) => recordPracticeAnswer(sv, { course, question: q, wordId: word.id, correct, today: localDateString() }));
    if (correct) setCorrectCount((c) => c + 1);
    setIndex(index + 1);
    setFeedback({
      correct,
      phrase: correct ? phrase.correct() : phrase.wrong(),
      word,
      yourAnswer: typeof answer === 'number' && q.kind === 'choice' ? q.choices[answer] : String(answer),
    });
  };

  return (
    <>
      {top}
      <div className={m.body}>
        {q.kind === 'choice' ? (
          <>
            <ChoiceQuestionView question={q} word={word} settings={settings} silent={silent} onChoose={submit} />
            <SilentToggle silent={settings.silentMode} disabled={tts === 'unavailable'} onChange={setSilent} />
          </>
        ) : (
          <SpellingInput key={`${index}-${q.wordId}`} question={q} word={word} settings={settings} onSubmit={submit} />
        )}
      </div>
    </>
  );
}
