import { useState } from 'react';
import { Button, SpeechBubble } from '../../components/ui.tsx';
import { Mascot } from '../../components/Mascot.tsx';
import equipmentList from '../../data/equipment.json';
import phrases from '../../data/phrases.json';
import { pickPhrase } from '../../logic/feedback.ts';
import type { ClearResult } from '../../logic/progress.ts';
import { titleById } from '../../logic/titles.ts';
import { evolutionOf } from '../../logic/xp.ts';
import m from './mission.module.css';
import s from '../screens.module.css';

/** [5] 클리어! 경험치·골드, 레벨업·진화, 보스 보상(장비), 새 칭호 (PRD 3.2, 4.4, 4.5) */
export function ClearScreen({ day, result, onHome }: { day: number; result: ClearResult; onHome: () => void }) {
  const [message] = useState(() => pickPhrase(phrases.clear, null, Math.random));
  const leveledUp = result.levelAfter > result.levelBefore;
  const evoBefore = evolutionOf(result.levelBefore);
  const evoAfter = evolutionOf(result.levelAfter);
  const evolved = evoAfter.stage > evoBefore.stage;
  const equipment = result.newEquipment
    .map((id) => equipmentList.find((e) => e.id === id))
    .filter((e) => e !== undefined);
  const titles = result.newTitles.map((id) => titleById(id)).filter((t) => t !== undefined);

  return (
    <main className={`${s.page} ${s.full}`}>
      <div className={`${s.stack} ${s.center}`} style={{ flex: 1, justifyContent: 'center' }}>
        <div className={m.clearTitle} role="status">
          <span className={m.sparkle} aria-hidden>
            ✨
          </span>{' '}
          Day {day} 클리어!{' '}
          <span className={m.sparkle} aria-hidden>
            ✨
          </span>
        </div>
        <Mascot size={130} mood="cheer" bounce stage={evoAfter.stage} />
        <SpeechBubble>{message}</SpeechBubble>

        {result.rewardEligible || result.bossRewarded ? (
          <div className={m.rewards}>
            <div className={m.rewardItem}>
              <span aria-hidden>⭐</span> 경험치 <b>+{result.xpGained}</b>
            </div>
            <div className={m.rewardItem}>
              <span aria-hidden>🪙</span> 골드 <b>+{result.goldGained}</b>
            </div>
          </div>
        ) : (
          <p className={s.muted}>
            오늘 경험치는 이미 받았어요 (하루 1번).
            <br />
            진도와 단어 기록은 잘 저장됐어!
          </p>
        )}

        {leveledUp && (
          <div className={m.levelUp}>
            <div className={m.levelUpTitle}>🎉 레벨 업!</div>
            <div>
              Lv {result.levelBefore} → <b>Lv {result.levelAfter}</b>
            </div>
            {evolved && (
              <div>
                ✨ <b>{evoAfter.name}</b>(으)로 진화했어!
              </div>
            )}
          </div>
        )}

        {equipment.map((e) => (
          <div key={e.id} className={m.newItem}>
            <span className={m.newItemEmoji} aria-hidden>
              {e.emoji}
            </span>
            <div>
              <div className={m.newItemLabel}>보스 보상 · 새 장비</div>
              <b>{e.name}</b>
            </div>
          </div>
        ))}

        {titles.map((t) => (
          <div key={t.id} className={m.newItem}>
            <span className={m.newItemEmoji} aria-hidden>
              🏅
            </span>
            <div>
              <div className={m.newItemLabel}>새 칭호</div>
              <b>{t.name}</b> <span className={s.muted}>· {t.description}</span>
            </div>
          </div>
        ))}

        <Button block onClick={onHome}>
          홈으로 🏠
        </Button>
      </div>
    </main>
  );
}
