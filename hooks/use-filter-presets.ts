"use client";

import { useCallback, useMemo, useReducer, useSyncExternalStore } from "react";
import { z } from "zod";

import { safeLocalStorageGet, safeLocalStorageSet } from "@/lib/storage/local-storage";

// F045(v2 Task 046) 필터 프리셋. Task 041(F042 임시저장)이 정한 localStorage 규약(사용자 id
// 네임스페이스, useEffect 전용 접근, 전 경로 try/catch)의 두 번째 사용처 — 순수 저장 접근은
// lib/storage/local-storage.ts를 그대로 재사용한다.

export const FILTER_PRESET_MAX_COUNT = 10;

function buildKey(userId: string): string {
  return `weekly-log-filter-presets:${userId}`;
}

// 목록·칸반이 이미 공유하는 필터 파라미터 집합(정렬/페이지 상태는 제외 — 로드맵 결정:
// 프리셋은 "무엇을 볼지"이지 "어떻게 정렬할지"가 아님). from/to/author는 두 뷰 모두
// `currentX ?? null`로 rawFilters를 구성하므로 그 형태를 그대로 따른다.
export type FilterPresetFilters = {
  department: string;
  status: string;
  q: string;
  from: string | null;
  to: string | null;
  author: string | null;
};

export type FilterPreset = {
  id: string;
  name: string;
  filters: FilterPresetFilters;
  createdAt: string;
};

const filterPresetFiltersSchema = z.object({
  department: z.string(),
  status: z.string(),
  q: z.string(),
  from: z.string().nullable(),
  to: z.string().nullable(),
  author: z.string().nullable(),
});

const filterPresetSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(30),
  filters: filterPresetFiltersSchema,
  createdAt: z.string(),
});

// 손상된 JSON이나 스키마 불일치 항목은 조용히 걸러낸다(F042 draft와 동일한 방어적 파싱 —
// 한 항목이 깨졌다고 나머지 프리셋까지 잃을 이유는 없다).
function parseStoredPresets(raw: string | null): FilterPreset[] {
  if (!raw) return [];
  try {
    const json: unknown = JSON.parse(raw);
    if (!Array.isArray(json)) return [];
    const result: FilterPreset[] = [];
    for (const entry of json) {
      const parsed = filterPresetSchema.safeParse(entry);
      if (parsed.success) result.push(parsed.data);
    }
    return result;
  } catch {
    return [];
  }
}

export type SavePresetResult = { success: true } | { success: false; error: string };

// 구독자를 절대 호출하지 않는 영구 no-op — 프리셋 목록 갱신은 저장/삭제 호출 뒤 forceUpdate로
// 리렌더를 강제할 때만 반영한다(hooks/use-weekly-log-draft.ts와 동일한 useSyncExternalStore
// 활용: getServerSnapshot이 항상 null이라 SSR·최초 하이드레이션 결과가 어긋나지 않는다).
function subscribeNever() {
  return () => {};
}

function getServerSnapshot(): string | null {
  return null;
}

export function useFilterPresets(userId: string) {
  const key = buildKey(userId);
  const [, forceUpdate] = useReducer((count: number) => count + 1, 0);

  const getSnapshot = useCallback(() => safeLocalStorageGet(key), [key]);
  const raw = useSyncExternalStore(subscribeNever, getSnapshot, getServerSnapshot);

  const presets = useMemo(() => parseStoredPresets(raw), [raw]);

  const savePreset = useCallback(
    (name: string, filters: FilterPresetFilters): SavePresetResult => {
      const trimmedName = name.trim();
      if (trimmedName.length < 1 || trimmedName.length > 30) {
        return { success: false, error: "이름은 1~30자로 입력해주세요." };
      }
      const current = parseStoredPresets(safeLocalStorageGet(key));
      const withoutDuplicate = current.filter((preset) => preset.name !== trimmedName);
      if (withoutDuplicate.length >= FILTER_PRESET_MAX_COUNT) {
        return {
          success: false,
          error: `프리셋은 최대 ${FILTER_PRESET_MAX_COUNT}개까지 저장할 수 있습니다.`,
        };
      }
      const next: FilterPreset[] = [
        ...withoutDuplicate,
        {
          id: crypto.randomUUID(),
          name: trimmedName,
          filters,
          createdAt: new Date().toISOString(),
        },
      ];
      const ok = safeLocalStorageSet(key, JSON.stringify(next));
      if (!ok) {
        return { success: false, error: "저장소를 사용할 수 없어 저장하지 못했습니다." };
      }
      forceUpdate();
      return { success: true };
    },
    [key],
  );

  const deletePreset = useCallback(
    (id: string) => {
      const current = parseStoredPresets(safeLocalStorageGet(key));
      const next = current.filter((preset) => preset.id !== id);
      const ok = safeLocalStorageSet(key, JSON.stringify(next));
      if (ok) forceUpdate();
      return ok;
    },
    [key],
  );

  return { presets, savePreset, deletePreset };
}
