import { gameConfig } from '../config/gameConfig.ts';
import type { Course } from '../types.ts';

export interface WordValidationResult {
  errors: string[];
  warnings: string[];
}

const ID_PREFIX: Record<Course, string> = { middle: 'mid', high: 'high' };
const ID_PATTERN = /^(mid|high)-d(\d{2})-(\d{2})$/;
const KNOWN_POS = ['명사', '동사', '형용사', '부사', '전치사', '접속사', '대명사', '감탄사', '조동사'];
const REQUIRED_TEXT = ['id', 'en', 'pos', 'ko', 'exampleEn', 'exampleKo'] as const;

/**
 * 단어 목록을 검사한다 (PRD 5.2).
 * - 오류: ID 형식/중복, 필수 필드 누락, Day당 단어 수, Day가 1부터 연속되지 않음, 같은 영단어 중복
 * - 경고: 예문에 단어가 그대로 없음(변형 가능), 모르는 품사, 한글 뜻이 서로 포함 관계
 */
export function validateWordList(data: unknown, course: Course): WordValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(data)) {
    return { errors: ['단어 파일은 배열([ ... ])이어야 합니다.'], warnings };
  }

  const seenIds = new Set<string>();
  const seenEn = new Map<string, string>();
  const countByDay = new Map<number, number>();
  const valid: { id: string; en: string; ko: string; day: number }[] = [];

  data.forEach((raw, index) => {
    const where = `#${index + 1}`;
    if (typeof raw !== 'object' || raw === null) {
      errors.push(`${where}: 객체가 아닙니다.`);
      return;
    }
    const w = raw as Record<string, unknown>;
    const label = typeof w.id === 'string' && w.id ? w.id : where;

    for (const field of REQUIRED_TEXT) {
      if (typeof w[field] !== 'string' || (w[field] as string).trim() === '') {
        errors.push(`${label}: '${field}' 값이 비어 있거나 없습니다.`);
      }
    }
    if (typeof w.tip !== 'string') errors.push(`${label}: 'tip'은 문자열이어야 합니다 (빈 값 "" 가능).`);
    if (w.course !== course) errors.push(`${label}: course가 "${course}"가 아닙니다.`);

    const day = w.day;
    if (typeof day !== 'number' || !Number.isInteger(day) || day < 1 || day > 30) {
      errors.push(`${label}: day는 1~30 사이 정수여야 합니다.`);
    }
    if (w.difficulty !== 1 && w.difficulty !== 2 && w.difficulty !== 3) {
      errors.push(`${label}: difficulty는 1, 2, 3 중 하나여야 합니다.`);
    }

    if (typeof w.id === 'string') {
      const m = ID_PATTERN.exec(w.id);
      if (!m) {
        errors.push(`${label}: ID 형식이 '${ID_PREFIX[course]}-dDD-NN'이 아닙니다.`);
      } else {
        if (m[1] !== ID_PREFIX[course]) errors.push(`${label}: ID 접두어가 '${ID_PREFIX[course]}'가 아닙니다.`);
        if (typeof day === 'number' && Number(m[2]) !== day) {
          errors.push(`${label}: ID의 Day(${Number(m[2])})와 day 값(${day})이 다릅니다.`);
        }
      }
      if (seenIds.has(w.id)) errors.push(`${label}: ID가 중복됩니다.`);
      seenIds.add(w.id);
    }

    if (typeof w.en === 'string' && w.en.trim()) {
      const key = w.en.trim().toLowerCase();
      const prev = seenEn.get(key);
      if (prev) errors.push(`${label}: 영단어 '${w.en}'가 ${prev}와 중복됩니다.`);
      else seenEn.set(key, label);

      if (typeof w.exampleEn === 'string' && !exampleContainsWord(w.exampleEn, w.en)) {
        warnings.push(`${label}: 예문에 '${w.en}'이(가) 그대로 들어 있지 않습니다. (변형이면 무시해도 됨)`);
      }
    }

    if (typeof w.pos === 'string' && w.pos && !KNOWN_POS.includes(w.pos)) {
      warnings.push(`${label}: 품사 '${w.pos}'는 목록에 없는 품사입니다.`);
    }

    if (typeof day === 'number' && Number.isInteger(day)) {
      countByDay.set(day, (countByDay.get(day) ?? 0) + 1);
      if (typeof w.id === 'string' && typeof w.en === 'string' && typeof w.ko === 'string') {
        valid.push({ id: w.id, en: w.en, ko: w.ko, day });
      }
    }
  });

  const days = [...countByDay.keys()].sort((a, b) => a - b);
  for (const day of days) {
    const count = countByDay.get(day)!;
    if (count !== gameConfig.wordsPerDay) {
      errors.push(`Day ${day}: 단어가 ${count}개입니다. (${gameConfig.wordsPerDay}개여야 함)`);
    }
  }
  days.forEach((day, i) => {
    if (day !== i + 1) errors.push(`Day가 1부터 빠짐없이 이어져야 합니다. (Day ${i + 1}이 없음)`);
  });

  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const a = valid[i].ko.trim();
      const b = valid[j].ko.trim();
      if (a && b && (a.includes(b) || b.includes(a))) {
        warnings.push(`${valid[i].id}(${a}) / ${valid[j].id}(${b}): 한글 뜻이 겹쳐서 서로 오답 보기로 나오지 않습니다.`);
      }
    }
  }

  return { errors: dedupe(errors), warnings };
}

/** 예문에 단어(또는 흔한 변형의 어간)가 들어 있는지 확인한다. carry→carries, decide→decided 등 */
export function exampleContainsWord(example: string, word: string): boolean {
  const text = example.toLowerCase();
  const w = word.trim().toLowerCase();
  const stems = [w];
  if (w.endsWith('y')) stems.push(w.slice(0, -1) + 'i');
  if (w.endsWith('e')) stems.push(w.slice(0, -1));
  return stems.some((s) => s.length >= 2 && text.includes(s));
}

function dedupe(list: string[]): string[] {
  return [...new Set(list)];
}
