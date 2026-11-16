import { describe, expect, it } from 'vitest';
import middle from '../src/data/words.middle.json';
import high from '../src/data/words.high.json';
import nickname from '../src/data/nickname.json';
import phrases from '../src/data/phrases.json';
import equipment from '../src/data/equipment.json';
import { exampleContainsWord, validateWordList } from '../src/data/validateWords.ts';
import { getLastDay, getWordsOfDay } from '../src/data/words.ts';
import type { Word } from '../src/types.ts';

const sample = (over: Partial<Word> = {}): Word => ({
  id: 'mid-d01-01',
  course: 'middle',
  day: 1,
  en: 'borrow',
  pos: '동사',
  ko: '빌리다',
  exampleEn: 'Can I borrow your pen?',
  exampleKo: '네 펜 좀 빌려도 될까?',
  difficulty: 1,
  tip: '',
  ...over,
});

/** Day 1을 10개로 채운 정상 목록 */
const validDay1 = (): Word[] =>
  Array.from({ length: 10 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return sample({ id: `mid-d01-${n}`, en: `word${n}`, ko: `뜻${n}번`, exampleEn: `This is word${n}.` });
  });

describe('실제 단어 데이터', () => {
  it('중학교 단어는 오류도 경고도 없다', () => {
    expect(validateWordList(middle, 'middle')).toEqual({ errors: [], warnings: [] });
  });
  it('고등학교 단어는 오류도 경고도 없다', () => {
    expect(validateWordList(high, 'high')).toEqual({ errors: [], warnings: [] });
  });
  it('JSON에 있는 Day 수만큼 열리고, 두 과정의 Day 수가 같다 (지금 Day 1~30)', () => {
    expect(getLastDay(middle as Word[])).toBe(30);
    expect(getLastDay(high as Word[])).toBe(30);
    expect(getWordsOfDay(high as Word[], 30)).toHaveLength(10);
  });
  it('중학교와 고등학교 단어 ID가 겹치지 않는다', () => {
    const ids = new Set([...middle, ...high].map((w) => w.id));
    expect(ids.size).toBe(middle.length + high.length);
  });
});

describe('기타 데이터 파일', () => {
  it('닉네임 형용사·동물이 각각 20개 이상이다', () => {
    expect(nickname.adjectives.length).toBeGreaterThanOrEqual(20);
    expect(nickname.animals.length).toBeGreaterThanOrEqual(20);
  });
  it('피드백 문구는 같은 문구가 연속으로 나오지 않게 2개 이상씩 있다', () => {
    expect(phrases.correct.length).toBeGreaterThanOrEqual(2);
    expect(phrases.wrong.length).toBeGreaterThanOrEqual(2);
  });
  it('장비는 보스 Day(5의 배수)마다 하나씩이다', () => {
    expect(equipment.map((e) => e.bossDay)).toEqual([5, 10, 15, 20, 25, 30]);
  });
});

describe('validateWordList', () => {
  it('정상 목록은 통과한다', () => {
    expect(validateWordList(validDay1(), 'middle').errors).toEqual([]);
  });

  it('ID 중복을 잡는다', () => {
    const list = validDay1();
    list[1].id = list[0].id;
    expect(validateWordList(list, 'middle').errors.join()).toContain('ID가 중복');
  });

  it('필수 필드 누락을 잡는다', () => {
    const list = validDay1();
    (list[2] as unknown as Record<string, unknown>).ko = '';
    delete (list[3] as unknown as Record<string, unknown>).exampleEn;
    const { errors } = validateWordList(list, 'middle');
    expect(errors.join()).toContain("'ko'");
    expect(errors.join()).toContain("'exampleEn'");
  });

  it('Day당 10개가 아니면 잡는다', () => {
    const list = validDay1().slice(0, 9);
    expect(validateWordList(list, 'middle').errors.join()).toContain('9개');
  });

  it('Day가 건너뛰어지면 잡는다', () => {
    const list = validDay1().map((w) => ({ ...w, day: 2, id: w.id.replace('d01', 'd02') }));
    expect(validateWordList(list, 'middle').errors.join()).toContain('Day 1이 없음');
  });

  it('ID 형식·과정·Day 불일치를 잡는다', () => {
    const list = validDay1();
    list[0].id = 'high-d01-01';
    list[1].id = 'mid-d02-02';
    list[2].id = 'abc';
    const msg = validateWordList(list, 'middle').errors.join('\n');
    expect(msg).toContain("접두어가 'mid'");
    expect(msg).toContain('ID의 Day(2)');
    expect(msg).toContain('ID 형식');
  });

  it('같은 영단어 중복을 잡는다', () => {
    const list = validDay1();
    list[1].en = 'WORD01';
    expect(validateWordList(list, 'middle').errors.join()).toContain('중복됩니다');
  });

  it('예문에 단어가 없으면 오류가 아닌 경고다', () => {
    const list = validDay1();
    list[0].exampleEn = 'Nothing here.';
    const r = validateWordList(list, 'middle');
    expect(r.errors).toEqual([]);
    expect(r.warnings.join()).toContain('예문');
  });

  it('한글 뜻이 겹치면 경고한다', () => {
    const list = validDay1();
    list[0].ko = '빌리다';
    list[1].ko = '빌리다, 빌려주다';
    expect(validateWordList(list, 'middle').warnings.join()).toContain('한글 뜻이 겹쳐');
  });

  it('배열이 아니면 거절한다', () => {
    expect(validateWordList({}, 'middle').errors).toHaveLength(1);
  });
});

describe('exampleContainsWord', () => {
  it('흔한 변형(-s, -ed, y→ies)을 인정한다', () => {
    expect(exampleContainsWord('My brother collects stamps.', 'collect')).toBe(true);
    expect(exampleContainsWord('I decided to go.', 'decide')).toBe(true);
    expect(exampleContainsWord('She carries a bag.', 'carry')).toBe(true);
    expect(exampleContainsWord('I went home.', 'go')).toBe(false);
  });
});
