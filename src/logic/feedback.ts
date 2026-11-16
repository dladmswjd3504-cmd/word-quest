import type { Rng } from './random.ts';

/** 문구 목록에서 하나를 고른다. 바로 전에 나온 문구는 다시 고르지 않는다. */
export function pickPhrase(list: readonly string[], last: string | null, rng: Rng): string {
  if (list.length === 0) return '';
  const candidates = list.length > 1 ? list.filter((p) => p !== last) : list;
  return candidates[Math.floor(rng() * candidates.length)];
}
