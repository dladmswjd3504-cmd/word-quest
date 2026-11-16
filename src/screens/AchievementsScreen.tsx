import { ProgressBar } from '../components/ui.tsx';
import { TITLES } from '../logic/titles.ts';
import { useSave } from '../state/GameContext.tsx';
import s from './screens.module.css';
import t from './tabs.module.css';

/** 🏆 업적: 칭호 획득/미획득 현황 (PRD 4.5, 4.6) */
export function AchievementsScreen() {
  const { save } = useSave();
  const owned = new Set(save.player.titles);

  return (
    <div className={s.page}>
      <h1 className={s.title}>🏆 업적</h1>
      <p className={s.lead}>
        모은 칭호 <b>{owned.size}</b> / {TITLES.length}
      </p>
      <div className={s.stack}>
        {TITLES.map((title) => {
          const got = owned.has(title.id);
          const p = !got && title.progress ? title.progress(save) : null;
          return (
            <div key={title.id} className={`${t.titleRow} ${got ? '' : t.locked}`}>
              <span className={t.titleIcon} aria-hidden>
                {got ? '🏅' : '🔒'}
              </span>
              <div className={t.titleMain}>
                <span className={t.titleName}>
                  {title.name}
                  {got && <span className={t.ok}> · 획득!</span>}
                </span>
                <span className={t.titleDesc}>{title.description}</span>
                {p && (
                  <>
                    <ProgressBar value={p.current} max={p.target} label={`${title.name} 진행도`} />
                    <span className={t.titleDesc}>
                      {p.current} / {p.target}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
