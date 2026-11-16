import { Card } from '../../components/ui.tsx';
import { speak } from '../../lib/tts.ts';
import { silentHint, type ChoiceQuestion } from '../../logic/questions.ts';
import type { Settings, Word } from '../../types.ts';
import m from './mission.module.css';

const MODE_LABEL = {
  'listen-ko': '알맞은 뜻을 골라 줘',
  'listen-en': '알맞은 철자를 골라 줘',
} as const;

/**
 * 듣고 4지선다 문제 한 개 (듣고 맞추기·복습 퀴즈·보스전 공용).
 * silent이면 발음 대신 글자 힌트를 보여 준다 (소리 없이 하기).
 */
export function ChoiceQuestionView({
  question,
  word,
  settings,
  silent,
  onChoose,
}: {
  question: ChoiceQuestion;
  word: Word;
  settings: Settings;
  silent: boolean;
  onChoose: (choiceIndex: number) => void;
}) {
  const hint = silentHint(word, question.mode);
  const choicesAreEnglish = question.mode === 'listen-en';
  const showsEnglishWord = question.mode === 'listen-ko';

  return (
    <>
      <Card className={m.prompt}>
        <span className={m.stageTag}>{MODE_LABEL[question.mode]}</span>
        {silent ? (
          <>
            <span className={showsEnglishWord ? m.word : m.promptMeaning} lang={showsEnglishWord ? 'en' : 'ko'}>
              {hint.main}
            </span>
            {hint.sub && (
              <span className={m.hint} lang="en">
                {hint.sub}
              </span>
            )}
          </>
        ) : (
          <button
            type="button"
            className={m.bigSpeak}
            onClick={() => speak(word.en, settings.ttsRate)}
            aria-label="발음 다시 듣기"
          >
            <span aria-hidden>🔊</span>
            <span className={m.bigSpeakLabel}>다시 듣기</span>
          </button>
        )}
      </Card>
      <div className={m.choices}>
        {question.choices.map((text, i) => (
          <button
            key={i}
            type="button"
            className={`${m.choice} ${choicesAreEnglish ? m.choiceEn : ''}`}
            onClick={() => onChoose(i)}
            lang={choicesAreEnglish ? 'en' : 'ko'}
          >
            {text}
          </button>
        ))}
      </div>
    </>
  );
}
