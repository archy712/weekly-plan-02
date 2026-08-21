"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { GallerySection, DemoField } from "@/components/component-gallery/gallery-section";

const FRAMEWORKS = [
  { value: "next", label: "Next.js" },
  { value: "sveltekit", label: "SvelteKit" },
  { value: "nuxt", label: "Nuxt.js" },
  { value: "remix", label: "Remix" },
  { value: "astro", label: "Astro" },
];

export function FormInputsTab() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [marketingOptIn, setMarketingOptIn] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      <GallerySection title="기본 입력" description="Input, Textarea, Label, Input Group">
        <DemoField label="Input">
          <Input type="email" placeholder="m@example.com" />
        </DemoField>
        <DemoField label="Textarea">
          <Textarea placeholder="메시지를 입력하세요" />
        </DemoField>
        <DemoField label="Input Group">
          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput placeholder="검색어를 입력하세요" />
          </InputGroup>
        </DemoField>
        <DemoField label="Input Group (텍스트 addon)">
          <InputGroup>
            <InputGroupInput placeholder="0.00" />
            <InputGroupAddon align="inline-end">
              <InputGroupText>KRW</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </DemoField>
      </GallerySection>

      <GallerySection
        title="선택 입력"
        description="Checkbox, RadioGroup, Select, NativeSelect, Switch, Slider"
      >
        <div className="flex items-center gap-2">
          <Checkbox id="gallery-checkbox" />
          <Label htmlFor="gallery-checkbox">Checkbox</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="gallery-switch" />
          <Label htmlFor="gallery-switch">Switch</Label>
        </div>
        <DemoField label="Radio Group">
          <RadioGroup defaultValue="light" className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="light" id="gallery-radio-light" />
              <Label htmlFor="gallery-radio-light">Light</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="dark" id="gallery-radio-dark" />
              <Label htmlFor="gallery-radio-dark">Dark</Label>
            </div>
          </RadioGroup>
        </DemoField>
        <DemoField label="Select">
          <Select defaultValue="next">
            <SelectTrigger>
              <SelectValue placeholder="선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {FRAMEWORKS.map((framework) => (
                <SelectItem key={framework.value} value={framework.value}>
                  {framework.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DemoField>
        <DemoField label="Native Select">
          <NativeSelect defaultValue="next">
            <NativeSelectOption value="next">Next.js</NativeSelectOption>
            <NativeSelectOption value="remix">Remix</NativeSelectOption>
            <NativeSelectOption value="astro">Astro</NativeSelectOption>
          </NativeSelect>
        </DemoField>
        <DemoField label="Slider" className="sm:col-span-2">
          <Slider defaultValue={[60]} max={100} step={1} />
        </DemoField>
      </GallerySection>

      <GallerySection
        title="Combobox"
        description="base-ui 기반 자동완성 콤보박스"
        contentClassName="sm:grid-cols-1"
      >
        <Combobox items={FRAMEWORKS}>
          <ComboboxInput placeholder="프레임워크 검색..." />
          <ComboboxContent>
            <ComboboxEmpty>검색 결과가 없습니다.</ComboboxEmpty>
            <ComboboxList>
              {(item: (typeof FRAMEWORKS)[number]) => (
                <ComboboxItem key={item.value} value={item}>
                  {item.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </GallerySection>

      <GallerySection
        title="Input OTP"
        description="일회용 인증번호 입력"
        contentClassName="sm:grid-cols-1"
      >
        <InputOTP maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </GallerySection>

      <GallerySection title="Calendar" description="날짜 선택" contentClassName="sm:grid-cols-1">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="w-fit rounded-md border p-2"
        />
      </GallerySection>

      <GallerySection
        title="Field"
        description="폼 레이아웃을 위한 Field / FieldSet 컴포지션"
        contentClassName="sm:grid-cols-1"
      >
        <div className="flex max-w-sm flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="gallery-field-card-number">카드 번호</FieldLabel>
            <FieldContent>
              <Input id="gallery-field-card-number" placeholder="0000 0000 0000 0000" />
              <FieldDescription>카드 앞면에 표시된 번호를 입력하세요.</FieldDescription>
            </FieldContent>
          </Field>
          <FieldLabel htmlFor="gallery-field-marketing">
            <Field orientation="horizontal">
              <FieldContent>마케팅 정보 수신에 동의합니다</FieldContent>
              <Checkbox
                id="gallery-field-marketing"
                checked={marketingOptIn}
                onCheckedChange={(checked) => setMarketingOptIn(checked === true)}
              />
            </Field>
          </FieldLabel>
        </div>
      </GallerySection>
    </div>
  );
}
