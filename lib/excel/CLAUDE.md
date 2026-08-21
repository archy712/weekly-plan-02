# lib/excel

`weekly-log-excel.ts`가 `exceljs`로 **클라이언트 사이드**에서 Excel(.xlsx)을 생성합니다(제목/부서/시작일/목표종료일/진행상태/업무타입/중요도/예상소요기간·금액/협력업체/내용 컬럼). `weekly_logs.content`는 sanitize된 HTML 문자열이라 `DOMParser`(브라우저 전용 API)로 plain text만 추출해 셀에 넣습니다. `exceljs`는 번들 크기가 있어 클릭 시점에 `await import("exceljs")`로 동적 로딩합니다.
