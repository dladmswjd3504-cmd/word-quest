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

/**
 * 출석번호 입력값을 숫자만 남긴 문자열로 바꾼다 (최대 2자리).
 * Windows 한글 입력기의 전각 모드 등에서 들어오는 넓은 숫자(０~９)도 일반 숫자로 바꿔 받는다.
 */
export function normalizeNumberInput(value: string, maxDigits = 2): string {
  return value
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\D/g, '')
    .slice(0, maxDigits);
}

export function randomNicknameIndexes(rng: Rng): { adj: number; animal: number } {
  return { adj: Math.floor(rng() * ADJECTIVES.length), animal: Math.floor(rng() * ANIMALS.length) };
}
