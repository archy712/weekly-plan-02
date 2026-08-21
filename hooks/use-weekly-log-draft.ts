"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { sanitizeWeeklyLogContent } from "@/lib/sanitize-html";
import type { WeeklyLogFormData } from "@/lib/schemas/weekly-log";
import {
  safeLocalStorageGet,
  safeLocalStorageRemove,
  safeLocalStorageSet,
} from "@/lib/storage/local-storage";

// F042 임시저장(Task 041). 신규 작성 폼(components/weekly-log-new-form.tsx)에서만 쓰인다 —
// 수정 폼은 이미 서버에 저장된 원본이 있어 유실 위험이 낮고, weekly_logs에 낙관적 잠금이
// 없어 오래된 draft를 복원해 저장하면 그 사이의 타인 변경을 조용히 덮어쓸 수 있으며,
// 상세 페이지의 진행상태·업무타입·중요도·진척률은 이미 인라인 즉시 저장이라 draft와
// 이중으로 어긋나기 때문이다(ROADMAP_V2.md Task 041 결정 근거).

const DRAFT_SAVE_DEBOUNCE_MS = 1000;
// content는 최대 5000자 제한이 있어 일반적으로 이 상한에 걸릴 일이 없지만, 직렬화 결과가
// 비정상적으로 크면(예: 확장 프로그램 개입) 저장 자체를 건너뛴다.
const DRAFT_MAX_SERIALIZED_LENGTH = 1_000_000;

function buildDraftKey(userId: string): string {
  return `weekly-log-draft:new:${userId}`;
}

// 손상된 JSON·스키마 불일치를 걸러내되, draft는 본질적으로 미완성 상태(빈 필드 포함)를
// 저장하므로 lib/schemas/weekly-log.ts의 weeklyLogSchema(최소 길이·날짜 형식·refine 등
// "제출 가능 여부" 검증)는 그대로 쓸 수 없다 — 여기서는 형태(타입)만 확인한다.
const weeklyLogDraftValuesSchema = z.object({
  title: z.string(),
  work_type: z.array(z.string()),
  importance: z.number(),
  progress: z.number(),
  content: z.string(),
  start_date: z.string(),
  target_end_date: z.string(),
  estimated_mm: z.string().optional(),
  estimated_cost: z.string().optional(),
  partner_company: z.string().optional(),
});

type StoredDraft = {
  values: WeeklyLogFormData;
  savedAt: string;
};

function parseStoredDraft(raw: string): { values: WeeklyLogFormData; savedAt: Date } | null {
  try {
    const json: unknown = JSON.parse(raw);
    if (typeof json !== "object" || json === null) return null;
    const { values, savedAt } = json as Partial<StoredDraft>;
    if (typeof savedAt !== "string") return null;
    const savedAtDate = new Date(savedAt);
    if (Number.isNaN(savedAtDate.getTime())) return null;
    const parsedValues = weeklyLogDraftValuesSchema.safeParse(values);
    if (!parsedValues.success) return null;
    return { values: parsedValues.data as WeeklyLogFormData, savedAt: savedAtDate };
  } catch {
    return null;
  }
}

// 구독자를 절대 호출하지 않는 영구 no-op — localStorage 값은 이 훅이 직접 쓰는 것 외에는
// (다른 탭에서의 변경 등) 실시간으로 반영할 필요가 없다. 이 값이 필요한 이유는 SSR
// 하이드레이션 안전성 때문이다: getServerSnapshot이 항상 null을 반환해 서버 렌더 결과와
// 배너 미노출 상태를 맞추고, 클라이언트는 React의 useSyncExternalStore 하이드레이션 보정
// 메커니즘이 마운트 직후 한 번 getSnapshot의 실제 값으로 재동기화한다 — useEffect 안에서
// setState를 직접 호출하는 것보다 이 방식이 더 안전하다(react-hooks/set-state-in-effect가
// 방지하려는 캐스케이딩 렌더링을 피하면서도 하이드레이션 불일치가 없다). 배너를 다시 뜨게
// 하려는 목적이 아니라 "재진입 시 1회 확인"이 의도이므로, 이후 autosave로 storage 값이
// 바뀌어도 이 스냅샷은 의도적으로 갱신되지 않는다(그렇지 않으면 빈 폼에 타이핑하는 도중
// 첫 자동 저장 시점에 배너가 갑자기 튀어나오는 문제가 생긴다).
function subscribeNever() {
  return () => {};
}

function getServerSnapshot(): string | null {
  return null;
}

export function useWeeklyLogDraft(userId: string) {
  const key = buildDraftKey(userId);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSnapshot = useCallback(() => safeLocalStorageGet(key), [key]);
  const rawDraft = useSyncExternalStore(subscribeNever, getSnapshot, getServerSnapshot);

  const initialDraft = useMemo(() => (rawDraft ? parseStoredDraft(rawDraft) : null), [rawDraft]);

  // 파싱에 실패한(손상된 JSON·스키마 불일치) draft는 조용히 지운다 — setState를 호출하지
  // 않는 순수 정리 작업이라 이 useEffect는 캐스케이딩 렌더링을 유발하지 않는다. 화면에는
  // 어차피 initialDraft가 null이라 배너가 뜨지 않으므로 별도 상태 갱신이 필요 없다.
  useEffect(() => {
    if (rawDraft && !initialDraft) {
      safeLocalStorageRemove(key);
    }
  }, [rawDraft, initialDraft, key]);

  // 사용자가 [복원]/[삭제] 버튼을 눌러 배너를 닫은 상태 — 이벤트 핸들러에서만 설정되므로
  // (useEffect 안이 아님) setState를 직접 호출해도 안전하다.
  const [dismissed, setDismissed] = useState(false);

  const hasDraft = initialDraft !== null && !dismissed;
  const savedAt = initialDraft?.savedAt ?? null;

  // 배너 [삭제] 버튼, 저장 성공 시(createdRef가 채워진 뒤) 공통으로 쓰는 삭제 경로.
  const discard = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    safeLocalStorageRemove(key);
    setDismissed(true);
  }, [key]);

  // [복원] 클릭 시 호출한다. localStorage는 사용자·확장프로그램이 임의로 쓸 수 있는
  // 저장소이므로, 폼(특히 Tiptap 에디터)에 주입하기 전 content를 다시 sanitize한다
  // (프로젝트의 "저장·렌더링 양쪽 sanitize" 관례를 저장소 경로까지 확장). 실제 삭제는
  // 하지 않고 배너만 닫는다 — 복원 직후 아직 자동 저장이 한 번도 안 된 상태에서 새로고침
  // 하더라도 원본 draft가 남아 있어야 복구할 수 있다.
  const restore = useCallback((): WeeklyLogFormData | null => {
    if (!initialDraft) return null;
    setDismissed(true);
    return {
      ...initialDraft.values,
      content: sanitizeWeeklyLogContent(initialDraft.values.content),
    };
  }, [initialDraft]);

  // react-hook-form 인스턴스를 구독해 debounce 자동 저장을 건다. formState.isDirty가
  // false면(=defaultValues와 동일, 즉 사용자가 아직 아무것도 입력/변경하지 않았으면)
  // 저장하지 않는다. 반환값은 언마운트/재구독 시 호출할 정리 함수.
  const watchForm = useCallback(
    (form: UseFormReturn<WeeklyLogFormData>) => {
      // formState.isDirty는 쓰지 않는다 — react-hook-form은 렌더 중에 실제로 접근된
      // formState 필드만 내부적으로 최신화하는 지연 구독(proxy) 방식이라, WeeklyLogForm이
      // isDirty를 렌더에서 한 번도 읽지 않으면 setTimeout 콜백 안에서 읽는 값이 항상
      // false로 고정된다(실측: 디바운스 타이머는 정상적으로 발화하지만 isDirty 게이트에
      // 걸려 저장이 계속 스킵됨). 대신 구독 시점의 초기값(form.getValues())을 직접
      // 스냅샷해 이후 값과 직렬화 비교한다 — RHF 내부 구현에 의존하지 않는 안전한 방식.
      const initialSerialized = JSON.stringify(form.getValues());
      const subscription = form.watch((value) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          if (JSON.stringify(value) === initialSerialized) return;
          const payload: StoredDraft = {
            values: value as WeeklyLogFormData,
            savedAt: new Date().toISOString(),
          };
          const serialized = JSON.stringify(payload);
          if (serialized.length > DRAFT_MAX_SERIALIZED_LENGTH) return;
          safeLocalStorageSet(key, serialized);
        }, DRAFT_SAVE_DEBOUNCE_MS);
      });
      return () => {
        subscription.unsubscribe();
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
      };
    },
    [key],
  );

  return { hasDraft, savedAt, restore, discard, watchForm };
}
