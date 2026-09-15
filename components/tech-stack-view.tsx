import { Item, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import type { TechCategory } from "@/lib/constants/tech-stack";

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
    </div>
  );
}
