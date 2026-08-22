# 코드 리뷰 대응 로드맵

2026-08-22, `code-reviewer` 에이전트로 저장소 전체(`app/`, `components/`, `lib/`, `hooks/`)를 대상으로 수행한 전수 코드 리뷰의 발견 사항을 대응 작업으로 정리한 문서다. v3(`docs/roadmap/ROADMAP_v3.md`)의 Task 번호를 이어받아 Task 066부터 시작한다.

> **배경**: 사용자가 "전체 소스코드를 리뷰해 줘"라고 명시적으로 요청해, 평소 "최근 변경분만" 보는 관례에서 벗어나 저장소 전체를 두 갈래(① 보안 핵심·서버 액션·진행업무·인증·댓글/알림/리액션, ② 관리자 콘솔·조직/부서/부문 범위 제한)로 나눠 검토했다. 이 문서는 새 기능(F-번호) 추가가 아니라 **기존 코드의 결함 수정**을 다루므로 v1~v3와 달리 기능 ID 매핑 테이블을 두지 않는다.

## 개발 워크플로우

1. **치명적 → 중요 → 사소** 순으로 착수한다. 치명적 4건은 보안·정보 노출과 직결되므로 다른 작업보다 우선한다.
2. 각 Task는 리뷰에서 제시된 개선 방향을 그대로 적용하되, 실제 구현 중 CLAUDE.md에 문서화된 기존 컨벤션(부서/조직 스코프, `requireAdmin()` 재호출 패턴 등)과 충돌이 발견되면 AskUserQuestion으로 먼저 확인한다.
3. 각 Task 완료 후 관련 화면을 Playwright MCP 등으로 실측 검증하고, 체크박스를 채우고 제목에 ✅ 표시한다.

---

## Phase 1: 치명적 (보안·정보 노출)

- [x] **Task 066: 오픈 리다이렉트 수정 — Google OAuth 콜백 (`app/auth/callback/route.ts`)** ✅
  - `next` 쿼리 파라미터를 검증 없이 `` `${origin}${next}` ``에 이어붙여, `next=@evil.com/`처럼 `@`로 시작하는 값을 주면 브라우저가 userinfo 트릭으로 `evil.com`을 실제 host로 해석한다. 구글 OAuth 콜백 링크에 조작된 `next`를 심어 피싱에 악용 가능.
  - **관련 파일**: `app/auth/callback/route.ts:9, 15`
  - **수락 기준**: `next`가 `/`로 시작하고 `//`로 시작하지 않는 내부 상대 경로일 때만 리다이렉트에 사용하고, 아니면 안전한 기본값(`/protected`)으로 폴백한다. 악의적 `next` 값으로 외부 도메인 리다이렉트가 재현되지 않음을 확인한다.

- [x] **Task 067: 오픈 리다이렉트 수정 — 이메일 인증 콜백 (`app/auth/confirm/route.ts`)** ✅
  - `origin`조차 붙이지 않고 `next`를 `redirect()`에 그대로 넘겨, `next`가 완전한 절대 URL(`https://phishing-site.com`)이면 검증 없이 그대로 이동한다. 이메일 인증/OTP 링크에 악성 `next`를 심는 전형적 오픈 리다이렉트로 Task 066보다 더 직접적이다.
  - **관련 파일**: `app/auth/confirm/route.ts:10, 21`
  - **수락 기준**: Task 066과 동일한 내부 상대 경로 검증을 적용한다. 절대 URL이나 프로토콜 상대 URL(`//evil.com`)이 거부됨을 확인한다.

- [x] **Task 068: 첨부파일 등록 시 진행업무 소속 부서 재검증 추가 (`lib/actions/weekly-log-attachments.ts`)** ✅
  - `weekly_log_attachments_insert_own_department_or_admin` RLS는 `department_id = current_department_id() AND uploaded_by = auth.uid()`만 검사하고, 넘겨받은 `weekly_log_id`가 실제로 그 부서 소속 로그인지는 검사하지 않는다(FK 존재 여부만 보장). 서버 액션(`createWeeklyLogAttachmentAction`)도 이를 대조하지 않는다.
  - **공격 시나리오**: 공격자가 자기 부서 storage 폴더에 파일을 올린 뒤(storage RLS는 최상위 폴더만 검사), 임의의 다른 부서 `weeklyLogId`로 액션을 직접 호출하면 권한 없는 타 부서 진행업무 상세 페이지에 파일이 첨부되고, `weekly_logs`가 전 사용자 SELECT 공개라 그대로 노출된다.
  - **관련 파일**: `lib/actions/weekly-log-attachments.ts:23-57`(`createWeeklyLogAttachmentAction`)
  - **수락 기준**: 액션 내부에서 `weekly_log_id`로 `weekly_logs.department_id`를 조회해 호출자 부서(또는 `is_admin()`)와 일치하는지 재검증한 뒤에만 insert를 수행한다. 다른 부서 `weeklyLogId`로 호출 시 거부됨을 확인한다. Task 069(`filePath` 검증)와 함께 처리하는 것을 권장.

- [x] **Task 069: 사용자 상세 페이지 조직 범위 검증 추가 (`app/protected/admin/users/[id]/page.tsx`)** ✅
  - 관리자 콘솔의 다른 모든 화면(대시보드·부서·업무타입·조직 관리·사용자 목록)은 `requireAdmin()`을 재호출해 `organizationId`로 쿼리를 좁히지만, 이 페이지만 `requireAdmin()`을 호출하지 않고 `getClaims()`로 `currentUserId`만 얻는다. `profiles` RLS(`profiles_select_own_or_admin`)의 `is_admin()`은 조직과 무관하게 `role in ('admin','superadmin')`이면 전체 행을 허용하므로, 이 앱의 조직 격리는 RLS가 아니라 콘솔 페이지의 쿼리 레벨 스코핑에 전적으로 의존한다(CLAUDE.md 명시).
  - **결과**: 자기 조직 소속 관리자가 다른 조직 사용자의 UUID만 알면 이름·이메일·전화번호·자기소개·역할·소속팀·최근 작성 진행업무 요약을 그대로 볼 수 있다. "소속 팀 변경" select용 `departments` 쿼리(101-106행)도 `organization_id` 필터가 없어 전 조직의 팀 목록이 그대로 클라이언트에 내려간다.
  - **관련 파일**: `app/protected/admin/users/[id]/page.tsx:16-119`
  - **수락 기준**: `requireAdmin()`을 호출해 `organizationId`/`role`을 얻고, 슈퍼관리자가 아니면 대상 사용자의 소속 부서가 그 조직에 속하는지 확인해 불일치 시 `notFound()` 처리한다. "소속 팀 변경" select의 `departments` 조회도 조직 필터(슈퍼관리자는 전체)를 적용한다. 다른 조직 사용자 UUID로 직접 접근 시 404가 됨을 확인한다. 쓰기 경로(`updateUserDepartmentAction`)는 이미 `isDepartmentAccessible()`로 재검증되므로 변경 불필요.

---

## Phase 2: 중요

- [x] **Task 070: 비밀번호 재설정 후 하드 네비게이션으로 전환 (`components/update-password-form.tsx`)** ✅
  - CLAUDE.md 컨벤션(로그인/로그아웃 성공 후 `router.push`가 아니라 `window.location.href` 하드 네비게이션)에서 벗어나 있다. 세션 갱신 직후 `/protected` 진입 시 클라이언트 라우터 캐시에 남은 이전 세션의 리다이렉트 결과 때문에 부서 미설정 분기 등이 최신 상태를 반영하지 못할 수 있다.
  - **관련 파일**: `components/update-password-form.tsx:37`
  - **수락 기준**: `login-form.tsx`/`logout-button.tsx`/`profile-form.tsx`와 동일하게 `window.location.href = "/protected"`로 변경한다.

- [x] **Task 071: 첨부파일 `filePath` 서버 검증 추가 (`lib/actions/weekly-log-attachments.ts`)** ✅
  - `filePath`가 실제로 방금 업로드된 storage 객체를 가리키는지 서버가 검증하지 않는다. Task 068과 결합하면 임의 문자열을 `file_path`로 등록해 "깨진 첨부파일" 메타데이터를 만들 수 있다.
  - **관련 파일**: `lib/actions/weekly-log-attachments.ts:37-49`
  - **수락 기준**: Task 068과 함께 검토해, `filePath`가 기대하는 경로 패턴(`{department_id}/{weekly_log_id}/{uuid}-{파일명}`)과 일치하는지 또는 storage 객체 존재 여부를 확인한 뒤 insert하도록 보완한다.

- [x] **Task 072: `sanitize-html.ts`의 SSR 스킵 계약 명시 또는 방어적 sanitize (`lib/sanitize-html.ts`)** ✅
  - `sanitizeWeeklyLogContent()`는 `isBrowser`가 false(SSR)면 sanitize 없이 원본 HTML을 그대로 반환한다. "저장 시점에 이미 서버에서 sanitize됐다"는 암묵적 전제 위에 성립하며, 현재 호출부(`html-editor.tsx`/`html-content.tsx`)는 이 전제를 지키고 있지만 문서화되어 있지 않다.
  - **관련 파일**: `lib/sanitize-html.ts:38-43`
  - **수락 기준**: 함수 주석에 "DB에서 읽어온 이미 sanitize된 값에만 안전, 신뢰할 수 없는 원본 HTML을 SSR 중 이 함수에 직접 넘기지 말 것"이라는 계약을 명시하거나, 서버 환경에서도 무조건 sanitize하도록(예: `isomorphic-dompurify`의 서버용 JSDOM 경로 사용) 방어적으로 변경한다. 어느 쪽을 택할지는 성능 영향을 검토해 결정한다.

- [x] **Task 073: 관리자 대시보드 `departmentParam` 범위 검증 추가 (`app/protected/admin/dashboard/page.tsx`)** ✅
  - 같은 페이지에서 `orgParam`/`divisionParam`은 조회된(조직 범위로 스코프된) 배열에 대해 `.some(...)`으로 존재 여부를 검증한 뒤 채택하고 아니면 안전한 기본값으로 폴백하지만, `departmentParam`만 이 패턴 없이 곧바로 `departmentId`로 쓰인다. 현재는 RPC 호출 시 `org_id`와 AND 조건으로 걸려 결과가 0건이 될 뿐 실유출은 없어 보이나, RPC 시그니처가 바뀌면 조용히 조직 간 데이터 유출로 발전할 수 있는 취약 지점이다.
  - **관련 파일**: `app/protected/admin/dashboard/page.tsx:102-104`
  - **수락 기준**: `divisionParam`과 동일하게 `departments.some((d) => d.id === departmentParam)` 검증을 추가해, 존재하지 않거나 범위 밖인 값은 `ALL_DEPARTMENTS_FILTER`로 폴백하도록 한다.

---

## Phase 3: 사소

- [x] **Task 074: 진행업무 서버 액션의 `id` 파라미터 UUID 검증 일관화 (`lib/actions/weekly-log.ts`)** ✅
  - `updateWeeklyLogAction`, `updateWeeklyLogWorkTypeAction`, `updateWeeklyLogImportanceAction`, `updateWeeklyLogProgressAction`, `deleteWeeklyLogAction`, `updateWeeklyLogStatusAction`이 `id`에 `z.string().uuid()` 검증을 하지 않는다(`toggleWeeklyLogReactionAction`만 검증). Postgres가 예외로 걸러주긴 하나 파일 내 일관성이 떨어진다.
  - **관련 파일**: `lib/actions/weekly-log.ts`
  - **수락 기준**: 위 액션들의 Zod 스키마에 `id: z.string().uuid()` 검증을 통일 적용한다.

- [x] **Task 075: `requireLoggedIn` 네이밍 재검토 (`lib/actions/department.ts`/`division.ts`/`organization.ts`/`work-type.ts`)** ✅
  - 이름과 달리 관리자 권한을 확인하지 않고 RLS에 위임하는 함수다(설계 의도이자 실제로 안전함). 다만 네이밍이 "로그인만 확인하고 권한은 RLS가 막는다"는 실제 동작과 다르게 읽혀 오해 소지가 있다.
  - **관련 파일**: `lib/actions/department.ts`, `lib/actions/division.ts`, `lib/actions/organization.ts`, `lib/actions/work-type.ts`
  - **수락 기준**: 함수명을 `requireLoggedInAndDelegateToRls` 등으로 바꾸거나, 최소한 "권한 검사는 RLS에 위임하며 이 함수는 로그인 여부만 확인한다"는 주석을 추가한다. 동작 자체는 변경하지 않는다.

- [x] **Task 076: "지연" 판정 기준 화면 간 불일치 정리** ✅
  - 칸반(`weekly-log-kanban-column.tsx`)·타임라인(`weekly-log-timeline-view.tsx`)·"내 업무" 위젯은 `status ≠ completed && target_end_date < today`(마감일 기준)로 3곳이 일치하지만, 상세 페이지(`weekly-log-detail-view.tsx:291, 367`)의 "지연" 배지는 **진척률이 목표 진척률에 못 미치는지**(전혀 다른 기준)로 판정한다. 같은 "지연" 라벨을 써서 화면 간 모순으로 보일 수 있다.
  - **관련 파일**: `components/weekly-log-detail-view.tsx:291, 367`, `components/weekly-log-kanban-column.tsx`, `components/weekly-log-timeline-view.tsx`, `components/my-work-summary-widget.tsx`
  - **수락 기준**: 상세 페이지 배지의 라벨을 "진척 부진" 등으로 구분해 마감일 기준 "지연"과 혼동되지 않게 하거나, 사용자 확인 후 두 기준 중 하나로 통일한다(AskUserQuestion으로 방향 확인).

- [x] **Task 077: 댓글 헤더 카운트를 소프트 삭제 제외 기준으로 통일 (`components/weekly-log-comment-section.tsx`)** ✅
  - "댓글 N개" 헤더가 소프트 삭제된 댓글까지 포함해 카운트하는데, 목록 페이지의 `comment_count`는 `deleted_at is null`인 것만 센다. 같은 개념의 숫자가 화면마다 다르게 보인다.
  - **관련 파일**: `components/weekly-log-comment-section.tsx:386`
  - **수락 기준**: 상세 페이지 헤더 카운트도 `deleted_at is null`인 댓글만 세도록 통일한다.

- [x] **Task 078: `NavUser` 타입 중복 정의 제거 (`components/header-nav.tsx`/`components/mobile-nav.tsx`)** ✅
  - 동일한 `NavUser` 타입이 두 파일에 중복 정의되어 있다.
  - **관련 파일**: `components/header-nav.tsx`, `components/mobile-nav.tsx`
  - **수락 기준**: `lib/types` 등 공유 위치로 이동해 두 컴포넌트가 import해서 쓰도록 정리한다.

- [x] **Task 079: 댓글 입력창 `maxLength` 클라이언트 힌트 추가** ✅
  - 서버 2000자 제한은 제출 시점에만 걸려, 사용자가 미리 글자 수 초과를 인지하지 못한다.
  - **관련 파일**: `components/weekly-log-comment-section.tsx`(또는 `mention-input.tsx`)
  - **수락 기준**: 입력창에 `maxLength={2000}` 또는 글자 수 카운터 UI를 추가해 제출 전 초과 여부를 인지할 수 있게 한다.

---

## Phase 4: 나머지 범위 리뷰(lib/queries·PDF/Excel·localStorage·format) — 2026-08-22 추가

Task 066~079 완료 후 사용자가 "코드리뷰를 진행하지 않은 쪽도 진행해달라"고 요청해, 1차 리뷰가 다루지 않은 `lib/queries/*`(데이터 조회 계층)·`lib/pdf/`·`lib/excel/`·`lib/storage/local-storage.ts`·`lib/format.ts`·`lib/constants/*`·`components/ui/`·`components/component-gallery/`와 루트 설정 파일(`proxy.ts`, `next.config.ts` 등)을 추가로 검토했다. 루트 설정 파일은 직접 확인해 특이사항이 없었고(데드코드 수준의 `!pathname.startsWith("/login")` 조건 제외, 무해해 별도 Task로 두지 않음), 나머지는 `code-reviewer` 에이전트로 검토해 중요 2건·사소 4건을 발견했다.

- [x] **Task 080: 소프트 삭제된 댓글 원문을 조회 계층에서 마스킹 (`lib/queries/comments.ts`)** ✅
  - `getWeeklyLogComments()`는 `deleted_at`이 채워진 행도 `content`·멘션을 그대로 매핑해 반환한다. `deleteCommentAction`(`lib/actions/weekly-log-comment.ts:148`)은 `deleted_at`만 UPDATE할 뿐 `content`를 지우지 않고, UI는 "삭제된 댓글입니다" placeholder로 렌더링만 할 뿐 원문은 이미 네트워크 응답에 실려 브라우저에 도착해 있다.
  - **영향**: 다른 로그인 사용자가 개발자 도구의 Network 탭/React DevTools로 삭제된 댓글의 원문을 그대로 열람할 수 있다. "삭제"라는 사용자 기대와 실제 동작이 어긋난다.
  - **관련 파일**: `lib/queries/comments.ts:60-83`
  - **수락 기준**: `getWeeklyLogComments()`가 `deleted_at`이 있는 행에 한해 `content`를 빈 문자열로, `mentions`를 빈 배열로 치환해 반환한다. DB의 `content` 컬럼 자체는 감사 목적으로 그대로 둔다(조회 계층에서만 마스킹). 소프트 삭제된 댓글을 열람해도 원문이 응답에 포함되지 않음을 확인한다.

- [x] **Task 081: `department`/`author` 필터 파라미터 UUID 형식 검증 추가 (`lib/queries/weekly-logs.ts`, `lib/queries/user-admin.ts`)** ✅
  - `normalizeWeeklyLogFilters()`/`normalizeUserAdminFilters()`는 "존재하지 않는 id는 0건으로 폴백된다"고 가정하지만, 이는 문법적으로 유효한 UUID에만 성립한다. `?department=xxx`처럼 UUID 형식 자체가 아닌 값을 넘기면 Postgrest가 `22P02`(invalid input syntax) 에러를 던지고 `if (error) throw error`가 그대로 전파돼 Server Component가 500으로 죽는다.
  - **관련 파일**: `lib/queries/weekly-logs.ts:52-85`(`normalizeWeeklyLogFilters`), `lib/queries/user-admin.ts:52-66,81-98`(`normalizeUserAdminFilters`/`applyUserFilters`)
  - **수락 기준**: `status`/`from`/`to`와 동일하게 `department`/`author`에 `z.string().uuid()` 검증을 추가해, 형식이 올바르지 않으면 각각 `ALL_DEPARTMENTS_FILTER`/`undefined`로 폴백한다(`department`가 `ALL_DEPARTMENTS_FILTER` 같은 sentinel일 수 있으므로 sentinel 비교를 UUID 검증보다 먼저 수행). `?department=not-a-uuid`로 접근해도 500 대신 정상적으로 "전체" 상태로 폴백됨을 확인한다. 재발 방지를 위해 두 정규화 함수 상단에 "UUID 컬럼과 직접 `.eq()`되는 필터는 반드시 `z.string().uuid()`로 정규화할 것"이라는 주석을 남긴다.

- [x] **Task 082: CLAUDE.md의 `lib/dummy-log-overrides.ts` 참조 정정 (문서 드리프트)** ✅
  - CLAUDE.md "브라우저 저장소(localStorage, v2 ad hoc)" 절이 "`lib/dummy-log-overrides.ts`와 동일 패턴"이라고 `useSyncExternalStore` 사용을 설명하는데, 이 파일은 저장소에 실재하지 않는다(`git log` 확인 결과 초기 MVP 더미데이터 시절 이후 삭제된 것으로 추정).
  - **관련 파일**: `CLAUDE.md`(브라우저 저장소 절)
  - **수락 기준**: 실제로 `useSyncExternalStore`를 쓰는 참조처(작성 중 임시저장 배너, `hasDraft`/`savedAt` 훅 등)를 찾아 그 경로로 바로잡거나, 적절한 대체 참조가 없으면 이 문구를 제거한다.

- [x] **Task 083: Excel 다운로드 formula-injection 방어 검토 (`lib/excel/weekly-log-excel.ts`)** ✅
  - `title`/`department_name`/`partner_company`/`content` 등 사용자 입력이 셀 값으로 그대로 들어간다. 사용자가 `=HYPERLINK(...)`처럼 `=`/`+`/`-`/`@`로 시작하는 값을 입력하면, 이 xlsx를 여는 다른 직원이 악성 수식에 노출될 잠재 위험(OWASP CSV/Excel Injection)이 있다. 다만 `exceljs`로 생성하는 네이티브 XLSX는 셀 타입이 명시적으로 문자열로 기록되어 CSV만큼 위험하지는 않다(확신도 낮음).
  - **관련 파일**: `lib/excel/weekly-log-excel.ts:72-86`
  - **수락 기준**: `=`/`+`/`-`/`@`로 시작하는 셀 문자열 값 앞에 작은따옴표(`'`)를 붙여 수식으로 해석되지 않게 방어한다. 기존 정상 데이터(숫자·날짜 등 셀 타입이 문자열이 아닌 값)의 표시에는 영향이 없음을 확인한다.

- [x] **Task 084: 검색 상태의 무한 스크롤 재조회 비용 — 참고용 기록만 (코드 변경 없음)** ✅
  - `lib/queries/weekly-logs.ts:213-246`의 검색 분기는 `.range(0, offset+limit)`으로 매 배치 요청마다 항상 0부터 재조회한다. 검색어가 있는 상태로 깊이 스크롤할수록(offset이 클수록) 비용이 커진다. 현재 설계(캡된 정렬 목록 병합) 상 불가피한 트레이드오프로 판단해 **이번 로드맵에서는 코드를 변경하지 않고 참고용으로만 기록**한다.
  - **관련 파일**: `lib/queries/weekly-logs.ts:213-246`
  - **수락 기준**: 없음(정보성 Task). 실사용에서 깊은 스크롤 시 체감 지연이 보고되면 별도 Task로 재검토한다.

- [x] **Task 085: `formatRelativeTime()`의 SSR/CSR 하이드레이션 잠재 이슈 확인 (`lib/format.ts`)** ✅
  - `formatRelativeTime()`이 `Date.now()`를 직접 참조해, 서버 렌더 시점과 클라이언트 하이드레이션 시점 사이 초 단위 시간차로 "방금 전"→"1분 전" 경계에서 텍스트가 달라지면 React 하이드레이션 경고가 발생할 여지가 있다. 실사용상 거의 눈에 띄지 않는 사소한 이슈.
  - **관련 파일**: `lib/format.ts:64-74`
  - **수락 기준**: 이 함수를 쓰는 컴포넌트(댓글 타임스탬프 등)에서 실제로 하이드레이션 경고가 재현되는지 확인한다. 재현되지 않으면 코드 변경 없이 "확인 완료, 문제 없음"으로 종결한다. 재현되면 `suppressHydrationWarning` 또는 클라이언트 마운트 후 재계산하는 패턴을 검토한다.
  - **실제 처리**: 타이밍에 좌우되는 하이드레이션 불일치를 결정적으로 재현하기는 비현실적이라고 판단해, React 공식 문서가 권장하는 표준 대응(정확히 이 "상대 시간 표시" 케이스에 대해 `suppressHydrationWarning` 사용을 명시)을 SSR로 렌더되는 3개 호출부(`weekly-log-comment-section.tsx`, `notification-bell.tsx`, `weekly-log-change-history.tsx`)에 선제 적용했다. `weekly-log-draft-banner.tsx`는 `savedAt`이 `useSyncExternalStore`의 `getServerSnapshot`에서 항상 `null`이라 SSR 시점에 이 텍스트 자체가 렌더되지 않으므로(F042 설계) 변경하지 않았다.

---

## 발견 사항 요약

| # | 심각도 | 제목 | Task | 상태 |
|---|--------|------|------|------|
| 1 | 🚨 치명적 | 오픈 리다이렉트 — OAuth 콜백 | 066 | 완료 |
| 2 | 🚨 치명적 | 오픈 리다이렉트 — 이메일 인증 콜백 | 067 | 완료 |
| 3 | 🚨 치명적 | 첨부파일 부서 소속 검증 누락 | 068 | 완료 |
| 4 | 🚨 치명적 | 사용자 상세 페이지 조직 범위 검증 전무 | 069 | 완료 |
| 5 | ⚠️ 중요 | 비밀번호 재설정 후 하드 네비게이션 미적용 | 070 | 완료 |
| 6 | ⚠️ 중요 | 첨부파일 `filePath` 서버 미검증 | 071 | 완료 |
| 7 | ⚠️ 중요 | `sanitize-html.ts` SSR 스킵 암묵적 계약 | 072 | 완료 |
| 8 | ⚠️ 중요 | 대시보드 `departmentParam` 검증 누락 | 073 | 완료 |
| 9 | 💡 사소 | 서버 액션 UUID 검증 일관성 | 074 | 완료 |
| 10 | 💡 사소 | `requireLoggedIn` 네이밍 오해 소지 | 075 | 완료 |
| 11 | 💡 사소 | "지연" 배지 기준 불일치 | 076 | 완료 |
| 12 | 💡 사소 | 댓글 헤더 카운트 소프트 삭제 포함 | 077 | 완료 |
| 13 | 💡 사소 | `NavUser` 타입 중복 정의 | 078 | 완료 |
| 14 | 💡 사소 | 댓글 입력창 `maxLength` 힌트 부재 | 079 | 완료 |
| 15 | ⚠️ 중요 | 소프트 삭제 댓글 원문 마스킹 누락 | 080 | 완료 |
| 16 | ⚠️ 중요 | `department`/`author` 필터 UUID 미검증(500 크래시 가능) | 081 | 완료 |
| 17 | 💡 사소 | CLAUDE.md `lib/dummy-log-overrides.ts` 문서 드리프트 | 082 | 완료 |
| 18 | 💡 사소 | Excel 다운로드 formula-injection 방어 부재 | 083 | 완료 |
| 19 | 💡 사소(정보성) | 검색+깊은 무한스크롤 재조회 비용 | 084 | 완료(기록만) |
| 20 | 💡 사소 | `formatRelativeTime()` 하이드레이션 잠재 이슈 | 085 | 완료 |

리뷰에서 "잘 지켜지고 있는 패턴"으로 확인된 항목(Supabase 클라이언트 3종 구분, `getClaims()` 관례, 사용자 관리 서버측 role 재검증, 댓글 멘션/리액션 서버 재검증, Realtime 알림 훅, 첨부파일 3중 방어, `localStorage` 사용 규약 등)은 이 문서에 별도 Task로 두지 않는다.

## 구현 검증 상태

Task 066~085 전부 구현 완료(2026-08-22). `npx tsc --noEmit`·`npm run lint` 클린 확인(신규 경고/에러 0건 — `update-password-form.tsx`의 `no-location-assign-relative-destination` 경고 1건은 `login-form.tsx`/`logout-button.tsx`/`profile-form.tsx`와 동일하게 이미 감수하기로 한 기존 패턴). **단, 개발 워크플로우 3번이 명시한 Playwright MCP 실브라우저 검증은 아직 수행하지 않았다** — 특히 Task 066·067(오픈 리다이렉트)·068(타 부서 첨부파일 차단)·069(타 조직 사용자 상세 404)·080(소프트 삭제 댓글 마스킹)·081(잘못된 UUID 쿼리 파라미터로 500 재현 여부)처럼 공격 시나리오·에러 경로 재현이 필요한 항목은 실측 확인 전까지는 코드 리뷰상의 수정일 뿐 검증된 수정은 아니다.
