// Task012에서 완료 토글을 실제 weekly_logs 테이블에 저장하기 전까지, 상세 화면의
// 토글이 목록 화면에도 반영되도록 브라우저 localStorage에 임시로 덮어쓴다.
// Task012에서 실 저장이 연결되면 제거될 임시 계층.
//
// localStorage는 SSR에서 읽을 수 없고, 하이드레이션 첫 렌더에서 곧바로 읽으면 서버
// 렌더 결과와 달라져 hydration mismatch가 발생한다. useSyncExternalStore의
// getServerSnapshot으로 "오버라이드 없음" 상태를 강제해 하이드레이션을 통과시키고,
// 하이드레이션 이후에만 실제 저장된 값으로 React가 안전하게 재동기화하도록 한다.
import { useRef, useSyncExternalStore } from "react";

const STORAGE_KEY = "weekly-log-completion-overrides";

type Overrides = Record<string, boolean>;

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function readOverrides(): Overrides {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Overrides) : {};
  } catch {
    return {};
  }
}

export function getCompletionOverride(id: string): boolean | undefined {
  return readOverrides()[id];
}

export function setCompletionOverride(id: string, isCompleted: boolean) {
  if (typeof window === "undefined") {
    return;
  }
  const overrides = readOverrides();
  overrides[id] = isCompleted;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  emitChange();
}

export function useCompletionOverride(id: string, fallback: boolean): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getCompletionOverride(id) ?? fallback,
    () => fallback,
  );
}

export function useResolvedItems<
  T extends { id: string; is_completed: boolean },
>(items: T[]): T[] {
  const cacheRef = useRef<{
    items: T[];
    overridesKey: string;
    result: T[];
  } | null>(null);

  const getSnapshot = () => {
    const overrides = readOverrides();
    if (Object.keys(overrides).length === 0) {
      return items;
    }
    const overridesKey = JSON.stringify(overrides);
    const cache = cacheRef.current;
    if (
      cache &&
      cache.items === items &&
      cache.overridesKey === overridesKey
    ) {
      return cache.result;
    }
    const result = items.map((item) =>
      item.id in overrides
        ? { ...item, is_completed: overrides[item.id] }
        : item,
    );
    cacheRef.current = { items, overridesKey, result };
    return result;
  };

  return useSyncExternalStore(subscribe, getSnapshot, () => items);
}
