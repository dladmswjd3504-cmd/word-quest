import s from './ui.module.css';

export type MascotMood = 'happy' | 'cheer' | 'think';

/**
 * 마스코트 "퀘스티" (SVG, 외부 이미지 없음).
 * 진화 단계별 장식(모자·망토·무기·빛·왕관)은 M7에서 stage에 따라 추가한다.
 */
export function Mascot({
  size = 120,
  mood = 'happy',
  bounce = false,
}: {
  size?: number;
  mood?: MascotMood;
  stage?: number;
  bounce?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={bounce ? s.mascotBounce : undefined}
      role="img"
      aria-label="마스코트 퀘스티"
    >
      {/* 그림자 */}
      <ellipse cx="100" cy="186" rx="52" ry="8" fill="rgba(58,58,90,0.12)" />
      {/* 몸 */}
      <ellipse cx="100" cy="112" rx="72" ry="68" fill="#fff6d6" stroke="#f0d98a" strokeWidth="4" />
      {/* 발 */}
      <ellipse cx="72" cy="178" rx="16" ry="9" fill="#ffd54f" />
      <ellipse cx="128" cy="178" rx="16" ry="9" fill="#ffd54f" />
      {/* 눈 */}
      {mood === 'cheer' ? (
        <>
          <path d="M60 104 Q74 88 88 104" stroke="#3a3a5a" strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M112 104 Q126 88 140 104" stroke="#3a3a5a" strokeWidth="7" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="74" cy="104" rx="14" ry="17" fill="#3a3a5a" />
          <ellipse cx="126" cy="104" rx="14" ry="17" fill="#3a3a5a" />
          <circle cx="79" cy="97" r="5" fill="#fff" />
          <circle cx="131" cy="97" r="5" fill="#fff" />
        </>
      )}
      {/* 볼 */}
      <ellipse cx="52" cy="130" rx="11" ry="7" fill="#ffb3a7" />
      <ellipse cx="148" cy="130" rx="11" ry="7" fill="#ffb3a7" />
      {/* 입 */}
      {mood === 'think' ? (
        <path d="M90 138 L110 136" stroke="#3a3a5a" strokeWidth="5" strokeLinecap="round" />
      ) : (
        <path
          d={mood === 'cheer' ? 'M84 130 Q100 152 116 130 Z' : 'M88 132 Q100 144 112 132'}
          stroke="#3a3a5a"
          strokeWidth="5"
          fill={mood === 'cheer' ? '#ff8a80' : 'none'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {/* 머리 위 별 */}
      <path
        d="M100 18 L108 36 L127 38 L113 50 L117 69 L100 59 L83 69 L87 50 L73 38 L92 36 Z"
        fill="#ffd54f"
        stroke="#f0a500"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
