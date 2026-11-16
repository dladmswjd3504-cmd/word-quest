import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadSave, writeSave } from '../storage/save.ts';
import { createStore, type KeyValueStore } from '../storage/storage.ts';
import type { SaveData } from '../types.ts';

export type LoadStatus = 'empty' | 'ok' | 'corrupt';

interface GameContextValue {
  /** 저장 데이터. 온보딩 전이면 null */
  save: SaveData | null;
  loadStatus: LoadStatus;
  /** 저장 데이터를 바꾸고 즉시 localStorage에 쓴다 */
  update: (fn: (save: SaveData) => SaveData) => void;
  /** 처음 만들거나 백업에서 복원할 때 */
  replace: (save: SaveData) => void;
  /** localStorage에 저장할 수 있는 환경인지 (시크릿 모드 등이면 false) */
  persistent: boolean;
  /** 마지막 저장이 실패했는지 (용량 초과 등) */
  saveFailed: boolean;
}

const Ctx = createContext<GameContextValue | null>(null);

export function GameProvider({ children, store: injected }: { children: ReactNode; store?: KeyValueStore }) {
  const [store] = useState(() => injected ?? createStore());
  const [initial] = useState(() => loadSave(store));
  const [save, setSave] = useState<SaveData | null>(initial.status === 'ok' ? initial.save : null);
  const [saveFailed, setSaveFailed] = useState(false);
  const ref = useRef(save);

  const commit = useCallback(
    (next: SaveData) => {
      ref.current = next;
      setSave(next);
      setSaveFailed(!writeSave(store, next));
    },
    [store],
  );

  const update = useCallback(
    (fn: (s: SaveData) => SaveData) => {
      if (!ref.current) return;
      commit(fn(ref.current));
    },
    [commit],
  );

  // 설정 > 글자 크기
  const fontSize = save?.settings.fontSize ?? 'normal';
  useEffect(() => {
    document.documentElement.dataset.fontSize = fontSize;
  }, [fontSize]);

  const value = useMemo<GameContextValue>(
    () => ({ save, loadStatus: initial.status, update, replace: commit, persistent: store.persistent, saveFailed }),
    [save, initial.status, update, commit, store.persistent, saveFailed],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGame must be used inside GameProvider');
  return v;
}

/** 온보딩이 끝난 화면에서 쓰는 버전 (save가 반드시 있음) */
export function useSave(): Omit<GameContextValue, 'save'> & { save: SaveData } {
  const v = useGame();
  if (!v.save) throw new Error('save is not ready');
  return { ...v, save: v.save };
}
