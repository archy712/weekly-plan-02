# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Next.js 16 (App Router) + Supabase Auth 스타터 킷입니다. `@supabase/ssr`로 쿠키 기반 세션을 Client Component, Server Component, Route Handler, `proxy.ts` 전반에서 공유합니다.

MVP(부서별 진행업무 CRUD·조회·PDF·검색, `docs/roadmap/ROADMAP_mvp.md`)는 구현이 완료된 상태입니다. v1 고도화(`docs/roadmap/ROADMAP_v1.md`)는 관리자 콘솔(부서 관리 UI·사용자 관리 UI, Phase 1), 기간 범위 검색·통계 대시보드(Phase 2), 댓글·멘션(Phase 3), 실시간 알림(Phase 4), 통합 검증·배포 전 점검(Phase 5)까지 구현이 완료되었습니다. Phase 3 이후에는 원래 계획에 없던 ad hoc 확장(`docs/roadmap/ROADMAP_v1.md` "Phase 3 이후 ad hoc 확장" 절 참고)도 다수 추가됐습니다 — 업무 타입·업무 중요도 속성, Excel 다운로드, 조직(organizations) 계층 신설과 이를 반영한 **관리자 콘솔의 조직 범위 제한**(관리자는 자기 소속 조직만 관리), 업무 타입 관리 UI, `admin` 위에 조직 생성·전 조직 관리가 가능한 **슈퍼관리자(superadmin) 등급**과 이를 관리자 콘솔 4개 탭(대시보드·부서·업무타입·사용자 관리)까지 확장한 전 조직 범위, 진행업무 목록의 부서 컬럼을 작성자 아바타+이름으로 대체한 것 등. Phase 6으로는 사용자 요청 신규 기능 2건 — 진행업무 **추천/비추천(F031)**과 **애플리케이션 전반 성능 개선(F032)** — 이 구현 완료됐습니다(성능 개선은 인증 계정이 필요한 E2E 회귀 검증만 사용자 작업으로 대기). **v2 고도화(`docs/roadmap/ROADMAP_V2.md`)도 F040~F047 8건 전부 구현·통합 검증(Task 049)까지 완료됐습니다** — "내 업무" 개인 요약 위젯(F040), 이 프로젝트 최초의 `pg_cron` 도입인 정기 작성 리마인더(F041), 이 프로젝트 최초의 `localStorage` 도입인 작성 중 임시저장(F042), 상태·업무타입·중요도 변경 이력(F043, `weekly_log_change_history` 신규 테이블), 알림 구독 설정(F044, `notifications` 4종 유형 확장), 목록·칸반 필터 프리셋 저장(F045, `localStorage` 두 번째 사용처), 검색 결과 하이라이팅(F046), 캘린더/타임라인 뷰(F047, 신규 라우트 + 목록/칸반/타임라인 뷰 전환 탭). v2 마감 이후에는 UI/UX 개선 10건(F048~F057)과 운영 정리 3건(F058~F060, `docs/roadmap/ROADMAP_V2.md` Phase 7·8)이 ad hoc으로 이어졌고, 화면 표기를 "주간업무(일지)"에서 "진행업무"로 전면 리네임(F061)한 뒤 v3(`docs/roadmap/ROADMAP_v3.md`)로 문서화가 옮겨갔습니다 — **이 리네임은 화면 텍스트에만 적용되고 DB 테이블(`weekly_logs`)·라우트(`/protected/weekly-logs`)·코드 식별자(`WeeklyLog` 타입 등)는 전혀 바뀌지 않았으므로, 이 문서를 포함한 코드베이스 전반의 식별자·주석·URL은 계속 "주간업무"/"weekly log" 표현을 씁니다.** 아래 관련 절에서 상세를 다룹니다. 전체 기능 명세는 `docs/prd/PRD.md`(MVP + v1 + v2 계획 포함)를 참고하세요.

## 명령어

```bash
npm run dev     # 개발 서버 (HTTP 헤더 크기 제한을 32768로 늘려서 실행)
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 서버 실행
npm run lint    # ESLint 검사 (eslint-config-next의 core-web-vitals + typescript)
```

- 타입 체크 전용 스크립트나 테스트 스크립트는 별도로 정의되어 있지 않습니다. 타입 오류 확인이 필요하면 `npx tsc --noEmit`을 직접 실행하세요.
- 환경변수는 `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 두 개만 필요합니다. 값이 없으면 `lib/utils.ts`의 `hasEnvVars`가 `false`가 되어 UI가 튜토리얼/경고 모드로 폴백합니다(`components/env-var-warning.tsx`, `lib/supabase/proxy.ts`).

## 아키텍처

### 디렉토리 구조

`docs/guides/`에 아키텍처/스타일/폼 처리/배포·운영에 대한 상세 가이드 6종이 있으니 관련 작업 전에 참고하세요.

### Supabase 클라이언트 3종 — 컨텍스트별로 반드시 구분해서 사용

- `lib/supabase/client.ts` — `createBrowserClient`, Client Component(`"use client"`)에서만 사용.
- `lib/supabase/server.ts` — `createServerClient` + `next/headers`의 `cookies()`, Server Component/Route Handler에서 `await createClient()`로 사용. **전역 변수에 저장하지 말고 매 요청마다 새로 생성**할 것 (Fluid compute 대응, 코드 주석에 명시됨).
- `lib/supabase/proxy.ts` — `updateSession()`, `proxy.ts`(구 middleware) 전용. 요청 쿠키를 읽고 세션을 갱신한 뒤 응답 쿠키에 다시 써야 하므로, 이 함수의 쿠키 처리 로직은 함부로 바꾸지 말 것(주석에 이유가 상세히 적혀 있음).
- 세션 확인은 `supabase.auth.getUser()`가 아니라 **`supabase.auth.getClaims()`**를 사용하는 것이 이 코드베이스의 관례입니다(더 빠름). `data?.claims`가 사용자 정보를 담고 있습니다.

### 인증 라우팅 흐름

1. 루트의 `proxy.ts`가 모든 요청(정적 파일 제외)에서 `updateSession()`을 호출합니다.
2. `updateSession()`(`lib/supabase/proxy.ts`)은 `/`, `/login*`, `/auth/*`를 제외한 경로에서 세션이 없으면 `/auth/login`으로 리다이렉트합니다.
3. `app/auth/*`에 로그인/회원가입/비밀번호 재설정/이메일 확인(`confirm/route.ts`) 페이지가 있고, `app/protected/*`가 인증이 필요한 영역입니다. 개별 서버 컴포넌트(`app/protected/page.tsx` 등)도 `getClaims()`로 재확인 후 `redirect("/auth/login")` 하는 이중 방어 패턴을 씁니다.
4. 로그인/회원가입 폼(`components/*-form.tsx`)은 Server Action이 아니라 **Client Component에서 `supabase.auth.*`를 직접 호출**하는 패턴입니다(`login-form.tsx`, `profile-form.tsx` 참고).
5. 회원가입은 Supabase의 Confirm Email 옵션이 꺼져 있어 이메일 인증 없이 가입 즉시 로그인됩니다(`sign-up-form.tsx`, `app/auth/sign-up-success/page.tsx`).
6. **로그인/로그아웃 성공 후에는 `router.push`가 아니라 `window.location.href`로 하드 네비게이션**할 것(`login-form.tsx`, `logout-button.tsx`). 이유는 두 가지: (1) 클라이언트 라우터 캐시에 남은 이전 세션의 리다이렉트 결과를 재사용하지 않아야 부서 설정 여부 같은 분기가 최신 상태를 반영하고, (2) 완전한 페이지 탐색이어야 브라우저의 비밀번호 관리자가 로그인 폼을 안정적으로 재인식해 자동완성/저장 제안이 정상 동작합니다.
7. 구글 OAuth는 `app/auth/callback/route.ts`(Route Handler)가 `exchangeCodeForSession()`으로 코드를 세션으로 교환하고 `next` 쿼리 파라미터(기본값 `/protected`)로 리다이렉트합니다. 실패 시 `/auth/error`로 이동.
8. **부서 미설정 사용자는 모든 보호 페이지에서 `/protected/profile`로 리다이렉트**됩니다. 이 체크는 공통 레이아웃 한 곳이 아니라 `app/protected/page.tsx`, `app/protected/weekly-logs/page.tsx`, `weekly-logs/new/page.tsx`, `weekly-logs/[id]/page.tsx` 등 **개별 페이지마다 `profiles.department_id`를 조회해 반복**합니다. 새 보호 페이지를 추가할 때 이 체크를 빠뜨리지 말 것.

### DB 타입

`lib/supabase/database.types.ts`는 Supabase에서 생성된 타입입니다(`mcp__supabase__generate_typescript_types`로 재생성). 컴포넌트에서는 `Tables<"테이블명">` 헬퍼로 필요한 컬럼만 `Pick`해서 씁니다(`components/profile-form.tsx` 참고). 스키마를 변경했다면 이 파일을 재생성해야 합니다.

### 부서 기반 권한 모델

- `weekly_logs`의 RLS는 **SELECT는 전 부서에 공개**되어 있고, **INSERT/UPDATE/DELETE만 작성자의 소속 부서 또는 `role='admin'`으로 제한**됩니다. 목록/상세 조회 쿼리에서 부서로 필터링하지 않아도 되며(관리자 여부와 무관하게 모든 로그인 사용자가 부서 필터를 쓸 수 있음), 쓰기 액션 UI만 서버에서 계산한 `canWrite` 같은 값으로 노출 여부를 제어해야 합니다(`app/protected/weekly-logs/[id]/page.tsx` 참고).
- 목록 페이지의 부서 필터 **기본값**은 `department` 쿼리 파라미터가 없을 때만 role로 분기합니다(관리자는 전체, 일반 사용자는 소속 부서). 파라미터가 있으면 role과 무관하게 그대로 사용합니다.
- **`profiles.role`에는 자기 상승을 막는 `BEFORE UPDATE` 트리거(`prevent_unauthorized_role_change()`, `SECURITY DEFINER`)가 이미 적용되어 있습니다.** `profiles_update_own` 정책이 행 단위 제한만 걸려 있어(컬럼 제한 없음) 원래는 로그인한 누구나 자신의 `role`을 `admin`으로 바꿀 수 있었던 결함을 막은 것입니다 — `NEW.role`이 `OLD.role`과 다르고 **`(select auth.uid())`가 NULL이 아닌데(=PostgREST를 통한 인증된 앱 요청)** 호출자가 `is_admin()`이 아니면 예외를 던집니다. `auth.uid()`가 NULL인 연결(SQL Editor, `mcp__supabase__execute_sql` 등 직접 DB 접속)은 검사 대상이 아니므로 `docs/guides/deployment-ops.md` 4절의 수동 관리자 지정 절차는 그대로 동작합니다 — 처음 이 트리거를 `auth.uid()` 조건 없이(호출자가 `is_admin()`이 아니면 무조건 차단) 작성했다가 그 절차 자체가 막히는 회귀를 실측으로 발견해 수정한 이력이 있으니, 이 트리거를 다시 손볼 때 `auth.uid() IS NOT NULL` 조건을 빠뜨리지 말 것. 이 트리거는 마이그레이션 파일이 아니라 Supabase MCP(`apply_migration`)로 직접 적용되어 있어 로컬 `supabase/migrations/` 디렉터리에는 보이지 않으니, 스키마 확인 시 `mcp__supabase__list_migrations`나 `execute_sql`로 실측할 것. v1 고도화(`docs/roadmap/ROADMAP_v1.md` Task 026~028)에서 `profiles`의 UPDATE 정책을 `own_or_admin`으로 넓히더라도 **이 트리거는 그대로 유지**해야 관리자 지정 UI가 생긴 뒤에도 자기 상승 경로가 막힌 채 유지됩니다. `role`이 이후 `superadmin`까지 3단계로 확장되며 이 트리거에 승격·강등 규칙이 추가됐습니다 — 아래 "슈퍼관리자 등급" 절 참고.

### 조직(organizations) 계층과 관리자 콘솔의 조직 범위 제한 (ad hoc)

- `departments.organization_id`(NOT NULL FK → `organizations.id`)로 부서는 반드시 하나의 조직에 속합니다(`organizations`는 `id`/`name`(unique)/`archived_at`/`created_at`만 있는 단순 테이블, `departments`와 동일한 소프트 삭제 관례). `work_types.organization_id`도 동일한 FK를 가지며, `name`은 전역이 아니라 **`(organization_id, name)` 복합 unique**라 서로 다른 조직이 같은 이름의 업무 타입을 각자 등록할 수 있습니다.
- **관리자는 원칙적으로 자기 소속 조직으로만 범위가 제한됩니다** — 조직 범위는 `profiles.department_id → departments.organization_id`로 매 요청 동적으로 결정됩니다. `current_organization_id()`(`current_department_id()`와 동일한 `SECURITY DEFINER STABLE` 컨벤션, `anon` EXECUTE 회수 포함)가 호출자의 소속 조직을 반환하며, `departments`/`work_types`의 INSERT/UPDATE/DELETE 정책과 `organizations`의 UPDATE 정책이 기존 `is_admin()` 조건에 `organization_id = current_organization_id()`(조직 자체는 `id = current_organization_id()`)를 AND로 추가해 **다른 조직의 부서·업무 타입·조직 정보를 절대 쓸 수 없게** 막습니다. **단, 아래 "슈퍼관리자 등급" 절에서 설명하듯 `organizations` 테이블 자체(생성·전 조직 범위 수정/닫기)만은 이 제한의 예외입니다** — `organizations`의 INSERT 정책은 슈퍼관리자 전용으로 존재하고, UPDATE 정책도 슈퍼관리자에게는 조직 범위 조건 없이 전 조직을 허용합니다. `departments`/`work_types`/사용자 관리 등 나머지는 슈퍼관리자에게도 여전히 자기 소속 조직으로 제한됩니다.
- **SELECT는 세 테이블 모두 건드리지 않았습니다** — 부서/업무 타입/조직 이름은 여전히 전 로그인 사용자에게 공개됩니다(`weekly_logs`의 "전 부서 공개" 원칙과 동일선상). 범위 제한은 **관리자 콘솔 화면의 조회 쿼리 자체**(`.eq("organization_id", organizationId)`)와 **쓰기 액션**에만 적용되며, 일반 사용자가 보는 목록/필터/회원가입 부서 선택 등은 영향받지 않습니다.
- `lib/auth/require-admin.ts`의 `requireAdmin()`이 `organizationId: string`(non-null 보장)을 반환하도록 확장되어 있습니다. 이전에는 관리자 콘솔 페이지들이 레이아웃의 `requireAdmin()` 가드만 믿고 페이지에서 재조회하지 않았지만(위 "관리자 콘솔" 절 참고), 이제 **대시보드·부서 관리·사용자 관리·업무 타입 관리 페이지 전부가 각자 `requireAdmin()`을 다시 호출**해 `organizationId`를 얻어 쿼리를 좁힙니다. 새 관리자 콘솔 페이지를 추가할 때 이 조회를 빠뜨리면 다른 조직 데이터가 그대로 노출됩니다. **단, `role === "superadmin"`인 경우 이 4개 페이지 모두 조직 필터를 조건부로 생략/확장하도록 F034에서 바뀌었습니다** — 아래 "슈퍼관리자 등급" 절 참고.
- **사용자 관리(`lib/actions/user-admin.ts`)는 RLS가 아니라 서버 액션 레벨에서 조직 범위를 재검증**합니다 — `profiles` 테이블 자체에는 `organization_id` 컬럼이 없어(부서를 통한 간접 소속이라) RLS로 직접 제한하기 어렵고, `profiles`/`prevent_unauthorized_role_change()` 트리거는 과거 회귀 이력이 있어 이번 변경에서 건드리지 않기로 결정했습니다(위 자기 상승 방지 트리거 문단 참고). 대신 `updateUserRoleAction`/`updateUserDepartmentAction`이 대상 사용자의 (현재 그리고, 부서 변경 시 새로 지정하려는) 부서가 호출자와 같은 조직인지 매번 조회해 확인합니다(`isDepartmentInOrganization()`) — 자기 자신 강등 방지가 트리거보다 넓은 조건을 서버 액션에서 추가로 거는 것과 동일한 패턴입니다. **슈퍼관리자는 F034로 이 조직 일치 검증 자체를 건너뜁니다** — `isDepartmentAccessible()` 헬퍼가 호출자의 role에 따라 `isDepartmentInOrganization()`(일반 관리자)과 "부서가 어느 조직이든 존재하는지만 확인"(슈퍼관리자)을 분기합니다.
- 부서(`department-form-dialog.tsx`)·업무 타입(`work-type-form-dialog.tsx`) 추가/수정 다이얼로그는 여러 조직 중 하나를 고르는 `Select`를 원래부터 갖고 있었습니다(범용성을 위해 `organizations: Organization[]` prop을 받는 구조). **호출하는 관리자 콘솔 페이지가 넘기는 배열의 크기로 실질적인 선택 범위가 정해집니다** — 일반 관리자에게는 소속 조직 1건짜리 배열만 넘겨 선택지가 하나뿐이게 하고, 슈퍼관리자에게는 F034로 전체 조직 배열을 넘겨 실제로 여러 조직 중 선택할 수 있게 합니다. 컴포넌트 자체는 두 경우 모두 변경 없이 재사용됩니다.
- 조직 관리 탭(`app/protected/admin/organizations/page.tsx`)은 호출자의 `role`로 분기합니다 — 일반 관리자는 기존과 동일하게 **관리자 소속 조직 1건짜리 카드**(이름 수정·비활성화/활성화만, 생성 UI 없음)를, 슈퍼관리자는 **시스템의 모든 조직을 나열하는 목록 + 새 조직 생성 버튼**을 봅니다. 자세한 내용은 아래 "슈퍼관리자 등급" 절 참고.

### `divisions` 테이블 — organizations와 departments 사이의 선택적 계층 (ad hoc)

**용어 주의**: 화면 표기는 "조직→부문", "부서(department)→팀"으로 이미 통일되어 있는데(위 각 절 참고, DB/코드 식별자는 안 바뀜), 이번에 추가된 새 테이블 `divisions`는 화면에 **"부서"**로 노출됩니다 — 이 문서 나머지 절에서 "부서"라고 쓴 표현은 전부 `departments`(화면 표기 "팀")를 가리키던 옛 표현이니 혼동하지 말 것. 즉 화면 계층은 **부문(organizations) → 부서(divisions, 선택) → 팀(departments)** 3단이고, DB 테이블명은 organizations/divisions/departments입니다.

- `divisions`는 `id`/`organization_id`(NOT NULL FK → organizations, `work_types`와 동일하게 `(organization_id, name)` 복합 unique)/`name`/`archived_at`/`created_at`만 있는 단순 테이블로, `organizations`/`work_types`와 동일한 소프트 삭제·RLS 컨벤션(SELECT 전 인증 사용자 공개, INSERT/UPDATE/DELETE는 `is_superadmin() OR (is_admin() AND organization_id = current_organization_id())`)을 그대로 재사용합니다.
- **`departments.division_id`는 nullable FK**입니다 — `departments.organization_id`(NOT NULL)는 그대로 유지한 채 division_id만 선택적으로 추가했습니다. 즉 팀은 여전히 조직에 **직접** 속하고, 부서는 그 위에 얹는 선택적 그룹핑 태그일 뿐입니다. 이 설계 덕분에 기존에 `departments.organization_id`를 직접 참조하던 조직 범위 검증 지점(관리자 콘솔 4개 탭의 스코프 쿼리, RLS, `lib/actions/user-admin.ts`의 `isDepartmentInOrganization()`)은 **전혀 수정하지 않았습니다** — division_id 유무와 무관하게 그대로 동작합니다. **단, `stats_*` RPC는 예외입니다** — 아래 대시보드 부서 필터 문단 참고.
- division_id가 설정된 경우 그 부서의 organization_id가 팀의 organization_id와 일치해야 하는데, CHECK 제약은 다른 테이블을 참조할 수 없어 `validate_weekly_log_work_type()`과 동일한 패턴으로 `validate_department_division()` `BEFORE INSERT OR UPDATE OF division_id, organization_id` 트리거가 대신 검증합니다(불일치 시 예외).
- 관리자 콘솔에 **"부서 관리" 탭**(`app/protected/admin/divisions/page.tsx`, `components/admin-tab-nav.tsx`의 부문 관리와 팀 관리 사이)이 추가되어, 부문/업무타입 관리와 동일한 CRUD 패턴(추가/이름수정/비활성화-활성화, 삭제는 참조하는 팀이 0건일 때만 — `lib/actions/division.ts`)을 제공합니다. 조직 범위 제한도 부문/업무타입 관리와 동일합니다(일반 관리자는 자기 소속 부문, 슈퍼관리자는 전 부문).
- **팀 관리(`components/department-form-dialog.tsx`)에 "소속 부서" Select가 추가**되었습니다 — `NO_DIVISION_VALUE`(`lib/schemas/department.ts`, 문자열 `"none"`) sentinel로 "부서 없음"을 표현합니다(Radix Select가 빈 문자열 값을 선택 해제로 예약해두어 `""`를 쓸 수 없기 때문). 선택지는 `useWatch`로 구독하는 현재 선택된 부문에 속한 부서만 필터링해서 보여주고, 부문을 바꾸면 대시보드 필터의 "조직을 바꾸면 부서 필터 초기화" 패턴과 동일하게 소속 부서 선택을 자동으로 "부서 없음"으로 되돌립니다.
- 목록/칸반/사용자 관리 화면은 이번 변경 범위 밖입니다 — 팀 관리 화면에 "소속 부서" 컬럼만 추가했고, 이 두 화면에는 부서 단위 필터가 없습니다(필요해지면 후속 작업으로 추가).
- **관리자 콘솔 대시보드에는 부서(division) 필터가 있습니다(ad hoc)** — `components/dashboard-filters.tsx`가 부문(org) 필터와 팀(department) 필터 사이에 부서 Select를 렌더링하며(선택된 조직 범위 안에 division이 1개 이상 있을 때만 노출), 부서를 고르면 팀 Select의 선택지도 그 부서 소속 팀으로 좁아집니다. 처음 구현 시 이 Select가 팀 dropdown의 선택지만 좁히고 실제 차트 데이터는 여전히 조직 전체를 집계하는 버그가 있었는데(부서를 선택해도 다른 부서의 팀 데이터가 섞여 나옴, 사용자가 스크린샷으로 실측 제보), `stats_*` RPC 7종(`stats_logs_by_department`/`_status`/`_work_type`/`_importance`/`_monthly_trend`, `stats_reactions_summary`, `stats_workload_summary`) 전부에 `org_id`/`dept_id`와 동일한 컨벤션으로 `div_id uuid default null` 파라미터를 추가해(마이그레이션 `extend_stats_rpc_division_scope`) 수정했습니다. `lib/queries/stats.ts`의 래퍼 함수들이 `divisionId`를 받아 `div_id`로 전달하고, `app/protected/admin/dashboard/page.tsx`가 URL의 `division` 파라미터를 선택된 조직 범위의 `divisions` 목록에 대해 검증(존재하지 않으면 "전체 부서"로 폴백, 조직 id 검증과 동일한 방어)한 뒤 6개 RPC 호출에 공통으로 넘깁니다. **`div_id`는 실제 division uuid만 표현할 수 있어 "부서 미배정 팀만" 같은 조건(`division_id is null`)은 나타낼 수 없으므로**, 부서 Select에는 그런 선택지를 아예 두지 않았습니다(department-form-dialog의 `NO_DIVISION_VALUE`와 달리 이 필터엔 "부서 없음" 옵션이 없음). **`create or replace function`으로 새 파라미터를 추가하면 인자 목록이 달라져 기존 시그니처를 대체하지 않고 새 오버로드로 추가된다는 함정을 이 작업에서 실측했습니다** — 처음 마이그레이션 직후 함수마다 신·구 시그니처 2개가 공존해 PostgREST가 애매하게 해석할 위험이 있었고, `drop function`으로 구버전 시그니처를 명시적으로 제거하는 후속 마이그레이션(`drop_stats_rpc_legacy_signatures`)이 필요했습니다. `stats_*` RPC의 파라미터 목록을 다시 바꿀 때는 이 함정을 반드시 기억할 것 — `create or replace`만으로 안심하지 말고 `pg_get_function_identity_arguments`로 오버로드가 남지 않았는지 확인.

### 부문장/부서장/팀장 (`head_profile_id`, ad hoc)

- `organizations`/`divisions`/`departments` 3개 테이블 모두 `head_profile_id`(nullable FK → `profiles(id)`, `on delete set null`) 컬럼을 갖습니다. **장(長)은 반드시 그 범위 소속 팀원**이어야 합니다 — 팀장은 그 팀(`profiles.department_id = departments.id`) 소속, 부서장은 그 부서에 속한 팀들의 팀원, 부문장은 그 부문에 속한 팀들의 팀원. CHECK 제약은 다른 테이블을 참조할 수 없어 `validate_department_division()`과 동일한 패턴으로 `validate_department_head()`/`validate_division_head()`/`validate_organization_head()` 3개의 `BEFORE INSERT OR UPDATE OF head_profile_id` 트리거가 대신 검증합니다(범위 밖 프로필을 지정하면 예외).
- **사용자 관리에서 팀원의 소속 팀이 바뀌거나 해제되면(`updateUserDepartmentAction`, 또는 본인이 `/protected/profile`에서 소속을 바꾸는 셀프서비스 경로) 더 이상 유효하지 않은 장 지정을 자동으로 정리**합니다 — `profiles`의 `AFTER UPDATE OF department_id` 트리거 `clear_stale_head_assignments()`가 그 사람이 장으로 지정돼 있던 team/division/organization 중 새 소속 범위와 더 이상 일치하지 않는 것만 `head_profile_id`를 NULL로 되돌립니다(같은 부문 내 다른 팀으로 이동하면 부문장 지정은 유지되고 팀장 지정만 해제되는 식). 이 함수는 호출자의 관리자 권한과 무관하게(본인이 셀프서비스로 부서를 바꾸는 경우도 포함) 항상 동작해야 하는 시스템 정합성 작업이라 **`SECURITY DEFINER`이고, `record_weekly_log_change_history()`와 동일한 이유로 `anon`/`authenticated`의 직접 RPC 호출을 명시적으로 revoke**했습니다. **팀 소속 자체가 아니라 팀의 부문/부서 재배정(관리자 콘솔에서 팀을 다른 부문·부서로 옮기는 것)으로 인해 장 지정이 무효화되는 경로는 의도적으로 다루지 않습니다** — 흔치 않은 관리 작업이고 결과도 표시 전용 정보의 불일치에 그치기 때문입니다.
- 관리자 콘솔의 부문/부서/팀 관리 3개 화면 모두 **수정 다이얼로그에만** 장 선택 Select가 있습니다(생성 다이얼로그에는 없음) — 새로 만드는 단위는 아직 소속 팀원이 없어 후보가 항상 비어있기 때문입니다. 후보 목록은 각 페이지가 스코프 내 `departments`를 조회해 id를 모은 뒤 `profiles`를 `.in("department_id", ...)`로 한 번에 조회하고 클라이언트에서 그룹핑하는 방식으로 구성합니다(부서별/부문별 N개 쿼리 대신 1~2개 쿼리) — 후보 목록은 UX 편의를 위한 사전 필터일 뿐, 실제 검증은 위 DB 트리거가 최종 방어선입니다. 폼 값은 `NONE_SELECT_VALUE`(`lib/constants/select.ts`, `division_id`의 `NO_DIVISION_VALUE`와 동일한 sentinel 재사용) 또는 실제 프로필 uuid만 허용하고, 서버 액션이 sentinel을 `null`로 변환합니다.
- **"장은 반드시 그 범위 소속 팀원"이라는 위 규칙은, 실제로는 특정 팀에 속하지 않고 부문/부서 전체를 총괄하는 부문장·부서장이 존재하는 조직 구조와 충돌합니다** — 이 앱의 인증 게이트(`lib/auth/require-admin.ts`의 `requireDepartment()`)와 조직 범위 판정(`current_organization_id()` DB 함수)이 전부 `profiles.department_id` 하나에만 의존하는 구조라, "팀 없이 부문/부서에만 소속"이라는 상태를 프로필 레벨에서 새로 지원하려면 이 둘을 포함해 여러 지점을 고쳐야 하는 큰 변경이 됩니다(검토했으나 채택하지 않음). 대신 **"직속" 더미 팀**(ad hoc)으로 우회합니다 — `departments.is_direct_report`(boolean, 마이그레이션 `add_departments_is_direct_report_flag`)가 이 더미 팀을 표시합니다. 처음엔 이름 패턴(`"{부문/부서명} 직속"`)만으로 식별했는데, 관리자가 팀 관리 화면에서 이 이름을 바꾸면(직속 팀도 겉보기엔 평범한 팀이라 막혀있지 않음) 식별이 깨지는 문제가 있어 명시적 플래그로 바꿨습니다. 스키마·트리거는 그 외엔 건드리지 않습니다 — `validate_organization_head()`/`validate_division_head()`가 `departments.division_id`/`organization_id`만 보고 그 팀의 이름이나 성격은 따지지 않으므로, 이 더미 팀에 소속시키기만 하면 기존 검증을 그대로 통과합니다.
- **부문/부서 관리 화면의 "부문장으로 지정"/"부서장으로 지정" 버튼**(`components/assign-direct-head-dialog.tsx`)이 위 더미 팀 확보·소속 이동·장 지정을 한 번에 처리합니다 — 처음엔 "직속 팀 만들기" 버튼으로 팀만 만들고 사용자 관리에서 따로 소속을 옮긴 뒤 다시 돌아와 장을 지정해야 했는데(3단계), 실제 팀 목록에서 골라야 하는 과정이 부자연스럽다는 피드백에 따라 `lib/actions/organization.ts`의 `assignOrganizationDirectHeadAction()`/`lib/actions/division.ts`의 `assignDivisionDirectHeadAction()`으로 통합했습니다. 후보는 `components/profile-search-picker.tsx`(멘션 검색과 동일하게 `search_mentionable_profiles` RPC + 200ms debounce)로 팀 소속과 무관하게 아무 프로필이나 검색해 고르지만, 서버 액션은 **이미 이 조직 내 어떤 팀에 소속된 사용자만** 허용합니다(department_id가 없는 신규 가입자는 사용자 관리 화면 자체에 노출되지 않는 것과 동일한 전제). 순서 중요: `profiles.department_id`를 먼저 더미 팀으로 옮긴 뒤에 `head_profile_id`를 지정해야 위 검증 트리거를 통과합니다(반대 순서면 예외).
- **팀(department) 선택 Select에서 이 더미 팀들이 상위에 그룹핑되어 노출됩니다**(`components/department-select-options.tsx`, `components/profile-form.tsx`와 `components/user-admin-detail.tsx`가 공유) — 부문장/부서장이 실제 업무팀 수십 개 사이에서 자신이 지정된 "직속" 팀을 찾아야 하는 게 부자연스럽다는 피드백에 따라, **부문 직속(division_id 없음) → 구분선 → 부서 직속(division_id 있음) → 구분선 → 실제 팀(이름순)** 순서로 고정합니다. 빈 그룹은 그 앞뒤 구분선도 함께 생략합니다. 이 Select를 새로 쓰는 화면이 생기면 `<SelectContent>` 안에서 직접 `departments.map(...)`하지 말고 이 컴포넌트를 재사용할 것 — `id, name, archived_at, division_id, is_direct_report` 5개 컬럼이 필요하므로 department 조회 쿼리에 빠짐없이 포함해야 합니다(빠뜨리면 타입 에러로 드러남, `Department = Tables<"departments">` 전체 타입을 쓰는 기존 관례 때문).
- 목록 표시는 `lib/format.ts`의 `formatHeadName()`(이름 없으면 이메일로 폴백, 지정 안 됐으면 "-")을 세 화면이 공유합니다. `profiles` SELECT RLS(`profiles_select_own_or_admin`)는 `is_admin()`이면 전체 공개라, 댓글/알림과 달리 `get_profile_identities` RPC 없이 관리자 세션에서 직접 `.select("...profiles!*_head_profile_id_fkey(...)")` embed로 장의 이름을 조회합니다(관리자 전용 화면이라 가능한 지름길).

### 슈퍼관리자 등급 (ad hoc)

- `profiles.role`은 `user`/`admin`/`superadmin` 3단계입니다. **슈퍼관리자는 admin의 상위 집합으로 설계**되어 있어 `is_admin()` DB 함수가 `role in ('admin', 'superadmin')`을 반환합니다 — 이 함수를 참조하는 기존 RLS(부서/업무 타입 쓰기, `weekly_logs`/댓글 관리, `organizations` UPDATE 등) 전체가 코드 변경 없이 슈퍼관리자에게도 그대로 열립니다. `organizations` 테이블의 **INSERT(조직 생성)**와 **전 조직 범위의 UPDATE(수정·`archived_at` 토글로 닫기)**는 슈퍼관리자 전용이며, 이를 위한 별도 `is_superadmin()` 함수(`is_admin()`과 동일한 `SECURITY DEFINER STABLE` + `anon` EXECUTE 회수 컨벤션)가 있습니다.
- **대시보드·부서 관리·업무 타입 관리·사용자 관리 4개 탭도 F034로 슈퍼관리자에게 전 조직 범위로 확장되어 있습니다**(처음 슈퍼관리자를 도입한 F033 당시엔 "범위 밖"으로 미뤄뒀던 부분). 일반 관리자는 4개 탭 전부 기존과 동일하게 자기 소속 조직으로만 제한됩니다.
  - **대시보드**: `stats_*` RPC 6종이 애초부터 `org_id uuid DEFAULT NULL`이고 `org_id is null or ... = org_id` 조건이라 **NULL을 넘기면 이미 전 조직 합산을 지원**하고 있었습니다 — DB 변경 없이 `app/protected/admin/dashboard/page.tsx`·`components/dashboard-filters.tsx`에 슈퍼관리자 전용 조직 Select(`?org=` 쿼리 파라미터, `"all"` 선택 시 org_id를 undefined로 넘겨 합산)만 추가했습니다.
  - **부서·업무 타입 관리**: `departments_insert_admin`/`update_admin`/`delete_admin`, `work_types`의 동일 3개 정책에 `ALTER POLICY`로 `is_superadmin() OR` 조건을 추가(마이그레이션 `extend_superadmin_departments_work_types_rls`, `organizations_update_admin`과 동일 패턴)했을 뿐, 컴포넌트는 위 문단에서 설명한 대로 원래부터 다중 조직을 지원해 변경이 필요 없었습니다. 페이지는 슈퍼관리자일 때 `organization_id` 필터를 생략해 전 조직의 행을 한 테이블에 나열합니다("소속 조직" 컬럼이 이미 있어 구분 가능).
  - **사용자 관리**: RLS가 아니라 서버 액션(`isDepartmentAccessible()`)에서만 확장했습니다 — 위 "사용자 관리는 RLS가 아니라 서버 액션 레벨에서..." 문단 참고. 자기 자신 강등 방지·마지막 관리자 강등 방지는 조직과 무관하게 이미 전역으로 동작하므로 손대지 않았습니다.
  - 마이그레이션 `extend_superadmin_departments_work_types_rls`도 다른 DB 변경과 동일하게 Supabase MCP `apply_migration`으로 적용되어 로컬 `supabase/migrations/`에는 보이지 않습니다.
- **승격은 이미 `admin`인 사용자만 가능합니다(`user` → `superadmin` 직접 승격 불가)** — `prevent_unauthorized_role_change()` 트리거(위 "자기 상승을 막는 트리거" 문단 참고)에 `new.role = 'superadmin' and old.role <> 'admin'`이면 예외를 던지는 규칙이 추가되어 있습니다. 역할 변경 자체는 여전히 `is_admin()`(즉 admin 또는 superadmin)인 호출자만 가능하고, 이 트리거는 대상이 이미 admin인 경우로 한 번 더 좁힙니다. `components/user-role-select.tsx`도 대상의 현재 role이 `user`이면 "슈퍼관리자" 선택지 자체를 감춰 트리거 예외를 사전에 방지합니다. **별도의 지정 화면은 없고 기존 사용자 관리 화면의 역할 Select에 옵션만 추가**되어 있습니다.
- **"마지막 관리자 강등 방지" 규칙이 관리자 권한 집합(`admin` ∪ `superadmin`) 기준으로 일반화되어 있습니다** — 트리거가 `role='admin'` 리터럴이 아니라 `role in ('admin', 'superadmin')`인 사용자 수를 세어, 이 둘을 합쳐 마지막 1명을 `user`로 강등하는 것만 막습니다. `admin` ↔ `superadmin` 간 이동(승격·강등)은 관리자 권한을 유지하므로 이 규칙에 걸리지 않습니다.
- 마이그레이션명은 `add_superadmin_role`(Supabase MCP `apply_migration`으로 적용, 다른 DB 변경과 동일하게 로컬 `supabase/migrations/`에는 보이지 않음 — 스키마 확인 시 `mcp__supabase__list_migrations`/`execute_sql`로 실측할 것).

### 검색 필터 작성 시 주의사항

`supabase-js`의 `.or()`는 PostgREST raw 문법을 그대로 넘기므로, 검색어에 콤마·괄호가 섞이면 필터 구조가 깨질 수 있습니다(공식 문서도 "직접 sanitize 필요"라고 명시). 여러 컬럼에 대한 OR 키워드 검색이 필요하면 `.or()` 대신 컬럼별로 `.ilike()` 쿼리를 따로 실행해 병합하세요(`app/protected/weekly-logs/page.tsx`의 제목/내용 검색 참고). `ilike` 패턴에 `%`/`_`가 섞인 사용자 입력을 쓸 때는 `lib/utils.ts`의 `escapeLikePattern()`으로 이스케이프할 것.

### Next.js 16 관련 특이사항

- `middleware.ts`가 아니라 **`proxy.ts`**를 사용합니다(Next 16에서 이름이 바뀜, `export function proxy`).
- `next.config.ts`에 `cacheComponents: true`가 설정되어 있어 Cache Components(`"use cache"` 지시어 기반 캐싱) 모델이 활성화되어 있습니다. 데이터 페칭 코드를 작성할 때 이 캐싱 모델을 염두에 두세요.
- `cookies()`, `headers()`, `params`, `searchParams` 등 request-time API는 전부 비동기이며 동기 접근은 지원되지 않습니다.

### 스타일링

- Tailwind CSS v4 + shadcn/ui(`new-york` 스타일, `components.json` 참고)이지만, 색상 테마는 v4의 `@theme`/oklch 방식이 아니라 **`tailwind.config.ts` + `@config` 지시어(`app/globals.css`)로 v3 방식 HSL CSS 변수**(`--background`, `--primary` 등)를 계속 사용하는 하이브리드 구성입니다. 새 색상 토큰을 추가할 때는 `app/globals.css`의 `:root`/`.dark`와 `tailwind.config.ts`의 `theme.extend.colors`를 함께 수정해야 합니다.
- 다크모드는 `next-themes`의 `ThemeProvider`를 `app/layout.tsx`에서 직접 사용합니다(별도 provider 래퍼 컴포넌트 없음).
- 클래스 조합은 `lib/utils.ts`의 `cn()`(clsx + tailwind-merge)을 사용합니다.

### 컴포넌트 조직

`src/` 없이 `components/` 루트에 페이지별 컴포넌트를 평평하게 배치하고, `components/ui/`는 shadcn/ui가 생성한 프리미티브(추가는 `npx shadcn@latest add`), `components/tutorial/`은 스타터킷 온보딩 전용 컴포넌트입니다. 파일명은 전부 kebab-case, 컴포넌트명은 PascalCase입니다.

- 테이블 컬럼 정렬 헤더는 `components/sortable-table-head.tsx`(`SortableTableHead`)로 공통화되어 있습니다 — 클릭 시 오름차순/내림차순을 토글하는 UI만 담당하는 순수 컴포넌트이고, 실제 정렬 로직(정렬 키·방향 state, 데이터 정렬)은 호출하는 쪽(`components/weekly-log-list-view.tsx`, `components/user-admin-table.tsx`)이 클라이언트 사이드로 처리합니다. 서버 재조회 없이 이미 불러온 페이지 데이터만 정렬하는 방식이라, 새 테이블에 정렬을 추가할 때도 이 컴포넌트를 재사용하세요.

### 폼 처리

React Hook Form + Zod 조합이 표준입니다. 상세 패턴(스키마 정의, 에러 표시, 서버 에러 매핑 등)은 `docs/guides/forms-react-hook-form.md`를 참고하세요.

### PDF·Excel 생성

- `lib/pdf/weekly-log-pdf.ts`, `lib/excel/weekly-log-excel.ts`가 각각 클라이언트 사이드에서 PDF/Excel을 생성합니다 — 세부 사항은 `lib/pdf/CLAUDE.md`, `lib/excel/CLAUDE.md` 참고. `components/weekly-log-list-view.tsx`의 다운로드 버튼이 드롭다운으로 바뀌어 PDF/Excel 중 선택할 수 있습니다.

### 리치 텍스트 에디터 (진행업무 상세 내용)

- `weekly_logs.content`는 plain text가 아니라 **Tiptap(`@tiptap/react` + `@tiptap/starter-kit`) 에디터가 생성한 sanitize된 HTML 문자열**입니다. `components/html-editor.tsx`(작성/수정 폼에서 사용)가 실제 편집을, `components/html-content.tsx`(상세 페이지에서 사용)가 읽기 전용 렌더링을 담당하며, 두 컴포넌트는 `PROSE_CONTENT_CLASS`(`html-content.tsx`에서 export)를 공유해 편집 화면과 상세 화면의 스타일이 항상 일치하도록 합니다.
- **`immediatelyRender: false` 필수** — Next.js SSR 하이드레이션 불일치를 막기 위해 `useEditor()` 옵션에 반드시 포함해야 합니다(공식 가이드 패턴).
- **툴바 활성 상태는 `useEditorState`를 쓰지 않고 직접 구독**합니다. 이 프로젝트의 Tiptap 버전(v3.29)에서 `useEditorState`가 에디터 생성 직후 초기 스냅샷을 갱신하지 못해 에디터가 로딩 placeholder에서 멈추는 문제가 실측되었습니다(원인 미상, 재현됨). 대신 `editor.on("transaction", ...)`을 `useEffect`로 직접 구독해 `useState`로 툴바 active 상태를 계산하는 방식(`html-editor.tsx`의 `computeActiveStates`)을 사용 — 이 워크어라운드를 걷어내고 `useEditorState`로 되돌리지 말 것.
- **허용 태그는 두 곳에서 반드시 동기화**해야 합니다: (1) `components/html-editor.tsx`의 `StarterKit.configure(...)`(에디터가 실제로 만들어낼 수 있는 노드/마크), (2) `lib/sanitize-html.ts`의 `ALLOWED_TAGS`/`ALLOWED_ATTR`(저장·렌더링 시 필터). 툴바에 새 서식(예: 표, 이미지)을 추가하면 두 파일을 함께 수정해야 합니다.
- **sanitize는 저장 시점과 렌더링 시점 양쪽에서 수행**합니다 — `lib/actions/weekly-log.ts`의 `toWeeklyLogPayload()`가 저장 전에, `components/html-content.tsx`가 렌더링 직전에 각각 `lib/sanitize-html.ts`의 `sanitizeWeeklyLogContent()`를 호출합니다. `sanitize-html.ts`는 `isomorphic-dompurify`를 쓰며 `<a>` 태그에는 `afterSanitizeAttributes` 훅으로 `target="_blank" rel="noopener noreferrer"`를 항상 강제합니다.
- ProseMirror는 스키마 기반 구조 편집기라 사용자가 에디터에 `<script>` 등을 "타이핑"해서 넣을 방법이 없고, 붙여넣기로 들어오는 외부 HTML도 스키마에 없는 태그/속성은 자동으로 걸러집니다. 위 sanitize는 그 위에 추가되는 이중 방어입니다.

### 첨부파일 업로드 (진행업무)

- `weekly_log_attachments` 테이블(메타데이터)과 `weekly-log-attachments` private Storage 버킷(실제 파일, `file_size_limit` 5MB)으로 구성됩니다. 경로 규칙은 `{department_id}/{weekly_log_id}/{uuid}-{파일명}`이며, 스토리지 RLS는 `(storage.foldername(name))[1]`(최상위 폴더 = 부서 id)이 `current_department_id()`와 일치해야 쓰기를 허용합니다 — `weekly_logs` 테이블 RLS와 동일한 부서 기반 관례를 스토리지 레벨까지 그대로 확장한 것입니다.
- 5MB 제한은 **클라이언트 선택 즉시 거부(`hooks/use-weekly-log-attachments.ts`) → 버킷 `file_size_limit` → `weekly_log_attachments.file_size` CHECK 제약**, 3중으로 강제합니다. 하나만 믿지 말 것 — DB 제약은 클라이언트가 보낸 크기값을 검증하는 것이라 실제 업로드 자체는 버킷 설정이 최종 방어선입니다.
- **업로드 진행률은 `createSignedUploadUrl` + 직접 XHR PUT**으로 구현합니다(`lib/storage/weekly-log-attachments.ts`의 `uploadAttachmentWithProgress`). `supabase-js`의 기본 `storage.upload()`는 fetch 기반이라 진행률 이벤트를 제공하지 않기 때문에, 서명된 업로드 URL을 발급받은 뒤 그 URL에 `xhr.upload.onprogress`로 직접 PUT합니다.
- **신규 작성 시 첨부파일 실제 업로드는 "저장" 성공 이후**에 실행됩니다. `weekly_log_id`가 스토리지 경로에 필요한데 row 생성 전에는 존재하지 않기 때문입니다(`createWeeklyLogAction`이 성공 시 `{id, departmentId}`를 반환하도록 되어 있는 이유). `components/weekly-log-new-form.tsx`는 최초 저장 성공 시의 `{id, departmentId}`를 `useRef`에 보관해두고, 일부 첨부파일 업로드가 실패해 재제출되더라도 `weekly_logs` row를 중복 생성하지 않고 실패한 파일만 재시도하도록 합니다. 이 가드를 제거하면 첨부파일 업로드 실패 후 재시도 시 동일 내용의 로그가 중복 생성됩니다.
- 수정(edit) 플로우는 `weekly_log_id`/`department_id`가 이미 존재하므로 이런 가드가 필요 없고, `components/weekly-log-detail-view.tsx`가 `updateWeeklyLogAction` 성공 후 곧바로 신규 첨부파일을 업로드합니다.
- 핵심 파일: `lib/storage/weekly-log-attachments.ts`(경로 생성·업로드·다운로드 URL 발급), `lib/actions/weekly-log-attachments.ts`(메타데이터 insert/delete 서버 액션), `hooks/use-weekly-log-attachments.ts`(pending files·진행률·기존 첨부파일 상태 관리), `components/weekly-log-attachment-field.tsx`(작성/수정 폼과 읽기 전용 상세 화면이 공유하는 UI, `onAddFiles`/`onRemoveAttachment` 등 prop이 없으면 자동으로 읽기 전용으로 렌더링됨).
- 다운로드는 버킷이 private이므로 항상 `createSignedUrl`(짧은 만료 시간)로 서명된 URL을 새로 발급받아 사용합니다. 공개 URL(`getPublicUrl`)은 사용하지 않습니다.

### 업무 타입(work_type) 다중 선택 속성 (진행업무, ad hoc → 관리자 관리형으로 전환)

- `weekly_logs.work_type`은 `text[]` 컬럼입니다(v1 원래 계획에 없던 항목, `docs/roadmap/ROADMAP_v1.md` "Phase 3 이후 ad hoc 확장" 참고). **처음엔 고정 10개 값만 허용하는 CHECK 제약이었지만, 관리자가 업무 타입을 직접 추가/이름수정/비활성화/삭제할 수 있는 `work_types` 테이블(조직별 관리, 위 "조직(organizations) 계층" 절 참고)로 옮겨졌습니다** — `lib/constants/work-types.ts`는 삭제되었으니 다시 만들지 말 것.
- **CHECK 제약은 다른 테이블을 참조할 수 없어서** `weekly_logs_work_type_check`(하드코딩 배열) 대신 `validate_weekly_log_work_type()` `BEFORE INSERT OR UPDATE OF work_type` 트리거로 대체했습니다 — `cardinality(work_type) > 0`과, 배열의 각 값이 **로그 작성 부서가 속한 조직**의 `work_types.name`에 실존하는지(다른 조직의 동명 업무 타입은 거부) 검사합니다. `work_types` 테이블을 다시 손볼 때 이 트리거도 함께 고려할 것.
- **작성/수정 폼과 상세 페이지의 체크박스 선택지는 더 이상 정적 배열이 아니라 서버 컴포넌트가 조회해 내려주는 `workTypeOptions: { name: string; archived: boolean }[]` prop**입니다(`app/protected/weekly-logs/new/page.tsx`, `weekly-logs/[id]/page.tsx`가 조회). 부서 select의 "비활성 라벨링" 패턴(`app/protected/profile/page.tsx`)과 동일하게, 작성자(또는 로그) 소속 부서의 조직에 속한 **활성** 타입만 새로 선택 가능하고, 비활성이거나 다른 조직 소속인 타입은 **이미 선택되어 있던 로그에서만** "(비활성)" 라벨로 계속 노출됩니다. `lib/schemas/weekly-log.ts`/`lib/actions/weekly-log.ts`의 Zod 검증은 이제 `z.array(z.string().min(1))`로 형태만 확인하고, 실제 유효성은 위 트리거가 최종 방어선입니다.
- **관리자 콘솔의 업무 타입 관리 탭**(`app/protected/admin/work-types/page.tsx`, `lib/actions/work-type.ts`)이 부서 관리와 동일한 CRUD 패턴(추가/이름수정/비활성화-활성화, 삭제는 참조하는 `weekly_logs`가 0건일 때만)을 제공합니다. `work_type`은 FK가 아니라 배열 포함이라 삭제 전 참조 확인은 `.contains("work_type", [name])` count로 수행합니다(부서의 FK RESTRICT와 달리 DB가 대신 막아주지 않으므로 액션이 직접 세야 함).
- **선택 UI는 프리셋 아바타와 마찬가지로 체크박스 다중 선택**입니다 — 하나의 진행업무가 여러 타입에 속할 수 있어, 대시보드 차트의 비율 합계가 100%를 넘을 수 있음을 캡션에 명시해두었습니다.
- **상세 페이지에서는 진행상태(status)와 동일한 패턴으로 인라인 편집**됩니다 — 별도 "수정" 모드에 들어가지 않고 상세 화면에 항상 노출되는 체크박스에서 바로 체크/해제하면 `updateWeeklyLogWorkTypeAction`(`lib/actions/weekly-log.ts`)이 즉시 저장하고, 낙관적 업데이트(즉시 반영 → 실패 시 롤백 + 토스트) 패턴은 `handleStatusChange`와 동일합니다(`components/weekly-log-detail-view.tsx`). 마지막 1개를 해제하려는 시도는 서버 호출 없이 클라이언트에서 즉시 에러 토스트로 막습니다. 전체 편집 폼("수정" 버튼)에도 동일한 체크박스가 남아 있어 두 경로 모두 편집 가능하지만, `defaultValues.work_type`이 항상 최신 상태를 참조하므로 값이 어긋나지 않습니다.
- **대시보드 차트**(`components/dashboard-worktype-chart.tsx`)는 카테고리 수가 가변적이라 `--chart-1`~`--chart-5`(5색) 팔레트보다 많아질 수 있어, `WORK_TYPE_CHART_COLORS`(`lib/constants/chart-colors.ts`)로 5색을 순환시켜 `Cell`로 막대마다 다른 색을 부여합니다. 막대 안쪽 라벨은 "N건, NN.N%" 형식(천 단위 콤마 + 소수점 1자리 퍼센트)입니다. `stats_logs_by_work_type` RPC도 이제 하드코딩된 `VALUES` 목록이 아니라 `work_types` 테이블(활성만) 기반으로 카테고리를 만듭니다.

### 업무 중요도(importance) 속성 (진행업무, ad hoc)

- `weekly_logs.importance`는 `smallint`(1~5, CHECK 제약, 기본값 3)입니다. 허용 범위·라벨은 `lib/constants/importance.ts`(`IMPORTANCE_MIN`/`IMPORTANCE_MAX`/`IMPORTANCE_LABELS`)가 유일한 소스이며, 값을 바꾸면 DB CHECK 제약과 `stats_logs_by_importance` RPC의 `levels` 목록도 함께 수정해야 합니다(work_type과 달리 이 속성은 DB 관리형이 아니라 정적 상수라 CHECK 제약을 그대로 유지).
- **입력 UI는 체크박스가 아니라 `ui/slider`**(shadcn 신규 설치)입니다 — 작성/수정 폼(`components/weekly-log-form.tsx`)과 상세 페이지 인라인 편집(`components/weekly-log-detail-view.tsx`) 모두 `formatImportanceLabel()`("매우 낮음 (1)" 형식)로 라벨을 표시합니다. 상세 페이지는 업무 타입과 마찬가지로 별도 "수정" 모드 없이 슬라이더를 움직이면 즉시 저장되지만, **드래그 중에는 화면에만 반영하고 손을 뗄 때만 서버에 저장**합니다(`onValueChange`로 로컬 상태만 갱신, `onValueCommit`에서 `updateWeeklyLogImportanceAction` 호출) — 드래그마다 매번 요청을 보내면 과도한 서버 호출이 발생하기 때문입니다.
- **대시보드에는 레이더 차트**(`components/dashboard-importance-chart.tsx`)로 분포를 시각화합니다 — 1~5단계가 순서가 있는 척도라 항상 오름차순으로 그리고, `stats_logs_by_importance` RPC는 다른 `stats_*` 함수와 동일하게 데이터가 0건인 단계도 항상 5개 축으로 반환해 필터 조건에 따라 축 모양이 흔들리지 않게 합니다.

### 프로필 상세 정보 (이름·전화번호·아바타·자기소개)

- `profiles`에 `name`(text, `CHECK (name IS NULL OR (char_length(trim(name)) BETWEEN 1 AND 50))`, nullable)·`phone_number`(text, `^\d{3}-\d{4}-\d{4}$` CHECK 제약, nullable)·`avatar_key`(text, 24개 프리셋 키 CHECK 제약, 기본값 `'fox'`)·`bio`(text, 500자 CHECK 제약, nullable) 컬럼이 있습니다. `name`은 나머지 세 필드와 동일하게 선택 입력이며(가입 시 비워도 서비스 이용에 지장 없음, 나중에 프로필 화면에서 채울 수 있음), 관리자 사용자 관리 화면(목록/상세)에도 함께 노출됩니다(`components/user-admin-table.tsx`, `components/user-admin-detail.tsx`). 아바타는 이미지 업로드가 아니라 `lib/constants/avatars.ts`의 `AVATAR_PRESETS`(fox/bear/cat/panda/rabbit/owl/penguin/tiger/dog/lion/koala/cow/pig/frog/monkey/unicorn/wolf/raccoon/hamster/hedgehog/chicken/duck/butterfly/turtle 24종, 이모지 + 배경색 조합) 중 하나를 선택하는 방식이라 별도 Storage 버킷이 필요 없습니다.
- **프리셋 목록은 두 곳에서 반드시 동기화**해야 합니다: (1) `lib/constants/avatars.ts`의 `AVATAR_PRESETS`(런타임 선택지), (2) DB의 `profiles_avatar_key_check` CHECK 제약. 프리셋을 추가/제거하면 마이그레이션도 함께 적용할 것.
- **아바타 선택 UI는 `components/avatar-picker-dialog.tsx`(`AvatarPickerDialog`)로 공통화**되어 있습니다 — 현재 아바타를 보여주는 트리거 버튼(`ui/dialog`의 `DialogTrigger`)을 누르면 24개 프리셋을 그리드로 보여주는 `Dialog`가 열리고, 하나를 클릭하면 즉시 값이 반영되며 다이얼로그가 자동으로 닫힙니다. `value`/`onChange` prop만 받는 순수 컴포넌트라 `components/profile-form.tsx`(RHF `FormField`)와 `components/sign-up-form.tsx`(일반 `useState`) 양쪽에서 동일하게 재사용됩니다.
- 전화번호 자동 하이픈 포맷은 `lib/utils.ts`의 `formatPhoneNumberInput()`이 담당합니다 — 숫자만 남기고 3-4-4자리로 잘라 `-`를 삽입합니다. `components/profile-form.tsx`/`components/sign-up-form.tsx`의 전화번호 입력 모두 `onChange`에서 이 함수를 거쳐 값을 저장하므로 사용자는 숫자만 입력해도 자동으로 하이픈이 붙습니다.
- `components/profile-form.tsx`는 처음 이 필드들(전화번호·아바타·자기소개 3종, 이후 이름 추가로 4종)이 도입되며 기존 수동 `useState` 기반 폼에서 **React Hook Form + Zod**(`lib/schemas/profile.ts`)로 전환되었습니다 — `weekly-log-form.tsx`와 동일한 `useForm` + `zodResolver` + shadcn `Form`/`FormField`/`FormMessage` 패턴을 따릅니다.
- **`components/sign-up-form.tsx`에도 동일한 네 필드(모두 선택 입력)가 있습니다** — 단 이 폼은 다른 인증 폼들과 마찬가지로 RHF를 쓰지 않고 기존 수동 `useState` 패턴을 유지하며, 전화번호 유효성만 `profileSchema.shape.phone_number.safeParse()`로 재사용해 검증 로직을 이중으로 작성하지 않습니다. `supabase.auth.signUp()` 성공 후 `handle_new_user` 트리거가 이미 만들어 둔 `profiles` row에 이 값들을 곧바로 `update()`하며, 이 2차 업데이트가 실패해도 계정 생성 자체(및 페이지 이동)는 막지 않습니다 — 선택 입력이라 나중에 `/protected/profile`에서 채울 수 있기 때문입니다.
- **헤더에도 아바타가 노출**됩니다 — `components/header-nav.tsx`(데스크탑)와 `components/mobile-nav.tsx`(모바일 시트)가 `profiles.avatar_key`를 함께 조회해 렌더링합니다. 이 헤더는 `components/site-header.tsx`를 통해 전 페이지에서 공유되므로, 별도 처리 없이 모든 보호된 페이지에 자동 반영됩니다.
- **데스크탑 헤더의 계정 영역(아바타·이메일·역할 배지·프로필 링크·로그아웃)은 `components/user-account-menu.tsx`(`UserAccountMenu`)로 통합된 드롭다운 하나**입니다(ad hoc, 서로 다른 스타일로 나열돼 산만하다는 피드백에 따른 정리 — 모바일은 이미 `MobileNav`의 Sheet로 그룹화돼 있어 영향 없음). `components/logout-button.tsx`는 로그아웃 로직(`signOut()` + 하드 네비게이션, 위 인증 흐름 6번 규칙 그대로 유지)은 하나로 두고 `variant="button" | "menu-item"`으로 렌더링만 분기해 이 드롭다운 안에서 `DropdownMenuItem`으로도 재사용됩니다.
- `app/auth/login/page.tsx`/`app/auth/sign-up/page.tsx`의 카드 폭은 사용자 요청으로 반응형 확장을 시도했다가(`max-w-sm sm:max-w-md md:max-w-lg` → `max-w-5xl`) 다시 원래의 고정 `max-w-sm`으로 되돌렸습니다 — 이 두 페이지는 프로필 화면과 달리 좁고 짧은 로그인/회원가입 폼이라는 피드백에 따른 결정이므로, 임의로 다시 넓히지 말 것.

### 관리자 콘솔 (대시보드·조직 관리·부서 관리·업무 타입 관리·사용자 관리)

- `/protected/admin/*`는 `app/protected/admin/layout.tsx`가 `lib/auth/require-admin.ts`의 `requireAdmin()`으로 가드합니다(부서 게이트 → `profiles.role === 'admin'` 확인 순서). `proxy.ts`가 아니라 **레이아웃 레벨**에서 처리하는 이유는 요청당 `profiles` 조회가 이미 있어 proxy에서 중복 조회할 필요가 없기 때문입니다. `cacheComponents: true` 하에서 `requireAdmin()`을 Suspense 밖에서 직접 `await`하면 콘솔 에러가 나므로, `AdminLayout`은 얇은 동기 컴포넌트로 두고 내부의 `<Suspense>`로 감싼 비동기 가드 컴포넌트에서 호출합니다. `components/admin-tab-nav.tsx`의 `TABS`가 대시보드/조직 관리/부서 관리/업무타입 관리/사용자 관리 5개 탭을 정의하고, `app/protected/admin/page.tsx`(`/protected/admin` 인덱스)는 대시보드 탭으로 리다이렉트합니다. **모든 탭의 조회·쓰기는 관리자 소속 조직으로 범위가 제한**됩니다 — 자세한 내용과 근거는 위 "조직(organizations) 계층과 관리자 콘솔의 조직 범위 제한" 절 참고.
- **대시보드**(`app/protected/admin/dashboard/page.tsx`, `lib/queries/stats.ts`) — 원래 `/protected/dashboard`에서 전 사용자 공개로 구현됐다가, 진입점이 헤더와 목록 페이지에 흩어져 있다는 피드백에 따라 **관리자 전용으로 전환**되어 이 경로로 이전했습니다. `AdminLayout`의 `requireAdmin()` 가드가 이미 이 라우트를 관리자 전용으로 막고 있어 페이지 자체에는 별도 가드나 부서 게이트 코드가 없습니다(있었다면 중복). 부서별·기간별·상태별·업무타입별·중요도별 집계는 `stats_*` RPC 함수(`SECURITY INVOKER`, `weekly_logs`의 전 부서 공개 SELECT RLS를 그대로 적용받음)를 통해 서버에서 조회하며, 전부 `org_id` 파라미터를 받아 "전체 부서" 조회를 선택해도 관리자 소속 조직 밖 데이터가 섞이지 않게 합니다.
- **조직 관리**(`app/protected/admin/organizations/page.tsx`, `lib/actions/organization.ts`) — 관리자 소속 조직 1건만 보여주는 단일 카드이며, 이름 수정과 비활성화/활성화만 가능합니다(생성·삭제 UI 없음, 위 조직 범위 제한 절 참고).
- **부서 관리**(`app/protected/admin/departments/page.tsx`, `lib/actions/department.ts`) — 기본 동작은 **비활성화(소프트 삭제)**이며, `departments.archived_at`(nullable)로 표현합니다. 하드 삭제는 부서원(`profiles`) 또는 `weekly_logs` 참조가 0건일 때만 UI에서 허용되고(참조가 있으면 삭제 버튼만 비활성화, 별도 안내 문구는 사용자 요청으로 제거됨), `deleteDepartmentAction`이 경합으로 `23503`(FK 위반)을 받으면 그 시점에 다시 참조 수를 세어 `lib/format.ts`의 `formatDepartmentDeleteBlockedMessage()`로 에러 토스트를 띄웁니다(이 함수는 더 이상 사전 안내 UI에는 쓰이지 않고, 경합 상황의 에러 메시지 생성에만 남아 있음). `23505`(이름 중복)는 "이미 존재하는 부서명입니다."로 변환. 비활성 부서는 신규 선택 목록(프로필/회원가입)에서는 제외하되 이미 그 부서인 사용자에게는 "(비활성)" 라벨로 계속 노출하고, 목록 필터에서는 과거 데이터 조회를 위해 항상 노출합니다.
- **업무 타입 관리** — 위 "업무 타입(work_type) 다중 선택 속성" 절 참고.
- **사용자 관리**(`app/protected/admin/users/page.tsx`, `app/protected/admin/users/[id]/page.tsx`, `lib/actions/user-admin.ts`) — `updateUserRoleAction`/`updateUserDepartmentAction` 모두 클라이언트가 보낸 값을 신뢰하지 않고 **호출자의 `profiles.role`을 서버에서 재조회**해 관리자인지 확인합니다. 자기 자신의 역할 변경은 관리자 수와 무관하게 **항상** 서버 액션에서 차단합니다 — `prevent_unauthorized_role_change()` 트리거는 "마지막 관리자"의 강등만 막고 관리자가 2명 이상이면 자기 강등을 허용하므로, 로드맵이 요구하는 "자기 강등은 항상 금지"를 만족하려면 트리거보다 넓은 조건을 서버 액션에 추가해야 합니다. 소속 부서 변경 시에는 대상 사용자가 이전 부서 로그의 쓰기 권한(RLS)을 잃는다는 경고(`formatDepartmentChangeWarning()`)를 확인 다이얼로그에 표시합니다. 역할 변경 UI(목록 인라인 + 상세 폼, `components/user-role-select.tsx`로 공유)는 `weekly-log-detail-view.tsx`의 진행상태 변경과 동일한 낙관적 업데이트(즉시 반영 → 실패 시 롤백 + 토스트) 패턴을 재사용합니다. 목록·상세 조회, 역할·소속 부서 변경 모두 조직 범위 제한이 적용됩니다(위 조직 범위 제한 절 참고).

### 댓글·멘션 (진행업무 상세 페이지)

- `weekly_log_comments`(1단계 대댓글 지원, `deleted_at`로 소프트 삭제)·`weekly_log_comment_mentions`(정규화된 멘션 테이블) 2개 테이블로 구성됩니다. **댓글 작성(INSERT)만 부서 제한이 없고 부서 무관하게 작성자 본인이면 허용**됩니다 — 이 프로젝트의 다른 모든 쓰기 정책이 따르는 부서 기반 모델(`current_department_id()`)과 의도적으로 다른 유일한 지점이며, `weekly_logs`가 이미 전 부서 SELECT 공개인 상태에서 댓글까지 부서로 막으면 "타 부서 업무에 의견을 남긴다"는 기능 자체가 무의미해지기 때문입니다. UPDATE/DELETE는 작성자 본인 또는 `is_admin()`으로 제한됩니다.
- **`profiles_select_own_or_admin` RLS 때문에 일반 사용자는 자기 자신 외의 `profiles` 행을 조회할 수 없어**, 댓글 작성자 표시와 `@` 멘션 검색이 PostgREST embed로는 동작하지 않습니다. `get_profile_identities(profile_ids uuid[])`(작성자·멘션 대상의 email/이름/아바타만 배치 조회)와 `search_mentionable_profiles(search_query text, max_results int)`(멘션 후보 검색) 2개의 `SECURITY DEFINER` RPC로 우회합니다(`is_admin()`/`current_department_id()`/`stats_*`와 동일한 컨벤션 — `anon` EXECUTE 명시적 회수 포함). `lib/actions/weekly-log-comment.ts`의 멘션 후보 검증도 처음엔 일반 `.from("profiles").select(...)` 쿼리를 썼다가 같은 RLS에 걸려 타인의 id가 조용히 0건으로 필터링되는 버그가 실측되어 `get_profile_identities`로 교체된 이력이 있습니다 — 이 패턴을 다시 일반 쿼리로 되돌리지 말 것.
- **멘션은 본문 텍스트 파싱이 아니라 별도 테이블로 정규화**됩니다. 클라이언트가 보낸 멘션 목록은 신뢰하지 않고, `createCommentAction`(`lib/actions/weekly-log-comment.ts`)이 저장된 본문에서 `@[이메일](uuid)` 토큰을 정규식으로 파싱해 `profiles`에 실존하는 id만 `weekly_log_comment_mentions`에 삽입합니다. `components/mention-input.tsx`가 `@` 입력을 감지해 이 토큰을 삽입하고, `components/weekly-log-comment-section.tsx`의 `CommentContent`가 저장된 토큰을 다시 파싱해 `ui/badge`로 렌더링합니다(멘션 대상이 본인이면 강조 스타일).
- **댓글 본문은 HTML을 전혀 허용하지 않습니다** — 진행업무 본문(`weekly_logs.content`)과 달리 `lib/sanitize-html.ts`의 `sanitizeCommentContent()`는 `ALLOWED_TAGS: []`로 모든 태그를 제거하고 plain text만 남깁니다(리치 텍스트 대비 공격면이 작다는 판단). 저장 시점(서버 액션)에서 한 번 sanitize하고 렌더링은 React의 자동 이스케이프로 이중 방어합니다.
- 대댓글이 달린 댓글을 삭제하면 스레드가 끊기므로 **물리 삭제 대신 `deleted_at`을 채우는 소프트 삭제**를 씁니다. `deleteCommentAction`은 `deleted_at` UPDATE만 수행하며, 삭제된 댓글은 "삭제된 댓글입니다" placeholder로 자리만 유지한 채 렌더링됩니다(`components/weekly-log-comment-section.tsx`).
- **목록 페이지의 댓글수 표시**(`app/protected/weekly-logs/page.tsx`)는 `weekly_logs` select에 join할 수 없어(별개 테이블) 조회된 로그 id들로 `weekly_log_comments`를 2차 조회해 Map으로 집계한 뒤 병합합니다. `deleted_at is null`인 행만 세므로(삭제된 댓글은 실제 내용이 없어 집계에서 제외), `components/weekly-log-table.tsx`/`components/weekly-log-card.tsx`는 `comment_count > 0`일 때만 제목 옆에 `(N)`을 표시합니다.
- **목록의 부서 컬럼은 작성자 아바타+이름으로 대체되어 있습니다(ad hoc)** — 목록에서는 부서보다 담당자가 누구인지가 더 유용하다는 판단으로, `weekly-log-table.tsx`/`weekly-log-card.tsx`의 부서 `Badge`를 아바타 프리셋(`lib/constants/avatars.ts`) + 작성자명(없으면 이메일, 최종 폴백 "알 수 없는 사용자") 조합으로 바꿨습니다. `showDepartment` prop은 `showAuthor`로, 정렬 키는 `department_name`에서 `author_name`으로 이름이 바뀌었습니다. `app/protected/weekly-logs/page.tsx`가 조회된 로그들의 `author_id`를 위 댓글 작성자 조회와 동일하게 `get_profile_identities` RPC로 배치 조회해 `WeeklyLogListItem`에 `author_name`/`author_email`/`author_avatar_key`로 병합합니다(신규 RPC 없음, `profiles_select_own_or_admin` RLS 때문에 embed로는 타인 신원을 가져올 수 없어 기존 함수를 재사용). 부서 자체는 삭제되지 않고 상세 페이지·부서 필터·PDF/Excel에는 계속 노출됩니다.

### 실시간 알림 (Supabase Realtime, 헤더 알림 벨)

- `notifications` 테이블은 **이 프로젝트에서 부서가 아니라 수신자 개인 기준으로 RLS를 적용하는 유일한 테이블**입니다 — SELECT/DELETE는 `recipient_id = (select auth.uid())`인 본인 것만, UPDATE는 본인이 `read_at`만 바꿀 수 있고(다른 컬럼 변경은 `notifications_protect_columns` `BEFORE UPDATE` 트리거로 차단, `profiles.role` 보호 트리거와 동일한 컬럼 보호 패턴), **INSERT는 클라이언트에 전혀 허용하지 않습니다**(v2에서도 이 원칙은 그대로 유지 — 아래 참고).
- **알림 행 생성 경로는 v2부터 2종입니다.** (1) `weekly_log_comments`의 `notify_on_new_comment()`(작성자에게 `comment`/`reply` 알림)와 `weekly_log_comment_mentions`의 `notify_on_comment_mention()`(멘션 대상에게 `mention` 알림) 두 `AFTER INSERT` `SECURITY DEFINER` 트리거(함수명이 `weekly_log_comments_notify` 등으로 잘못 기록돼 있었던 과거 오기를 이번에 바로잡음 — `pg_proc` 실측 기준). (2) **(v2, ad hoc, F041)** 매주 금요일 `pg_cron`이 호출하는 `create_weekly_log_reminders()`가 만드는 `reminder` 알림 — 아래 "정기 작성 리마인더" 절 참고. 두 경로 모두 자기 자신에게는 알림을 만들지 않습니다. 클라이언트가 알림을 직접 만들 방법이 없으므로 `lib/actions/notification.ts`의 서버 액션은 읽음 처리(`markNotificationReadAction`/`markAllNotificationsReadAction`)만 담당합니다.
- **알림 유형은 4종**(`mention`/`comment`/`reply`/`reminder`, v2에서 `reminder` 추가)입니다. `reminder`를 담기 위해 `actor_id`(행위자가 없는 스케줄 알림)와 `weekly_log_id`(아직 존재하지 않는 로그에 대한 알림)가 **nullable로 완화**되어 있습니다 — 이로 인해 `lib/queries/notifications.ts`의 `RawNotificationRow`, `hooks/use-notifications.ts`의 Realtime INSERT 페이로드 타입, `components/notification-bell.tsx`의 `notificationHref()`(둘 다 null이면 `/protected/weekly-logs/new`로 이동) 3곳이 nullable을 전제로 작성돼 있습니다. 새 알림 관련 코드를 추가할 때 `actor_id`/`weekly_log_id`가 null일 수 있다는 가정을 빠뜨리지 마세요.
- **알림 유형별 on/off 게이트(v2, ad hoc, F044)** — `profiles.notify_on_comment`/`notify_on_mention`/`notify_on_reminder`(모두 `boolean not null default true`) 3개 컬럼이 있고, 위 트리거·함수가 알림 행을 만들기 직전에 수신자의 해당 컬럼을 확인해 `false`면 행 생성을 건너뜁니다. **`reply` 유형은 별도 컬럼이 없고 `notify_on_comment`를 따릅니다**(대댓글은 댓글의 하위 개념이라는 판단). **게이트는 "알림 행을 만들지 않는다"까지만** — 댓글 작성·멘션 저장·리마인더 대상 판정 등 원 기능은 절대 막지 않습니다(트리거는 항상 `return new`를 유지). 설정 UI는 `components/notification-preferences-field.tsx`(프로필 화면).
- `notifications_recipient_comment_unique(recipient_id, comment_id)`로 댓글·멘션 알림의 중복을 억제합니다. **리마인더는 이 제약을 쓸 수 없습니다** — `comment_id`가 NULL이면 Postgres가 NULL끼리도 서로 다른 값으로 취급해 유니크 제약이 전혀 동작하지 않기 때문에, `period_start date`(리마인더 대상 주 시작일) 컬럼과 `unique (recipient_id, period_start) where type = 'reminder'` 부분 유니크 인덱스를 별도로 둡니다. NULL이 섞이는 새 유형을 추가할 때는 이 함정을 다시 확인하세요.
- **Realtime publication(`supabase_realtime`)에는 `notifications` 테이블 하나만 등록**되어 있습니다 — 다른 테이블은 Postgres Changes를 흘리지 않습니다. 새 테이블을 실시간으로 구독해야 할 일이 생기기 전까지 이 publication을 넓히지 마세요.
- **구독은 `hooks/use-notifications.ts` 한 곳에서만** 이뤄지며, 반드시 브라우저 클라이언트(`lib/supabase/client`)를 씁니다(서버 클라이언트로는 구독 불가, 위 "Supabase 클라이언트 3종" 규칙). 핵심 규칙:
  - **채널 정리 필수** — `useEffect` 클린업에서 `supabase.removeChannel(channel)`을 반드시 호출합니다. 누락하면 라우트 이동마다 채널이 누적돼 커넥션이 고갈됩니다(이 프로젝트 최초의 Realtime 사용처라 특히 주의). 사용자당 채널 1개(`notifications:${userId}`, `recipient_id=eq.${userId}` 필터)만 열립니다.
  - **초기 데이터는 SSR 시드, 훅은 증분만** — 헤더 서버 컴포넌트(`components/site-header.tsx` → 알림 벨)가 초기 목록·안 읽은 개수를 내려주고, 훅은 그 위에 얹히는 신규 INSERT만 처리합니다(마운트 시 전체 재조회 안 함). `unreadCount`는 최근 10건 목록에서 역산하지 않고 별도로 추적합니다(11번째 이전의 안 읽은 알림이 과소 집계되지 않도록).
  - **연결 끊김은 조용히 폴링 폴백** — `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED` 시 에러 토스트로 사용자를 방해하지 않고 60초 폴링으로 폴백하며, 재구독(`SUBSCRIBED`)되면 폴링을 정리합니다. 알림은 배지 하나짜리 저위험 기능이라는 판단(로드맵 명시 — 에러 토스트 금지).
  - **읽음 처리는 낙관적 업데이트** — 진행상태·역할 변경과 동일하게 즉시 반영 후 서버 액션 실패 시 롤백합니다(`markAllRead`의 부분 실패만 개별 롤백 대신 `resync()`로 서버 진실을 재조회).
- 보존 정책(읽은 알림 90일 경과분만 수동 삭제, 읽지 않은 알림은 영구 보존)은 `docs/guides/deployment-ops.md` 7절 참고 — **v2로 `pg_cron`이 도입됐지만(아래 절 참고) 이 보존 정책 자체는 여전히 수동**입니다(자동 정리 잡으로 전환하지 않기로 결정, 근거는 `deployment-ops.md` 7절).

### 정기 작성 리마인더 (pg_cron, v2 ad hoc, F041)

- **이 프로젝트 최초의 `pg_cron` 도입**입니다(v1의 "Realtime 최초 도입"과 동일한 성격의 인프라 리스크로 취급해 착수). `cron.job`에 `weekly_log_reminder` 잡 1개만 등록되어 있고(`schedule: '0 6 * * 5'` = 매주 금요일 06:00 UTC = 15:00 KST), `select public.create_weekly_log_reminders()`를 호출합니다. **`cron.schedule()` 호출은 마이그레이션 파일에도 `mcp__supabase__list_migrations` 이력에도 남지 않으므로**, 잡 등록 여부·스케줄 확인은 반드시 `execute_sql`로 `cron.job`/`cron.job_run_details`를 직접 조회하세요(운영 절차는 `docs/guides/deployment-ops.md` 신규 절 참고).
- **이 Supabase 프로젝트는 진행업무 도메인 외에 별도 ERP 도메인과 DB를 공유**합니다(`departments`/`profiles`/`weekly_logs` 등 외에 `menus`/`companies`/`products`/`org_*` 등 19종 테이블이 함께 있음). `pg_cron`은 데이터베이스 전역 자원이라, 새 cron 잡을 추가하기 전에 항상 `select jobname from cron.job`으로 기존 잡과 이름이 충돌하지 않는지 먼저 확인하세요. 반대로 **기존에 등록된 `weekly_log_reminder` 잡을 삭제·재스케줄할 때도 이 잡이 유일하게 이 도메인 소유임을 확인하고, `cron.job`을 통째로 비우는 조작은 절대 하지 마세요**(다른 도메인이 이미 잡을 등록했을 수 있음).
- `create_weekly_log_reminders(target_week_start date default null)`는 `SECURITY DEFINER`이며 `authenticated`/`anon` 모두 EXECUTE 권한이 없습니다(`postgres`/`service_role`만) — 클라이언트는 이 경로를 호출할 수 없고, "알림은 클라이언트가 INSERT할 수 없다"는 원칙은 스케줄 알림에도 그대로 적용됩니다.
- **"이번 주" 기준은 `now() at time zone 'Asia/Seoul'`로 함수 내부에서 명시적으로 계산**합니다(Postgres 세션 타임존이 아니라 항상 KST 고정) — Node의 `new Date()`로 계산하는 칸반·F040 위젯과 어긋나지 않게 하려는 의도이며, 세션 타임존을 바꿔도 결과가 달라지지 않음이 실측 확인되어 있습니다.
- **"미작성" 정의는 "기간이 겹치는 항목"**(v1 Task 029의 검색·필터 관례를 재사용)입니다. 수신자 필터는 `department_id is not null AND notify_on_reminder = true AND is_active = true`로 — **`profiles.is_active`는 이 앱 소스에서 유일하게 참조하는 지점**입니다(다른 곳에서는 사용처 0건, ERP 도메인이 추가한 "ERP 로그인 허용 여부" 플래그라 로그인 자체가 막힌 계정에 작성 독려 알림을 보내는 것이 무의미하다는 판단으로 리마인더에서만 존중).
- **중복 방지는 `period_start`(이번 주 월요일) + `on conflict (recipient_id, period_start) where type='reminder' do nothing`**으로 처리합니다 — 같은 주에 여러 번 실행돼도 사용자당 알림이 1건을 넘지 않습니다.
- 컬럼 보호 트리거(`notifications_protect_columns`)는 `BEFORE UPDATE`에만 걸려 있어 이 함수의 INSERT 경로에는 `set_config`로 우회할 필요가 없습니다(기존 댓글·멘션 notify 함수 2종과의 차이점).

### 브라우저 저장소 (localStorage, v2 ad hoc)

- **이 프로젝트 최초의 브라우저 스토리지 도입**입니다(그전까지 `localStorage`/`sessionStorage` 사용처 0건). 두 곳에서 사용합니다 — 작성 중 임시저장(F042, `hooks/use-weekly-log-draft.ts`, 키 `weekly-log-draft:new:{userId}`)과 목록·칸반 필터 프리셋 저장(F045, `hooks/use-filter-presets.ts`, 키 `weekly-log-filter-presets:{userId}`). 안전 접근 래퍼(`safeLocalStorageGet`/`Set`/`Remove`, `try/catch`로 감싸고 도메인 지식 없음)는 `lib/storage/local-storage.ts`에 있고, 새로운 `localStorage` 사용처를 추가할 때는 반드시 이 래퍼를 재사용하세요.
- **반드시 지킬 규약** — (1) 키는 **사용자 id로 네임스페이스**(공용 PC에서 다른 사용자의 값이 보이면 안 됨, `userId`는 클라이언트가 세션을 다시 읽지 않고 서버 컴포넌트가 이미 확보한 값을 prop으로 내려받아 사용), (2) 모든 읽기/쓰기는 **`useEffect` 안에서만** 접근(렌더 중 접근 시 SSR 하이드레이션 불일치 발생), (3) **모든 접근을 `try/catch`로 감쌀 것**(프라이빗 모드·스토리지 차단 브라우저는 접근 자체가 throw), (4) 실패해도 **에러 토스트 없이 조용히 기능만 비활성화**(보조 기능은 조용히 실패하는 v1 Task 035 Realtime 폴백과 동일 원칙), (5) 손상된 JSON은 조용히 폐기.
- **작성 중 임시저장(F042)**: 신규 작성 폼의 9개 필드(첨부파일 제외 — `File` 객체는 직렬화 불가)를 `watch()` + 약 1초 debounce로 저장. 복원은 자동이 아니라 배너의 [복원]/[삭제] 명시적 선택이며, **복원 경로는 `form.reset()`이 아니라 `key`를 바꿔 `WeeklyLogForm`을 리마운트**하는 방식입니다(`components/html-editor.tsx`의 Tiptap 에디터가 `content` prop 변경을 동기화하는 로직이 없어 `form.reset()`만으로는 본문이 반영되지 않기 때문 — 이 워크어라운드를 걷어내지 마세요). **복원한 `content`는 에디터에 주입하기 전 `sanitizeWeeklyLogContent()`를 한 번 더 통과**시킵니다(브라우저 저장소는 신뢰할 수 없는 입력). 배너용 `hasDraft`/`savedAt`은 `useEffect`+`setState`가 아니라 **`useSyncExternalStore`**로 구현되어 있습니다(`react-hooks/set-state-in-effect` ESLint 규칙 회피 + 하이드레이션 불일치 방지, `hooks/use-weekly-log-draft.ts`의 패턴 — `hooks/use-filter-presets.ts`(F045)도 동일 패턴을 재사용) — `subscribe`는 영구 no-op이라 배너는 "재진입 시 1회 확인"만 하고 타이핑 중 자동 저장마다 반응하지 않습니다.
- **필터 프리셋 저장(F045)**: 목록·칸반 공용 `components/weekly-log-filter-presets.tsx`. 저장 대상은 필터 파라미터(`department`/`status`/`q`/`from`/`to`/`author`)만이고 정렬·페이지 상태는 제외합니다. 최대 10개, 이름 1~30자, 같은 이름 저장 시 덮어쓰기 확인 다이얼로그.

### 변경 이력 (weekly_log_change_history, v2 ad hoc, F043)

- 상세 페이지에서 낙관적 업데이트로 즉시 인라인 저장되는 **진행상태·업무타입·업무중요도 3개 속성만** 추적하는 **최소 버전** 이력입니다(제목·본문 등 나머지 컬럼, 되돌리기(revert) 기능은 범위 밖 — 본문은 HTML이라 diff 저장이 곧 풀 감사로그로 번지기 때문에 의도적으로 제외).
- **기록은 오직 `AFTER UPDATE OF status, work_type, importance` `SECURITY DEFINER` 트리거(`record_weekly_log_change_history()`)로만** 이뤄지며, `IS DISTINCT FROM`으로 실제 값이 바뀐 경우에만 기록합니다. 인라인 편집이든 전체 수정 폼("수정" 버튼)이든 호출 경로와 무관하게 컬럼 값이 바뀌면 항상 발화합니다.
- **RLS는 `notifications`와 동일한 관례** — SELECT 정책만 존재(`to authenticated using (true)`, 전 인증 사용자 공개 — `weekly_logs`가 이미 전 부서 SELECT 공개인 원칙과 동일선상)하고 **INSERT/UPDATE/DELETE 정책은 의도적으로 만들지 않습니다.** 클라이언트가 어떤 경로로도 이력을 위조·수정·삭제할 수 없습니다("RLS 켜짐 + 정책 없음 = 조용한 0건" 원칙, v1 Task 026에서 실측).
- 이 `SECURITY DEFINER` 트리거 함수는 `revoke ... from public`만으로는 `anon`/`authenticated`의 직접 RPC 호출 경고가 사라지지 않았습니다(Supabase가 함수 생성 시 이 두 역할에 개별 grant를 하는 것으로 실측됨) — `notify_on_new_comment()` 등 기존 함수의 `proacl`(postgres/service_role만)과 대조해 `anon`/`authenticated`에서 각각 명시적으로 재차 `revoke`해야 경고가 사라집니다. 새 `SECURITY DEFINER` 함수를 추가할 때 `get_advisors`(security)로 이 패턴이 남아있는지 항상 확인하세요.
- UI는 상세 페이지의 접이식 섹션(`components/weekly-log-change-history.tsx`, `ui/collapsible`, 기본 접힘, 댓글 섹션 바로 위)이며, 조회는 `lib/queries/weekly-log-history.ts`(`get_profile_identities` RPC로 변경자 배치 조회, 최근 50건 상한). 한글 라벨을 동적으로 문장에 조합할 때 조사(을/를)가 받침 유무에 따라 틀리는 문제가 있었는데, `lib/utils.ts`의 `getObjectParticle()`(완성형 유니코드 받침 판별)로 해결했습니다 — 다른 화면에서도 라벨을 문장에 동적으로 넣을 때 재사용하세요.

### 추천/비추천 (weekly_log_reactions, F031)

- `weekly_log_reactions`는 **댓글(`weekly_log_comments`)과 동일하게 부서 조건을 걸지 않는 두 번째 지점**입니다 — SELECT는 전 인증 사용자 공개, INSERT/UPDATE/DELETE는 `user_id = (select auth.uid())`인 **본인 행만**(부서 조건·관리자 예외 없음). `weekly_logs`가 이미 전 부서 SELECT 공개이고 댓글 작성도 부서 무관인 상태에서 반응만 부서로 막으면 "타 부서 업무에 반응한다"는 기능이 성립하지 않기 때문입니다(Task 032 판단 재사용, 마이그레이션 테이블 주석에 근거 명시).
- **1인 1표 토글**은 `unique(weekly_log_id, user_id)`로 DB가 강제합니다. `lib/actions/weekly-log-reaction.ts`의 `toggleWeeklyLogReactionAction`이 유일한 진입점이며, 기존 내 반응을 조회해 (없으면) insert / (같은 반응) delete(해제) / (반대 반응) update(전환 — 새 행을 만들지 않음)로 분기합니다. **클라이언트가 보낸 카운트는 신뢰하지 않고** 토글 후 서버에서 재집계한 `summary`(익명 up/down 건수 + 내 반응)를 반환합니다.
- **자기 글 투표는 허용**(작성자 검사 없음), **관리자 예외 없음**(DELETE도 본인 행만) — 수락 기준 "타인의 반응은 어떤 경로로도 조작할 수 없다"와 정합. RLS가 본인 행만 허용하므로 서버 액션이 별도 소유권 재검증을 하지 않아도 안전합니다.
- **집계 조회**(`lib/queries/reactions.ts`)는 두 갈래: 상세 페이지는 단건(up/down + 내 반응), 목록은 **댓글수(`comment_count`)와 동일하게 페이지 로그 id들로 2차 조회 후 Map 병합**(익명 건수만). `weekly_logs`에 카운터 컬럼을 비정규화하지 않습니다. **명단은 공개하지 않으므로**(익명 집계) 댓글 작성자 표시와 달리 `get_profile_identities` RPC 경유가 필요 없습니다.
- **UI**: 상세 페이지 버튼(`components/weekly-log-reaction-buttons.tsx`)은 **canWrite 게이트 없이 전 로그인 사용자에게 노출**되고 진행상태·중요도와 동일한 낙관적 업데이트(성공 시 서버 재집계값으로 확정, 실패 시 롤백 + 토스트, `isPending` 중 `disabled`로 연타 차단)를 씁니다. 목록의 읽기 전용 집계는 `components/weekly-log-reaction-counts.tsx`(둘 다 0이면 미표시). 대시보드는 `components/dashboard-reaction-chart.tsx` + `stats_reactions_summary` RPC(다른 `stats_*`와 동일하게 SECURITY INVOKER·`org_id` 파라미터·0건도 up/down 2행 반환).

### 공개 정보/쇼케이스 페이지 (푸터 진입, F036~F038 ad hoc)

- 공통 푸터(`components/site-footer.tsx`)에서 진입하는 **공개 페이지 3종**입니다: `/component-gallery`, `/icon-gallery`, `/tech-stack`. 세 페이지 모두 `app/<name>/page.tsx`(서버, 헤더·전역 레이아웃만 담당) + `components/<name>-view.tsx`(클라이언트 뷰) 구조를 공유하지만, 각 갤러리의 실제 데이터 구성 방식은 아래처럼 서로 다르게 진화했습니다(모두 다른 사이트(`erp-01-mu.vercel.app`)의 동급 페이지를 참고해 재작성된 이력이 있음, 카테고리 표시 방식만 기존 그대로 유지).
- **새 공개 페이지를 추가할 때 반드시 두 가지를 함께 처리**할 것: (1) `lib/supabase/proxy.ts`의 비로그인 리다이렉트 예외 조건에 경로를 추가(`!pathname.startsWith("/<route>")`) — 안 하면 랜딩 푸터에서 비로그인 진입 시 `/auth/login`으로 튕깁니다. (2) 페이지에서 `<LandingHeader/>`(쿠키를 읽는 `getClaims` 호출 포함)를 **`<Suspense fallback={null}>`로 감쌀 것** — `cacheComponents: true` 하에서 Suspense 밖의 동적 데이터 접근은 프로덕션 빌드를 실패시킵니다("Uncached data ... outside of `<Suspense>`", 랜딩 페이지 `app/page.tsx`와 동일 패턴).
- **`/component-gallery`**는 더 이상 shadcn 문서로 연결되는 링크 카드 목록이 아니라 **실제로 동작하는 라이브 데모**입니다. `components/component-gallery/tab-*.tsx` 10개 파일(버튼&배지·폼 입력·오버레이&메뉴·내비게이션·레이아웃·피드백·데이터 표시·차트·AI 채팅 요소·추가 확장 컴포넌트)에 컴포넌트별 데모가 하드코딩되어 있고, `components/component-gallery-view.tsx`가 이 10개를 `Tabs`로 묶습니다(`lib/constants/component-gallery.ts`는 탭 id/label만 담음 — 링크 카탈로그였던 이전 버전과 달리 데모 내용은 데이터 주도가 아님). 이 개편으로 `components/ui/`에 button-group·combobox·field·tabs·sidebar·message/bubble/attachment 등 AI 채팅 프리미티브를 포함한 shadcn 컴포넌트 38종과 커뮤니티 `tree-view`, `@tanstack/react-table`이 새로 추가됐습니다.
- **`/icon-gallery`**는 `lucide-react/dynamic`의 `DynamicIcon`(아이콘 1개당 별도 dynamic import) 대신 **`import * as LucideIcons from "lucide-react"` 정적 배럴 import**로 렌더링합니다 — 아이콘이 2천 개가 넘어 전체 보기 시 수천 개의 청크를 동시 요청하면 안 되기 때문입니다(이 페이지 코드에만 국한, 나머지 앱 번들에는 영향 없음). `lib/constants/icon-gallery.ts`는 lucide-react(v1.30.0 기준 2,022개) 전체 아이콘을 이름 키워드로 자동 분류한 카탈로그(스크립트로 생성, 완벽한 수작업 큐레이션 아님 — 분류 기준을 바꾸려면 재생성 필요). 클릭 시 더 이상 lucide.dev로 이동하지 않고 `import { PascalName } from "lucide-react";` 문자열을 클립보드에 복사합니다(`navigator.clipboard` + `sonner` 토스트).
- **`/tech-stack`**은 더 이상 `package.json`을 그대로 나열하며 npm 최신/설치 버전을 조회하지 않습니다 — `lib/queries/npm-versions.ts`(registry fetch + `"use cache"`/`cacheLife`)는 삭제되었습니다. 대신 `lib/constants/tech-stack.ts`에 실제로 눈에 띄는 기술만 고른 **큐레이션 정적 목록**(버전 배지·npm 링크·검색 없음)과, 아직 도입 전인 배포/CI 도구를 담은 `PLANNED_TECH_STACK`("예정" 배지로 구분)이 있습니다.
- 세 페이지의 **카테고리 표시 방식은 서로 다릅니다** — `/component-gallery`는 `Tabs`(세그먼트 컨트롤), `/icon-gallery`는 기존부터 있던 **상단 필터 버튼 목록**(전체 포함, 클릭 시 그 카테고리만 노출 — 아이콘 갯수가 대폭 늘었어도 이 UI만은 명시적으로 그대로 유지), `/tech-stack`은 필터 없이 카테고리를 전부 세로로 나열(카테고리 수가 적어 필터가 불필요). 세 페이지가 한때 동일한 "버튼 필터 + 검색 + 링크 카드" 패턴을 공유했던 이력이 있으니, 어느 한 페이지의 카테고리 UI를 다른 페이지에 그대로 옮기지 말 것.

### 목록 총 건수 표시 (무한 스크롤 목록, F039 ad hoc)

- 진행업무 목록·관리자 사용자 관리는 무한 스크롤이라 화면엔 일부만 로드됩니다. 현재 필터 조건에 맞는 **총 건수**는 별도 count 쿼리로 조회합니다 — `countWeeklyLogs()`(`lib/queries/weekly-logs.ts`), `countUsers()`(`lib/queries/user-admin.ts`).
- **필터 로직은 목록 조회와 반드시 공유**할 것: 각 쿼리 파일의 `applyScalarFilters`/`applyUserFilters` 제네릭 헬퍼가 목록 빌더와 count 빌더 양쪽에 동일한 필터를 적용합니다(한쪽만 바꾸면 화면 목록과 "총 N건"이 어긋남). 검색어 없는 경우는 `.select("id", { count: "exact", head: true })`로 행 미조회 정확 건수, 진행업무의 **제목/내용 OR 검색은 두 `.ilike()`의 id 합집합 크기**(`.or()` 미사용 관례 유지 — 위 "검색 필터 작성 시 주의사항" 절 참고).
- 페이지가 `count`를 서버에서 계산해 뷰에 prop으로 내려주므로, 필터/검색 soft navigation 시 서버 재조회로 자동 갱신됩니다. 표시 위치는 필터 행 오른쪽 우측 정렬(`ml-auto`), 필터 적용 여부에 따라 "총 …"/"조건에 맞는 …" 문구를 분기합니다.

### "내 업무" 개인 요약 위젯과 "지연" 판정 규칙 3중 일치 (v2 ad hoc, F040)

- 진행업무 목록 페이지 상단에 지연/이번 주 마감/진행중 3분할 카드(`components/my-work-summary-widget.tsx`)가 있고, 목록·칸반과 **별도의 `<Suspense>` 경계**로 감싸 위젯 집계 실패가 목록 스트리밍을 막지 않게 합니다. 집계는 `stats_my_work_summary(author_id_param, today_param)` RPC(기존 `stats_*` 7종과 동일한 `security invoker`/`anon` EXECUTE 회수 컨벤션) 1회 호출이며, `lib/queries/stats.ts`의 `getMyWorkSummary()`는 실패해도 예외를 던지지 않고 0 폴백 + 콘솔 로그만 남깁니다.
- **"지연" 판정 규칙(`status <> 'completed' and target_end_date < today`)은 칸반보드(`components/weekly-log-kanban-column.tsx`) · 이 위젯 · F047 타임라인 뷰 3곳에서 문자 그대로 동일해야 합니다.** 한 곳만 바뀌면 사용자가 화면마다 다른 지연 건수를 보게 됩니다 — 이 판정 로직을 손볼 때는 반드시 3곳을 함께 확인하세요. RPC 내부에서 `current_date`를 직접 참조하지 않고 **`today_param`을 호출부(Node의 `new Date()` 기준)에서 파라미터로 받는 이유**도 동일합니다 — Postgres 세션 타임존(기본 UTC)과 서버 로컬 시각이 어긋나면 KST 사용자 기준으로 최대 하루 오차가 생기기 때문입니다.
- **`author` 필터 축**이 `WeeklyLogsSearchParams`/`normalizeWeeklyLogFilters()`/`applyScalarFilters()`에 추가되어 있습니다. `applyScalarFilters()`는 목록 조회(`fetchWeeklyLogRows`)·총 건수(`countWeeklyLogs()`)·칸반(`fetchWeeklyLogsKanban`) **3곳이 공유**하므로, 이 필터 헬퍼에 새 축을 추가하거나 수정할 때 한 곳만 고치면 화면 목록과 "총 N건"이 어긋납니다(F039에서 이미 겪은 함정, F040에서 재확인).

## Claude Code 커스텀 설정

- `.claude/agents/`에 이 저장소 전용 서브에이전트가 정의되어 있습니다. Agent 도구의 `subagent_type`으로 지정하는 이름은 파일명이 아니라 frontmatter의 `name:` 값입니다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
