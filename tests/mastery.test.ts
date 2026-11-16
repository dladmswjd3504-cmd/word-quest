import { describe, expect, it } from 'vitest';
import {
  applyAnswer,
  applyMatchResult,
  applySpelling,
  createWordProgress,
  isMastered,
  isSpellingCorrect,
} from '../src/logic/mastery.ts';
import type { WordProgress } from '../src/types.ts';

const T = '2026-11-16';
const wp = (over: Partial<WordProgress> = {}): WordProgress => ({ ...createWordProgress(), ...over });

describe('숙련도·약점', () => {
  it('정답 +1, 오답 -2, 0~5 범위', () => {
    expect(applyAnswer(wp({ mastery: 2 }), true, T).next.mastery).toBe(3);
    expect(applyAnswer(wp({ mastery: 5 }), true, T).next.mastery).toBe(5);
    expect(applyAnswer(wp({ mastery: 3 }), false, T).next.mastery).toBe(1);
    expect(applyAnswer(wp({ mastery: 1 }), false, T).next.mastery).toBe(0);
  });

  it('처음 보는 단어도 처리하고 날짜를 기록한다', () => {
    const { next } = applyAnswer(undefined, true, T);
    expect(next).toMatchObject({ mastery: 1, lastSeenDate: T, weak: false });
  });

  it('오답이면 약점 단어가 되고 틀린 횟수가 늘어난다', () => {
    const { next } = applyAnswer(wp(), false, T);
    expect(next).toMatchObject({ weak: true, wrongCount: 1, weakStreak: 0 });
  });

  it('약점 단어는 2회 연속 정답이면 해제되고 정복으로 센다', () => {
    let r = applyAnswer(wp({ weak: true }), true, T);
    expect(r).toMatchObject({ conqueredWeak: false, next: { weak: true, weakStreak: 1 } });
    r = applyAnswer(r.next, true, T);
    expect(r).toMatchObject({ conqueredWeak: true, next: { weak: false, weakStreak: 0 } });
  });

  it('약점 연속 정답 중간에 틀리면 처음부터 다시 센다', () => {
    let r = applyAnswer(wp({ weak: true }), true, T);
    r = applyAnswer(r.next, false, T);
    r = applyAnswer(r.next, true, T);
    expect(r.next).toMatchObject({ weak: true, weakStreak: 1 });
  });

  it('mastery 4 이상이면 숙련 상태', () => {
    expect(isMastered(wp({ mastery: 3 }))).toBe(false);
    expect(isMastered(wp({ mastery: 4 }))).toBe(true);
    expect(isMastered(undefined)).toBe(false);
  });

  it('짝맞추기: 0번 틀림 → 정답, 1번 → 변화 없음, 2번 이상 → 약점', () => {
    expect(applyMatchResult(wp(), 0, T).next.mastery).toBe(1);
    expect(applyMatchResult(wp({ mastery: 2 }), 1, T).next).toMatchObject({ mastery: 2, weak: false });
    expect(applyMatchResult(wp({ mastery: 2 }), 2, T).next).toMatchObject({ mastery: 0, weak: true });
  });
});

describe('스펠링 단계 (PRD 4.1)', () => {
  const run = (start: WordProgress, answers: boolean[]) => answers.reduce((p, a) => applySpelling(p, a), start);

  it('1단계에서 연속 3회 정답 → 2단계 (streak 초기화)', () => {
    expect(run(wp(), [true, true])).toMatchObject({ spellingStage: 1, streak: 2 });
    expect(run(wp(), [true, true, true])).toMatchObject({ spellingStage: 2, streak: 0 });
  });

  it('1단계에서 오답이면 연속 기록만 초기화', () => {
    expect(run(wp(), [true, true, false, true, true])).toMatchObject({ spellingStage: 1, streak: 2 });
  });

  it('2단계에서 연속 3회 정답 → 3단계', () => {
    expect(run(wp({ spellingStage: 2 }), [true, true, true])).toMatchObject({ spellingStage: 3, streak: 0 });
  });

  it('2단계에서 오답 → 1단계로', () => {
    expect(run(wp({ spellingStage: 2, streak: 2 }), [false])).toMatchObject({ spellingStage: 1, streak: 0 });
  });

  it('3단계에서 오답 → 2단계로 (1단계까지 떨어지지 않음)', () => {
    expect(run(wp({ spellingStage: 3, streak: 5 }), [false])).toMatchObject({ spellingStage: 2, streak: 0 });
  });

  it('3단계에서 정답이면 3단계 유지', () => {
    expect(run(wp({ spellingStage: 3 }), [true, true, true, true])).toMatchObject({ spellingStage: 3, streak: 4 });
  });

  it('처음부터 1→2→3단계까지 6회 연속 정답', () => {
    expect(run(createWordProgress(), Array(6).fill(true)).spellingStage).toBe(3);
  });

  it('정답 판정은 대소문자·앞뒤 공백을 무시한다', () => {
    expect(isSpellingCorrect('  Borrow ', 'borrow')).toBe(true);
    expect(isSpellingCorrect('BORROW', 'borrow')).toBe(true);
    expect(isSpellingCorrect('borow', 'borrow')).toBe(false);
    expect(isSpellingCorrect('bor row', 'borrow')).toBe(false);
  });
});
