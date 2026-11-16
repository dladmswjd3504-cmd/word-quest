import { SpeakButton } from '../components/ui.tsx';
import { gameConfig } from '../config/gameConfig.ts';
import { bossKindOf } from '../logic/boss.ts';
import { buildDex } from '../logic/practice.ts';
import { useSave } from '../state/GameContext.tsx';
import { useWords } from '../state/useWords.ts';
import s from './screens.module.css';
import t from './tabs.module.css';

/** 📖 단어 도감: 배운 단어 모아보기(과정별), 🔊 다시 듣기, 미학습 단어는 🔒 (PRD 4.6) */
export function DexScreen() {
  const { save } = useSave();
  const course = save.settings.course;
  const words = useWords(course);
  const progress = save.progress[course];

  if (!words) return <div className={s.page}>불러오는 중…</div>;
  const dex = buildDex(words, progress);
  const unlocked = dex.reduce((sum, d) => sum + d.unlockedCount, 0);

  return (
    <div className={s.page}>
      <h1 className={s.title}>📖 단어 도감</h1>
      <p className={s.lead}>
        {course === 'middle' ? '🏫 중학교' : '🎓 고등학교'} 과정 · 모은 단어 <b>{unlocked}</b> / {words.length}
      </p>

      {dex.map((d) => (
        <details key={d.day} className={t.dayBlock} open={d.unlockedCount > 0 && d.unlockedCount < d.words.length}>
          <summary className={t.summary}>
            <span>
              {d.unlockedCount === 0 ? '🔒 ' : ''}Day {d.day}
              {bossKindOf(d.day) && ' ⚔️'}
            </span>
            <span className={s.muted}>
              {d.unlockedCount} / {d.words.length}
            </span>
          </summary>
          <ul className={t.wordList}>
            {d.words.map(({ word, unlocked: open, mastery, weak }) =>
              open ? (
                <li key={word.id} className={t.wordRow}>
                  <div className={t.wordMain}>
                    <span className={t.wordEn} lang="en">
                      {word.en}
                    </span>
                    <span className={t.wordKo}>
                      {word.pos} · {word.ko}
                    </span>
                  </div>
                  {weak && <span className={t.badge}>⚠️ 약점</span>}
                  <span className={t.stars} aria-label={`숙련도 ${mastery} / ${gameConfig.mastery.max}`}>
                    {'★'.repeat(mastery)}
                    {'☆'.repeat(gameConfig.mastery.max - mastery)}
                  </span>
                  <SpeakButton text={word.en} rate={save.settings.ttsRate} silent={save.settings.silentMode} label={`${word.en} 발음 듣기`} />
                </li>
              ) : (
                <li key={word.id} className={`${t.wordRow} ${t.lockedRow}`}>
                  <span aria-hidden>🔒</span>
                  <span>아직 만나지 않은 단어</span>
                </li>
              ),
            )}
          </ul>
        </details>
      ))}
    </div>
  );
}
