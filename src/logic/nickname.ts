import data from '../data/nickname.json';
import type { Rng } from './random.ts';

export interface Adjective {
  en: string;
  ko: string;
}

export const ADJECTIVES: readonly Adjective[] = data.adjectives;
export const ANIMALS: readonly string[] = data.animals;

/** 조합형 닉네임 문자열. 예) "Brave 용감한 · 토끼" */
export function formatNickname(adjIndex: number, animalIndex: number): string {
  const adj = ADJECTIVES[adjIndex];
  return `${adj.en} ${adj.ko} · ${ANIMALS[animalIndex]}`;
}

export function randomNicknameIndexes(rng: Rng): { adj: number; animal: number } {
  return { adj: Math.floor(rng() * ADJECTIVES.length), animal: Math.floor(rng() * ANIMALS.length) };
}
