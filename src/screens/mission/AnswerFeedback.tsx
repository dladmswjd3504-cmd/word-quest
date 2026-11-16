import { useEffect } from 'react';
import { Button } from '../../components/ui.tsx';
import { useSfx } from '../../lib/sfx.ts';
import type { Word } from '../../types.ts';
import m from './mission.module.css';

/** 정답/오답 피드백: 색만이 아니라 아이콘(✔/✖)과 문구로도 구분한다 (PRD 7.6). 오답이면 정답과 예문을 보여 준다. */
export function AnswerFeedback({
  correct,
  phrase,
  word,
  yourAnswer,
  onNext,
  nextLabel = '다음',
}: {
  correct: boolean;
  phrase: string;
  word: Word;
  yourAnswer?: string;
  onNext: () => void;
  nextLabel?: string;
}) {
  const sfx = useSfx();
  useEffect(() => {
    sfx(correct ? 'correct' : 'wrong');
  }, [correct, sfx]);

  return (
    <>
      <div className={`${m.feedback} ${correct ? m.correct : m.wrong}`} role="status" aria-live="assertive">
        {correct && (
          <span className={m.burst} aria-hidden>
            <span>✨</span>
            <span>⭐</span>
            <span>✨</span>
            <span>⭐</span>
          </span>
        )}
        <span className={m.feedbackIcon} aria-hidden>
          {correct ? '✔' : '✖'}
        </span>
        <span className={m.feedbackText}>
          {correct ? '정답! ' : '오답 · '}
          {phrase}
        </span>
        <span className={m.word} lang="en">
          {word.en}
        </span>
        {!correct && yourAnswer && (
          <span>
            내 답: <span className={m.yourAnswer} lang="en">{yourAnswer}</span>
          </span>
        )}
        <span className={m.meaning} style={{ fontSize: '1.2rem' }}>
          {word.ko}
        </span>
        {!correct && (
          <>
            <span className={m.example} lang="en">
              {word.exampleEn}
            </span>
            <span className={m.exampleKo}>{word.exampleKo}</span>
          </>
        )}
      </div>
      <Button block onClick={onNext} autoFocus>
        {nextLabel}
      </Button>
    </>
  );
}
