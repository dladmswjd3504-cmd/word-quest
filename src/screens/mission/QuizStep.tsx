import { useState } from 'react';
import { Button, ProgressBar, SpeechBubble } from '../../components/ui.tsx';
import { Mascot } from '../../components/Mascot.tsx';
import { speak, useTtsStatus } from '../../lib/tts.ts';
import { bossKindOf } from '../../logic/boss.ts';
import { answerQuiz, bossResult, isQuizAnswerCorrect } from '../../logic/mission.ts';
import type { Question } from '../../logic/questions.ts';
import { usePhrase } from '../../state/usePhrase.ts';
import type { MissionState, SaveData, Settings, Word } from '../../types.ts';
import { AnswerFeedback } from './AnswerFeedback.tsx';
import { ChoiceQuestionView } from './ChoiceQuestionView.tsx';
import { SilentToggle } from './SilentToggle.tsx';
import { SpellingInput } from './SpellingInput.tsx';
import m from './mission.module.css';
import s from '../screens.module.css';

interface Feedback {
  correct: boolean;
  phrase: string;
  word: Word;
  yourAnswer: string;
}

const BOSS = {
  mid: { emoji: '👾', name: '중간 보스' },
  final: { emoji: '🐉', name: '최종 보스' },
} as const;

/**
 * [4] 복습 퀴즈 또는 보스전 (PRD 4.3, 4.4)
 * 듣고 맞추기 A/B + 철자 입력이 섞인 문제. 보스전은 정답률 70% 이상이면 승리, 지면 벌점 없이 다시 도전.
 */
export function QuizStep({
  mission,
  words,
  settings,
  today,
  updateMission,
  onSetSilent,
  onFinish,
  onRetryBoss,
  onExit,
}: {
  mission: MissionState;
  /** 이 과정의 단어 전체 (복습·보스 문제는 지난 Day 단어도 나온다) */
  words: Word[];
  settings: Settings;
  today: string;
  updateMission: (fn: (save: SaveData, mission: MissionState) => SaveData) => void;
  onSetSilent: (silent: boolean) => void;
  onFinish: () => void;
  onRetryBoss: () => void;
  onExit: () => void;
}) {
  const phrase = usePhrase();
  const tts = useTtsStatus();
  const silent = settings.silentMode || tts === 'unavailable';
  const [started, setStarted] = useState(mission.stepIndex > 0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const isBoss = mission.step === 'boss';
  const boss = BOSS[bossKindOf(mission.day) ?? 'mid'];
  const questions = mission.questions as Question[];
  const index = mission.stepIndex;
  const total = questions.length;
  const result = bossResult(mission);
  const wordOf = (q: Question | undefined) => (q ? words.find((w) => w.id === q.wordId) : undefined);

  /** 보기 문제면 발음을 바로 들려준다 (버튼을 누른 순간이라 iOS에서도 재생됨) */
  const playQuestion = (i: number) => {
    const q = questions[i];
    const w = wordOf(q);
    if (q?.kind === 'choice' && w && !silent) speak(w.en, settings.ttsRate);
  };

  const bossBar = isBoss && (
    <div className={m.bossBar}>
      <span className={m.bossEmojiSmall} aria-hidden>
        {boss.emoji}
      </span>
      <div className={m.bossBarMain}>
        <div className={m.bossBarLabel}>
          <span>{boss.name} 체력</span>
          <span>
            ⚔️ {Math.min(result.correct, result.needed)} / {result.needed}
          </span>
        </div>
        <ProgressBar
          value={Math.max(0, result.needed - result.correct)}
          max={result.needed}
          label={`${boss.name} 체력 (${result.needed}문제를 맞히면 승리)`}
        />
      </div>
    </div>
  );

  // ── 피드백 ──
  if (feedback) {
    const isLast = index >= total;
    return (
      <>
        {bossBar}
        <AnswerFeedback
          correct={feedback.correct}
          phrase={feedback.phrase}
          word={feedback.word}
          yourAnswer={feedback.yourAnswer}
          nextLabel={isLast ? '결과 보기 ▶' : '다음 문제 ▶'}
          onNext={() => {
            setFeedback(null);
            if (!isLast) playQuestion(index);
          }}
        />
      </>
    );
  }

  // ── 결과 ──
  if (index >= total) {
    if (!isBoss) {
      return (
        <div className={`${s.stack} ${s.center}`} style={{ flex: 1, justifyContent: 'center' }}>
          <Mascot size={120} mood="cheer" bounce />
          <SpeechBubble>
            복습 퀴즈 끝! 📝
            <br />
            {total}문제 중 <b>{result.correct}문제</b> 맞혔어!
          </SpeechBubble>
          <Button onClick={onFinish}>🎁 클리어 보상 받기</Button>
        </div>
      );
    }
    if (result.passed) {
      return (
        <div className={`${s.stack} ${s.center}`} style={{ flex: 1, justifyContent: 'center' }}>
          <div className={`${m.bossEmoji} ${m.bossDefeated}`} aria-hidden>
            {boss.emoji}
          </div>
          <SpeechBubble>
            <b>{boss.name} 처치!</b> 🎉
            <br />
            {total}문제 중 {result.correct}문제 정답!
          </SpeechBubble>
          <Button onClick={onFinish}>🎁 보상 받기</Button>
        </div>
      );
    }
    return (
      <div className={`${s.stack} ${s.center}`} style={{ flex: 1, justifyContent: 'center' }}>
        <div className={m.bossEmoji} aria-hidden>
          {boss.emoji}
        </div>
        <Mascot size={90} mood="think" />
        <SpeechBubble>
          아깝다! {total}문제 중 {result.correct}문제 맞혔어.
          <br />
          {result.needed}문제만 맞히면 이길 수 있어. 다시 도전해 볼까? 💪
        </SpeechBubble>
        <Button
          onClick={() => {
            onRetryBoss();
            setStarted(false);
          }}
        >
          ⚔️ 다시 도전!
        </Button>
        <Button variant="ghost" onClick={onExit}>
          조금 쉬었다 할래 (홈으로)
        </Button>
      </div>
    );
  }

  // ── 시작 안내 ──
  if (!started) {
    return (
      <div className={`${s.stack} ${s.center}`} style={{ flex: 1, justifyContent: 'center' }}>
        {isBoss ? (
          <>
            <div className={`${m.bossEmoji} ${m.bossAppear}`} aria-hidden>
              {boss.emoji}
            </div>
            <SpeechBubble>
              ⚔️ <b>{boss.name}</b>가 나타났다!
              <br />
              {total}문제 중 <b>{result.needed}문제</b> 이상 맞히면 승리!
              <br />
              져도 괜찮아, 몇 번이든 다시 도전할 수 있어.
            </SpeechBubble>
          </>
        ) : (
          <>
            <Mascot size={110} mood="happy" />
            <SpeechBubble>
              📝 복습 퀴즈!
              <br />
              지난번에 만난 단어들을 다시 만나 보자. ({total}문제)
            </SpeechBubble>
          </>
        )}
        <Button
          onClick={() => {
            playQuestion(index);
            setStarted(true);
          }}
        >
          {isBoss ? '⚔️ 보스전 시작!' : '시작하기 ▶'}
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

  const submit = (answer: number | string) => {
    const correct = isQuizAnswerCorrect(q, answer, word);
    // 기록 + 다음 위치를 한 번에 저장 → 앱을 닫아도 같은 문제를 두 번 기록하지 않음
    updateMission((sv) => answerQuiz(sv, { question: q, answer, word, today }).save);
    setFeedback({
      correct,
      phrase: correct ? phrase.correct() : phrase.wrong(),
      word,
      yourAnswer: typeof answer === 'number' && q.kind === 'choice' ? q.choices[answer] : String(answer),
    });
  };

  return (
    <>
      {bossBar}
      <div className={m.counter}>
        {isBoss ? '⚔️ 보스전' : '📝 복습 퀴즈'} {index + 1} / {total}
      </div>
      {q.kind === 'choice' ? (
        <ChoiceQuestionView question={q} word={word} settings={settings} silent={silent} onChoose={submit} />
      ) : (
        <SpellingInput key={`${index}-${q.wordId}`} question={q} word={word} settings={settings} onSubmit={submit} />
      )}
      {q.kind === 'choice' && (
        <SilentToggle silent={settings.silentMode} disabled={tts === 'unavailable'} onChange={onSetSilent} />
      )}
    </>
  );
}
