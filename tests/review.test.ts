import { describe, expect, it } from 'vitest';
import { bossKindOf, bossWordPool, buildBossRound, isBossPassed, selectBossWords } from '../src/logic/boss.ts';
import { createRng } from '../src/logic/random.ts';
import { buildReviewRound, reviewDayNumbers, selectReviewWords } from '../src/logic/review.ts';
import { createEmptyCourseProgress } from '../src/storage/save.ts';
import type { CourseProgress } from '../src/types.ts';
import { fakeWords } from './helpers.ts';

const WORDS = fakeWords(30);

function progressWith(entries: Record<string, { mastery?: number; weak?: boolean }>): CourseProgress {
  const p = createEmptyCourseProgress();
  for (const [id, e] of Object.entries(entries)) {
    p.words[id] = { mastery: e.mastery ?? 0, spellingStage: 1, streak: 0, wrongCount: 0, weak: e.weak ?? false, weakStreak: 0, lastSeenDate: '' };
  }
  return p;
}

describe('복습 출제 (PRD 4.3)', () => {
  it('복습 Day는 N-1, N-3, N-7 중 1 이상', () => {
    expect(reviewDayNumbers(1)).toEqual([]);
    expect(reviewDayNumbers(2)).toEqual([1]);
    expect(reviewDayNumbers(4)).toEqual([3, 1]);
    expect(reviewDayNumbers(8)).toEqual([7, 5, 1]);
  });

  it('Day 1은 오늘 단어로 10문제', () => {
    const picked = selectReviewWords({ day: 1, words: WORDS, progress: createEmptyCourseProgress(), rng: createRng(1) });
    expect(picked).toHaveLength(10);
    expect(picked.every((w) => w.day === 1)).toBe(true);
  });

  it('Day 2는 어제 단어 + 오늘 단어로 구성', () => {
    const picked = selectReviewWords({ day: 2, words: WORDS, progress: createEmptyCourseProgress(), rng: createRng(1) });
    expect(picked).toHaveLength(10);
    expect(new Set(picked.map((w) => w.day))).toEqual(new Set([1, 2]));
  });

  it('Day 8은 Day 7, 5, 1에서 골고루 나오고 다른 Day는 나오지 않는다 (약점 없음)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const picked = selectReviewWords({ day: 8, words: WORDS, progress: createEmptyCourseProgress(), rng: createRng(seed) });
      expect(picked).toHaveLength(10);
      const days = picked.map((w) => w.day);
      expect(new Set(days)).toEqual(new Set([7, 5, 1]));
      for (const d of [7, 5, 1]) expect(days.filter((x) => x === d).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('약점 단어는 다른 Day여도 우선 포함된다 (최대 절반)', () => {
    const weak = ['mid-d02-03', 'mid-d04-05', 'mid-d06-01'];
    const progress = progressWith(Object.fromEntries(weak.map((id) => [id, { weak: true }])));
    const picked = selectReviewWords({ day: 8, words: WORDS, progress, rng: createRng(5) }).map((w) => w.id);
    for (const id of weak) expect(picked).toContain(id);

    const manyWeak = progressWith(Object.fromEntries(WORDS.filter((w) => w.day <= 7).map((w) => [w.id, { weak: true }])));
    const p2 = selectReviewWords({ day: 8, words: WORDS, progress: manyWeak, rng: createRng(5) });
    expect(p2).toHaveLength(10);
    expect(p2.filter((w) => [7, 5, 1].includes(w.day)).length).toBeGreaterThanOrEqual(5);
  });

  it('숙련도가 높은 단어는 덜 나온다', () => {
    // Day 7의 1~5번은 mastery 5, 6~10번은 mastery 0
    const progress = progressWith(
      Object.fromEntries(WORDS.filter((w) => w.day === 7).map((w, i) => [w.id, { mastery: i < 5 ? 5 : 0 }])),
    );
    let high = 0;
    let low = 0;
    for (let seed = 1; seed <= 300; seed++) {
      for (const w of selectReviewWords({ day: 8, words: WORDS, progress, rng: createRng(seed) })) {
        if (w.day !== 7) continue;
        if (progress.words[w.id].mastery === 5) high++;
        else low++;
      }
    }
    expect(low).toBeGreaterThan(high * 2);
  });

  it('문제는 듣기 A/B + 철자 입력이 섞여 있다', () => {
    const qs = buildReviewRound({ day: 8, words: WORDS, progress: createEmptyCourseProgress(), rng: createRng(2) });
    const kinds = qs.map((q) => (q.kind === 'spelling' ? 'spelling' : q.mode));
    expect(new Set(kinds)).toEqual(new Set(['listen-ko', 'listen-en', 'spelling']));
  });
});

describe('보스전 (PRD 4.4)', () => {
  it('Day 5, 10, 15, 20, 25는 중간 보스, Day 30은 최종 보스', () => {
    expect([5, 10, 15, 20, 25].map(bossKindOf)).toEqual(['mid', 'mid', 'mid', 'mid', 'mid']);
    expect(bossKindOf(30)).toBe('final');
    expect([1, 4, 6, 29].map(bossKindOf)).toEqual([null, null, null, null]);
  });

  it('중간 보스는 지난 5일(오늘 포함) 50개, 최종 보스는 전체', () => {
    const pool = bossWordPool(10, 'mid', WORDS);
    expect(pool).toHaveLength(50);
    expect(new Set(pool.map((w) => w.day))).toEqual(new Set([6, 7, 8, 9, 10]));
    expect(bossWordPool(30, 'final', WORDS)).toHaveLength(300);
  });

  it('10문제, 범위 안의 단어만, 약점 단어 우선', () => {
    const weak = ['mid-d06-02', 'mid-d09-09'];
    const progress = progressWith({ ...Object.fromEntries(weak.map((id) => [id, { weak: true }])), 'mid-d01-01': { weak: true } });
    const picked = selectBossWords({ day: 10, kind: 'mid', words: WORDS, progress, rng: createRng(4) });
    expect(picked).toHaveLength(10);
    expect(picked.every((w) => w.day >= 6 && w.day <= 10)).toBe(true);
    for (const id of weak) expect(picked.map((w) => w.id)).toContain(id);
    expect(buildBossRound({ day: 10, kind: 'mid', words: WORDS, progress, rng: createRng(4) })).toHaveLength(10);
  });

  it('정답률 70% 이상이면 승리', () => {
    expect(isBossPassed(7, 10)).toBe(true);
    expect(isBossPassed(6, 10)).toBe(false);
    expect(isBossPassed(10, 10)).toBe(true);
    expect(isBossPassed(0, 0)).toBe(false);
  });
});
