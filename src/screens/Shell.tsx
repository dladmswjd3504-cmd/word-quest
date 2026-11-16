import { useState } from 'react';
import { Mascot } from '../components/Mascot.tsx';
import { Button, SpeechBubble } from '../components/ui.tsx';
import { Home } from './Home.tsx';
import t from './Shell.module.css';
import s from './screens.module.css';

export type Tab = 'home' | 'character' | 'dex' | 'weak' | 'achievements' | 'settings';

const TABS: { id: Exclude<Tab, 'settings'>; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: '홈' },
  { id: 'character', icon: '🧙', label: '캐릭터' },
  { id: 'dex', icon: '📖', label: '도감' },
  { id: 'weak', icon: '⚠️', label: '약점' },
  { id: 'achievements', icon: '🏆', label: '업적' },
];

/** 하단 탭이 있는 기본 화면. 설정은 홈의 ⚙️로 연다 (PRD 4.6) */
export function Shell({ onOpenMission }: { onOpenMission: () => void }) {
  const [tab, setTab] = useState<Tab>('home');

  return (
    <div className={t.shell}>
      <div className={t.content}>
        {tab === 'home' ? (
          <Home onOpenMission={onOpenMission} onOpenSettings={() => setTab('settings')} />
        ) : (
          <ComingSoon title={tab === 'settings' ? '⚙️ 설정' : TABS.find((x) => x.id === tab)!.label} onBack={() => setTab('home')} />
        )}
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

/** M6에서 채워질 화면 자리 */
function ComingSoon({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className={`${s.page} ${s.center}`}>
      <h1 className={s.title}>{title}</h1>
      <Mascot size={120} mood="think" />
      <SpeechBubble>이 화면은 지금 만들고 있어요. 조금만 기다려 줘! 🛠️</SpeechBubble>
      <Button variant="secondary" onClick={onBack}>
        홈으로
      </Button>
    </div>
  );
}
