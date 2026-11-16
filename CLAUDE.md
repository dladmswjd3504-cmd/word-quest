# Word Quest — Claude Code 작업 지침

중학교 영어 교사가 자기 반(약 20명)에게 쓰는 단어 암기 모바일 웹앱(PWA). 교사는 개발자가 아니다.
**단순하고 안정적이며 수정하기 쉬운 구조**가 최우선이다. 요구사항 원본은 [PRD.md](PRD.md).

## 범위
- 목표·비목표·우선순위는 `PRD.md`를 따른다. 범위를 임의로 넓히지 않는다. 지금은 **1차(슬림)** 만 개발한다.
- 모호하면 `PRD.md` 11장(열린 질문)을 먼저 보고, 없으면 교사에게 묻는다.

## 기술 스택
- Vite + React + TypeScript, CSS Modules + CSS 변수(`src/styles/tokens.css`)
- 상태: React `useReducer` + Context (외부 상태 라이브러리 없음)
- 저장: localStorage (`SaveData.version` 으로 마이그레이션)
- 오프라인: `vite-plugin-pwa` (앱 셸 + 단어 JSON 프리캐시)
- 발음: Web Speech API `speechSynthesis` (`en-US`)
- 테스트: Vitest

## 반드시 지킬 규칙
- **외부 네트워크 의존 금지**: CDN, 외부 폰트·이미지, 분석/추적 스크립트, 광고를 추가하지 않는다. 이미지·캐릭터·아이콘은 SVG/이모지/CSS.
- 게임 로직은 `src/logic/`에 **순수 함수**로 두고 UI와 분리한다. XP·숙련도·스펠링 단계·문제 생성·복습 출제에는 단위 테스트를 쓴다.
- 경험치/레벨/보스 기준/문제 수/복습 간격 등 숫자는 **`src/config/gameConfig.ts`에서만** 바꾼다.
- 단어 데이터(`src/data/words.*.json`) 수정은 JSON만 바꾸고 **`id`는 절대 바꾸지 않는다.** 수정 후 `npm run validate:words` 실행.
- 모든 localStorage 접근은 `src/storage/`를 거치고 try/catch로 감싼다.
- 학생 화면에 출석번호를 노출하지 않는다. 실명을 받지 않는다.
- UI 문구는 친근한 말투(캐릭터 말풍선). 오답 메시지는 절대 비난하지 않는다. 피드백 문구는 `src/data/phrases.json`.
- 모바일 세로 화면 우선. 터치 영역 최소 44×44px, `prefers-reduced-motion` 존중, 색만으로 정답/오답 구분 금지.

## 명령어
- `npm run dev` — 개발 서버
- `npm run build` — 타입 체크 + 프로덕션 빌드 (`dist/`)
- `npm run preview` — 빌드 결과 미리보기 (오프라인/PWA 확인용)
- `npm test` — 단위 테스트
- `npm run validate:words` — 단어 JSON 검증

## 작업 방식
- PRD 10장의 단계(M0~M8) 단위로 진행하고, 각 단계가 끝나면 동작하는 상태로 커밋한다.
