// vitest 실행 래퍼.
// Windows에서 VS Code 등이 작업 폴더를 소문자 드라이브(c:\...)로 열면
// vitest가 같은 파일을 C:/ 와 c:/ 두 경로로 따로 불러와 모든 테스트가
// "Cannot read properties of undefined (reading 'config')" 로 실패한다.
// 드라이브 문자를 대문자로 맞춘 폴더에서 vitest를 실행해 이를 막는다.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const cwd = process.cwd().replace(/^[a-z]:/, (d) => d.toUpperCase());
const vitestBin = path.join(cwd, 'node_modules', 'vitest', 'vitest.mjs');

const result = spawnSync(process.execPath, [vitestBin, ...process.argv.slice(2)], {
  cwd,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
