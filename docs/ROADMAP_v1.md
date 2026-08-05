# 부서별 주간업무일지 관리 v1 고도화 로드맵

MVP로 완성된 기록·조회 서비스를 **운영자가 직접 조직을 관리하고, 구성원이 서로 소통하며, 데이터로 현황을 읽어내는** 협업 플랫폼으로 확장한다.

## 개요

v1 고도화는 MVP(`docs/roadmap/ROADMAP_mvp.md`, Task 001~024 완료)에서 "MVP 이후 기능"으로 명시적으로 제외했던 6가지(`docs/PRD.md` 3절)를 구현 범위로 삼습니다:

- **[F019] 부서 관리 UI**: 관리자가 화면에서 부서를 추가/수정/비활성화 (현재는 seed 데이터 + SQL 수동 관리)
- **[F020] 사용자 관리 UI**: 관리자가 사용자 목록을 조회하고, 개별 사용자의 상세 정보를 확인하며, `role`(`user`/`admin`)과 소속 부서를 지정/변경 (현재는 Supabase 콘솔에서 SQL 수동 변경)
- **[F021] 기간 범위 검색/필터**: 시작일/목표종료일 범위로 목록을 좁히는 필터 (기존 키워드 검색 F016·진행상태 필터와 조합)
- **[F022] 댓글·멘션 협업**: 주간업무일지에 댓글을 작성하고 `@`로 다른 사용자를 멘션
- **[F023] 실시간 알림**: 멘션·댓글 발생 시 Supabase Realtime 기반으로 헤더에 즉시 알림 노출
- **[F024] 통계/대시보드 차트**: 부서별·기간별·상태별 업무 현황을 차트로 시각화

## 현재 코드베이스 상태 (착수 전 실측)

이 로드맵은 2026-08-05 기준으로 원격 Supabase(`ybhluyzkmpjmrxyhkolt`)와 로컬 소스를 직접 조회해 작성했습니다. 아래 항목은 **계획 수립의 전제**이므로 착수 전 반드시 재확인하세요.

### 이미 구현되어 재사용 가능한 것

| 항목 | 위치 | v1에서의 활용 |
|------|------|--------------|
| 부서 기반 RLS 헬퍼 (`is_admin()`, `current_department_id()`) | DB `SECURITY DEFINER` 함수 | 신규 테이블(댓글·알림)과 신규 정책(부서 쓰기·역할 변경)에서 그대로 재사용, 정책 재귀 방지 |
| Server Action + `{success, error}` 반환 규약 | `lib/actions/weekly-log.ts`, `lib/actions/weekly-log-attachments.ts` | 부서/역할/댓글 액션도 동일 시그니처로 작성해 `toast.error(result.error)` 처리 통일 |
| React Hook Form + Zod 폼 패턴 | `components/weekly-log-form.tsx`, `components/profile-form.tsx`, `lib/schemas/*` | 부서 추가/수정 폼, 댓글 입력 폼에 동일 적용 |
| 목록 필터의 `searchParams` → 서버 재조회 구조 | `app/protected/weekly-logs/page.tsx`, `components/weekly-log-list-view.tsx` | F021 기간 필터를 `?from=`/`?to=` 파라미터로 같은 구조에 추가 |
| 헤더 `navLinks` 배열 (현재 **빈 배열**) | `components/header-nav.tsx:18`, `components/mobile-nav.tsx` | 관리자 설정·대시보드 메뉴를 꽂을 자리가 이미 마련됨 (데스크탑·모바일 동시 반영) |
| Suspense + Skeleton 스트리밍 패턴 | 4개 보호 라우트 전부 | 신규 라우트(`/protected/admin/*`, `/protected/dashboard`)도 동일 구조 필수 (`cacheComponents: true`) |
| shadcn/ui 프리미티브 20종 | `components/ui/` | `dialog`, `alert-dialog`, `table`, `select`, `form`, `pagination`, `sonner` 등 관리자 화면에 필요한 것 대부분 이미 설치됨 |
| 날짜 입력 UI | `components/weekly-log-form.tsx`의 `<Input type="date" />` | F021 기간 필터도 동일하게 네이티브 date input 사용 (달력 라이브러리 신규 도입 불필요) |
| `escapeLikePattern()` + 컬럼별 `ilike` 병합 검색 | `lib/utils.ts`, `app/protected/weekly-logs/page.tsx` | 멘션 대상 사용자 검색에도 동일한 안전 패턴 적용 |

### 반드시 해소해야 하는 갭 (실측으로 확인됨)

- **🚨 권한 상승 취약점 (기존 결함, F020 착수 전 필수 차단)**: `profiles`의 UPDATE 정책은 `profiles_update_own` 하나뿐이고 USING/WITH CHECK가 모두 `id = (select auth.uid())`로 **행 단위 제한만 걸려 있을 뿐 컬럼 제한이 없습니다.** `information_schema.column_privileges` 조회 결과 `authenticated` 롤이 `profiles.role` 컬럼에 UPDATE 권한을 보유하고, `profiles`의 트리거는 `set_profiles_updated_at`(updated_at 갱신) 하나뿐이라 값 변경을 막는 장치가 없습니다. 즉 **일반 사용자가 브라우저에서 `supabase.from("profiles").update({ role: "admin" }).eq("id", 본인id)`를 호출해 스스로 관리자가 될 수 있는 상태**입니다. → Task 026에서 최우선 차단.
- **관리자가 타인의 `profiles`를 수정할 정책이 없음**: `profiles_select_own_or_admin`으로 조회는 열려 있으나(`is_admin()`), UPDATE는 본인 행 전용이라 관리자도 타인의 `role`/`department_id`를 바꿀 수 없습니다. → 역할 관리 UI(F020)는 정책 추가가 선행되어야 함.
- **`departments`에 쓰기 정책이 아예 없음**: 정책은 `departments_select_authenticated`(`qual: true`) 하나뿐입니다. RLS가 켜진 상태에서 정책이 없으면 INSERT/UPDATE/DELETE는 **에러가 아니라 조용히 0건 처리**되므로, 정책 없이 UI만 만들면 "저장은 성공했다고 나오는데 아무것도 안 바뀌는" 최악의 증상이 납니다. → Task 026에서 admin 전용 쓰기 정책 3종 선행 작성.
- **부서 삭제 시 FK 동작이 테이블마다 제각각 (가장 큰 데이터 정합성 리스크)**: `pg_constraint` 조회 결과 —
  | FK | ON DELETE |
  |----|-----------|
  | `profiles_department_id_fkey` | **SET NULL** |
  | `weekly_logs_department_id_fkey` | **RESTRICT** |
  | `weekly_log_attachments_department_id_fkey` | NO ACTION |

  따라서 로그가 1건이라도 있는 부서는 삭제가 RESTRICT로 실패하고, 로그가 없는 부서는 삭제가 성공하면서 **소속 부서원 전원의 `department_id`가 조용히 NULL이 되어 다음 요청부터 `proxy.ts` 온보딩 게이트에 걸려 `/protected/profile`로 튕깁니다.** 어느 쪽도 UI에 그대로 노출할 수 없음 → Task 027에서 **소프트 삭제(비활성화) 채택** 및 하드 삭제는 참조 0건일 때만 허용.
- **Supabase Realtime 미사용**: `supabase_realtime` publication에 등록된 테이블이 **0개**이고, 소스 전체에 `.channel()` 호출이 **0건**입니다(`grep` 확인). 알림 시스템은 인프라 도입부터 시작해야 함 → Task 034.
- **차트 라이브러리 없음**: `package.json`에 `recharts`/`d3`/`visx` 계열이 전무하고 `components/ui/chart.tsx`도 없음 → Task 031에서 기술 스택 신규 추가 필요.
- **관리자 전용 라우트/가드가 없음**: `app/protected/` 아래 `admin` 세그먼트가 없고, 관리자 여부는 화면마다 `profiles.role`을 개별 조회해 판단합니다. 신규 관리자 화면이 4개 이상 늘어나므로 **공통 가드 유틸이 먼저 필요** → Task 025.
- **보호 페이지마다 부서 게이트 코드가 중복**: `app/protected/weekly-logs/{page,new/page,[id]/page}.tsx`가 각각 `profiles.department_id`를 조회해 리디렉션합니다(CLAUDE.md 명시). 신규 라우트를 추가할 때마다 이 체크를 빠뜨리면 온보딩 게이트에 구멍이 생김.
- **현재 데이터 규모 (통계·성능 판단 기준)**: `departments` 3건(Commerce시스템팀/ERP시스템팀/IT기획팀), `profiles` 34건, `weekly_logs` 167건, `weekly_log_attachments` 1건. 통계 대시보드는 이 규모에서 클라이언트 집계도 가능하지만, 부서·기간이 늘어날 것을 전제로 **DB 집계(RPC)를 기본**으로 설계.

### 계획 수립 시 지켜야 할 아키텍처 제약 (CLAUDE.md 준수)

1. **DB 마이그레이션 → `generate_typescript_types`로 `database.types.ts` 재생성 → 기능 구현** 순서 엄수. 타입 없이 `Tables<"comments">`를 쓸 수 없음.
2. **RLS 정책은 테이블 생성 마이그레이션과 같은 Task에서 함께 처리.** 특히 `departments`처럼 "정책 없음 = 조용한 0건 처리"인 경우가 있으므로, 정책 작성 후 반드시 impersonation SQL로 허용/거부를 각각 실측할 것.
3. **Supabase 클라이언트 3종 혼용 금지**: Client Component는 `lib/supabase/client.ts`, Server Component/Route Handler는 `await createClient()`(전역 저장 금지), proxy는 `lib/supabase/proxy.ts`.
4. **세션 확인은 `getUser()`가 아니라 `getClaims()`** (`data?.claims`). 단 `getClaims()`는 JWT 로컬 디코딩이라 **역할 변경이 즉시 반영되지 않는 값을 신뢰하면 안 됨** — 관리자 여부는 항상 `profiles.role`을 DB에서 조회해 판단할 것(MVP의 기존 관례와 동일).
5. **`lib/supabase/proxy.ts`의 쿠키 처리 로직 변경 금지.** 관리자 라우트 가드를 proxy에 추가하려는 유혹이 있으나, 요청당 `profiles` 조회가 이미 1회 있으므로 **가드는 페이지/레이아웃 레벨에서 처리**하고 proxy는 건드리지 않는다(Task 025 결정 사항 참고).
6. **`cacheComponents: true`** 활성 상태. 사용자별/부서별 데이터에 `"use cache"`를 붙이지 말고 Suspense 경계로 처리. `searchParams`를 Suspense 밖에서 `await`하면 런타임 에러(MVP Task 007에서 실측된 사례).
7. **`middleware.ts`가 아니라 `proxy.ts`** (Next.js 16 명칭).
8. **request-time API는 전부 비동기**: `cookies()`, `headers()`, `params`, `searchParams` 모두 `await`.
9. **색상 토큰 추가 시** `app/globals.css`의 `:root`/`.dark`와 `tailwind.config.ts`의 `theme.extend.colors`를 **함께** 수정(v3 방식 HSL 하이브리드 유지). 차트 색상 토큰도 이 규칙을 따를 것.
10. **HTML 본문은 저장·렌더링 양쪽에서 sanitize**(`lib/sanitize-html.ts`). 댓글도 사용자 입력이므로 동일 정책을 적용하되, 댓글은 리치 텍스트가 아닌 **plain text + 멘션 토큰**으로 단순화해 공격면을 늘리지 않는다.

## 개발 워크플로우

1. **작업 계획**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - 새로운 작업을 포함하도록 `ROADMAP_v1.md` 업데이트
   - 우선순위 작업은 마지막 완료된 작업 다음에 삽입

2. **작업 생성**
   - 고수준 명세서, 관련 파일, 수락 기준, 구현 단계 포함
   - API/비즈니스 로직 작업에는 "테스트 체크리스트" 섹션 필수 (Playwright MCP 시나리오)

3. **작업 구현**
   - 작업 파일의 명세서를 따라 구현
   - API 연동 및 비즈니스 로직 구현 시 Playwright MCP로 테스트 수행
   - 각 단계 후 진행 상황 업데이트, 테스트 통과 확인 후 다음 단계 진행
   - 각 Task 완료 후 중단하고 추가 지시를 대기

4. **로드맵 업데이트**
   - 완료된 항목의 체크박스를 채우고 Task/Phase 제목에 ✅ 표시

### Phase 순서를 이렇게 정한 이유

| 순서 | 이유 |
|------|------|
| Phase 1(관리자 콘솔)이 먼저 | 부서 관리·역할 관리는 **기존 RLS를 건드리는 유일한 작업군**이라, 뒤에 배치할수록 그 위에 쌓인 기능(댓글·알림·통계)을 전부 재검증해야 함. 권한 상승 취약점 차단도 지연 불가 |
| Phase 2(조회·분석)를 그다음 | F021·F024는 **기존 `weekly_logs` 데이터를 읽기만** 하므로 다른 기능과 의존성이 없고 실패 리스크가 가장 낮음. Phase 1과 병렬 진행 가능(공유 파일은 `header-nav.tsx`의 `navLinks`뿐) |
| Phase 3(댓글·멘션)을 그다음 | 신규 테이블·신규 RLS·멘션 파싱이 한꺼번에 들어가는 이번 v1 최대 단위. Phase 1의 역할/부서 모델이 확정된 뒤에 착수해야 정책을 두 번 쓰지 않음 |
| Phase 4(실시간 알림)를 마지막 | **F022에 완전히 종속**(알림의 발생원이 댓글·멘션). 게다가 이 프로젝트 최초의 Realtime 도입이라 인프라 리스크가 가장 큼 |

Phase 1·2는 병렬 진행 가능하며, Phase 3 → 4는 반드시 순차입니다.

---

## 개발 단계

### Phase 1: 관리자 콘솔 골격 및 권한 모델 하드닝

> 목표: `/protected/admin` 영역이 생기고, 관리자만 접근 가능하며, **일반 사용자가 스스로 관리자가 될 수 없는** 상태.
> **선행 조건**: 없음 (즉시 착수 가능). Phase 2와 병렬 진행 가능.

- **Task 025: 관리자 전용 라우트 골격 및 공통 가드 구축 ✅**
  - [x] `app/protected/admin/layout.tsx` 신규 — `getClaims()` + `profiles.role` 조회 후 `role !== 'admin'`이면 `redirect("/protected/weekly-logs")`. 관리자 화면 공통 탭 내비게이션(부서 관리 / 사용자 관리) 배치
  - [x] `app/protected/admin/departments/page.tsx`, `app/protected/admin/users/page.tsx` 빈 껍데기 페이지 생성 (구조 우선 — 실제 기능은 Task 027·028). `app/protected/admin/page.tsx`도 추가해 `/protected/admin` 인덱스를 `/protected/admin/departments`로 리다이렉트(원래 계획엔 없었으나, 헤더/목록 링크가 `/protected/admin`을 직접 가리키는데 해당 세그먼트에 `page.tsx`가 없으면 404가 나는 문제를 구현 중 실측해 추가)
  - [x] `lib/auth/require-admin.ts` 신규 — `getCurrentProfile()` / `requireDepartment()` / `requireAdmin()` 3단 헬퍼로 "세션 확인 → `profiles` 조회 → 부서 게이트 → 관리자 확인" 반복 코드를 한 곳으로 통합. 기존 4개 보호 페이지의 중복 부서 체크도 `requireDepartment()`로 점진 교체 가능
  - [x] **가드 위치 결정**: `proxy.ts`가 아니라 **레이아웃 레벨**에서 처리
  - [x] `components/header-nav.tsx`의 `navLinks`를 모듈 상단 고정 배열 대신 `getNavLinks(user)` 함수로 바꿔 관리자일 때만 "관리자 설정" 링크를 넣도록 수정. `components/mobile-nav.tsx`는 `HeaderNav`가 넘기는 `navLinks` prop을 그대로 쓰는 구조라 별도 수정 없이 동일하게 반영됨
  - [x] `components/weekly-log-list-view.tsx`에 `isAdmin` prop 추가, PDF 다운로드 버튼 왼쪽에 관리자에게만 보이는 "관리자 콘솔" 버튼 배치 → `/protected/admin`으로 이동. `app/protected/weekly-logs/page.tsx`에서 이미 계산해 두던 `isAdmin`을 그대로 prop으로 전달
  - [x] `app/protected/admin/{loading,error}.tsx` 배치 — `error.tsx`는 기존 `components/error-state.tsx` 재사용. `loading.tsx`는 신규 `components/admin-layout-skeleton.tsx`(`ui/skeleton` 조합) 재사용
  - [x] **(구현 중 실측 발견 — 원래 계획에 없던 수정)** `cacheComponents: true` 하에서 `layout.tsx`가 `requireAdmin()`을 Suspense 밖에서 직접 `await`하면 "Uncached data ... accessed outside of `<Suspense>`" 콘솔 에러가 발생(라우트의 `loading.tsx`는 같은 세그먼트의 `layout.tsx` 최상위 실행 자체는 감싸주지 않음). `AdminLayout`을 얇은 동기 컴포넌트로 두고 내부에 `<Suspense fallback={<AdminLayoutSkeleton />}>`로 감싼 비동기 `AdminGuard` 컴포넌트를 두어 해소 — 이후 v1의 다른 신규 레이아웃(있다면)도 동일 패턴 적용 필요
  - **관련 파일**: `app/protected/admin/**`(`layout.tsx`, `page.tsx`, `departments/page.tsx`, `users/page.tsx`, `loading.tsx`, `error.tsx`), `lib/auth/require-admin.ts`(신규), `components/admin-tab-nav.tsx`(신규), `components/admin-layout-skeleton.tsx`(신규), `components/header-nav.tsx`, `components/weekly-log-list-view.tsx`, `app/protected/weekly-logs/page.tsx`
  - **수락 기준**: 관리자 계정으로 `/protected/admin/departments`·`/protected/admin/users` 접근 시 빈 화면이 렌더링되고, 일반 사용자 계정으로 URL 직접 입력 시 목록 페이지로 리디렉션된다. 헤더 메뉴와 주간업무일지 목록 페이지 양쪽에서 관리자에게만 진입 링크가 보인다
  - **테스트 체크리스트** (Playwright MCP + Supabase MCP `execute_sql`로 임시 테스트 계정을 만들어 실제 브라우저에서 검증, 종료 후 계정 삭제로 정리)
    - [x] 관리자 계정으로 `/protected/admin/*` 2개 라우트(부서 관리·사용자 관리 탭 전환 포함) 접근 성공 확인
    - [x] 일반 사용자 계정으로 URL 직접 접근(`/protected/admin/departments`) 시 `/protected/weekly-logs`로 리디렉션 확인 (UI 은닉만으로 방어하지 않음)
    - [x] 비로그인 상태 접근 시 기존 `proxy.ts` 게이트로 `/auth/login` 리디렉션되는지 확인 (`curl -L --max-redirs 0`로 307 확인)
    - [x] 부서 미설정 관리자 계정이 `/protected/admin/departments`에 접근할 때 온보딩 게이트(`/protected/profile`)가 관리자 확인보다 먼저 동작하는지 확인
    - [x] 관리자 계정으로 주간업무일지 목록 페이지 진입 시 "관리자 콘솔" 링크가 보이고 클릭하면 `/protected/admin`(→ `/protected/admin/departments`)으로 이동하는지 확인. 역할을 DB에서 `admin`으로 승격한 직후 **재로그인 없이** 헤더·목록 페이지에 즉시 반영되는 것도 함께 확인(매 요청 `profiles.role` 재조회 구조)
    - [x] 일반 사용자 계정으로 주간업무일지 목록 페이지 진입 시 해당 링크가 보이지 않는지 확인 (데스크톱 헤더·모바일 시트 메뉴 양쪽)
  - **범위 밖 유지**: 실제 부서/사용자 CRUD 기능(Task 027·028), 기존 4개 페이지의 중복 부서 체크 리팩터링(헬퍼만 준비하고 교체는 선택)

- **Task 026: 권한 모델 하드닝 및 관리자 쓰기 정책 마이그레이션**
  - [ ] **🚨 자기 역할 상승 차단 (최우선)** — `profiles`에 `BEFORE UPDATE` 트리거(`prevent_self_role_escalation()`, `SECURITY DEFINER`) 추가: `NEW.role IS DISTINCT FROM OLD.role`인데 호출자가 관리자가 아니면 예외 발생. 트리거로 막는 이유는 컬럼 GRANT 회수(`REVOKE UPDATE (role) ON profiles FROM authenticated`)만으로는 PostgREST가 role을 제외한 UPDATE를 계속 허용해야 해서 관리자 경로까지 함께 막히기 때문 — **두 방식을 비교 검토 후 결정하고 결정 근거를 이 항목에 기록할 것**
  - [ ] `profiles` UPDATE 정책 확장 — 기존 `profiles_update_own`을 `profiles_update_own_or_admin`으로 통합(`(id = (select auth.uid())) OR is_admin()`). 정책을 늘리지 않고 하나로 합치는 것은 MVP Task 008의 `multiple_permissive_policies` 어드바이저 대응 관례를 그대로 따르는 것
  - [ ] **관리자 자기 강등 방지** — 마지막 남은 관리자가 스스로를 `user`로 내리면 아무도 관리자 콘솔에 들어갈 수 없어지므로, 트리거에서 `role='admin'`인 프로필 수가 1일 때의 강등을 거부
  - [ ] `departments` 쓰기 정책 3종 신규 작성 — `departments_insert_admin` / `departments_update_admin` / `departments_delete_admin`, 모두 `is_admin()` 조건. **정책이 없으면 조용히 0건 처리되는 현재 상태를 반드시 해소**
  - [ ] `departments`에 소프트 삭제용 컬럼 추가 — `archived_at timestamptz null` (또는 `is_active boolean not null default true`). 기존 3개 부서는 활성 상태로 백필
  - [ ] `departments_select_authenticated` 정책은 **변경하지 않음** — 비활성 부서도 조회는 가능해야 기존 `weekly_logs`의 부서명 조인과 목록 필터가 깨지지 않음. 비활성 부서를 숨기는 것은 **UI/쿼리 레벨**(신규 선택지에서만 제외)에서 처리
  - [ ] `mcp__supabase__generate_typescript_types`로 `lib/supabase/database.types.ts` 재생성, `lib/types/index.ts`의 `Department` 타입에 신규 컬럼 반영
  - [ ] `mcp__supabase__get_advisors`(security/performance)로 신규 정책·함수의 경고 확인 및 해소 — 신규 함수의 `anon` EXECUTE 권한 회수, `auth.uid()`는 `(select auth.uid())`로 감싸기 등 MVP Task 008의 하드닝 관례 동일 적용
  - **관련 파일**: DB 마이그레이션, `lib/supabase/database.types.ts`, `lib/types/index.ts`
  - **수락 기준**: 일반 사용자가 어떤 경로로도 자신의 `role`을 변경할 수 없고, 관리자는 `departments`에 INSERT/UPDATE/DELETE가 가능하다
  - **테스트 체크리스트** (UI가 없는 단계이므로 `execute_sql` + `set local role authenticated` impersonation으로 검증, 전부 `ROLLBACK`)
    - [ ] 일반 사용자를 impersonate해 `update profiles set role='admin' where id=본인` 시도 → 거부 확인
    - [ ] 일반 사용자가 자신의 `department_id`/`bio` 등 다른 컬럼을 수정하는 기존 흐름은 **회귀 없이 성공**하는지 확인 (하드닝이 정상 기능을 막지 않는지)
    - [ ] 관리자를 impersonate해 타인의 `role`을 `admin`으로 변경 → 성공 확인
    - [ ] 마지막 관리자가 자신을 `user`로 강등 시도 → 거부 확인
    - [ ] 일반 사용자를 impersonate해 `insert into departments` 시도 → 거부 확인 (0건이 아니라 명시적 거부인지)
    - [ ] 관리자를 impersonate해 부서 INSERT/UPDATE 성공 확인
  - **리스크**: 이 Task는 **기존 프로필 저장 흐름(`components/profile-form.tsx`)을 깨뜨릴 수 있는 유일한 지점**입니다. 트리거 조건이 과하면 부서 선택 온보딩 자체가 막히므로, 마이그레이션 직후 실제 계정으로 프로필 저장 회귀 테스트를 반드시 수행할 것

- **Task 027: 부서 관리 UI 구현 (F019)**
  - [ ] `app/protected/admin/departments/page.tsx` 완성 — 부서 목록을 `ui/table`로 렌더링. 컬럼: 부서명 / 소속 인원 수 / 주간업무일지 수 / 상태(활성·비활성) / 액션. 인원·로그 수는 `count` 집계 쿼리로 조회해 **삭제 가능 여부를 사용자가 미리 알 수 있게** 함
  - [ ] `components/department-form-dialog.tsx` 신규 — 추가/수정 겸용 `ui/dialog` + React Hook Form + `lib/schemas/department.ts`(신규, 이름 1~50자·필수·공백 트림). `components/avatar-picker-dialog.tsx`와 동일하게 `value`/`onChange` 기반 순수 컴포넌트로 작성
  - [ ] `lib/actions/department.ts` 신규 — `createDepartmentAction` / `updateDepartmentAction` / `archiveDepartmentAction` / `restoreDepartmentAction` / `deleteDepartmentAction`. 기존 액션과 동일하게 `{success:true} | {success:false, error:string}` 반환, 내부에서 `revalidatePath("/protected/admin/departments")` 호출
  - [ ] **부서명 중복 처리** — `departments.name`에 이미 UNIQUE 제약이 있으므로, Postgres `23505` 오류 코드를 잡아 "이미 존재하는 부서명입니다"라는 한국어 메시지로 변환 (raw 에러 노출 금지)
  - [ ] **삭제 정책 구현 (핵심 결정)** — 기본 동작은 **비활성화(소프트 삭제)**:
    - 참조(부서원 또는 주간업무일지)가 1건이라도 있으면 하드 삭제 버튼을 비활성화하고 "N명의 부서원과 M건의 업무일지가 있어 삭제할 수 없습니다. 비활성화하면 신규 선택 목록에서만 숨겨집니다" 안내
    - 참조가 0건일 때만 `alert-dialog` 확인 후 하드 삭제 허용
    - 하드 삭제 시도가 `weekly_logs`의 RESTRICT FK로 실패하는 경우(경합 상황)도 `23503` 오류를 잡아 동일 메시지로 폴백
    - **`profiles_department_id_fkey`가 SET NULL이라 부서원이 조용히 온보딩으로 튕기는 시나리오는 UI에서 절대 도달할 수 없게** 막는 것이 이 항목의 목적
  - [ ] 비활성 부서 반영 — `components/profile-form.tsx`의 부서 선택 드롭다운과 `components/sign-up-form.tsx`(부서 선택이 추가될 경우)에서 비활성 부서를 제외. 단 **이미 그 부서에 속한 사용자에게는 현재 값이 계속 보이도록** 예외 처리(선택지에서 사라지면 폼이 빈 값으로 저장되는 사고 방지)
  - [ ] 목록 페이지 부서 필터(`components/weekly-log-list-view.tsx`)는 **비활성 부서도 계속 노출** — 과거 데이터 조회가 막히면 안 되므로 "(비활성)" 접미 라벨만 부여
  - **관련 파일**: `app/protected/admin/departments/page.tsx`, `components/department-form-dialog.tsx`(신규), `lib/actions/department.ts`(신규), `lib/schemas/department.ts`(신규), `components/profile-form.tsx`, `components/weekly-log-list-view.tsx`
  - **수락 기준**: 관리자가 화면에서 부서를 추가·이름 변경·비활성화할 수 있고, 데이터가 있는 부서를 삭제해 기존 사용자/로그가 깨지는 경로가 존재하지 않는다
  - **테스트 체크리스트**
    - [ ] Playwright MCP로 부서 추가 → 목록 즉시 반영 → 프로필 화면 드롭다운에도 노출되는지 확인
    - [ ] 기존 부서명과 동일한 이름으로 추가 시 한국어 중복 메시지가 표시되고 저장되지 않는지 확인
    - [ ] 부서명 수정 시 해당 부서의 기존 주간업무일지 목록·PDF의 부서명이 함께 갱신되는지 확인
    - [ ] 부서원·로그가 있는 부서에서 하드 삭제 버튼이 비활성화되고 안내 문구가 노출되는지 확인
    - [ ] 참조 0건 부서를 하드 삭제 → 목록에서 사라지는지 확인
    - [ ] 부서 비활성화 후: 프로필 드롭다운에서 사라지고, 목록 페이지 부서 필터에는 "(비활성)"으로 남으며, 그 부서의 기존 로그가 여전히 조회되는지 확인
    - [ ] 일반 사용자가 `lib/actions/department.ts`의 액션을 직접 호출해도 RLS로 거부되는지 확인 (관리자 UI 은닉만으로 방어하지 않음)
  - **범위 밖 유지**: 부서 계층 구조(상위/하위 부서), 부서장 지정, 부서 통폐합(A 부서의 로그를 B로 일괄 이관)은 요청 범위 밖

- **Task 028: 사용자 관리 UI 구현 — 목록·상세·권한 수정 (F020)**
  - [ ] `app/protected/admin/users/page.tsx` 완성 — 전체 사용자 목록을 `ui/table`로 렌더링. 컬럼: 아바타+이메일 / 소속 부서 / 역할 / 가입일 / 액션(상세 보기). `profiles_select_own_or_admin` 정책 덕분에 관리자는 추가 정책 없이 전체 조회 가능
  - [ ] 검색·필터 — 이메일 키워드 검색(`escapeLikePattern` + `ilike`), 부서 필터, 역할 필터. 기존 목록 페이지와 동일하게 `searchParams` 기반 서버 재조회 + Suspense 구조
  - [ ] 20건 단위 페이지네이션 — `components/ui/pagination.tsx`(MVP Task 018 설치분) 재사용. 현재 34명 규모라 필수는 아니나 목록 페이지와 UX를 통일
  - [ ] 목록 행(또는 이메일) 클릭 시 `app/protected/admin/users/[id]/page.tsx`로 이동 — 목록의 역할 셀렉트는 빠른 변경용으로 유지하되, 정식 권한 수정 흐름은 상세 페이지를 기본 경로로 안내
  - [ ] **`app/protected/admin/users/[id]/page.tsx` 신규(사용자 상세)** — 대상 사용자의 프로필 전체(이메일·아바타·소속 부서·역할·전화번호·자기소개·가입일)를 조회해 표시. 존재하지 않는 `id`는 MVP Task 014에서 실측된 "잘못된 UUID 500 크래시" 사례와 동일하게 방어(`notFound()`로 404 처리, 크래시 금지)
  - [ ] 사용자 상세 페이지에 **해당 사용자가 작성한 주간업무일지 요약** 표시 — 총 작성 건수, 상태별 분포(예정/진행중/완료), 최근 5건 목록(제목·날짜·상태, 클릭 시 해당 상세로 이동). 관리자가 "이 사용자를 강등/부서 이전해도 되는지" 판단할 근거를 목록 화면 없이 한 번에 확인할 수 있게 함
  - [ ] 사용자 상세 페이지에 **역할·소속 부서 변경 폼** 배치(이 Task의 핵심 권한 수정 UI) — `ui/select`(user/admin) + 부서 선택 `ui/select`, React Hook Form 없이 단순 상태로도 무방(필드 2개뿐)
  - [ ] `lib/actions/user-admin.ts` 신규 — `updateUserRoleAction(userId, role)`, `updateUserDepartmentAction(userId, departmentId)`. 서버에서 호출자의 `profiles.role`을 재조회해 관리자인지 확인(클라이언트 값 불신) 후 실행하며, RLS·트리거로도 이중 방어됨
  - [ ] 역할 변경 UI — 목록의 인라인 셀렉트와 상세 페이지의 폼 양쪽 모두 즉시 반영 + 낙관적 업데이트 + 실패 시 롤백 + `sonner` 토스트. `components/weekly-log-detail-view.tsx`의 진행상태 변경 패턴을 그대로 재사용
  - [ ] **자기 자신 강등 방지 UI** — 로그인한 관리자 본인 행(목록)·본인 상세 페이지의 역할 컨트롤은 비활성화하고 "본인 역할은 변경할 수 없습니다" 안내 노출 (Task 026의 DB 트리거와 이중 방어)
  - [ ] 소속 부서 변경 시 경고 — 사용자의 부서를 바꾸면 **그 사용자가 기존에 작성한 `weekly_logs`의 쓰기 권한을 잃는다**(RLS가 `department_id = current_department_id()` 기준). 변경 확인 `alert-dialog`에 이 영향을 명시(상세 페이지의 작성 건수 요약과 함께 보여주면 판단에 도움)
  - [ ] 역할 변경 즉시 반영 확인 — 권한은 매 요청 `profiles.role`을 조회하는 구조라 재로그인이 불필요함(`docs/guides/deployment-ops.md` 4절에 기록된 MVP 검증 결과)을 UI 안내 문구에도 반영
  - **관련 파일**: `app/protected/admin/users/page.tsx`, `app/protected/admin/users/[id]/page.tsx`(신규), `lib/actions/user-admin.ts`(신규), `components/user-admin-table.tsx`(신규), `components/user-admin-detail.tsx`(신규)
  - **수락 기준**: 관리자가 목록에서 사용자를 조회하고, 개별 사용자의 상세 화면(프로필 전체 정보 + 작성 업무일지 요약)을 확인하고, 목록과 상세 양쪽에서 `admin`으로 승격/강등 및 소속 부서 변경이 가능하며, 변경이 재로그인 없이 즉시 권한에 반영된다
  - **테스트 체크리스트**
    - [ ] Playwright MCP로 목록에서 사용자 클릭 → 상세 페이지 이동 → 프로필 전체 정보와 작성 업무일지 요약이 정확히 표시되는지 확인
    - [ ] 존재하지 않는 `id`로 상세 페이지 직접 접근 시 500 크래시 없이 404 처리되는지 확인
    - [ ] 일반 사용자를 상세 페이지에서 관리자로 승격 → 해당 계정으로 로그인 시 헤더에 "관리자" 배지와 관리자 메뉴가 노출되는지 확인
    - [ ] 승격된 계정이 재로그인 없이(세션 유지 상태에서) 타 부서 로그를 수정할 수 있는지 확인
    - [ ] 관리자를 일반 사용자로 강등 → 관리자 라우트 접근이 즉시 차단되는지 확인
    - [ ] 목록의 인라인 역할 변경과 상세 페이지의 역할 변경 양쪽이 서로 동기화되는지(한쪽에서 변경 후 다른 화면 새로고침 시 반영) 확인
    - [ ] 본인 행/본인 상세 페이지의 역할 컨트롤이 비활성화되어 있는지, DB 레벨에서도 거부되는지 확인
    - [ ] 마지막 관리자 강등 시도가 거부되고 한국어 메시지가 표시되는지 확인
    - [ ] 사용자의 부서 변경 후 그 사용자의 기존 로그에 대한 쓰기 UI(`canWrite`)가 실제로 사라지는지 확인
    - [ ] 일반 사용자가 `/protected/admin/users`, `/protected/admin/users/[id]`에 직접 접근 시 차단되는지 확인
  - **범위 밖 유지**: 사용자 계정 삭제/비활성화, 초대 기반 가입, 부서별 관리자(부분 권한) 같은 3단계 이상의 역할 체계는 요청 범위 밖 — 역할은 `user`/`admin` 2단계 유지

---

### Phase 2: 조회·분석 기능 확장

> 목표: 기존 `weekly_logs` 데이터를 더 잘 찾고(F021), 한눈에 읽을 수 있는(F024) 상태. **읽기 전용 확장이라 기존 권한 모델을 전혀 건드리지 않음.**
> **선행 조건**: 없음 — Phase 1과 병렬 진행 가능 (충돌 지점은 `components/header-nav.tsx`의 `navLinks`뿐).

- **Task 029: 주간업무일지 기간 범위 검색/필터 구현 (F021)**
  - [ ] `app/protected/weekly-logs/page.tsx` — `searchParams`에 `from`/`to` 추가. 기존 `department`/`q`/`status` 파라미터와 **AND 조합**으로 동작하며, 키워드 검색 분기(title/content 각각 `ilike` 후 병합)의 **양쪽 쿼리에 모두 동일한 날짜 조건을 적용**해야 함(한쪽만 적용하면 병합 결과가 필터를 우회)
  - [ ] 필터 의미 확정 — "기간이 겹치는 항목"(`start_date <= to AND target_end_date >= from`) 방식을 기본으로 채택. 단순히 `start_date`만 비교하면 장기 과제가 조회 기간에서 누락되므로 부적절. **이 결정을 코드 주석에도 남길 것**
  - [ ] 날짜 파라미터 검증 — `z.string().date()`로 형식 검증 후 실패 시 필터 미적용(에러 화면 대신 무시). `from > to`인 경우 값을 교환하거나 무시하고 안내 표시. MVP Task 014에서 잘못된 UUID가 500 크래시를 유발했던 사례와 동일한 방어
  - [ ] `components/weekly-log-list-view.tsx` — 시작일/종료일 `<Input type="date">` 2개와 [초기화] 버튼 추가. 값 변경 시 기존 필터와 동일하게 `router.push`로 URL 갱신
  - [ ] 프리셋 빠른 선택 — "이번 주 / 이번 달 / 최근 3개월" 버튼으로 날짜 두 개를 한 번에 채움 (실사용 빈도가 가장 높은 조작을 2클릭 → 1클릭으로)
  - [ ] 활성 필터 요약 표시 — 현재 적용된 부서·상태·키워드·기간을 배지로 노출하고 개별 해제 가능하게 (필터가 4종으로 늘어나 "왜 결과가 0건인지" 알기 어려워짐)
  - [ ] PDF 다운로드(`lib/pdf/weekly-log-pdf.ts`) 연동 확인 — PDF는 **화면에 보이는 필터 결과와 항상 일치**해야 하므로(MVP Task 013의 설계 원칙), 기간 필터가 적용된 목록이 그대로 전달되는지 확인하고 PDF 헤더에 기간 범위 표기 추가
  - [ ] 페이지네이션 상호작용 — 기간 필터 변경 시 1페이지로 리셋 (기존 부서·검색 필터와 동일 동작)
  - **관련 파일**: `app/protected/weekly-logs/page.tsx`, `components/weekly-log-list-view.tsx`, `lib/pdf/weekly-log-pdf.ts`, `lib/types/index.ts`
  - **수락 기준**: 사용자가 기간을 지정해 목록을 좁힐 수 있고, 기간·부서·상태·키워드 4종 필터가 서로 간섭 없이 조합되며, PDF 결과가 화면과 일치한다
  - **테스트 체크리스트**
    - [ ] Playwright MCP로 기간만 지정 → 해당 기간과 겹치는 항목만 남는지 확인 (기간 양끝 경계값 포함 여부 검증)
    - [ ] 기간 + 키워드 조합 시 두 조건이 모두 적용되는지 확인 (키워드 검색 분기의 병합 경로 우회 여부 집중 검증)
    - [ ] 기간 + 부서 + 상태 3종 동시 적용 결과 확인
    - [ ] `from > to`인 잘못된 입력과 `?from=abc` 같은 비정상 파라미터에서 500 없이 안전하게 처리되는지 확인
    - [ ] 결과 0건일 때 EmptyState와 활성 필터 배지가 함께 노출되는지 확인
    - [ ] 기간 필터 적용 후 PDF 다운로드 시 화면과 동일한 항목만 포함되는지 확인
  - **범위 밖 유지**: 저장된 필터 프리셋(사용자별 즐겨찾기), 상대 기간 표현(`지난 분기` 등의 동적 계산)은 요청 범위 밖

- **Task 030: 통계 집계 데이터 계층 구축 (F024 백엔드)**
  - [ ] 집계 방식 결정 — **DB 집계(`SECURITY INVOKER` RPC 함수)를 기본**으로 채택. 클라이언트 집계는 현재 167건 규모에선 동작하지만 전체 행을 매번 내려받아야 하고, RLS를 우회하지 않으려면 `INVOKER`가 필수(`is_admin()`/`current_department_id()`와 달리 이 함수들은 데이터를 반환하므로 `DEFINER`로 만들면 안 됨)
  - [ ] 집계 RPC 함수 신규 작성 (마이그레이션):
    - `stats_logs_by_department(from_date, to_date)` — 부서별 건수(상태별 분해 포함)
    - `stats_logs_by_status(from_date, to_date, dept_id)` — 상태 분포(예정/진행중/완료)
    - `stats_logs_monthly_trend(months, dept_id)` — 월별 생성·완료 추이
    - `stats_workload_summary(from_date, to_date, dept_id)` — `estimated_mm` 합계, `estimated_cost` 합계, 평균 소요 기간
  - [ ] 함수 권한 정리 — 신규 함수의 `anon` EXECUTE 권한 회수, `authenticated`만 유지 (MVP Task 008의 하드닝 관례)
  - [ ] `weekly_logs`에 집계용 인덱스 검토 — `(department_id, start_date)` 복합 인덱스가 필요한지 `EXPLAIN ANALYZE`로 실측 후 결정. **현재 167건 규모에서는 불필요할 가능성이 높으므로 과도한 사전 최적화를 하지 말 것**(MVP Task 016에서 동일한 판단 기록 있음)
  - [ ] `mcp__supabase__generate_typescript_types` 재생성 후 `lib/types/stats.ts` 신규 — 각 집계 결과의 도메인 타입 정의
  - [ ] `lib/queries/stats.ts` 신규 — 서버 컴포넌트에서 호출할 조회 함수 래퍼(`await createClient()` → `.rpc(...)`), 실패 시 빈 배열 폴백
  - [ ] **NULL 처리 정책 확정** — `estimated_mm`/`estimated_cost`는 nullable 선택 입력이라 대다수 행이 NULL일 수 있음. 합계에서 NULL을 0으로 볼지 제외할지 결정하고, 화면에도 "입력된 N건 기준"을 명시
  - **관련 파일**: DB 마이그레이션, `lib/queries/stats.ts`(신규), `lib/types/stats.ts`(신규), `lib/supabase/database.types.ts`
  - **수락 기준**: 각 RPC가 정확한 집계를 반환하고, **일반 사용자가 호출해도 RLS 범위를 벗어난 데이터가 나오지 않는다**(단, `weekly_logs` SELECT는 전 부서 공개이므로 통계도 전 부서가 정상 — 이 점을 명시적으로 확인)
  - **테스트 체크리스트**
    - [ ] 각 RPC를 `execute_sql`로 직접 호출해 반환값이 동일 조건의 수동 `count`/`sum` 쿼리와 일치하는지 대조
    - [ ] 일반 사용자를 impersonate해 호출 시 `SECURITY INVOKER`가 RLS를 정상 적용하는지 확인
    - [ ] 기간 파라미터 경계값(시작=종료, 데이터 없는 기간)에서 빈 결과가 오류 없이 반환되는지 확인
    - [ ] `estimated_mm`/`estimated_cost`가 전부 NULL인 부서에서 합계가 0 또는 null로 안전하게 처리되는지 확인
    - [ ] 비활성(Task 027) 부서의 과거 로그가 통계에서 누락되지 않는지 확인

- **Task 031: 통계 대시보드 UI 및 차트 구현 (F024 프론트엔드)**
  - [ ] **차트 라이브러리 도입** — `npx shadcn@latest add chart`로 `components/ui/chart.tsx` + `recharts` 설치. 이 프로젝트는 이미 shadcn/ui(`new-york`) 기반이라 별도 차트 라이브러리를 직접 도입하는 것보다 shadcn `chart` 래퍼가 **다크모드·CSS 변수 테마와 자동으로 맞물린다**는 점이 결정 근거. 설치 후 번들 크기 영향을 `npm run build`로 확인하고, 필요하면 PDF 라이브러리처럼 `await import()` 동적 로딩 검토
  - [ ] 차트 색상 토큰 추가 — `--chart-1` ~ `--chart-5`를 `app/globals.css`의 `:root`/`.dark`와 `tailwind.config.ts`에 **함께** 추가(CLAUDE.md 규칙). 진행상태 색상은 기존 배지 배색(예정=warning 주황 / 진행중=success 초록 / 완료=secondary 회색, MVP Task 020)과 **일관되게** 매핑
  - [ ] `app/protected/dashboard/page.tsx` 신규 — 부서 게이트 체크 포함(CLAUDE.md 관례), Suspense + 신규 `components/dashboard-skeleton.tsx`로 스트리밍
  - [ ] 요약 카드 4종 — 전체 로그 수 / 진행중 / 완료율 / 이번 달 신규 (`ui/card` 재사용)
  - [ ] 차트 4종:
    - 부서별 건수 — 가로 막대(상태별 스택)
    - 진행상태 분포 — 도넛
    - 월별 추이 — 선형(생성 vs 완료)
    - 부서별 예상 M/M·금액 — 막대 (입력된 건수 기준임을 명시)
  - [ ] 대시보드 자체 필터 — 기간·부서 필터를 `searchParams` 기반으로 구현해 목록 페이지와 동일한 조작감 유지. Task 029의 기간 프리셋 컴포넌트를 재사용할 수 있도록 `components/date-range-filter.tsx`로 추출
  - [ ] 반응형 — 데스크탑 2열 그리드 → 태블릿/모바일 1열. 차트는 `ResponsiveContainer`로 폭에 맞춰 축소되며, 모바일에서 축 라벨이 겹치지 않는지 확인
  - [ ] 접근성 — 차트만으로는 스크린리더가 데이터를 읽을 수 없으므로 각 차트에 **동일 데이터의 요약 텍스트 또는 표 대체 콘텐츠** 제공 (MVP Task 015에서 `aria-label` 누락 이슈가 실제로 발견된 전례 반영)
  - [ ] `components/header-nav.tsx`의 `navLinks`에 "대시보드" 링크 추가 (Task 025와 같은 파일을 수정하므로 병렬 진행 시 충돌 주의)
  - **관련 파일**: `app/protected/dashboard/**`(신규), `components/ui/chart.tsx`(신규), `components/dashboard-*.tsx`(신규), `components/date-range-filter.tsx`(신규), `app/globals.css`, `tailwind.config.ts`, `components/header-nav.tsx`
  - **수락 기준**: 모든 로그인 사용자가 `/protected/dashboard`에서 부서별·기간별 현황을 차트로 확인할 수 있고, 라이트/다크 양쪽에서 판독 가능하며, 3개 뷰포트에서 레이아웃이 깨지지 않는다
  - **테스트 체크리스트**
    - [ ] Playwright MCP로 대시보드 진입 → 4개 차트가 모두 렌더링되고 콘솔 에러 0건인지 확인
    - [ ] 차트 숫자가 Task 030의 RPC 결과 및 목록 페이지 실제 건수와 일치하는지 대조
    - [ ] 기간/부서 필터 변경 시 모든 차트가 함께 갱신되는지 확인
    - [ ] 데이터 0건 조건(신규 부서 또는 데이터 없는 기간)에서 빈 차트가 오류 없이 안내 문구로 대체되는지 확인
    - [ ] 라이트/다크 테마 각각에서 차트 색상 대비 확인 (스크린샷 대조)
    - [ ] 1280/768/390 3개 뷰포트에서 레이아웃·축 라벨 확인
    - [ ] `npm run build` 후 번들 크기 및 대시보드 진입 전 recharts 청크가 로드되지 않는지 네트워크 실측 (PDF 청크와 동일한 방식)
  - **범위 밖 유지**: 차트 이미지 내보내기(PNG), 대시보드 PDF 리포트, 사용자별 대시보드 커스터마이징(위젯 배치)은 요청 범위 밖

---

### Phase 3: 협업 기능 (댓글·멘션)

> 목표: 주간업무일지에서 대화가 이루어지는 상태. 이번 v1에서 **신규 테이블·신규 RLS가 추가되는 가장 큰 단위**.
> **선행 조건**: Phase 1 완료(역할·부서 모델 확정). Phase 2와는 독립.

- **Task 032: 댓글·멘션 스키마 및 서버 액션 구현 (F022 백엔드)**
  - [ ] **DB 마이그레이션 — `weekly_log_comments` 테이블 신규 생성**
    - `id uuid pk`, `weekly_log_id uuid → weekly_logs(id) on delete cascade`, `author_id uuid → profiles(id)`, `content text not null` (1~2000자 CHECK), `parent_comment_id uuid null → weekly_log_comments(id) on delete cascade` (1단계 대댓글용), `created_at`, `updated_at`, `deleted_at timestamptz null`(소프트 삭제)
    - 인덱스: `(weekly_log_id, created_at)`, `author_id`(FK 커버링 — MVP Task 008에서 `unindexed_foreign_keys` 어드바이저 경고를 받았던 전례 반영)
    - `set_updated_at()` 트리거 적용 (기존 함수 재사용)
  - [ ] **`weekly_log_comment_mentions` 테이블 신규 생성** — `comment_id → weekly_log_comments(id) on delete cascade`, `mentioned_user_id → profiles(id)`, `created_at`, `unique(comment_id, mentioned_user_id)`. 멘션을 본문 파싱이 아니라 **별도 행으로 정규화**하는 이유는 Task 034의 알림 생성 트리거가 "누구에게 알릴지"를 텍스트 파싱 없이 결정할 수 있어야 하기 때문
  - [ ] **RLS 정책 — 기존 부서 모델을 그대로 확장**
    - SELECT: 전 인증 사용자 공개 (`weekly_logs`가 이미 전 부서 SELECT 공개이므로 댓글만 부서로 막으면 "보이는 글에 안 보이는 댓글"이라는 모순이 생김)
    - INSERT: **작성자 본인(`author_id = auth.uid()`)이면 부서 무관하게 허용** — 댓글은 "타 부서 업무에 의견을 남기는 것"이 목적이므로 `weekly_logs`의 부서 제한(`current_department_id()`)을 그대로 복사하면 기능 자체가 무의미해짐. **이것이 이번 v1에서 기존 권한 모델과 의도적으로 달라지는 유일한 지점이므로 마이그레이션 주석과 PRD에 근거를 명시할 것**
    - UPDATE/DELETE: 작성자 본인 또는 `is_admin()`
    - 멘션 테이블: SELECT 전체 공개, INSERT는 해당 댓글의 작성자만
  - [ ] `mcp__supabase__generate_typescript_types` 재생성, `lib/types/index.ts`에 `WeeklyLogComment`(작성자 이메일·아바타 조인 포함) 타입 추가
  - [ ] `lib/schemas/comment.ts` 신규 — 내용 1~2000자, 공백만 입력 거부
  - [ ] `lib/actions/weekly-log-comment.ts` 신규 — `createCommentAction` / `updateCommentAction` / `deleteCommentAction`. 기존 액션과 동일한 `{success, error}` 규약 + `revalidatePath`
  - [ ] **멘션 파싱을 서버에서 수행** — 클라이언트가 보낸 멘션 목록을 신뢰하지 않고, `createCommentAction`에서 본문의 `@[이메일](uuid)` 토큰을 파싱해 실존하는 `profiles.id`만 `weekly_log_comment_mentions`에 삽입. 존재하지 않는 id는 조용히 무시
  - [ ] **댓글 본문 sanitize** — 댓글은 Tiptap 리치 텍스트가 아니라 **plain text**로 저장하고 렌더링 시 이스케이프. `lib/sanitize-html.ts`를 재사용하되 허용 태그를 더 좁히거나, 아예 HTML을 허용하지 않는 편이 공격면이 작음 — **둘 중 하나를 선택하고 근거를 기록할 것**
  - [ ] 소프트 삭제 정책 — 대댓글이 달린 댓글을 물리 삭제하면 스레드가 끊기므로 `deleted_at`을 채우고 "삭제된 댓글입니다"로 렌더링
  - [ ] `mcp__supabase__get_advisors`로 신규 테이블의 RLS·인덱스 경고 확인 및 해소
  - **관련 파일**: DB 마이그레이션, `lib/actions/weekly-log-comment.ts`(신규), `lib/schemas/comment.ts`(신규), `lib/types/index.ts`, `lib/supabase/database.types.ts`
  - **수락 기준**: 댓글 CRUD가 서버 액션으로 동작하고, 멘션이 별도 테이블에 정규화되어 기록되며, 타인의 댓글을 수정/삭제할 수 없다
  - **테스트 체크리스트** (UI 이전 단계이므로 impersonation SQL + 액션 직접 호출로 검증)
    - [ ] 타 부서 사용자가 댓글을 작성할 수 있는지 확인 (의도된 완화가 실제로 동작하는지)
    - [ ] 타인의 댓글 UPDATE/DELETE 시도 시 거부되는지 확인
    - [ ] 관리자는 타인의 댓글을 삭제할 수 있는지 확인
    - [ ] 존재하지 않는 사용자 id로 멘션 토큰을 조작해 전송 시 멘션 행이 생성되지 않고 댓글 저장은 성공하는지 확인
    - [ ] `weekly_logs` 행 삭제 시 댓글·멘션이 CASCADE로 함께 삭제되는지 확인
    - [ ] 2000자 초과 / 공백만 입력이 서버에서 거부되는지 확인 (클라이언트 검증 우회 시나리오)
    - [ ] 댓글 본문에 `<script>` 등을 넣어도 저장·렌더링 양쪽에서 무해화되는지 확인

- **Task 033: 댓글·멘션 UI 구현 (F022 프론트엔드)**
  - [ ] `components/weekly-log-comment-section.tsx` 신규 — 상세 페이지 하단에 댓글 목록 + 입력 폼. 작성자 아바타(`lib/constants/avatars.ts`의 프리셋 재사용)·이메일·상대 시간 표시
  - [ ] `app/protected/weekly-logs/[id]/page.tsx` — 댓글 조회 쿼리 추가(작성자 `profiles` 조인), `WeeklyLogDetail` 타입에 `comments` 추가. **첨부파일 조회와 동일한 패턴**으로 확장
  - [ ] `components/mention-input.tsx` 신규 — `@` 입력 시 사용자 목록 팝오버 노출, 이메일 키워드로 필터(서버 액션 또는 클라이언트 조회 + `escapeLikePattern`), 선택 시 `@[이메일](uuid)` 토큰 삽입. **멘션 라이브러리를 새로 도입하지 않고 `ui/command` 또는 기존 `ui/dialog`/`ui/select` 조합으로 구현 가능한지 먼저 검토**할 것(의존성 최소화)
  - [ ] 멘션 렌더링 — 저장된 토큰을 배지 스타일로 렌더링. 멘션된 사용자가 본인이면 강조 표시
  - [ ] 1단계 대댓글 — 답글 버튼 → 들여쓰기된 입력. **2단계 이상 중첩은 지원하지 않음**(스레드 렌더링 복잡도 대비 실익이 낮음)
  - [ ] 수정/삭제 — 본인 댓글(또는 관리자)에만 노출. 삭제는 `alert-dialog` 확인 후 소프트 삭제
  - [ ] 중복 제출 방지 — `useRef` 동기 가드 적용 (MVP Task 014에서 실측된 더블클릭 중복 생성 버그의 재발 방지)
  - [ ] 에러 처리 — 모든 액션 호출부를 `try/catch/finally`로 감싸 네트워크 실패 시 롤백 + 한국어 토스트 (MVP Task 014에서 확립된 관례)
  - [ ] 상세 페이지 상단에 댓글 수 표시, 목록 페이지(`weekly-log-table.tsx`/`weekly-log-card.tsx`)에도 댓글 수 배지 추가 검토
  - [ ] 반응형 — 모바일에서 멘션 팝오버가 화면을 벗어나지 않는지, 입력창이 키보드에 가리지 않는지 확인
  - **관련 파일**: `components/weekly-log-comment-section.tsx`(신규), `components/mention-input.tsx`(신규), `app/protected/weekly-logs/[id]/page.tsx`, `components/weekly-log-detail-view.tsx`, `lib/types/index.ts`
  - **수락 기준**: 사용자가 상세 페이지에서 댓글을 작성·수정·삭제하고 `@`로 다른 사용자를 멘션할 수 있으며, 멘션이 정확한 사용자에게 연결된다
  - **테스트 체크리스트**
    - [ ] Playwright MCP로 댓글 작성 → 즉시 목록에 노출 → 새로고침 후에도 유지되는지 확인
    - [ ] `@` 입력 시 사용자 목록이 뜨고, 키워드 입력으로 필터되며, 선택 시 토큰이 삽입되는지 확인
    - [ ] 저장 후 멘션이 배지로 렌더링되고 `weekly_log_comment_mentions`에 행이 생성되는지 SQL로 확인
    - [ ] 타 부서 사용자 계정으로 댓글 작성이 가능한지 확인
    - [ ] 타인 댓글에 수정/삭제 버튼이 노출되지 않고, 직접 액션 호출 시에도 거부되는지 확인
    - [ ] 대댓글 작성 → 부모 댓글 아래 들여쓰기로 표시되는지 확인
    - [ ] 부모 댓글 삭제 시 "삭제된 댓글입니다"로 표시되고 대댓글은 유지되는지 확인
    - [ ] 저장 버튼 더블클릭 시 댓글이 1건만 생성되는지 확인
    - [ ] 네트워크 실패 강제 주입 시 에러 토스트가 뜨고 UI가 멈추지 않는지 확인
    - [ ] 3개 뷰포트에서 댓글 섹션·멘션 팝오버 레이아웃 확인
  - **범위 밖 유지**: 댓글 첨부파일, 이모지 반응, 댓글 검색, 댓글 페이지네이션(초기엔 전체 로드 후 건수가 늘면 재검토)

---

### Phase 4: 실시간 알림 시스템

> 목표: 멘션·댓글이 발생하면 상대방 화면에 새로고침 없이 알림이 뜨는 상태. **이 프로젝트 최초의 Supabase Realtime 도입**이라 인프라 리스크가 가장 큼.
> **선행 조건**: Task 032·033 완료 (알림의 발생원이 댓글·멘션).

- **Task 034: 알림 스키마 설계 및 Realtime 인프라 도입 (F023 백엔드)**
  - [ ] **DB 마이그레이션 — `notifications` 테이블 신규 생성**
    - `id uuid pk`, `recipient_id uuid → profiles(id) on delete cascade`, `actor_id uuid → profiles(id)`, `type text` (`mention` | `comment` | `reply` CHECK 제약 — MVP의 `status`/`role`과 동일한 CHECK 방식), `weekly_log_id uuid → weekly_logs(id) on delete cascade`, `comment_id uuid null → weekly_log_comments(id) on delete cascade`, `read_at timestamptz null`, `created_at`
    - 인덱스: `(recipient_id, read_at, created_at desc)` — "내 안 읽은 알림" 조회가 유일한 핫 경로
  - [ ] **RLS 정책 — 알림은 부서 모델이 아니라 수신자 기준**
    - SELECT: `recipient_id = (select auth.uid())`만 (전 부서 공개인 다른 테이블과 **다름** — 알림은 개인 데이터)
    - UPDATE: 수신자 본인만, 그리고 **`read_at`만 변경 가능**해야 함 (Task 026에서 `profiles.role`에 적용한 것과 같은 컬럼 보호 문제 — 동일한 트리거 패턴 재사용)
    - INSERT: **클라이언트 직접 삽입을 허용하지 않음**(정책 없음). 알림은 아래 DB 트리거로만 생성 — 클라이언트가 임의 사용자에게 알림을 보낼 수 있으면 스팸 벡터가 됨
    - DELETE: 수신자 본인만
  - [ ] **알림 생성 트리거 작성** — `weekly_log_comment_mentions`에 INSERT 시 `mention` 알림, `weekly_log_comments`에 INSERT 시 해당 로그의 작성자에게 `comment` 알림(+ 대댓글이면 부모 댓글 작성자에게 `reply`). `SECURITY DEFINER`로 작성해 RLS INSERT 정책 부재를 우회. **자기 자신에게는 알림을 만들지 않고**, 멘션과 댓글 알림이 같은 사람에게 중복되지 않도록 억제
  - [ ] **Realtime publication 등록** — `alter publication supabase_realtime add table notifications`. 현재 publication에 테이블이 0개이므로 이것이 이 프로젝트 최초의 등록. **`notifications`만 등록하고 `weekly_logs`/`comments`는 등록하지 않는다** — 필요 이상으로 브로드캐스트 대상을 늘리면 대역폭과 권한 노출면이 함께 커짐
  - [ ] **Realtime 권한 확인 (가장 중요)** — Supabase Realtime의 Postgres Changes는 **구독자의 RLS를 평가해 페이로드를 필터링**하므로, `notifications`의 SELECT 정책이 `recipient_id = auth.uid()`인지 반드시 재확인. 정책이 느슨하면 **타인의 알림이 그대로 브로드캐스트됨**
  - [ ] `mcp__supabase__generate_typescript_types` 재생성, `lib/types/index.ts`에 `Notification` 타입 추가
  - [ ] `lib/actions/notification.ts` 신규 — `markNotificationReadAction`, `markAllNotificationsReadAction`, `deleteNotificationAction`
  - [ ] 보존 정책 결정 — 오래된 읽은 알림의 정리 방식(예: 90일 경과분 삭제)을 결정하고, 구현하지 않더라도 `docs/guides/deployment-ops.md`에 운영 절차로 기록
  - [ ] `mcp__supabase__get_advisors`로 신규 테이블·함수 경고 확인 및 해소
  - **관련 파일**: DB 마이그레이션, `lib/actions/notification.ts`(신규), `lib/types/index.ts`, `lib/supabase/database.types.ts`, `docs/guides/deployment-ops.md`
  - **수락 기준**: 댓글·멘션 발생 시 알림 행이 자동 생성되고, 수신자 외에는 어떤 경로로도 그 알림을 조회할 수 없다
  - **테스트 체크리스트** (impersonation SQL 중심, `ROLLBACK` 사용)
    - [ ] 사용자 A가 B를 멘션한 댓글 작성 → B에게 `mention` 알림 1건 생성 확인
    - [ ] A가 자기 글에 자기 댓글 작성 → 알림이 생성되지 않는지 확인
    - [ ] 한 댓글에서 로그 작성자를 멘션한 경우 `mention`/`comment` 알림이 중복 생성되지 않는지 확인
    - [ ] B를 impersonate해 A의 알림 SELECT 시도 → 0건 확인
    - [ ] 클라이언트 롤로 `notifications` 직접 INSERT 시도 → 거부 확인
    - [ ] 수신자가 `read_at` 외 컬럼(`recipient_id` 등) 변경 시도 → 거부 확인
    - [ ] 댓글/로그 삭제 시 연결된 알림이 CASCADE로 정리되는지 확인
    - [ ] `supabase_realtime` publication에 `notifications`만 등록되어 있는지 확인

- **Task 035: 실시간 알림 UI 및 구독 구현 (F023 프론트엔드)**
  - [ ] `components/notification-bell.tsx` 신규 — 헤더에 종 아이콘 + 안 읽은 개수 배지, 클릭 시 `ui/dropdown-menu`로 최근 알림 10건. `components/header-nav.tsx`(데스크탑)·`components/mobile-nav.tsx`(모바일) **양쪽에 반영**(아바타 노출 때와 동일한 이중 반영 필요, MVP Task 024 전례)
  - [ ] **Realtime 구독 구현** — `hooks/use-notifications.ts` 신규. **반드시 `lib/supabase/client.ts`(브라우저 클라이언트)로** `supabase.channel("notifications:{userId}").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: "recipient_id=eq.{userId}" }, ...)` 구독. 서버 클라이언트로는 구독할 수 없음(CLAUDE.md의 클라이언트 3종 구분 규칙)
  - [ ] **구독 정리(cleanup) 필수** — `useEffect` 반환값에서 `supabase.removeChannel(channel)` 호출. 누락하면 라우트 이동마다 채널이 누적돼 커넥션이 고갈됨. 이 프로젝트 최초의 Realtime 사용이라 **누수 여부를 실제로 계측할 것**(라우트 10회 이동 후 채널 수 확인)
  - [ ] 초기 데이터는 서버에서, 이후 갱신만 Realtime으로 — 헤더는 서버 컴포넌트에서 안 읽은 개수를 조회해 첫 페인트에 반영하고, 구독은 그 위에 증분으로 얹음(`cacheComponents` 하에서 Suspense fallback 유지)
  - [ ] **연결 실패 폴백** — Realtime 연결이 끊기거나 실패해도 앱이 정상 동작해야 함. `channel.subscribe((status) => ...)`로 상태를 감지해 실패 시 폴링(예: 60초 간격) 또는 조용한 비활성화로 폴백하고, **에러 토스트로 사용자를 방해하지 않을 것**
  - [ ] 알림 클릭 동선 — 해당 주간업무일지 상세 페이지의 댓글 위치로 이동(`/protected/weekly-logs/{id}#comment-{commentId}`) 후 자동으로 읽음 처리
  - [ ] [모두 읽음] 버튼, 알림 없을 때 EmptyState (`components/empty-state.tsx` 재사용)
  - [ ] 브라우저 탭 제목에 안 읽은 개수 표시 검토(선택) — 데스크탑 알림(Notification API)은 권한 요청 UX 부담이 있으므로 **이번 범위에서 제외**
  - [ ] 접근성 — 종 버튼에 `aria-label`(예: "알림 3건") 부여. MVP Task 015에서 아이콘 전용 버튼의 접근성 이름 누락이 실제로 발견된 전례가 있으므로 처음부터 반영
  - **관련 파일**: `components/notification-bell.tsx`(신규), `hooks/use-notifications.ts`(신규), `components/header-nav.tsx`, `components/mobile-nav.tsx`, `components/site-header.tsx`
  - **수락 기준**: 브라우저 두 개(사용자 A·B)에서 A가 B를 멘션하면 **새로고침 없이** B의 헤더에 알림이 나타나고, 클릭 시 해당 댓글로 이동하며 읽음 처리된다
  - **테스트 체크리스트**
    - [ ] Playwright MCP로 두 개의 브라우저 컨텍스트(A·B)를 띄워 A의 멘션 댓글 작성 → B 화면에 새로고침 없이 알림 배지 증가 확인 (**이 Task의 핵심 검증**)
    - [ ] 알림 클릭 → 해당 상세 페이지·댓글 위치로 이동하고 읽음 처리되어 배지가 감소하는지 확인
    - [ ] [모두 읽음] 클릭 시 배지가 0이 되고 새로고침 후에도 유지되는지 확인
    - [ ] 타인의 알림이 브로드캐스트되지 않는지 확인 (B의 알림 발생 시 A의 배지가 변하지 않는지)
    - [ ] 라우트를 10회 이동한 뒤 Realtime 채널이 누적되지 않는지 계측 (구독 정리 검증)
    - [ ] Realtime 연결을 강제로 끊었을 때 앱이 정상 동작하고 에러 토스트로 사용자를 방해하지 않는지 확인
    - [ ] 로그아웃 시 구독이 정리되고, 다른 계정으로 로그인했을 때 이전 사용자의 알림이 남지 않는지 확인
    - [ ] 데스크탑·모바일 헤더 양쪽에서 알림 UI가 정상 노출되는지 확인
    - [ ] 콘솔 에러·하이드레이션 경고 0건 확인
  - **범위 밖 유지**: 이메일 알림, 브라우저 푸시 알림(Web Push), 알림 설정 화면(유형별 on/off), 실시간 댓글 스트리밍(다른 사람의 댓글이 상세 페이지에 실시간으로 추가되는 것)은 요청 범위 밖

---

### Phase 5: 통합 검증 및 v1 마감

> 목표: 6가지 기능이 서로, 그리고 MVP 기능과 충돌 없이 동작함을 증명하고 배포 가능한 상태.

- **Task 036: v1 통합 E2E 및 권한 회귀 테스트**
  - [ ] **권한 회귀 집중 검증** — Phase 1에서 `profiles`/`departments` RLS를 변경했으므로 MVP 기능 전체를 다시 훑을 것: 부서 온보딩, 프로필 저장, 목록 부서 필터, 상세 `canWrite` 분기, 첨부파일 업로드/삭제, PDF 다운로드
  - [ ] 전체 사용자 여정 재실행 — 회원가입 → 온보딩 → 목록(4종 필터) → 작성 → 상세(댓글·멘션) → 알림 수신 → 대시보드 → 관리자 콘솔
  - [ ] 3개 역할 시나리오 — 일반 사용자 / 관리자 / **부서 미설정 사용자**(신규 화면 전부가 온보딩 게이트에 정상적으로 걸리는지)
  - [ ] **기능 간 상호작용 검증 (v1 특유의 리스크)**
    - [ ] 부서를 비활성화한 뒤 그 부서의 로그·댓글·통계가 여전히 정상 조회되는지
    - [ ] 사용자의 부서를 변경한 뒤 그가 과거에 쓴 로그의 쓰기 권한이 정확히 이동하는지
    - [ ] 사용자를 강등한 직후 진행 중이던 관리자 화면 조작이 안전하게 차단되는지
    - [ ] 댓글이 달린 로그를 삭제했을 때 댓글·멘션·알림이 모두 정리되는지
    - [ ] 기간 필터 결과와 대시보드 집계 숫자가 동일 조건에서 일치하는지
  - [ ] 엣지 케이스 — 잘못된 형식의 파라미터(날짜·UUID), 존재하지 않는 id, 네트워크 오류, 중복 제출을 신규 화면 전부에 대해 재현
  - [ ] 3개 뷰포트 × 라이트/다크 조합으로 신규 화면(관리자 2종, 대시보드, 댓글 섹션, 알림 드롭다운) 전수 점검
  - [ ] 접근성 스냅샷(`browser_snapshot`)으로 신규 인터랙티브 요소의 접근성 이름 누락 점검
  - [ ] 콘솔 에러·하이드레이션 경고 0건 확인, `npm run build` + `next start`로 프로덕션 빌드 재검증
  - [ ] 테스트에 사용한 QA 계정·시딩 데이터 정리 (MVP 전 Task에서 지켜온 관례)
  - **수락 기준**: MVP 기능에 회귀가 없고, v1 6개 기능이 서로 간섭 없이 동작하며, 프로덕션 빌드가 성공한다

- **Task 037: 성능·보안 점검 및 문서 갱신, 배포**
  - [ ] `mcp__supabase__get_advisors`(security + performance) 최종 점검 — 신규 테이블 4종(`departments` 변경분, `weekly_log_comments`, `weekly_log_comment_mentions`, `notifications`)의 RLS 활성화·인덱스 누락·정책 중복 경고 0건화. MVP에서 의도된 설계로 확인된 기존 경고와 신규 경고를 구분해 기록
  - [ ] 쿼리 성능 실측 — 댓글이 많은 로그의 상세 페이지, 알림이 쌓인 계정의 헤더, 전체 기간 대시보드 3곳을 `EXPLAIN ANALYZE`로 확인 후 필요한 인덱스만 추가(과도한 사전 최적화 지양)
  - [ ] 번들 크기 점검 — recharts 도입 후 초기 번들 영향을 `npm run build`로 확인하고, 대시보드 진입 전 차트 청크가 로드되지 않는지 프로덕션에서 네트워크 실측
  - [ ] Realtime 사용량 확인 — 동시 접속 시 채널 수와 커넥션이 Supabase 플랜 한도 내인지 점검
  - [ ] **문서 갱신 (이 프로젝트의 확립된 관례)**
    - [ ] `docs/PRD.md` — F019~F024를 "MVP 이후 기능(제외)"에서 정식 기능 명세로 이동, 데이터 모델에 신규 테이블 3종 추가, 기술 스택에 recharts·Realtime 추가
    - [ ] `CLAUDE.md` — 관리자 콘솔 가드, 권한 하드닝 트리거, 댓글 RLS가 부서 모델과 의도적으로 다른 이유, Realtime 구독 정리 규칙을 아키텍처 섹션에 추가
    - [ ] `docs/guides/deployment-ops.md` — 부서/역할 관리가 이제 UI로 가능해졌으므로 기존 4·5절(SQL 수동 절차)을 갱신, 알림 보존 정책 추가
    - [ ] `README.md` — 신규 기능 소개 반영
  - [ ] Vercel 배포 및 프로덕션 스모크 테스트 — 관리자 콘솔, 대시보드, 댓글·멘션, 실시간 알림을 프로덕션 도메인에서 실행 (MVP Task 017과 동일한 절차)
  - **수락 기준**: 어드바이저 신규 경고 0건, 프로덕션에서 6개 기능이 모두 동작, 4개 문서가 v1 상태를 정확히 반영

---

## 기능 ID 커버리지 매핑

| 기능 ID | 기능명 | 담당 Task |
|---------|--------|-----------|
| F019 | 부서 관리 UI | Task 025(라우트 골격), Task 026(RLS), Task 027 |
| F020 | 사용자 관리 UI(목록·상세·권한 수정) | Task 025(라우트 골격·메인 진입 링크), Task 026(권한 하드닝), Task 028 |
| F021 | 기간 범위 검색/필터 | Task 029 |
| F022 | 댓글·멘션 협업 | Task 032(스키마·액션), Task 033(UI) |
| F023 | 실시간 알림 | Task 034(스키마·Realtime 인프라), Task 035(UI·구독) |
| F024 | 통계/대시보드 차트 | Task 030(집계 RPC), Task 031(차트 UI) |
| — | 통합 검증·마감 | Task 036, Task 037 |

## 데이터 모델 변경 요약 (MVP 대비)

| 테이블 | 변경 | Task |
|--------|------|------|
| `departments` | `archived_at`(또는 `is_active`) 컬럼 추가, admin 전용 INSERT/UPDATE/DELETE 정책 3종 신규 | 026 |
| `profiles` | UPDATE 정책을 `own_or_admin`으로 통합, `role` 변경 차단 트리거 신규 | 026 |
| `weekly_logs` | **변경 없음** (기간 필터·통계는 읽기 전용) | — |
| `weekly_log_attachments` | **변경 없음** | — |
| `weekly_log_comments` | 신규 (소프트 삭제·1단계 대댓글 지원) | 032 |
| `weekly_log_comment_mentions` | 신규 (멘션 정규화) | 032 |
| `notifications` | 신규 (수신자 기준 RLS, 트리거 전용 INSERT, Realtime publication 등록) | 034 |

## 주요 리스크 및 결정 필요 사항

| 항목 | 내용 | 결정 시점 |
|------|------|-----------|
| **🚨 권한 상승 취약점** | `profiles_update_own`에 컬럼 제한이 없고 `authenticated`가 `role` 컬럼 UPDATE 권한 보유 → 누구나 자기 자신을 admin으로 승격 가능. **기존 결함이며 v1 최우선 처리 대상** | Task 026 |
| 부서 삭제 시 데이터 정합성 | `profiles`는 SET NULL(부서원이 조용히 온보딩으로 튕김), `weekly_logs`는 RESTRICT(삭제 실패)로 FK 동작이 불일치 → 소프트 삭제 채택 여부와 하드 삭제 허용 조건 확정 필요 | Task 026·027 |
| `role` 변경 차단 방식 | 컬럼 GRANT 회수 vs `BEFORE UPDATE` 트리거 — GRANT 회수는 관리자 경로까지 막고, 트리거는 함수 관리 비용이 있음. 둘 중 하나 선택 후 근거 기록 | Task 026 |
| 마지막 관리자 소실 | 유일한 관리자가 스스로를 강등하면 관리자 콘솔에 아무도 들어갈 수 없음 → DB 레벨 방어 필요 | Task 026·028 |
| 댓글 RLS가 부서 모델과 달라짐 | 댓글 INSERT를 부서로 제한하면 "타 부서 업무에 의견 남기기"가 불가능해 기능 자체가 무의미 → **이번 v1에서 기존 권한 모델을 의도적으로 완화하는 유일한 지점**, 근거를 마이그레이션 주석·PRD·CLAUDE.md에 명시 | Task 032 |
| Realtime 최초 도입 | publication 0건·`.channel()` 0건인 백지 상태. 구독 누수(cleanup 누락)와 RLS 기반 페이로드 필터링이 최대 리스크 | Task 034·035 |
| 알림 스팸 방지 | 클라이언트 INSERT를 허용하면 임의 사용자에게 알림 발송 가능 → 트리거 전용 생성(INSERT 정책 없음)으로 차단 | Task 034 |
| 차트 라이브러리 선택 | shadcn `chart`(recharts 래퍼)를 채택할 경우 다크모드·CSS 변수와 자동 연동되나 번들이 증가 → PDF처럼 동적 로딩 필요 여부 판단 | Task 031 |
| 기간 필터 의미 | `start_date`만 비교하면 장기 과제가 누락됨 → "기간이 겹치는 항목" 방식 채택 여부 확정 | Task 029 |
| 멘션 입력 UI 구현 방식 | 전용 멘션 라이브러리 도입 vs 기존 shadcn 프리미티브 조합 → 의존성 최소화 관점에서 후자 우선 검토 | Task 033 |
| `header-nav.tsx` 동시 수정 | Task 025(관리자 메뉴)·031(대시보드 메뉴)·035(알림 벨)이 같은 파일을 수정 → 병렬 진행 시 충돌 관리 필요 | Phase 1·2·4 |
| 알림 데이터 증가 | 활동량에 비례해 무한 증가 → 보존 기간 정책(예: 90일) 결정 및 운영 문서화 | Task 034·037 |
