import { useSyncExternalStore } from 'react';
import { gameConfig } from '../config/gameConfig.ts';

/**
 * 발음 듣기 (Web Speech API speechSynthesis, PRD 7.3)
 * - 음성 목록은 비동기로 로드되므로 voiceschanged를 기다린다.
 * - iOS는 사용자 터치 안에서 바로 speak()를 불러야 하므로 speak()는 동기 함수다.
 * - 미국식(en-US) → 다른 영어 음성 순서로 고르고, 영어 음성이 하나도 없으면 'unavailable'.
 */
export type TtsStatus = 'loading' | 'available' | 'unavailable';

let status: TtsStatus = 'loading';
let voice: SpeechSynthesisVoice | null = null;
const listeners = new Set<() => void>();

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

function normalizeLang(lang: string): string {
  return lang.replace('_', '-').toLowerCase();
}

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const en = voices.filter((v) => normalizeLang(v.lang).startsWith('en'));
  const us = en.filter((v) => normalizeLang(v.lang) === 'en-us');
  // 기기 기본 음성 > 로컬 음성(오프라인 가능) 순으로 선호
  const rank = (v: SpeechSynthesisVoice) => (v.default ? 0 : 2) + (v.localService ? 0 : 1);
  const best = (list: SpeechSynthesisVoice[]) => [...list].sort((a, b) => rank(a) - rank(b))[0] ?? null;
  return best(us) ?? best(en);
}

function setStatus(next: TtsStatus) {
  status = next;
  listeners.forEach((l) => l());
}

/** 앱 시작 시 한 번 호출: 음성 목록을 미리 불러 둔다 */
export function initTts(): void {
  const s = synth();
  if (!s) {
    setStatus('unavailable');
    return;
  }
  const tryLoad = () => {
    const v = pickVoice(s.getVoices());
    if (v) {
      voice = v;
      setStatus('available');
      return true;
    }
    return false;
  };
  if (tryLoad()) return;
  s.addEventListener?.('voiceschanged', () => {
    if (tryLoad()) return;
    if (status === 'loading') setStatus('unavailable');
  });
  // 일부 브라우저는 voiceschanged를 보내지 않는다 → 잠시 후 다시 확인
  window.setTimeout(() => {
    if (!tryLoad() && status === 'loading') setStatus('unavailable');
  }, 2500);
}

export function getTtsStatus(): TtsStatus {
  return status;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTtsStatus(): TtsStatus {
  return useSyncExternalStore(subscribe, getTtsStatus);
}

/** 영어 문장을 읽는다. 반드시 버튼 클릭 처리 안에서 바로 호출할 것 (iOS) */
export function speak(text: string, rate: 'normal' | 'slow' = 'normal'): boolean {
  const s = synth();
  if (!s) return false;
  try {
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice?.lang ?? gameConfig.tts.lang;
    if (voice) u.voice = voice;
    u.rate = gameConfig.tts.rate[rate];
    s.speak(u);
    return true;
  } catch {
    return false;
  }
}
