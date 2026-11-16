import { useRef, useState, type PointerEvent } from 'react';
import { SpeakButton } from '../../components/ui.tsx';
import type { Settings, Word } from '../../types.ts';
import m from './mission.module.css';

/** 단어 카드: 앞면(영단어·품사·발음) / 탭하면 뒷면(뜻·예문). 좌우로 밀어서 넘길 수 있다. */
export function WordCard({
  word,
  settings,
  showHint,
  onSwipe,
}: {
  word: Word;
  settings: Settings;
  showHint: boolean;
  onSwipe: (dir: 'next' | 'prev') => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const onPointerDown = (e: PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    swiped.current = false;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    start.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped.current = true;
      onSwipe(dx < 0 ? 'next' : 'prev');
    }
  };

  return (
    <div className={m.cardWrap} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <button
        type="button"
        className={`${m.flipCard} ${flipped ? m.flipped : ''}`}
        onClick={() => {
          if (swiped.current) return;
          setFlipped((f) => !f);
        }}
        aria-label={flipped ? `${word.en}: ${word.ko}. 다시 누르면 앞면` : `${word.en}. 누르면 뜻이 보여요`}
      >
        <div className={m.face} aria-hidden={flipped}>
          <span className={m.pos}>{word.pos}</span>
          <span className={m.word} lang="en">
            {word.en}
          </span>
          {showHint && <span className={m.flipHint}>👆 카드를 누르면 뜻이 보여요</span>}
        </div>
        <div className={`${m.face} ${m.back}`} aria-hidden={!flipped}>
          <span className={m.meaning}>{word.ko}</span>
          <span className={m.example} lang="en">
            {word.exampleEn}
          </span>
          <span className={m.exampleKo}>{word.exampleKo}</span>
        </div>
      </button>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: -28, position: 'relative' }}>
        <SpeakButton text={word.en} rate={settings.ttsRate} silent={settings.silentMode} />
      </div>
    </div>
  );
}
