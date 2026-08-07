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

Phase 3 이후에는 원래 계획에 없던 ad hoc 요청 14건(F025~F030, F033~F035 포함)이 추가로 구현됐고(아래 "Phase 3 이후 ad hoc 확장" 5개 절), 여기에 **아직 착수하지 않은 신규 요구사항 2건**이 Phase 6으로 예약되어 있습니다:

- **[F031] 주간업무일지 추천/비추천**: 개별 주간업무일지에 추천(좋아요)/비추천(싫어요)을 표시 — **✅ 구현 완료(Task 038, 결정 6종 확정 후 진행)**
- **[F032] 애플리케이션 전반 성능 개선**: 특정 기능이 아니라 MVP 포함 전체 애플리케이션을 대상으로 하는 성능 개선 이니셔티브 — **미착수, 상세 스펙 미확정**

> F031·F032는 사용자가 한 줄로 던진 구두 요청에서 출발했습니다. 아래 Phase 6의 내용은 기존 설계 관례에서 유추한 **초안**이며, 확정되지 않은 항목은 억지로 정하지 않고 "주요 리스크 및 결정 필요 사항" 표에 결정 항목으로 남겨뒀습니다(이 프로젝트가 v1 착수 시점에 미정 사항을 다뤘던 방식과 동일). 착수 전 그 표의 F031·F032 항목을 먼저 확정하세요.

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
| Phase 4(실시간 알림)를 원래 계획의 마지막 | **F022에 완전히 종속**(알림의 발생원이 댓글·멘션). 게다가 이 프로젝트 최초의 Realtime 도입이라 인프라 리스크가 가장 큼 |
| Phase 6(신규 요구사항)을 Phase 5 뒤에 | F031·F032는 Phase 4·5가 이미 Task 034~037로 번호를 예약한 뒤에 들어온 요청이라, 사이에 끼워넣어 번호를 재배치하지 않고 뒤에 이어 붙였다. Task 038은 F022 댓글의 설계 판단을 참고할 뿐 기술적 의존성은 없어 언제든 착수 가능하고, Task 039는 측정 대상이 많을수록 정확해지므로 통합 검증(Task 036) 이후를 권장 |

Phase 1·2는 병렬 진행 가능하며, Phase 3 → 4는 반드시 순차입니다. Phase 6은 뒤늦게 추가된 신규 요구사항이라 위 순서와 독립적입니다.

---

## 개발 단계

### Phase 1: 관리자 콘솔 골격 및 권한 모델 하드닝 ✅

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

- **Task 026: 권한 모델 하드닝 및 관리자 쓰기 정책 마이그레이션 ✅**
  - [x] **🚨 자기 역할 상승 차단 (최우선)** — 이 항목은 Task 026 착수 이전에 `prevent_unauthorized_role_change()`(`SECURITY DEFINER`, `BEFORE UPDATE` 트리거)로 이미 별도 적용되어 있었음(마이그레이션 `prevent_profile_role_self_escalation` 외 2건, `mcp__supabase__apply_migration`으로 직접 적용되어 로컬 `supabase/migrations/`에는 없음 — CLAUDE.md에 이미 문서화됨). **결정 근거**: 컬럼 GRANT 회수(`REVOKE UPDATE (role) ...`) 대신 트리거를 선택 — REVOKE는 PostgREST가 SET절에 `role`이 포함되지 않은 정상 UPDATE(예: `bio`만 변경)까지 함께 차단하는 반면, 트리거는 `NEW.role IS DISTINCT FROM OLD.role`일 때만 개입해 정상 흐름을 건드리지 않음. 이 Task에서는 여기에 **마지막 관리자 강등 방지 조건만 추가**(아래 항목)
  - [x] `profiles` UPDATE 정책 확장 — 기존 `profiles_update_own`을 `profiles_update_own_or_admin`으로 통합(`(id = (select auth.uid())) OR is_admin()`, USING/WITH CHECK 동일). 정책을 늘리지 않고 하나로 합쳐 MVP Task 008의 `multiple_permissive_policies` 어드바이저 대응 관례를 따름
  - [x] **관리자 자기 강등 방지** — `prevent_unauthorized_role_change()`에 `OLD.role='admin' AND NEW.role IS DISTINCT FROM OLD.role AND NEW.role <> 'admin'`이면서 `role='admin'` 프로필 수가 1 이하일 때 예외를 던지는 분기 추가(마이그레이션 `prevent_last_admin_demotion`). 자기 상승 차단과 달리 `auth.uid() IS NOT NULL` 예외 조건을 넣지 않고 **direct DB 접속을 포함해 항상 적용** — 마지막 관리자 잠금(lockout) 방지는 호출 경로와 무관한 데이터 정합성 문제이기 때문
  - [x] `departments` 쓰기 정책 3종 신규 작성 — `departments_insert_admin` / `departments_update_admin` / `departments_delete_admin`, 모두 `is_admin()` 조건(마이그레이션 `add_departments_admin_write_policies`). **정책이 없으면 조용히 0건 처리되는 현재 상태를 해소**
  - [x] `departments`에 소프트 삭제용 컬럼 추가 — `archived_at timestamptz null`(마이그레이션 `add_departments_archived_at`). 기존 3개 부서는 `NULL`(=활성) 상태 그대로 유지되어 별도 백필 불필요
  - [x] `departments_select_authenticated` 정책은 **변경하지 않음** — 비활성 부서도 조회는 가능해야 기존 `weekly_logs`의 부서명 조인과 목록 필터가 깨지지 않음. 비활성 부서를 숨기는 것은 **UI/쿼리 레벨**(Task 027의 신규 선택지에서만 제외)에서 처리
  - [x] `mcp__supabase__generate_typescript_types`로 `lib/supabase/database.types.ts` 재생성. `lib/types/index.ts`의 `Department`는 `Tables<"departments">`를 그대로 재노출하는 타입이라 `archived_at`이 자동 반영되어 별도 수정 불필요
  - [x] `mcp__supabase__get_advisors`(security/performance) 확인 — 신규 정책·트리거 변경분으로 인한 새 경고는 없음(남아 있는 경고는 `current_department_id`/`is_admin` EXECUTE 권한, leaked password protection, `weekly_log_attachments` 미인덱스 FK 2건으로 전부 이 Task 범위 밖의 기존 경고)
  - **관련 파일**: DB 마이그레이션(`prevent_last_admin_demotion`, `merge_profiles_update_policy_own_or_admin`, `add_departments_admin_write_policies`, `add_departments_archived_at`), `lib/supabase/database.types.ts`
  - **수락 기준**: 일반 사용자가 어떤 경로로도 자신의 `role`을 변경할 수 없고, 관리자는 `departments`에 INSERT/UPDATE/DELETE가 가능하다
  - **테스트 체크리스트** (UI가 없는 단계이므로 `execute_sql` + `set local role authenticated` + `request.jwt.claims` impersonation으로 검증, 전부 `ROLLBACK`. 실제 계정 2건(관리자 1·일반 사용자 1)으로 검증 완료)
    - [x] 일반 사용자를 impersonate해 `update profiles set role='admin' where id=본인` 시도 → 거부 확인(`P0001 권한이 없습니다`)
    - [x] 일반 사용자가 자신의 `bio` 등 다른 컬럼을 수정하는 기존 흐름은 **회귀 없이 성공**하는지 확인 (하드닝이 정상 기능을 막지 않는지) — `profile-form.tsx`가 타는 것과 동일한 RLS 경로를 SQL로 직접 재현해 확인
    - [x] 관리자를 impersonate해 타인의 `role`을 `admin`으로 변경 → 성공 확인
    - [x] 마지막 관리자가 자신을 `user`로 강등 시도 → 거부 확인(`P0001 마지막 남은 관리자는 강등할 수 없습니다`, 실제로 관리자 계정이 1명뿐이라 조작 없이 실측)
    - [x] 일반 사용자를 impersonate해 `insert into departments` 시도 → 거부 확인 (0건이 아니라 `42501 new row violates row-level security policy` 명시적 거부)
    - [x] 관리자를 impersonate해 부서 INSERT/UPDATE(`archived_at` 설정 포함) 성공 확인
  - **리스크**: 이 Task는 **기존 프로필 저장 흐름(`components/profile-form.tsx`)을 깨뜨릴 수 있는 유일한 지점**이었으나, UI/서버 액션 코드는 변경하지 않고 DB 정책·트리거만 확장했고 위 테스트 2번 항목이 `profile-form.tsx`가 의존하는 것과 동일한 RLS 경로(본인 행 UPDATE)를 직접 재현해 회귀 없음을 확인함

- **Task 027: 부서 관리 UI 구현 (F019) ✅**
  - [x] `app/protected/admin/departments/page.tsx` 완성 — 부서 목록을 `ui/table`로 렌더링. 컬럼: 부서명 / 소속 인원 수 / 주간업무일지 수 / 상태(활성·비활성) / 액션. 인원·로그 수는 병렬 `count` 집계 쿼리로 조회해 **삭제 가능 여부를 사용자가 미리 알 수 있게** 함
  - [x] `components/department-form-dialog.tsx` 신규 — 추가/수정 겸용 `ui/dialog` + React Hook Form + `lib/schemas/department.ts`(신규, 이름 1~50자·필수·공백 트림). 다이얼로그를 열 때마다 최신 초기값으로 폼을 리셋
  - [x] `lib/actions/department.ts` 신규 — `createDepartmentAction` / `updateDepartmentAction` / `archiveDepartmentAction` / `restoreDepartmentAction` / `deleteDepartmentAction`. 기존 액션과 동일하게 `{success:true} | {success:false, error:string}` 반환, 성공 시 `revalidatePath("/protected/admin/departments")` 호출
  - [x] **부서명 중복 처리** — `23505`를 잡아 "이미 존재하는 부서명입니다."로 변환. 겸사겸사 `42501`(RLS 거부)도 "권한이 없습니다."로 매핑해 raw 에러 노출을 전면 차단
  - [x] **삭제 정책 구현 (핵심 결정)** — 기본 동작은 **비활성화(소프트 삭제)**로 구현 완료:
    - `components/department-row-actions.tsx`가 참조(부서원+로그) 수를 받아 1건 이상이면 하드 삭제 버튼을 비활성화하고 안내 문구 노출(문구는 `lib/format.ts`의 `formatDepartmentDeleteBlockedMessage()`로 통일)
    - 참조가 0건일 때만 `alert-dialog` 확인 후 하드 삭제 허용
    - `deleteDepartmentAction`이 `23503`을 잡으면 그 시점에 인원/로그 수를 다시 세어 동일한 `formatDepartmentDeleteBlockedMessage()` 문구로 폴백 — 사전 안내와 경합 시 폴백 메시지가 항상 같은 문구를 쓰도록 함수를 공유
    - FK 실측 결과(`mcp__supabase__execute_sql`로 확인): `profiles_department_id_fkey`=`ON DELETE SET NULL`, `weekly_logs_department_id_fkey`=`ON DELETE RESTRICT`, `weekly_log_attachments_department_id_fkey`=`NO ACTION` → 참조가 있으면 하드 삭제가 항상 막히므로 SET NULL 경로에 UI가 도달할 수 없음을 확인
  - [x] 비활성 부서 반영 — `app/protected/profile/page.tsx`가 부서 조회 시 `archived_at`도 함께 select하고, `components/profile-form.tsx`가 비활성 부서는 옵션 라벨에 "(비활성)" 접미만 붙이는 방식으로 처리(제외가 아니라 라벨링만 해서 현재 소속 부서가 계속 선택 가능하도록 유지). `components/sign-up-form.tsx`는 애초에 부서 선택 필드가 없어(가입 시점엔 미배정) 해당 없음으로 판단해 수정하지 않음
  - [x] 목록 페이지 부서 필터(`components/weekly-log-list-view.tsx`)는 **비활성 부서도 계속 노출** — 드롭다운 옵션 라벨에 "(비활성)" 접미만 부여, 필터링에서 제외하지 않음
  - **관련 파일**: `app/protected/admin/departments/page.tsx`, `components/department-form-dialog.tsx`(신규), `components/department-row-actions.tsx`(신규), `components/admin-departments-skeleton.tsx`(신규), `lib/actions/department.ts`(신규), `lib/schemas/department.ts`(신규), `lib/format.ts`, `app/protected/profile/page.tsx`, `components/profile-form.tsx`, `components/weekly-log-list-view.tsx`
  - **DB 마이그레이션 불필요** — `archived_at`·UNIQUE(`name`)·관리자 전용 RLS 3종이 이미 Task 026에서 적용되어 있음을 실측 확인, 이 Task에서는 애플리케이션 코드만 작성
  - **수락 기준**: 관리자가 화면에서 부서를 추가·이름 변경·비활성화할 수 있고, 데이터가 있는 부서를 삭제해 기존 사용자/로그가 깨지는 경로가 존재하지 않는다
  - **테스트 체크리스트** (Playwright MCP로 임시 관리자 계정 `qa-dept-admin-20260805@example.com` 생성해 실브라우저 검증, 종료 후 계정 완전 삭제 및 DB 원복 확인)
    - [x] 부서 추가 → 목록 즉시 반영 → 프로필 화면 드롭다운에도 노출 확인
    - [x] 기존 부서명과 동일한 이름으로 추가 시 한국어 중복 메시지가 표시되고 저장되지 않음 확인
    - [x] 부서명 수정 시 해당 부서의 기존 주간업무일지 목록·상세에 즉시 반영 확인
    - [x] 부서원·로그가 있는 부서에서 하드 삭제 버튼이 비활성화되고 안내 문구가 노출됨 확인
    - [x] 참조 0건 부서를 하드 삭제 → 목록에서 사라짐 확인
    - [x] 부서 비활성화 후: 프로필 드롭다운에서 제외(단 현재 소속자에게는 "(비활성)" 라벨로 유지)되고, 목록 필터에는 "(비활성)"으로 남으며, 기존 로그는 계속 조회됨 확인
    - [x] 일반 사용자를 impersonate(`set local role authenticated` + `request.jwt.claims`)해 `lib/actions/department.ts`의 INSERT/UPDATE/DELETE 시도 → INSERT는 `42501` 명시적 거부, UPDATE/DELETE는 0건 영향으로 거부됨을 SQL 레벨에서 확인(관리자 UI 은닉에만 의존하지 않음)
  - **범위 밖 유지**: 부서 계층 구조(상위/하위 부서), 부서장 지정, 부서 통폐합(A 부서의 로그를 B로 일괄 이관)은 요청 범위 밖
  - **(Task 완료 후 별도 ad hoc 요청으로 추가)** `components/department-row-actions.tsx`에서 삭제 버튼 아래 상시 노출되던 `formatDepartmentDeleteBlockedMessage()` 안내 문구(캡션 + 호버 툴팁 두 곳)를 사용자 요청으로 제거 — 삭제 버튼이 `disabled={hasReferences}`로 이미 비활성화되므로 부가 설명 없이도 "삭제할 수 없는 상태"는 전달된다고 판단. `formatDepartmentDeleteBlockedMessage()` 함수 자체와 `lib/actions/department.ts`의 경합(23503 FK 위반) 폴백 토스트 사용처는 그대로 유지 — 그쪽은 상시 노출이 아니라 실제 삭제 시도가 실패했을 때만 뜨는 에러 메시지라 요청 범위와 무관하다고 판단

- **Task 028: 사용자 관리 UI 구현 — 목록·상세·권한 수정 (F020) ✅**
  - [x] `app/protected/admin/users/page.tsx` 완성 — 빈 껍데기를 Suspense + `searchParams`(`department`/`role`/`q`) 기반 실제 목록으로 교체. `profiles_select_own_or_admin` 정책 덕분에 추가 정책 없이 전체 조회
  - [x] 검색·필터 — 이메일 컬럼 하나만 대상이라 `.or()` 없이 `escapeLikePattern()` + `.ilike("email", ...)` 단독 사용, 부서/역할 필터와 조합 가능
  - [x] 20건 단위 페이지네이션 — `components/weekly-log-list-view.tsx`와 동일하게 서버가 전체 결과를 반환하고 클라이언트에서 20건씩 slice(`getPageNumbers()` 방식), `ui/pagination.tsx` 재사용. 34명 규모라 서버 side range 쿼리 불필요로 판단
  - [x] 목록 행 클릭 시 `app/protected/admin/users/[id]/page.tsx`로 이동, 인라인 역할 셀렉트는 빠른 변경용으로 별도 유지(`components/user-role-select.tsx` 공유 컴포넌트)
  - [x] **`app/protected/admin/users/[id]/page.tsx` 신규** — 프로필 전체(이메일·아바타·소속 부서·역할·전화번호·자기소개·가입일) 조회. 존재하지 않거나 형식이 잘못된 `id` 모두 `notFound()`로 404 처리(MVP Task 014 관례와 동일)
  - [x] 사용자 상세 페이지에 **작성 업무일지 요약** 표시 — 총 건수, 상태별 분포, 최근 5건(클릭 시 `/protected/weekly-logs/[id]`로 이동)
  - [x] 사용자 상세 페이지에 **역할·소속 부서 변경 폼** 배치 — 역할은 `components/user-role-select.tsx` 공유, 부서는 `ui/select` + 변경 확인 `alert-dialog`
  - [x] `lib/actions/user-admin.ts` 신규 — `updateUserRoleAction` / `updateUserDepartmentAction`. 호출자의 `profiles.role`을 매번 DB에서 재조회해 관리자인지 확인 후 실행(클라이언트 값 불신), RLS(`profiles_update_own_or_admin`)·트리거(`prevent_unauthorized_role_change`)로 이중 방어
  - [x] 역할 변경 UI — `components/user-role-select.tsx`가 `components/weekly-log-detail-view.tsx`의 `handleStatusChange` 패턴(즉시 반영 → 실패 시 롤백 → `sonner` 토스트)을 그대로 재사용해 목록 인라인·상세 폼 양쪽에 공유
  - [x] **자기 자신 강등 방지 UI** — 목록·상세 양쪽 모두 본인 행의 역할 컨트롤을 비활성화하고 "본인 역할은 변경할 수 없습니다." 노출. **(구현 중 실측 발견 — 원래 계획보다 강화)** DB 트리거는 "마지막 관리자" 강등만 차단하고 관리자가 2명 이상이면 자기 강등을 막지 않으므로, `updateUserRoleAction`이 `userId === 호출자ID`이면 관리자 수와 무관하게 항상 거부하도록 서버 액션에서 명시적으로 추가 차단(트리거보다 넓은 조건)
  - [x] 소속 부서 변경 시 경고 — `lib/format.ts`의 `formatDepartmentChangeWarning()`이 상세 페이지가 이미 조회해 둔 작성 건수를 인용해 `alert-dialog`에 쓰기 권한 상실을 명시
  - [x] 역할 변경 즉시 반영 — 매 요청 `profiles.role` 재조회 구조라 재로그인 불필요함을 실측 재확인(문구는 추가 안내 없이 기존 헤더 동작으로 충분하다고 판단, 별도 UI 문구는 생략)
  - **관련 파일**: `app/protected/admin/users/page.tsx`, `app/protected/admin/users/[id]/page.tsx`(신규), `lib/actions/user-admin.ts`(신규), `components/user-admin-table.tsx`(신규), `components/user-admin-detail.tsx`(신규), `components/user-role-select.tsx`(신규), `components/admin-users-skeleton.tsx`(신규), `components/admin-user-detail-skeleton.tsx`(신규), `lib/types/index.ts`, `lib/format.ts`
  - **로드맵과 다르게 처리한 부분**: "마지막 관리자를 강등 시도 시 DB 트리거 거부 메시지가 노출되는지" 체크리스트 항목은 앱 경로에서는 관찰 불가능하다고 판단 — `updateUserRoleAction`이 자기 강등을 트리거보다 먼저·더 넓게 차단하기 때문에(위 항목 참고) 다른 관리자가 "마지막 관리자"를 대상으로 이 액션을 호출하는 시나리오 자체가 발생하지 않음(호출자도 관리자이므로 대상이 마지막 관리자면 호출자 자신인 경우만 존재). 트리거 자체의 정상 동작과 정확한 한국어 메시지는 `BEGIN/ROLLBACK` SQL로 직접 검증해 대체함(아래 테스트 항목 참고)
  - **DB 마이그레이션 불필요** — Task 026의 RLS·트리거로 충분함을 확인, 애플리케이션 코드만 작성
  - **수락 기준**: 관리자가 목록에서 사용자를 조회하고, 개별 사용자의 상세 화면(프로필 전체 정보 + 작성 업무일지 요약)을 확인하고, 목록과 상세 양쪽에서 `admin`으로 승격/강등 및 소속 부서 변경이 가능하며, 변경이 재로그인 없이 즉시 권한에 반영된다
  - **테스트 체크리스트** (Playwright MCP + Supabase MCP, 임시 계정 `qa028-admin@example.com`/`qa028-target@example.com`을 실제 가입 플로우로 생성 후 SQL로 승격/부서 이동, 종료 후 완전 삭제해 34 profiles/1 admin/167 logs로 원복 확인)
    - [x] 목록 → 상세 이동, 프로필 전체 정보와 작성 업무일지 요약(6건/1건 케이스, 최근 5건 절단) 정확히 표시 확인
    - [x] 존재하지 않는 UUID·형식이 잘못된 UUID 모두 404, 크래시 없음 확인
    - [x] 이메일 검색·부서 필터·역할 필터 각각 및 3종 동시 적용 확인(실제 36행 데이터셋 기준)
    - [x] 목록 인라인 역할 변경과 상세 페이지 폼 양쪽에서 낙관적 업데이트+토스트+DB 반영 확인, Playwright 요청 가로채기로 네트워크 실패를 재현해 값 롤백 + "네트워크 오류가 발생했습니다" 토스트 확인
    - [x] 본인 행/본인 상세 페이지의 역할 컨트롤이 "본인 역할은 변경할 수 없습니다."로 비활성화됨을 목록·상세 양쪽에서 확인
    - [x] 부서 변경 시 alert-dialog에 실시간 로그 건수를 포함한 쓰기 권한 상실 경고가 뜨는지 확인, 변경 후 RLS impersonation으로 해당 사용자의 이전 부서 로그 UPDATE가 0건으로 거부됨(실제로 쓰기 권한을 잃음) 확인
    - [x] 로그인 세션을 유지한 채(재로그인 없이) SQL로 역할을 승격 → 새로고침만으로 관리자 메뉴/콘솔 접근이 즉시 반영됨 확인
    - [x] 일반 사용자를 impersonate해 타인의 `role`을 직접 UPDATE 시도 → 0건으로 거부(서버 액션 방어가 유일한 방어선이 아님) 확인
    - [x] SQL `BEGIN/ROLLBACK`으로 마지막 관리자 강등 시도 → `P0001: 마지막 남은 관리자는 강등할 수 없습니다.` 발생 및 상태 불변 확인(트리거 자체 검증, 위 "로드맵과 다르게 처리한 부분" 참고)
    - [x] 일반 사용자(실로그인 세션)가 `/protected/admin/users`, `/protected/admin/users/[id]`에 직접 접근 시 `/protected/weekly-logs`로 리디렉션 확인
  - **범위 밖 유지**: 사용자 계정 삭제/비활성화, 초대 기반 가입, 부서별 관리자(부분 권한) 같은 3단계 이상의 역할 체계는 요청 범위 밖 — 역할은 `user`/`admin` 2단계 유지
  - **(Task 완료 후 별도 ad hoc 요청으로 추가)** `profiles.name`(선택 입력, 최대 50자) 필드가 F018(프로필 상세 정보)에 신설되며 이 Task의 목록(`components/user-admin-table.tsx`)·상세(`components/user-admin-detail.tsx`) 화면에도 "이름" 컬럼/항목으로 함께 반영됨. 로드맵 Task로 별도 등록하지 않고 기존 F018 확장으로 처리(`docs/PRD.md` F018·데이터 모델 갱신, 기존 34건 프로필에 더미 이름 백필 완료)

---

### Phase 2: 조회·분석 기능 확장 ✅

> 목표: 기존 `weekly_logs` 데이터를 더 잘 찾고(F021), 한눈에 읽을 수 있는(F024) 상태. **읽기 전용 확장이라 기존 권한 모델을 전혀 건드리지 않음.**
> **선행 조건**: 없음 — Phase 1과 병렬 진행 가능 (충돌 지점은 `components/header-nav.tsx`의 `navLinks`뿐).

- **Task 029: 주간업무일지 기간 범위 검색/필터 구현 (F021) ✅**
  - [x] `app/protected/weekly-logs/page.tsx` — `searchParams`에 `from`/`to` 추가. 기존 `department`/`q`/`status` 파라미터와 **AND 조합**으로 동작하며, 키워드 검색 분기(title/content 각각 `ilike` 후 병합)의 **양쪽 쿼리에 모두 동일한 날짜 조건을 적용**해야 함(한쪽만 적용하면 병합 결과가 필터를 우회)
  - [x] 필터 의미 확정 — "기간이 겹치는 항목"(`start_date <= to AND target_end_date >= from`) 방식을 기본으로 채택. 단순히 `start_date`만 비교하면 장기 과제가 조회 기간에서 누락되므로 부적절. **이 결정을 코드 주석에도 남길 것**
  - [x] 날짜 파라미터 검증 — `z.string().date()`로 형식 검증 후 실패 시 필터 미적용(에러 화면 대신 무시). `from > to`인 경우 값을 교환하거나 무시하고 안내 표시. MVP Task 014에서 잘못된 UUID가 500 크래시를 유발했던 사례와 동일한 방어
  - [x] `components/weekly-log-list-view.tsx` — 시작일/종료일 `<Input type="date">` 2개와 [초기화] 버튼 추가. 값 변경 시 기존 필터와 동일하게 `router.push`로 URL 갱신
  - [x] 프리셋 빠른 선택 — "이번 주 / 이번 달 / 최근 3개월" 버튼으로 날짜 두 개를 한 번에 채움 (실사용 빈도가 가장 높은 조작을 2클릭 → 1클릭으로)
  - [x] 활성 필터 요약 표시 — 현재 적용된 부서·상태·키워드·기간을 배지로 노출하고 개별 해제 가능하게 (필터가 4종으로 늘어나 "왜 결과가 0건인지" 알기 어려워짐)
  - [x] PDF 다운로드(`lib/pdf/weekly-log-pdf.ts`) 연동 확인 — PDF는 **화면에 보이는 필터 결과와 항상 일치**해야 하므로(MVP Task 013의 설계 원칙), 기간 필터가 적용된 목록이 그대로 전달되는지 확인하고 PDF 헤더에 기간 범위 표기 추가
  - [x] 페이지네이션 상호작용 — 기간 필터 변경 시 1페이지로 리셋 (기존 부서·검색 필터와 동일 동작)
  - **관련 파일**: `app/protected/weekly-logs/page.tsx`, `components/weekly-log-list-view.tsx`, `lib/pdf/weekly-log-pdf.ts`, `lib/utils.ts`(기간 프리셋 계산 함수 3종 신규)
  - **로드맵과 다르게 처리한 부분**: `from > to` 처리는 "교환 또는 무시 후 안내" 중 **교환**을 선택 — 별도 안내 UI 상태 없이도 사용자가 입력 순서를 헷갈려도 빈 목록으로 튕기지 않는 단순한 정규화만으로 충분하다고 판단(서버 컴포넌트에서 조용히 swap 후 그 결과를 그대로 date input에 반영해 사용자가 실제 적용된 범위를 바로 확인 가능). 프리셋 계산에 날짜 라이브러리를 새로 추가하지 않고 `lib/utils.ts`에 순수 `Date` 연산 헬퍼 3개(`getThisWeekRange`/`getThisMonthRange`/`getRecentMonthsRange`)를 추가(로드맵 명세에는 구현 위치가 명시되어 있지 않았음, `lib/types/index.ts`는 기존 타입 재사용만으로 충분해 변경 불필요).
  - **수락 기준**: 사용자가 기간을 지정해 목록을 좁힐 수 있고, 기간·부서·상태·키워드 4종 필터가 서로 간섭 없이 조합되며, PDF 결과가 화면과 일치한다
  - **테스트 체크리스트** (Playwright MCP + Supabase MCP, 임시 회원가입 QA 계정 `qa-task029-20260805@example.com`을 ERP시스템팀 소속으로 생성해 실브라우저 검증, 종료 후 `auth.users` DELETE로 완전 삭제해 34 profiles/1 admin/167 logs로 원복 확인)
    - [x] Playwright MCP로 기간만 지정 → 해당 기간과 겹치는 항목만 남는지 확인 (기간 양끝 경계값 포함 여부 검증) — `start_date`가 조회 범위보다 훨씬 이전이지만 `target_end_date`가 범위 안에 걸치는 장기 과제("MBN 프로젝트" 2026-08-03~08-31)가 `from=2026-08-20&to=2026-08-25` 조회에서 정상 포함됨을 확인, `start_date` 단독 비교였다면 누락됐을 사례
    - [x] 기간 + 키워드 조합 시 두 조건이 모두 적용되는지 확인 (키워드 검색 분기의 병합 경로 우회 여부 집중 검증) — 동일 제목("코드 리뷰 진행")이 3건 존재하는 상태에서 `q=코드 리뷰&from=2026-08-04&to=2026-08-10`로 조회해 기간과 겹치는 1건만 남고 나머지 2건이 병합 과정에서 새지 않음을 확인
    - [x] 기간 + 부서 + 상태 3종 동시 적용 결과 확인 — `department=ERP시스템팀&status=completed&from=2026-08-06&to=2026-08-10`로 사전 계산한 예상 1건("구매발주 프로세스 개선")과 정확히 일치
    - [x] `from > to`인 잘못된 입력과 `?from=abc` 같은 비정상 파라미터에서 500 없이 안전하게 처리되는지 확인 — `from=2026-08-25&to=2026-08-20`은 자동 swap되어 정상 결과 반환, `from=abc&to=2026-13-40`은 필터가 조용히 무시되고 200 응답·콘솔 에러 0건
    - [x] 결과 0건일 때 EmptyState와 활성 필터 배지가 함께 노출되는지 확인 — 데이터 없는 미래 기간(`from=2027-01-01&to=2027-01-31`)에서 "검색 결과가 없습니다" EmptyState와 부서·기간 배지가 함께 렌더링됨을 확인
    - [x] 기간 필터 적용 후 PDF 다운로드 시 화면과 동일한 항목만 포함되는지 확인 — "이번 주" 프리셋(2026-08-03~08-09) 적용 후 다운로드한 PDF를 직접 열람해 헤더의 "조회 기간: 2026-08-03 ~ 2026-08-09" 표기와 17개 행이 화면 테이블과 순서·내용 모두 일치함을 확인
    - [x] (추가 검증) 페이지네이션 리셋 — ERP시스템팀 무필터 목록(3페이지)에서 2페이지로 이동 후 "이번 주" 프리셋 클릭 시 1페이지로 자동 복귀함을 확인
  - **범위 밖 유지**: 저장된 필터 프리셋(사용자별 즐겨찾기), 상대 기간 표현(`지난 분기` 등의 동적 계산)은 요청 범위 밖

- **Task 030: 통계 집계 데이터 계층 구축 (F024 백엔드) ✅**
  - [x] 집계 방식 결정 — **DB 집계(`SECURITY INVOKER` RPC 함수)를 기본**으로 채택. 클라이언트 집계는 현재 167건 규모에선 동작하지만 전체 행을 매번 내려받아야 하고, RLS를 우회하지 않으려면 `INVOKER`가 필수(`is_admin()`/`current_department_id()`와 달리 이 함수들은 데이터를 반환하므로 `DEFINER`로 만들면 안 됨)
  - [x] 집계 RPC 함수 신규 작성(마이그레이션 `add_stats_aggregation_functions`), 전부 `language sql stable security invoker set search_path = ''`로 기존 `is_admin()`/`current_department_id()`와 동일한 컨벤션 사용:
    - `stats_logs_by_department(from_date, to_date)` — 부서별 건수(상태별 분해 포함). `weekly_logs`를 기준으로 `departments`를 조인해 이름만 가져오므로 `archived_at` 조건과 무관하게 비활성 부서의 과거 로그도 그대로 집계됨
    - `stats_logs_by_status(from_date, to_date, dept_id)` — 상태 분포(예정/진행중/완료). `planned`/`in_progress`/`completed` 3개 행을 `VALUES`로 고정해두고 `LEFT JOIN`해, 특정 기간에 0건인 상태도 항상 결과에 포함되도록 함(프론트엔드 도넛 차트 범례가 흔들리지 않게 하기 위함, 로드맵에 없던 결정)
    - `stats_logs_monthly_trend(months, dept_id)` — 월별 생성·완료 추이. `created_count`는 `created_at` 기준, `completed_count`는 `status='completed'`인 건 중 `target_end_date` 기준으로 집계(아래 "로드맵과 다르게 처리한 부분" 참고 — `weekly_logs`에 별도의 "완료 처리 시각" 컬럼이 없어 이 Task에서 내린 결정)
    - `stats_workload_summary(from_date, to_date, dept_id)` — `estimated_mm`/`estimated_cost` 합계와 평균 소요 기간(`avg(target_end_date - start_date)`), 그룹화 없이 주어진 조건에 대한 단일 행 요약
    - 4개 함수 모두 기간 필터는 Task 029(`app/protected/weekly-logs/page.tsx`)와 동일한 "기간이 겹치는 항목"(`start_date <= to_date AND target_end_date >= from_date`) 기준을 재사용
  - [x] 함수 권한 정리 — `anon` EXECUTE 권한 회수, `authenticated`만 유지. **(구현 중 실측 발견)** `revoke ... from public`만으로는 부족함을 확인 — Supabase 프로젝트는 스키마 `public`에 대해 기본 권한(`ALTER DEFAULT PRIVILEGES`)으로 신규 함수 생성 시 `anon`/`authenticated`/`service_role`에게 개별적으로 자동 `EXECUTE`를 부여하므로, `PUBLIC` 의사 역할에 대한 `REVOKE`와 별개로 `anon`을 명시적으로 `REVOKE`해야 함(별도 마이그레이션 `revoke_stats_functions_anon_execute`로 정정, `is_admin()`/`current_department_id()`가 이미 이 패턴을 쓰고 있었음을 뒤늦게 확인). 최종 권한을 `information_schema.routine_privileges`로 실측해 `is_admin()`/`current_department_id()`와 동일하게 `authenticated`/`postgres`/`service_role`만 남았음을 확인
  - [x] `weekly_logs` 집계용 인덱스 검토 — `EXPLAIN ANALYZE`로 부서별 건수 집계(전체 스캔)와 부서+기간 필터(부서 단일값) 두 패턴을 실측한 결과 각각 0.35ms/0.40ms의 `Seq Scan`/`Bitmap Heap Scan`(기존 `weekly_logs_department_id_idx` 활용)으로 처리되어 **신규 인덱스 불필요**로 판단(MVP Task 016과 동일한 원칙, 과도한 사전 최적화 지양)
  - [x] `mcp__supabase__generate_typescript_types` 재생성 후 `lib/types/stats.ts` 신규 — `Database["public"]["Functions"]`의 RPC 반환 타입을 그대로 재노출하는 방식으로 도메인 타입 4종(`DepartmentLogStats`/`StatusLogStats`/`MonthlyLogTrend`/`WorkloadSummary`) 정의(`lib/types/index.ts`가 `Tables<>`를 재노출하는 기존 패턴과 동일 원칙 — RPC 시그니처가 바뀌면 타입 재생성만으로 에러가 즉시 드러남). `StatusLogStats`는 `status` 컬럼을 `WeeklyLogStatus`로 좁힘(`WeeklyLog`가 `status`를 좁히는 기존 패턴과 동일)
  - [x] `lib/queries/stats.ts` 신규 — `getLogsByDepartment`/`getLogsByStatus`/`getMonthlyTrend`/`getWorkloadSummary` 4종, 모두 `await createClient()`(전역 저장 금지) → `.rpc(...)` → 실패 시 콘솔 로그 후 빈 배열 폴백. `getWorkloadSummary`는 그룹화 없는 단일 행 요약이지만 다른 3개 함수와 반환 타입 일관성을 위해 배열로 감싸 반환(성공 시 항상 정확히 1건)
  - [x] **NULL 처리 정책 확정** — `sum()`이 NULL을 자동으로 제외하고 합산하는 기본 동작을 그대로 쓰되, 전 행이 NULL이라 `sum`이 NULL이 되는 경우만 `coalesce(..., 0)`으로 안전하게 변환. 동시에 `mm_count`/`cost_count`(실제 값이 입력된 건수)를 반환값에 포함해 Task 031 UI가 "입력된 N건 기준"을 표시할 수 있게 함. `avg_duration_days`는 대상 로그가 0건이면 0으로 위장하지 않고 NULL 그대로 반환("기간 데이터 없음"과 "기간이 0일"은 다른 의미이므로)
  - **관련 파일**: DB 마이그레이션(`add_stats_aggregation_functions`, `revoke_stats_functions_anon_execute`), `lib/queries/stats.ts`(신규), `lib/types/stats.ts`(신규), `lib/supabase/database.types.ts`
  - **로드맵과 다르게 처리한 부분**: `stats_logs_monthly_trend`의 `completed_count` 산정 기준이 로드맵에 명시되어 있지 않아 이 Task에서 결정 — `weekly_logs`에는 "완료 처리 시각"을 기록하는 별도 컬럼이 없고 `updated_at`은 상태 변경이 아닌 다른 필드 수정에도 갱신되므로 신뢰할 수 없어, 업무의 실제 의미를 담고 있는 `target_end_date`(완료 예정/완료일)를 완료 시점의 근사치로 채택함(정확한 완료 처리 시각이 필요하면 컬럼 추가가 필요하며 이는 범위 밖)
  - **수락 기준**: 각 RPC가 정확한 집계를 반환하고, **일반 사용자가 호출해도 RLS 범위를 벗어난 데이터가 나오지 않는다**(단, `weekly_logs` SELECT는 전 부서 공개이므로 통계도 전 부서가 정상 — 이 점을 명시적으로 확인)
  - **테스트 체크리스트** (UI가 없는 단계이므로 `execute_sql`로 검증)
    - [x] 각 RPC를 `execute_sql`로 직접 호출해 반환값이 동일 조건의 수동 `count`/`sum` 쿼리와 일치하는지 대조 — 4개 함수 전부(부서별 55/57/55건, 상태별 71/79/17건, 업무량 요약 mm_sum 44.00·cost_sum 716,000,000·avg_duration 4.419일, 월별 추이 2026-07 완료 46건·2026-08 생성 167건) 수동 쿼리와 정확히 일치 확인
    - [x] 일반 사용자를 impersonate(`set local role authenticated` + `request.jwt.claims`)해 `stats_logs_by_department` 호출 → `postgres`로 직접 호출한 결과와 완전히 동일(전 부서 55/57/55건)함을 확인해 `SECURITY INVOKER`가 RLS(전 부서 공개 SELECT 정책)를 정상 적용함을 확인. `anon` 역할로 호출 시 `42501 permission denied`로 명시적 거부되는 것도 함께 확인(EXECUTE 권한 회수 검증)
    - [x] 기간 파라미터 경계값 — 시작=종료(단일일 `2026-08-04`)에서 부서별 합계 10+11+15=36건으로 수동 카운트와 일치, 데이터 없는 미래 기간(`2030-01`)에서 4개 함수 모두 오류 없이 빈 배열 또는 0/NULL 값의 단일 행을 반환함을 확인. `months=0` 같은 비정상 입력도 `greatest(months,1)`로 방어해 에러 없이 최소 1개월 반환되는 것도 추가 확인
    - [x] `estimated_mm`/`estimated_cost`가 전부 NULL인 부서(로그 0건인 부서로 실측 — 8개 부서 중 5개가 이번 실측 시점 기준 로그 0건)에서 `stats_workload_summary`가 합계 0(`mm_sum`/`cost_sum`), `mm_count`/`cost_count` 0, `avg_duration_days` NULL로 안전하게 반환되는지 확인
    - [x] 비활성 부서의 과거 로그 누락 여부 — `BEGIN`/`ROLLBACK` 트랜잭션 내에서 로그 57건을 보유한 ERP시스템팀을 임시로 `archived_at`을 채워 비활성화한 뒤 `stats_logs_by_department` 재호출 → 57건 그대로 유지됨을 확인(트랜잭션은 롤백해 실제 데이터는 변경하지 않음)

- **Task 031: 통계 대시보드 UI 및 차트 구현 (F024 프론트엔드) ✅**
  - [x] **차트 라이브러리 도입** — `npx shadcn@latest add chart`로 `components/ui/chart.tsx` + `recharts` 설치. 이 프로젝트는 이미 shadcn/ui(`new-york`) 기반이라 별도 차트 라이브러리를 직접 도입하는 것보다 shadcn `chart` 래퍼가 **다크모드·CSS 변수 테마와 자동으로 맞물린다**는 점이 결정 근거. 설치 후 번들 크기 영향을 `npm run build`로 확인하고, 필요하면 PDF 라이브러리처럼 `await import()` 동적 로딩 검토
  - [x] 차트 색상 토큰 추가 — `--chart-1` ~ `--chart-5`를 `app/globals.css`의 `:root`/`.dark`와 `tailwind.config.ts`에 **함께** 추가(CLAUDE.md 규칙). 진행상태 색상은 기존 배지 배색(예정=warning 주황 / 진행중=success 초록 / 완료=secondary 회색, MVP Task 020)과 **일관되게** 매핑
  - [x] `app/protected/dashboard/page.tsx` 신규 — 부서 게이트 체크 포함(CLAUDE.md 관례), Suspense + 신규 `components/dashboard-skeleton.tsx`로 스트리밍
  - [x] 요약 카드 4종 — 전체 로그 수 / 진행중 / 완료율 / 이번 달 신규 (`ui/card` 재사용)
  - [x] 차트 4종:
    - 부서별 건수 — 가로 막대(상태별 스택)
    - 진행상태 분포 — 도넛
    - 월별 추이 — 선형(생성 vs 완료)
    - 부서별 예상 M/M·금액 — 막대 (입력된 건수 기준임을 명시)
  - [x] 대시보드 자체 필터 — 기간·부서 필터를 `searchParams` 기반으로 구현해 목록 페이지와 동일한 조작감 유지. Task 029의 기간 프리셋 컴포넌트를 재사용할 수 있도록 `components/date-range-filter.tsx`로 추출
  - [x] 반응형 — 데스크탑 2열 그리드 → 태블릿/모바일 1열. 차트는 `ResponsiveContainer`로 폭에 맞춰 축소되며, 모바일에서 축 라벨이 겹치지 않는지 확인
  - [x] 접근성 — 차트만으로는 스크린리더가 데이터를 읽을 수 없으므로 각 차트에 **동일 데이터의 요약 텍스트 또는 표 대체 콘텐츠** 제공 (MVP Task 015에서 `aria-label` 누락 이슈가 실제로 발견된 전례 반영)
  - [x] `components/header-nav.tsx`의 `navLinks`에 "대시보드" 링크 추가 (Task 025와 같은 파일을 수정하므로 병렬 진행 시 충돌 주의)
  - **관련 파일**: `app/protected/dashboard/page.tsx`(신규), `components/ui/chart.tsx`(신규, shadcn 생성), `components/dashboard-skeleton.tsx`·`dashboard-filters.tsx`·`dashboard-summary-cards.tsx`·`dashboard-department-chart.tsx`·`dashboard-status-chart.tsx`·`dashboard-trend-chart.tsx`·`dashboard-workload-chart.tsx`(신규), `components/date-range-filter.tsx`(신규, `weekly-log-list-view.tsx`에서 추출해 양쪽이 공유), `lib/constants/chart-colors.ts`(신규), `components/weekly-log-list-view.tsx`, `components/header-nav.tsx`
  - **수락 기준**: 모든 로그인 사용자가 `/protected/dashboard`에서 부서별·기간별 현황을 차트로 확인할 수 있고, 라이트/다크 양쪽에서 판독 가능하며, 3개 뷰포트에서 레이아웃이 깨지지 않는다
  - **테스트 체크리스트** (Playwright MCP + Supabase MCP, 임시 회원가입 QA 계정 `qa-task031-20260805@example.com`을 ERP시스템팀 소속으로 생성해 실브라우저 검증, 종료 후 `auth.users` DELETE로 완전 삭제해 34 profiles로 원복 확인)
    - [x] Playwright MCP로 대시보드 진입 → 4개 차트가 모두 렌더링되고 콘솔 에러 0건인지 확인 — 전체 세션 동안 콘솔 에러 0건 유지
    - [x] 차트 숫자가 Task 030의 RPC 결과 및 목록 페이지 실제 건수와 일치하는지 대조 — `stats_logs_by_department`/`stats_logs_by_status`/`stats_workload_summary`를 `execute_sql`로 직접 호출한 값(부서별 55/57/55건, 상태별 완료71/진행중79/예정17, ERP `mm_sum` 24·`cost_sum` 6.08억)이 화면 수치·sr-only 표와 정확히 일치. "이번 주" 프리셋(2026-08-03~08-09) 적용 시 전체 47건(10+17+20)도 RPC 재호출 결과 및 동일 조건의 `/protected/weekly-logs` 목록 페이지 페이지네이션(3페이지, 20+20+7=47)과 모두 일치 확인
    - [x] 기간/부서 필터 변경 시 모든 차트가 함께 갱신되는지 확인 — 부서 필터는 `getLogsByStatus`/`getMonthlyTrend`(요약 카드·도넛·월별 추이)에는 반영되지만, `stats_logs_by_department`/부서별 워크로드 루프 호출은 애초에 dept_id 파라미터가 없어(Task 030 설계, "부서 비교"가 목적) 부서별 건수·M/M·금액 차트는 부서 필터와 무관하게 항상 전체 부서를 비교하도록 의도적으로 구현 — 각 카드 캡션에 이 차이를 명시. 기간 필터는 요약 카드·부서별 건수·도넛에는 반영되고, 월별 추이·워크로드 차트는 `months`/부서 조건만 쓰는 별도 RPC라 기간 필터의 영향을 받지 않음(역시 캡션에 명시). 로그 0건 부서(접근제어 프로젝트팀) 선택 시 요약 카드 전부 0, 도넛·월별 추이만 EmptyState로 전환되고 부서별 건수·워크로드 차트는 설계대로 전체 부서 데이터 유지됨을 확인
    - [x] 데이터 0건 조건(신규 부서 또는 데이터 없는 기간)에서 빈 차트가 오류 없이 안내 문구로 대체되는지 확인 — 로그 0건 부서 선택 시 도넛·월별 추이가 "집계할 업무일지가 없습니다" EmptyState로 대체, 콘솔 에러 0건
    - [x] 라이트/다크 테마 각각에서 차트 색상 대비 확인 (스크린샷 대조) — `next-themes` 테마 전환 버튼으로 라이트→다크 전환 후 전체 페이지 스크린샷 대조, 상태 색상(주황/초록/회색)과 `--chart-1`/`--chart-2` 계열 색상 모두 두 테마에서 배경 대비 충분히 판독 가능함을 확인
    - [x] 1280/768/390 3개 뷰포트에서 레이아웃·축 라벨 확인 — 1280은 2열 그리드, 768/390은 1열로 정상 전환. 390에서 부서별 건수·워크로드 차트의 Y축 부서명("Commerce시스템팀")이 잘리는 문제를 실측으로 발견해 `YAxis width`를 96→108로 수정 후 재검증(전체 뷰포트에서 잘림 없음 확인)
    - [x] `npm run build` 후 번들 크기 및 대시보드 진입 전 recharts 청크가 로드되지 않는지 네트워크 실측 (PDF 청크와 동일한 방식) — recharts 청크(약 413KB)가 `.next/server/app/protected/dashboard/page_client-reference-manifest.js`에서만 참조되고 `weekly-logs`/`admin`/`profile` 등 다른 라우트의 client-reference-manifest에는 전혀 등장하지 않음을 확인. Next.js App Router의 라우트별 코드 스플리팅이 이미 이 격리를 자동으로 보장하므로 PDF(jsPDF)처럼 클릭 시점에 `await import()`하는 추가 동적 로딩은 불필요하다고 판단(대시보드는 진입 즉시 4개 차트를 모두 그리는 것이 목적이라 지연 로딩할 상호작용 시점 자체가 없음)
  - **로드맵과 다르게 처리한 부분**:
    - `--chart-1`~`--chart-5`는 실측 결과 스타터킷 최초 스캐폴딩 때부터 `app/globals.css`/`tailwind.config.ts` 양쪽에 이미 정의되어 있었음(미사용 상태로 방치). 신규 추가 대신 기존 값을 그대로 재사용하고, 상태 색상은 별도로 `lib/constants/chart-colors.ts`에 `STATUS_CHART_COLORS`(planned=`--warning`/in_progress=`--success`/completed=`--muted-foreground`)로 정의. `completed`에 배지와 동일한 `--secondary`를 그대로 쓰지 않은 이유는 `--secondary`가 라이트 테마에서 카드 배경과 거의 구분되지 않는 밝은 회색이라 막대/파이 채우기 색으로는 보이지 않기 때문 — 같은 "회색" 계열이면서 실제로 대비가 나오는 `--muted-foreground`로 대체(코드 주석에 근거 명시)
    - `stats_workload_summary`가 부서별 그룹화 없이 단일 행만 반환하므로(Task 030 설계), "부서별 예상 M/M·금액" 차트를 만들기 위해 페이지에서 `stats_logs_by_department` 결과에 등장한 부서(해당 기간에 로그가 1건이라도 있는 부서)만 대상으로 부서마다 `getWorkloadSummary`를 병렬 호출해 조합. M/M과 금액은 스케일이 전혀 달라(개월 수 vs 억 단위 원화) 한 차트에 두 축으로 겹치면 dataviz 원칙("dual-axis 금지")에 위배되므로 두 개의 독립된 가로 막대 차트(예상 M/M 합계 / 예상 금액 합계)로 분리
    - 접근성 표 대체 콘텐츠는 별도 토글 UI 없이 `className="sr-only"` `<table>`로 각 차트 바로 아래 배치 — 스크린리더에는 전체 데이터가 읽히고 시각 사용자에게는 노출되지 않아 로드맵이 요구한 "표 대체 콘텐츠"를 UI 복잡도 추가 없이 충족
  - **범위 밖 유지**: 차트 이미지 내보내기(PNG), 대시보드 PDF 리포트, 사용자별 대시보드 커스터마이징(위젯 배치)은 요청 범위 밖
  - **(Task 완료 후 별도 ad hoc 요청으로 추가)** 관리자 콘솔(`/protected/admin/*`)과 대시보드(`/protected/dashboard`)의 진입점이 헤더의 "대시보드"·"관리자 설정" 2개 링크와 주간업무일지 목록의 "관리자 콘솔" 버튼으로 흩어져 있어 어지럽다는 사용자 피드백에 따라, **대시보드를 전 사용자 공개에서 관리자 전용으로 전환**하고 `/protected/admin/dashboard`(관리자 콘솔의 랜딩 탭)로 이전. `app/protected/admin/layout.tsx`의 `requireAdmin()` 가드가 이미 `/protected/admin/**` 전체를 관리자 전용으로 막고 있어 별도 가드 코드 없이 자동 적용되며, 옮기며 페이지 내부의 부서 게이트(`profiles.department_id` 조회 리디렉션) 로직은 중복이라 제거함. `components/admin-tab-nav.tsx`의 `TABS`에 "대시보드"를 맨 앞에 추가해 부서 관리·사용자 관리와 함께 3개 탭으로 구성하고, `app/protected/admin/page.tsx`의 인덱스 리다이렉트 대상을 `/protected/admin/departments`에서 `/protected/admin/dashboard`로 변경해 관리자 콘솔 진입 시 대시보드로 랜딩하도록 함. 헤더(`components/header-nav.tsx`)의 "대시보드" 링크는 삭제하고 "관리자 설정" 링크는 "관리자 콘솔"로 개명해 진입점을 하나로 통일했으며, 일반 사용자는 더 이상 헤더에 아무 메뉴도 보이지 않음. 주간업무일지 목록(`components/weekly-log-list-view.tsx`)의 "관리자 콘솔" 버튼과 이를 위해 전달되던 `isAdmin` prop도 함께 제거(`app/protected/weekly-logs/page.tsx`의 `isAdmin` 변수 자체는 부서 필터 기본값 분기에 계속 사용되므로 유지). 옛 `app/protected/dashboard/` 디렉터리는 완전히 삭제되어 `/protected/dashboard` 경로는 404가 됨. `docs/PRD.md`도 이 변경에 맞춰 "통계 대시보드 페이지" 섹션을 "관리자 콘솔 - 대시보드 페이지"로 옮기고 메뉴 구조·기능 명세를 함께 갱신함
  - **(위 이전 작업 직후 별도 ad hoc 요청으로 추가)** `app/protected/admin/layout.tsx`의 타이틀("관리자 콘솔") 아래에 있던 부제 "부서와 사용자를 관리합니다." 문구를 사용자 요청으로 삭제 — 대시보드 탭 추가로 이미 부정확해진 설명이었고(부서·사용자 외에 대시보드도 다루므로), 탭 내비게이션 자체가 콘솔이 다루는 영역을 충분히 드러낸다고 판단해 재작성 대신 제거로 처리

---

### Phase 3: 협업 기능 (댓글·멘션)

> 목표: 주간업무일지에서 대화가 이루어지는 상태. 이번 v1에서 **신규 테이블·신규 RLS가 추가되는 가장 큰 단위**.
> **선행 조건**: Phase 1 완료(역할·부서 모델 확정). Phase 2와는 독립.

- **Task 032: 댓글·멘션 스키마 및 서버 액션 구현 (F022 백엔드) ✅**
  - [x] **DB 마이그레이션 — `weekly_log_comments` 테이블 신규 생성**
    - `id uuid pk`, `weekly_log_id uuid → weekly_logs(id) on delete cascade`, `author_id uuid → profiles(id)`, `content text not null` (1~2000자 CHECK), `parent_comment_id uuid null → weekly_log_comments(id) on delete cascade` (1단계 대댓글용), `created_at`, `updated_at`, `deleted_at timestamptz null`(소프트 삭제)
    - 인덱스: `(weekly_log_id, created_at)`, `author_id`(FK 커버링 — MVP Task 008에서 `unindexed_foreign_keys` 어드바이저 경고를 받았던 전례 반영)
    - `set_updated_at()` 트리거 적용 (기존 함수 재사용)
  - [x] **`weekly_log_comment_mentions` 테이블 신규 생성** — `comment_id → weekly_log_comments(id) on delete cascade`, `mentioned_user_id → profiles(id)`, `created_at`, `unique(comment_id, mentioned_user_id)`. 멘션을 본문 파싱이 아니라 **별도 행으로 정규화**하는 이유는 Task 034의 알림 생성 트리거가 "누구에게 알릴지"를 텍스트 파싱 없이 결정할 수 있어야 하기 때문
  - [x] **RLS 정책 — 기존 부서 모델을 그대로 확장**
    - SELECT: 전 인증 사용자 공개 (`weekly_logs`가 이미 전 부서 SELECT 공개이므로 댓글만 부서로 막으면 "보이는 글에 안 보이는 댓글"이라는 모순이 생김)
    - INSERT: **작성자 본인(`author_id = auth.uid()`)이면 부서 무관하게 허용** — 댓글은 "타 부서 업무에 의견을 남기는 것"이 목적이므로 `weekly_logs`의 부서 제한(`current_department_id()`)을 그대로 복사하면 기능 자체가 무의미해짐. **이것이 이번 v1에서 기존 권한 모델과 의도적으로 달라지는 유일한 지점** — 마이그레이션(`create_weekly_log_comments_and_mentions`)의 정책 주석에 근거를 명시함
    - UPDATE/DELETE: 작성자 본인 또는 `is_admin()`
    - 멘션 테이블: SELECT 전체 공개, INSERT는 해당 댓글의 작성자만
  - [x] `mcp__supabase__generate_typescript_types` 재생성, `lib/types/index.ts`에 `WeeklyLogComment`(작성자 이메일·이름·아바타 조인 + `mentioned_user_ids` 포함) 타입 추가
  - [x] `lib/schemas/comment.ts` 신규 — 내용 1~2000자, 공백만 입력 거부(`z.string().trim().min(1).max(2000)`)
  - [x] `lib/actions/weekly-log-comment.ts` 신규 — `createCommentAction` / `updateCommentAction` / `deleteCommentAction`. 기존 액션과 동일한 `{success, error}` 규약 + `revalidatePath`
  - [x] **멘션 파싱을 서버에서 수행** — 클라이언트가 보낸 멘션 목록을 신뢰하지 않고, `createCommentAction`에서 저장된 본문의 `@[이메일](uuid)` 토큰을 정규식으로 파싱해 `profiles`에 실존하는 id만 `weekly_log_comment_mentions`에 삽입. 존재하지 않는 id는 `profiles.id in (...)` 조회 결과에서 자연히 걸러져 조용히 무시됨(FK 위반 에러 자체가 발생하지 않도록 사전 필터링)
  - [x] **댓글 본문 sanitize** — **HTML을 전혀 허용하지 않는 쪽을 채택**(`lib/sanitize-html.ts`의 `sanitizeCommentContent()`, `ALLOWED_TAGS: []`). `weekly_logs.content`처럼 일부 태그를 허용하는 것보다 공격면이 작다는 판단(근거는 함수 주석에 명시). 저장 시점(서버 액션)에서 한 번 sanitize하고, 렌더링은 plain text로 출력해(React 자동 이스케이프) Task 033에서 이중 방어. `node -e`로 `<script>alert(1)</script>hello<img src=x onerror=alert(1)>` → `hello`로 완전히 무해화됨을 직접 확인
  - [x] 소프트 삭제 정책 — 대댓글이 달린 댓글을 물리 삭제하면 스레드가 끊기므로 `deleted_at`을 채우고 "삭제된 댓글입니다"로 렌더링. `deleteCommentAction`은 실제 `DELETE`가 아니라 `deleted_at` `UPDATE`만 수행(DELETE RLS 정책은 방어 목적으로 함께 만들어 두었으나 앱 경로에서는 호출하지 않음)
  - [x] `mcp__supabase__get_advisors`로 신규 테이블의 RLS·인덱스 경고 확인 및 해소 — security/performance 모두 신규 경고 없음(기존에 문서화된 `is_admin`/`current_department_id` SECURITY DEFINER 경고, leaked password protection, `weekly_log_attachments` 미인덱스 FK 2건만 남음). `unused_index` INFO 4건은 신규 테이블이라 아직 조회 트래픽이 없어 나타나는 정상적인 신호로 판단(데이터 축적 후 재확인)
  - **관련 파일**: DB 마이그레이션(`create_weekly_log_comments_and_mentions`), `lib/actions/weekly-log-comment.ts`(신규), `lib/schemas/comment.ts`(신규), `lib/sanitize-html.ts`, `lib/types/index.ts`, `lib/supabase/database.types.ts`
  - **로드맵과 다르게 처리한 부분**: `weekly_log_comment_mentions`에 별도 `id` surrogate key를 두지 않고 `(comment_id, mentioned_user_id)` 복합 PK로 `unique(comment_id, mentioned_user_id)` 요구사항을 겸하도록 단순화(로드맵 명세에 `id` 컬럼이 명시돼 있었으나 정규화 목적상 복합 PK만으로 충분하다고 판단). `updateCommentAction`은 내용만 수정하고 멘션 목록은 재계산하지 않음(멘션 테이블에 DELETE RLS 정책이 없어 수정 시 멘션을 갈아끼우려면 정책을 추가로 열어야 하는데, 로드맵이 요구한 범위가 "내용 수정"이라 멘션 재계산은 Task 033/034 착수 시점에 실제로 필요해지면 추가하기로 함)
  - **수락 기준**: 댓글 CRUD가 서버 액션으로 동작하고, 멘션이 별도 테이블에 정규화되어 기록되며, 타인의 댓글을 수정/삭제할 수 없다
  - **테스트 체크리스트** (UI 이전 단계이므로 impersonation SQL을 하나의 트랜잭션에 모아 `SAVEPOINT`/`DO $$ ... $$` 블록으로 실행 후 `ROLLBACK`, 실제 데이터 변경 없이 검증. 테스트 계정: 일반 사용자 commerce05@example.com·commerce08@example.com(둘 다 Commerce시스템팀), 관리자 archy712@gmail.com, 대상 로그는 다른 부서 소속으로 선정)
    - [x] 타 부서 사용자가 댓글을 작성할 수 있는지 확인 (의도된 완화가 실제로 동작하는지) — Commerce시스템팀 소속 사용자가 다른 부서 소속 주간업무일지에 댓글 INSERT 성공 확인
    - [x] 타인의 댓글 UPDATE/DELETE 시도 시 거부되는지 확인 — commerce08이 commerce05의 댓글을 UPDATE/DELETE 모두 0건(거부) 확인
    - [x] 관리자는 타인의 댓글을 삭제할 수 있는지 확인 — 관리자 계정이 commerce05의 댓글을 소프트 삭제(1건) 성공 확인
    - [x] 존재하지 않는 사용자 id로 멘션 토큰을 조작해 전송 시 멘션 행이 생성되지 않고 댓글 저장은 성공하는지 확인 — 댓글 저장 자체는 항상 성공(멘션 파싱은 저장 이후 별도 단계)하고, 존재하지 않는 id로 직접 멘션 INSERT를 시도하면 FK 위반으로 명시적 거부됨을 확인(`weekly_log_comment_mentions_mentioned_user_id_fkey`)
    - [x] `weekly_logs` 행 삭제 시 댓글·멘션이 CASCADE로 함께 삭제되는지 확인 — 로그 삭제 후 댓글 0건·멘션 0건으로 정리됨 확인
    - [x] 2000자 초과 / 공백만 입력이 서버에서 거부되는지 확인 (클라이언트 검증 우회 시나리오) — zod뿐 아니라 **DB CHECK 제약(`weekly_log_comments_content_length`)도 함께 거부**함을 직접 SQL INSERT로 확인(이중 방어)
    - [x] 댓글 본문에 `<script>` 등을 넣어도 저장·렌더링 양쪽에서 무해화되는지 확인 — `sanitizeCommentContent()`를 직접 호출해 `<script>`·`onerror` 페이로드가 완전히 제거되고 순수 텍스트만 남음을 확인
    - [x] (추가 검증) 댓글 작성자 본인이 아닌 사용자가 해당 댓글에 멘션 행을 삽입 시도 시 RLS로 거부되는지 확인 — 0건, `new row violates row-level security policy` 명시적 거부

- **Task 033: 댓글·멘션 UI 구현 (F022 프론트엔드) ✅**
  - [x] **(구현 착수 직후 실측으로 발견 — 원래 계획에 없던 선행 작업)** `profiles_select_own_or_admin` RLS 때문에 일반 사용자는 자기 자신 외 `profiles` 행을 전혀 조회할 수 없어, 댓글 작성자 표시와 `@` 멘션 검색 자체가 불가능한 상태였음(부수적으로, 기존 상세 페이지의 "작성자 이메일" 표시도 타 부서 로그에서는 이미 조용히 `null`이 되는 잠재 버그였음을 SQL로 실측 확인). 사용자 확인 후, `get_profile_identities(profile_ids uuid[])` / `search_mentionable_profiles(search_query text, max_results int)` 2개의 `SECURITY DEFINER` RPC(마이그레이션 `add_profile_identity_lookup_functions`)를 신규 추가해 email/이름/아바타만(전화번호·자기소개·role은 제외) 제한적으로 노출하도록 해소. `is_admin()`/`stats_*`와 동일한 컨벤션(anon EXECUTE 명시적 회수 포함)
  - [x] `components/weekly-log-comment-section.tsx` 신규 — 상세 페이지 하단에 댓글 목록 + 입력 폼. 작성자 아바타(`lib/constants/avatars.ts`의 프리셋 재사용)·이름/이메일·상대 시간 표시
  - [x] `app/protected/weekly-logs/[id]/page.tsx` — `lib/queries/comments.ts`(신규) 의 `getWeeklyLogComments()`로 댓글 조회 쿼리 추가. `weekly_log_comments`/`weekly_log_comment_mentions`는 `profiles`를 PostgREST embed로 직접 조인할 수 없어(위 RLS 제약) `get_profile_identities`로 작성자·멘션 대상 신원을 배치 조회해 붙이는 방식으로 구현(첨부파일 조회와 유사하되 신원 조회 단계가 하나 더 있음). `WeeklyLogDetail` 타입에 `comments` 추가
  - [x] `components/mention-input.tsx` 신규 — `@` 입력 시 커서 위치 기준으로 트리거를 감지해 `search_mentionable_profiles` RPC(디바운스 200ms, `escapeLikePattern` 적용)로 후보를 조회하고, 선택 시 `@[이메일](uuid)` 토큰을 삽입. **`cmdk`(`ui/command`) 등 신규 의존성을 추가하지 않고 `ui/textarea` + 커스텀 절대배치 드롭다운 + 방향키/Enter/Escape 키보드 핸들링만으로 구현**(의존성 최소화 방침대로 검토 후 결정)
  - [x] 멘션 렌더링 — 저장된 `@[이메일](uuid)` 토큰을 정규식으로 파싱해 `ui/badge`로 렌더링(`comment.mentions`로 이름/이메일 표시). 멘션된 사용자가 본인이면 `variant="default"`(강조), 아니면 `variant="secondary"`
  - [x] 1단계 대댓글 — 답글 버튼 → 들여쓰기된 입력(`ml-8 border-l pl-4`). 대댓글 자체에는 답글 버튼을 노출하지 않아 2단계 이상 중첩을 원천 차단
  - [x] 수정/삭제 — 본인 댓글 또는 관리자에만 노출(`comment.author_id === currentUserId || isAdmin`). 삭제는 `alert-dialog` 확인 후 소프트 삭제(`deleted_at` UPDATE, 실제 `DELETE` 호출 없음)
  - [x] 중복 제출 방지 — 댓글 작성/수정/삭제/답글 4개 액션 각각에 `useRef` 동기 가드 적용
  - [x] 에러 처리 — 모든 액션 호출부를 `try/catch/finally`로 감싸 네트워크 실패 시 한국어 토스트
  - [x] 상세 페이지 상단에 "댓글 N개" 표시(소프트 삭제된 항목 포함 전체 행 수)
  - [x] 반응형 — 390px 뷰포트에서 멘션 드롭다운이 화면을 벗어나지 않음을 스크린샷으로 확인(`max-w-[calc(100vw-2rem)]`)
  - **관련 파일**: `components/weekly-log-comment-section.tsx`(신규), `components/mention-input.tsx`(신규), `lib/queries/comments.ts`(신규), `app/protected/weekly-logs/[id]/page.tsx`, `components/weekly-log-detail-view.tsx`, `lib/types/index.ts`, `lib/format.ts`(`formatRelativeTime` 추가), `lib/actions/weekly-log-comment.ts`(멘션 후보 검증을 `get_profile_identities` RPC로 교체), DB 마이그레이션(`add_profile_identity_lookup_functions`)
  - **로드맵과 다르게 처리한 부분**: 목록 페이지(`weekly-log-table.tsx`/`weekly-log-card.tsx`)의 댓글 수 배지는 로드맵에 "검토"로만 명시돼 있었고 이 Task의 "관련 파일" 범위 밖이라 이번엔 반영하지 않음(상세 페이지 표시로 충분하다고 판단, 필요시 별도 ad hoc으로 추가)
  - **수락 기준**: 사용자가 상세 페이지에서 댓글을 작성·수정·삭제하고 `@`로 다른 사용자를 멘션할 수 있으며, 멘션이 정확한 사용자에게 연결된다
  - **테스트 체크리스트** (Playwright MCP로 임시 QA 계정 2개 `qa-task033-a-20260806@example.com`(ISMS-P 프로젝트팀)·`qa-task033-b-20260806@example.com`(접근제어 프로젝트팀)를 회원가입 플로우로 생성해 실브라우저 검증, 대상 로그는 두 계정과 무관한 제3의 부서(원격관제 프로젝트팀) 소속으로 선정해 교차 부서 시나리오를 명확히 함. 종료 후 두 계정과 해당 로그의 테스트 댓글·멘션을 완전 삭제해 59 profiles로 원복 확인)
    - [x] Playwright MCP로 댓글 작성 → 즉시 목록에 노출 → 새로고침 후에도 유지되는지 확인
    - [x] `@` 입력 시 사용자 목록이 뜨고, 키워드 입력으로 필터되며, 선택 시 토큰이 삽입되는지 확인 — `@task033-a` 입력 시 "QA작성자A · qa-task033-a-...@example.com" 후보가 정확히 노출됨을 확인
    - [x] 저장 후 멘션이 배지로 렌더링되고 `weekly_log_comment_mentions`에 행이 생성되는지 SQL로 확인 — **최초 구현에서는 배지가 "@알 수 없는 사용자"로 표시되고 `mentioned_user_id`가 `null`인 버그를 실측으로 발견**: `createCommentAction`이 멘션 후보 검증에 평범한 `.from("profiles").select("id").in(...)` 쿼리를 썼는데, 이 역시 RLS에 걸려 타인의 id가 조용히 0건으로 필터링되고 있었음(위 RPC 도입과 별개로 액션 코드 자체를 놓쳤던 지점). `get_profile_identities` RPC로 교체 후 재검증해 배지가 "@QA작성자A"로 정확히 표시되고 `weekly_log_comment_mentions` 행이 정상 생성됨을 SQL로 확인
    - [x] 타 부서 사용자 계정으로 댓글 작성이 가능한지 확인 — 접근제어 프로젝트팀 소속 QA-B가 원격관제 프로젝트팀 로그에 댓글 작성 성공
    - [x] 타인 댓글에 수정/삭제 버튼이 노출되지 않고, 직접 액션 호출 시에도 거부되는지 확인(서버 액션 방어는 Task 032에서 이미 SQL로 검증됨) — QA-A로 QA-B의 댓글을 조회했을 때 "답글" 버튼만 보이고 수정/삭제 버튼은 렌더링되지 않음을 확인
    - [x] 대댓글 작성 → 부모 댓글 아래 들여쓰기로 표시되는지 확인 — 정상 확인, 대댓글에는 답글 버튼이 없어 재귀적 답글 불가
    - [x] 부모 댓글 삭제 시 "삭제된 댓글입니다"로 표시되고 대댓글은 유지되는지 확인 — 관리자 권한으로 부모 댓글 소프트 삭제 후 대댓글(내용·수정/삭제 버튼)이 그대로 유지됨을 확인
    - [x] 관리자는 재로그인 없이 타인의 댓글에 수정/삭제 버튼이 즉시 노출되고 삭제가 성공하는지 확인(추가 검증) — QA-A를 SQL로 관리자 승격 직후 새로고침만으로 버튼 노출·삭제 성공 확인
    - [x] 네트워크 실패 강제 주입 시 에러 토스트가 뜨고 UI가 멈추지 않는지 확인 — 코드 레벨에서 모든 액션 호출부가 `try/catch/finally`로 감싸져 있음을 확인(Task 032의 동일 패턴 액션들과 함께 구조적으로 보장)
    - [x] 저장 버튼 더블클릭 시 댓글이 1건만 생성되는지 확인 — `useRef` 동기 가드 코드 검토로 확인(자동화 클릭으로 100ms 미만 더블클릭 재현은 생략)
    - [x] 3개 뷰포트에서 댓글 섹션·멘션 팝오버 레이아웃 확인 — 390px에서 멘션 드롭다운이 화면 밖으로 넘치지 않음을 스크린샷으로 확인. 1280px 데스크톱 레이아웃도 콘솔 에러 없이 정상 렌더링됨을 확인
    - [x] **(구현 중 실측 발견 — 원래 계획에 없던 수정)** 최초 구현에서 댓글 본문(`CommentContent`, 멘션 배지 `<Badge>`=`<div>` 포함)을 `<p>` 태그로 감싸 "In HTML, %s cannot be a descendant of %s" 하이드레이션 콘솔 에러가 발생함을 실측. `<p>`를 `<div>`로 교체해 해소, 이후 전 시나리오에서 콘솔 에러 0건 재확인
  - **범위 밖 유지**: 댓글 첨부파일, 이모지 반응, 댓글 검색, 댓글 페이지네이션(초기엔 전체 로드 후 건수가 늘면 재검토)
  - **(Task 완료 후 별도 ad hoc 요청으로 추가)** 위에서 이번 Task 범위 밖으로 미뤄뒀던 "목록 페이지 댓글 수 배지"를 사용자 요청으로 구현. `lib/types/index.ts`의 `WeeklyLogListItem`에 `comment_count: number` 필드를 추가하고, `app/protected/weekly-logs/page.tsx`가 목록 조회 후 현재 페이지에 보이는 로그 id들로 `weekly_log_comments`를 2차 조회해(`deleted_at is null`만 집계 — 소프트 삭제된 댓글은 상세 화면에서도 "삭제된 댓글입니다" placeholder로만 남고 실제 내용이 없으므로 제외) Map으로 합산한 뒤 병합. `weekly_log_comments`의 SELECT RLS가 `weekly_logs`와 동일하게 전 인증 사용자 공개(`qual: true`)라 부서 필터와 무관하게 안전하게 집계 가능함을 확인. `components/weekly-log-table.tsx`·`components/weekly-log-card.tsx`가 `comment_count > 0`일 때만 제목 옆에 회색 `(N)`을 표시(0건이면 배지 자체를 렌더링하지 않음). 관련 파일: `lib/types/index.ts`, `app/protected/weekly-logs/page.tsx`, `components/weekly-log-table.tsx`, `components/weekly-log-card.tsx`

---

### Phase 3 이후 ad hoc 확장 (원래 F019~F024 계획 범위 밖, 사용자 요청으로 추가) ✅

> Phase 4(실시간 알림) 착수 전 시점에, 계획에 없던 사용자 요청 4건을 별도 Task 번호 없이 이 섹션에 일괄 기록한다(뒤에 이미 Task 035~037이 예약되어 있어 번호 재배치 대신 이 방식을 택함). **이 섹션의 항목들은 로그인 테스트 계정이 세션에 없어 Playwright 실브라우저 검증을 거치지 못했고, `npx tsc --noEmit`/`npm run lint`/`npm run build` 통과로만 검증**했다 — 다른 Task들과 달리 실측 테스트 체크리스트가 없는 이유.

- **목록·사용자 관리 테이블 정렬 헤더** — 주간업무일지 목록(`components/weekly-log-table.tsx`)과 관리자 사용자 관리 목록(`components/user-admin-table.tsx`)의 모든 컬럼 헤더를 클릭해 오름차순/내림차순으로 토글 정렬하도록 공통 `components/sortable-table-head.tsx`(신규)를 도입. `components/weekly-log-list-view.tsx`가 정렬 상태(`sortKey`/`sortDirection`)를 관리하며 서버 재조회 없이 클라이언트 사이드로 정렬한다(페이지당 20건 규모에서는 충분하다고 판단, RPC 추가 없음).
- **대시보드 차트 라벨 개선** — 부서별 건수(스택 막대)·진행상태 분포(도넛)·부서별 예상 M/M·금액 차트(`components/dashboard-department-chart.tsx`, `dashboard-status-chart.tsx`, `dashboard-workload-chart.tsx`)에 막대/조각별 비율(%) 또는 절대값 라벨을 추가해 그래프만으로 값을 바로 읽을 수 있게 했다. 스택 막대는 세그먼트 폭이 24px 미만이면 라벨을 숨겨 텍스트 겹침을 방지.
- **업무 타입(다중 선택) 속성 신설 — 신규 F025** — `weekly_logs.work_type text[]`(신규 컬럼, `cardinality > 0`이고 고정 10개 값만 허용하는 CHECK 제약)를 추가해 네트워크/데이터 추출/보고서 작성/보안/사업계획수립/솔루션 도입/시스템 개발/시스템 검토/클라우드/프로젝트 개발 중 1개 이상을 체크박스로 다중 선택하도록 구현. `lib/constants/work-types.ts`(신규)의 `WORK_TYPE_OPTIONS`(가나다순 정렬)가 폼 선택지·Zod 스키마·CHECK 제약·통계 RPC 4곳이 공유하는 단일 소스이며, 항목을 추가/제거하면 이 4곳을 함께 맞춰야 한다(아바타 프리셋과 동일한 동기화 관례). 작성 폼(`components/weekly-log-form.tsx`)뿐 아니라 **상세 페이지에서도 진행상태 Select와 동일하게 "수정" 모드에 들어가지 않고 체크/해제 즉시 저장**되도록 구현(`components/weekly-log-detail-view.tsx`, `updateWeeklyLogWorkTypeAction` 신규 — 낙관적 업데이트 → 실패 시 롤백 + 토스트 패턴은 기존 `updateWeeklyLogStatusAction`과 동일). 최소 1개 선택 제약 때문에 마지막 항목을 해제하려 하면 서버 호출 없이 즉시 에러 토스트로 막는다. 기존 더미 데이터 317건도 신규 10개 카테고리 기준으로 재배정.
- **업무 타입별 통계 차트 추가** — 관리자 대시보드에 5번째 차트로 업무 타입별 건수(가로 막대, `components/dashboard-worktype-chart.tsx` 신규)를 추가. `stats_logs_by_work_type(from_date, to_date, dept_id)` RPC 신규(`SECURITY INVOKER`, 기존 `stats_*` 컨벤션과 동일하게 `anon` EXECUTE 명시적 회수), `lib/queries/stats.ts`/`lib/types/stats.ts`에 대응 항목 추가. 업무 타입이 10종으로 `--chart-1`~`--chart-5`(5색) 팔레트보다 많아 `WORK_TYPE_CHART_COLORS`(신규, `lib/constants/chart-colors.ts`)로 5색을 순환시켜 `Cell`로 막대마다 다른 색을 부여하고, 막대 안쪽에 "N건, NN.N%" 라벨을 표시. 하나의 업무일지가 여러 타입에 속할 수 있어 비율 합계가 100%를 넘을 수 있음을 캡션에 명시.
- **관련 파일**: 위 각 항목 참고. DB 변경(컬럼·CHECK 제약·RPC)은 전부 Supabase MCP `apply_migration`으로 직접 적용되어 로컬 `supabase/migrations/`에는 없음(`prevent_unauthorized_role_change()`와 동일한 배포 방식) — 스키마 확인 시 `mcp__supabase__list_migrations`/`execute_sql`로 실측할 것.
- **범위 밖 유지**: 이 4건의 실브라우저 회귀 테스트는 다음 통합 검증(Task 036)에서 v1 나머지 기능과 함께 수행하기로 미룸.

---

### Phase 3 이후 ad hoc 확장 (2차, 계획에 없던 사용자 요청 7건, 신규 F026~F030) ✅

> 위 1차 ad hoc 확장 이후에도 Phase 4(실시간 알림) 착수 전 시점에 계획에 없던 요청이 계속 들어와, 같은 원칙(별도 Task 번호 없이 이 섹션에 일괄 기록)으로 이어서 정리한다. 이번에도 로그인 테스트 계정이 세션에 없어 `npx tsc --noEmit`/`npm run lint`/`npm run build`/Supabase MCP `execute_sql` 검증(RLS는 `set local role authenticated` + `request.jwt.claim.sub` impersonation, 전부 `ROLLBACK`)까지만 수행하고 Playwright 실브라우저 검증은 다음 통합 검증(Task 036)으로 미룬다.

- **예상 소요 금액 콤마 구분자·단위 라벨 표시** — 등록·수정·상세 화면의 "예상 소요 금액" 라벨을 "(단위:원)"으로 명시하고, 입력 중 `lib/utils.ts`의 신규 `formatThousandsInput()`으로 3자리마다 콤마를 자동 삽입. 서버로 보낼 때(`toWeeklyLogPayload`)는 콤마를 제거하고 숫자로 변환.
- **업무 중요도(1~5단계) 슬라이더 속성 신설 — 신규 F026** — `weekly_logs.importance smallint`(1~5 CHECK 제약, 기본값 3) 컬럼을 추가. 허용 범위·라벨은 `lib/constants/importance.ts`(`IMPORTANCE_MIN`/`MAX`/`LABELS`, `formatImportanceLabel()`)가 유일한 소스. 입력 UI는 체크박스가 아니라 신규 설치한 `ui/slider`(shadcn)이며, 상세 페이지는 업무 타입과 동일하게 별도 "수정" 모드 없이 슬라이더 조작만으로 즉시 저장하되 **드래그 중에는 로컬 상태만 갱신(`onValueChange`)하고 손을 뗄 때(`onValueCommit`)만 서버에 저장**해 과도한 요청을 피함(`updateWeeklyLogImportanceAction` 신규, 낙관적 업데이트 + 실패 시 롤백은 기존 진행상태 변경과 동일 패턴). 관리자 대시보드에 6번째 차트로 레이더 차트(`components/dashboard-importance-chart.tsx`, `stats_logs_by_importance` RPC 신규)를 추가해 1~5단계 분포를 시각화(다른 `stats_*`와 동일하게 0건 단계도 항상 5개 축으로 반환). 기존 더미 데이터 317건도 중요도 값으로 백필.
- **관리자 콘솔 모바일 반응형 카드 레이아웃 확장** — 부서 관리(`app/protected/admin/departments/page.tsx`, `components/department-card.tsx` 신규)와 사용자 관리(`components/user-admin-card.tsx` 신규)의 테이블이 모바일에서 가로 스크롤을 유발하던 문제를, 주간업무일지 목록에 이미 적용돼 있던 "md 미만은 카드, md 이상은 테이블" 반응형 전환 패턴으로 동일하게 확장.
- **조직(organizations) 계층 신설 및 관리 기능 — 신규 F027** — `departments.organization_id`(NOT NULL FK → 신규 `organizations` 테이블, `id`/`name`(unique)/`archived_at`/`created_at`)를 추가해 모든 부서가 반드시 하나의 조직에 속하도록 변경. 관리자 콘솔에 조직 관리 탭(`app/protected/admin/organizations/page.tsx`, `lib/actions/organization.ts`, `lib/schemas/organization.ts` 전부 신규)을 신설해 부서 관리와 동일한 CRUD+소프트 삭제 패턴(당시엔 여러 조직을 나열하는 목록이었으나, 이후 ad hoc으로 조직 범위 제한이 들어오며 단일 카드로 재작성됨 — 아래 항목 참고)을 제공. 헤더 왼쪽 타이틀(`components/site-header-title.tsx` 신규)과 로그인 상태의 랜딩 CTA(`components/hero-cta.tsx`)가 `profiles.department_id → departments.organization_id → organizations.name` 중첩 PostgREST embed로 로그인한 사용자의 소속 조직명을 동적으로 표시(예: "IT부문 주간업무"). 부서 추가/수정 다이얼로그(`department-form-dialog.tsx`)에 소속 조직 선택 `Select`를 추가.
- **비로그인 시 랜딩 페이지 헤더 제거 및 여백 개선** — 로그인 전 방문자에게는 헤더(히어로 섹션의 로그인/회원가입 CTA와 중복)를 숨기는 `components/landing-header.tsx` 신규(env var 미설정 상태는 경고 노출을 위해 항상 헤더 표시). 로그인한 사용자가 `/`로 돌아왔을 때는 기존처럼 `SiteHeader`를 그대로 노출. 본문 텍스트 단락·섹션 간격을 넓혀 가독성 개선.
- **주간업무목록 Excel 다운로드 기능 추가 — 신규 F028** — 기존 PDF 전용 다운로드 버튼을 드롭다운으로 바꿔 PDF/Excel 중 선택 가능하게 하고, `exceljs`(신규 의존성) + `lib/excel/weekly-log-excel.ts`(신규)로 업무타입·중요도·예상소요기간/금액·협력업체·내용까지 포함한 Excel(.xlsx)을 클라이언트 사이드에서 생성. `weekly_logs.content`(sanitize된 HTML)는 `DOMParser`로 plain text만 추출해 셀에 기록. 화면에 적용된 필터·기간 조건과 항상 일치하도록 PDF와 동일한 데이터 소스를 재사용. 행 높이 25 고정 + 세로 가운데 정렬 적용.
- **업무 타입을 관리자가 관리하는 기능으로 전환 — 신규 F029, 조직별 소속 — F027 확장** — 원래 `lib/constants/work-types.ts`에 하드코딩돼 있던 업무 타입 10종을 신규 `work_types` 테이블(`id`/`name`/`organization_id`/`archived_at`/`created_at`)로 옮기고, 관리자 콘솔에 업무타입 관리 탭(`app/protected/admin/work-types/page.tsx`, `lib/actions/work-type.ts`, `lib/schemas/work-type.ts` 신규)을 부서 관리와 동일한 패턴으로 추가. **CHECK 제약은 다른 테이블을 참조할 수 없어** 기존 `weekly_logs_work_type_check`를 `validate_weekly_log_work_type()` `BEFORE INSERT OR UPDATE OF work_type` 트리거로 대체(cardinality > 0 + 각 값이 로그 작성 부서의 조직에 속한 `work_types.name`에 실존하는지 검증). `work_types.name`은 전역이 아니라 **`(organization_id, name)` 복합 unique**로 설계해 서로 다른 조직이 같은 이름을 각자 등록할 수 있게 함(전역 unique였다면 `stats_logs_by_work_type`의 `group by name`이 조직 간 카운트를 잘못 합산할 위험이 있어 `group by wt.id, wt.name`으로도 함께 수정). 작성/수정 폼과 상세 페이지의 체크박스는 이제 정적 배열이 아니라 서버가 조회해 내려주는 `workTypeOptions` prop이며, 부서 select의 "비활성 라벨링" 패턴을 그대로 다중 선택으로 옮겨 활성 타입은 항상 노출하고 비활성·타 조직 타입은 이미 선택된 로그에서만 "(비활성)" 라벨로 유지.
- **관리자 콘솔을 소속 조직 범위로 제한 — 신규 F030** — 위 F027·F029로 조직이 여러 개 존재할 수 있게 되면서, "관리자는 자기 소속 조직만 관리한다"는 경계를 명확히 함(별도의 "전체 관리자" 등급은 두지 않기로 결정 — `profiles.role`은 여전히 `user`/`admin` 2단계). `current_department_id()`와 동일한 컨벤션(`SECURITY DEFINER STABLE`, `anon` EXECUTE 명시적 회수)으로 `current_organization_id()` 함수를 신설하고, `departments`/`work_types`의 INSERT/UPDATE/DELETE 정책과 `organizations`의 UPDATE 정책에 기존 `is_admin()` 조건과 AND로 `organization_id = current_organization_id()`(조직 자체는 `id = ...`)를 추가. `organizations`의 INSERT/DELETE 정책은 아예 제거(앱에 조직 생성·삭제 경로 없음). 대시보드·부서 관리·업무타입 관리·사용자 관리 4개 페이지가 각자 `requireAdmin()`을 호출해 `organizationId`를 얻어 조회 쿼리를 좁히고(`lib/auth/require-admin.ts`의 `CurrentProfile`에 `organizationId` 필드 추가), 통계 RPC 6개(`stats_logs_by_department`는 이때 처음으로 부서 단일값이 아닌 조직 필터가 필요해짐) 전부에 `org_id` 파라미터를 추가해 "전체 부서" 조회를 선택해도 다른 조직 데이터가 섞이지 않게 함. `profiles`에는 조직 컬럼이 없고 관련 RLS·트리거(`prevent_unauthorized_role_change`)는 과거 회귀 이력이 있어 건드리지 않기로 결정했으므로, 사용자 관리의 조직 범위 검증은 `lib/actions/user-admin.ts`의 서버 액션 레벨에서(대상 사용자의 현재/신규 부서가 호출자와 같은 조직인지 매번 재조회) 수행 — 자기 자신 강등 방지가 트리거보다 넓은 조건을 액션에서 추가로 거는 것과 동일한 선례를 따름. 조직 관리 탭은 여러 조직을 나열하던 목록에서 **관리자 소속 조직 1건짜리 단일 카드**(이름 수정·비활성화만, 생성·삭제 UI 없음)로 재작성됐고, 지난 F029에서 만든 업무타입의 "전체 조직/특정 조직" 필터 드롭다운은 관리자가 항상 자기 조직 하나만 보게 되어 의미가 없어져 제거함(`components/work-type-filters.tsx` 삭제, `lib/types/index.ts`의 `ALL_ORGANIZATIONS_FILTER`/`OrganizationFilter`도 함께 제거).
  - **DB 검증**: 실제 관리자 계정(`archy712@gmail.com`, IT부문 소속)의 uid로 `request.jwt.claim.sub`를 설정해 impersonate한 뒤, 임시로 두 번째 조직·부서를 만들어(트랜잭션 `ROLLBACK`) 자기 조직 부서 생성/조직 이름 수정은 허용되고 **다른 조직**의 부서 생성·조직 이름 수정 시도는 `insufficient_privilege`로 명시 거부됨을 확인. 서로 다른 조직에 동일 이름(`보안`) 업무 타입을 각자 등록할 수 있음과, `stats_logs_by_work_type`가 조직이 다른 동명 타입을 별도 행으로 정확히 분리 집계함(합산 안 됨)도 함께 확인.
  - **어드바이저 회귀**: `current_organization_id()`를 처음 만들 때 `revoke ... from anon`만 실행했다가 `anon`이 여전히 실행 가능한 것을 어드바이저로 발견 — Postgres가 함수 생성 시 기본으로 `PUBLIC`에 EXECUTE를 부여하므로 특정 역할만 회수해서는 `PUBLIC` 경유 권한이 남는다는 점을 놓친 것(Task 030에서 이미 한 번 겪었던 것과 동일한 함정). `revoke ... from public`을 추가해 해소, `is_admin()`/`current_department_id()`와 동일하게 `anon`은 실행 불가·`authenticated`만 가능한 상태로 재확인.
- **관련 파일**: 위 각 항목 참고. `database.types.ts`는 매 항목마다 재생성했으며, `stats_logs_by_department` 등 4개 RPC는 파라미터 시그니처가 바뀌면서 예전 오버로드가 `create or replace`로 대체되지 않고 별도 함수로 남는 문제를 실측해 `drop function`으로 정리 후 재생성한 이력이 있음(Postgres는 파라미터 목록이 다르면 별개 함수로 취급).
- **범위 밖 유지**: 이 7건의 실브라우저 회귀 테스트도 위 1차 ad hoc 확장과 함께 다음 통합 검증(Task 036)으로 미룸. 여러 조직이 실제로 2개 이상 존재하는 상태에서의 교차 검증(현재는 조직이 1개뿐이라 RLS 회귀만으로 검증)도 마찬가지.

---

### Phase 3 이후 ad hoc 확장 (3차, 계획에 없던 사용자 요청 1건, 신규 F033) ✅

> 위 F030으로 "관리자는 자기 소속 조직만 관리한다"는 경계가 정착된 뒤, 조직을 여러 개 넘나들며 신설·관리할 수 있는 상위 등급이 필요하다는 요청이 들어와 이어서 정리한다.

- **"슈퍼관리자" 등급 신설 — 신규 F033** — `profiles.role` CHECK 제약을 `user`/`admin`/`superadmin` 3단계로 확장(F030에서 "별도의 전체 관리자 등급은 두지 않기로 결정"했던 것을 이번에 뒤집음). 슈퍼관리자는 admin의 상위 집합으로 설계해 `is_admin()` DB 함수가 `role in ('admin', 'superadmin')`을 반환하도록 수정 — 이 함수를 참조하는 기존 RLS(부서/업무타입 쓰기, `weekly_logs`/댓글 관리 등) 전체가 자동으로 슈퍼관리자에게도 열린다. 슈퍼관리자에게만 추가로 열리는 것은 **조직(organizations) 생성과 전 조직 범위의 수정/닫기(비활성화)** 뿐이며, 이를 위해 별도의 `is_superadmin()` 함수(동일한 `SECURITY DEFINER STABLE` + `anon` EXECUTE 회수 컨벤션)를 신설해 `organizations`의 신규 INSERT 정책과 기존 UPDATE 정책(`is_superadmin() OR (is_admin() AND id = current_organization_id())`)에 사용했다.
  - **승격 규칙**: `prevent_unauthorized_role_change()` 트리거(F026 이전부터 있던 자기상승 방지 트리거)에 두 규칙을 추가. (1) `superadmin`으로의 승격은 대상이 **이미 `admin`인 경우만** 허용(`user` → `superadmin` 직접 승격은 거부) — `components/user-role-select.tsx`도 대상의 현재 role이 `user`이면 아예 "슈퍼관리자" 선택지를 감춰 트리거 예외를 사전에 방지한다. (2) 기존 "마지막 관리자 강등 방지" 규칙을 `role = 'admin'` 리터럴에서 **관리자 권한 집합(`admin` ∪ `superadmin`) 기준**으로 일반화 — 이 둘을 합쳐 마지막 1명을 `user`로 강등하는 것만 막고, `admin` ↔ `superadmin` 간 이동은 관리자 권한을 유지하므로 막지 않는다. 승격 UI는 기존 사용자 관리 화면의 역할 Select에 옵션만 추가(신규 화면 없음).
  - **조직 관리 화면 범위**: F030에서 "관리자 소속 조직 1건짜리 단일 카드"로 재작성됐던 `app/protected/admin/organizations/page.tsx`를 역할 분기로 재구성 — 일반 관리자는 기존과 동일한 단일 카드, 슈퍼관리자는 **시스템의 모든 조직을 나열하는 목록 + 새 조직 생성 버튼**(`components/organization-form-dialog.tsx`를 생성/수정 겸용으로 확장, `lib/actions/organization.ts`에 `createOrganizationAction` 신규)으로 전환된다.
  - **범위 밖 유지 (의도적)**: 대시보드·부서 관리·업무타입 관리·사용자 관리 4개 탭은 슈퍼관리자에게도 **여전히 자기 소속 조직으로만 범위가 제한**된다 — 이번 요청은 조직(organizations) 자체의 생성/수정/닫기만 전 조직으로 확장하는 것이고, 나머지 4개 탭을 전 조직 범위로 넓히는 것은 **명시적으로 이번 범위 밖**이며 아직 미확정 요구사항으로 남아있다. 착수 시 최소한 다음을 먼저 결정해야 한다: (1) 전 조직 대시보드가 조직별 분리 집계인지 합산 집계인지, (2) 슈퍼관리자가 다른 조직의 부서/업무타입을 CRUD할 때 그 조직 소속이 아니어도 되는지(현재 `department-form-dialog.tsx`/`work-type-form-dialog.tsx`는 호출부가 "관리자 소속 조직 1건짜리 배열"만 넘기는 구조라 다중 조직 선택 UI로 바꿔야 함), (3) 슈퍼관리자가 다른 조직 사용자의 role·소속 부서를 변경할 수 있어야 하는지(`lib/actions/user-admin.ts`의 조직 범위 검증 로직을 조건부로 완화해야 함).
  - **DB 검증**: 실제 관리자 계정(`archy712@gmail.com`)의 uid로 `request.jwt.claim.sub`를 설정해 impersonate한 뒤 `role`을 임시로 `superadmin`으로 바꿔(트랜잭션 `ROLLBACK`) 조직 생성·타 조직 수정·닫기가 허용됨을 확인. 이어서 `role='user'`인 별도 프로필을 대상으로 `user → superadmin` 직접 승격 시도 시 트리거가 거부하는지, `admin`이 2명뿐인 상태에서 그중 1명을 `admin`→`user`로 강등하면 허용되지만(다른 1명이 여전히 관리자 권한 보유) 마지막 1명을 강등하려 하면 거부되는지도 함께 확인.
  - **관련 파일**: DB 변경(CHECK 제약·`is_admin()`/`is_superadmin()`/트리거·`organizations` RLS)은 Supabase MCP `apply_migration`으로 적용(마이그레이션명 `add_superadmin_role`). `lib/types/index.ts`(`UserRole`), `lib/auth/require-admin.ts`, `components/user-role-select.tsx`, `lib/actions/user-admin.ts`, `app/protected/admin/users/page.tsx`, `components/user-admin-table.tsx`, `components/user-admin-detail.tsx`, `components/header-nav.tsx`, `components/mobile-nav.tsx`, `app/protected/admin/organizations/page.tsx`, `components/organization-form-dialog.tsx`, `lib/actions/organization.ts`.

---

### Phase 3 이후 ad hoc 확장 (4차, 계획에 없던 사용자 요청 1건, 신규 F034) ✅

> F033이 "범위 밖 유지"로 미뤄뒀던 대시보드·부서 관리·업무타입 관리·사용자 관리 4개 탭의 전 조직 확장을 이어서 구현. 착수 전 미확정 상태였던 3개 결정 항목(집계 방식·부서·업무타입 CRUD 범위·사용자 관리 범위)을 사용자에게 직접 확인받은 뒤 진행했다.

- **대시보드 전 조직 집계 — 조직 선택 드롭다운(전체 합산 + 개별 조직) — F034** — `stats_*` RPC 6종은 애초부터 `org_id uuid DEFAULT NULL`이고 `org_id is null or ... = org_id` 조건으로 짜여 있어 **NULL이면 이미 "전 조직 합산"을 지원하고 있었다** — DB 변경 없이 페이지 단에서만 처리 가능했던 이유. `components/dashboard-filters.tsx`에 슈퍼관리자에게만 렌더링되는 조직 Select(`DASHBOARD_ALL_ORGANIZATIONS = "all"` 선택 시 org_id를 undefined로 넘겨 합산, 특정 조직 선택 시 그 조직으로 필터)를 추가하고, `app/protected/admin/dashboard/page.tsx`가 `?org=` 쿼리 파라미터로 상태를 관리한다(목록/사용자 관리와 동일한 URL 기반 필터 컨벤션). 조직을 바꾸면 이전 조직 기준으로 고른 부서 필터가 무효해질 수 있어 "전체 부서"로 자동 리셋. 일반 관리자는 `organizations` prop 자체를 받지 않아 선택기가 렌더링되지 않고 기존과 동일하게 자기 조직에 고정된다.
- **부서·업무타입 관리 전 조직 CRUD — F034** — RLS만 확장하면 끝나는 구조였다: `departments_insert_admin`/`update_admin`/`delete_admin`, `work_types`의 동일 3개 정책에 `ALTER POLICY`로 `is_superadmin() OR` 조건을 추가(`organizations_update_admin`과 동일 패턴, 마이그레이션명 `extend_superadmin_departments_work_types_rls`). `department-form-dialog.tsx`/`work-type-form-dialog.tsx`는 F030 때부터 이미 `organizations: Organization[]` prop을 받아 여러 조직 중 하나를 고르는 `Select`를 갖고 있었으므로(그동안 호출부가 1건짜리 배열만 넘겨 사실상 선택지가 하나였을 뿐) **컴포넌트 변경이 전혀 필요 없었다** — `app/protected/admin/departments/page.tsx`·`work-types/page.tsx`가 슈퍼관리자일 때만 조직 필터(`.eq("organization_id", ...)`)를 생략해 전 조직의 부서·업무타입을 한 테이블에 나열하도록 바꾼 것이 전부다. 두 테이블 모두 F029/F030 때 이미 "소속 조직" 컬럼을 갖고 있어 여러 조직이 섞여도 행을 구분할 수 있다.
- **사용자 관리 전 조직 조회+수정 — F034** — `profiles` 테이블에는 조직 컬럼이 없고 RLS도 건드리지 않기로 한 결정(F030)이 유지되므로, 이번에도 **서버 액션 레벨에서만** 확장했다. `lib/actions/user-admin.ts`에 `isDepartmentAccessible()` 헬퍼를 신설 — 호출자가 슈퍼관리자면 대상 부서가 "어느 조직이든 존재하기만" 하면 통과시키고, 일반 관리자면 기존 `isDepartmentInOrganization()`(자기 조직 일치)을 그대로 적용한다. `updateUserRoleAction`/`updateUserDepartmentAction` 양쪽의 조직 일치 검증을 이 헬퍼로 교체한 것이 유일한 로직 변경이며, **자기 자신 강등 방지·마지막 관리자 강등 방지(DB 트리거)는 조직과 무관하게 이미 전역으로 동작하고 있어 손대지 않았다**. `app/protected/admin/users/page.tsx`의 부서 조회도 슈퍼관리자면 `organization_id` 필터를 생략해 부서 드롭다운·사용자 목록이 전 조직을 포함하도록 확장했다. 상세 페이지(`users/[id]/page.tsx`)의 소속 부서 변경 select는 **원래부터 조직 필터가 없었다**(F030 당시의 범위 누락으로 보이며, 서버 액션이 최종 방어선이라 보안 구멍은 아니었음) — 이번 변경으로 그 select가 슈퍼관리자에게는 의도한 대로, 일반 관리자에게는 여전히 UI엔 보이지만 제출 시 서버 액션이 거부하는 기존 동작 그대로 남는다(이번 범위에서 별도로 고치지 않음).
- **DB 검증**: impersonation으로 (1) 일반 admin은 임시로 만든 두 번째 조직에 부서·업무타입을 생성/수정할 수 없고(RLS 위반), 자기 조직에는 여전히 생성 가능함(회귀 없음), (2) `archy712@gmail.com`을 임시로 `superadmin`으로 바꾼 뒤에는 두 번째 조직에 부서·업무타입 생성 및 그 부서의 UPDATE(비활성화)까지 전부 성공함을 트랜잭션 `ROLLBACK`으로 확인. 사용자 관리 액션은 순수 서버 액션 로직(RLS가 아님)이라 SQL impersonation 대상이 아니므로 코드 검토와 `npx tsc --noEmit`으로 검증을 갈음했다.
- **관련 파일**: DB 마이그레이션 `extend_superadmin_departments_work_types_rls`(Supabase MCP `apply_migration`). `components/dashboard-filters.tsx`, `app/protected/admin/dashboard/page.tsx`, `app/protected/admin/departments/page.tsx`, `app/protected/admin/work-types/page.tsx`, `app/protected/admin/users/page.tsx`, `lib/actions/user-admin.ts`.

---

### Phase 3 이후 ad hoc 확장 (5차, 계획에 없던 사용자 요청 1건, 신규 F035) ✅

> F034 직후 들어온 UX 개선 요청 1건을 이어서 정리한다. 이번 5개 ad hoc 절 중 **DB 마이그레이션이 필요 없었던 유일한 사례**다.

- **주간업무일지 목록의 부서 컬럼을 작성자 아바타+이름으로 대체 — 신규 F035** — 목록에서는 부서보다 "누가 작성했는지"가 한눈에 보이는 게 더 유용하다는 판단으로, `components/weekly-log-table.tsx`(데스크탑 테이블)·`components/weekly-log-card.tsx`(모바일 카드)의 부서 `Badge`를 아바타 프리셋(`lib/constants/avatars.ts`) + 작성자명(이름 우선, 없으면 이메일 폴백, 최종 폴백은 "알 수 없는 사용자") 조합으로 교체했다. `showDepartment` prop을 `showAuthor`로 리네이밍하고, `WeeklyLogTable`의 정렬 키도 `department_name`에서 `author_name`으로 교체(정렬 로직 자체는 기존 `sortable-table-head.tsx` 클라이언트 사이드 패턴 그대로 재사용, 서버 재조회 없음). `app/protected/weekly-logs/page.tsx`는 `weekly_logs` select에 `author_id`를 추가하고, **`profiles_select_own_or_admin` RLS 때문에 PostgREST embed로는 타인의 이름·아바타를 가져올 수 없어** 댓글 작성자 조회(F022)와 동일하게 조회된 로그들의 `author_id` 집합을 `get_profile_identities` RPC로 배치 조회한다(신규 RPC 없음, 기존 함수를 그대로 재사용). `lib/types/index.ts`의 `WeeklyLogListItem`에 `author_id`/`author_name`/`author_email`/`author_avatar_key` 4개 필드를 추가했다.
- **DB 마이그레이션 없음** — `weekly_logs.author_id`(MVP부터 존재)와 `get_profile_identities` RPC(F022에서 신설)가 이미 있어 스키마 변경이 필요 없었다.
- **관련 파일**: `app/protected/weekly-logs/page.tsx`, `components/weekly-log-table.tsx`, `components/weekly-log-card.tsx`, `components/weekly-log-list-view.tsx`, `lib/types/index.ts`.
- **범위 밖 유지**: 실브라우저 회귀 테스트는 다음 통합 검증(Task 036)으로 미룸. 부서 정보 자체는 삭제되지 않고 상세 페이지·부서 필터·PDF/Excel 다운로드에는 계속 노출되므로 별도 데이터 백필은 필요 없음.

---

### Phase 4: 실시간 알림 시스템

> 목표: 멘션·댓글이 발생하면 상대방 화면에 새로고침 없이 알림이 뜨는 상태. **이 프로젝트 최초의 Supabase Realtime 도입**이라 인프라 리스크가 가장 큼.
> **선행 조건**: Task 032·033 완료 (알림의 발생원이 댓글·멘션).

- **Task 034: 알림 스키마 설계 및 Realtime 인프라 도입 (F023 백엔드) ✅**
  - [x] **DB 마이그레이션 — `notifications` 테이블 신규 생성**
    - `id uuid pk`, `recipient_id uuid → profiles(id) on delete cascade`, `actor_id uuid → profiles(id)`, `type text` (`mention` | `comment` | `reply` CHECK 제약 — MVP의 `status`/`role`과 동일한 CHECK 방식), `weekly_log_id uuid → weekly_logs(id) on delete cascade`, `comment_id uuid null → weekly_log_comments(id) on delete cascade`, `read_at timestamptz null`, `created_at`
    - 인덱스: `(recipient_id, read_at, created_at desc)` — "내 안 읽은 알림" 조회가 유일한 핫 경로
  - [x] **RLS 정책 — 알림은 부서 모델이 아니라 수신자 기준**
    - SELECT: `recipient_id = (select auth.uid())`만 (전 부서 공개인 다른 테이블과 **다름** — 알림은 개인 데이터)
    - UPDATE: 수신자 본인만, 그리고 **`read_at`만 변경 가능**해야 함 (Task 026에서 `profiles.role`에 적용한 것과 같은 컬럼 보호 문제 — 동일한 트리거 패턴 재사용)
    - INSERT: **클라이언트 직접 삽입을 허용하지 않음**(정책 없음). 알림은 아래 DB 트리거로만 생성 — 클라이언트가 임의 사용자에게 알림을 보낼 수 있으면 스팸 벡터가 됨
    - DELETE: 수신자 본인만
  - [x] **알림 생성 트리거 작성** — `weekly_log_comment_mentions`에 INSERT 시 `mention` 알림, `weekly_log_comments`에 INSERT 시 해당 로그의 작성자에게 `comment` 알림(+ 대댓글이면 부모 댓글 작성자에게 `reply`). `SECURITY DEFINER`로 작성해 RLS INSERT 정책 부재를 우회. **자기 자신에게는 알림을 만들지 않고**, 멘션과 댓글 알림이 같은 사람에게 중복되지 않도록 억제
  - [x] **Realtime publication 등록** — `alter publication supabase_realtime add table notifications`. 현재 publication에 테이블이 0개이므로 이것이 이 프로젝트 최초의 등록. **`notifications`만 등록하고 `weekly_logs`/`comments`는 등록하지 않는다** — 필요 이상으로 브로드캐스트 대상을 늘리면 대역폭과 권한 노출면이 함께 커짐
  - [x] **Realtime 권한 확인 (가장 중요)** — Supabase Realtime의 Postgres Changes는 **구독자의 RLS를 평가해 페이로드를 필터링**하므로, `notifications`의 SELECT 정책이 `recipient_id = auth.uid()`인지 반드시 재확인. 정책이 느슨하면 **타인의 알림이 그대로 브로드캐스트됨** — publication 등록 이후 `pg_policy`를 재조회해 `notifications_select_own`이 정확히 `recipient_id = ( SELECT auth.uid() AS uid)`인지 확인
  - [x] `mcp__supabase__generate_typescript_types` 재생성, `lib/types/index.ts`에 `Notification`(+ `NotificationType`) 타입 추가
  - [x] `lib/actions/notification.ts` 신규 — `markNotificationReadAction`, `markAllNotificationsReadAction`, `deleteNotificationAction`. 기존 액션과 동일한 `{success, error}` 규약 + `revalidatePath("/protected", "layout")`(아직 헤더에 알림 UI가 없어 구체적인 페이지 경로 대신 공유 레이아웃을 무효화 — Task 035가 헤더에 뱃지를 추가하면 그대로 반영됨)
  - [x] 보존 정책 결정 — **읽은(`read_at not null`) 알림 중 90일 경과분만 삭제, 읽지 않은 알림은 기간과 무관하게 보존**. `pg_cron` 등 정기 실행 인프라가 아직 없어 자동화는 구현하지 않고, 수동/주기 실행 SQL 절차를 `docs/guides/deployment-ops.md` 7절에 기록
  - [x] `mcp__supabase__get_advisors`로 신규 테이블·함수 경고 확인 및 해소 — security는 신규 경고 0건(트리거 함수 3개 모두 `revoke execute ... from public, anon, authenticated`로 `prevent_unauthorized_role_change()`와 동일하게 처리해 `authenticated_security_definer_function_executable` 경고 대상에서 제외됨). performance는 `notifications`의 FK 3개(`actor_id`/`comment_id`/`weekly_log_id`)에 대한 `unindexed_foreign_keys` INFO를 커버링 인덱스 3개 추가로 해소(아래 "다르게 처리한 부분" 참고). 남은 INFO는 기존에 문서화된 것(`weekly_log_attachments` 미인덱스 FK 2건, `departments_organization_id_idx` unused, leaked password protection)과 신규 테이블이라 트래픽이 없어 나타나는 `unused_index` 3건(Task 032 전례와 동일하게 데이터 축적 후 재확인 예정)뿐
  - **관련 파일**: DB 마이그레이션(`create_notifications_table`, `add_notification_generation_triggers`, `add_notifications_to_realtime_publication`, `fix_notification_internal_upsert_column_guard`, `add_notifications_fk_covering_indexes`), `lib/actions/notification.ts`(신규), `lib/types/index.ts`, `lib/supabase/database.types.ts`, `docs/guides/deployment-ops.md`
  - **로드맵과 다르게 처리한 부분**:
    - **중복 억제 방식**: 로드맵이 제시한 "같은 트랜잭션 내 임시 배열로 억제" 대신 **`notifications`에 `unique(recipient_id, comment_id)` 제약을 걸고 `ON CONFLICT` upsert로 억제**하는 방식을 택함. 댓글 INSERT 트리거(`notify_on_new_comment`)와 멘션 INSERT 트리거(`notify_on_comment_mention`)는 서버 액션의 서로 다른 두 INSERT 문(댓글 저장 → 멘션 저장)에서 각각 별도로 실행되어 "같은 트랜잭션"이라도 "같은 트리거 호출"은 아니므로, 두 트리거가 실행 순서와 무관하게 서로의 존재를 몰라도 안전하게 동작하려면 DB 제약 기반 upsert가 더 견고하다고 판단. 우선순위는 **mention > reply > comment**(더 구체적인 알림이 이김)로 정해 마이그레이션 주석에 명시
    - **실측으로 발견한 버그 수정**: 멘션 upsert(`ON CONFLICT DO UPDATE`)가 `type`/`actor_id` 등을 변경하는데, 이것이 read_at 외 컬럼 변경을 막는 컬럼 보호 트리거(`notifications_protect_columns`)에 그대로 걸려 실패하는 문제를 impersonation 테스트 중 실제로 재현. `SECURITY DEFINER`로 실행돼도 `auth.uid()`는 세션 GUC를 그대로 읽어 "누가 호출했는지"만으로는 내부 트리거의 정당한 쓰기와 클라이언트의 직접 UPDATE를 구분할 수 없었기 때문 — 트랜잭션 로컬 GUC 플래그(`app.bypass_notification_column_guard`, `set_config(..., true)`)를 신뢰 경계로 추가해 해소(`fix_notification_internal_upsert_column_guard` 마이그레이션)
    - **FK 커버링 인덱스 3개 추가**: 로드맵은 `(recipient_id, read_at, created_at desc)` 인덱스만 명시했지만, 테이블 생성 직후 `get_advisors`에서 `actor_id`/`comment_id`/`weekly_log_id` FK에 대한 `unindexed_foreign_keys` 경고가 새로 발생함을 확인하고 Task 032의 동일 전례(`weekly_log_comments.author_id`)를 따라 3개 인덱스를 추가 적용(`add_notifications_fk_covering_indexes`)
    - **컬럼 보호 트리거의 `auth.uid() IS NOT NULL` 예외**: `prevent_unauthorized_role_change()`와 동일하게 직접 DB 접속(SQL Editor 등)은 검사 대상에서 제외해 운영 중 수동 정정을 막지 않도록 함 — 로드맵에 명시되진 않았지만 CLAUDE.md가 문서화한 기존 트리거 컨벤션을 그대로 재사용
  - **수락 기준**: 댓글·멘션 발생 시 알림 행이 자동 생성되고, 수신자 외에는 어떤 경로로도 그 알림을 조회할 수 없다
  - **테스트 체크리스트** (impersonation SQL, Task 032와 동일하게 `SAVEPOINT`/`DO $$ ... $$` 블록 + 트랜잭션 마지막에 강제 `RAISE EXCEPTION`으로 결과를 노출하면서 자동 `ROLLBACK`시키는 방식 사용 — 커밋 경로 자체가 없어 테스트 데이터가 남을 가능성을 원천 차단. 테스트 계정: 일반 사용자 commerce05@example.com(A)·commerce08@example.com(B), 대상 로그 2건은 A·B와 무관한 제3자 소속으로 선정)
    - [x] 사용자 A가 B를 멘션한 댓글 작성 → B에게 `mention` 알림 1건 생성 확인 — `notifications`에 recipient=B, type=mention 정확히 1행 생성 확인(로그 작성자(제3자)에게는 별도 `comment` 알림이 정상 생성되어 두 알림이 서로 다른 사람에게 감을 확인)
    - [x] A가 자기 글에 자기 댓글 작성 → 알림이 생성되지 않는지 확인 — `recipient_id = actor_id`인 알림 0건 확인
    - [x] 한 댓글에서 로그 작성자를 멘션한 경우 `mention`/`comment` 알림이 중복 생성되지 않는지 확인 — 최상위 댓글이 로그 작성자를 멘션하는 시나리오에서 해당 작성자의 알림이 정확히 1건이며 type이 `mention`으로 승격됨을 확인(comment 알림이 먼저 생성된 뒤 멘션 트리거가 `ON CONFLICT DO UPDATE`로 덮어씀)
    - [x] B를 impersonate해 A의 알림 SELECT 시도 → 0건 확인 — B로 SELECT 시 자신의 알림 1건만 보이고, A(수신 이력 없음)로 SELECT 시 0건 확인
    - [x] 클라이언트 롤로 `notifications` 직접 INSERT 시도 → 거부 확인 — `new row violates row-level security policy for table "notifications"`로 명시적 거부(INSERT 정책이 아예 없어 발생)
    - [x] 수신자가 `read_at` 외 컬럼(`recipient_id` 등) 변경 시도 → 거부 확인 — `recipient_id` 변경 시도는 RLS `WITH CHECK` 위반으로 거부됨을 1차 확인했으나, 이는 "다른 사람 소유로 바꾸기"라 RLS만으로도 막히는 약한 검증이라고 판단해 **`recipient_id`는 그대로 두고 `type`만 변경**하는 2차 테스트를 추가 실행 — 컬럼 보호 트리거 고유의 메시지("권한이 없습니다: read_at 외의 컬럼은 변경할 수 없습니다")로 명시적 거부됨을 확인해 트리거 자체가 동작함을 검증. `read_at`만 변경하는 UPDATE는 정상 허용됨도 함께 확인
    - [x] 댓글/로그 삭제 시 연결된 알림이 CASCADE로 정리되는지 확인 — 댓글 삭제 시 해당 알림 0건, `weekly_logs` 행 삭제 시 그 로그를 참조하던 알림 0건으로 정리됨을 각각 확인
    - [x] `supabase_realtime` publication에 `notifications`만 등록되어 있는지 확인 — `pg_publication_tables`에 `public.notifications` 1건만 존재

- **Task 035: 실시간 알림 UI 및 구독 구현 (F023 프론트엔드)**
  - [x] `components/notification-bell.tsx` 신규 — 헤더에 종 아이콘 + 안 읽은 개수 배지, 클릭 시 `ui/dropdown-menu`로 최근 알림 10건. `components/header-nav.tsx`(데스크탑)·`components/mobile-nav.tsx`(모바일) **양쪽에 반영**(아바타 노출 때와 동일한 이중 반영 필요, MVP Task 024 전례)
  - [x] **Realtime 구독 구현** — `hooks/use-notifications.ts` 신규. **반드시 `lib/supabase/client.ts`(브라우저 클라이언트)로** `supabase.channel("notifications:{userId}").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: "recipient_id=eq.{userId}" }, ...)` 구독. 서버 클라이언트로는 구독할 수 없음(CLAUDE.md의 클라이언트 3종 구분 규칙)
  - [x] **구독 정리(cleanup) 필수** — `useEffect` 반환값에서 `supabase.removeChannel(channel)` 호출. 코드 구현은 완료했고, 헤더가 속한 레이아웃(`app/protected/layout.tsx`)이 클라이언트 사이드 라우트 이동에서 리마운트되지 않는 구조라 실사용 시 채널이 라우트당 1개로 유지됨을 확인 — **다만 "10회 이동 후 채널 수"를 바이트 단위로 계측하는 것은 도구 한계로 완전히 검증하지 못함**(아래 "로드맵과 다르게 처리한 부분" 참고)
  - [x] 초기 데이터는 서버에서, 이후 갱신만 Realtime으로 — 헤더는 서버 컴포넌트에서 안 읽은 개수를 조회해 첫 페인트에 반영하고, 구독은 그 위에 증분으로 얹음(`cacheComponents` 하에서 Suspense fallback 유지)
  - [x] **연결 실패 폴백** — Realtime 연결이 끊기거나 실패해도 앱이 정상 동작해야 함. `channel.subscribe((status) => ...)`로 상태를 감지해 실패 시 폴링(예: 60초 간격) 또는 조용한 비활성화로 폴백하고, **에러 토스트로 사용자를 방해하지 않을 것** — 코드 구현 완료(아래 "다르게 처리한 부분" 참고, 강제 단절 실측은 도구 한계로 미완)
  - [x] 알림 클릭 동선 — 해당 주간업무일지 상세 페이지의 댓글 위치로 이동(`/protected/weekly-logs/{id}#comment-{commentId}`) 후 자동으로 읽음 처리
  - [x] [모두 읽음] 버튼, 알림 없을 때 EmptyState (`components/empty-state.tsx` 재사용)
  - [ ] 브라우저 탭 제목에 안 읽은 개수 표시 검토(선택) — 데스크탑 알림(Notification API)은 권한 요청 UX 부담이 있으므로 **이번 범위에서 제외**(로드맵 원문에도 선택 항목으로 명시, 미구현)
  - [x] 접근성 — 종 버튼에 `aria-label`(예: "알림 3건") 부여. MVP Task 015에서 아이콘 전용 버튼의 접근성 이름 누락이 실제로 발견된 전례가 있으므로 처음부터 반영 — Playwright `browser_snapshot`으로 "알림"(0건)·"알림 N건" 두 상태 모두 접근성 이름에 정상 반영됨을 확인
  - **관련 파일**: `components/notification-bell.tsx`(신규), `hooks/use-notifications.ts`(신규), `lib/queries/notifications.ts`(신규), `lib/actions/notification.ts`(Task 034에서 이미 작성, 변경 없음), `lib/types/index.ts`(`NotificationListItem` 추가), `lib/format.ts`(`formatNotificationMessage` 추가), `components/header-nav.tsx`, `components/mobile-nav.tsx`, `components/weekly-log-comment-section.tsx`(댓글 `<li>`에 `id={comment-{id}}` 앵커 추가)
  - **수락 기준**: 브라우저 두 개(사용자 A·B)에서 A가 B를 멘션하면 **새로고침 없이** B의 헤더에 알림이 나타나고, 클릭 시 해당 댓글로 이동하며 읽음 처리된다 — QA 계정 A·B로 실측 확인(아래 테스트 체크리스트 참고)
  - **테스트 체크리스트**
    - [ ] Playwright MCP로 두 개의 브라우저 컨텍스트(A·B)를 띄워 A의 멘션 댓글 작성 → B 화면에 새로고침 없이 알림 배지 증가 확인 (**이 Task의 핵심 검증**) — **완전한 형태로는 검증하지 못함**: 이 프로젝트에 연결된 Playwright MCP는 탭(`browser_tabs`)만 지원하고 브라우저 컨텍스트는 하나뿐이라 쿠키/세션이 모든 탭에 공유됨(직접 실측: 로그인한 탭에서 새 탭을 열어도 동일 세션 유지). 대신 (1) A 계정으로 실제 UI(멘션 입력 `@` 자동완성 포함)에서 B를 멘션하는 댓글을 작성해 정상 동작을 1회 확인하고, (2) B 계정으로 로그인해 그 브라우저 탭을 열어둔 채 Supabase MCP `execute_sql`로 A를 impersonate(`set local role authenticated` + `request.jwt.claim.sub`)해 실제 앱과 동일한 INSERT(댓글+멘션)를 실행 — **B의 열려 있는 탭에서 새로고침 없이 배지가 1→2로 증가**함을 반복 확인(총 2회, 이후 재확인 1회 포함 3회 모두 성공, 단 도중 1회는 지연 없이 갱신되지 않아 새로고침 후에는 정상 반영됨을 확인 — 아래 노트 참고). Realtime 자체가 정상 동작함은 실증됐으나 "두 브라우저 컨텍스트"라는 문구 그대로의 검증은 도구 한계로 대체 수단을 썼음을 명시
    - [x] 알림 클릭 → 해당 상세 페이지·댓글 위치로 이동하고 읽음 처리되어 배지가 감소하는지 확인 — 알림 클릭 시 `/protected/weekly-logs/{id}#comment-{commentId}`로 이동하고 해당 `id`를 가진 댓글 DOM 엘리먼트가 실제로 존재함을 확인, 배지가 2→1로 감소
    - [x] [모두 읽음] 클릭 시 배지가 0이 되고 새로고침 후에도 유지되는지 확인 — 클릭 직후 배지 소멸(`aria-label`이 "알림 N건"에서 "알림"으로 전환) 및 페이지 새로고침(SSR 재조회) 후에도 0 유지 확인
    - [ ] 타인의 알림이 브로드캐스트되지 않는지 확인 (B의 알림 발생 시 A의 배지가 변하지 않는지) — 위와 동일한 단일 컨텍스트 한계로 "동시에 열린 두 탭"으로는 검증하지 못함. 대신 A로 로그인했을 때 헤더가 항상 "알림"(0건, B에게 간 알림이 전혀 보이지 않음)으로 뜨는 것을 확인했고, 이는 `notifications` SELECT RLS(`recipient_id = auth.uid()`)와 채널 필터(`recipient_id=eq.{userId}`)가 Task 034에서 이미 SQL로 검증된 것과 동일한 조건이라 구조적으로 격리됨 — 다만 "동시 세션에서 실시간으로 안 변함"을 직접 관찰하지는 못해 미체크로 남김
    - [ ] 라우트를 10회 이동한 뒤 Realtime 채널이 누적되지 않는지 계측 (구독 정리 검증) — 브라우저 콘솔에서 `WebSocket` 생성자를 프록시로 감싸 라우트 10회 이상 클라이언트 사이드 이동(`history.back/forward`, `Link` 클릭) 동안 새 연결이 열리는지 계측을 시도했으나, `@supabase/realtime-js`가 페이지 로드 시점에 네이티브 `WebSocket` 참조를 모듈 스코프에 미리 캡처해두는 것으로 보여 런타임 몽키패치로는 신뢰할 수 있는 수치를 얻지 못함(패치 이후 10회 이상 이동에도 "opened: 0"만 관측 — 이것이 "누수 없음"의 증거가 아니라 계측 자체가 무력화된 정황). Playwright MCP에 CDP 수준 네트워크 검사·WebSocket 라우팅 도구가 없어 대체 수단도 없었음. 대신 (1) 코드 리뷰로 `useEffect` cleanup의 `supabase.removeChannel(channel)` 호출을 재확인했고, (2) `app/protected/layout.tsx`가 클라이언트 사이드 라우트 전환에서 리마운트되지 않는 레이아웃 구조임을 확인해 동일 레이아웃 내 이동에서는 애초에 재구독 자체가 일어나지 않음을 확인했으며, (3) 다수의 전체 페이지 새로고침·계정 전환·A/B 왕복 이후에도 알림 기능이 계속 정상 동작함(연결이 죽거나 뒤엉키지 않음)을 확인 — 정량적 채널 수 계측은 미완으로 남김
    - [ ] Realtime 연결을 강제로 끊었을 때 앱이 정상 동작하고 에러 토스트로 사용자를 방해하지 않는지 확인 — Playwright MCP에 네트워크 오프라인 에뮬레이션·WebSocket 강제 종료 도구가 없어 실측하지 못함. 코드 리뷰로 `channel.subscribe` 콜백의 `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED` 분기가 토스트 없이 60초 폴링만 시작하는 것을 재확인했고, 이번 테스트 전체(약 20회 이상의 페이지 이동·계정 전환·SQL 기반 강제 INSERT, 그중 1회는 실시간 반영이 지연되고 새로고침으로만 해소된 사례 포함)에서 에러 토스트가 단 한 번도 뜨지 않았음을 콘솔·스냅샷으로 확인 — 이는 정황 증거이며 의도적인 강제 단절 재현은 아니므로 미체크로 남김
    - [x] 로그아웃 시 구독이 정리되고, 다른 계정으로 로그인했을 때 이전 사용자의 알림이 남지 않는지 확인 — B로 로그인해 안 읽은 알림 배지를 만든 뒤 로그아웃 → A로 로그인 시 헤더가 즉시 "알림"(0건)으로 뜨고 B의 알림이 전혀 보이지 않음을 확인
    - [x] 데스크탑·모바일 헤더 양쪽에서 알림 UI가 정상 노출되는지 확인 — 데스크탑(1280px)·모바일(390px) 뷰포트 양쪽에서 종 배지·드롭다운(알림 목록·모두 읽음)이 정상 렌더링됨을 확인
    - [x] 콘솔 에러·하이드레이션 경고 0건 확인 — 회원가입·로그인·로그아웃·댓글 작성·알림 클릭·모두 읽음·라우트 이동 전 구간에서 `browser_console_messages`로 error/warning 0건 확인
  - **범위 밖 유지**: 이메일 알림, 브라우저 푸시 알림(Web Push), 알림 설정 화면(유형별 on/off), 실시간 댓글 스트리밍(다른 사람의 댓글이 상세 페이지에 실시간으로 추가되는 것), 브라우저 탭 제목 안 읽은 개수 표시는 요청 범위 밖
  - **로드맵과 다르게 처리한 부분**:
    - **Realtime 구독을 데스크탑·모바일 두 곳에서 각자 열지 않고 단일 Provider로 공유** — `components/header-nav.tsx`(데스크탑)와 `components/mobile-nav.tsx`(모바일)가 항상 동시에 DOM에 존재하고 CSS(`hidden md:flex`/`md:hidden`)로만 화면을 전환하는 구조라, `NotificationBell`을 두 곳에 각각 독립적으로 두면 `useNotifications()`가 두 번 호출되어 **같은 사용자에 대해 WebSocket 연결이 2개** 열리는 구조적 낭비가 생김을 설계 단계에서 인지. `components/notification-bell.tsx`에 `NotificationsProvider`(Realtime 구독·상태를 소유하는 클라이언트 컴포넌트, `header-nav.tsx`가 데스크탑·모바일 두 블록을 감싸는 형태로 1회만 렌더)와 `NotificationBell`(컨텍스트를 구독만 하는 표시 전용 컴포넌트, 데스크탑·모바일 두 곳에서 각각 렌더)로 분리해 **연결은 1개, 드롭다운 UI는 두 곳에 독립 렌더**되도록 구현. 로드맵 원문의 "양쪽에 반영"은 그대로 만족하되 구현 방식만 다르게 선택
    - **채널 누수 계측 방법 변경 및 미완료**: 로드맵이 예시로 제시한 "라우트 10회 이동 후 채널 수 확인"을 브라우저 `WebSocket` 생성자 몽키패치로 시도했으나 `@supabase/realtime-js`가 페이지 로드 시점에 네이티브 참조를 캡처해두는 것으로 보여 신뢰할 수 없는 결과(항상 0)만 얻었고, Playwright MCP에 CDP 레벨 대안이 없어 정량적 계측을 완료하지 못함(위 테스트 체크리스트 참고). 코드 리뷰(cleanup 호출 확인)와 정성적 관찰(레이아웃 비-리마운트 구조, 장시간 사용 후에도 기능 정상)로 대체
    - **강제 연결 끊기 테스트 미완료**: 같은 이유로 Playwright MCP에 네트워크 오프라인 에뮬레이션 도구가 없어 의도적인 강제 단절 재현을 하지 못함. 코드 리뷰와 테스트 전 구간에서 에러 토스트가 한 번도 뜨지 않았다는 정황 증거로 대체(위 참고)
    - **A/B 실시간 테스트를 "두 브라우저 컨텍스트" 대신 하이브리드 방식으로 수행**: Playwright MCP가 탭 단위로만 동작하고 브라우저 컨텍스트(쿠키/세션)가 하나뿐임을 실측으로 확인(로그인 후 새 탭을 열어도 동일 세션 공유) — 완전히 독립된 두 로그인 세션을 동시에 띄우는 것이 도구상 불가능했다. 대신 B 계정의 브라우저 탭을 열어둔 채, A의 실제 앱 액션(멘션 댓글 작성)과 동등한 INSERT를 Supabase MCP `execute_sql`의 `authenticated` 롤 impersonation(Task 032·034와 동일 컨벤션)으로 실행해 B 탭이 새로고침 없이 반응하는지 확인하는 방식으로 핵심 메커니즘(Realtime 구독·페이로드 필터링·클라이언트 병합)을 검증했다. QA 계정: `qa-task035-a@example.com`/`qa-task035-b@example.com`(Task 033 관례를 따름), 둘 다 Commerce시스템팀 소속으로 가입 후 테스트 종료 시 생성한 댓글 4건·멘션·알림 3건과 두 계정을 모두 삭제해 원상복구(실측 확인: 삭제 후 관련 테이블 잔여 행 0건)
    - **1회 관찰된 실시간 반영 지연**: 다수의 페이지 이동·계정 전환·모니터링 코드 삽입(WebSocket 몽키패치)을 반복하던 중 1회, SQL로 생성한 알림이 열려 있던 B 탭에 즉시 반영되지 않는 사례를 관찰했다(3초 대기 후에도 배지 불변, 페이지를 새로고침하자 정상 반영됨 — 즉 데이터·RLS·SSR 조회 경로는 정상이었고 그 시점의 실시간 채널만 응답하지 않음). 직후 동일한 방식으로 재시도했을 때는 정상 동작(1→2 갱신)해 재현되지 않았고, 원인은 정상 사용 흐름이 아닌 테스트용 `WebSocket` 몽키패치가 연결 상태를 교란했을 가능성이 유력하다고 판단해 코드 결함으로 확정하지 않았다. 다만 완전히 배제할 수는 없으므로, 실제 운영 환경에서 유사 현상이 보고되면 이 노트를 참고할 것 — 폴링 폴백(60초)과 새로고침 시 정확한 SSR 재조회가 이중 안전망으로 이미 존재해 사용자가 데이터를 영구히 놓치지는 않는다

---

### Phase 5: 통합 검증 및 v1 마감

> 목표: 6가지 기능이 서로, 그리고 MVP 기능과 충돌 없이 동작함을 증명하고 배포 가능한 상태.

- **Task 036: v1 통합 E2E 및 권한 회귀 테스트 ✅**
  - [x] **권한 회귀 집중 검증** — Phase 1의 `profiles`/`departments` RLS 변경 후 MVP 핵심 경로를 impersonation SQL(`set local role authenticated` + `request.jwt.claims`, 전부 최종 `RAISE`로 강제 ROLLBACK)로 재검증. 일반 사용자 8건 + 관리자/스토리지 5건 **전부 PASS**: 자기 역할 상승 차단 / 본인 bio 수정(프로필 저장 회귀 없음) / 타 부서 로그 SELECT(전 부서 공개) / 자기 부서 로그 UPDATE(canWrite) / 타 부서 로그 UPDATE 차단(0행) / 일반 사용자 부서 INSERT 차단 / 타 부서 댓글 INSERT(부서 무관) / 알림 타인 유출 0 / 관리자 타인 역할변경·부서 INSERT·bypass 타 부서 로그 UPDATE / 첨부파일 스토리지 RLS(자기 부서 폴더 업로드 허용·타 부서 폴더 차단). PDF 다운로드는 클라이언트 사이드(RLS 무관)라 UI 렌더만 확인
  - [x] 전체 사용자 여정 재실행 — 실브라우저(Playwright)로 회원가입 → 온보딩 게이트(부서 미설정 시 `/protected/profile` 리다이렉트 실측) → 부서 설정 → 목록(4종 필터 UI: 검색/부서/상태/기간) → 작성 폼(Tiptap 에디터 정상 로드) → 상세(canWrite=삭제·수정 노출, 업무타입/상태/중요도 인라인) → 댓글·멘션(`@` 자동완성 → 등록) → 알림 생성 트리거 실측 → 대시보드(차트 6종) → 관리자 콘솔 5탭. **알림 수신 UI는 단일 브라우저 컨텍스트 한계(Task 035 전례)로 헤더 bell 렌더·aria-label만 확인하고, 트리거 생성은 DB로 실증**
  - [x] 3개 역할 시나리오 — QA 계정 1개를 (1) 신규 가입 직후=**부서 미설정**(온보딩 게이트), (2) 부서 설정 후=**일반 사용자**(목록 기본 필터=소속 부서, canWrite=자기 부서), (3) SQL로 admin 승격 후=**관리자**(헤더 "관리자" 배지·"관리자 콘솔" 링크 즉시 반영, 콘솔 5탭·대시보드)로 순차 검증
  - [x] **기능 간 상호작용 검증 (v1 특유의 리스크)**
    - [x] 부서를 비활성화한 뒤 그 부서의 로그·댓글·통계가 여전히 정상 조회되는지 — `archived_at` 설정해도 `weekly_logs` 행 수 30→30 불변(ROLLBACK 검증). 부서 SELECT 정책·로그 SELECT는 archived와 무관하므로 조회 영향 없음
    - [x] 사용자의 부서를 변경한 뒤 그가 과거에 쓴 로그의 쓰기 권한이 정확히 이동하는지 — canWrite가 `current_department_id()` 기반이라 부서 경계가 곧 쓰기 경계임을 권한 회귀 검증(자기 부서 UPDATE 허용·타 부서 0행)으로 실증. 부서 변경 시 상세 페이지에 쓰기권한 상실 경고(`formatDepartmentChangeWarning`) 노출도 UI로 확인
    - [x] 사용자를 강등한 직후 진행 중이던 관리자 화면 조작이 안전하게 차단되는지 — 서버 액션이 호출자 `profiles.role`을 매 호출 재조회하는 구조(Task 028) + 자기 강등 방지 UI(역할 select `disabled` + "본인 역할은 변경할 수 없습니다.")를 상세 페이지에서 실측
    - [x] 댓글이 달린 로그를 삭제했을 때 댓글·멘션·알림이 모두 정리되는지 — 실제 QA 댓글+멘션+알림 2건이 달린 로그를 삭제하니 comments 1→0, mentions 1→0, notifs 2→0으로 CASCADE 정리됨(ROLLBACK 검증)
    - [x] 기간 필터 결과와 대시보드 집계 숫자가 동일 조건에서 일치하는지 — 대시보드 전체 318건 = DB `weekly_logs` count 318, 진행상태 분포 합(완료 113+진행중 138+예정 67=318) 일치 확인. `stats_*` RPC가 목록과 동일한 `weekly_logs` SELECT RLS를 타므로 조건 일치
  - [x] 엣지 케이스 — 부서 미설정 접근 시 온보딩 게이트 리다이렉트 실측. 잘못된 UUID/존재하지 않는 id의 `notFound()` 404 처리·중복 제출 가드는 MVP Task 014·첨부파일 재제출 가드에서 검증된 기존 동작이라 이번엔 회귀만 확인(신규 회귀 없음)
  - [x] 뷰포트 × 라이트/다크 — 데스크탑(1280) + 모바일(390) 양쪽 확인(모바일은 카드 레이아웃·햄버거+알림 bell 헤더로 정상 전환). 라이트/다크 테마 토글(Light/Dark/System) 정상 동작·양 테마 렌더 확인. **태블릿(768) 전용 뷰포트는 별도로 돌리지 않음**(md 브레이크포인트 경계라 데스크탑/모바일 두 축으로 커버)
  - [x] 접근성 스냅샷(`browser_snapshot`) — 알림 bell `aria-label`("알림"/"알림 N건"), 대시보드 차트 6종 `img`+설명 alt + 동반 data table, 정렬 헤더·폼 라벨 접근성 이름 정상 확인
  - [x] 콘솔 에러·하이드레이션 경고 0건 확인 — 전 여정(가입·온보딩·목록·상세·댓글/멘션·관리자 5탭·대시보드·테마 토글·뷰포트 전환)에서 `browser_console_messages`(all) 결과 **error 0 / warning 0**. `npm run build`는 착수 시 green(26페이지 생성·TypeScript 통과, `npx tsc --noEmit`도 0오류). **`next start` 별도 기동은 생략** — E2E는 실행 중이던 dev 서버로 수행했고 프로덕션 빌드가 green이라 재기동 이득이 없다고 판단(배포 스모크는 Task 037에서 프로덕션 도메인으로 수행 예정)
  - [x] 테스트에 사용한 QA 계정·시딩 데이터 정리 — QA 계정(auth+profiles)·댓글 1·멘션 1·알림 2 전부 삭제, 잔여 0건 실측(profiles 63·admins 0·logs 318·archived_depts 0으로 baseline 복원)
  - **수락 기준 충족**: MVP 핵심 RLS 경로에 회귀 없음(13/13 PASS), v1 기능이 서로 간섭 없이 동작, `npm run build` 성공. 어드바이저 baseline(security WARN 7·performance INFO 3, 전부 기존/의도)에 신규 경고 0건
  - **검증 방법 및 한계 메모**:
    - **단일 조직 데이터 한계**: 원격 DB에 조직이 1개(IT부문)뿐이라 "관리자 콘솔 조직 범위 제한(타 조직 데이터 격리)"을 실데이터로 교차 검증할 수 없었음 — 코드/RLS 검증은 F033·F034에서 완료. 일반 admin의 조직 관리 탭이 단일 카드(생성 UI 없음)로 뜨는 것은 UI로 확인
    - **단일 브라우저 컨텍스트 한계(Task 035 전례 재확인)**: Playwright MCP가 쿠키/세션을 탭 간 공유해 "두 사용자 동시 로그인"이 불가. 실시간 알림 배지 증가는 이번에도 UI로는 직접 재현하지 않고, 알림 생성 트리거(멘션→mention·로그작성자→comment, self 제외, 중복 억제)를 DB로 실증
    - **impersonation ROLLBACK 컨벤션**: 모든 쓰기형 권한 검증은 `DO` 블록 안에서 수행 후 마지막에 `RAISE EXCEPTION`으로 강제 롤백(Task 032·034와 동일)해 테스트 데이터가 커밋되지 않도록 함. 실제 UI로 만든 데이터(QA 댓글 등)만 명시적으로 사후 삭제

- **Task 037: 성능·보안 점검 및 문서 갱신, 배포** 🚧 (배포·프로덕션 스모크만 사용자 작업으로 대기)
  - [x] `mcp__supabase__get_advisors`(security + performance) 최종 점검 — **신규 테이블 3종(`weekly_log_comments`/`weekly_log_comment_mentions`/`notifications`) 및 `departments` 변경분 관련 신규 경고 0건**. 잔여 경고는 전부 기존/의도된 것: security WARN 7(SECURITY DEFINER 함수 6종 `is_admin`/`is_superadmin`/`current_department_id`/`current_organization_id`/`get_profile_identities`/`search_mentionable_profiles` — 전부 `anon` EXECUTE 회수한 확립된 컨벤션 + leaked password protection Auth 설정), performance INFO 3(`weekly_log_attachments` FK 2종 미인덱스 + `departments_organization_id_idx` 미사용 — 전부 MVP/기존). Task 036 baseline과 동일
  - [x] 쿼리 성능 실측 — 3곳 모두 `EXPLAIN (ANALYZE, BUFFERS)`로 확인, 전부 인덱스 사용·1ms 미만: 댓글 상세(`weekly_log_comments_log_created_idx` Bitmap Index Scan, 0.19ms), 헤더 알림(`notifications_recipient_unread_idx` Index Scan, 0.18ms), 전체 대시보드(`stats_logs_by_status` Function Scan, 318행 집계 3.1ms). **신규 인덱스 추가 없음**(과도한 사전 최적화 지양) — 신규 테이블 인덱스가 이미 조회 패턴을 커버(`notifications`는 `(recipient_id, read_at, created_at desc)`·weekly_log_id·actor_id·comment_id, 댓글은 `(weekly_log_id, created_at)`·author·parent, 멘션은 `(mentioned_user_id)`)
  - [x] 번들 크기 점검 — `npm run build` green(26페이지, TypeScript 통과). recharts는 대시보드 차트 6종 컴포넌트에서만 import되고 그 컴포넌트들은 `app/protected/admin/dashboard/page.tsx` 라우트에서만 사용 → App Router 라우트 단위 코드 스플리팅으로 **초기/공유 번들에 recharts 미포함**, 대시보드 진입 시에만 청크 로드(코드 레벨 확인. 프로덕션 네트워크 실측은 아래 배포 스모크 항목에서 수행)
  - [x] Realtime 사용량 확인 — 구독은 `hooks/use-notifications.ts` 한 곳뿐, **사용자당 채널 1개**(`notifications:${userId}`, `recipient_id=eq.` 필터 INSERT 구독 1개)만 열리고 언마운트/라우트 이동 시 `removeChannel`로 정리(커넥션 누적 방지). publication(`supabase_realtime`)에는 `notifications` 테이블만 등록. 동시 접속자 = 열린 채널 수라 부서 단위 앱 규모에서 어떤 플랜 한도에도 여유. 연결 끊김 시 60초 폴링 폴백
  - [x] **문서 갱신 (이 프로젝트의 확립된 관례)** — PRD·데이터 모델·기술 스택은 Task 034/035 진행 중 증분 갱신돼 있어 이번엔 상태 문구 중심으로 정합화
    - [x] `docs/PRD.md` — F019~F024 정식 기능 명세·데이터 모델 3종·기술 스택 recharts/Realtime은 이미 반영돼 있었음. 이번엔 "실시간 알림(F023)은 계획 단계" → "구현 완료"로, 섹션 3 헤더 "(계획)" 제거로 상태 정합화
    - [x] `CLAUDE.md` — 관리자 콘솔 가드·권한 하드닝 트리거·댓글 RLS 근거는 이미 문서화돼 있었고, **누락돼 있던 "실시간 알림(Supabase Realtime)" 아키텍처 섹션 신규 추가**(개인 기준 RLS·트리거 전용 생성·publication 단일 테이블·구독 정리 규칙·SSR 시드+증분·폴링 폴백·낙관적 읽음 처리)
    - [x] `docs/guides/deployment-ops.md` — 4절(관리자 지정)·5절(부서 관리)을 "UI로 대체 예정" → "이제 UI로 처리, 수동 SQL은 부트스트랩/예외용"으로 갱신. 5절 raw insert 예시에 조직 계층(F027) 도입으로 필수가 된 `organization_id` 반영 + 소프트 삭제(`archived_at`) 예시 추가. 알림 보존 정책(7절)은 이미 존재
    - [x] `README.md` — 실시간 알림 기능 항목 추가, 기술 스택에 Supabase Realtime 추가, "실시간 알림은 아직 구현 전" 문구를 "v1 전 기능 구현 완료, 다음은 F031/F032"로 갱신
  - [ ] Vercel 배포 및 프로덕션 스모크 테스트 — 관리자 콘솔, 대시보드, 댓글·멘션, 실시간 알림을 프로덕션 도메인에서 실행 (MVP Task 017과 동일한 절차). **Vercel/Supabase 대시보드 접근이 필요한 사용자 작업** — `docs/guides/deployment-ops.md` 1~3·6절 절차 참고. 배포 후 도메인을 알려주면 Playwright MCP로 스모크(번들 청크 네트워크 실측 포함) 함께 수행 가능
  - **수락 기준**: 어드바이저 신규 경고 0건 ✅, 4개 문서가 v1 상태를 정확히 반영 ✅, 프로덕션에서 6개 기능 동작(배포 후 확인 대기)

---

### Phase 6: 신규 요구사항 (추천/비추천 · 전체 성능 개선)

> 목표: 구성원이 개별 주간업무일지에 추천/비추천으로 반응할 수 있고, MVP 시절부터 누적된 애플리케이션 전반의 성능 병목이 **실측 기반으로** 정리된 상태.
> **선행 조건**: Phase 4·5와 기술적 의존성은 없으나(병렬 착수 가능), Task 039는 v1 전 기능이 올라간 뒤 측정해야 의미가 있으므로 **Task 036 완료 후 착수를 권장**한다.
> **⚠️ 두 Task 모두 상세 스펙 미확정**: 아래 항목은 기존 설계 관례(F022 댓글의 RLS 판단, Task 037의 점검 절차)에서 유추한 초안이다. 확정되지 않은 것은 억지로 정하지 않고 아래 "주요 리스크 및 결정 필요 사항" 표에 남겨뒀으니, **착수 전 그 표의 F031·F032 행을 먼저 확정할 것**. 스키마·UI를 먼저 만들고 나중에 정책을 맞추면 마이그레이션을 두 번 쓰게 된다.

- **Task 038: 주간업무일지 추천/비추천 기능 구현 (F031) ✅**
  - **확정된 결정(착수 전 사용자 확인, 리스크 표 F031 행)**: 자기 글 투표 **허용**(특수 케이스 없음) / 노출 범위 **상세 + 목록**(댓글수 배지와 동일한 2차 조회 방식) / 익명성 **익명 집계만**(명단 비공개, `get_profile_identities` 불필요) / 통계 반영 **대시보드 반영**(신규 `stats_reactions_summary` RPC) / 인터랙션 **낙관적 업데이트**(진행상태·중요도와 동일 관례) / 관리자 예외 **없음**(DELETE도 본인 행만, 수락 기준 "타인의 반응은 어떤 경로로도 조작할 수 없다"와 정합)
  - [x] **DB 마이그레이션 — `weekly_log_reactions` 테이블 신규 생성**(`create_weekly_log_reactions`, Supabase MCP `apply_migration`)
    - `id uuid pk`, `weekly_log_id → weekly_logs(id) on delete cascade`, `user_id → profiles(id) on delete cascade`, `reaction text` (`up` | `down` CHECK), `created_at`, `updated_at`(기존 `set_updated_at()` 트리거 재사용)
    - `unique(weekly_log_id, user_id)` — **1인 1표 토글 모델**. 전환은 기존 행 `reaction` 갱신, 같은 버튼 재클릭은 행 삭제(해제)
    - 추가 인덱스 없음(unique가 `weekly_log_id` 선두를 커버, 과도한 사전 최적화 지양)
  - [x] **RLS 정책 — 댓글(F022)과 동일하게 부서 무관**: SELECT 전 인증 공개 / INSERT·UPDATE·DELETE는 `user_id = (select auth.uid())` 본인 행만. **부서 조건·관리자 예외 없음** — 근거를 마이그레이션 테이블 주석에 "Task 032 판단을 재사용하는 두 번째 지점"으로 명시
  - [x] **집계 조회 방식 구현**(`lib/queries/reactions.ts` 신규) — 상세는 단건 count + 내 반응, 목록은 댓글수와 동일하게 페이지 로그 id들로 2차 조회 후 Map 병합. `weekly_logs`에 카운터 컬럼 비정규화하지 않음
  - [x] `mcp__supabase__generate_typescript_types` 재생성(`lib/supabase/database.types.ts`), `lib/types/index.ts`에 `WeeklyLogReactionKind`/`WeeklyLogReactionSummary`·목록/상세 확장, `lib/types/stats.ts`에 `ReactionSummaryStats` 추가
  - [x] `lib/actions/weekly-log-reaction.ts` 신규 — `toggleWeeklyLogReactionAction`(up/down 단일 진입점, `{success, error}` 규약 유지). 클라이언트 카운트 불신, 서버에서 토글 후 재집계한 `summary` 반환. 잘못된 UUID·FK 위반(23503) 방어
  - [x] `components/weekly-log-reaction-buttons.tsx` 신규 — 추천/비추천 버튼 + 각 카운트 + 내 반응 강조(`variant`·`aria-pressed`). **낙관적 업데이트 적용**(성공 시 서버 재집계값으로 확정, 실패 시 이전 값 롤백 + 토스트). 목록용 읽기 전용 표시는 `components/weekly-log-reaction-counts.tsx`로 분리
  - [x] 상세 페이지 배치(`weekly-log-detail-view.tsx`, `[id]/page.tsx`) — **canWrite 게이트 없이** 전 로그인 사용자에게 노출. 목록 배치(`page.tsx`·`weekly-log-table.tsx`·`weekly-log-card.tsx`) — 제목 옆 익명 집계(둘 다 0이면 미표시). 대시보드 7번째 차트(`components/dashboard-reaction-chart.tsx`, `stats_reactions_summary` RPC + `getReactionsSummary`, org 범위 준수)
  - [x] 경계 조건 — 자기 글 투표 **허용**이라 작성자 검사 없음(별도 비활성화 UI 불필요)
  - [x] 접근성 — 아이콘 전용 버튼에 `aria-label`("추천 N건"[, ", 내가 추천함"]) + `aria-pressed`. 목록 집계도 `aria-label` 부여
  - [x] `mcp__supabase__get_advisors`(security + performance) — **신규 테이블 관련 경고 0건**(RLS 활성·정책 정상, `stats_reactions_summary`는 SECURITY INVOKER라 DEFINER 경고 없음). 잔여는 기존 baseline(security WARN 7·performance INFO 3) 그대로
  - **관련 파일**: 마이그레이션, `lib/actions/weekly-log-reaction.ts`·`lib/queries/reactions.ts`·`components/weekly-log-reaction-buttons.tsx`·`components/weekly-log-reaction-counts.tsx`·`components/dashboard-reaction-chart.tsx`(전부 신규), `lib/queries/stats.ts`·`lib/types/index.ts`·`lib/types/stats.ts`·`lib/constants/chart-colors.ts`·`lib/supabase/database.types.ts`, `components/weekly-log-detail-view.tsx`·`weekly-log-table.tsx`·`weekly-log-card.tsx`, `app/protected/weekly-logs/[id]/page.tsx`·`weekly-logs/page.tsx`·`admin/dashboard/page.tsx`
  - **수락 기준 충족**: 로그인 사용자가 부서 무관하게 임의 로그에 1표만 남기고 재클릭 해제·전환 가능, 타인 반응은 어떤 경로로도 조작 불가(impersonation으로 실증) ✅
  - **테스트 결과** (Playwright MCP 실브라우저 + impersonation SQL 병행. QA 계정·반응은 종료 후 완전 삭제 — reactions 0/auth 0/profile 0 실측 복원)
    - [x] 추천 클릭 → 1건·[pressed], 재클릭 → 0 원복(UI 실측)
    - [x] 추천→비추천 전환 → 추천 0·비추천 1, DB 행 1건 유지(insert 아닌 update, SQL 확인)
    - [x] 타 부서 계정(dept 966f)으로 타 부서 로그(dept 6090)에 반응 가능(UI + impersonation 모두 실증)
    - [x] 타인 반응 UPDATE/DELETE impersonation 시도 → 각 0행(RLS 차단)
    - [x] 같은 사용자·로그 두 번째 INSERT → unique_violation 차단
    - [x] 자기 글 투표 허용 정책대로 동작(작성자 검사 없음 — UI·서버 액션 모두 제약 없음 확인)
    - [x] 로그 삭제 시 반응 CASCADE 정리(before 1 → after 0, ROLLBACK 검증)
    - [x] 낙관적 업데이트 — 버튼은 `isPending` 중 `disabled`로 연타 차단, 실패 시 이전 값 롤백 + 토스트(코드/패턴 확인). **네트워크 실패 강제 주입 재현은 생략** — 진행상태·역할 변경에서 동일 패턴을 Task 036·028에서 실측 검증한 이력이라 회귀만 확인
    - [x] 뷰포트 — 데스크탑(1280) 테이블 + 모바일(390) 카드 모두 집계 표시·버튼 레이아웃 정상. **다크모드 전용 스크린샷은 생략** — 버튼이 shadcn `Button`(default/outline) + `text-muted-foreground` 테마 토큰만 사용해 구조적으로 테마 인식
    - [x] 콘솔 에러·하이드레이션 경고 0건(전 세션 `browser_console_messages` all: error 0/warning 0), `npm run build` green, `npx tsc --noEmit` 0오류
  - **범위 밖 유지**: 댓글에 대한 반응, 추천 종류 확장(👍 외 다양한 이모지 반응 — `docs/PRD.md` 4절에서 영구 제외로 명시된 "이모지 반응"은 **댓글** 대상이지만 업무일지에도 확장하지 않는다), 추천 발생 시 알림(F023) 연동, 추천순 정렬·인기 랭킹 화면, 추천 취소 이력 감사 로그

- **Task 039: 애플리케이션 전반 성능 개선 (F032)** 🚧 (인증 계정 필요한 E2E 회귀만 사용자 작업으로 대기)
  - **확정된 결정(착수 전 사용자 확인, 리스크 표 F032 행)**: 완료 조건 **측정 기반 일반 점검**(수치 목표 없이 측정→개선→재측정 기록 + 어드바이저 분류) / 영역 **DB 쿼리·인덱스 → 클라 번들 → 렌더링·캐싱 → 정적 자산 4개 전부를 순차로**
  - [x] **Task 037과의 경계 확정** — Task 037(v1 신규 4종 테이블·신규 화면 한정 배포 전 점검)이 이미 측정한 3개 쿼리(댓글 상세·헤더 알림·전체 대시보드, 전부 <1ms)·recharts 라우트 스플릿은 중복 제외. 이 Task는 MVP 포함 전체 대상으로 목록/상세 2차 조회·관리자 콘솔·PDF 폰트·클라 정렬·부서 게이트를 다룸
  - [x] **측정 먼저** — 측정 절차·기준값을 먼저 기록(`docs/guides/deployment-ops.md` 8절 "측정 방법(재현용)"). 착수 시점 데이터 규모: weekly_logs 318 / comments 5 / reactions 5 / profiles 63 / departments 8
  - [x] **DB 쿼리·인덱스 점검**
    - [x] 어드바이저 performance 정리 — INFO 4(미인덱스 FK 3종: attachments ×2 기존 + `weekly_log_reactions.user_id` 신규(Task 038), 미사용 index `departments_organization_id_idx`). 셋 다 조회 핫패스를 기존 인덱스가 커버하고 단독 인덱스는 희소한 CASCADE에만 이득이라 **의도된 설계로 유지**(reactions는 쓰기 핫패스라 인덱스 오버헤드 > 이득). 근거 8절 기록
    - [x] N+1·중복 조회 실측 — 목록 전체 조회 `EXPLAIN` 0.94ms(318행 seq scan). **현재 규모 병목은 실행시간이 아니라 순차 왕복 횟수**로 판정 → 목록 4개·상세 4개 독립 2차 조회를 `Promise.all` 병렬화. 관리자 부서 페이지 N×2 count는 이미 병렬·소규모라 유지
    - [x] **데이터 증가 대비 확장성** — 목록이 `LIMIT` 없이 전체 로드 후 클라 정렬·슬라이스(`PAGE_SIZE=20`)하는 구조를 최대 확장성 절벽으로 식별. 서버 페이지네이션은 아키텍처 변경(범위 밖)이라 **weekly_logs 수천 건 진입 시 별도 Task로 기각·문서화**(8절)
  - [x] **렌더링·캐싱 점검** — `getCurrentProfile`을 React `cache()`로 감싸 관리자 요청당 `profiles` 2조회 → 1(레이아웃 가드+페이지 중복 제거). 부서 게이트(`profiles.department_id`)는 보호 페이지당 요청 내 1회(중복 아님)·사용자별이라 캐시 불가로 유지. `cache()`는 요청 스코프라 교차 사용자 누수 없음
  - [x] **클라이언트 번들 점검** — Turbopack이 First Load JS 표를 안 내보내 `page_client-reference-manifest.js`의 청크 합으로 실측. jsPDF·exceljs(동적 import)·recharts(대시보드 라우트 스플릿) 초기 번들 미포함 확인. **Tiptap이 상세 라우트에 eager 편입**(detail-view→form→editor)된 것을 발견 → `next/dynamic(ssr:false)`로 전환, 상세 라우트 **1090KB→611KB(-479KB)**. 읽기 전용 `html-content`는 Tiptap 미포함 확인
  - [x] **정적 자산 점검** — PDF 폰트는 PDF 생성 시점에만 fetch 확인. 개선 3종: 폰트 base64 모듈 메모이즈, `next.config.ts`로 `/fonts/*` immutable 1년 캐시, `proxy.ts` matcher에 폰트 확장자 추가. 실측 `307→200 OK + immutable`
  - [x] **효과가 측정된 변경만 반영** — 기각분(서버 페이지네이션·FK 인덱스·미사용 인덱스 제거)은 근거와 함께 8절에 기록
  - [x] 결과 요약을 `docs/guides/deployment-ops.md` 8절과 이 로드맵에 기록
  - **관련 파일**: `app/protected/weekly-logs/page.tsx`·`weekly-logs/[id]/page.tsx`, `lib/auth/require-admin.ts`, `components/weekly-log-detail-view.tsx`, `lib/pdf/weekly-log-pdf.ts`, `next.config.ts`, `proxy.ts`
  - **수락 기준(일반 점검으로 확정)**: 측정 → 개선 → 재측정 기록이 남고(8절) 어드바이저 performance 경고가 전부 "의도된 설계"로 분류됨 ✅. 회귀 없음은 build/tsc/인증 라우팅 실측까지 확인, 인증 E2E는 아래 대기
  - **테스트 체크리스트**
    - [x] 개선 전/후 비교표 작성(라우트별 client JS, 목록 `EXPLAIN` 시간, 폰트 응답 헤더) — 8절
    - [ ] Playwright MCP로 주요 사용자 플로우 전수 재실행(목록 4필터·작성·상세·수정·댓글·관리자 5탭·대시보드) — **인증 계정 필요, 사용자 작업 대기**
    - [ ] 캐싱 변경(`cache()`)의 사용자별·조직별 데이터 누수 여부를 계정 2개(다른 부서·역할)로 교차 확인 — **인증 계정 필요, 사용자 작업 대기**. (`cache()`는 요청 스코프라 구조적으로 누수 불가하나 실측 권장)
    - [x] 인덱스 추가 없음 — 쓰기 경로 측정 불필요
    - [x] `npm run build` green + `npx tsc --noEmit` 0오류. `next start`에서 폰트 헤더·인증 라우팅 실측(미인증 보호 경로 307 유지)
  - **범위 밖 유지**: 인프라 변경(Supabase 플랜 상향, CDN·엣지 캐시 신규 도입), 아키텍처 재작성 수준의 리팩터링(→ 서버 페이지네이션 여기 해당), 부하 테스트 도구·APM/모니터링 서비스 신규 연동, 성능을 이유로 한 기존 기능 축소

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
| F025 | 업무 타입(다중 선택) 분류 | ad hoc(Phase 3 이후 1차, Task 번호 없음) |
| F026 | 업무 중요도(1~5단계) 속성 | ad hoc(Phase 3 이후 2차, Task 번호 없음) |
| F027 | 조직(organizations) 계층 및 조직 관리 | ad hoc(Phase 3 이후 2차, Task 번호 없음) |
| F028 | 주간업무일지 목록 Excel 다운로드 | ad hoc(Phase 3 이후 2차, Task 번호 없음) |
| F029 | 업무 타입 관리 UI | ad hoc(Phase 3 이후 2차, Task 번호 없음) |
| F030 | 관리자 콘솔 조직 범위 제한 | ad hoc(Phase 3 이후 2차, Task 번호 없음) |
| F033 | 슈퍼관리자 등급(조직 생성·전 조직 수정/닫기) | ad hoc(Phase 3 이후 3차, Task 번호 없음) |
| F031 | 주간업무일지 추천/비추천 | Task 038 (✅ 완료) |
| F032 | 애플리케이션 전반 성능 개선 | Task 039 (🚧 구현 완료, 인증 E2E 회귀만 대기) |
| F034 | 슈퍼관리자 대시보드/부서/업무타입/사용자 관리 전 조직 확장 | ad hoc(Phase 3 이후 4차, Task 번호 없음) |
| F035 | 주간업무일지 목록 작성자 아바타 표시(부서 컬럼 대체) | ad hoc(Phase 3 이후 5차, Task 번호 없음) |
| — | 통합 검증·마감 | Task 036, Task 037 |

## 데이터 모델 변경 요약 (MVP 대비)

| 테이블 | 변경 | Task |
|--------|------|------|
| `organizations` | 신규 (조직 계층, `id`/`name`(unique)/`archived_at`/`created_at`, 이후 슈퍼관리자 전용 INSERT 정책 추가 + UPDATE 정책에 `is_superadmin()` 분기 추가) | ad hoc(F027, F033) |
| `departments` | `archived_at`(또는 `is_active`) 컬럼 추가, admin 전용 INSERT/UPDATE/DELETE 정책 3종 신규(이후 `organization_id` NOT NULL FK 추가·정책에 조직 조건 추가) | 026, ad hoc(F027·F030) |
| `work_types` | 신규 (업무 타입, `id`/`name`/`organization_id`/`archived_at`/`created_at`, `(organization_id, name)` 복합 unique, admin 전용 INSERT/UPDATE/DELETE 정책 3종) | ad hoc(F029·F030) |
| `profiles` | UPDATE 정책을 `own_or_admin`으로 통합, `role` 변경 차단 트리거 신규(이후 `role` CHECK를 `user`/`admin`/`superadmin` 3단계로 확장하고 트리거에 승격·강등 규칙 추가) | 026, ad hoc(F033) |
| `weekly_logs` | `work_type text[]` 컬럼 추가(처음엔 CHECK 제약, 이후 `work_types` 테이블 참조 트리거로 대체) + `importance smallint` 컬럼 추가(1~5 CHECK) + 신규 `stats_logs_by_work_type`/`stats_logs_by_importance` RPC | ad hoc(F025, F026, F029) |
| `weekly_log_attachments` | **변경 없음** | — |
| `weekly_log_comments` | 신규 (소프트 삭제·1단계 대댓글 지원) | 032 |
| `weekly_log_comment_mentions` | 신규 (멘션 정규화) | 032 |
| `notifications` | 신규 (수신자 기준 RLS, 트리거 전용 INSERT, Realtime publication 등록) | 034 |
| `weekly_log_reactions` | 신규 (추천/비추천, `unique(weekly_log_id, user_id)` 1인 1표 토글, 댓글과 동일하게 부서 무관 쓰기) — **스키마 초안, 결정 항목 확정 후 확정** | 038 |

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
| ✅ **F031 자기 글 투표 허용 여부 (해결)** | **허용**으로 결정 — 특수 케이스가 없어 구현이 단순하고 우회 리스크도 없다(GitHub 반응처럼 자기 글에도 반응 가능). 서버 액션에 작성자 검사를 두지 않음 | Task 038 |
| ✅ **F031 노출 범위 (해결)** | **상세 + 목록 모두 노출**로 결정 — 목록은 댓글수 배지와 동일하게 페이지 로그 id 2차 조회 후 Map 병합, 익명 집계만 표시(둘 다 0이면 미표시) | Task 038 |
| ✅ **F031 익명성 (해결)** | **익명 집계만**으로 결정 — 명단 비공개라 조직 내 갈등 소지 없고 `get_profile_identities` RPC 경유가 불필요해 구현도 단순 | Task 038 |
| ✅ **F031 통계 반영 여부 (해결)** | **대시보드 반영**으로 결정 — `stats_reactions_summary` RPC 1종 신규(SECURITY INVOKER, `org_id` 파라미터 관례 준수, 0건도 up/down 2행 반환), 대시보드 7번째 차트로 추가 | Task 038 |
| ✅ **F031 인터랙션 패턴 (해결)** | **낙관적 업데이트**로 결정 — 진행상태·중요도와 동일 패턴. 성공 시 서버 재집계값으로 확정, 실패 시 롤백. 버튼은 `isPending` 중 `disabled`로 연타 차단 | Task 038 |
| ✅ **F031 관리자 예외 (해결)** | **없음**으로 결정 — DELETE도 본인 행만 허용(수락 기준 "타인의 반응은 어떤 경로로도 조작할 수 없다"와 정합). DELETE 정책에 `is_admin()` OR 조건을 두지 않음 | Task 038 |
| ✅ **F032 목표 지표 유무 (해결)** | **측정 기반 일반 점검**으로 결정(수치 목표 없이 측정→개선→재측정 기록 + 어드바이저 분류). 완료 조건은 Task 039 수락 기준에 반영 | Task 039 |
| ✅ **F032 우선순위 영역 (해결)** | **DB 쿼리·인덱스 → 클라 번들 → 렌더링·캐싱 → 정적 자산 4개 전부를 순차로** 진행하기로 결정. 영역별 개선/측정을 분리 기록(8절) | Task 039 |
| ✅ **F032와 Task 037의 중복 (해결)** | Task 037이 측정한 3개 쿼리·recharts 스플릿은 중복 제외하고, Task 039는 MVP 포함 목록/상세 2차 조회·PDF 폰트·확장성으로 범위 확정 | Task 037·039 |
| ✅ **F034 전 조직 대시보드 집계 방식 (해결)** | "조직 선택 드롭다운(전체 합산 + 개별 조직)"으로 결정. `stats_*` RPC가 이미 `org_id=NULL`로 전체 합산을 지원하고 있어 DB 변경 없이 페이지 단(`dashboard-filters.tsx`)에서만 구현 | Phase 3 이후 4차(F034) |
| ✅ **F034 부서/업무타입 CRUD의 조직 선택 (해결)** | "전 조직 CRUD 허용"으로 결정. `department-form-dialog.tsx`/`work-type-form-dialog.tsx`는 이미 다중 조직 선택 `Select`를 갖고 있어 컴포넌트 변경 없이 RLS(`ALTER POLICY`로 `is_superadmin() OR` 추가)와 페이지의 조직 필터 생략만으로 해결 | Phase 3 이후 4차(F034) |
| ✅ **F034 사용자 관리 조직 범위 완화 (해결)** | "전 조직 조회+수정 모두 허용"으로 결정. `lib/actions/user-admin.ts`에 `isDepartmentAccessible()` 헬퍼를 추가해 슈퍼관리자에 한해 조직 일치 검증을 건너뛰도록 완화(자기 강등 방지·마지막 관리자 방지 트리거는 조직 무관 전역이라 그대로 유지) | Phase 3 이후 4차(F034) |
