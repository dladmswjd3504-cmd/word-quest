/**
 * 단어 JSON 검증: `npm run validate:words`
 * 오류가 있으면 종료 코드 1, 경고만 있으면 0.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateWordList } from '../src/data/validateWords.ts';
import type { Course } from '../src/types.ts';

const files: Record<Course, string> = {
  middle: '../src/data/words.middle.json',
  high: '../src/data/words.high.json',
};

let errorCount = 0;

for (const [course, rel] of Object.entries(files) as [Course, string][]) {
  const path = fileURLToPath(new URL(rel, import.meta.url));
  console.log(`\n▶ ${course} (${rel.replace('../', '')})`);

  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    console.log(`  ✖ JSON을 읽을 수 없습니다: ${(e as Error).message}`);
    errorCount++;
    continue;
  }

  const { errors, warnings } = validateWordList(data, course);
  const total = Array.isArray(data) ? data.length : 0;
  const days = Array.isArray(data) ? new Set(data.map((w: { day?: unknown }) => w.day)).size : 0;
  console.log(`  단어 ${total}개 / Day ${days}개`);
  for (const e of errors) console.log(`  ✖ ${e}`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
  if (errors.length === 0) console.log(`  ✔ 오류 없음${warnings.length ? ` (경고 ${warnings.length}개)` : ''}`);
  errorCount += errors.length;
}

console.log(errorCount ? `\n오류 ${errorCount}개 — 고친 뒤 다시 실행하세요.` : '\n모든 단어 파일 통과!');
process.exit(errorCount ? 1 : 0);
