import type { Course, Word } from '../src/types.ts';
import { createInitialSave } from '../src/storage/save.ts';

const POS = ['동사', '명사', '명사', '형용사', '동사', '명사', '부사', '형용사', '동사', '명사'];

/** 테스트용 가짜 단어: days일치 × 10개. en = w{day}x{n}, ko = 뜻{day}-{n} (서로 겹치지 않음) */
export function fakeWords(days: number, course: Course = 'middle'): Word[] {
  const prefix = course === 'middle' ? 'mid' : 'high';
  const words: Word[] = [];
  for (let d = 1; d <= days; d++) {
    for (let n = 1; n <= 10; n++) {
      const dd = String(d).padStart(2, '0');
      const nn = String(n).padStart(2, '0');
      words.push({
        id: `${prefix}-d${dd}-${nn}`,
        course,
        day: d,
        en: `w${dd}x${nn}`,
        pos: POS[n - 1],
        ko: `뜻${d}번${n}호`,
        exampleEn: `This is w${dd}x${nn}.`,
        exampleKo: '예문',
        difficulty: 1,
        tip: '',
      });
    }
  }
  return words;
}

export function newSave(course: Course = 'middle') {
  return createInitialSave({ nickname: 'Brave 용감한 · 토끼', attendanceNo: 3, course, now: new Date('2026-11-16T08:00:00') });
}
