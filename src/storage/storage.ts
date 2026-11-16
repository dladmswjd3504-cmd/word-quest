/**
 * localStorage 안전 래퍼. 모든 저장소 접근은 이 파일을 거친다.
 * 시크릿 모드 등으로 localStorage를 쓸 수 없으면 메모리로 동작하고 `persistent = false`가 된다.
 * (화면에서는 "기록이 저장되지 않아요" 경고를 띄운다)
 */
export interface KeyValueStore {
  readonly persistent: boolean;
  get(key: string): string | null;
  /** 저장에 실패하면 false (용량 초과 등) */
  set(key: string, value: string): boolean;
  remove(key: string): void;
}

export function createMemoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    persistent: false,
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value);
      return true;
    },
    remove: (key) => {
      map.delete(key);
    },
  };
}

/** 실제 localStorage를 감싼 저장소. 사용할 수 없으면 메모리 저장소를 돌려준다. */
export function createStore(getStorage: () => Storage = () => window.localStorage): KeyValueStore {
  let ls: Storage;
  try {
    ls = getStorage();
    const probe = '__wq_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
  } catch {
    return createMemoryStore();
  }

  // 쓰기에 실패해도 이번 세션 동안은 기록이 유지되도록 메모리에 같이 둔다.
  const fallback = new Map<string, string>();
  return {
    persistent: true,
    get(key) {
      try {
        return ls.getItem(key) ?? fallback.get(key) ?? null;
      } catch {
        return fallback.get(key) ?? null;
      }
    },
    set(key, value) {
      fallback.set(key, value);
      try {
        ls.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      fallback.delete(key);
      try {
        ls.removeItem(key);
      } catch {
        /* 무시 */
      }
    },
  };
}

/**
 * 브라우저에 "이 사이트 데이터는 지우지 말아 주세요"라고 요청한다 (iOS/안드로이드 저장소 정리 대비).
 * 지원하지 않거나 거절되면 false.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* 무시 */
  }
  return false;
}
