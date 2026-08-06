# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Next.js 16 (App Router) + Supabase Auth 스타터 킷입니다. `@supabase/ssr`로 쿠키 기반 세션을 Client Component, Server Component, Route Handler, `proxy.ts` 전반에서 공유합니다.

MVP(부서별 주간업무일지 CRUD·조회·PDF·검색, `docs/roadmap/ROADMAP_mvp.md`)는 구현이 완료된 상태입니다. v1 고도화(`docs/ROADMAP_v1.md`)는 관리자 콘솔(부서 관리 UI·사용자 관리 UI, Phase 1), 기간 범위 검색·통계 대시보드(Phase 2), 댓글·멘션(Phase 3)까지 구현이 완료되었고, 실시간 알림(Phase 4)은 아직 구현 전입니다. Phase 3 이후에는 원래 계획에 없던 ad hoc 확장(`docs/ROADMAP_v1.md` "Phase 3 이후 ad hoc 확장" 절 참고)도 다수 추가됐습니다 — 업무 타입·업무 중요도 속성, Excel 다운로드, 조직(organizations) 계층 신설과 이를 반영한 **관리자 콘솔의 조직 범위 제한**(관리자는 자기 소속 조직만 관리), 업무 타입 관리 UI, `admin` 위에 조직 생성·전 조직 관리가 가능한 **슈퍼관리자(superadmin) 등급**과 이를 관리자 콘솔 4개 탭(대시보드·부서·업무타입·사용자 관리)까지 확장한 전 조직 범위, 주간업무일지 목록의 부서 컬럼을 작성자 아바타+이름으로 대체한 것 등. 전체 기능 명세는 `docs/PRD.md`(MVP + v1 계획 포함)를 참고하세요.

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

### 디렉토리 구조 — `src/` 없음

`app/`, `components/`, `lib/`는 모두 프로젝트 **루트**에 위치합니다 (`src/` 디렉토리 사용 안 함). 경로 별칭 `@/*`는 `tsconfig.json`에서 `./*`(루트)로 매핑됩니다. `docs/guides/`에 아키텍처/스타일/폼 처리/배포·운영에 대한 상세 가이드 6종이 있으니 관련 작업 전에 참고하세요.

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
- **`profiles.role`에는 자기 상승을 막는 `BEFORE UPDATE` 트리거(`prevent_unauthorized_role_change()`, `SECURITY DEFINER`)가 이미 적용되어 있습니다.** `profiles_update_own` 정책이 행 단위 제한만 걸려 있어(컬럼 제한 없음) 원래는 로그인한 누구나 자신의 `role`을 `admin`으로 바꿀 수 있었던 결함을 막은 것입니다 — `NEW.role`이 `OLD.role`과 다르고 **`(select auth.uid())`가 NULL이 아닌데(=PostgREST를 통한 인증된 앱 요청)** 호출자가 `is_admin()`이 아니면 예외를 던집니다. `auth.uid()`가 NULL인 연결(SQL Editor, `mcp__supabase__execute_sql` 등 직접 DB 접속)은 검사 대상이 아니므로 `docs/guides/deployment-ops.md` 4절의 수동 관리자 지정 절차는 그대로 동작합니다 — 처음 이 트리거를 `auth.uid()` 조건 없이(호출자가 `is_admin()`이 아니면 무조건 차단) 작성했다가 그 절차 자체가 막히는 회귀를 실측으로 발견해 수정한 이력이 있으니, 이 트리거를 다시 손볼 때 `auth.uid() IS NOT NULL` 조건을 빠뜨리지 말 것. 이 트리거는 마이그레이션 파일이 아니라 Supabase MCP(`apply_migration`)로 직접 적용되어 있어 로컬 `supabase/migrations/` 디렉터리에는 보이지 않으니, 스키마 확인 시 `mcp__supabase__list_migrations`나 `execute_sql`로 실측할 것. v1 고도화(`docs/ROADMAP_v1.md` Task 026~028)에서 `profiles`의 UPDATE 정책을 `own_or_admin`으로 넓히더라도 **이 트리거는 그대로 유지**해야 관리자 지정 UI가 생긴 뒤에도 자기 상승 경로가 막힌 채 유지됩니다. `role`이 이후 `superadmin`까지 3단계로 확장되며 이 트리거에 승격·강등 규칙이 추가됐습니다 — 아래 "슈퍼관리자 등급" 절 참고.

### 조직(organizations) 계층과 관리자 콘솔의 조직 범위 제한 (ad hoc)

- `departments.organization_id`(NOT NULL FK → `organizations.id`)로 부서는 반드시 하나의 조직에 속합니다(`organizations`는 `id`/`name`(unique)/`archived_at`/`created_at`만 있는 단순 테이블, `departments`와 동일한 소프트 삭제 관례). `work_types.organization_id`도 동일한 FK를 가지며, `name`은 전역이 아니라 **`(organization_id, name)` 복합 unique**라 서로 다른 조직이 같은 이름의 업무 타입을 각자 등록할 수 있습니다.
- **관리자는 원칙적으로 자기 소속 조직으로만 범위가 제한됩니다** — 조직 범위는 `profiles.department_id → departments.organization_id`로 매 요청 동적으로 결정됩니다. `current_organization_id()`(`current_department_id()`와 동일한 `SECURITY DEFINER STABLE` 컨벤션, `anon` EXECUTE 회수 포함)가 호출자의 소속 조직을 반환하며, `departments`/`work_types`의 INSERT/UPDATE/DELETE 정책과 `organizations`의 UPDATE 정책이 기존 `is_admin()` 조건에 `organization_id = current_organization_id()`(조직 자체는 `id = current_organization_id()`)를 AND로 추가해 **다른 조직의 부서·업무 타입·조직 정보를 절대 쓸 수 없게** 막습니다. **단, 아래 "슈퍼관리자 등급" 절에서 설명하듯 `organizations` 테이블 자체(생성·전 조직 범위 수정/닫기)만은 이 제한의 예외입니다** — `organizations`의 INSERT 정책은 슈퍼관리자 전용으로 존재하고, UPDATE 정책도 슈퍼관리자에게는 조직 범위 조건 없이 전 조직을 허용합니다. `departments`/`work_types`/사용자 관리 등 나머지는 슈퍼관리자에게도 여전히 자기 소속 조직으로 제한됩니다.
- **SELECT는 세 테이블 모두 건드리지 않았습니다** — 부서/업무 타입/조직 이름은 여전히 전 로그인 사용자에게 공개됩니다(`weekly_logs`의 "전 부서 공개" 원칙과 동일선상). 범위 제한은 **관리자 콘솔 화면의 조회 쿼리 자체**(`.eq("organization_id", organizationId)`)와 **쓰기 액션**에만 적용되며, 일반 사용자가 보는 목록/필터/회원가입 부서 선택 등은 영향받지 않습니다.
- `lib/auth/require-admin.ts`의 `requireAdmin()`이 `organizationId: string`(non-null 보장)을 반환하도록 확장되어 있습니다. 이전에는 관리자 콘솔 페이지들이 레이아웃의 `requireAdmin()` 가드만 믿고 페이지에서 재조회하지 않았지만(위 "관리자 콘솔" 절 참고), 이제 **대시보드·부서 관리·사용자 관리·업무 타입 관리 페이지 전부가 각자 `requireAdmin()`을 다시 호출**해 `organizationId`를 얻어 쿼리를 좁힙니다. 새 관리자 콘솔 페이지를 추가할 때 이 조회를 빠뜨리면 다른 조직 데이터가 그대로 노출됩니다. **단, `role === "superadmin"`인 경우 이 4개 페이지 모두 조직 필터를 조건부로 생략/확장하도록 F034에서 바뀌었습니다** — 아래 "슈퍼관리자 등급" 절 참고.
- **사용자 관리(`lib/actions/user-admin.ts`)는 RLS가 아니라 서버 액션 레벨에서 조직 범위를 재검증**합니다 — `profiles` 테이블 자체에는 `organization_id` 컬럼이 없어(부서를 통한 간접 소속이라) RLS로 직접 제한하기 어렵고, `profiles`/`prevent_unauthorized_role_change()` 트리거는 과거 회귀 이력이 있어 이번 변경에서 건드리지 않기로 결정했습니다(위 자기 상승 방지 트리거 문단 참고). 대신 `updateUserRoleAction`/`updateUserDepartmentAction`이 대상 사용자의 (현재 그리고, 부서 변경 시 새로 지정하려는) 부서가 호출자와 같은 조직인지 매번 조회해 확인합니다(`isDepartmentInOrganization()`) — 자기 자신 강등 방지가 트리거보다 넓은 조건을 서버 액션에서 추가로 거는 것과 동일한 패턴입니다. **슈퍼관리자는 F034로 이 조직 일치 검증 자체를 건너뜁니다** — `isDepartmentAccessible()` 헬퍼가 호출자의 role에 따라 `isDepartmentInOrganization()`(일반 관리자)과 "부서가 어느 조직이든 존재하는지만 확인"(슈퍼관리자)을 분기합니다.
- 부서(`department-form-dialog.tsx`)·업무 타입(`work-type-form-dialog.tsx`) 추가/수정 다이얼로그는 여러 조직 중 하나를 고르는 `Select`를 원래부터 갖고 있었습니다(범용성을 위해 `organizations: Organization[]` prop을 받는 구조). **호출하는 관리자 콘솔 페이지가 넘기는 배열의 크기로 실질적인 선택 범위가 정해집니다** — 일반 관리자에게는 소속 조직 1건짜리 배열만 넘겨 선택지가 하나뿐이게 하고, 슈퍼관리자에게는 F034로 전체 조직 배열을 넘겨 실제로 여러 조직 중 선택할 수 있게 합니다. 컴포넌트 자체는 두 경우 모두 변경 없이 재사용됩니다.
- 조직 관리 탭(`app/protected/admin/organizations/page.tsx`)은 호출자의 `role`로 분기합니다 — 일반 관리자는 기존과 동일하게 **관리자 소속 조직 1건짜리 카드**(이름 수정·비활성화/활성화만, 생성 UI 없음)를, 슈퍼관리자는 **시스템의 모든 조직을 나열하는 목록 + 새 조직 생성 버튼**을 봅니다. 자세한 내용은 아래 "슈퍼관리자 등급" 절 참고.

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

- `lib/pdf/weekly-log-pdf.ts`가 jsPDF + jspdf-autotable로 **클라이언트 사이드**에서 PDF를 생성합니다. jsPDF 기본 폰트가 한글을 지원하지 않아 `/public/fonts/NotoSansKR-Regular.ttf`를 런타임에 fetch해 base64로 임베딩하며, 폰트 용량(~2.5MB) 때문에 `String.fromCharCode`를 청크 단위로 호출해 콜스택 초과를 피합니다. 이 변환 로직은 그대로 유지할 것.
- `lib/excel/weekly-log-excel.ts`가 `exceljs`로 동일하게 **클라이언트 사이드**에서 Excel(.xlsx)을 생성합니다(제목/부서/시작일/목표종료일/진행상태/업무타입/중요도/예상소요기간·금액/협력업체/내용 컬럼). `weekly_logs.content`는 sanitize된 HTML 문자열이라 `DOMParser`(브라우저 전용 API)로 plain text만 추출해 셀에 넣습니다. `components/weekly-log-list-view.tsx`의 다운로드 버튼이 드롭다운으로 바뀌어 PDF/Excel 중 선택할 수 있습니다. `exceljs`는 번들 크기가 있어 PDF와 마찬가지로 클릭 시점에 `await import("exceljs")`로 동적 로딩합니다.

### 리치 텍스트 에디터 (주간업무일지 상세 내용)

- `weekly_logs.content`는 plain text가 아니라 **Tiptap(`@tiptap/react` + `@tiptap/starter-kit`) 에디터가 생성한 sanitize된 HTML 문자열**입니다. `components/html-editor.tsx`(작성/수정 폼에서 사용)가 실제 편집을, `components/html-content.tsx`(상세 페이지에서 사용)가 읽기 전용 렌더링을 담당하며, 두 컴포넌트는 `PROSE_CONTENT_CLASS`(`html-content.tsx`에서 export)를 공유해 편집 화면과 상세 화면의 스타일이 항상 일치하도록 합니다.
- **`immediatelyRender: false` 필수** — Next.js SSR 하이드레이션 불일치를 막기 위해 `useEditor()` 옵션에 반드시 포함해야 합니다(공식 가이드 패턴).
- **툴바 활성 상태는 `useEditorState`를 쓰지 않고 직접 구독**합니다. 이 프로젝트의 Tiptap 버전(v3.29)에서 `useEditorState`가 에디터 생성 직후 초기 스냅샷을 갱신하지 못해 에디터가 로딩 placeholder에서 멈추는 문제가 실측되었습니다(원인 미상, 재현됨). 대신 `editor.on("transaction", ...)`을 `useEffect`로 직접 구독해 `useState`로 툴바 active 상태를 계산하는 방식(`html-editor.tsx`의 `computeActiveStates`)을 사용 — 이 워크어라운드를 걷어내고 `useEditorState`로 되돌리지 말 것.
- **허용 태그는 두 곳에서 반드시 동기화**해야 합니다: (1) `components/html-editor.tsx`의 `StarterKit.configure(...)`(에디터가 실제로 만들어낼 수 있는 노드/마크), (2) `lib/sanitize-html.ts`의 `ALLOWED_TAGS`/`ALLOWED_ATTR`(저장·렌더링 시 필터). 툴바에 새 서식(예: 표, 이미지)을 추가하면 두 파일을 함께 수정해야 합니다.
- **sanitize는 저장 시점과 렌더링 시점 양쪽에서 수행**합니다 — `lib/actions/weekly-log.ts`의 `toWeeklyLogPayload()`가 저장 전에, `components/html-content.tsx`가 렌더링 직전에 각각 `lib/sanitize-html.ts`의 `sanitizeWeeklyLogContent()`를 호출합니다. `sanitize-html.ts`는 `isomorphic-dompurify`를 쓰며 `<a>` 태그에는 `afterSanitizeAttributes` 훅으로 `target="_blank" rel="noopener noreferrer"`를 항상 강제합니다.
- ProseMirror는 스키마 기반 구조 편집기라 사용자가 에디터에 `<script>` 등을 "타이핑"해서 넣을 방법이 없고, 붙여넣기로 들어오는 외부 HTML도 스키마에 없는 태그/속성은 자동으로 걸러집니다. 위 sanitize는 그 위에 추가되는 이중 방어입니다.

### 첨부파일 업로드 (주간업무일지)

- `weekly_log_attachments` 테이블(메타데이터)과 `weekly-log-attachments` private Storage 버킷(실제 파일, `file_size_limit` 5MB)으로 구성됩니다. 경로 규칙은 `{department_id}/{weekly_log_id}/{uuid}-{파일명}`이며, 스토리지 RLS는 `(storage.foldername(name))[1]`(최상위 폴더 = 부서 id)이 `current_department_id()`와 일치해야 쓰기를 허용합니다 — `weekly_logs` 테이블 RLS와 동일한 부서 기반 관례를 스토리지 레벨까지 그대로 확장한 것입니다.
- 5MB 제한은 **클라이언트 선택 즉시 거부(`hooks/use-weekly-log-attachments.ts`) → 버킷 `file_size_limit` → `weekly_log_attachments.file_size` CHECK 제약**, 3중으로 강제합니다. 하나만 믿지 말 것 — DB 제약은 클라이언트가 보낸 크기값을 검증하는 것이라 실제 업로드 자체는 버킷 설정이 최종 방어선입니다.
- **업로드 진행률은 `createSignedUploadUrl` + 직접 XHR PUT**으로 구현합니다(`lib/storage/weekly-log-attachments.ts`의 `uploadAttachmentWithProgress`). `supabase-js`의 기본 `storage.upload()`는 fetch 기반이라 진행률 이벤트를 제공하지 않기 때문에, 서명된 업로드 URL을 발급받은 뒤 그 URL에 `xhr.upload.onprogress`로 직접 PUT합니다.
- **신규 작성 시 첨부파일 실제 업로드는 "저장" 성공 이후**에 실행됩니다. `weekly_log_id`가 스토리지 경로에 필요한데 row 생성 전에는 존재하지 않기 때문입니다(`createWeeklyLogAction`이 성공 시 `{id, departmentId}`를 반환하도록 되어 있는 이유). `components/weekly-log-new-form.tsx`는 최초 저장 성공 시의 `{id, departmentId}`를 `useRef`에 보관해두고, 일부 첨부파일 업로드가 실패해 재제출되더라도 `weekly_logs` row를 중복 생성하지 않고 실패한 파일만 재시도하도록 합니다. 이 가드를 제거하면 첨부파일 업로드 실패 후 재시도 시 동일 내용의 로그가 중복 생성됩니다.
- 수정(edit) 플로우는 `weekly_log_id`/`department_id`가 이미 존재하므로 이런 가드가 필요 없고, `components/weekly-log-detail-view.tsx`가 `updateWeeklyLogAction` 성공 후 곧바로 신규 첨부파일을 업로드합니다.
- 핵심 파일: `lib/storage/weekly-log-attachments.ts`(경로 생성·업로드·다운로드 URL 발급), `lib/actions/weekly-log-attachments.ts`(메타데이터 insert/delete 서버 액션), `hooks/use-weekly-log-attachments.ts`(pending files·진행률·기존 첨부파일 상태 관리), `components/weekly-log-attachment-field.tsx`(작성/수정 폼과 읽기 전용 상세 화면이 공유하는 UI, `onAddFiles`/`onRemoveAttachment` 등 prop이 없으면 자동으로 읽기 전용으로 렌더링됨).
- 다운로드는 버킷이 private이므로 항상 `createSignedUrl`(짧은 만료 시간)로 서명된 URL을 새로 발급받아 사용합니다. 공개 URL(`getPublicUrl`)은 사용하지 않습니다.

### 업무 타입(work_type) 다중 선택 속성 (주간업무일지, ad hoc → 관리자 관리형으로 전환)

- `weekly_logs.work_type`은 `text[]` 컬럼입니다(v1 원래 계획에 없던 항목, `docs/ROADMAP_v1.md` "Phase 3 이후 ad hoc 확장" 참고). **처음엔 고정 10개 값만 허용하는 CHECK 제약이었지만, 관리자가 업무 타입을 직접 추가/이름수정/비활성화/삭제할 수 있는 `work_types` 테이블(조직별 관리, 위 "조직(organizations) 계층" 절 참고)로 옮겨졌습니다** — `lib/constants/work-types.ts`는 삭제되었으니 다시 만들지 말 것.
- **CHECK 제약은 다른 테이블을 참조할 수 없어서** `weekly_logs_work_type_check`(하드코딩 배열) 대신 `validate_weekly_log_work_type()` `BEFORE INSERT OR UPDATE OF work_type` 트리거로 대체했습니다 — `cardinality(work_type) > 0`과, 배열의 각 값이 **로그 작성 부서가 속한 조직**의 `work_types.name`에 실존하는지(다른 조직의 동명 업무 타입은 거부) 검사합니다. `work_types` 테이블을 다시 손볼 때 이 트리거도 함께 고려할 것.
- **작성/수정 폼과 상세 페이지의 체크박스 선택지는 더 이상 정적 배열이 아니라 서버 컴포넌트가 조회해 내려주는 `workTypeOptions: { name: string; archived: boolean }[]` prop**입니다(`app/protected/weekly-logs/new/page.tsx`, `weekly-logs/[id]/page.tsx`가 조회). 부서 select의 "비활성 라벨링" 패턴(`app/protected/profile/page.tsx`)과 동일하게, 작성자(또는 로그) 소속 부서의 조직에 속한 **활성** 타입만 새로 선택 가능하고, 비활성이거나 다른 조직 소속인 타입은 **이미 선택되어 있던 로그에서만** "(비활성)" 라벨로 계속 노출됩니다. `lib/schemas/weekly-log.ts`/`lib/actions/weekly-log.ts`의 Zod 검증은 이제 `z.array(z.string().min(1))`로 형태만 확인하고, 실제 유효성은 위 트리거가 최종 방어선입니다.
- **관리자 콘솔의 업무 타입 관리 탭**(`app/protected/admin/work-types/page.tsx`, `lib/actions/work-type.ts`)이 부서 관리와 동일한 CRUD 패턴(추가/이름수정/비활성화-활성화, 삭제는 참조하는 `weekly_logs`가 0건일 때만)을 제공합니다. `work_type`은 FK가 아니라 배열 포함이라 삭제 전 참조 확인은 `.contains("work_type", [name])` count로 수행합니다(부서의 FK RESTRICT와 달리 DB가 대신 막아주지 않으므로 액션이 직접 세야 함).
- **선택 UI는 프리셋 아바타와 마찬가지로 체크박스 다중 선택**입니다 — 하나의 업무일지가 여러 타입에 속할 수 있어, 대시보드 차트의 비율 합계가 100%를 넘을 수 있음을 캡션에 명시해두었습니다.
- **상세 페이지에서는 진행상태(status)와 동일한 패턴으로 인라인 편집**됩니다 — 별도 "수정" 모드에 들어가지 않고 상세 화면에 항상 노출되는 체크박스에서 바로 체크/해제하면 `updateWeeklyLogWorkTypeAction`(`lib/actions/weekly-log.ts`)이 즉시 저장하고, 낙관적 업데이트(즉시 반영 → 실패 시 롤백 + 토스트) 패턴은 `handleStatusChange`와 동일합니다(`components/weekly-log-detail-view.tsx`). 마지막 1개를 해제하려는 시도는 서버 호출 없이 클라이언트에서 즉시 에러 토스트로 막습니다. 전체 편집 폼("수정" 버튼)에도 동일한 체크박스가 남아 있어 두 경로 모두 편집 가능하지만, `defaultValues.work_type`이 항상 최신 상태를 참조하므로 값이 어긋나지 않습니다.
- **대시보드 차트**(`components/dashboard-worktype-chart.tsx`)는 카테고리 수가 가변적이라 `--chart-1`~`--chart-5`(5색) 팔레트보다 많아질 수 있어, `WORK_TYPE_CHART_COLORS`(`lib/constants/chart-colors.ts`)로 5색을 순환시켜 `Cell`로 막대마다 다른 색을 부여합니다. 막대 안쪽 라벨은 "N건, NN.N%" 형식(천 단위 콤마 + 소수점 1자리 퍼센트)입니다. `stats_logs_by_work_type` RPC도 이제 하드코딩된 `VALUES` 목록이 아니라 `work_types` 테이블(활성만) 기반으로 카테고리를 만듭니다.

### 업무 중요도(importance) 속성 (주간업무일지, ad hoc)

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
- **헤더에도 아바타가 노출**됩니다 — `components/header-nav.tsx`(데스크탑)와 `components/mobile-nav.tsx`(모바일 시트)가 `profiles.avatar_key`를 함께 조회해 이메일 앞에 `ui/avatar`(`AvatarFallback`)로 렌더링합니다. 이 헤더는 `components/site-header.tsx`를 통해 전 페이지에서 공유되므로, 별도 처리 없이 모든 보호된 페이지에 자동 반영됩니다.
- `app/auth/login/page.tsx`/`app/auth/sign-up/page.tsx`의 카드 폭은 사용자 요청으로 반응형 확장을 시도했다가(`max-w-sm sm:max-w-md md:max-w-lg` → `max-w-5xl`) 다시 원래의 고정 `max-w-sm`으로 되돌렸습니다 — 이 두 페이지는 프로필 화면과 달리 좁고 짧은 로그인/회원가입 폼이라는 피드백에 따른 결정이므로, 임의로 다시 넓히지 말 것.

### 관리자 콘솔 (대시보드·조직 관리·부서 관리·업무 타입 관리·사용자 관리)

- `/protected/admin/*`는 `app/protected/admin/layout.tsx`가 `lib/auth/require-admin.ts`의 `requireAdmin()`으로 가드합니다(부서 게이트 → `profiles.role === 'admin'` 확인 순서). `proxy.ts`가 아니라 **레이아웃 레벨**에서 처리하는 이유는 요청당 `profiles` 조회가 이미 있어 proxy에서 중복 조회할 필요가 없기 때문입니다. `cacheComponents: true` 하에서 `requireAdmin()`을 Suspense 밖에서 직접 `await`하면 콘솔 에러가 나므로, `AdminLayout`은 얇은 동기 컴포넌트로 두고 내부의 `<Suspense>`로 감싼 비동기 가드 컴포넌트에서 호출합니다. `components/admin-tab-nav.tsx`의 `TABS`가 대시보드/조직 관리/부서 관리/업무타입 관리/사용자 관리 5개 탭을 정의하고, `app/protected/admin/page.tsx`(`/protected/admin` 인덱스)는 대시보드 탭으로 리다이렉트합니다. **모든 탭의 조회·쓰기는 관리자 소속 조직으로 범위가 제한**됩니다 — 자세한 내용과 근거는 위 "조직(organizations) 계층과 관리자 콘솔의 조직 범위 제한" 절 참고.
- **대시보드**(`app/protected/admin/dashboard/page.tsx`, `lib/queries/stats.ts`) — 원래 `/protected/dashboard`에서 전 사용자 공개로 구현됐다가, 진입점이 헤더와 목록 페이지에 흩어져 있다는 피드백에 따라 **관리자 전용으로 전환**되어 이 경로로 이전했습니다. `AdminLayout`의 `requireAdmin()` 가드가 이미 이 라우트를 관리자 전용으로 막고 있어 페이지 자체에는 별도 가드나 부서 게이트 코드가 없습니다(있었다면 중복). 부서별·기간별·상태별·업무타입별·중요도별 집계는 `stats_*` RPC 함수(`SECURITY INVOKER`, `weekly_logs`의 전 부서 공개 SELECT RLS를 그대로 적용받음)를 통해 서버에서 조회하며, 전부 `org_id` 파라미터를 받아 "전체 부서" 조회를 선택해도 관리자 소속 조직 밖 데이터가 섞이지 않게 합니다.
- **조직 관리**(`app/protected/admin/organizations/page.tsx`, `lib/actions/organization.ts`) — 관리자 소속 조직 1건만 보여주는 단일 카드이며, 이름 수정과 비활성화/활성화만 가능합니다(생성·삭제 UI 없음, 위 조직 범위 제한 절 참고).
- **부서 관리**(`app/protected/admin/departments/page.tsx`, `lib/actions/department.ts`) — 기본 동작은 **비활성화(소프트 삭제)**이며, `departments.archived_at`(nullable)로 표현합니다. 하드 삭제는 부서원(`profiles`) 또는 `weekly_logs` 참조가 0건일 때만 UI에서 허용되고(참조가 있으면 삭제 버튼만 비활성화, 별도 안내 문구는 사용자 요청으로 제거됨), `deleteDepartmentAction`이 경합으로 `23503`(FK 위반)을 받으면 그 시점에 다시 참조 수를 세어 `lib/format.ts`의 `formatDepartmentDeleteBlockedMessage()`로 에러 토스트를 띄웁니다(이 함수는 더 이상 사전 안내 UI에는 쓰이지 않고, 경합 상황의 에러 메시지 생성에만 남아 있음). `23505`(이름 중복)는 "이미 존재하는 부서명입니다."로 변환. 비활성 부서는 신규 선택 목록(프로필/회원가입)에서는 제외하되 이미 그 부서인 사용자에게는 "(비활성)" 라벨로 계속 노출하고, 목록 필터에서는 과거 데이터 조회를 위해 항상 노출합니다.
- **업무 타입 관리** — 위 "업무 타입(work_type) 다중 선택 속성" 절 참고.
- **사용자 관리**(`app/protected/admin/users/page.tsx`, `app/protected/admin/users/[id]/page.tsx`, `lib/actions/user-admin.ts`) — `updateUserRoleAction`/`updateUserDepartmentAction` 모두 클라이언트가 보낸 값을 신뢰하지 않고 **호출자의 `profiles.role`을 서버에서 재조회**해 관리자인지 확인합니다. 자기 자신의 역할 변경은 관리자 수와 무관하게 **항상** 서버 액션에서 차단합니다 — `prevent_unauthorized_role_change()` 트리거는 "마지막 관리자"의 강등만 막고 관리자가 2명 이상이면 자기 강등을 허용하므로, 로드맵이 요구하는 "자기 강등은 항상 금지"를 만족하려면 트리거보다 넓은 조건을 서버 액션에 추가해야 합니다. 소속 부서 변경 시에는 대상 사용자가 이전 부서 로그의 쓰기 권한(RLS)을 잃는다는 경고(`formatDepartmentChangeWarning()`)를 확인 다이얼로그에 표시합니다. 역할 변경 UI(목록 인라인 + 상세 폼, `components/user-role-select.tsx`로 공유)는 `weekly-log-detail-view.tsx`의 진행상태 변경과 동일한 낙관적 업데이트(즉시 반영 → 실패 시 롤백 + 토스트) 패턴을 재사용합니다. 목록·상세 조회, 역할·소속 부서 변경 모두 조직 범위 제한이 적용됩니다(위 조직 범위 제한 절 참고).

### 댓글·멘션 (주간업무일지 상세 페이지)

- `weekly_log_comments`(1단계 대댓글 지원, `deleted_at`로 소프트 삭제)·`weekly_log_comment_mentions`(정규화된 멘션 테이블) 2개 테이블로 구성됩니다. **댓글 작성(INSERT)만 부서 제한이 없고 부서 무관하게 작성자 본인이면 허용**됩니다 — 이 프로젝트의 다른 모든 쓰기 정책이 따르는 부서 기반 모델(`current_department_id()`)과 의도적으로 다른 유일한 지점이며, `weekly_logs`가 이미 전 부서 SELECT 공개인 상태에서 댓글까지 부서로 막으면 "타 부서 업무에 의견을 남긴다"는 기능 자체가 무의미해지기 때문입니다. UPDATE/DELETE는 작성자 본인 또는 `is_admin()`으로 제한됩니다.
- **`profiles_select_own_or_admin` RLS 때문에 일반 사용자는 자기 자신 외의 `profiles` 행을 조회할 수 없어**, 댓글 작성자 표시와 `@` 멘션 검색이 PostgREST embed로는 동작하지 않습니다. `get_profile_identities(profile_ids uuid[])`(작성자·멘션 대상의 email/이름/아바타만 배치 조회)와 `search_mentionable_profiles(search_query text, max_results int)`(멘션 후보 검색) 2개의 `SECURITY DEFINER` RPC로 우회합니다(`is_admin()`/`current_department_id()`/`stats_*`와 동일한 컨벤션 — `anon` EXECUTE 명시적 회수 포함). `lib/actions/weekly-log-comment.ts`의 멘션 후보 검증도 처음엔 일반 `.from("profiles").select(...)` 쿼리를 썼다가 같은 RLS에 걸려 타인의 id가 조용히 0건으로 필터링되는 버그가 실측되어 `get_profile_identities`로 교체된 이력이 있습니다 — 이 패턴을 다시 일반 쿼리로 되돌리지 말 것.
- **멘션은 본문 텍스트 파싱이 아니라 별도 테이블로 정규화**됩니다. 클라이언트가 보낸 멘션 목록은 신뢰하지 않고, `createCommentAction`(`lib/actions/weekly-log-comment.ts`)이 저장된 본문에서 `@[이메일](uuid)` 토큰을 정규식으로 파싱해 `profiles`에 실존하는 id만 `weekly_log_comment_mentions`에 삽입합니다. `components/mention-input.tsx`가 `@` 입력을 감지해 이 토큰을 삽입하고, `components/weekly-log-comment-section.tsx`의 `CommentContent`가 저장된 토큰을 다시 파싱해 `ui/badge`로 렌더링합니다(멘션 대상이 본인이면 강조 스타일).
- **댓글 본문은 HTML을 전혀 허용하지 않습니다** — 업무일지 본문(`weekly_logs.content`)과 달리 `lib/sanitize-html.ts`의 `sanitizeCommentContent()`는 `ALLOWED_TAGS: []`로 모든 태그를 제거하고 plain text만 남깁니다(리치 텍스트 대비 공격면이 작다는 판단). 저장 시점(서버 액션)에서 한 번 sanitize하고 렌더링은 React의 자동 이스케이프로 이중 방어합니다.
- 대댓글이 달린 댓글을 삭제하면 스레드가 끊기므로 **물리 삭제 대신 `deleted_at`을 채우는 소프트 삭제**를 씁니다. `deleteCommentAction`은 `deleted_at` UPDATE만 수행하며, 삭제된 댓글은 "삭제된 댓글입니다" placeholder로 자리만 유지한 채 렌더링됩니다(`components/weekly-log-comment-section.tsx`).
- **목록 페이지의 댓글수 표시**(`app/protected/weekly-logs/page.tsx`)는 `weekly_logs` select에 join할 수 없어(별개 테이블) 조회된 로그 id들로 `weekly_log_comments`를 2차 조회해 Map으로 집계한 뒤 병합합니다. `deleted_at is null`인 행만 세므로(삭제된 댓글은 실제 내용이 없어 집계에서 제외), `components/weekly-log-table.tsx`/`components/weekly-log-card.tsx`는 `comment_count > 0`일 때만 제목 옆에 `(N)`을 표시합니다.
- **목록의 부서 컬럼은 작성자 아바타+이름으로 대체되어 있습니다(ad hoc)** — 목록에서는 부서보다 담당자가 누구인지가 더 유용하다는 판단으로, `weekly-log-table.tsx`/`weekly-log-card.tsx`의 부서 `Badge`를 아바타 프리셋(`lib/constants/avatars.ts`) + 작성자명(없으면 이메일, 최종 폴백 "알 수 없는 사용자") 조합으로 바꿨습니다. `showDepartment` prop은 `showAuthor`로, 정렬 키는 `department_name`에서 `author_name`으로 이름이 바뀌었습니다. `app/protected/weekly-logs/page.tsx`가 조회된 로그들의 `author_id`를 위 댓글 작성자 조회와 동일하게 `get_profile_identities` RPC로 배치 조회해 `WeeklyLogListItem`에 `author_name`/`author_email`/`author_avatar_key`로 병합합니다(신규 RPC 없음, `profiles_select_own_or_admin` RLS 때문에 embed로는 타인 신원을 가져올 수 없어 기존 함수를 재사용). 부서 자체는 삭제되지 않고 상세 페이지·부서 필터·PDF/Excel에는 계속 노출됩니다.

## Claude Code 커스텀 설정

- `.claude/agents/`에 이 저장소 전용 서브에이전트가 정의되어 있습니다(Agent 도구의 `subagent_type`으로 지정하는 이름은 파일명이 아니라 frontmatter의 `name:` 값입니다):
  - `nextjs-supabase-expert`(`dev/nextjs-supabase-developer.md`) — Next.js+Supabase 기능 구현
  - `ui-markup-specialist`(`dev/ui-markup-specialist.md`) — 정적 마크업/스타일링
  - `nextjs-app-developer`(`dev/nextjs-app-developer.md`) — 라우팅/레이아웃 구조
  - `code-reviewer`(`dev/code-reviewer.md`), `development-planner`(`dev/development-planner.md`, `docs/roadmap/ROADMAP_mvp.md`·`docs/ROADMAP_v1.md` 관리), `starter-cleaner`(`dev/starter-cleaner.md`), `notion-api-database-expert`(`dev/notion-api-database-expert.md`)
  - `prd-generator`, `prd-validator`(`docs/`)
- `.claude/commands/git/`에 `commit`, `pr`, `merge`, `branch`, `update-roadmap` 슬래시 커맨드가 정의되어 있습니다.
