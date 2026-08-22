"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { NONE_SELECT_VALUE } from "@/lib/constants/select";
import type { HeadCandidate } from "@/lib/types";

type HeadOption = { value: string; label: string };

type HeadProfileComboboxProps = {
  candidates: HeadCandidate[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

// 부문장·부서장·팀장 지정 Select(organization/division/department-form-dialog)가 공유하는
// 검색형 선택 컴포넌트. 후보가 많아지면 스크롤로 다 훑어야 했던 문제(사용자 피드백)를
// 이름/이메일 검색으로 해결한다. "지정 안 함"(NONE_SELECT_VALUE)도 일반 후보와 동일하게
// 검색·선택 가능한 옵션 하나로 포함시킨다.
export function HeadProfileCombobox({
  candidates,
  value,
  onChange,
  placeholder = "이름 또는 이메일로 검색",
}: HeadProfileComboboxProps) {
  const options: HeadOption[] = [
    { value: NONE_SELECT_VALUE, label: "지정 안 함" },
    ...candidates.map((candidate) => ({
      value: candidate.id,
      label: candidate.name ?? candidate.email ?? "이름 미등록",
    })),
  ];
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(next) => onChange(next?.value ?? NONE_SELECT_VALUE)}
    >
      <ComboboxInput placeholder={placeholder} />
      {/* 관리자 콘솔 다이얼로그 안에서는 이 필드가 폼의 마지막 줄 근처라 아래쪽 공간이
          부족하면 목록이 위로 뒤집혀 열려 다이얼로그 제목까지 덮어버리는 문제가 실측됨
          (side를 고정하지 않으면 base-ui가 공간이 더 넓은 쪽으로 자동 flip). collisionAvoidance
          side="none"으로 항상 입력창 아래에서 열리게 고정 — 내부 목록은 이미 스크롤 가능하므로
          공간이 좁아도 잘려 보이지 않는다. */}
      <ComboboxContent collisionAvoidance={{ side: "none" }}>
        <ComboboxEmpty>검색 결과가 없습니다.</ComboboxEmpty>
        <ComboboxList>
          {(option: HeadOption) => (
            <ComboboxItem key={option.value} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
