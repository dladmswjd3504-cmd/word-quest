import { describe, expect, it } from 'vitest';
import { createMemoryStore, createStore } from '../src/storage/storage.ts';
import { CORRUPT_KEY, SAVE_KEY, clearSave, createInitialSave, loadSave, writeSave } from '../src/storage/save.ts';
import { migrateSave } from '../src/storage/migrate.ts';
import { daysBetween, localDateString } from '../src/logic/date.ts';

/** 테스트용 가짜 localStorage */
function fakeStorage(opts: { failOnSet?: boolean; throwOnAccess?: boolean } = {}): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      if (opts.failOnSet && k !== '__wq_probe__') throw new Error('QuotaExceeded');
      map.set(k, v);
    },
    removeItem: (k) => void map.delete(k),
  };
}

const newSave = () =>
  createInitialSave({ nickname: 'Brave 용감한 · 토끼', attendanceNo: 7, course: 'middle', now: new Date('2026-11-16T08:00:00') });

describe('storage', () => {
  it('localStorage를 쓸 수 없으면 메모리 저장소로 동작한다', () => {
    const store = createStore(() => {
      throw new Error('SecurityError');
    });
    expect(store.persistent).toBe(false);
    expect(store.set('a', '1')).toBe(true);
    expect(store.get('a')).toBe('1');
  });

  it('정상 localStorage는 persistent', () => {
    const store = createStore(() => fakeStorage());
    expect(store.persistent).toBe(true);
    store.set('a', '1');
    expect(store.get('a')).toBe('1');
  });

  it('쓰기에 실패하면 false를 돌려주지만 이번 세션에서는 값이 유지된다', () => {
    const store = createStore(() => fakeStorage({ failOnSet: true }));
    expect(store.set('a', '1')).toBe(false);
    expect(store.get('a')).toBe('1');
  });
});

describe('save', () => {
  it('저장 후 그대로 불러온다', () => {
    const store = createMemoryStore();
    const save = newSave();
    expect(loadSave(store)).toEqual({ status: 'empty' });
    expect(writeSave(store, save)).toBe(true);
    expect(loadSave(store)).toEqual({ status: 'ok', save });
  });

  it('깨진 저장 데이터는 corrupt로 알리고 원본을 따로 보관한다', () => {
    const store = createMemoryStore();
    store.set(SAVE_KEY, '{not json');
    expect(loadSave(store)).toEqual({ status: 'corrupt' });
    expect(store.get(CORRUPT_KEY)).toBe('{not json');
  });

  it('초기화하면 비어 있다', () => {
    const store = createMemoryStore();
    writeSave(store, newSave());
    clearSave(store);
    expect(loadSave(store)).toEqual({ status: 'empty' });
  });

  it('초기 저장 데이터에 3차 대비 필드가 모두 있다', () => {
    const s = newSave();
    expect(s.profile.nickname).toBeTruthy();
    expect(s.profile.attendanceNo).toBe(7);
    expect(s.settings.course).toBe('middle');
    expect(s).toHaveProperty('lastPlayedDate');
    expect(s).toHaveProperty('lastClearedDate');
    expect(s.player).toHaveProperty('totalAttendanceDays');
    expect(s.progress.middle).toHaveProperty('completedDays');
    expect(s.progress.high).toHaveProperty('completedDays');
  });
});

describe('migrateSave', () => {
  it('정상 데이터는 그대로 통과한다', () => {
    const s = newSave();
    expect(migrateSave(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('프로필이 없거나 버전이 다르면 거절한다', () => {
    const s = newSave() as unknown as Record<string, unknown>;
    expect(migrateSave({ ...s, profile: undefined })).toBeNull();
    expect(migrateSave({ ...s, version: 2 })).toBeNull();
    expect(migrateSave(null)).toBeNull();
    expect(migrateSave([])).toBeNull();
    expect(migrateSave('hello')).toBeNull();
  });

  it('빠진 필드는 기본값으로 채운다 (이전 앱 버전의 저장 데이터 호환)', () => {
    const s = JSON.parse(JSON.stringify(newSave()));
    delete s.stats.weakConquered;
    delete s.currentMission;
    delete s.lastBackupDate;
    delete s.progress.high;
    const m = migrateSave(s)!;
    expect(m.stats.weakConquered).toBe(0);
    expect(m.currentMission).toBeNull();
    expect(m.lastBackupDate).toBeNull();
    expect(m.progress.high).toEqual({ completedDays: [], bossWins: [], words: {} });
  });

  it('이상한 값은 안전한 범위로 바로잡는다', () => {
    const s = JSON.parse(JSON.stringify(newSave()));
    s.player.xp = -50;
    s.settings.ttsRate = 'super-fast';
    s.progress.middle.completedDays = [3, 1, 1, 'x', 2];
    s.progress.middle.words = { 'mid-d01-01': { mastery: 99, spellingStage: 7 } };
    const m = migrateSave(s)!;
    expect(m.player.xp).toBe(0);
    expect(m.settings.ttsRate).toBe('normal');
    expect(m.progress.middle.completedDays).toEqual([1, 2, 3]);
    expect(m.progress.middle.words['mid-d01-01'].mastery).toBe(5);
    expect(m.progress.middle.words['mid-d01-01'].spellingStage).toBe(1);
  });
});

describe('date', () => {
  it('로컬 날짜를 YYYY-MM-DD로 만든다', () => {
    expect(localDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
  it('날짜 차이를 계산한다', () => {
    expect(daysBetween('2026-11-16', '2026-11-21')).toBe(5);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });
});
