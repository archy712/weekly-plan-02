"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notification";
import { enrichNotifications, getRecentNotifications, getUnreadNotificationCount } from "@/lib/queries/notifications";
import { createClient } from "@/lib/supabase/client";
import type { NotificationListItem } from "@/lib/types";

const MAX_NOTIFICATIONS = 10;
// Realtime 연결이 끊겼을 때의 폴백 주기. 알림은 배지 하나가 걸린 저위험 기능이라 짧은
// 간격으로 재시도하며 사용자를 방해할 필요가 없다(로드맵 명시 — 에러 토스트 금지).
const POLL_INTERVAL_MS = 60_000;

type State = {
  notifications: NotificationListItem[];
  unreadCount: number;
};

type Action =
  | { type: "reset"; notifications: NotificationListItem[]; unreadCount: number }
  | { type: "insert"; notification: NotificationListItem }
  | { type: "markRead"; id: string }
  | { type: "revertRead"; id: string }
  | { type: "markAllRead" };

// unreadCount는 notifications(최근 10건만 보관)에서 파생시키지 않고 별도로 추적한다 —
// 서버 전체 안 읽은 개수가 화면에 보이는 10건보다 많을 수 있어(예: 11번째 이전 알림이
// 안 읽은 상태), 목록 길이로부터 역산하면 과소 집계된다.
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "reset":
      return { notifications: action.notifications, unreadCount: action.unreadCount };
    case "insert": {
      // resync 직후 동일 알림이 realtime 이벤트로 다시 도착하는 등의 중복을 방지한다.
      if (state.notifications.some((n) => n.id === action.notification.id)) return state;
      return {
        notifications: [action.notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS),
        unreadCount: state.unreadCount + 1,
      };
    }
    case "markRead": {
      const target = state.notifications.find((n) => n.id === action.id);
      if (!target || target.read_at) return state;
      const now = new Date().toISOString();
      return {
        notifications: state.notifications.map((n) =>
          n.id === action.id ? { ...n, read_at: now } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    }
    case "revertRead": {
      // markRead 낙관적 업데이트가 서버 액션 실패로 롤백될 때만 사용한다.
      const target = state.notifications.find((n) => n.id === action.id);
      if (!target || !target.read_at) return state;
      return {
        notifications: state.notifications.map((n) =>
          n.id === action.id ? { ...n, read_at: null } : n,
        ),
        unreadCount: state.unreadCount + 1,
      };
    }
    case "markAllRead": {
      const now = new Date().toISOString();
      return {
        notifications: state.notifications.map((n) => (n.read_at ? n : { ...n, read_at: now })),
        unreadCount: 0,
      };
    }
    default:
      return state;
  }
}

// 헤더 알림 벨(components/notification-bell.tsx)의 상태·Realtime 구독을 담당한다.
// 반드시 브라우저 클라이언트(lib/supabase/client)를 쓴다 — 서버 클라이언트로는 구독할
// 수 없다(CLAUDE.md 클라이언트 3종 구분 규칙). 초기 데이터는 헤더의 서버 컴포넌트가
// SSR로 내려준 값을 그대로 시드로 쓰고, 이 훅은 그 위에 얹히는 증분(신규 INSERT)만
// 처리한다 — 마운트 시점에 목록 전체를 다시 조회하지 않는다.
export function useNotifications({
  userId,
  initialNotifications,
  initialUnreadCount,
}: {
  userId: string | null;
  initialNotifications: NotificationListItem[];
  initialUnreadCount: number;
}) {
  const [state, dispatch] = useReducer(reducer, {
    notifications: initialNotifications,
    unreadCount: initialUnreadCount,
  });
  const supabase = useMemo(() => createClient(), []);

  // 로그아웃 후 다른 계정으로 로그인하면 이 훅은 언마운트되지 않고 userId prop만 바뀔 수
  // 있다(같은 헤더 트리 유지) — 이전 사용자의 알림이 새 세션에 남지 않도록, 서버가 새로
  // 내려준 초기값으로 로컬 상태를 완전히 교체한다.
  useEffect(() => {
    dispatch({ type: "reset", notifications: initialNotifications, unreadCount: initialUnreadCount });
    // initialNotifications/initialUnreadCount는 userId가 바뀔 때만 이 효과를 다시 태우기
    // 위한 값이고, 그 값 자체의 얕은 변화(재조회 결과 배열 참조 변경 등)에는 반응하지
    // 않는다 — 매 렌더 재시딩되면 사용자가 읽음 처리한 로컬 상태가 덮어써진다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const resync = useCallback(async () => {
    if (!userId) return;
    const [unreadCount, notifications] = await Promise.all([
      getUnreadNotificationCount(supabase, userId),
      getRecentNotifications(supabase, userId, MAX_NOTIFICATIONS),
    ]);
    dispatch({ type: "reset", notifications, unreadCount });
  }, [supabase, userId]);

  useEffect(() => {
    if (!userId) return;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            type: string;
            // Task 042: 리마인더 알림은 actor_id/weekly_log_id가 둘 다 null일 수 있다.
            actor_id: string | null;
            recipient_id: string;
            weekly_log_id: string | null;
            comment_id: string | null;
            read_at: string | null;
            created_at: string;
            period_start: string | null;
          };
          const [enriched] = await enrichNotifications(supabase, [row]);
          if (cancelled || !enriched) return;
          dispatch({ type: "insert", notification: enriched });
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
          }
          return;
        }
        // CHANNEL_ERROR/TIMED_OUT/CLOSED — 연결 실패·끊김. 에러 토스트로 방해하지 않고
        // 조용히 폴링으로 폴백한다(로드맵 명시 요구사항). 재연결에 성공하면(status가
        // 다시 SUBSCRIBED로 돌아오면) 위 분기에서 폴링을 정리한다.
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (!pollTimer) {
            pollTimer = setInterval(resync, POLL_INTERVAL_MS);
          }
        }
      });

    // 구독 정리 필수 — 누락하면 라우트 이동마다 채널이 누적돼 커넥션이 고갈된다
    // (이 프로젝트 최초의 Realtime 사용, Task 035 핵심 주의사항).
    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, resync]);

  const markRead = useCallback(async (id: string) => {
    dispatch({ type: "markRead", id });
    try {
      const result = await markNotificationReadAction(id);
      if (!result.success) {
        dispatch({ type: "revertRead", id });
      }
    } catch {
      dispatch({ type: "revertRead", id });
    }
  }, []);

  const markAllRead = useCallback(async () => {
    dispatch({ type: "markAllRead" });
    try {
      const result = await markAllNotificationsReadAction();
      if (!result.success) {
        // 부분 실패 시 로컬 낙관적 상태와 서버 상태가 어긋날 수 있으므로, 개별 롤백 대신
        // 서버 진실을 다시 조회해 맞춘다.
        await resync();
      }
    } catch {
      await resync();
    }
  }, [resync]);

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    markRead,
    markAllRead,
  };
}
