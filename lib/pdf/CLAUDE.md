# lib/pdf

`weekly-log-pdf.ts`가 jsPDF + jspdf-autotable로 **클라이언트 사이드**에서 PDF를 생성합니다. jsPDF 기본 폰트가 한글을 지원하지 않아 `/public/fonts/NotoSansKR-Regular.ttf`를 런타임에 fetch해 base64로 임베딩하며, 폰트 용량(~2.5MB) 때문에 `String.fromCharCode`를 청크 단위로 호출해 콜스택 초과를 피합니다. 이 변환 로직은 그대로 유지할 것.
