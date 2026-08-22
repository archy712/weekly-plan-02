import { z } from "zod";

// components/mention-input.tsx의 Textarea maxLength·글자 수 카운터가 이 값을 공유해
// 클라이언트에서 미리 입력을 막는다 — 서버 검증(아래 스키마)은 그와 무관하게 최종 방어선으로 유지.
export const COMMENT_MAX_LENGTH = 2000;

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "댓글 내용을 입력해주세요")
    .max(COMMENT_MAX_LENGTH, `댓글은 최대 ${COMMENT_MAX_LENGTH}자까지 입력 가능합니다`),
});

export type CommentFormData = z.infer<typeof commentSchema>;
