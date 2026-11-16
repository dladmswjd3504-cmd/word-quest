import { describe, expect, it } from 'vitest';
import middle from '../src/data/words.middle.json';
import high from '../src/data/words.high.json';
import {
  buildListenRound,
  buildMatchRound,
  buildSpellingQuestion,
  editDistance,
  firstLetterHint,
  pickDistractors,
  scrambleLetters,
  silentHint,
} from '../src/logic/questions.ts';
import { createRng } from '../src/logic/random.ts';
import type { Word } from '../src/types.ts';
import { fakeWords } from './helpers.ts';

const MID = middle as Word[];
const HIGH = high as Word[];
const w = (en: string, ko: string, pos = '동사', id = en): Word => ({
  id, course: 'middle', day: 1, en, pos, ko, exampleEn: en, exampleKo: '', difficulty: 1, tip: '',
});

describe('편집 거리', () => {
  it('철자 차이를 센다', () => {
    expect(editDistance('borrow', 'borrow')).toBe(0);
    expect(editDistance('borrow', 'barrow')).toBe(1);
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(editDistance('', 'abc')).toBe(3);
  });
});

describe('오답 보기', () => {
  const target = w('borrow', '빌리다');
  const pool = [
    target,
    w('barrow', '손수레', '명사'),
    w('burrow', '굴을 파다'),
    w('tomorrow', '내일', '명사'),
    w('elephant', '코끼리', '명사'),
    w('lend', '빌리다, 꾸다'), // 뜻이 겹침 → 제외
    w('Borrow', '다른 뜻', '동사', 'dup'), // 같은 영단어 → 제외
    w('sorrow', '슬픔', '명사'),
  ];

  it('정답·같은 영단어·뜻이 겹치는 단어는 보기에서 빠진다', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const ds = pickDistractors(target, pool, 3, createRng(seed));
      expect(ds).toHaveLength(3);
      const ens = ds.map((d) => d.en.toLowerCase());
      expect(ens).not.toContain('borrow');
      expect(ens).not.toContain('lend');
      expect(new Set(ens).size).toBe(3);
    }
  });

  it('철자가 비슷한 단어를 우선 고른다', () => {
    const ds = pickDistractors(target, pool, 3, createRng(7)).map((d) => d.en);
    expect(ds).not.toContain('elephant');
  });

  it('후보가 부족하면 있는 만큼만 돌려준다', () => {
    expect(pickDistractors(target, [target, w('cat', '고양이')], 3, createRng(1))).toHaveLength(1);
  });
});

describe('듣고 맞추기', () => {
  it('6문제, 유형 A/B가 섞이고 보기 4개는 모두 다르며 정답 위치가 맞다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const today = MID.filter((x) => x.day === 1);
      const qs = buildListenRound(today, MID, createRng(seed));
      expect(qs).toHaveLength(6);
      expect(qs.filter((q) => q.mode === 'listen-ko')).toHaveLength(3);
      expect(qs.filter((q) => q.mode === 'listen-en')).toHaveLength(3);
      expect(new Set(qs.map((q) => q.wordId)).size).toBe(6);
      for (const q of qs) {
        const word = MID.find((x) => x.id === q.wordId)!;
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices[q.answerIndex]).toBe(q.mode === 'listen-ko' ? word.ko : word.en);
      }
    }
  });

  it('실제 단어 데이터 전체에서 보기 4개를 항상 만들 수 있다', () => {
    for (const list of [MID, HIGH]) {
      for (const target of list) {
        const ds = pickDistractors(target, list, 3, createRng(1));
        expect(ds, target.id).toHaveLength(3);
      }
    }
  });
});

describe('스펠링 문제', () => {
  it('1단계는 섞인 글자 카드, 2·3단계는 카드 없음', () => {
    const word = w('borrow', '빌리다');
    const q1 = buildSpellingQuestion(word, 1, createRng(1));
    expect([...q1.tiles].sort()).toEqual([...'borrow'].sort());
    expect(q1.tiles.join('')).not.toBe('borrow');
    expect(buildSpellingQuestion(word, 2, createRng(1)).tiles).toEqual([]);
  });

  it('섞은 글자는 원래 단어와 다르다 (모든 글자가 같은 경우 제외)', () => {
    for (let seed = 1; seed <= 100; seed++) {
      expect(scrambleLetters('ab', createRng(seed)).join('')).toBe('ba');
    }
    expect(scrambleLetters('aa', createRng(1)).join('')).toBe('aa');
  });

  it('첫 글자 + 글자 수 힌트', () => {
    expect(firstLetterHint('borrow')).toBe('b _ _ _ _ _');
  });

  it('소리 없이 하기 힌트', () => {
    const word = w('borrow', '빌리다');
    expect(silentHint(word, 'listen-ko')).toEqual({ main: 'borrow' });
    expect(silentHint(word, 'listen-en')).toEqual({ main: '빌리다', sub: 'b _ _ _ _ _ (6글자)' });
  });
});

describe('카드 짝맞추기', () => {
  it('6쌍 12장, 단어마다 영단어 카드 1장 + 뜻 카드 1장', () => {
    const today = fakeWords(1);
    const cards = buildMatchRound(today, createRng(3));
    expect(cards).toHaveLength(12);
    const byWord = new Map<string, string[]>();
    for (const c of cards) byWord.set(c.wordId, [...(byWord.get(c.wordId) ?? []), c.side]);
    expect(byWord.size).toBe(6);
    for (const sides of byWord.values()) expect(sides.sort()).toEqual(['en', 'ko']);
    expect(new Set(cards.map((c) => c.cardId)).size).toBe(12);
  });
});
