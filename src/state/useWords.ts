import { useEffect, useState } from 'react';
import { loadWords } from '../data/words.ts';
import type { Course, Word } from '../types.ts';

/** 과정별 단어 목록을 불러온다. 불러오는 중이면 null */
export function useWords(course: Course): Word[] | null {
  const [state, setState] = useState<{ course: Course; words: Word[] } | null>(null);
  useEffect(() => {
    let alive = true;
    loadWords(course).then((words) => {
      if (alive) setState({ course, words });
    });
    return () => {
      alive = false;
    };
  }, [course]);
  return state?.course === course ? state.words : null;
}
