# 부서별 진행업무 관리 v3 고도화 로드맵

v2(F040~F057) 마감과 뒤이은 운영 정리(F058~F060, `docs/roadmap/ROADMAP_V2.md` Phase 8)까지 끝낸 뒤, 사용자가 제품의 화면 표기 자체를 바꾸기로 결정하면서 시작된 로드맵이다.

> **배경**: v2 전체 마감 후 사용자에게 "다음 로드맵을 계획해달라"는 요청을 받아 v1·v2의 "범위 밖 유지" 기록·PRD·`docs/guides/`·Supabase 어드바이저를 실측 재검토해 3건(pg_cron 알림 보존 자동화·PRD 드리프트 정정·미인덱싱 FK 판단)을 제안했고, 사용자가 이를 승인해 `ROADMAP_V2.md` Phase 8(Task 061~063, F058~F060)로 완료했다. 이어서 사용자가 **"주간업무"/"주간업무 일지"라는 화면 표기를 "진행업무"로 바꿔달라**고 요청했고, 조사 결과 접두사 없이 쓰이던 "업무일지" 단독 표현도 같은 개념을 가리켜 함께 리네임하기로 확인받았다(Task 064). 이 리네임이 코드베이스 전반에 걸친 첫 "제품명 변경"이라 v2와는 성격이 달라 별도 문서(v3)로 분리했다.

## Phase 8과의 관계

`ROADMAP_V2.md` Phase 8(Task 061~063, F058~F060)은 v2 마감 이후 첫 ad hoc 확장이지만 문서상으로는 `ROADMAP_V2.md`에 그대로 남아 있다(운영 정리 3건은 v2가 구축한 알림·성능 인프라의 연장이라 v2 문서에 두는 것이 문맥상 자연스럽다는 판단). v3는 **F061부터** 새 문서로 시작하며, F058~F060은 여기서 다시 다루지 않고 `ROADMAP_V2.md`를 참고한다.

## 개발 워크플로우

1. **작업 계획** — 기존 코드베이스를 학습하고 현재 상태를 파악, 새 작업을 포함하도록 이 문서를 갱신
2. **작업 생성** — 고수준 명세서, 관련 파일, 수락 기준 포함
3. **작업 구현** — 명세서를 따라 구현, 화면 텍스트 변경 등 사용자 확인이 필요한 지점은 AskUserQuestion으로 먼저 확인. 각 Task 완료 후 중단하고 추가 지시를 대기
4. **로드맵 업데이트** — 완료된 항목의 체크박스를 채우고 Task 제목에 ✅ 표시

---

## 개발 단계

- **Task 064: 화면 표기 리네임 — "주간업무(일지)" → "진행업무" (F061)** ✅
  - [x] 코드베이스 전수 조사 — `app/`·`components/`·`lib/`·`hooks/`에서 "주간업무"(56곳)와 접두사 없는 "업무일지"(45곳, 같은 개념을 가리키는 것을 사용자 확인 후 포함 확정)를 모두 찾아 목록화. 코드 주석(18곳, `//` 전용 라인)은 화면에 노출되지 않으므로 범위에서 제외
  - [x] 두 단계 치환 규칙 적용 — `주간업무일지`/`업무일지` → `진행업무`, `주간업무`/`주간 업무`(띄어쓰기 포함) → `진행업무`. 코드 식별자(`weekly_logs` 테이블, `/protected/weekly-logs` 라우트, `WeeklyLog*` 타입, `weekly-log-*.tsx` 파일명)는 전혀 변경하지 않음 — CLAUDE.md가 이미 문서화한 "조직→부문, 부서→팀" 화면 표기 리네임과 동일한 원칙(코드 식별자 불변, 화면 텍스트만 변경)
  - [x] 페이지 타이틀·헤더·랜딩 히어로·검색창/탭 aria-label·빈 상태 문구·삭제 확인 다이얼로그·토스트·에러 메시지·대시보드 차트 설명/caption/aria-label·관리자 콘솔 테이블 컬럼("진행업무 수")·PDF/Excel 다운로드 파일명·문서 제목·워크시트 이름·알림 설정 문구·`/tech-stack` 설명까지 전부 적용
  - **관련 파일**: `app/layout.tsx`, `app/page.tsx`, `app/protected/admin/{dashboard,departments,work-types}/page.tsx`, `app/protected/weekly-logs/**`(error·not-found·loading·new/page), `components/{command-palette,dashboard-*-chart,department-*,work-type-*,hero-cta,notification-preferences-field,site-header,site-header-title,user-admin-detail,weekly-log-*}.tsx`, `lib/actions/{weekly-log,weekly-log-reaction,work-type}.ts`, `lib/{format,constants/tech-stack}.ts`, `lib/{pdf/weekly-log-pdf,excel/weekly-log-excel}.ts` — 총 43개 파일
  - **수락 기준**: 화면에 보이는 모든 텍스트(다운로드 파일 내용 포함)가 "진행업무"로 통일되고, 코드 식별자·라우트·DB 스키마는 전혀 바뀌지 않으며, 기존 기능이 회귀 없이 동작한다. **충족 확인.**
  - **테스트 결과** (Playwright MCP 실브라우저 검증, QA 계정 `qa-rename-v3n2k@example.com`을 실제 회원가입 플로우로 생성해 관리자 승격 후 검증, 종료 시 완전 삭제, 65 profiles 기준선 원복 확인):
    - [x] 랜딩 페이지 — 브라우저 탭 타이틀("팀별 진행업무 관리"), 헤더 로고, 히어로 헤드라인, CTA 버튼("진행업무 보러가기"), 기능 카드 15개 전부 "진행업무"로 노출 확인
    - [x] 목록 페이지 — 검색창 aria-label("진행업무 검색"), 뷰 전환 탭 aria-label("진행업무 보기 전환"), 헤더("IT부문 진행업무") 확인
    - [x] 상세 페이지 — Breadcrumb 첫 세그먼트("진행업무"), 삭제 확인 다이얼로그("진행업무를 삭제하시겠습니까?") 확인
    - [x] 관리자 콘솔 — 대시보드 헤더, 팀/업무타입 관리 테이블의 "진행업무 수" 컬럼 확인
    - [x] `/tech-stack` — ExcelJS·jsPDF 설명 문구("진행업무 Excel/PDF 다운로드") 확인
    - [x] PDF 다운로드 실제 생성·파일 열람 — 파일명 `진행업무_전체 팀_20260822.pdf`, 문서 헤더 "진행업무 - 전체 팀", 한글 폰트 정상 렌더링 확인
    - [x] Excel 다운로드 실제 생성·xlsx 내부 XML 검사 — 워크시트 이름 "진행업무", 제목 행 "진행업무 - 전체 팀" 확인
    - [x] 콘솔 에러 0건, `npx tsc --noEmit` 에러 0건, `npm run lint` 신규 경고/에러 0건(기존 3개 에러는 이전부터 있던 `ui/carousel.tsx`/`ui/sidebar.tsx`/`hooks/use-mobile.ts` 사전 존재 항목)
  - **범위 밖 유지(이번 Task 시점)**: `CLAUDE.md`·`README.md`·프로젝트 문서(`docs/` 전반) — "화면에 보이는 텍스트"가 아니라서 제외했으나, Task 065에서 이어서 처리

- **Task 065: 문서 동기화 — CLAUDE.md/README.md 진행업무 리네임 반영 및 v3 로드맵 연결 (F062)** ✅
  - [x] `CLAUDE.md`의 "주간업무(일지)" 서술 10곳을 "진행업무"로 리네임(코드 식별자·백틱으로 감싼 참조는 그대로 유지) — 프로젝트 개요 문단에 v2 Phase 7·8과 v3(F061 리네임)의 존재, 그리고 "화면 텍스트만 바뀌고 코드 식별자는 그대로"라는 원칙을 명시하는 문장 추가
  - [x] `CLAUDE.md`에서 실제 파일 경로와 어긋나 있던 링크 3곳(`docs/ROADMAP_v1.md`→`docs/roadmap/ROADMAP_v1.md` ×2, `docs/PRD.md`→`docs/prd/PRD.md` ×1)을 함께 정정 — 이번 Task로 CLAUDE.md의 같은 문장들을 다시 여는 김에 실측(`ls`)으로 확인한 명백한 오류라 함께 고침
  - [x] `README.md`의 타이틀·부제·기능 목록 10여 곳을 "진행업무"로 리네임, 마감 문단에 v2 Phase 7·8·v3(F061) 요약과 `ROADMAP_v3.md` 링크 추가, "문서" 섹션에 v3 로드맵 링크 신설
  - [x] `README.md`에서도 동일한 경로 오류(`docs/PRD.md`, `docs/ROADMAP_v1.md`) 2곳을 정정
  - [x] `components/site-footer.tsx`에 "고도화 3차 과제" 링크(`docs/roadmap/ROADMAP_v3.md`)를 "고도화 2차 과제" 다음에 신설, 같은 컴포넌트의 기존 경로 오류(`docs/PRD.md`, `docs/ROADMAP_v1.md`) 2곳도 함께 정정 — 실제 GitHub에 존재하지 않는 경로로 연결되던 링크였음
  - **계획과 다르게 처리한 부분**: 이번 Task에서 "고도화 3차 과제" 링크가 가리킬 문서가 아직 없다는 점이 드러나, 이 문서(`ROADMAP_v3.md`) 자체를 신설하는 것으로 사용자에게 먼저 확인받았다(Phase 8을 v2 문서에 남긴 채 v3는 F061부터 새로 시작). 또한 CLAUDE.md·README.md·site-footer.tsx 세 파일 모두에서 `docs/PRD.md`·`docs/ROADMAP_v1.md` 실제 경로 불일치를 추가로 발견해(v2 Task 050이 CLAUDE.md 일부만 고치고 README·footer는 놓쳤던 것으로 보임) 이번 Task 범위에서 함께 정정했다
  - **관련 파일**: `CLAUDE.md`, `README.md`, `components/site-footer.tsx`, `docs/roadmap/ROADMAP_v3.md`(신규)
  - **수락 기준**: CLAUDE.md·README.md가 실제 화면 표기·실제 파일 경로와 모순되지 않고, 푸터의 "고도화 3차 과제" 링크가 유효한 문서로 연결된다. **충족 확인.**
  - **테스트 결과**: `npx tsc --noEmit`/`npm run lint` 클린(코드 변경은 `site-footer.tsx` 링크 3개뿐이라 회귀 위험 낮음), Playwright MCP로 랜딩 페이지 푸터에서 "고도화 3차 과제" 링크가 렌더링되고 `docs/roadmap/ROADMAP_v3.md`(GitHub raw 경로)로 정상 연결됨을 확인. 문서 파일(`CLAUDE.md`/`README.md`) 자체는 실행 코드가 아니므로 별도 브라우저 검증 대상이 아님.

---

## 기능 ID 커버리지 매핑

| 기능 ID | 기능명 | 담당 Task |
|---------|--------|-----------|
| F061 | 화면 표기 리네임 (주간업무→진행업무) | Task 064 |
| F062 | 문서 동기화 (CLAUDE.md/README.md/푸터) | Task 065 |

이전 F-번호(F001~F039는 MVP·v1, F040~F057은 v2, F058~F060은 v2 Phase 8)는 각각 `docs/roadmap/ROADMAP_mvp.md`, `docs/roadmap/ROADMAP_v1.md`, `docs/roadmap/ROADMAP_V2.md`를 참고.
