import { Mascot } from '../components/Mascot.tsx';
import { Card, ProgressBar } from '../components/ui.tsx';
import { gameConfig } from '../config/gameConfig.ts';
import equipmentList from '../data/equipment.json';
import { evolutionOf, levelProgress } from '../logic/xp.ts';
import { useSave } from '../state/GameContext.tsx';
import s from './screens.module.css';
import t from './tabs.module.css';

/** 🧙 내 캐릭터: 레벨, 경험치, 진화 단계, 출석, 골드, 장비 (PRD 4.6) */
export function CharacterScreen() {
  const { save } = useSave();
  const { player, profile } = save;
  const lp = levelProgress(player.xp);
  const evo = evolutionOf(lp.level);
  const nextEvo = gameConfig.evolution.find((e) => e.stage === evo.stage + 1);

  return (
    <div className={s.page}>
      <h1 className={s.title}>🧙 내 캐릭터</h1>

      <div className={t.hero}>
        <Mascot size={170} bounce stage={evo.stage} withEquipment />
        <div className={t.heroName}>{profile.nickname}</div>
        <span className={t.evoTag}>
          {evo.stage}단계 · {evo.name}
        </span>
        {nextEvo && (
          <span className={s.muted}>
            Lv {nextEvo.minLevel}이 되면 <b>{nextEvo.name}</b>(으)로 진화!
          </span>
        )}
      </div>

      <Card>
        <div className={s.stack}>
          <div className={t.settingRow} style={{ minHeight: 0 }}>
            <span className={t.statValue}>Lv {lp.level}</span>
            <span className={s.muted}>{lp.isMax ? 'MAX 레벨!' : `다음 레벨까지 ${lp.needed - lp.current}`}</span>
          </div>
          <ProgressBar value={lp.isMax ? 1 : lp.current} max={lp.isMax ? 1 : lp.needed} label="경험치" />
          <span className={s.muted}>누적 경험치 {player.xp}</span>
        </div>
      </Card>

      <div className={t.statGrid}>
        <Stat label="총 출석" value={`${player.totalAttendanceDays}일`} />
        <Stat label="골드" value={`🪙 ${player.gold}`} />
        <Stat label="칭호" value={`🏅 ${player.titles.length}`} />
      </div>

      <section className={t.section}>
        <h2 className={t.sectionTitle}>🎒 장비 ({player.equipment.length}/{equipmentList.length})</h2>
        <div className={t.itemGrid}>
          {equipmentList.map((e) => {
            const owned = player.equipment.includes(e.id);
            return (
              <div key={e.id} className={`${t.item} ${owned ? '' : t.locked}`}>
                <span className={t.itemEmoji} aria-hidden>
                  {owned ? e.emoji : '🔒'}
                </span>
                {owned ? e.name : `Day ${e.bossDay} 보스`}
              </div>
            );
          })}
        </div>
        <p className={s.muted}>보스전에서 이기면 장비를 하나씩 얻어요.</p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={t.statBox}>
      <div className={t.statValue}>{value}</div>
      <div className={t.statLabel}>{label}</div>
    </div>
  );
}
