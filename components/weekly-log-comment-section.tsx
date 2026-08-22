"use client";

import { type ReactNode, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { MentionInput } from "@/components/mention-input";
import { getAvatarPreset } from "@/lib/constants/avatars";
import { formatRelativeTime } from "@/lib/format";
import { COMMENT_MAX_LENGTH } from "@/lib/schemas/comment";
import { cn } from "@/lib/utils";
import {
  createCommentAction,
  deleteCommentAction,
  updateCommentAction,
} from "@/lib/actions/weekly-log-comment";
import type { WeeklyLogComment, WeeklyLogCommentMention } from "@/lib/types";

// 본문에 저장된 @[이메일](uuid) 토큰을 배지로 치환해 렌더링한다. content는 저장 시점에
// 이미 sanitizeCommentContent()로 HTML 태그가 전부 제거된 plain text이므로, 남은 일반
// 텍스트는 React가 자동으로 이스케이프한다(렌더링 시점 이중 방어).
function CommentContent({
  content,
  mentions,
  currentUserId,
}: {
  content: string;
  mentions: WeeklyLogCommentMention[];
  currentUserId: string;
}) {
  const mentionMap = useMemo(() => new Map(mentions.map((m) => [m.id, m])), [mentions]);

  const parts: ReactNode[] = [];
  const pattern = /@\[[^\]]*\]\(([0-9a-fA-F-]{36})\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    const userId = match[1];
    const mention = mentionMap.get(userId);
    const label = mention ? `@${mention.name ?? mention.email ?? "사용자"}` : "@알 수 없는 사용자";
    parts.push(
      <Badge
        key={`mention-${key++}`}
        variant={userId === currentUserId ? "default" : "secondary"}
        className="mx-0.5 align-middle"
      >
        {label}
      </Badge>,
    );
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return <>{parts}</>;
}

function CommentItem({
  comment,
  replies,
  weeklyLogId,
  currentUserId,
  isAdmin,
  onChanged,
  isReply = false,
}: {
  comment: WeeklyLogComment;
  replies: WeeklyLogComment[];
  weeklyLogId: string;
  currentUserId: string;
  isAdmin: boolean;
  onChanged: () => void;
  isReply?: boolean;
}) {
  const canModify = comment.author_id === currentUserId || isAdmin;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  // isBusy 리렌더 반영 전에 도착하는 연속 클릭(더블클릭)을 막기 위한 동기 가드
  // (weekly-log-detail-view.tsx의 handleDelete와 동일한 패턴).
  const busyRef = useRef(false);

  const handleUpdate = async () => {
    if (busyRef.current) return;
    if (!editContent.trim()) {
      toast.error("댓글 내용을 입력해주세요.");
      return;
    }
    busyRef.current = true;
    setIsBusy(true);
    try {
      const result = await updateCommentAction(comment.id, weeklyLogId, { content: editContent });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("댓글이 수정되었습니다.");
      setIsEditing(false);
      onChanged();
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      busyRef.current = false;
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsBusy(true);
    try {
      const result = await deleteCommentAction(comment.id, weeklyLogId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("댓글이 삭제되었습니다.");
      onChanged();
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      busyRef.current = false;
      setIsBusy(false);
    }
  };

  const handleReply = async () => {
    if (busyRef.current) return;
    if (!replyContent.trim()) {
      toast.error("답글 내용을 입력해주세요.");
      return;
    }
    busyRef.current = true;
    setIsBusy(true);
    try {
      const result = await createCommentAction(weeklyLogId, { content: replyContent }, comment.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setReplyContent("");
      setIsReplying(false);
      toast.success("답글이 등록되었습니다.");
      onChanged();
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      busyRef.current = false;
      setIsBusy(false);
    }
  };

  return (
    // id는 알림(components/notification-bell.tsx) 클릭 시 이동하는
    // /protected/weekly-logs/{id}#comment-{commentId} 해시가 실제로 스크롤할 대상이다
    // (Task 035). 댓글·답글 모두 이 컴포넌트를 공유하므로 대댓글에도 동일하게 붙는다.
    <li
      id={`comment-${comment.id}`}
      className={cn("flex flex-col gap-2 scroll-mt-4", isReply && "ml-8 border-l pl-4 sm:ml-10")}
    >
      <div className="flex items-start gap-2">
        <Avatar size="sm" className={getAvatarPreset(comment.author_avatar_key).bgClass}>
          <AvatarFallback className="bg-transparent text-xs">
            {getAvatarPreset(comment.author_avatar_key).emoji}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium">
              {comment.author_name ?? comment.author_email ?? "알 수 없는 사용자"}
            </span>
            {/* formatRelativeTime()은 Date.now() 기준이라, 서버 렌더와 클라이언트
                하이드레이션 사이 시간차로 "방금 전"→"1분 전" 같은 경계를 넘으면 텍스트가
                달라질 수 있다 — React가 클라이언트 값으로 정상 렌더링하므로 기능상 문제는
                없고 콘솔 경고만 발생해 suppressHydrationWarning으로 막는다. */}
            <span className="text-xs text-muted-foreground" suppressHydrationWarning>
              {formatRelativeTime(comment.created_at)}
            </span>
            {!comment.deleted_at && comment.updated_at !== comment.created_at && (
              <span className="text-xs text-muted-foreground">(수정됨)</span>
            )}
          </div>

          {comment.deleted_at ? (
            <p className="text-sm italic text-muted-foreground">삭제된 댓글입니다.</p>
          ) : isEditing ? (
            <div className="mt-1 flex flex-col gap-2">
              <MentionInput
                value={editContent}
                onChange={setEditContent}
                disabled={isBusy}
                rows={2}
                autoFocus
                maxLength={COMMENT_MAX_LENGTH}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isBusy}
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                >
                  취소
                </Button>
                <Button type="button" size="sm" disabled={isBusy} onClick={handleUpdate}>
                  저장
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-1 whitespace-pre-wrap break-words text-sm">
              <CommentContent
                content={comment.content}
                mentions={comment.mentions}
                currentUserId={currentUserId}
              />
            </div>
          )}

          {!comment.deleted_at && !isEditing && (
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              {!isReply && (
                <button type="button" className="hover:underline" onClick={() => setIsReplying((v) => !v)}>
                  답글
                </button>
              )}
              {canModify && (
                <>
                  <button type="button" className="hover:underline" onClick={() => setIsEditing(true)}>
                    수정
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button type="button" className="hover:underline">
                        삭제
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>댓글을 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                          삭제된 댓글은 복구할 수 없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction disabled={isBusy} onClick={handleDelete}>
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          )}

          {isReplying && (
            <div className="mt-2 flex flex-col gap-2">
              <MentionInput
                value={replyContent}
                onChange={setReplyContent}
                placeholder="답글을 입력하세요."
                disabled={isBusy}
                rows={2}
                autoFocus
                maxLength={COMMENT_MAX_LENGTH}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isBusy}
                  onClick={() => {
                    setIsReplying(false);
                    setReplyContent("");
                  }}
                >
                  취소
                </Button>
                <Button type="button" size="sm" disabled={isBusy} onClick={handleReply}>
                  답글 등록
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {replies.length > 0 && (
        <ul className="flex flex-col gap-3">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              weeklyLogId={weeklyLogId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onChanged={onChanged}
              isReply
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function WeeklyLogCommentSection({
  weeklyLogId,
  comments,
  currentUserId,
  isAdmin,
}: {
  weeklyLogId: string;
  comments: WeeklyLogComment[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [newContent, setNewContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const topLevelComments = useMemo(
    () => comments.filter((comment) => comment.parent_comment_id === null),
    [comments],
  );
  const repliesByParent = useMemo(() => {
    const map = new Map<string, WeeklyLogComment[]>();
    for (const comment of comments) {
      if (!comment.parent_comment_id) continue;
      const list = map.get(comment.parent_comment_id) ?? [];
      list.push(comment);
      map.set(comment.parent_comment_id, list);
    }
    return map;
  }, [comments]);

  // 목록 페이지의 comment_count(lib/queries/weekly-logs.ts, .is("deleted_at", null))와
  // 동일한 기준으로 센다 — 소프트 삭제된 댓글은 "삭제된 댓글입니다" placeholder로만 남을 뿐
  // 실제 내용이 없으므로 집계에서 제외해야 화면 간 숫자가 어긋나지 않는다.
  const activeCommentCount = useMemo(
    () => comments.filter((comment) => !comment.deleted_at).length,
    [comments],
  );

  const handleChanged = () => router.refresh();

  const handleCreate = async () => {
    if (submittingRef.current) return;
    if (!newContent.trim()) {
      toast.error("댓글 내용을 입력해주세요.");
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await createCommentAction(weeklyLogId, { content: newContent });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setNewContent("");
      toast.success("댓글이 등록되었습니다.");
      handleChanged();
    } catch {
      toast.error("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 border-t pt-6">
      <h2 className="text-lg font-semibold">댓글 {activeCommentCount}개</h2>

      <div className="flex flex-col gap-2">
        <MentionInput
          value={newContent}
          onChange={setNewContent}
          placeholder="댓글을 입력하세요. @를 입력해 동료를 멘션할 수 있습니다."
          disabled={isSubmitting}
          rows={3}
          maxLength={COMMENT_MAX_LENGTH}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {newContent.length}/{COMMENT_MAX_LENGTH}
          </span>
          <Button type="button" size="sm" disabled={isSubmitting} onClick={handleCreate}>
            댓글 등록
          </Button>
        </div>
      </div>

      {topLevelComments.length === 0 ? (
        <EmptyState title="아직 댓글이 없습니다" description="가장 먼저 댓글을 남겨보세요." />
      ) : (
        <ul className="flex flex-col gap-4">
          {topLevelComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={repliesByParent.get(comment.id) ?? []}
              weeklyLogId={weeklyLogId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onChanged={handleChanged}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
