import { useId } from 'react';
import { gameConfig } from '../config/gameConfig.ts';
import equipmentList from '../data/equipment.json';
import { evolutionOf } from '../logic/xp.ts';
import { useGame } from '../state/GameContext.tsx';
import s from './ui.module.css';

export type MascotMood = 'happy' | 'cheer' | 'think';

/** 장비를 겹쳐 그릴 자리 (equipment.json 순서대로). 머리 장식·검과 겹치지 않는 둘레 */
const EQUIP_SLOTS: readonly [number, number][] = [
  [18, 58],
  [34, 22],
  [166, 22],
  [184, 58],
  [186, 104],
  [184, 150],
];

/**
 * 마스코트 "퀘스티" (SVG, 외부 이미지 없음).
 * 진화 단계(PRD 4.5, 8)에 따라 장식이 하나씩 늘어난다:
 * 1 초보 모험가(머리 위 별) → 2 모자 → 3 망토 → 4 검 → 5 빛나는 효과 → 6 왕관
 * stage를 주지 않으면 지금 내 레벨의 단계로 그린다. withEquipment면 보스 장비도 둘레에 그린다.
 */
export function Mascot({
  size = 120,
  mood = 'happy',
  stage,
  bounce = false,
  withEquipment = false,
}: {
  size?: number;
  mood?: MascotMood;
  stage?: number;
  bounce?: boolean;
  withEquipment?: boolean;
}) {
  const { save } = useGame();
  const glowId = useId();
  const st = stage ?? (save ? evolutionOf(save.player.level).stage : 1);
  const evoName = gameConfig.evolution.find((e) => e.stage === st)?.name;
  const owned = withEquipment && save ? equipmentList.filter((e) => save.player.equipment.includes(e.id)) : [];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={bounce ? s.mascotBounce : undefined}
      role="img"
      aria-label={`마스코트 ${gameConfig.mascotName}${evoName ? ` (${evoName})` : ''}`}
    >
      {/* 5단계: 빛나는 효과 */}
      {st >= 5 && (
        <>
          <defs>
            <radialGradient id={glowId}>
              <stop offset="50%" stopColor="#ffe27a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffe27a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="108" r="98" fill={`url(#${glowId})`} />
          <g className={s.mascotTwinkle} fill="#ffd54f">
            <Sparkle x={30} y={40} r={9} />
            <Sparkle x={172} y={44} r={7} />
            <Sparkle x={24} y={150} r={6} />
            <Sparkle x={178} y={160} r={8} />
          </g>
        </>
      )}

      {/* 그림자 */}
      <ellipse cx="100" cy="188" rx="54" ry="8" fill="rgba(58,58,90,0.12)" />

      {/* 3단계: 망토 (몸 뒤) */}
      {st >= 3 && (
        <path
          d="M48 90 Q16 150 24 186 Q100 196 176 186 Q184 150 152 90 Z"
          fill="#8e7ce0"
          stroke="#6a58c0"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      )}

      {/* 몸 */}
      <ellipse cx="100" cy="112" rx="72" ry="68" fill="#fff6d6" stroke="#f0d98a" strokeWidth="4" />
      {/* 망토 고정 단추 */}
      {st >= 3 && (
        <>
          <circle cx="44" cy="96" r="7" fill="#ffd54f" stroke="#f0a500" strokeWidth="2" />
          <circle cx="156" cy="96" r="7" fill="#ffd54f" stroke="#f0a500" strokeWidth="2" />
        </>
      )}
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

      {/* 4단계: 검 (몸 앞 왼쪽 아래에서 위로) */}
      {st >= 4 && (
        <g transform="rotate(-35 60 160)">
          <path d="M55 150 L55 86 L60 74 L65 86 L65 150 Z" fill="#e6edf5" stroke="#8b98a8" strokeWidth="3" strokeLinejoin="round" />
          <line x1="60" y1="84" x2="60" y2="146" stroke="#c3ceda" strokeWidth="2" />
          <rect x="44" y="148" width="32" height="8" rx="4" fill="#ffd54f" stroke="#f0a500" strokeWidth="2" />
          <rect x="56" y="156" width="8" height="18" rx="3" fill="#a0673a" />
          <circle cx="60" cy="178" r="5" fill="#ffd54f" stroke="#f0a500" strokeWidth="2" />
        </g>
      )}

      {/* 머리 장식: 1 별 / 2~5 모자 / 6 왕관 */}
      {st >= 6 ? (
        <g>
          <path
            d="M56 58 L62 16 L82 38 L100 6 L118 38 L138 16 L144 58 Z"
            fill="#ffd54f"
            stroke="#f0a500"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <rect x="56" y="50" width="88" height="12" rx="4" fill="#ffc72c" stroke="#f0a500" strokeWidth="3" />
          <circle cx="100" cy="56" r="5" fill="#ff6f61" />
          <circle cx="76" cy="56" r="4" fill="#4aa8d8" />
          <circle cx="124" cy="56" r="4" fill="#4aa8d8" />
          <circle cx="62" cy="16" r="4" fill="#fff" stroke="#f0a500" strokeWidth="2" />
          <circle cx="100" cy="6" r="4" fill="#fff" stroke="#f0a500" strokeWidth="2" />
          <circle cx="138" cy="16" r="4" fill="#fff" stroke="#f0a500" strokeWidth="2" />
        </g>
      ) : st >= 2 ? (
        <g>
          <path d="M62 54 Q64 12 100 10 Q136 12 138 54 Z" fill="#ff8a80" stroke="#e0645a" strokeWidth="4" strokeLinejoin="round" />
          <rect x="63" y="40" width="74" height="10" fill="#ffd54f" />
          <ellipse cx="100" cy="56" rx="54" ry="10" fill="#ff8a80" stroke="#e0645a" strokeWidth="4" />
          <Sparkle x={100} y={28} r={8} />
        </g>
      ) : (
        <path
          d="M100 18 L108 36 L127 38 L113 50 L117 69 L100 59 L83 69 L87 50 L73 38 L92 36 Z"
          fill="#ffd54f"
          stroke="#f0a500"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}

      {/* 보스 장비 (PRD 4.4) */}
      {owned.map((e, i) => {
        const [x, y] = EQUIP_SLOTS[i % EQUIP_SLOTS.length];
        return (
          <text key={e.id} x={x} y={y} fontSize="26" textAnchor="middle" dominantBaseline="central">
            {e.emoji}
          </text>
        );
      })}
    </svg>
  );
}

/** 네 갈래 반짝이 */
function Sparkle({ x, y, r }: { x: number; y: number; r: number }) {
  const k = r * 0.3;
  return (
    <path
      d={`M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`}
      fill="#ffd54f"
      stroke="#f0a500"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  );
}
