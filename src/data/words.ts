import type { Course, Word } from '../types.ts';

const cache: Partial<Record<Course, Word[]>> = {};

/** 과정별 단어 JSON을 따로 불러온다 (첫 화면 번들을 가볍게). 빌드 시 별도 파일로 나뉘고 서비스 워커가 프리캐시한다. */
export async function loadWords(course: Course): Promise<Word[]> {
  const cached = cache[course];
  if (cached) return cached;
  const mod =
    course === 'middle'
      ? await import('./words.middle.json')
      : await import('./words.high.json');
  const words = mod.default as Word[];
  cache[course] = words;
  return words;
}

/** 열려 있는 마지막 Day. JSON에 Day를 추가하면 코드 수정 없이 늘어난다. */
export function getLastDay(words: readonly Word[]): number {
  return words.reduce((max, w) => Math.max(max, w.day), 0);
}

export function getWordsOfDay(words: readonly Word[], day: number): Word[] {
  return words.filter((w) => w.day === day);
}
