"use client";

import { Bold, Italic, Underline } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { GallerySection } from "@/components/component-gallery/gallery-section";

export function ButtonsBadgesTab() {
  return (
    <div className="flex flex-col gap-6">
      <GallerySection title="Button" description="버튼 variant와 상태" contentClassName="sm:grid-cols-1">
        <div className="flex flex-wrap gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
        </div>
      </GallerySection>

      <GallerySection
        title="Button Group"
        description="버튼을 하나로 묶어 표시"
        contentClassName="sm:grid-cols-1"
      >
        <div className="flex flex-wrap items-center gap-4">
          <ButtonGroup>
            <Button variant="outline">왼쪽</Button>
            <Button variant="outline">가운데</Button>
            <Button variant="outline">오른쪽</Button>
          </ButtonGroup>
          <ButtonGroup>
            <ButtonGroupText>https://</ButtonGroupText>
            <Button variant="outline">example.com</Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button variant="outline" size="icon">
              <Bold />
            </Button>
            <Button variant="outline" size="icon">
              <Italic />
            </Button>
          </ButtonGroup>
        </div>
      </GallerySection>

      <GallerySection
        title="Toggle / Toggle Group"
        description="눌림 상태를 전환하는 버튼"
        contentClassName="sm:grid-cols-1"
      >
        <div className="flex flex-wrap items-center gap-4">
          <Toggle aria-label="굵게">굵게</Toggle>
          <ToggleGroup type="multiple" variant="outline">
            <ToggleGroupItem value="bold" aria-label="굵게">
              <Bold />
            </ToggleGroupItem>
            <ToggleGroupItem value="italic" aria-label="기울임">
              <Italic />
            </ToggleGroupItem>
            <ToggleGroupItem value="underline" aria-label="밑줄">
              <Underline />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </GallerySection>

      <GallerySection title="Badge" description="상태 표시용 배지" contentClassName="sm:grid-cols-1">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </GallerySection>

      <GallerySection title="Kbd" description="키보드 단축키 표시" contentClassName="sm:grid-cols-1">
        <div className="flex flex-wrap items-center gap-4">
          <Kbd>Esc</Kbd>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </div>
      </GallerySection>
    </div>
  );
}
