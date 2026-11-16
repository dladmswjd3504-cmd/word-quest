import { describe, expect, it } from 'vitest';
import { decodeBackup, encodeBackup } from '../src/storage/backup.ts';
import { createInitialSave } from '../src/storage/save.ts';

const makeSave = () => {
  const s = createInitialSave({ nickname: 'Curious 호기심 많은 · 펭귄', attendanceNo: 12, course: 'high' });
  s.player.level = 7;
  s.player.xp = 35;
  s.progress.high.completedDays = [1, 2, 3];
  for (let i = 1; i <= 30; i++) {
    s.progress.high.words[`high-d01-${String(i).padStart(2, '0')}`] = {
      mastery: i % 6,
      spellingStage: 2,
      streak: 1,
      wrongCount: 0,
      weak: i % 4 === 0,
      weakStreak: 0,
      lastSeenDate: '2026-11-16',
    };
  }
  return s;
};

describe('백업 코드', () => {
  it('만든 코드로 그대로 복원된다 (한글 닉네임 포함)', async () => {
    const save = makeSave();
    const code = await encodeBackup(save);
    expect(code.startsWith('WQ1-')).toBe(true);
    expect(await decodeBackup(code)).toEqual({ ok: true, save });
  });

  it('압축 덕분에 원본 JSON보다 짧다', async () => {
    const save = makeSave();
    const code = await encodeBackup(save);
    expect(code.length).toBeLessThan(JSON.stringify(save).length);
  });

  it('붙여넣을 때 섞인 공백·줄바꿈은 무시한다', async () => {
    const save = makeSave();
    const code = await encodeBackup(save);
    const messy = `  ${code.slice(0, 20)}\n${code.slice(20, 50)} \r\n${code.slice(50)}  `;
    expect(await decodeBackup(messy)).toEqual({ ok: true, save });
  });

  it('압축 없는 WQ0 코드도 읽는다', async () => {
    const save = makeSave();
    const b64 = Buffer.from(JSON.stringify(save), 'utf8').toString('base64url');
    expect(await decodeBackup(`WQ0-${b64}`)).toEqual({ ok: true, save });
  });

  it('잘못된 코드는 안전하게 거절한다', async () => {
    expect(await decodeBackup('')).toEqual({ ok: false, reason: 'empty' });
    expect(await decodeBackup('hello world')).toEqual({ ok: false, reason: 'format' });
    expect(await decodeBackup('WQ1-@@@@')).toEqual({ ok: false, reason: 'format' });
    expect(await decodeBackup('WQ1-AAAAAAAA')).toEqual({ ok: false, reason: 'corrupt' });
  });

  it('잘린 코드는 거절한다', async () => {
    const code = await encodeBackup(makeSave());
    const result = await decodeBackup(code.slice(0, code.length - 10));
    expect(result.ok).toBe(false);
  });

  it('형식은 맞지만 내용이 워드 퀘스트 기록이 아니면 거절한다', async () => {
    const b64 = Buffer.from(JSON.stringify({ version: 1, hello: 'world' }), 'utf8').toString('base64url');
    expect(await decodeBackup(`WQ0-${b64}`)).toEqual({ ok: false, reason: 'invalid' });
  });
});
