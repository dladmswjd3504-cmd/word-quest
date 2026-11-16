import { useState } from 'react';
import { Button, Card, SpeakButton } from '../../components/ui.tsx';
import { firstLetterHint, type SpellingQuestion } from '../../logic/questions.ts';
import type { Settings, Word } from '../../types.ts';
import m from './mission.module.css';

const STAGE_LABEL = { 1: '1단계 · 글자 조립', 2: '2단계 · 힌트 보고 쓰기', 3: '3단계 · 힌트 없이 쓰기' } as const;

/**
 * 스펠링 따라 쓰기 (PRD 4.1)
 * 1단계: 섞인 글자 카드를 눌러 조립 / 2단계: 첫 글자 + 글자 수 힌트 / 3단계: 뜻·발음만 보고 입력
 */
export function SpellingInput({
  question,
  word,
  settings,
  onSubmit,
}: {
  question: SpellingQuestion;
  word: Word;
  settings: Settings;
  onSubmit: (input: string) => void;
}) {
  return (
    <>
      <Card className={m.prompt}>
        <span className={m.stageTag}>{STAGE_LABEL[question.stage]}</span>
        <span className={m.promptMeaning}>{word.ko}</span>
        <SpeakButton text={word.en} rate={settings.ttsRate} silent={settings.silentMode} />
        {question.stage === 2 && (
          <span className={m.hint} lang="en" aria-label={`${word.en[0]}로 시작하는 ${word.en.length}글자`}>
            {firstLetterHint(word.en)}
          </span>
        )}
      </Card>
      {question.stage === 1 ? (
        <TileAssembler tiles={question.tiles} onSubmit={onSubmit} />
      ) : (
        <TypedAnswer length={word.en.length} onSubmit={onSubmit} />
      )}
    </>
  );
}

function TileAssembler({ tiles, onSubmit }: { tiles: string[]; onSubmit: (input: string) => void }) {
  const [used, setUsed] = useState<number[]>([]);
  const answer = used.map((i) => tiles[i]).join('');

  const press = (i: number) => {
    const next = [...used, i];
    setUsed(next);
    if (next.length === tiles.length) onSubmit(next.map((j) => tiles[j]).join(''));
  };

  return (
    <>
      <div className={m.slots} aria-live="polite" aria-label={`지금까지 만든 단어: ${answer || '없음'}`}>
        {tiles.map((_, i) => (
          <span key={i} className={`${m.slot} ${i < used.length ? m.slotFilled : ''}`} lang="en">
            {i < used.length ? tiles[used[i]] : ''}
          </span>
        ))}
      </div>
      <div className={m.tiles}>
        {tiles.map((ch, i) => (
          <button
            key={i}
            type="button"
            className={m.tile}
            disabled={used.includes(i)}
            onClick={() => press(i)}
            lang="en"
            aria-label={`글자 ${ch}`}
          >
            {ch}
          </button>
        ))}
      </div>
      <Button variant="secondary" onClick={() => setUsed(used.slice(0, -1))} disabled={used.length === 0}>
        ⌫ 한 글자 지우기
      </Button>
    </>
  );
}

function TypedAnswer({ length, onSubmit }: { length: number; onSubmit: (input: string) => void }) {
  const [text, setText] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSubmit(text);
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <input
        className={m.textInput}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={length + 10}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        lang="en"
        enterKeyHint="done"
        aria-label="영어 철자 입력"
        placeholder="영어로 써 보세요"
        autoFocus
      />
      <Button type="submit" block disabled={!text.trim()}>
        확인
      </Button>
    </form>
  );
}
