import { useState } from 'react';
import type { PracticeKind } from '../logic/practice.ts';
import { AchievementsScreen } from './AchievementsScreen.tsx';
import { CharacterScreen } from './CharacterScreen.tsx';
import { DexScreen } from './DexScreen.tsx';
import { Home } from './Home.tsx';
import { SettingsScreen } from './SettingsScreen.tsx';
import { WeakScreen } from './WeakScreen.tsx';
import t from './Shell.module.css';

export type Tab = 'home' | 'character' | 'dex' | 'weak' | 'achievements' | 'settings';

const TABS: { id: Exclude<Tab, 'settings'>; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: '홈' },
  { id: 'character', icon: '🧙', label: '캐릭터' },
  { id: 'dex', icon: '📖', label: '도감' },
  { id: 'weak', icon: '⚠️', label: '약점' },
  { id: 'achievements', icon: '🏆', label: '업적' },
];

/** 하단 탭이 있는 기본 화면. 설정은 홈의 ⚙️로 연다 (PRD 4.6) */
export function Shell({
  onOpenMission,
  onOpenPractice,
}: {
  onOpenMission: () => void;
  onOpenPractice: (kind: PracticeKind) => void;
}) {
  const [tab, setTab] = useState<Tab>('home');
  const goHome = () => setTab('home');

  return (
    <div className={t.shell}>
      <div className={t.content}>
        {tab === 'home' && (
          <Home onOpenMission={onOpenMission} onOpenSettings={() => setTab('settings')} onOpenPractice={onOpenPractice} />
        )}
        {tab === 'character' && <CharacterScreen />}
        {tab === 'dex' && <DexScreen />}
        {tab === 'weak' && <WeakScreen onOpenPractice={onOpenPractice} />}
        {tab === 'achievements' && <AchievementsScreen />}
        {tab === 'settings' && <SettingsScreen onBack={goHome} />}
      </div>
      <nav className={t.tabbar} aria-label="메뉴">
        {TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            className={`${t.tab} ${tab === x.id ? t.tabOn : ''}`}
            onClick={() => setTab(x.id)}
            aria-current={tab === x.id ? 'page' : undefined}
          >
            <span className={t.tabIcon} aria-hidden>
              {x.icon}
            </span>
            {x.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
