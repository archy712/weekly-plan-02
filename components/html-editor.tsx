"use client";

import * as React from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Underline,
} from "lucide-react";

import { PROSE_CONTENT_CLASS } from "@/components/html-content";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sanitizeWeeklyLogContent } from "@/lib/sanitize-html";

type ActiveStates = {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isHeading: boolean;
  isBulletList: boolean;
  isOrderedList: boolean;
  isBlockquote: boolean;
  isLink: boolean;
};

function computeActiveStates(editor: Editor): ActiveStates {
  return {
    isBold: editor.isActive("bold"),
    isItalic: editor.isActive("italic"),
    isUnderline: editor.isActive("underline"),
    isHeading: editor.isActive("heading", { level: 3 }),
    isBulletList: editor.isActive("bulletList"),
    isOrderedList: editor.isActive("orderedList"),
    isBlockquote: editor.isActive("blockquote"),
    isLink: editor.isActive("link"),
  };
}

type HtmlEditorHandle = { focus: () => void };

export const HtmlEditor = React.forwardRef<
  HtmlEditorHandle,
  {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    id?: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }
>(function HtmlEditor(
  { value, onChange, onBlur, id, "aria-invalid": ariaInvalid, "aria-describedby": ariaDescribedby },
  forwardedRef,
) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        strike: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(sanitizeWeeklyLogContent(editor.getHTML()));
    },
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class: cn(PROSE_CONTENT_CLASS, "min-h-[220px] px-3 py-2 focus:outline-none"),
        "aria-invalid": ariaInvalid ? "true" : "false",
        ...(ariaDescribedby ? { "aria-describedby": ariaDescribedby } : {}),
      },
    },
  });

  React.useImperativeHandle(forwardedRef, () => ({
    focus: () => editor?.commands.focus(),
  }));

  // useEditorState의 초기 스냅샷이 트랜잭션 발생 전까지 갱신되지 않는 문제가 있어,
  // transaction 이벤트를 직접 구독해 툴바 활성 상태를 계산한다.
  const [activeStates, setActiveStates] = React.useState<ActiveStates | null>(
    () => (editor ? computeActiveStates(editor) : null),
  );

  React.useEffect(() => {
    if (!editor) return;
    const update = () => setActiveStates(computeActiveStates(editor));
    update();
    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);

  const setLink = React.useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL을 입력하세요", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor || !activeStates) {
    return <div className="min-h-[260px] animate-pulse rounded-md border border-input bg-muted/20" />;
  }

  return (
    <div
      className={cn(
        "rounded-md border border-input shadow-xs",
        ariaInvalid && "border-destructive ring-destructive/20",
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-1">
        <ToolbarButton
          label="굵게"
          icon={Bold}
          active={activeStates.isBold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="기울임"
          icon={Italic}
          active={activeStates.isItalic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="밑줄"
          icon={Underline}
          active={activeStates.isUnderline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          label="제목"
          icon={Heading2}
          active={activeStates.isHeading}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <ToolbarButton
          label="글머리 기호 목록"
          icon={List}
          active={activeStates.isBulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="번호 매기기 목록"
          icon={ListOrdered}
          active={activeStates.isOrderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="인용구"
          icon={Quote}
          active={activeStates.isBlockquote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton label="링크" icon={Link2} active={activeStates.isLink} onClick={setLink} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
});

function ToolbarButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
    >
      <Icon className="size-4" />
    </Button>
  );
}
