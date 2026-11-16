import { useId } from 'react';
import { gameConfig } from '../config/gameConfig.ts';
import equipmentList from '../data/equipment.json';
import { evolutionOf } from '../logic/xp.ts';
import { useGame } from '../state/GameContext.tsx';
import s from './ui.module.css';

export type MascotMood = 'happy' | 'cheer' | 'think';

/** 장비를 겹쳐 그릴 자리 (equipment.json 순서대로). 고양이 귀·얼굴·검과 겹치지 않는 둘레 */
const EQUIP_SLOTS: readonly [number, number][] = [
  [20, 74],
  [34, 24],
  [166, 24],
  [182, 74],
  [184, 120],
  [180, 164],
];

/**
 * 마스코트 "벼락이" (밤샘 턱시도 냥이, SVG, 외부 이미지 없음).
 * 중고등학생 취향의 힙하고 쿨한 단어 메이트.
 * 진화 단계(PRD 4.5, 8)에 따라 장식이 하나씩 늘어난다:
 * 1 초보 모험가(번개핀 ⚡) → 2 헤드폰 🎧 → 3 모험가 망토 & 단어가방 → 4 만년필 광선검 ⚔️ → 5 번개 오라 ⚡ → 6 벼락 마스터 왕관 👑
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
  const bladeGradId = useId();
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
      <defs>
        {/* 5단계: 사이버 번개 오라 그라데이션 */}
        {st >= 5 && (
          <radialGradient id={glowId}>
            <stop offset="30%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#818cf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
          </radialGradient>
        )}
        {/* 4단계: 만년필 광선검 블레이드 그라데이션 */}
        {st >= 4 && (
          <linearGradient id={bladeGradId} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="65%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        )}
      </defs>

      {/* 5단계: 빛나는 사이버 벼락 오라 */}
      {st >= 5 && (
        <>
            <circle cx="100" cy="110" r="92" fill={`url(#${glowId})`} />
            <g className={s.mascotTwinkle}>
              <LightningSpark x={26} y={48} scale={0.85} color="#38bdf8" />
              <LightningSpark x={174} y={50} scale={0.75} color="#fde047" />
              <Sparkle x={24} y={142} r={7} />
              <Sparkle x={176} y={148} r={8} />
              <Sparkle x={100} y={14} r={6} />
            </g>
          </>
      )}

          {/* 바닥 그림자 */}
          <ellipse cx="100" cy="186" rx="54" ry="8" fill="rgba(24, 28, 44, 0.16)" />

          {/* 꼬리 (몸 뒤쪽 레이어) */}
          <g>
            <path
              d={
                mood === 'cheer'
                  ? 'M130 160 C154 165 178 152 178 126 C178 108 160 106 156 116 C150 124 160 132 166 128 C168 138 154 150 128 150 Z'
                  : 'M130 162 C155 168 176 156 176 136 C176 120 162 116 155 124 C148 132 156 142 165 138 C166 148 152 156 128 152 Z'
              }
              fill="#242838"
              stroke="#151722"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {/* 꼬리 끝 흰색 털 포인트 */}
            <path
              d={
                mood === 'cheer'
                  ? 'M178 124 C178 111 161 107 157 116 C154 120 158 126 163 124 C167 122 172 120 176 126 Z'
                  : 'M176 134 C176 122 163 118 156 124 C153 128 157 133 161 131 C165 129 170 128 174 135 Z'
              }
              fill="#ffffff"
            />
          </g>

          {/* 3단계: 모험가 케이프/망토 (몸 뒤) */}
          {st >= 3 && (
            <path
              d="M48 114 Q14 156 24 186 Q100 196 176 186 Q186 156 152 114 Z"
              fill="#5842c3"
              stroke="#402e96"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          )}

          {/* 몸통 (앉아있는 턱시도 고양이) */}
          <path
            d="M56 116 C46 142 50 178 100 178 C150 178 154 142 144 116 Z"
            fill="#242838"
            stroke="#151722"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* 고양이 머리 & 귀 외곽선 */}
          <path
            d="
          M52 76
          L40 32
          L74 54
          Q100 50 126 54
          L160 32
          L148 76
          C162 90 162 116 148 130
          C132 142 68 142 52 130
          C38 116 38 90 52 76
          Z
        "
            fill="#242838"
            stroke="#151722"
            strokeWidth="4"
            strokeLinejoin="round"
          />

          {/* 왼쪽 귀 안쪽 (연분홍) */}
          <path d="M48 40 L56 68 L72 56 Z" fill="#fca5a5" stroke="#f87171" strokeWidth="1.5" strokeLinejoin="round" />
          {/* 오른쪽 귀 안쪽 (연분홍) */}
          <path d="M152 40 L128 56 L144 68 Z" fill="#fca5a5" stroke="#f87171" strokeWidth="1.5" strokeLinejoin="round" />

          {/* 가슴 흰 털 (턱시도 셔츠 라인) */}
          <path
            d="M84 130 Q100 128 116 130 C126 145 128 166 120 178 C108 180 92 180 80 178 C72 166 74 145 84 130 Z"
            fill="#f8fafc"
          />

          {/* 3단계: 크로스백(단어 가방) 및 망토 버클 */}
          {st >= 3 && (
        <g>
          {/* 어깨 망토 고정 단추 */}
          <circle cx="48" cy="116" r="6" fill="#fde047" stroke="#d97706" strokeWidth="2" />
          <circle cx="152" cy="116" r="6" fill="#fde047" stroke="#d97706" strokeWidth="2" />
          {/* 가죽 스트랩 */}
          <path d="M58 130 L134 168" stroke="#92400e" strokeWidth="5.5" strokeLinecap="round" />
          {/* 스트랩 버클 */}
          <rect x="92" y="145" width="12" height="9" rx="3" fill="#fde047" stroke="#b45309" strokeWidth="1.5" />
          {/* 미니 단어 가방 */}
          <rect x="132" y="152" width="22" height="20" rx="5" fill="#b45309" stroke="#78350f" strokeWidth="2" />
          <path d="M132 154 Q143 162 154 154" fill="#d97706" stroke="#78350f" strokeWidth="1.5" />
          <circle cx="143" cy="162" r="2" fill="#fde047" />
        </g>
          )}

          {/* 흰색 찹쌀떡 앞발 */}
          <ellipse cx="78" cy="178" rx="14" ry="9" fill="#ffffff" stroke="#151722" strokeWidth="3" />
          <line x1="74" y1="174" x2="74" y2="182" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
          <line x1="82" y1="174" x2="82" y2="182" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />

          <ellipse cx="122" cy="178" rx="14" ry="9" fill="#ffffff" stroke="#151722" strokeWidth="3" />
          <line x1="118" y1="174" x2="118" y2="182" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
          <line x1="126" y1="174" x2="126" y2="182" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />

          {/* 주둥이 (Muzzle) 흰색 털 패치 */}
          <path
            d="M82 108 C80 98 120 98 118 108 C126 108 130 117 128 125 C125 135 114 137 100 137 C86 137 75 135 72 125 C70 117 74 108 82 108 Z"
            fill="#ffffff"
            stroke="#e2e8f0"
            strokeWidth="1.5"
          />

          {/* 볼터치 (은은한 피치 핑크) */}
          <ellipse cx="60" cy="118" rx="8" ry="4.5" fill="#fda4af" opacity="0.6" />
          <ellipse cx="140" cy="118" rx="8" ry="4.5" fill="#fda4af" opacity="0.6" />

          {/* 양옆 수염 */}
          <line x1="66" y1="115" x2="38" y2="112" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="66" y1="121" x2="42" y2="125" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="134" y1="115" x2="162" y2="112" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="134" y1="121" x2="158" y2="125" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />

          {/* 분홍빛 고양이 코 */}
          <path d="M96 110 L104 110 L100 115 Z" fill="#f472b6" stroke="#db2777" strokeWidth="1.5" strokeLinejoin="round" />

          {/* 입 모양 (기분에 따른 변화) */}
          {mood === 'cheer' ? (
        <g>
          <path d="M93 116 Q100 128 107 116 Z" fill="#f43f5e" stroke="#151722" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M96 122 Q100 119 104 122" stroke="#fda4af" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
          ) : mood === 'think' ? (
            <path d="M93 118 Q98 114 107 120" stroke="#151722" strokeWidth="3" fill="none" strokeLinecap="round" />
          ) : (
            <path
              d="M93 116 Q97 122 100 117 Q103 122 107 116"
              fill="none"
              stroke="#151722"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 눈 (호박빛 금안 + 기분에 따른 눈매) */}
          {mood === 'cheer' ? (
            <>
              {/* 활짝 웃는 눈 & 반짝이 */}
              <path d="M62 96 Q75 80 88 96" stroke="#151722" strokeWidth="5.5" fill="none" strokeLinecap="round" />
              <path d="M112 96 Q125 80 138 96" stroke="#151722" strokeWidth="5.5" fill="none" strokeLinecap="round" />
              <Sparkle x={56} y={100} r={5} />
              <Sparkle x={144} y={100} r={5} />
            </>
          ) : mood === 'think' ? (
            <>
              {/* 생각 중: 왼쪽 눈은 살짝 찡긋, 오른쪽 눈은 호기심 가득하게 뜨고 눈썹 갸우뚱 */}
              <path d="M64 96 L86 94" stroke="#151722" strokeWidth="5" strokeLinecap="round" />
              <ellipse cx="125" cy="95" rx="12" ry="14" fill="#fbbf24" stroke="#151722" strokeWidth="3" />
              <ellipse cx="125" cy="95" rx="4.5" ry="9" fill="#151722" />
              <circle cx="128" cy="91" r="3" fill="#ffffff" />
              <path d="M115 78 Q125 73 135 79" stroke="#151722" strokeWidth="3" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              {/* happy: 쿨하고 시크한 턱시도 냥이 눈매 (호박빛 금안 + 반쯤 뜬 고양이 눈) */}
              {/* 왼쪽 눈 */}
              <ellipse cx="75" cy="96" rx="13" ry="15" fill="#fbbf24" stroke="#151722" strokeWidth="3" />
              <ellipse cx="75" cy="96" rx="5" ry="10" fill="#151722" />
              <circle cx="78" cy="92" r="3.5" fill="#ffffff" />
              <circle cx="73" cy="101" r="1.8" fill="#ffffff" />
              <path d="M60 92 Q75 97 90 92 L90 85 L60 85 Z" fill="#242838" />
              <path d="M58 91 Q75 98 92 91" stroke="#151722" strokeWidth="3.5" fill="none" strokeLinecap="round" />

              {/* 오른쪽 눈 */}
              <ellipse cx="125" cy="96" rx="13" ry="15" fill="#fbbf24" stroke="#151722" strokeWidth="3" />
              <ellipse cx="125" cy="96" rx="5" ry="10" fill="#151722" />
              <circle cx="128" cy="92" r="3.5" fill="#ffffff" />
              <circle cx="123" cy="101" r="1.8" fill="#ffffff" />
              <path d="M110 92 Q125 97 140 92 L140 85 L110 85 Z" fill="#242838" />
              <path d="M108 91 Q125 98 142 91" stroke="#151722" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </>
          )}

          {/* 4단계: 만년필 광선검 (Hero Laser Pen Sword) */}
          {st >= 4 && (
              <g transform="rotate(-35 55 155)">
                <path
                  d="M52 140 L52 72 L55 60 L58 72 L58 140 Z"
                  fill={`url(#${bladeGradId})`}
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <line x1="55" y1="70" x2="55" y2="136" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                <polygon points="50,140 60,140 55,130" fill="#fde047" stroke="#b45309" strokeWidth="1" />
                <rect x="40" y="140" width="30" height="8" rx="4" fill="#fde047" stroke="#b45309" strokeWidth="2" />
                <rect x="51" y="148" width="8" height="18" rx="3" fill="#1e293b" />
                <line x1="51" y1="154" x2="59" y2="154" stroke="#94a3b8" strokeWidth="1.5" />
                <line x1="51" y1="160" x2="59" y2="160" stroke="#94a3b8" strokeWidth="1.5" />
                <circle cx="55" cy="170" r="5" fill="#fde047" stroke="#b45309" strokeWidth="2" />
              </g>
      )}

              {/* 머리 장식: 1 번개핀 / 2~5 스트릿 헤드폰 + 번개핀 / 6 벼락 마스터 왕관 */}
              {st >= 6 ? (
                <g>
                  {/* 황금 벼락 마스터 왕관 */}
                  <path
                    d="M58 54 L64 16 L84 38 L100 8 L116 38 L136 16 L142 54 Z"
                    fill="#fde047"
                    stroke="#d97706"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                  />
                  <rect x="58" y="46" width="84" height="11" rx="4" fill="#facc15" stroke="#d97706" strokeWidth="2.5" />
                  <circle cx="100" cy="51" r="4.5" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
                  <circle cx="78" cy="51" r="3.5" fill="#f43f5e" stroke="#e11d48" strokeWidth="1" />
                  <circle cx="122" cy="51" r="3.5" fill="#f43f5e" stroke="#e11d48" strokeWidth="1" />
                  <circle cx="64" cy="16" r="3.5" fill="#ffffff" stroke="#d97706" strokeWidth="1.5" />
                  <circle cx="100" cy="8" r="4.5" fill="#ffffff" stroke="#d97706" strokeWidth="2" />
                  <circle cx="136" cy="16" r="3.5" fill="#ffffff" stroke="#d97706" strokeWidth="1.5" />
                </g>
              ) : st >= 2 ? (
                <g>
                  {/* 힙한 스트릿 오버이어 헤드폰 🎧 */}
                  <path
                    d="M44 68 Q100 32 156 68"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M48 68 Q100 36 152 68"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <rect x="34" y="60" width="14" height="28" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  <circle cx="41" cy="74" r="3" fill="#38bdf8" />
                  <rect x="152" y="60" width="14" height="28" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  <circle cx="159" cy="74" r="3" fill="#38bdf8" />
                  {/* 벼락이 시그니처 번개 헤어핀 */}
                  <LightningPin x={56} y={48} />
                </g>
              ) : (
        /* 1단계: 벼락이 시그니처 노란 번개 헤어핀 ⚡ */
        <LightningPin x={56} y={48} />
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

          /** 벼락이 시그니처 번개 핀 */
          function LightningPin({x, y}: {x: number; y: number }) {
  return (
          <polygon
            points={`${x},${y - 14} ${x - 8},${y + 1} ${x - 1},${y + 1} ${x - 6},${y + 14} ${x + 9},${y - 3} ${x + 2},${y - 3}`}
            fill="#fde047"
            stroke="#d97706"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          );
}

          /** 5단계 각성 벼락 스파크 */
          function LightningSpark({x, y, scale = 1, color = '#fde047'}: {x: number; y: number; scale?: number; color?: string }) {
  return (
          <g transform={`translate(${x}, ${y}) scale(${scale})`}>
            <polygon
              points="0,-10 -6,1 0,1 -4,11 7,-2 1,-2"
              fill={color}
              stroke="#ffffff"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </g>
          );
}

          /** 네 갈래 반짝이 별 */
          function Sparkle({x, y, r}: {x: number; y: number; r: number }) {
  const k = r * 0.3;
          return (
          <path
            d={`M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`}
            fill="#fde047"
            stroke="#d97706"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          );
}
