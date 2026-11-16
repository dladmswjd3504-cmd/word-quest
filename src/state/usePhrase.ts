import { useCallback, useRef } from 'react';
import phrases from '../data/phrases.json';
import { pickPhrase } from '../logic/feedback.ts';

/** 정답/오답 피드백 문구. 같은 문구가 연속으로 나오지 않고, 3연속 정답이면 "On fire!" */
export function usePhrase() {
  const last = useRef<string | null>(null);
  const streak = useRef(0);

  const correct = useCallback(() => {
    streak.current += 1;
    const list = streak.current >= 3 ? phrases.streak : phrases.correct;
    last.current = pickPhrase(list, last.current, Math.random);
    return last.current;
  }, []);

  const wrong = useCallback(() => {
    streak.current = 0;
    last.current = pickPhrase(phrases.wrong, last.current, Math.random);
    return last.current;
  }, []);

  return { correct, wrong };
}
