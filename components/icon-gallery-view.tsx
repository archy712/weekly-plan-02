"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";

import { iconDocsUrl, type IconCategory } from "@/lib/constants/icon-gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ALL_CATEGORY_ID = "all";

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
          placeholder="아이콘 이름 검색…"
          className="pl-9"
          aria-label="아이콘 검색"
        />
      </div>

      <p className="text-sm text-muted-foreground">{visibleCount}개 아이콘</p>

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
                {category.icons.map((name) => (
                  <a
                    key={`${category.id}-${name}`}
                    href={iconDocsUrl(name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`lucide.dev에서 "${name}" 보기`}
                    className={cn(
                      "group flex flex-col items-center justify-center gap-2 rounded-lg border bg-card p-4 text-card-foreground transition-colors",
                      "hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <DynamicIcon
                      name={name}
                      className="size-6 text-foreground transition-transform group-hover:scale-110"
                      aria-hidden="true"
                    />
                    <span className="w-full truncate text-center text-xs text-muted-foreground group-hover:text-foreground">
                      {name}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
