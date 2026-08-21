"use client";

import type { ComponentType } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GALLERY_TABS } from "@/lib/constants/component-gallery";
import { ButtonsBadgesTab } from "@/components/component-gallery/tab-buttons-badges";
import { FormInputsTab } from "@/components/component-gallery/tab-form-inputs";
import { OverlaysMenusTab } from "@/components/component-gallery/tab-overlays-menus";
import { NavigationTab } from "@/components/component-gallery/tab-navigation";
import { LayoutTab } from "@/components/component-gallery/tab-layout";
import { FeedbackTab } from "@/components/component-gallery/tab-feedback";
import { DataDisplayTab } from "@/components/component-gallery/tab-data-display";
import { ChartsTab } from "@/components/component-gallery/tab-charts";
import { AiChatTab } from "@/components/component-gallery/tab-ai-chat";
import { ExtendedTab } from "@/components/component-gallery/tab-extended";

const TAB_CONTENT: Record<string, ComponentType> = {
  "buttons-badges": ButtonsBadgesTab,
  "form-inputs": FormInputsTab,
  "overlays-menus": OverlaysMenusTab,
  navigation: NavigationTab,
  layout: LayoutTab,
  feedback: FeedbackTab,
  "data-display": DataDisplayTab,
  charts: ChartsTab,
  "ai-chat": AiChatTab,
  extended: ExtendedTab,
};

export function ComponentGalleryView() {
  return (
    <Tabs defaultValue={GALLERY_TABS[0].id} className="flex flex-col gap-6">
      <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-muted p-1">
        {GALLERY_TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {GALLERY_TABS.map((tab) => {
        const TabContent = TAB_CONTENT[tab.id];
        return (
          <TabsContent key={tab.id} value={tab.id}>
            <TabContent />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
