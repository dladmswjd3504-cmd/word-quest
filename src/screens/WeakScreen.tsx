import { Mascot } from '../components/Mascot.tsx';
import { Button, SpeakButton, SpeechBubble } from '../components/ui.tsx';
import { gameConfig } from '../config/gameConfig.ts';
import { weakWords, type PracticeKind } from '../logic/practice.ts';
import { useSave } from '../state/GameContext.tsx';
import { useWords } from '../state/useWords.ts';
import s from './screens.module.css';
import t from './tabs.module.css';

/** ⚠️ 약점 단어 노트: 자주 틀린 단어(과정별), 바로 복습 게임으로 (PRD 4.6) */
export function WeakScreen({ onOpenPractice }: { onOpenPractice: (kind: PracticeKind) => void }) {
  const { save } = useSave();
  const course = save.settings.course;
  const words = useWords(course);
  const progress = save.progress[course];

  if (!words) return <div className={s.page}>불러오는 중…</div>;
  const list = weakWords(words, progress).sort(
    (a, b) => (progress.words[b.id]?.wrongCount ?? 0) - (progress.words[a.id]?.wrongCount ?? 0),
  );

  return (
    <div className={s.page}>
      <h1 className={s.title}>⚠️ 약점 단어 노트</h1>

      {list.length === 0 ? (
        <div className={`${s.stack} ${s.center}`}>
          <Mascot size={110} mood="cheer" />
          <SpeechBubble>지금은 약점 단어가 없어! 대단해 ✨</SpeechBubble>
          <p className={s.muted}>틀린 단어는 여기에 모여요. 같이 정복하자!</p>
        </div>
      ) : (
        <>
          <p className={s.lead}>
            약점 단어 <b>{list.length}개</b> · {gameConfig.mastery.weakClearStreak}번 연속으로 맞히면 노트에서 빠져요.
          </p>
          <Button block onClick={() => onOpenPractice('weak')}>
            ⚔️ 약점 정복 게임 시작
          </Button>
          <ul className={`${t.wordList} ${t.dayBlock}`}>
            {list.map((w) => (
              <li key={w.id} className={t.wordRow}>
                <div className={t.wordMain}>
                  <span className={t.wordEn} lang="en">
                    {w.en}
                  </span>
                  <span className={t.wordKo}>
                    {w.pos} · {w.ko} · Day {w.day}
                  </span>
                </div>
                <span className={t.badge}>틀린 횟수 {progress.words[w.id]?.wrongCount ?? 0}</span>
                <SpeakButton text={w.en} rate={save.settings.ttsRate} silent={save.settings.silentMode} label={`${w.en} 발음 듣기`} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
