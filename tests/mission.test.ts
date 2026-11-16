import { describe, expect, it } from 'vitest';
import { detectInAppBrowser, externalOpenUrl } from '../src/lib/inAppBrowser.ts';
import { advanceStep, getActiveMission, missionSteps, startMission, stepPosition } from '../src/logic/mission.ts';
import { formatNickname, randomNicknameIndexes } from '../src/logic/nickname.ts';
import { createRng } from '../src/logic/random.ts';
import type { SpellingQuestion } from '../src/logic/questions.ts';
import { migrateSave } from '../src/storage/migrate.ts';
import { fakeWords, newSave } from './helpers.ts';

const T = '2026-11-16';
const day1 = fakeWords(1);

describe('미션 진행', () => {
  it('일반 Day는 학습 → 듣기 → 짝맞추기 → 복습, 보스 Day는 복습 대신 보스전', () => {
    expect(missionSteps(1)).toEqual(['learn', 'listen', 'match', 'review', 'done']);
    expect(missionSteps(5)).toEqual(['learn', 'listen', 'match', 'boss', 'done']);
  });

  it('미션을 시작하면 스펠링 문제 10개(단어당 1회)를 미리 만들어 저장한다', () => {
    const save = startMission(newSave(), { course: 'middle', day: 1, dayWords: day1, today: T, rng: createRng(1) });
    const m = save.currentMission!;
    expect(m).toMatchObject({ course: 'middle', day: 1, date: T, step: 'learn', stepIndex: 0, earnedXp: 0 });
    const qs = m.questions as SpellingQuestion[];
    expect(qs).toHaveLength(10);
    expect(new Set(qs.map((q) => q.wordId)).size).toBe(10);
    expect(qs.every((q) => q.stage === 1 && q.tiles.length > 0)).toBe(true);
    expect(save.lastPlayedDate).toBe(T);
  });

  it('단어의 현재 스펠링 단계로 문제를 만든다', () => {
    const base = newSave();
    base.progress.middle.words['mid-d01-01'] = { mastery: 3, spellingStage: 3, streak: 0, wrongCount: 0, weak: false, weakStreak: 0, lastSeenDate: '' };
    const save = startMission(base, { course: 'middle', day: 1, dayWords: day1, today: T, rng: createRng(1) });
    const q = (save.currentMission!.questions as SpellingQuestion[]).find((x) => x.wordId === 'mid-d01-01')!;
    expect(q).toMatchObject({ stage: 3, tiles: [] });
  });

  it('저장 후 다시 열어도(직렬화·검증 후) 같은 미션이 이어진다', () => {
    const save = startMission(newSave(), { course: 'middle', day: 1, dayWords: day1, today: T, rng: createRng(1) });
    save.currentMission!.stepIndex = 13;
    const reloaded = migrateSave(JSON.parse(JSON.stringify(save)))!;
    expect(getActiveMission(reloaded, 'middle', T)).toEqual(save.currentMission);
  });

  it('날짜가 바뀌었거나 다른 과정이면 진행 중 미션으로 보지 않는다', () => {
    const save = startMission(newSave(), { course: 'middle', day: 1, dayWords: day1, today: T, rng: createRng(1) });
    expect(getActiveMission(save, 'middle', T)).not.toBeNull();
    expect(getActiveMission(save, 'middle', '2026-11-17')).toBeNull();
    expect(getActiveMission(save, 'high', T)).toBeNull();
  });

  it('다음 단계로 넘어가면 위치와 문제를 초기화한다', () => {
    const save = startMission(newSave(), { course: 'middle', day: 1, dayWords: day1, today: T, rng: createRng(1) });
    const next = advanceStep({ ...save.currentMission!, stepIndex: 20 });
    expect(next).toMatchObject({ step: 'listen', stepIndex: 0, questions: [] });
    expect(stepPosition(next)).toEqual({ index: 2, total: 4 });
    expect(advanceStep({ ...next, step: 'done' }).step).toBe('done');
  });
});

describe('닉네임', () => {
  it('조합형 이름 형식', () => {
    expect(formatNickname(0, 0)).toBe('Brave 용감한 · 토끼');
    const { adj, animal } = randomNicknameIndexes(createRng(1));
    expect(formatNickname(adj, animal)).toMatch(/^[A-Z][a-z]+ .+ · .+$/);
  });
});

describe('인앱 브라우저 감지', () => {
  const kakao = 'Mozilla/5.0 (Linux; Android 13; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 KAKAOTALK 10.4.5';
  const kakaoIos = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.4.5';
  const insta = 'Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36 Instagram 300.0';
  const naverIos = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NAVER(inapp; search; 1000; 12.0.0)';
  const chrome = 'Mozilla/5.0 (Linux; Android 13; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
  const safari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  const samsung = 'Mozilla/5.0 (Linux; Android 13; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0 Mobile Safari/537.36';

  it('카카오톡·인스타그램·네이버 앱을 감지한다', () => {
    expect(detectInAppBrowser(kakao)).toBe('kakao');
    expect(detectInAppBrowser(kakaoIos)).toBe('kakao');
    expect(detectInAppBrowser(insta)).toBe('other');
    expect(detectInAppBrowser(naverIos)).toBe('other');
  });

  it('일반 Chrome·Safari·삼성 인터넷은 인앱이 아니다', () => {
    expect(detectInAppBrowser(chrome)).toBeNull();
    expect(detectInAppBrowser(safari)).toBeNull();
    expect(detectInAppBrowser(samsung)).toBeNull();
  });

  it('외부 브라우저로 여는 링크', () => {
    const href = 'https://example.com/word-quest/?a=1';
    expect(externalOpenUrl('kakao', href, kakao)).toBe(`kakaotalk://web/openExternal?url=${encodeURIComponent(href)}`);
    expect(externalOpenUrl('other', href, insta)).toBe(
      'intent://example.com/word-quest/?a=1#Intent;scheme=https;package=com.android.chrome;end',
    );
    expect(externalOpenUrl('other', href, naverIos)).toBeNull();
  });
});
