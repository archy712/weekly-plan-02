"use client";

import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn, escapeLikePattern } from "@/lib/utils";

export type ProfileSearchResult = { id: string; email: string; name: string | null };

function labelOf(profile: ProfileSearchResult): string {
  return profile.name ? `${profile.name} · ${profile.email}` : profile.email;
}

// 부문/부서 직속 장(長) 지정 다이얼로그(assign-direct-head-dialog.tsx)가 쓰는 이름/이메일
// 검색 입력. 부문·부서·팀 소속 여부와 무관하게 시스템의 아무 프로필이나 검색해야 해서
// (기존 HeadProfileCombobox는 이미 서버에서 조직 범위로 좁혀 내려준 정적 후보 배열을
// 클라이언트에서만 필터링하는 구조라 이 용도에 맞지 않음), components/mention-input.tsx가
// 쓰는 것과 동일한 search_mentionable_profiles RPC + 200ms debounce 패턴을 그대로
// 재사용한다 — 새 검색 UI를 만들지 않고 이미 검증된 상호작용을 따른다.
export function ProfileSearchPicker({
  value,
  onChange,
  placeholder = "이름 또는 이메일로 검색",
  disabled,
}: {
  value: ProfileSearchResult | null;
  onChange: (value: ProfileSearchResult | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState(value ? labelOf(value) : "");
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    // 방금 고른 항목의 라벨을 그대로 입력창에 채워둔 상태(직접 다시 타이핑하지 않은 상태)면
    // 재검색하지 않는다 — 선택 직후 같은 이름으로 또 검색이 돌아 결과가 깜빡이는 것을 막는다.
    if (value && query === labelOf(value)) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const trimmed = query.trim();
      if (!trimmed) {
        if (!cancelled) setResults([]);
        return;
      }
      const { data, error } = await supabase.rpc("search_mentionable_profiles", {
        search_query: escapeLikePattern(trimmed),
        max_results: 8,
      });
      if (cancelled) return;
      if (error) {
        setResults([]);
        return;
      }
      const candidates: ProfileSearchResult[] = (data ?? [])
        .filter((candidate) => Boolean(candidate.email))
        .map((candidate) => ({
          id: candidate.id,
          email: candidate.email,
          name: candidate.name ?? null,
        }));
      setResults(candidates);
      setActiveIndex(0);
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, value, supabase]);

  const select = (candidate: ProfileSearchResult) => {
    onChange(candidate);
    setQuery(labelOf(candidate));
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Input
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setIsOpen(true);
          if (value) onChange(null);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (!isOpen || results.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((i) => (i + 1) % results.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((i) => (i - 1 + results.length) % results.length);
          } else if (event.key === "Enter") {
            event.preventDefault();
            select(results[activeIndex]);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setIsOpen(false);
          }
        }}
        onBlur={() => {
          // 옵션 클릭(mousedown)이 blur보다 먼저 처리되므로 살짝 지연 후 닫는다.
          window.setTimeout(() => setIsOpen(false), 100);
        }}
      />
      {isOpen && results.length > 0 && (
        <div
          role="listbox"
          aria-label="검색 결과"
          className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
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
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(candidate)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="min-w-0 flex-1 truncate">{labelOf(candidate)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
