import { useEffect, useState } from 'react';

/** 안드로이드 Chrome의 "홈 화면에 추가" 요청을 잡아 두었다가 버튼으로 띄운다 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

/** 설치 버튼을 보여 줄 수 있으면 install 함수를, 아니면 null */
export function useInstallPrompt(): (() => Promise<boolean>) | null {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  if (!deferred) return null;
  return async () => {
    const e = deferred;
    if (!e) return false;
    await e.prompt();
    const { outcome } = await e.userChoice;
    deferred = null;
    listeners.forEach((l) => l());
    return outcome === 'accepted';
  };
}
