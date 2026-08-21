"use client";

import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  FILTER_PRESET_MAX_COUNT,
  useFilterPresets,
  type FilterPresetFilters,
} from "@/hooks/use-filter-presets";

// 목록(weekly-log-list-view.tsx)·칸반(weekly-log-kanban-view.tsx)이 공유하는 필터 프리셋
// UI(F045). 두 화면 모두 normalizeWeeklyLogFilters()로 동일한 파라미터 집합을 쓰므로,
// 저장된 프리셋은 어느 화면에서 만들었든 onApply를 통해 양쪽에 그대로 적용된다.
export function WeeklyLogFilterPresets({
  userId,
  currentFilters,
  onApply,
}: {
  userId: string;
  currentFilters: FilterPresetFilters;
  onApply: (filters: FilterPresetFilters) => void;
}) {
  const { presets, savePreset, deletePreset } = useFilterPresets(userId);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  // 같은 이름 저장 시 덮어쓰기 확인 대상 이름(null이면 확인 다이얼로그 닫힘).
  const [overwriteTarget, setOverwriteTarget] = useState<string | null>(null);

  const commitSave = (name: string) => {
    const result = savePreset(name, currentFilters);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`"${name}" 프리셋을 저장했습니다.`);
    setSaveDialogOpen(false);
    setNameInput("");
    setOverwriteTarget(null);
  };

  const handleSaveClick = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    if (presets.some((preset) => preset.name === trimmed)) {
      setOverwriteTarget(trimmed);
      return;
    }
    commitSave(trimmed);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline">
            프리셋
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem
            onSelect={() => {
              setNameInput("");
              setSaveDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            현재 조건 저장
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {presets.length === 0 ? (
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              저장된 프리셋이 없습니다.
            </DropdownMenuLabel>
          ) : (
            presets.map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                onSelect={() => onApply(preset.filters)}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">{preset.name}</span>
                <button
                  type="button"
                  aria-label={`${preset.name} 프리셋 삭제`}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePreset(preset.id);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>필터 프리셋 저장</DialogTitle>
          </DialogHeader>
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="프리셋 이름"
            maxLength={30}
            aria-label="프리셋 이름"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSaveClick();
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            최대 {FILTER_PRESET_MAX_COUNT}개까지 저장할 수 있습니다.
          </p>
          <DialogFooter>
            <Button type="button" onClick={handleSaveClick} disabled={!nameInput.trim()}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={overwriteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setOverwriteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>기존 프리셋을 덮어쓸까요?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{overwriteTarget}&quot; 이름의 프리셋이 이미 있습니다. 현재 조건으로
              덮어씁니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => overwriteTarget && commitSave(overwriteTarget)}>
              덮어쓰기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
