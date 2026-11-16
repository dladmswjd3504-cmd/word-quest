import { Mascot } from '../components/Mascot.tsx';
import { Button, Notice, SpeechBubble } from '../components/ui.tsx';
import { externalOpenUrl, isIOS, type InAppKind } from '../lib/inAppBrowser.ts';
import s from './screens.module.css';

/** 카카오톡 등 인앱 브라우저로 열었을 때: Chrome/Safari로 다시 열도록 안내 (PRD 7.3) */
export function InAppBrowserNotice({ kind, onContinue }: { kind: Exclude<InAppKind, null>; onContinue: () => void }) {
  const openUrl = externalOpenUrl(kind, window.location.href);
  const withRo = isIOS() ? 'Safari로' : 'Chrome으로';

  return (
    <main className={`${s.page} ${s.full} ${s.center}`}>
      <Mascot size={130} mood="think" />
      <h1 className={s.title}>{withRo} 열어 주세요!</h1>
      <SpeechBubble>
        {kind === 'kakao' ? '카카오톡' : '이 앱'} 안에서 열면 <b>기록이 사라질 수 있고</b>, 홈 화면에 추가할 수 없어요.
      </SpeechBubble>

      {openUrl ? (
        <Button block onClick={() => (window.location.href = openUrl)}>
          🌐 {withRo} 열기
        </Button>
      ) : (
        <Notice icon="👉">
          오른쪽 위(또는 아래) <b>⋯ 메뉴</b>를 누르고 <b>“{withRo} 열기”</b> 또는 <b>“다른 브라우저로 열기”</b>를 눌러 주세요.
        </Notice>
      )}

      <Button variant="ghost" onClick={onContinue}>
        그래도 여기서 할래요
      </Button>
    </main>
  );
}
