import { z } from "zod";

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "댓글 내용을 입력해주세요")
    .max(2000, "댓글은 최대 2000자까지 입력 가능합니다"),
});

export type CommentFormData = z.infer<typeof commentSchema>;
