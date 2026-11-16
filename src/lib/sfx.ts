import { useCallback } from 'react';
import { useGame } from '../state/GameContext.tsx';

/**
 * 효과음 (PRD 8): 외부 파일 없이 Web Audio API로 짧은 톤을 합성한다.
 * - 브라우저는 사용자가 화면을 한 번 터치해야 소리를 낼 수 있으므로, 첫 터치 때 오디오를 깨운다 (initSfx).
 * - 설정 > 효과음이 꺼져 있으면 아무 소리도 내지 않는다 (useSfx).
 * - 오답 소리는 혼내는 느낌이 들지 않게 부드럽고 낮게.
 */
export type SfxName = 'correct' | 'wrong' | 'pair' | 'clear' | 'levelUp';

type Note = { freq: number; at: number; dur: number; type?: OscillatorType; gain?: number };

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;

const SOUNDS: Record<SfxName, Note[]> = {
  correct: [
    { freq: E5, at: 0, dur: 0.09 },
    { freq: C6, at: 0.08, dur: 0.16 },
  ],
  wrong: [
    { freq: 330, at: 0, dur: 0.14, type: 'triangle', gain: 0.18 },
    { freq: 262, at: 0.12, dur: 0.22, type: 'triangle', gain: 0.18 },
  ],
  pair: [{ freq: G5, at: 0, dur: 0.08, gain: 0.16 }],
  clear: [
    { freq: C5, at: 0, dur: 0.12 },
    { freq: E5, at: 0.12, dur: 0.12 },
    { freq: G5, at: 0.24, dur: 0.12 },
    { freq: C6, at: 0.36, dur: 0.35 },
  ],
  levelUp: [
    { freq: G5, at: 0, dur: 0.08 },
    { freq: C6, at: 0.08, dur: 0.08 },
    { freq: G5, at: 0.16, dur: 0.08 },
    { freq: C6, at: 0.24, dur: 0.3 },
  ],
};

let ctx: AudioContext | null = null;
const lastPlayed = new Map<SfxName, number>();

function audio(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** 앱 시작 시 한 번: 첫 터치·키 입력 때 오디오를 깨운다 (iOS·Chrome 자동 재생 정책) */
export function initSfx(): void {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    const a = audio();
    if (a && a.state === 'suspended') void a.resume().catch(() => {});
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

/** 효과음을 낸다. 오디오를 쓸 수 없으면 조용히 넘어간다 */
export function playSfx(name: SfxName): void {
  const a = audio();
  if (!a || a.state !== 'running') return;
  // 같은 소리가 거의 동시에 두 번 나지 않게 (개발 모드의 화면 이중 실행 등)
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? -Infinity) < 80) return;
  lastPlayed.set(name, now);

  try {
    const start = a.currentTime + 0.01;
    for (const n of SOUNDS[name]) {
      const osc = a.createOscillator();
      const g = a.createGain();
      osc.type = n.type ?? 'sine';
      osc.frequency.value = n.freq;
      const peak = n.gain ?? 0.22;
      const t0 = start + n.at;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
      osc.connect(g).connect(a.destination);
      osc.start(t0);
      osc.stop(t0 + n.dur + 0.02);
    }
  } catch {
    /* 소리는 없어도 게임은 계속된다 */
  }
}

/** 설정 > 효과음을 따르는 재생 함수 */
export function useSfx(): (name: SfxName) => void {
  const { save } = useGame();
  const enabled = save?.settings.sfx ?? true;
  return useCallback((name: SfxName) => {
    if (enabled) playSfx(name);
  }, [enabled]);
}
