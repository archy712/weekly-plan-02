"use client";

import { useMemo, useState, type ComponentType } from "react";
import { Search } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toast } from "sonner";

import { type IconCategory } from "@/lib/constants/icon-gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ALL_CATEGORY_ID = "all";

// "arrow-up" -> "ArrowUp" — lucide-react 배럴이 export하는 PascalCase 이름으로 변환한다.
// 아이콘 개수가 2천 개가 넘어 lucide-react/dynamic의 컴포넌트별 개별 dynamic import를
// 쓰면 전체 보기 시 수천 개의 청크를 동시에 요청하게 되므로, 이 화면만은 정적 배럴
// import(lucide-react)를 그대로 써서 한 번에 로드한다(대신 이 페이지 코드에만 국한되고
// 나머지 앱 번들에는 영향 없음 — 라우트별 코드 분할).
function toPascalCase(kebabName: string): string {
  return kebabName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

type Props = {
  categories: IconCategory[];
};

export function IconGalleryView({ categories }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY_ID);
  const [query, setQuery] = useState("");

  const totalCount = useMemo(
    () => categories.reduce((sum, c) => sum + c.icons.length, 0),
    [categories],
  );

  const normalizedQuery = query.trim().toLowerCase();

  // 카테고리 선택 → 검색어(아이콘 이름) 필터 순으로 좁힌다.
  const visibleCategories = useMemo(() => {
    const scoped =
      activeCategory === ALL_CATEGORY_ID
        ? categories
        : categories.filter((c) => c.id === activeCategory);

    if (!normalizedQuery) return scoped;

    return scoped
      .map((category) => ({
        ...category,
        icons: category.icons.filter((name) =>
          name.toLowerCase().includes(normalizedQuery),
        ),
      }))
      .filter((category) => category.icons.length > 0);
  }, [categories, activeCategory, normalizedQuery]);

  const visibleCount = visibleCategories.reduce(
    (sum, c) => sum + c.icons.length,
    0,
  );

  const handleCopy = (pascalName: string) => {
    const snippet = `import { ${pascalName} } from "lucide-react";`;
    navigator.clipboard
      .writeText(snippet)
      .then(() => toast.success(`복사되었습니다: ${snippet}`))
      .catch(() => toast.error("클립보드 복사에 실패했습니다."));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 카테고리 선택 */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={activeCategory === ALL_CATEGORY_ID ? "default" : "outline"}
          onClick={() => setActiveCategory(ALL_CATEGORY_ID)}
        >
          전체
          <span className="ml-1.5 text-xs opacity-70">{totalCount}</span>
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            type="button"
            size="sm"
            variant={activeCategory === category.id ? "default" : "outline"}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.title}
            <span className="ml-1.5 text-xs opacity-70">
              {category.icons.length}
            </span>
          </Button>
        ))}
      </div>

      {/* 검색 */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="아이콘 이름으로 검색 (예: arrow, user, file)"
          className="pl-9"
          aria-label="아이콘 검색"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        전체 {totalCount}개 중 {visibleCount}개 표시 · 클릭하면 import 구문이 복사됩니다
      </p>

      {/* 결과 */}
      {visibleCategories.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          &ldquo;{query}&rdquo; 에 해당하는 아이콘이 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {visibleCategories.map((category) => (
            <section key={category.id} className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold">{category.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {category.icons.map((name) => {
                  const pascalName = toPascalCase(name);
                  const Icon = (
                    LucideIcons as unknown as Record<
                      string,
                      ComponentType<{ className?: string; "aria-hidden"?: boolean }>
                    >
                  )[pascalName];
                  if (!Icon) return null;

                  return (
                    <button
                      key={`${category.id}-${name}`}
                      type="button"
                      onClick={() => handleCopy(pascalName)}
                      title={`클릭하면 "${pascalName}" import 구문이 복사됩니다`}
                      className={cn(
                        "group flex flex-col items-center justify-center gap-2 rounded-lg border bg-card p-4 text-card-foreground transition-colors",
                        "hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    >
                      <Icon
                        className="size-6 text-foreground transition-transform group-hover:scale-110"
                        aria-hidden
                      />
                      <span className="w-full truncate text-center text-xs text-muted-foreground group-hover:text-foreground">
                        {name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
