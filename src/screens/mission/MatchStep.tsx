import { useEffect, useRef, useState } from 'react';
import { Button, Notice, SpeechBubble } from '../../components/ui.tsx';
import { Mascot } from '../../components/Mascot.tsx';
import { speak, useTtsStatus } from '../../lib/tts.ts';
import { advanceStep, finishMatch, type MatchSummary } from '../../logic/mission.ts';
import type { MatchCard } from '../../logic/questions.ts';
import type { MissionState, SaveData, Settings, Word } from '../../types.ts';
import m from './mission.module.css';
import s from '../screens.module.css';

/** 틀린 짝을 보여 주는 시간 (ms) */
const WRONG_FLASH_MS = 700;

/** 시작 후 지난 시간(초, 최소 1). 버튼을 누른 순간에만 부른다 */
function secondsSince(startedAt: number): number {
  return Math.max(1, Math.round((Date.now() - startedAt) / 1000));
}

/**
 * [3] 카드 짝맞추기 (PRD 4.2)
 * 영단어 카드 ↔ 한글 뜻 카드 6쌍. 빨리 끝낼수록 보너스.
 * 틀린 짝은 감점 없음. 처음 고른 카드의 단어를 "틀린 횟수"로 세고, 2번 이상이면 약점으로 기록한다.
 * stepIndex 0: 진행 중 / 1: 끝남 (기록 완료)
 */
export function MatchStep({
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
  const tts = useTtsStatus();
  const silent = settings.silentMode || tts === 'unavailable';
  const cards = mission.questions as MatchCard[];
  const pairCount = new Set(cards.map((c) => c.wordId)).size;

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [selected, setSelected] = useState<MatchCard | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const wrongCounts = useRef<Record<string, number>>({});
  const [summary, setSummary] = useState<MatchSummary | null>(null);

  // 틀린 짝 표시는 잠시 뒤 사라진다
  useEffect(() => {
    if (!wrongPair) return;
    const t = window.setTimeout(() => setWrongPair(null), WRONG_FLASH_MS);
    return () => window.clearTimeout(t);
  }, [wrongPair]);

  const finishStep = () => updateMission((sv, mi) => ({ ...sv, currentMission: advanceStep(mi) }));

  // ── 끝남 ──
  if (mission.stepIndex >= 1) {
    const weakWords = (summary?.weakWordIds ?? [])
      .map((id) => dayWords.find((w) => w.id === id))
      .filter((w): w is Word => !!w);
    return (
      <div className={`${s.stack} ${s.center}`} style={{ flex: 1, justifyContent: 'center' }}>
        <Mascot size={120} mood="cheer" bounce />
        <SpeechBubble>
          짝맞추기 완료! 🃏
          {summary && (
            <>
              <br />⏱ {summary.seconds}초 · ⭐ 경험치 +{summary.xp}
              {summary.speedBonus > 0 && <> (빠르기 보너스 +{summary.speedBonus})</>}
            </>
          )}
        </SpeechBubble>
        {weakWords.length > 0 && (
          <Notice icon="📒">
            약점 노트에 담았어, 같이 정복하자!{' '}
            {weakWords.map((w) => (
              <span key={w.id}>
                <b lang="en">{w.en}</b> {w.ko}{' '}
              </span>
            ))}
          </Notice>
        )}
        <Button onClick={finishStep}>다음 단계로 ▶</Button>
      </div>
    );
  }

  // ── 시작 안내 (시간은 시작 버튼을 누른 뒤부터 잰다) ──
  if (startedAt === null) {
    return (
      <div className={`${s.stack} ${s.center}`} style={{ flex: 1, justifyContent: 'center' }}>
        <Mascot size={110} mood="happy" />
        <SpeechBubble>
          🃏 영단어 카드와 뜻 카드를 짝지어 줘!
          <br />
          {pairCount}쌍을 빨리 맞추면 보너스가 있어. 틀려도 괜찮아!
        </SpeechBubble>
        <Button onClick={() => setStartedAt(Date.now())}>시작하기 ▶</Button>
      </div>
    );
  }

  const finish = (counts: Record<string, number>) => {
    const seconds = secondsSince(startedAt);
    let result: MatchSummary | null = null;
    updateMission((sv) => {
      const r = finishMatch(sv, { wrongCounts: counts, seconds, today });
      result = r.summary;
      return r.save;
    });
    setSummary(result);
  };

  const press = (card: MatchCard) => {
    if (matched.includes(card.wordId)) return;
    if (!selected || selected.cardId === card.cardId) {
      setSelected(selected?.cardId === card.cardId ? null : card);
      return;
    }
    if (selected.side === card.side) {
      // 같은 종류 카드끼리는 고르기만 바꾼다
      setSelected(card);
      return;
    }
    setSelected(null);
    if (selected.wordId === card.wordId) {
      const enCard = card.side === 'en' ? card : selected;
      if (!silent) speak(enCard.text, settings.ttsRate);
      const next = [...matched, card.wordId];
      setMatched(next);
      if (next.length === pairCount) finish(wrongCounts.current);
    } else {
      wrongCounts.current = {
        ...wrongCounts.current,
        [selected.wordId]: (wrongCounts.current[selected.wordId] ?? 0) + 1,
      };
      setWrongPair([selected.cardId, card.cardId]);
    }
  };

  return (
    <>
      <div className={m.counter} aria-live="polite">
        🃏 짝 맞춘 수 {matched.length} / {pairCount}
      </div>
      <div className={m.matchGrid}>
        {cards.map((card) => {
          const isMatched = matched.includes(card.wordId);
          const isSelected = selected?.cardId === card.cardId;
          const isWrong = !!wrongPair?.includes(card.cardId);
          const state = isMatched ? '짝 맞춤' : isWrong ? '짝이 아니에요' : isSelected ? '선택됨' : '';
          return (
            <button
              key={card.cardId}
              type="button"
              className={[
                m.matchCard,
                card.side === 'en' ? m.matchEn : m.matchKo,
                isSelected ? m.matchSelected : '',
                isMatched ? m.matchDone : '',
                isWrong ? m.matchWrong : '',
              ].join(' ')}
              onClick={() => press(card)}
              disabled={isMatched}
              aria-pressed={isSelected}
              aria-label={`${card.text}${state ? ` (${state})` : ''}`}
              lang={card.side === 'en' ? 'en' : 'ko'}
            >
              {isMatched && (
                <span className={m.matchMark} aria-hidden>
                  ✔
                </span>
              )}
              {isWrong && (
                <span className={m.matchMark} aria-hidden>
                  ✖
                </span>
              )}
              {card.text}
            </button>
          );
        })}
      </div>
    </>
  );
}
