"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";

import {
  isNumericVersion,
  npmUrl,
  type TechCategory,
  type VersionInfo,
} from "@/lib/constants/tech-stack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ALL_CATEGORY_ID = "all";

type Props = {
  categories: TechCategory[];
  /** package.json 에서 주입된 패키지명 → 버전 정보 맵 */
  versions: Record<string, VersionInfo>;
};

export function TechStackView({ categories, versions }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY_ID);
  const [query, setQuery] = useState("");

  const totalCount = useMemo(
    () => categories.reduce((sum, c) => sum + c.items.length, 0),
    [categories],
  );

  const normalizedQuery = query.trim().toLowerCase();

  const visibleCategories = useMemo(() => {
    const scoped =
      activeCategory === ALL_CATEGORY_ID
        ? categories
        : categories.filter((c) => c.id === activeCategory);

    if (!normalizedQuery) return scoped;

    return scoped
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          const haystack = `${item.name} ${item.description}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, activeCategory, normalizedQuery]);

  const visibleCount = visibleCategories.reduce(
    (sum, c) => sum + c.items.length,
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
              {category.items.length}
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
          placeholder="패키지 이름 검색…"
          className="pl-9"
          aria-label="패키지 검색"
        />
      </div>

      <p className="text-sm text-muted-foreground">{visibleCount}개 패키지</p>

      {/* 결과 */}
      {visibleCategories.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          &ldquo;{query}&rdquo; 에 해당하는 패키지가 없습니다.
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
                {category.items.map((item) => {
                  const version = versions[item.name];
                  const spec = version?.spec ?? null;
                  const installed = version?.installed ?? null;
                  const latest = version?.latest ?? null;
                  // 왼쪽 배지: npm 최신 버전. 조회 실패 시 package.json 선언값으로 폴백.
                  const specLabel = spec
                    ? isNumericVersion(spec)
                      ? `v${spec}`
                      : spec
                    : null;
                  const latestLabel = latest ? `v${latest}` : specLabel;
                  // 최신 ≠ 설치 → 업데이트 가능(강조).
                  const isOutdated = !!(
                    latest &&
                    installed &&
                    latest !== installed
                  );
                  return (
                    <a
                      key={item.name}
                      href={npmUrl(item.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "group flex flex-col gap-2 rounded-lg border bg-card p-4 text-card-foreground transition-colors",
                        "hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="break-all font-medium">
                          {item.name}
                        </span>
                        <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                      {latestLabel || installed ? (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {latestLabel ? (
                            <Badge
                              variant={isOutdated ? "default" : "secondary"}
                              className="font-mono font-normal"
                              title={
                                latest
                                  ? isOutdated
                                    ? "npm 최신 버전 (설치본보다 최신)"
                                    : "npm 최신 버전"
                                  : "npm 최신 조회 실패 — package.json 선언 버전"
                              }
                            >
                              {latestLabel}
                            </Badge>
                          ) : null}
                          {installed ? (
                            <Badge
                              variant="outline"
                              className="font-mono font-normal text-muted-foreground"
                              title="현재 설치된 버전"
                            >
                              v{installed}
                            </Badge>
                          ) : null}
                        </div>
                      ) : null}
                    </a>
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
