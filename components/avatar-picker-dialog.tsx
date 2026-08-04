"use client";

import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AVATAR_PRESETS, getAvatarPreset, type AvatarKey } from "@/lib/constants/avatars";
import { cn } from "@/lib/utils";

export function AvatarPickerDialog({
  value,
  onChange,
}: {
  value: AvatarKey;
  onChange: (key: AvatarKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = getAvatarPreset(value);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-3 rounded-md border border-input px-3 py-2 text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Avatar size="lg" className={selected.bgClass}>
            <AvatarFallback className="bg-transparent text-xl">
              {selected.emoji}
            </AvatarFallback>
          </Avatar>
          <span>아바타 변경</span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>아바타 선택</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-3 py-2 sm:grid-cols-6">
          {AVATAR_PRESETS.map((preset) => {
            const isSelected = value === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  onChange(preset.key);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center justify-center rounded-full p-1 outline-none transition-shadow",
                  isSelected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "hover:ring-2 hover:ring-muted-foreground/30 hover:ring-offset-2 hover:ring-offset-background",
                )}
              >
                <Avatar size="lg" className={preset.bgClass}>
                  <AvatarFallback className="bg-transparent text-xl">
                    {preset.emoji}
                  </AvatarFallback>
                </Avatar>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
