import { useEffect, useState } from 'react';
import { gameConfig } from './config/gameConfig.ts';
import styles from './App.module.css';

/** M0 임시 화면: 앱이 뜨고 오프라인에서도 열리는지 확인하는 용도. M3에서 온보딩/홈으로 교체된다. */
export default function App() {
  const online = useOnline();

  return (
    <main className={styles.page}>
      <img className={styles.mascot} src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
      <h1 className={styles.title}>Word Quest</h1>
      <p className={styles.subtitle}>매일 10개, 단어 모험</p>
      <p className={styles.bubble}>
        안녕! 나는 {gameConfig.mascotName}야. 모험 준비 중이니까 조금만 기다려 줘!
      </p>
      <p className={styles.status} role="status">
        {online ? '🟢 온라인' : '🟠 오프라인 — 그래도 앱은 잘 열려요!'}
      </p>
    </main>
  );
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}
