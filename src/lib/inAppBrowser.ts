/**
 * 카카오톡 등 앱 안의 브라우저(인앱 브라우저) 감지 (PRD 7.3)
 * 인앱 브라우저에서는 홈 화면 추가가 안 되고 기록이 따로 저장되므로 Chrome/Safari로 열도록 안내한다.
 */
export type InAppKind = 'kakao' | 'other' | null;

const OTHER_IN_APP = /NAVER\(inapp|Instagram|FBAN|FBAV|FB_IAB|Line\/|everytimeApp|DaumApps|BAND\/|Whale\/[\d.]+ .*inapp|; wv\)/i;

export function detectInAppBrowser(ua: string = navigator.userAgent): InAppKind {
  if (/KAKAOTALK/i.test(ua)) return 'kakao';
  if (OTHER_IN_APP.test(ua)) return 'other';
  return null;
}

export function isIOS(ua: string = navigator.userAgent): boolean {
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
}

export function isAndroid(ua: string = navigator.userAgent): boolean {
  return /Android/i.test(ua);
}

/** 외부 브라우저로 여는 링크. 만들 수 없으면 null (iOS의 카카오 외 인앱 브라우저 → 메뉴에서 직접 열기 안내) */
export function externalOpenUrl(kind: InAppKind, href: string, ua: string = navigator.userAgent): string | null {
  if (kind === 'kakao') return `kakaotalk://web/openExternal?url=${encodeURIComponent(href)}`;
  if (kind === 'other' && isAndroid(ua)) {
    const url = new URL(href);
    return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${url.protocol.replace(':', '')};package=com.android.chrome;end`;
  }
  return null;
}

/** 홈 화면에 추가한 앱으로 실행 중인지 */
export function isStandalone(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}
