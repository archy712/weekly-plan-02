"use server";

import { createClient } from "@/lib/supabase/server";
import {
  fetchAllWeeklyLogsForExport,
  fetchWeeklyLogsKanbanColumnPage,
  fetchWeeklyLogsPage,
  normalizeWeeklyLogFilters,
  normalizeWeeklyLogSort,
} from "@/lib/queries/weekly-logs";
import { WEEKLY_LOGS_KANBAN_COLUMN_PAGE_SIZE, WEEKLY_LOGS_PAGE_SIZE } from "@/lib/types";
import type { WeeklyLogListItem, WeeklyLogStatus } from "@/lib/types";

// 클라이언트가 보내는 필터/정렬 원본. 서버에서 정규화하므로 형태만 느슨하게 받는다.
type RawFilters = {
  department?: string | null;
  status?: string | null;
  q?: string | null;
  from?: string | null;
  to?: string | null;
};

type RawSort = {
  key?: string | null;
  direction?: string | null;
};

export type LoadMoreWeeklyLogsResult =
  | { success: true; items: WeeklyLogListItem[]; hasMore: boolean }
  | { success: false; error: string };

// 무한 스크롤 추가 로딩. 목록 하단 센티넬이 보이면 클라이언트가 현재 필터·정렬과 이미
// 로드한 개수(offset)를 넘겨 다음 배치를 요청한다. weekly_logs SELECT는 전 부서 공개라
// 필터 자체에 권한 상승 위험은 없지만, 익명 호출을 막기 위해 인증만 확인한다.
export async function loadMoreWeeklyLogsAction(params: {
  filters: RawFilters;
  sort: RawSort;
  offset: number;
}): Promise<LoadMoreWeeklyLogsResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const offset = Number.isFinite(params.offset) ? Math.max(0, Math.floor(params.offset)) : 0;

  try {
    const { items, hasMore } = await fetchWeeklyLogsPage(
      supabase,
      normalizeWeeklyLogFilters(params.filters),
      normalizeWeeklyLogSort(params.sort),
      offset,
      WEEKLY_LOGS_PAGE_SIZE,
    );
    return { success: true, items, hasMore };
  } catch (err) {
    console.error("[lib/actions/weekly-log-list] 추가 로딩 실패:", err);
    return { success: false, error: "목록을 불러오지 못했습니다." };
  }
}

// 칸반보드 컬럼(진행상태) 하나의 "더 보기". 목록 무한 스크롤(loadMoreWeeklyLogsAction)과
// 동일한 패턴이지만 offset이 전체가 아니라 그 컬럼 안에서의 로드된 개수 기준이다.
export async function loadMoreKanbanColumnAction(params: {
  filters: RawFilters;
  status: WeeklyLogStatus;
  offset: number;
}): Promise<LoadMoreWeeklyLogsResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const offset = Number.isFinite(params.offset) ? Math.max(0, Math.floor(params.offset)) : 0;

  try {
    const { items, hasMore } = await fetchWeeklyLogsKanbanColumnPage(
      supabase,
      normalizeWeeklyLogFilters(params.filters),
      params.status,
      offset,
      WEEKLY_LOGS_KANBAN_COLUMN_PAGE_SIZE,
    );
    return { success: true, items, hasMore };
  } catch (err) {
    console.error("[lib/actions/weekly-log-list] 칸반 컬럼 추가 로딩 실패:", err);
    return { success: false, error: "목록을 불러오지 못했습니다." };
  }
}

export type ExportWeeklyLogsResult =
  | { success: true; items: WeeklyLogListItem[] }
  | { success: false; error: string };

// PDF/Excel 다운로드용 전체 조회. 무한 스크롤로는 화면에 일부만 로드돼 있으므로, 다운로드
// 시점에 현재 필터·정렬 기준 전체를 별도로 조회한다(화면 결과와 항상 일치).
export async function loadAllWeeklyLogsForExportAction(params: {
  filters: RawFilters;
  sort: RawSort;
}): Promise<ExportWeeklyLogsResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  try {
    const items = await fetchAllWeeklyLogsForExport(
      supabase,
      normalizeWeeklyLogFilters(params.filters),
      normalizeWeeklyLogSort(params.sort),
    );
    return { success: true, items };
  } catch (err) {
    console.error("[lib/actions/weekly-log-list] 다운로드용 전체 조회 실패:", err);
    return { success: false, error: "다운로드할 목록을 불러오지 못했습니다." };
  }
}
