"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";

import {
  componentDocsUrl,
  type GalleryCategory,
} from "@/lib/constants/component-gallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ALL_CATEGORY_ID = "all";

type Props = {
  categories: GalleryCategory[];
};

export function ComponentGalleryView({ categories }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY_ID);
  const [query, setQuery] = useState("");

  const totalCount = useMemo(
    () => categories.reduce((sum, c) => sum + c.components.length, 0),
    [categories],
  );

  const normalizedQuery = query.trim().toLowerCase();

  // 카테고리 선택 → 검색어 필터 순으로 좁힌다. 검색어가 있으면 카테고리와 무관하게
  // 전체에서 검색되도록 하되, 선택된 카테고리가 있으면 그 안에서만 찾는다.
  const visibleCategories = useMemo(() => {
    const scoped =
      activeCategory === ALL_CATEGORY_ID
        ? categories
        : categories.filter((c) => c.id === activeCategory);

    if (!normalizedQuery) return scoped;

    return scoped
      .map((category) => ({
        ...category,
        components: category.components.filter((component) => {
          const haystack =
            `${component.name} ${component.slug} ${component.description}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        }),
      }))
      .filter((category) => category.components.length > 0);
  }, [categories, activeCategory, normalizedQuery]);

  const visibleCount = visibleCategories.reduce(
    (sum, c) => sum + c.components.length,
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
              {category.components.length}
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
          placeholder="컴포넌트 이름 검색…"
          className="pl-9"
          aria-label="컴포넌트 검색"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {visibleCount}개 컴포넌트
      </p>

      {/* 결과 */}
      {visibleCategories.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          &ldquo;{query}&rdquo; 에 해당하는 컴포넌트가 없습니다.
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {category.components.map((component) => (
                  <a
                    key={component.slug}
                    href={componentDocsUrl(component.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "group flex flex-col gap-2 rounded-lg border bg-card p-4 text-card-foreground transition-colors",
                      "hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{component.name}</span>
                      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {component.description}
                    </p>
                    <div className="mt-1">
                      <Badge variant="secondary" className="font-normal">
                        Base UI
                      </Badge>
                    </div>
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
