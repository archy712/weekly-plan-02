import { formatCurrency, formatDate, getStatusLabel } from "@/lib/format";
import { formatImportanceLabel } from "@/lib/constants/importance";
import type { WeeklyLogExportItem } from "@/lib/types";
import type { WeeklyLogImportance } from "@/lib/constants/importance";

const FIXED_ROW_HEIGHT = 25;

const COLUMNS: { header: string; key: string; width: number }[] = [
  { header: "제목", key: "title", width: 32 },
  { header: "팀", key: "department", width: 14 },
  { header: "시작일", key: "start_date", width: 12 },
  { header: "목표종료일", key: "target_end_date", width: 14 },
  { header: "진행상태", key: "status", width: 10 },
  { header: "업무타입", key: "work_type", width: 24 },
  { header: "중요도", key: "importance", width: 12 },
  { header: "예상소요기간(M/M)", key: "estimated_mm", width: 16 },
  { header: "예상소요금액", key: "estimated_cost", width: 14 },
  { header: "협력업체", key: "partner_company", width: 16 },
  { header: "내용", key: "content", width: 60 },
];

function buildFileName(departmentLabel: string): string {
  const safeLabel = departmentLabel.replace(/[\\/:*?"<>|]/g, "_");
  return `주간업무일지_${safeLabel}_${formatDate(new Date()).replace(/-/g, "")}.xlsx`;
}

// weekly_logs.content는 sanitize된 HTML 문자열이라, 스프레드시트 셀에는 태그 없는
// 순수 텍스트만 넣는다(DOMParser는 브라우저 전용 — 이 함수는 클라이언트에서만 호출됨).
function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent?.trim() ?? "";
}

export async function downloadWeeklyLogListExcel({
  items,
  departmentLabel,
  dateRangeLabel,
}: {
  items: WeeklyLogExportItem[];
  departmentLabel: string;
  // PDF와 동일하게, 화면에 적용된 기간 필터를 그대로 시트 상단 안내문으로 전달한다
  // (화면과 다운로드 결과가 항상 일치해야 한다는 MVP Task 013 설계 원칙).
  dateRangeLabel?: string;
}): Promise<void> {
  const ExcelJS = await import("exceljs");

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("주간업무일지");
  worksheet.columns = COLUMNS.map((col) => ({ key: col.key, width: col.width }));

  const printedAt = new Date().toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const titleRow = worksheet.addRow([`주간업무일지 - ${departmentLabel}`]);
  worksheet.mergeCells(titleRow.number, 1, titleRow.number, COLUMNS.length);
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  titleRow.getCell(1).font = { bold: true, size: 14 };

  worksheet.addRow([`출력일시: ${printedAt}`]);
  if (dateRangeLabel) {
    worksheet.addRow([`조회 기간: ${dateRangeLabel}`]);
  }

  const headerRow = worksheet.addRow(COLUMNS.map((col) => col.header));
  headerRow.font = { bold: true };

  for (const item of items) {
    worksheet.addRow({
      title: item.title,
      department: item.department_name,
      start_date: formatDate(item.start_date),
      target_end_date: formatDate(item.target_end_date),
      status: getStatusLabel(item.status),
      work_type: item.work_type.join(", "),
      importance: formatImportanceLabel(item.importance as WeeklyLogImportance),
      estimated_mm: item.estimated_mm != null ? `${item.estimated_mm} M/M` : "-",
      estimated_cost: item.estimated_cost != null ? formatCurrency(item.estimated_cost) : "-",
      partner_company: item.partner_company ?? "-",
      content: htmlToPlainText(item.content),
    });
  }

  // 요구사항: 셀 높이는 헤더/데이터 구분 없이 25로 고정하고, 각 셀은 세로 방향(높이쪽)
  // 가운데 정렬한다. 타이틀 셀은 이미 가로 center도 지정돼 있으므로 기존 alignment를
  // 보존한 채 vertical만 덧씌운다.
  worksheet.eachRow((row) => {
    row.height = FIXED_ROW_HEIGHT;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { ...cell.alignment, vertical: "middle" };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildFileName(departmentLabel);
  link.click();
  URL.revokeObjectURL(url);
}
