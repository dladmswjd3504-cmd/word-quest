import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { speak, useTtsStatus } from '../lib/tts.ts';
import s from './ui.module.css';

type Variant = 'primary' | 'secondary' | 'mint' | 'ghost';

export function Button({
  variant = 'primary',
  block,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean }) {
  return (
    <button
      type="button"
      className={[s.btn, s[variant], block ? s.block : '', className ?? ''].join(' ')}
      {...rest}
    />
  );
}

export function SpeechBubble({
  children,
  className,
  tail = 'top',
}: {
  children: ReactNode;
  className?: string;
  /** 꼬리 방향: top(위의 마스코트) / left(왼쪽의 마스코트) */
  tail?: 'top' | 'left';
}) {
  return <div className={`${s.bubble} ${tail === 'left' ? s.bubbleLeft : ''} ${className ?? ''}`}>{children}</div>;
}

/** 🔊 발음 듣기. 소리 없이 하기 모드이거나 영어 음성이 없으면 비활성화 */
export function SpeakButton({
  text,
  rate,
  silent,
  label = '발음 듣기',
}: {
  text: string;
  rate: 'normal' | 'slow';
  silent: boolean;
  label?: string;
}) {
  const status = useTtsStatus();
  const disabled = silent || status === 'unavailable';
  return (
    <button
      type="button"
      className={s.speak}
      onClick={() => speak(text, rate)}
      disabled={disabled}
      aria-label={label}
      title={disabled ? '소리를 쓸 수 없어요' : label}
    >
      🔊
    </button>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={s.progress} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <div className={s.progressFill} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`${s.card} ${className ?? ''}`}>{children}</div>;
}

export function Notice({ icon = '⚠️', children }: { icon?: string; children: ReactNode }) {
  return (
    <div className={s.notice} role="note">
      <span aria-hidden>{icon}</span>
      <div>{children}</div>
    </div>
  );
}

export const uiStyles = s;
