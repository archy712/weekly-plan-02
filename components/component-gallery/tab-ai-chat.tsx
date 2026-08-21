"use client";

import { FileText } from "lucide-react";

import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
} from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Marker } from "@/components/ui/marker";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { GallerySection } from "@/components/component-gallery/gallery-section";

export function AiChatTab() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Message, Bubble, Marker, Attachment, MessageScroller는 shadcn/ui 공식 레지스트리에
        포함된 AI 채팅 프리미티브입니다. 챗봇 UI를 만들 때 조합해서 사용합니다.
      </p>

      <GallerySection
        title="Message / Bubble"
        description="채팅 말풍선"
        contentClassName="sm:grid-cols-1"
      >
        <MessageGroup className="max-w-md">
          <Message align="start">
            <MessageAvatar>AI</MessageAvatar>
            <MessageContent>
              <Bubble>
                <BubbleContent>안녕하세요! 무엇을 도와드릴까요?</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
          <Message align="end">
            <MessageContent>
              <Bubble align="end">
                <BubbleContent>갤러리 페이지를 만들어줘.</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
        </MessageGroup>
      </GallerySection>

      <GallerySection
        title="Marker"
        description="채팅 내 메타 정보 구분선"
        contentClassName="sm:grid-cols-1"
      >
        <div className="flex max-w-md flex-col gap-3">
          <Marker variant="separator">오늘</Marker>
          <Marker className="justify-end">오후 3:24 · 읽음</Marker>
        </div>
      </GallerySection>

      <GallerySection title="Attachment" description="파일 첨부 카드" contentClassName="sm:grid-cols-1">
        <AttachmentGroup>
          <Attachment>
            <AttachmentMedia>
              <FileText />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>starter-kit-소개.pdf</AttachmentTitle>
              <AttachmentDescription>1.2MB</AttachmentDescription>
            </AttachmentContent>
          </Attachment>
          <Attachment state="error">
            <AttachmentMedia>
              <FileText />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>업로드 실패</AttachmentTitle>
              <AttachmentDescription>다시 시도해주세요</AttachmentDescription>
            </AttachmentContent>
          </Attachment>
        </AttachmentGroup>
      </GallerySection>

      <GallerySection
        title="Message Scroller"
        description="자동 스크롤/하단 이동 버튼이 있는 채팅 스크롤 영역"
        contentClassName="sm:grid-cols-1"
      >
        <MessageScrollerProvider>
          <MessageScroller className="h-56 max-w-md rounded-lg border">
            <MessageScrollerViewport>
              <MessageScrollerContent>
                {Array.from({ length: 8 }).map((_, index) => (
                  <MessageScrollerItem key={index}>
                    <Bubble>
                      <BubbleContent>메시지 {index + 1}</BubbleContent>
                    </Bubble>
                  </MessageScrollerItem>
                ))}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      </GallerySection>
    </div>
  );
}
