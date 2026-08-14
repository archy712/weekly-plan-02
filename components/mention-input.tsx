"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { getAvatarPreset } from "@/lib/constants/avatars";
import { createClient } from "@/lib/supabase/client";
import { cn, escapeLikePattern } from "@/lib/utils";

type MentionCandidate = {
  id: string;
  email: string;
  name: string | null;
  avatar_key: string;
};

type MentionTrigger = { atIndex: number; query: string };

// "@" 다음 커서까지 공백이나 완성된 토큰 문자([]())가 없는 구간만 활성 멘션 쿼리로 본다.
function findMentionTrigger(text: string, cursor: number): MentionTrigger | null {
  const upToCursor = text.slice(0, cursor);
  const atIndex = upToCursor.lastIndexOf("@");
  if (atIndex === -1) return null;
  const between = upToCursor.slice(atIndex + 1);
  if (/[\s[\]()]/.test(between)) return null;
  return { atIndex, query: between };
}

// weekly-log-comment-section.tsx가 저장 시 본문에 그대로 담아 보내는 멘션 토큰 형식.
// 서버(lib/actions/weekly-log-comment.ts)가 이 형식을 정규식으로 파싱해 멘션을 정규화한다.
function buildMentionToken(candidate: MentionCandidate): string {
  return `@[${candidate.email}](${candidate.id}) `;
}

// 전용 멘션 라이브러리(cmdk 등)를 새로 추가하지 않고 기존 ui/textarea + 커스텀 드롭다운으로
// 구현한다(Task 033 의존성 최소화 방침). 캐럿 좌표 추적 라이브러리도 쓰지 않고 텍스트 영역
// 바로 아래에 드롭다운을 고정 배치하는 방식으로 단순화했다.
export function MentionInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  autoFocus,
  rows = 3,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  rows?: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [trigger, setTrigger] = useState<MentionTrigger | null>(null);
  const [results, setResults] = useState<MentionCandidate[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  // isOpen은 trigger/results에서 파생한다 — trigger가 null이면 드롭다운을 닫는 데 별도
  // setState가 필요 없으므로(effect 안에서 동기 setState를 호출하지 않게 되어 캐스케이딩
  // 렌더링을 유발하는 react-hooks/set-state-in-effect 경고를 피한다).
  const isOpen = trigger !== null && results.length > 0;

  useEffect(() => {
    if (trigger === null) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("search_mentionable_profiles", {
        search_query: escapeLikePattern(trigger.query),
        max_results: 8,
      });
      if (cancelled) return;
      if (error) {
        setResults([]);
        return;
      }
      const candidates: MentionCandidate[] = (data ?? [])
        .filter((candidate) => Boolean(candidate.email))
        .map((candidate) => ({
          id: candidate.id,
          email: candidate.email,
          name: candidate.name ?? null,
          avatar_key: candidate.avatar_key,
        }));
      setResults(candidates);
      setActiveIndex(0);
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trigger, supabase]);

  const insertMention = (candidate: MentionCandidate) => {
    if (!trigger) return;
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? value.length;
    const token = buildMentionToken(candidate);
    const nextValue = value.slice(0, trigger.atIndex) + token + value.slice(cursor);
    onChange(nextValue);
    setTrigger(null);
    requestAnimationFrame(() => {
      const pos = trigger.atIndex + token.length;
      textarea?.focus();
      textarea?.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={rows}
        onChange={(event) => {
          const nextValue = event.target.value;
          onChange(nextValue);
          setTrigger(findMentionTrigger(nextValue, event.target.selectionStart ?? nextValue.length));
        }}
        onKeyDown={(event) => {
          if (!isOpen || results.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((i) => (i + 1) % results.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((i) => (i - 1 + results.length) % results.length);
          } else if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            insertMention(results[activeIndex]);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setTrigger(null);
          }
        }}
        onBlur={() => {
          // 옵션 클릭(mousedown)이 blur보다 먼저 처리되므로 살짝 지연 후 닫는다.
          window.setTimeout(() => setTrigger(null), 100);
        }}
      />
      {isOpen && results.length > 0 && (
        <div
          role="listbox"
          aria-label="멘션할 사용자"
          className="absolute left-0 top-full z-50 mt-1 max-h-56 w-64 max-w-[calc(100vw-2rem)] overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          onMouseDown={(event) => event.preventDefault()}
        >
          {results.map((candidate, index) => (
            <button
              key={candidate.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
              )}
              onClick={() => insertMention(candidate)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs",
                  getAvatarPreset(candidate.avatar_key).bgClass,
                )}
              >
                {getAvatarPreset(candidate.avatar_key).emoji}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {candidate.name ? `${candidate.name} · ${candidate.email}` : candidate.email}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
