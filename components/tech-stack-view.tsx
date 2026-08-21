import { Badge } from "@/components/ui/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { PLANNED_TECH_STACK, type TechCategory } from "@/lib/constants/tech-stack";

function TechItemGrid({ category }: { category: TechCategory }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{category.title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {category.items.map((item) => (
          <Item key={item.name} variant="outline">
            <ItemContent>
              <ItemTitle>{item.name}</ItemTitle>
              <ItemDescription>{item.description}</ItemDescription>
            </ItemContent>
          </Item>
        ))}
      </div>
    </section>
  );
}

export function TechStackView({ categories }: { categories: TechCategory[] }) {
  return (
    <div className="flex flex-col gap-10">
      {categories.map((category) => (
        <TechItemGrid key={category.id} category={category} />
      ))}

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{PLANNED_TECH_STACK.title}</h2>
          <Badge variant="secondary" className="font-normal">
            예정
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          아직 이 프로젝트에 포함되어 있지 않지만, 앞으로 도입할 예정입니다.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLANNED_TECH_STACK.items.map((item) => (
            <Item key={item.name} variant="outline" className="border-dashed">
              <ItemContent>
                <ItemTitle>{item.name}</ItemTitle>
                <ItemDescription>{item.description}</ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </div>
      </section>
    </div>
  );
}
