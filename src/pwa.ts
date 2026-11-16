import { registerSW } from 'virtual:pwa-register';

/**
 * 서비스 워커를 등록한다.
 * 새 버전이 배포되면 대기 상태로 받아 두고, `isBusy()`가 false일 때(진행 중인 미션이 없을 때)만 적용한다.
 * 미션 중이면 이번에는 넘어가고, 다음 접속 때 적용된다.
 */
export function registerPwa(isBusy: () => boolean = () => false): void {
  if (!('serviceWorker' in navigator)) return;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (!isBusy()) void updateSW(true);
    },
  });
}
