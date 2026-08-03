import { formatDate, getCompletionLabel } from "@/lib/format";
import type { WeeklyLogListItem } from "@/lib/types";

const KOREAN_FONT_URL = "/fonts/NotoSansKR-Regular.ttf";
const KOREAN_FONT_VFS_NAME = "NotoSansKR-Regular.ttf";
const KOREAN_FONT_NAME = "NotoSansKR";

// jsPDF는 base64 문자열로 폰트를 받는다. Uint8Array를 그대로 String.fromCharCode(...bytes)에
// 넘기면 폰트 크기(약 2.5MB)에서 콜스택을 초과하므로 청크 단위로 변환한다.
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function fetchKoreanFontBase64(): Promise<string> {
  const response = await fetch(KOREAN_FONT_URL);
  if (!response.ok) {
    throw new Error("한글 폰트를 불러오지 못했습니다.");
  }
  const buffer = await response.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

function buildFileName(departmentLabel: string): string {
  const safeLabel = departmentLabel.replace(/[\\/:*?"<>|]/g, "_");
  return `주간업무일지_${safeLabel}_${formatDate(new Date()).replace(/-/g, "")}.pdf`;
}

export async function downloadWeeklyLogListPdf({
  items,
  departmentLabel,
}: {
  items: WeeklyLogListItem[];
  departmentLabel: string;
}): Promise<void> {
  const [{ default: JsPDF }, { default: autoTable }, fontBase64] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    fetchKoreanFontBase64(),
  ]);

  const doc = new JsPDF();
  doc.addFileToVFS(KOREAN_FONT_VFS_NAME, fontBase64);
  doc.addFont(KOREAN_FONT_VFS_NAME, KOREAN_FONT_NAME, "normal");
  doc.setFont(KOREAN_FONT_NAME);

  const printedAt = new Date().toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  doc.setFontSize(14);
  doc.text(`주간업무일지 - ${departmentLabel}`, 14, 18);
  doc.setFontSize(10);
  doc.text(`출력일시: ${printedAt}`, 14, 25);

  const body =
    items.length === 0
      ? [
          [
            {
              content: "표시할 데이터가 없습니다",
              colSpan: 4,
              styles: { halign: "center" as const },
            },
          ],
        ]
      : items.map((item) => [
          item.title,
          formatDate(item.start_date),
          formatDate(item.target_end_date),
          getCompletionLabel(item.is_completed),
        ]);

  // 한글 폰트는 normal 스타일만 등록했으므로, autoTable 기본값인 head bold를 그대로 두면
  // jsPDF가 폰트를 찾지 못해 기본 폰트(Helvetica)로 되돌아가 한글이 깨진다.
  autoTable(doc, {
    startY: 30,
    head: [["제목", "시작일", "목표종료일", "완료상태"]],
    body,
    styles: { font: KOREAN_FONT_NAME, fontStyle: "normal" },
    headStyles: { font: KOREAN_FONT_NAME, fontStyle: "normal" },
  });

  doc.save(buildFileName(departmentLabel));
}
