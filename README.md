# 워드 퀘스트 (Word Quest)

매일 10개, 단어 모험 — 중·고등학생용 영단어 암기 모바일 웹앱(PWA). 요구사항은 [PRD.md](PRD.md).

## 실행 방법
```bash
npm install          # 처음 한 번
npm run dev          # 개발 서버 (같은 와이파이의 휴대폰에서도 접속 가능)
npm test             # 단위 테스트
npm run build        # 배포용 빌드 → dist/
npm run preview      # 빌드 결과 확인 (오프라인/홈 화면 추가 테스트)
```

## 자주 바꾸는 곳
| 바꾸고 싶은 것 | 파일 |
|---|---|
| 경험치, 레벨, 보스 기준, 문제 수 | `src/config/gameConfig.ts` |
| 단어 (M1부터) | `src/data/words.middle.json`, `src/data/words.high.json` |
| 색, 글꼴 크기 | `src/styles/tokens.css` |
| 앱 아이콘 | `public/icon.svg` 수정 후 `npm run icons` |
