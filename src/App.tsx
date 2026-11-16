import { useEffect, useState } from 'react';
import { Mascot } from './components/Mascot.tsx';
import { Button, SpeechBubble } from './components/ui.tsx';
import { getWordsOfDay, loadWords } from './data/words.ts';
import { detectInAppBrowser } from './lib/inAppBrowser.ts';
import { localDateString } from './logic/date.ts';
import { startMission } from './logic/mission.ts';
import { appActivity } from './pwa.ts';
import { InAppBrowserNotice } from './screens/InAppBrowserNotice.tsx';
import { MissionScreen } from './screens/mission/MissionScreen.tsx';
import { Onboarding } from './screens/Onboarding.tsx';
import { Shell } from './screens/Shell.tsx';
import { GameProvider, useGame } from './state/GameContext.tsx';
import type { SaveData } from './types.ts';
import s from './screens/screens.module.css';

export default function App() {
  return (
    <GameProvider>
      <Root />
    </GameProvider>
  );
}

type View = 'tabs' | 'mission';

function Root() {
  const { save, loadStatus, replace } = useGame();
  const [inApp] = useState(() => detectInAppBrowser());
  const [inAppDismissed, setInAppDismissed] = useState(false);
  const [corruptAcknowledged, setCorruptAcknowledged] = useState(false);
  const [view, setView] = useState<View>('tabs');

  useEffect(() => {
    appActivity.busy = view === 'mission';
  }, [view]);

  if (inApp && !inAppDismissed) {
    return <InAppBrowserNotice kind={inApp} onContinue={() => setInAppDismissed(true)} />;
  }

  if (!save) {
    if (loadStatus === 'corrupt' && !corruptAcknowledged) {
      return (
        <main className={`${s.page} ${s.full} ${s.center}`}>
          <Mascot size={120} mood="think" />
          <SpeechBubble>
            앗, 저장된 기록을 읽을 수 없어요. 😢
            <br />
            백업 코드가 있다면 새로 시작한 뒤 <b>설정 → 기록 불러오기</b>로 되살릴 수 있어요.
          </SpeechBubble>
          <Button onClick={() => setCorruptAcknowledged(true)}>새로 시작하기</Button>
        </main>
      );
    }
    return (
      <Onboarding
        onDone={async (created: SaveData) => {
          // 온보딩이 끝나면 바로 Day 1 시작 (PRD 3.1)
          const course = created.settings.course;
          const words = await loadWords(course);
          const today = localDateString();
          replace(startMission(created, { course, day: 1, dayWords: getWordsOfDay(words, 1), today, rng: Math.random }));
          setView('mission');
        }}
      />
    );
  }

  return view === 'mission' ? (
    <MissionScreen onExit={() => setView('tabs')} />
  ) : (
    <Shell onOpenMission={() => setView('mission')} />
  );
}
