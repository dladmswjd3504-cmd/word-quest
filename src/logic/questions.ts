import { gameConfig } from '../config/gameConfig.ts';
import type { SpellingStage, Word } from '../types.ts';
import { shuffle, type Rng } from './random.ts';

/** 듣고 맞추기 유형: A = 듣고 한글 뜻 고르기, B = 듣고 영단어 철자 고르기 */
export type ChoiceMode = 'listen-ko' | 'listen-en';

export interface ChoiceQuestion {
  kind: 'choice';
  mode: ChoiceMode;
  wordId: string;
  /** 보기 (mode가 listen-ko면 한글 뜻, listen-en이면 영단어) */
  choices: string[];
  answerIndex: number;
}

export interface SpellingQuestion {
  kind: 'spelling';
  wordId: string;
  stage: SpellingStage;
  /** 1단계에서 누를 글자 카드 (섞인 순서) */
  tiles: string[];
}

export type Question = ChoiceQuestion | SpellingQuestion;

export interface MatchCard {
  cardId: string;
  wordId: string;
  side: 'en' | 'ko';
  text: string;
}

// ── 오답 보기 ──

/** 두 단어의 편집 거리 (철자가 얼마나 비슷한지) */
export function editDistance(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  let prev = Array.from({ length: t.length + 1 }, (_, j) => j);
  for (let i = 1; i <= s.length; i++) {
    const cur = [i];
    for (let j = 1; j <= t.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[t.length];
}

/** 한글 뜻이 서로 포함 관계면 보기로 함께 내지 않는다. 예) "필요한" 과 "꼭 필요한" → 겹침 */
function koOverlaps(a: string, b: string): boolean {
  const x = a.trim();
  const y = b.trim();
  return x.includes(y) || y.includes(x);
}

/**
 * 오답 보기를 고른다 (PRD 4.2).
 * 우선순위: ① 철자가 비슷한 단어(편집 거리 작은 것) ② 같은 품사 ③ 같은 과정(pool이 이미 같은 과정).
 * 정답과 영단어·한글 뜻이 겹치는 단어는 제외한다. 약간의 무작위를 섞어 매번 똑같지 않게 한다.
 */
export function pickDistractors(target: Word, pool: readonly Word[], count: number, rng: Rng): Word[] {
  const targetEn = target.en.toLowerCase();
  const chosen: Word[] = [];
  const candidates = pool
    .filter((w) => w.id !== target.id && w.en.toLowerCase() !== targetEn && !koOverlaps(w.ko, target.ko))
    .map((w) => {
      const dist = editDistance(w.en, target.en) / Math.max(w.en.length, target.en.length);
      const posBonus = w.pos === target.pos ? 0.25 : 0;
      return { w, score: dist - posBonus + rng() * 0.2 };
    })
    .sort((a, b) => a.score - b.score);

  for (const { w } of candidates) {
    if (chosen.length >= count) break;
    // 오답 보기끼리도 영단어·뜻이 겹치지 않게
    if (chosen.some((c) => c.en.toLowerCase() === w.en.toLowerCase() || koOverlaps(c.ko, w.ko))) continue;
    chosen.push(w);
  }
  return chosen;
}

export function buildChoiceQuestion(target: Word, mode: ChoiceMode, pool: readonly Word[], rng: Rng): ChoiceQuestion {
  const distractors = pickDistractors(target, pool, gameConfig.listen.choices - 1, rng);
  const options = shuffle([target, ...distractors], rng);
  return {
    kind: 'choice',
    mode,
    wordId: target.id,
    choices: options.map((w) => (mode === 'listen-ko' ? w.ko : w.en)),
    answerIndex: options.findIndex((w) => w.id === target.id),
  };
}

/** 듣고 맞추기 한 판: 오늘 단어에서 count개, 유형 A/B를 반반 섞는다 */
export function buildListenRound(
  todayWords: readonly Word[],
  pool: readonly Word[],
  rng: Rng,
  count: number = gameConfig.listen.questions,
): ChoiceQuestion[] {
  const targets = shuffle(todayWords, rng).slice(0, count);
  const modes = shuffle(
    targets.map((_, i): ChoiceMode => (i % 2 === 0 ? 'listen-ko' : 'listen-en')),
    rng,
  );
  return targets.map((w, i) => buildChoiceQuestion(w, modes[i], pool, rng));
}

// ── 스펠링 ──

export function buildSpellingQuestion(word: Word, stage: SpellingStage, rng: Rng): SpellingQuestion {
  return { kind: 'spelling', wordId: word.id, stage, tiles: stage === 1 ? scrambleLetters(word.en, rng) : [] };
}

/** 글자를 섞는다. 2글자 이상이면 원래 순서와 같지 않게 한다. */
export function scrambleLetters(text: string, rng: Rng): string[] {
  const letters = [...text];
  if (new Set(letters).size < 2) return letters;
  for (let tries = 0; tries < 20; tries++) {
    const s = shuffle(letters, rng);
    if (s.join('') !== text) return s;
  }
  return [...letters.slice(1), letters[0]];
}

/** 2단계 힌트: 첫 글자 + 글자 수. 예) borrow → "b _ _ _ _ _" */
export function firstLetterHint(en: string): string {
  return [...en].map((ch, i) => (i === 0 ? ch : ch === ' ' ? ' ' : '_')).join(' ');
}

/**
 * 소리 없이 하기 모드의 글자 힌트 (PRD 4.2).
 * - 유형 A(뜻 고르기): 영단어를 글자로 보여 준다 (듣기 대신 읽기)
 * - 유형 B(철자 고르기): 한글 뜻 + 첫 글자·글자 수 힌트
 */
export function silentHint(word: Word, mode: ChoiceMode): { main: string; sub?: string } {
  if (mode === 'listen-ko') return { main: word.en };
  return { main: word.ko, sub: `${firstLetterHint(word.en)} (${word.en.length}글자)` };
}

// ── 카드 짝맞추기 ──

/** 오늘 단어 중 pairs쌍을 골라 영단어 카드 + 뜻 카드를 섞어서 돌려준다 */
export function buildMatchRound(
  todayWords: readonly Word[],
  rng: Rng,
  pairs: number = gameConfig.match.pairs,
): MatchCard[] {
  const chosen = shuffle(todayWords, rng).slice(0, pairs);
  const cards = chosen.flatMap((w): MatchCard[] => [
    { cardId: `${w.id}:en`, wordId: w.id, side: 'en', text: w.en },
    { cardId: `${w.id}:ko`, wordId: w.id, side: 'ko', text: w.ko },
  ]);
  return shuffle(cards, rng);
}
