# 코드 리뷰 대응 로드맵

2026-08-22, `code-reviewer` 에이전트로 저장소 전체(`app/`, `components/`, `lib/`, `hooks/`)를 대상으로 수행한 전수 코드 리뷰의 발견 사항을 대응 작업으로 정리한 문서다. v3(`docs/roadmap/ROADMAP_v3.md`)의 Task 번호를 이어받아 Task 066부터 시작한다.

> **배경**: 사용자가 "전체 소스코드를 리뷰해 줘"라고 명시적으로 요청해, 평소 "최근 변경분만" 보는 관례에서 벗어나 저장소 전체를 두 갈래(① 보안 핵심·서버 액션·진행업무·인증·댓글/알림/리액션, ② 관리자 콘솔·조직/부서/부문 범위 제한)로 나눠 검토했다. 이 문서는 새 기능(F-번호) 추가가 아니라 **기존 코드의 결함 수정**을 다루므로 v1~v3와 달리 기능 ID 매핑 테이블을 두지 않는다.

## 개발 워크플로우

1. **치명적 → 중요 → 사소** 순으로 착수한다. 치명적 4건은 보안·정보 노출과 직결되므로 다른 작업보다 우선한다.
2. 각 Task는 리뷰에서 제시된 개선 방향을 그대로 적용하되, 실제 구현 중 CLAUDE.md에 문서화된 기존 컨벤션(부서/조직 스코프, `requireAdmin()` 재호출 패턴 등)과 충돌이 발견되면 AskUserQuestion으로 먼저 확인한다.
3. 각 Task 완료 후 관련 화면을 Playwright MCP 등으로 실측 검증하고, 체크박스를 채우고 제목에 ✅ 표시한다.

---

## Phase 1: 치명적 (보안·정보 노출)

- [ ] **Task 066: 오픈 리다이렉트 수정 — Google OAuth 콜백 (`app/auth/callback/route.ts`)**
  - `next` 쿼리 파라미터를 검증 없이 `` `${origin}${next}` ``에 이어붙여, `next=@evil.com/`처럼 `@`로 시작하는 값을 주면 브라우저가 userinfo 트릭으로 `evil.com`을 실제 host로 해석한다. 구글 OAuth 콜백 링크에 조작된 `next`를 심어 피싱에 악용 가능.
  - **관련 파일**: `app/auth/callback/route.ts:9, 15`
  - **수락 기준**: `next`가 `/`로 시작하고 `//`로 시작하지 않는 내부 상대 경로일 때만 리다이렉트에 사용하고, 아니면 안전한 기본값(`/protected`)으로 폴백한다. 악의적 `next` 값으로 외부 도메인 리다이렉트가 재현되지 않음을 확인한다.

- [ ] **Task 067: 오픈 리다이렉트 수정 — 이메일 인증 콜백 (`app/auth/confirm/route.ts`)**
  - `origin`조차 붙이지 않고 `next`를 `redirect()`에 그대로 넘겨, `next`가 완전한 절대 URL(`https://phishing-site.com`)이면 검증 없이 그대로 이동한다. 이메일 인증/OTP 링크에 악성 `next`를 심는 전형적 오픈 리다이렉트로 Task 066보다 더 직접적이다.
  - **관련 파일**: `app/auth/confirm/route.ts:10, 21`
  - **수락 기준**: Task 066과 동일한 내부 상대 경로 검증을 적용한다. 절대 URL이나 프로토콜 상대 URL(`//evil.com`)이 거부됨을 확인한다.

- [ ] **Task 068: 첨부파일 등록 시 진행업무 소속 부서 재검증 추가 (`lib/actions/weekly-log-attachments.ts`)**
  - `weekly_log_attachments_insert_own_department_or_admin` RLS는 `department_id = current_department_id() AND uploaded_by = auth.uid()`만 검사하고, 넘겨받은 `weekly_log_id`가 실제로 그 부서 소속 로그인지는 검사하지 않는다(FK 존재 여부만 보장). 서버 액션(`createWeeklyLogAttachmentAction`)도 이를 대조하지 않는다.
  - **공격 시나리오**: 공격자가 자기 부서 storage 폴더에 파일을 올린 뒤(storage RLS는 최상위 폴더만 검사), 임의의 다른 부서 `weeklyLogId`로 액션을 직접 호출하면 권한 없는 타 부서 진행업무 상세 페이지에 파일이 첨부되고, `weekly_logs`가 전 사용자 SELECT 공개라 그대로 노출된다.
  - **관련 파일**: `lib/actions/weekly-log-attachments.ts:23-57`(`createWeeklyLogAttachmentAction`)
  - **수락 기준**: 액션 내부에서 `weekly_log_id`로 `weekly_logs.department_id`를 조회해 호출자 부서(또는 `is_admin()`)와 일치하는지 재검증한 뒤에만 insert를 수행한다. 다른 부서 `weeklyLogId`로 호출 시 거부됨을 확인한다. Task 069(`filePath` 검증)와 함께 처리하는 것을 권장.

- [ ] **Task 069: 사용자 상세 페이지 조직 범위 검증 추가 (`app/protected/admin/users/[id]/page.tsx`)**
  - 관리자 콘솔의 다른 모든 화면(대시보드·부서·업무타입·조직 관리·사용자 목록)은 `requireAdmin()`을 재호출해 `organizationId`로 쿼리를 좁히지만, 이 페이지만 `requireAdmin()`을 호출하지 않고 `getClaims()`로 `currentUserId`만 얻는다. `profiles` RLS(`profiles_select_own_or_admin`)의 `is_admin()`은 조직과 무관하게 `role in ('admin','superadmin')`이면 전체 행을 허용하므로, 이 앱의 조직 격리는 RLS가 아니라 콘솔 페이지의 쿼리 레벨 스코핑에 전적으로 의존한다(CLAUDE.md 명시).
  - **결과**: 자기 조직 소속 관리자가 다른 조직 사용자의 UUID만 알면 이름·이메일·전화번호·자기소개·역할·소속팀·최근 작성 진행업무 요약을 그대로 볼 수 있다. "소속 팀 변경" select용 `departments` 쿼리(101-106행)도 `organization_id` 필터가 없어 전 조직의 팀 목록이 그대로 클라이언트에 내려간다.
  - **관련 파일**: `app/protected/admin/users/[id]/page.tsx:16-119`
  - **수락 기준**: `requireAdmin()`을 호출해 `organizationId`/`role`을 얻고, 슈퍼관리자가 아니면 대상 사용자의 소속 부서가 그 조직에 속하는지 확인해 불일치 시 `notFound()` 처리한다. "소속 팀 변경" select의 `departments` 조회도 조직 필터(슈퍼관리자는 전체)를 적용한다. 다른 조직 사용자 UUID로 직접 접근 시 404가 됨을 확인한다. 쓰기 경로(`updateUserDepartmentAction`)는 이미 `isDepartmentAccessible()`로 재검증되므로 변경 불필요.

---

## Phase 2: 중요

- [ ] **Task 070: 비밀번호 재설정 후 하드 네비게이션으로 전환 (`components/update-password-form.tsx`)**
  - CLAUDE.md 컨벤션(로그인/로그아웃 성공 후 `router.push`가 아니라 `window.location.href` 하드 네비게이션)에서 벗어나 있다. 세션 갱신 직후 `/protected` 진입 시 클라이언트 라우터 캐시에 남은 이전 세션의 리다이렉트 결과 때문에 부서 미설정 분기 등이 최신 상태를 반영하지 못할 수 있다.
  - **관련 파일**: `components/update-password-form.tsx:37`
  - **수락 기준**: `login-form.tsx`/`logout-button.tsx`/`profile-form.tsx`와 동일하게 `window.location.href = "/protected"`로 변경한다.

- [ ] **Task 071: 첨부파일 `filePath` 서버 검증 추가 (`lib/actions/weekly-log-attachments.ts`)**
  - `filePath`가 실제로 방금 업로드된 storage 객체를 가리키는지 서버가 검증하지 않는다. Task 068과 결합하면 임의 문자열을 `file_path`로 등록해 "깨진 첨부파일" 메타데이터를 만들 수 있다.
  - **관련 파일**: `lib/actions/weekly-log-attachments.ts:37-49`
  - **수락 기준**: Task 068과 함께 검토해, `filePath`가 기대하는 경로 패턴(`{department_id}/{weekly_log_id}/{uuid}-{파일명}`)과 일치하는지 또는 storage 객체 존재 여부를 확인한 뒤 insert하도록 보완한다.

- [ ] **Task 072: `sanitize-html.ts`의 SSR 스킵 계약 명시 또는 방어적 sanitize (`lib/sanitize-html.ts`)**
  - `sanitizeWeeklyLogContent()`는 `isBrowser`가 false(SSR)면 sanitize 없이 원본 HTML을 그대로 반환한다. "저장 시점에 이미 서버에서 sanitize됐다"는 암묵적 전제 위에 성립하며, 현재 호출부(`html-editor.tsx`/`html-content.tsx`)는 이 전제를 지키고 있지만 문서화되어 있지 않다.
  - **관련 파일**: `lib/sanitize-html.ts:38-43`
  - **수락 기준**: 함수 주석에 "DB에서 읽어온 이미 sanitize된 값에만 안전, 신뢰할 수 없는 원본 HTML을 SSR 중 이 함수에 직접 넘기지 말 것"이라는 계약을 명시하거나, 서버 환경에서도 무조건 sanitize하도록(예: `isomorphic-dompurify`의 서버용 JSDOM 경로 사용) 방어적으로 변경한다. 어느 쪽을 택할지는 성능 영향을 검토해 결정한다.

- [ ] **Task 073: 관리자 대시보드 `departmentParam` 범위 검증 추가 (`app/protected/admin/dashboard/page.tsx`)**
  - 같은 페이지에서 `orgParam`/`divisionParam`은 조회된(조직 범위로 스코프된) 배열에 대해 `.some(...)`으로 존재 여부를 검증한 뒤 채택하고 아니면 안전한 기본값으로 폴백하지만, `departmentParam`만 이 패턴 없이 곧바로 `departmentId`로 쓰인다. 현재는 RPC 호출 시 `org_id`와 AND 조건으로 걸려 결과가 0건이 될 뿐 실유출은 없어 보이나, RPC 시그니처가 바뀌면 조용히 조직 간 데이터 유출로 발전할 수 있는 취약 지점이다.
  - **관련 파일**: `app/protected/admin/dashboard/page.tsx:102-104`
  - **수락 기준**: `divisionParam`과 동일하게 `departments.some((d) => d.id === departmentParam)` 검증을 추가해, 존재하지 않거나 범위 밖인 값은 `ALL_DEPARTMENTS_FILTER`로 폴백하도록 한다.

---

## Phase 3: 사소

- [ ] **Task 074: 진행업무 서버 액션의 `id` 파라미터 UUID 검증 일관화 (`lib/actions/weekly-log.ts`)**
  - `updateWeeklyLogAction`, `updateWeeklyLogWorkTypeAction`, `updateWeeklyLogImportanceAction`, `updateWeeklyLogProgressAction`, `deleteWeeklyLogAction`, `updateWeeklyLogStatusAction`이 `id`에 `z.string().uuid()` 검증을 하지 않는다(`toggleWeeklyLogReactionAction`만 검증). Postgres가 예외로 걸러주긴 하나 파일 내 일관성이 떨어진다.
  - **관련 파일**: `lib/actions/weekly-log.ts`
  - **수락 기준**: 위 액션들의 Zod 스키마에 `id: z.string().uuid()` 검증을 통일 적용한다.

- [ ] **Task 075: `requireLoggedIn` 네이밍 재검토 (`lib/actions/department.ts`/`division.ts`/`organization.ts`/`work-type.ts`)**
  - 이름과 달리 관리자 권한을 확인하지 않고 RLS에 위임하는 함수다(설계 의도이자 실제로 안전함). 다만 네이밍이 "로그인만 확인하고 권한은 RLS가 막는다"는 실제 동작과 다르게 읽혀 오해 소지가 있다.
  - **관련 파일**: `lib/actions/department.ts`, `lib/actions/division.ts`, `lib/actions/organization.ts`, `lib/actions/work-type.ts`
  - **수락 기준**: 함수명을 `requireLoggedInAndDelegateToRls` 등으로 바꾸거나, 최소한 "권한 검사는 RLS에 위임하며 이 함수는 로그인 여부만 확인한다"는 주석을 추가한다. 동작 자체는 변경하지 않는다.

- [ ] **Task 076: "지연" 판정 기준 화면 간 불일치 정리**
  - 칸반(`weekly-log-kanban-column.tsx`)·타임라인(`weekly-log-timeline-view.tsx`)·"내 업무" 위젯은 `status ≠ completed && target_end_date < today`(마감일 기준)로 3곳이 일치하지만, 상세 페이지(`weekly-log-detail-view.tsx:291, 367`)의 "지연" 배지는 **진척률이 목표 진척률에 못 미치는지**(전혀 다른 기준)로 판정한다. 같은 "지연" 라벨을 써서 화면 간 모순으로 보일 수 있다.
  - **관련 파일**: `components/weekly-log-detail-view.tsx:291, 367`, `components/weekly-log-kanban-column.tsx`, `components/weekly-log-timeline-view.tsx`, `components/my-work-summary-widget.tsx`
  - **수락 기준**: 상세 페이지 배지의 라벨을 "진척 부진" 등으로 구분해 마감일 기준 "지연"과 혼동되지 않게 하거나, 사용자 확인 후 두 기준 중 하나로 통일한다(AskUserQuestion으로 방향 확인).

- [ ] **Task 077: 댓글 헤더 카운트를 소프트 삭제 제외 기준으로 통일 (`components/weekly-log-comment-section.tsx`)**
  - "댓글 N개" 헤더가 소프트 삭제된 댓글까지 포함해 카운트하는데, 목록 페이지의 `comment_count`는 `deleted_at is null`인 것만 센다. 같은 개념의 숫자가 화면마다 다르게 보인다.
  - **관련 파일**: `components/weekly-log-comment-section.tsx:386`
  - **수락 기준**: 상세 페이지 헤더 카운트도 `deleted_at is null`인 댓글만 세도록 통일한다.

- [ ] **Task 078: `NavUser` 타입 중복 정의 제거 (`components/header-nav.tsx`/`components/mobile-nav.tsx`)**
  - 동일한 `NavUser` 타입이 두 파일에 중복 정의되어 있다.
  - **관련 파일**: `components/header-nav.tsx`, `components/mobile-nav.tsx`
  - **수락 기준**: `lib/types` 등 공유 위치로 이동해 두 컴포넌트가 import해서 쓰도록 정리한다.

- [ ] **Task 079: 댓글 입력창 `maxLength` 클라이언트 힌트 추가**
  - 서버 2000자 제한은 제출 시점에만 걸려, 사용자가 미리 글자 수 초과를 인지하지 못한다.
  - **관련 파일**: `components/weekly-log-comment-section.tsx`(또는 `mention-input.tsx`)
  - **수락 기준**: 입력창에 `maxLength={2000}` 또는 글자 수 카운터 UI를 추가해 제출 전 초과 여부를 인지할 수 있게 한다.

---

## 발견 사항 요약

| # | 심각도 | 제목 | Task | 상태 |
|---|--------|------|------|------|
| 1 | 🚨 치명적 | 오픈 리다이렉트 — OAuth 콜백 | 066 | 미착수 |
| 2 | 🚨 치명적 | 오픈 리다이렉트 — 이메일 인증 콜백 | 067 | 미착수 |
| 3 | 🚨 치명적 | 첨부파일 부서 소속 검증 누락 | 068 | 미착수 |
| 4 | 🚨 치명적 | 사용자 상세 페이지 조직 범위 검증 전무 | 069 | 미착수 |
| 5 | ⚠️ 중요 | 비밀번호 재설정 후 하드 네비게이션 미적용 | 070 | 미착수 |
| 6 | ⚠️ 중요 | 첨부파일 `filePath` 서버 미검증 | 071 | 미착수 |
| 7 | ⚠️ 중요 | `sanitize-html.ts` SSR 스킵 암묵적 계약 | 072 | 미착수 |
| 8 | ⚠️ 중요 | 대시보드 `departmentParam` 검증 누락 | 073 | 미착수 |
| 9 | 💡 사소 | 서버 액션 UUID 검증 일관성 | 074 | 미착수 |
| 10 | 💡 사소 | `requireLoggedIn` 네이밍 오해 소지 | 075 | 미착수 |
| 11 | 💡 사소 | "지연" 배지 기준 불일치 | 076 | 미착수 |
| 12 | 💡 사소 | 댓글 헤더 카운트 소프트 삭제 포함 | 077 | 미착수 |
| 13 | 💡 사소 | `NavUser` 타입 중복 정의 | 078 | 미착수 |
| 14 | 💡 사소 | 댓글 입력창 `maxLength` 힌트 부재 | 079 | 미착수 |

리뷰에서 "잘 지켜지고 있는 패턴"으로 확인된 항목(Supabase 클라이언트 3종 구분, `getClaims()` 관례, 사용자 관리 서버측 role 재검증, 댓글 멘션/리액션 서버 재검증, Realtime 알림 훅, 첨부파일 3중 방어, `localStorage` 사용 규약 등)은 이 문서에 별도 Task로 두지 않는다.
