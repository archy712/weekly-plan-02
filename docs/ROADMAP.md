# 부서별 주간업무일지 관리 개발 로드맵

부서원은 주간 업무를 기록·추적하고, 관리자는 전체 부서의 업무 현황을 한 곳에서 파악하는 웹 애플리케이션.

## 개요

부서별 주간업무일지 관리는 여러 부서로 구성된 조직의 실무자와 관리자를 위한 주간 업무 기록·추적 서비스로 다음 기능을 제공합니다:

- **주간업무일지 CRUD**: 시작일/목표종료일/제목/본문으로 주간 업무를 기록하고 수정·삭제 (F001~F005)
- **완료 상태 추적**: 업무의 완료/미완료 상태를 전환하며 진행 여부를 관리 (F006)
- **부서 기반 접근 제어**: 일반 사용자는 자기 부서, 관리자는 부서 필터로 전체 부서를 조회 (F007, F012)
- **PDF 리포팅**: 현재 조회 중인 부서의 리스트를 표 형태 PDF로 다운로드 (F008)

## 현재 코드베이스 상태 (착수 전 실측)

이 로드맵은 스타터킷을 실제로 조사한 결과를 반영합니다. 아래 항목은 **계획 수립의 전제**이므로 착수 전 반드시 확인하세요.

### 이미 구현되어 재사용 가능한 것

| 항목 | 위치 | 비고 |
|------|------|------|
| 이메일 회원가입/로그인/로그아웃 (F010) | `app/auth/*`, `components/login-form.tsx`, `components/sign-up-form.tsx` | ✅ Task 006에서 한국어화 완료. 로그인 후 `/protected`로 이동은 유지(F012 게이트는 Task 010에서 확장 예정) |
| 비밀번호 재설정 흐름 | `app/auth/forgot-password`, `app/auth/update-password`, `app/auth/confirm/route.ts` | PRD 범위 외 → **변경하지 않고 유지** |
| 다크모드 토글 (F013) | `components/theme-switcher.tsx`, `app/layout.tsx`의 `ThemeProvider` | ✅ Task 002에서 `components/site-header.tsx`로 이동 완료 |
| Supabase 클라이언트 3종 | `lib/supabase/{client,server,proxy}.ts` | CLAUDE.md 관례대로 컨텍스트별 구분 사용 |
| 인증 라우팅 가드 | `proxy.ts` + `lib/supabase/proxy.ts` | 세션 유무만 검사. 부서 게이트(F012)는 미구현 |
| 부서 선택 온보딩 폼 (F012 마크업) | `components/profile-form.tsx`, `app/protected/profile/page.tsx` | ✅ Task 006에서 재작성 완료. 실제 `departments` 테이블 조회, department_id 저장까지 동작(프록시 게이트 강제는 Task 010) |
| shadcn/ui 프리미티브 | `components/ui/` | badge, button, card, checkbox, dropdown-menu, input, label, **select(Task 006 추가)** 8종 |

### 반드시 해소해야 하는 갭 (Phase 1에서 처리)

- ~~`.env.local` 파일이 존재하지 않음~~ → ✅ **해소됨 (2026-08-03)**. 프로젝트 루트에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 설정 완료(`hasEnvVars` 정상화). 잘못 위치했던 `docs/.env.local`은 삭제.
- ~~Supabase MCP 연결이 타임아웃 상태~~ → ✅ **해소됨 (2026-08-03)**. `get_project_url`, `get_publishable_keys`, `list_tables`, `get_advisors` 모두 정상 응답 확인 (프로젝트 ref: `ybhluyzkmpjmrxyhkolt`, URL: `https://ybhluyzkmpjmrxyhkolt.supabase.co`). 보안 어드바이저 경고 0건.
- **`profiles` 테이블이 실제로는 존재하지 않음 — `database.types.ts`는 스타터킷 예시 타입이며 이 프로젝트에서 생성된 것이 아님**: MCP로 확인한 결과 `public` 스키마의 테이블이 **0개**(`list_tables` → `[]`). 기존 로드맵이 전제했던 "`profiles`에 `id, email, username, full_name, avatar_url, created_at, updated_at` 컬럼이 이미 있다"는 가정은 **틀렸음** — 파일 내용과 원격 DB 상태가 불일치. → Task 008은 `profiles` **ALTER가 아니라 CREATE**부터 시작해야 하며, `username/full_name/avatar_url` 유지 여부 결정도 무의미해짐(백지 상태이므로 PRD 요구 컬럼만 설계).
- **`departments`, `weekly_logs` 테이블도 당연히 없음** (위와 동일한 이유, Task 008에서 신규 생성).
- **폼 라이브러리 미설치**: `react-hook-form`, `@hookform/resolvers`, `zod` 모두 `package.json`에 없음 (`docs/guides/forms-react-hook-form.md`도 "현재 프로젝트에는 미설치 상태"라고 명시).
- **PDF 라이브러리 미설치**: `jspdf`, `jspdf-autotable` 없음.
- **구글 OAuth용 콜백 라우트가 없음**: 스타터킷에는 이메일 OTP용 `app/auth/confirm/route.ts`만 존재. OAuth code exchange를 처리할 `app/auth/callback/route.ts`는 신규 작성 필요.
- **`app/page.tsx`가 스타터킷 튜토리얼 화면**: `Hero`, `ConnectSupabaseSteps`, `SignUpUserSteps`, `DeployButton` 등으로 구성되어 있어 랜딩(F015)으로 전면 교체 필요.
- **`components/profile-form.tsx`가 아바타/사용자명 편집 폼**: PRD의 부서 선택 온보딩(F012)과 전혀 다름 → 재작성 대상.

### 계획 수립 시 지켜야 할 아키텍처 제약 (CLAUDE.md 준수)

1. **DB 마이그레이션 → `database.types.ts` 재생성 → 기능 구현** 순서를 반드시 지킬 것. 타입이 없는 상태로 `Tables<"weekly_logs">`를 쓸 수 없음.
2. **RLS 정책은 테이블 생성 마이그레이션과 같은 Task에서 함께 처리**. 테이블만 만들고 RLS를 뒤로 미루면 그 사이 구현한 쿼리가 전부 무방비 상태가 됨.
3. **Supabase 클라이언트 3종 혼용 금지**: Client Component는 `lib/supabase/client.ts`, Server Component/Route Handler는 `await createClient()` (`lib/supabase/server.ts`, 전역 변수 저장 금지), proxy는 `lib/supabase/proxy.ts`.
4. **세션 확인은 `getUser()`가 아니라 `getClaims()`** 사용. `data?.claims`에 사용자 정보.
5. **`lib/supabase/proxy.ts`의 쿠키 처리 로직은 변경 금지**. 부서 게이트를 추가할 때도 `createServerClient` 직후 `getClaims()` 호출 사이에 코드를 끼워넣지 말고, 리디렉션 분기만 확장할 것.
6. **`next.config.ts`에 `cacheComponents: true`** 활성화 상태. 사용자별/부서별 데이터는 캐시 대상이 아니므로 `"use cache"`를 붙이지 말고 Suspense 경계로 처리할 것.
7. **`middleware.ts`가 아니라 `proxy.ts`** (Next.js 16 명칭 변경).
8. **request-time API는 전부 비동기**: `cookies()`, `headers()`, `params`, `searchParams` 모두 `await` 필요.
9. **색상 토큰 추가 시** `app/globals.css`의 `:root`/`.dark`와 `tailwind.config.ts`의 `theme.extend.colors`를 **함께** 수정 (v3 방식 HSL 하이브리드 구성 유지).

## 개발 워크플로우

1. **작업 계획**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - 새로운 작업을 포함하도록 `ROADMAP.md` 업데이트
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

---

## 개발 단계

### Phase 1: 기반 정비 및 애플리케이션 골격 구축 ✅

> 목표: 앱이 폴백 모드에서 벗어나 정상 부팅되고, 7개 페이지의 라우트 골격과 도메인 타입이 확정된 상태.

- **Task 001: 개발 환경 및 의존성 셋업** ✅ (2026-08-03)
  - [x] `.env.local` 생성 후 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 설정 완료
  - [x] Supabase 프로젝트 연결 상태 확인 완료 — MCP로 `get_project_url`/`list_tables`/`get_advisors` 정상 응답 확인 (테이블은 이후 Task 008에서 생성됨)
  - [x] 폼 의존성 설치: `react-hook-form`, `@hookform/resolvers`, `zod`
  - [x] PDF 의존성 설치: `jspdf`, `jspdf-autotable`
  - [x] shadcn/ui 컴포넌트 추가 완료: `textarea`, `form`, `table`, `alert-dialog`, `dialog`, `sonner`, `skeleton`, `separator`, `sheet` (`select`는 Task 006에서 선행 설치) — 총 17종
  - [x] `npm run dev` 정상 부팅, `npx tsc --noEmit` 무오류, `npm run lint` 통과 확인
  - **참고**: `form`/`alert-dialog` 설치 과정에서 shadcn CLI가 `button.tsx`/`label.tsx`를 최신 패턴(개별 `@radix-ui/react-*` → 통합 `radix-ui` 패키지, forwardRef → 함수 컴포넌트+`data-slot`)으로 함께 업데이트함. 기존 두 파일은 커스터마이징되지 않은 shadcn 기본 산출물이었고 `ButtonProps` 등 제거된 타입을 참조하는 코드가 없음을 grep으로 확인 후 반영. `npm audit`의 high severity 3건은 Next.js 자체 번들 postcss/sharp에서 기인한 기존 이슈로 이번 설치와 무관 (수정하려면 Next 16→9.3.3 다운그레이드가 필요해 그대로 둠)
  - **수락 기준 충족**: 로컬에서 로그인 페이지가 정상 렌더링되고, 경고 배너(`EnvVarWarning`)가 노출되지 않음을 Playwright로 확인

- **Task 002: 스타터킷 정리 및 라우트 구조 스캐폴딩** ✅ (2026-08-03)
  - [x] 튜토리얼/데모 자산 제거: `components/tutorial/`, `components/hero.tsx`, `components/deploy-button.tsx`, `components/next-logo.tsx`, `components/supabase-logo.tsx` (제거 전 grep으로 다른 참조 없음 확인)
  - [x] 라우트 확정 및 빈 페이지 생성 — `app/protected/weekly-logs/page.tsx`(목록), `app/protected/weekly-logs/new/page.tsx`(작성), `app/protected/weekly-logs/[id]/page.tsx`(상세). 각 페이지에 `getClaims()` 이중 방어 패턴 적용 (CLAUDE.md 관례)
  - [x] `app/protected/page.tsx`를 튜토리얼 화면에서 `/protected/weekly-logs` 리디렉션으로 교체
  - [x] 공통 헤더를 `components/site-header.tsx`로 추출하고 `app/page.tsx`·`app/protected/layout.tsx`에서 공유. 로드맵이 nav와 함께 지적한 **footer 중복**도 `components/site-footer.tsx`로 함께 추출해 완전히 해소 (계획 대비 소폭 확장)
  - [x] 다크모드 토글(F013)을 푸터에서 공통 헤더로 이동
  - [x] `app/layout.tsx`의 `lang="en"` → `lang="ko"`, `metadata` 한국어 서비스 정보로 교체
  - **부수 변경**: 헤더에 포함되는 `components/auth-button.tsx`, `components/logout-button.tsx`도 한국어화 (새로 추출한 공통 헤더가 전 페이지에 노출되므로 언어 일관성을 위해 포함). `app/page.tsx`는 이번엔 헤더/푸터만 공유하는 최소 placeholder(`<h1>` 한 줄)로 대체 — 실제 랜딩 콘텐츠는 Task 005 범위
  - **범위 밖 유지**: `app/auth/*` 페이지들은 헤더 없는 기존 중앙 정렬 레이아웃 그대로 유지 (로드맵이 중복으로 지목한 곳은 `app/page.tsx`·`app/protected/layout.tsx` 두 곳뿐이었고, `forgot-password`/`update-password`/`confirm` 등 PRD 범위 외 인증 흐름을 건드리지 않기 위함)
  - **검증**: `npx tsc --noEmit`/`npm run lint` 무오류. curl로 7개 라우트(`/`, `/auth/login`, `/auth/sign-up`, `/protected/profile`, `/protected/weekly-logs`, `/protected/weekly-logs/new`, `/protected/weekly-logs/[id]`) 전부 200 확인. Playwright로 헤더·다크모드 토글·푸터가 랜딩/보호된 페이지에서 동일하게 노출되고 콘솔 에러 0건임을 확인

- **Task 003: 도메인 타입 및 Zod 스키마 정의** ✅ (2026-08-03)
  - [x] `lib/types/index.ts` 도메인 타입 작성 — `Department`, `Profile`(department_id·role 포함), `WeeklyLog`, `UserRole = "user" | "admin"`
  - [x] `lib/schemas/weekly-log.ts` — 제목(100자)/본문(5000자) 길이 제한, `z.string().date()` 날짜 형식 검증, `start_date <= target_end_date` 교차 검증(`.refine`)
  - [x] `lib/schemas/profile.ts` — 부서 선택 필수(uuid) 검증
  - [x] 목록 필터·PDF 행 타입 정의 (`WeeklyLogListItem`, `DepartmentFilter`)
  - [x] `lib/format.ts` — 날짜 포맷(`YYYY-MM-DD`), 완료 상태 라벨 유틸
  - **계획 대비 편차**: 원래 주석은 "이 단계 타입은 임시 수기 정의이며 Task 008 완료 후 `Tables<"weekly_logs">` 기반으로 교체"를 전제했으나, Task 003 착수 시점에 Task 008이 이미 완료되어 실제 스키마가 존재했으므로 **처음부터 `database.types.ts`의 `Tables<"...">`를 재사용**해 작성 — 이중 작업 회피 (`Profile`은 `role: string`을 `UserRole`로 좁혀 재정의)
  - **검증**: `npx tsc --noEmit` / `npm run lint` 무오류 확인. `tsx`로 zod 스키마 스모크 테스트 — 정상 입력 통과, `start_date > target_end_date` 거부(`target_end_date` 필드에 에러), 잘못된 날짜 포맷 거부, uuid 아닌 `department_id` 거부 모두 확인

---

### Phase 2: UI/UX 완성 (더미 데이터 활용)

> 목표: DB 없이도 전체 화면과 사용자 플로우를 클릭으로 체험 가능한 상태. 이 Phase의 모든 작업은 Phase 3(DB)과 병렬 진행 가능.

- **Task 004: 공통 컴포넌트 및 더미 데이터 구축** ✅ (2026-08-03)
  - [x] `lib/dummy-data.ts` — 부서 5개(개발/디자인/마케팅/인사/영업팀, Task 008 seed명과 통일), 주간업무일지 16건(완료 7·미완료 9, 부서별 3~4건 분산)
  - [x] `components/site-header.tsx` 완성 — `components/header-nav.tsx`(신규, 서버 컴포넌트)에서 `getClaims()` + `profiles.role` 조회로 비로그인/일반/관리자 상태 판별, 데스크탑은 인라인 메뉴·모바일은 `components/mobile-nav.tsx`(신규, `ui/sheet` 기반 햄버거)로 분기
  - [x] `components/weekly-log-table.tsx`(데스크탑, `hidden md:block`) / `components/weekly-log-card.tsx`(모바일, `WeeklyLogCard`+`WeeklyLogCardList`, `md:hidden`) 뷰 분기 — 관리자용 부서 컬럼은 `showDepartment` prop으로 토글
  - [x] `components/status-badge.tsx` — 완료/진행중 배지 (`ui/badge`에 `success` variant 추가 후 사용, 다크모드 대비 Playwright로 확인)
  - [x] `components/empty-state.tsx`, `components/weekly-log-list-skeleton.tsx` / `components/weekly-log-detail-skeleton.tsx`
  - [x] `success`/`success-foreground` 색상 토큰을 `app/globals.css`(`:root`/`.dark`)와 `tailwind.config.ts`에 함께 추가 (완료 배지 전용, 기존 팔레트에 없던 녹색 계열)
  - **계획 대비 편차**: 로드맵에 명시되지 않았던 `components/auth-button.tsx`를 `header-nav.tsx`로 흡수·삭제 — 관리자 메뉴 분기를 위해 `profiles.role` 조회가 새로 필요해졌고, 기존 `AuthButton`은 역할(role) 정보 없이 이메일/로그아웃만 처리했으므로 로직을 새 컴포넌트로 통합하는 편이 중복 쿼리를 피할 수 있어 이렇게 결정 (참조하는 곳이 `site-header.tsx` 한 곳뿐임을 grep으로 확인 후 진행)
  - **검증**: `npx tsc --noEmit` / `npm run lint` 무오류. Playwright로 데스크탑(로그인/회원가입 링크)·모바일(390px, 햄버거→Sheet 오픈, 로그인/회원가입 버튼 노출) 렌더링과 콘솔 에러 0건 확인. `status-badge`의 `success`/`secondary` variant를 라이트·다크 양쪽에 임시 렌더링해 대비 확인
  - **범위 밖 유지**: 이번 Task는 컴포넌트 자체만 구축 — 실제 `/protected/weekly-logs` 3개 페이지에 더미 데이터를 연결해 렌더링하는 작업은 Task 007에서 진행

- **Task 005: 랜딩 페이지 UI 구현 (F015)** ✅ (2026-08-03)
  - [x] `app/page.tsx` 전면 교체 — 서비스 가치 제안 히어로 섹션(제목/설명/[로그인]·[회원가입] CTA), Task 002의 최소 placeholder(`<h1>` 한 줄)를 대체
  - [x] 주요 기능 소개 카드 4종: 주간업무일지 작성/조회(`FileText`), 부서별 관리(`Building2`), 완료 상태 추적(`CheckCircle2`), PDF 다운로드(`Download`) — `ui/card` + `lucide-react` 아이콘
  - [x] [로그인] / [회원가입] CTA 버튼 배치 및 라우팅 연결 (히어로 섹션에 별도 배치, 헤더의 CTA와 별개로 동작)
  - [x] 반응형 그리드 — 모바일 1열(`grid-cols-1`) → 태블릿 2열(`sm:grid-cols-2`) → 데스크탑 4열(`lg:grid-cols-4`)
  - **검증**: `npx tsc --noEmit`/`npm run lint` 무오류. Playwright로 1280px(데스크탑 4열)·768px(태블릿 2열)·390px(모바일 1열, 헤더 햄버거) 3개 뷰포트와 라이트/다크 테마(실제 `ThemeSwitcher` 토글) 렌더링, 히어로·헤더 CTA 클릭 시 `/auth/login`·`/auth/sign-up` 라우팅을 확인. 콘솔 에러 0건
  - **수락 기준 충족**: 비로그인 방문자가 랜딩에서 로그인·회원가입 페이지로 이동 가능

- **Task 006: 인증 및 프로필 온보딩 UI 구현 (F010·F011·F012 마크업)** ✅ (2026-08-03)
  - [x] `components/login-form.tsx` 한국어화 + [구글로 계속하기] 버튼 UI 추가 (동작 연결은 Task 009로 TODO 주석 남김)
  - [x] `components/sign-up-form.tsx` 한국어화, 가입 후 이메일 인증 안내 문구 정비 (`app/auth/sign-up-success/page.tsx`도 함께 한국어화)
  - [x] `components/profile-form.tsx` **재작성** — 아바타/사용자명 편집 폼을 폐기하고 부서 선택 드롭다운(`ui/select`, 신규 설치) + 이메일 표시(disabled)로 교체
  - [x] 부서 미설정 상태일 때 "부서를 선택해야 서비스 이용이 가능합니다" 온보딩 안내 문구 분기 표시
  - [x] ~~더미 부서 목록으로~~ **실제 `departments` 테이블 조회**로 셀렉트 렌더링, [저장] 버튼 로딩/에러/성공 상태 UI — Task 008이 먼저 완료되어 실제 부서 테이블(RLS: 인증 사용자 전체 SELECT)이 이미 존재하므로, 더미 데이터를 만들었다가 Task 010에서 다시 실 데이터로 교체하는 이중 작업을 피하기 위해 `app/protected/profile/page.tsx`에서 서버 컴포넌트로 직접 조회하도록 변경 (계획 대비 의도적 편차)
  - **검증**: `npx tsc --noEmit` / `npm run lint` 무오류 확인. Playwright로 `/auth/login`, `/auth/sign-up` 렌더링 및 콘솔 에러 0건 확인. `/protected/profile`의 부서 선택 동작은 실제 인증 계정이 필요해 미검증 — Task 009(구글 로그인) 이후 실 계정으로 재확인 필요

- **Task 007: 주간업무일지 3개 페이지 UI 구현 (더미 데이터)** ✅ (2026-08-03)
  - [x] 목록 페이지(`app/protected/weekly-logs/page.tsx`) — `components/weekly-log-list-view.tsx`(신규, 클라이언트)에서 `WeeklyLogTable`/`WeeklyLogCardList`로 데스크탑·모바일 전환
  - [x] 목록 페이지 — `?admin=1` 쿼리 파라미터로 관리자 뷰 진입(더미 role 분기, Task011에서 실제 `profiles.role`/`searchParams` 기반 권한 로직으로 교체 예정), 부서 필터 `ui/select`로 클라이언트 필터링, [신규 작성] 링크·[PDF 다운로드](비활성 placeholder, Task013 대상) 버튼 배치
  - [x] 작성 페이지(`app/protected/weekly-logs/new/page.tsx`) — `components/weekly-log-form.tsx`(신규, 작성/수정 겸용) + `components/weekly-log-new-form.tsx`(신규 작성 전용 래퍼)로 폼 레이아웃 구현, [저장]/[취소] 모두 목록으로 이동(실 저장은 Task012)
  - [x] 상세 페이지(`app/protected/weekly-logs/[id]/page.tsx`) — `components/weekly-log-detail-view.tsx`(신규)에서 조회/수정 모드 전환(동일 `WeeklyLogForm` 재사용), `ui/checkbox` 기반 완료 토글(배지 즉시 반영), id가 더미 데이터에 없으면 `notFound()`
  - [x] 삭제 확인 `alert-dialog` — 상세 페이지에 확인 다이얼로그 연결, 확인 시 목록으로 이동(실 삭제는 Task012)
  - **계획 대비 편차 (버그 수정)**: 목록 페이지에서 `searchParams`를 Suspense 경계 밖에서 직접 `await`하자 `cacheComponents: true` 하에서 "Uncached data ... accessed outside of `<Suspense>`" 런타임 에러 발생 확인(Playwright 콘솔에서 실측). `app/protected/profile/page.tsx`의 기존 패턴(외부는 동기 컴포넌트, 내부 비동기 `*Content` 컴포넌트를 `Suspense`로 감싸는 구조)을 3개 페이지 전부에 동일하게 적용해 해소 — CLAUDE.md 규칙 #6과 Task011에 이미 명시된 주의사항이 실제로 이번 Task에서 선제적으로 나타난 사례. 목록/상세 페이지는 Task004에서 만든 `WeeklyLogListSkeleton`/`WeeklyLogDetailSkeleton`을 `Suspense` fallback으로 재사용
  - **검증**: `npx tsc --noEmit`/`npm run lint` 무오류. 실제 회원가입(자동 이메일 확인 활성 확인)으로 임시 QA 계정을 만들어 Playwright로 로그인 → 목록(데스크탑 테이블 16건/모바일 카드 전환) → `?admin=1` 부서 필터(디자인팀 필터링 결과 3건 확인) → 신규 작성(입력 후 저장 → 목록 복귀) → 상세(완료 토글 즉시 반영 → 수정 모드 기존값 프리필 → 취소 → 삭제 확인 다이얼로그 → 삭제 후 목록 복귀) 전 구간 콘솔 에러 0건으로 확인 후 QA 계정은 삭제하여 정리
  - **범위 밖 유지**: 실제 DB 연동(Task011)·React Hook Form+Zod 연결과 실 저장/삭제(Task012)·PDF 생성(Task013)은 이번 Task에서 다루지 않음

---

### Phase 3: 데이터베이스 및 핵심 기능 구현

> 목표: 더미 데이터를 실제 Supabase 데이터로 교체하고 부서 기반 권한이 DB 레벨에서 강제되는 상태.
> **선행 조건**: ✅ Task 001의 Supabase 연결 확인 완료(2026-08-03). 단 원격 DB에 테이블이 전혀 없는 백지 상태이므로 Task 008은 스키마 신규 설계로 진행.

- **Task 008: DB 스키마 마이그레이션 및 RLS 정책 구축** ✅ (2026-08-03, 테스트 체크리스트 제외)
  - [x] `departments` 테이블 생성(`id uuid pk`, `name text not null unique`, `created_at`) + 초기 부서 5종 seed 삽입 (개발팀/디자인팀/마케팅팀/인사팀/영업팀)
  - [x] `profiles` 테이블 **신규 생성** — `id uuid pk references auth.users(id)`, `email text`, `department_id uuid null references departments(id)`, `role text not null default 'user' check (role in ('user','admin'))`, `created_at`, `updated_at` (레거시 `username/full_name/avatar_url`은 실제 DB에 없던 스텁이었으므로 미포함)
  - [x] `weekly_logs` 테이블 생성 — `department_id`, `author_id → profiles(id)`, `title`, `content`, `start_date`, `target_end_date`, `is_completed default false`, `created_at`, `updated_at`, `start_date <= target_end_date` CHECK 제약 추가
  - [x] `updated_at` 자동 갱신 트리거(`set_updated_at()`) 작성, `profiles`/`weekly_logs`에 적용
  - [x] `auth.users` → `profiles` 자동 생성 트리거(`handle_new_user`) 신규 생성 — 구글 OAuth 가입자 포함 모든 신규 유저에 적용
  - [x] RLS 활성화 및 정책 작성 완료:
    - `departments`: 인증 사용자 전체 SELECT
    - `profiles`: 본인 행 SELECT/UPDATE, 관리자는 전체 SELECT (단일 통합 정책)
    - `weekly_logs`: 일반 사용자는 `department_id = 본인 부서`에 한해 SELECT/INSERT/UPDATE/DELETE, 관리자는 전체 (각 액션당 단일 통합 정책)
  - [x] **정책 재귀 방지** — `current_department_id()`, `is_admin()` `SECURITY DEFINER` 헬퍼 함수로 감쌈
  - [x] `mcp__supabase__generate_typescript_types`로 `lib/supabase/database.types.ts` **재생성** 완료
  - [ ] Task 003의 임시 수기 타입을 `Tables<"...">` 기반으로 교체 — **Task 003이 아직 미착수라 해당 없음**. Task 003 진행 시 처리
  - [x] `mcp__supabase__get_advisors`로 보안/성능 경고 확인 및 해소 — 아래 "적용한 하드닝" 참고
  - **적용한 하드닝 (어드바이저 대응)**
    - RLS 정책의 `auth.uid()` 호출을 `(select auth.uid())`로 감싸 initplan 재평가 방지
    - `profiles`/`weekly_logs`의 select·insert·update·delete 각각 own+admin 2개 정책 → 1개로 통합 (multiple_permissive_policies 해소)
    - `profiles.department_id`, `weekly_logs.author_id`에 커버링 인덱스 추가 (unindexed_foreign_keys 해소)
    - Supabase가 신규 함수에 기본 부여하는 `anon`/`authenticated` EXECUTE 권한 중 트리거 전용 함수(`set_updated_at`, `handle_new_user`)는 전체 회수, RLS 헬퍼 함수(`is_admin`, `current_department_id`)는 `anon`만 회수하고 `authenticated`는 정책 평가에 필요해 유지
    - **잔존 경고 2건은 의도된 설계**: `authenticated`가 `is_admin()`/`current_department_id()`를 RPC로 직접 호출 가능하다는 WARN — 두 함수 모두 부작용 없이 호출자 자신의 정보만 반환하므로 위험 없음
  - **⚠️ 알려진 후속 이슈**: `components/profile-form.tsx`, `app/protected/profile/page.tsx`가 삭제된 컬럼(`username`/`full_name`/`avatar_url`)을 참조해 `npx tsc --noEmit` 실패 중. 로드맵상 Task 006(프로필 폼 재작성)에서 해결 예정이므로 Task 008 범위에서는 수정하지 않음.
  - **테스트 체크리스트** (실제 로그인 계정이 필요해 Task 009/010 이후 Playwright로 검증)
    - [ ] 부서 A 사용자 계정으로 부서 B의 `weekly_logs` 조회 시 0건 반환 확인
    - [ ] 부서 A 사용자가 부서 B의 레코드 UPDATE/DELETE 시도 시 실패 확인
    - [ ] `role='admin'` 계정으로 전체 부서 데이터 조회 성공 확인
    - [ ] 신규 회원가입(이메일/구글) 직후 `profiles` 행이 자동 생성되는지 확인

- **Task 009: 구글 OAuth 로그인 구현 (F011)**
  - [ ] Supabase 대시보드에서 Google provider 활성화 및 Client ID/Secret 등록
  - [ ] Google Cloud Console 승인된 리디렉션 URI 등록 (로컬 + Supabase 콜백)
  - [ ] `app/auth/callback/route.ts` **신규 작성** — `exchangeCodeForSession`으로 OAuth code 처리 (기존 `auth/confirm/route.ts`는 이메일 OTP 전용이므로 재사용 불가)
  - [ ] `components/login-form.tsx`에 `supabase.auth.signInWithOAuth({ provider: "google" })` 연결 (Client Component 패턴 유지)
  - [ ] 로그인 성공 후 리디렉션 대상을 `/protected`에서 **부서 설정 여부 분기**로 변경 (미설정 → `/protected/profile`, 설정됨 → `/protected/weekly-logs`)
  - [ ] `lib/supabase/proxy.ts`의 공개 경로 허용 목록에 `/auth/callback`이 포함되는지 확인
  - **테스트 체크리스트**
    - [ ] Playwright MCP로 [구글로 계속하기] 클릭 → OAuth 리디렉션 발생 확인
    - [ ] 콜백 처리 후 세션 쿠키가 설정되고 보호 페이지 접근이 가능한지 확인
    - [ ] OAuth 취소/거부 시 에러 페이지로 안전하게 폴백하는지 확인
    - [ ] 기존 이메일/비밀번호 로그인이 회귀 없이 동작하는지 확인

- **Task 010: 부서 선택 온보딩 게이트 구현 (F012)**
  - [ ] `lib/supabase/proxy.ts`의 `updateSession()` 확장 — 세션은 있으나 부서가 없으면 `/protected/profile`로 리디렉션. **쿠키 처리 로직과 `createServerClient`→`getClaims()` 사이 구간은 절대 수정 금지**, 리디렉션 분기만 추가
  - [ ] 부서 정보 조회 방식 결정 및 문서화 — `getClaims()`의 JWT에는 `department_id`가 없음. (A) proxy에서 `profiles` 1회 조회, (B) Custom Access Token Hook으로 커스텀 클레임 주입 중 택일. 매 요청 DB 조회 비용과 부서 변경 즉시 반영 요구를 비교해 결정
  - [ ] 리디렉션 루프 방지 — `/protected/profile` 자신과 `/auth/*`, `/`는 게이트 대상에서 제외
  - [ ] `components/profile-form.tsx`에 실제 `departments` 조회 및 `profiles.department_id` 저장 연결
  - [ ] 저장 성공 시 `/protected/weekly-logs`로 이동, 기존 부서 변경 시에는 동일 페이지 유지
  - [ ] 각 보호 페이지 서버 컴포넌트에서 `getClaims()` + 부서 재확인 이중 방어 패턴 적용
  - **테스트 체크리스트**
    - [ ] 부서 미설정 계정으로 `/protected/weekly-logs` 직접 접근 시 프로필로 리디렉션되는지 확인
    - [ ] 리디렉션 무한 루프가 발생하지 않는지 확인 (프로필 페이지 자체 접근 정상)
    - [ ] 부서 저장 직후 목록 페이지 접근이 즉시 허용되는지 확인
    - [ ] 부서 설정 완료 계정이 불필요하게 프로필로 튕기지 않는지 확인

- **Task 011: 주간업무일지 목록·상세 조회 구현 (F001, F002, F007)**
  - [ ] 목록 페이지 Server Component에서 `await createClient()`로 `weekly_logs` 조회, 더미 데이터 제거
  - [ ] **`cacheComponents: true` 주의** — 사용자/부서별 데이터에 `"use cache"`를 적용하지 말고 Suspense 경계 + 스트리밍으로 처리
  - [ ] 관리자 부서 필터를 `searchParams` 기반으로 구현 (`await searchParams` — Next.js 16 비동기 API)
  - [ ] `role !== 'admin'`이면 부서 필터 UI 미노출 + 서버에서도 파라미터 무시(UI 은닉만으로 방어 금지)
  - [ ] 상세 페이지에서 `await params`로 id 추출 후 단건 조회, 미존재/권한 없음은 `notFound()` 처리
  - [ ] 목록 정렬 기준 확정(시작일 또는 생성일 내림차순) 및 빈 목록 EmptyState 연결
  - **테스트 체크리스트**
    - [ ] 일반 사용자 로그인 시 자기 부서 항목만 목록에 표시되는지 확인
    - [ ] 관리자 부서 필터 변경 시 해당 부서 데이터로 갱신되는지 확인
    - [ ] 일반 사용자가 URL로 `?department=` 파라미터를 조작해도 타 부서가 노출되지 않는지 확인
    - [ ] 타 부서 상세 id로 직접 접근 시 404 처리되는지 확인
    - [ ] 데이터 0건일 때 EmptyState가 표시되는지 확인

- **Task 012: 주간업무일지 작성·수정·삭제·완료 처리 구현 (F003~F006)**
  - [ ] 작성 폼에 React Hook Form + Zod resolver 연결 (`lib/schemas/weekly-log.ts` 재사용)
  - [ ] `department_id`는 폼 입력이 아니라 **작성자 프로필 기준으로 서버에서 자동 지정**, `author_id`는 세션 사용자로 고정
  - [ ] 수정 저장 — 상세 페이지 수정 모드에서 UPDATE 후 동일 페이지 갱신
  - [ ] 완료/미완료 토글 — `is_completed` 전환 및 즉시 상태 반영
  - [ ] 삭제 — `alert-dialog` 확인 절차 후 DELETE, 성공 시 목록으로 복귀
  - [ ] 변경 후 캐시 무효화 처리(`router.refresh()` 또는 `revalidatePath`)로 목록 최신화
  - [ ] 서버 오류/검증 실패 시 사용자에게 한국어 메시지 노출 (`sonner` 토스트)
  - **테스트 체크리스트**
    - [ ] Playwright MCP로 작성 → 목록 복귀 → 신규 항목 노출까지 전체 흐름 확인
    - [ ] `start_date > target_end_date` 입력 시 저장이 차단되고 검증 메시지가 표시되는지 확인
    - [ ] 필수값 누락, 초과 길이 입력 등 유효성 검사 동작 확인
    - [ ] 완료 토글 후 목록의 상태 배지가 함께 변경되는지 확인
    - [ ] 삭제 확인 다이얼로그에서 취소 시 삭제되지 않는지 확인
    - [ ] 타 부서 항목에 대한 수정/삭제 요청이 RLS에서 거부되는지 확인

- **Task 013: 부서별 리스트 PDF 다운로드 구현 (F008)**
  - [ ] `jsPDF` + `jspdf-autotable`로 현재 조회 중인 목록을 표 형태 PDF로 생성 (클라이언트 사이드)
  - [ ] **한글 폰트 임베딩 필수** — jsPDF 기본 폰트는 한글을 렌더링하지 못해 글자가 깨짐. Noto Sans KR 등 TTF를 base64로 등록(`addFileToVFS` + `addFont`)해야 함. 폰트 파일 용량이 번들에 미치는 영향을 고려해 동적 import 검토
  - [ ] PDF 헤더에 부서명·출력일시 표기, 컬럼 구성은 제목/시작일/목표종료일/완료상태
  - [ ] 파일명 규칙 정의 (예: `주간업무일지_{부서명}_{YYYYMMDD}.pdf`)
  - [ ] 관리자 부서 필터가 적용된 현재 목록 기준으로 출력되는지 보장, 0건일 때 처리 방침 확정
  - **테스트 체크리스트**
    - [ ] Playwright MCP로 [PDF 다운로드] 클릭 시 파일 다운로드가 트리거되는지 확인
    - [ ] 다운로드 후에도 목록 페이지가 유지되는지 확인
    - [ ] 한글 제목·부서명이 깨지지 않고 렌더링되는지 확인
    - [ ] 관리자가 부서 필터를 변경한 뒤 받은 PDF의 내용이 해당 부서와 일치하는지 확인
    - [ ] 데이터 0건일 때 오류 없이 처리되는지 확인

- **Task 014: 핵심 기능 통합 E2E 테스트**
  - [ ] Playwright MCP로 전체 사용자 여정 검증: 랜딩 → 회원가입 → 로그인 → 부서 온보딩 → 목록 → 작성 → 상세(수정/완료/삭제) → PDF
  - [ ] 일반 사용자 / 관리자 2개 역할 시나리오 각각 수행
  - [ ] 권한 격리 시나리오: 타 부서 데이터 조회·수정·삭제 차단, 부서 필터 파라미터 조작 방어
  - [ ] 세션 만료·로그아웃 후 보호 페이지 접근 차단 확인
  - [ ] 네트워크 오류, 존재하지 않는 id, 중복 제출 등 엣지 케이스 처리 확인
  - [ ] 콘솔 에러 및 하이드레이션 경고 0건 확인

---

### Phase 4: 마감 및 배포

- **Task 015: 반응형 및 접근성 마감 (F014)**
  - [ ] 데스크탑/태블릿/모바일 3개 뷰포트에서 7개 페이지 전수 점검 (Playwright MCP `browser_resize`)
  - [ ] 라이트/다크 양쪽 테마에서 대비(contrast) 및 배지 가독성 확인
  - [ ] 폼 라벨-입력 연결, 키보드 내비게이션, 포커스 링, 다이얼로그 포커스 트랩 확인
  - [ ] 모바일 헤더 메뉴 및 테이블→카드 전환 동작 확인

- **Task 016: 에러·로딩 처리 및 성능 최적화**
  - [ ] 라우트별 `loading.tsx` / `error.tsx` / `not-found.tsx` 배치
  - [ ] Suspense 경계 정리 및 `cacheComponents` 동작 하에서 스트리밍 확인
  - [ ] 조회 쿼리 인덱스 검토 (`weekly_logs.department_id`, `start_date`)
  - [ ] `npm run build` 성공, 번들 크기 점검(특히 PDF 폰트), `npx tsc --noEmit` 및 `npm run lint` 무오류

- **Task 017: 배포 및 운영 준비**
  - [ ] Vercel 프로젝트 환경변수 등록 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
  - [ ] 프로덕션 도메인 기준 Supabase Auth Redirect URL 및 Google OAuth 승인 URI 추가
  - [ ] `mcp__supabase__get_advisors` 최종 보안 점검 (RLS 누락 테이블 0건 확인)
  - [ ] 관리자 계정 지정 절차 문서화 (`profiles.role`을 Supabase에서 수동으로 `admin` 변경 — 관리자 지정 UI는 MVP 범위 외)
  - [ ] 부서 seed 데이터 운영 반영 절차 문서화 (부서 관리 UI는 MVP 범위 외)
  - [ ] 프로덕션 스모크 테스트 (로그인, 작성, PDF 다운로드)

---

## 기능 ID 커버리지 매핑

| 기능 ID | 기능명 | 담당 Task |
|---------|--------|-----------|
| F001 | 주간업무일지 목록 조회 | Task 007(UI), Task 011 |
| F002 | 주간업무일지 상세 조회 | Task 007(UI), Task 011 |
| F003 | 주간업무일지 신규 작성 | Task 007(UI), Task 012 |
| F004 | 주간업무일지 수정 | Task 007(UI), Task 012 |
| F005 | 주간업무일지 삭제 | Task 007(UI), Task 012 |
| F006 | 완료 처리 | Task 007(UI), Task 012 |
| F007 | 관리자 전체 부서 조회 | Task 008(RLS), Task 011 |
| F008 | 부서별 리스트 PDF 다운로드 | Task 013 |
| F010 | 기본 인증 | 기존 구현 + Task 006(한국어화) |
| F011 | 구글 소셜 로그인 | Task 006(UI), Task 009 |
| F012 | 부서 선택 온보딩 | Task 006(UI), Task 008(스키마), Task 010 |
| F013 | 다크모드 토글 | 기존 구현 + Task 002(헤더 이동) |
| F014 | 반응형 레이아웃 | Task 004~007, Task 015 |
| F015 | 랜딩 기능 소개 카드 | Task 005 |

## 주요 리스크 및 결정 필요 사항

| 항목 | 내용 | 결정 시점 |
|------|------|-----------|
| ~~Supabase 연결~~ | ✅ 해소됨(2026-08-03). MCP 정상 연결 확인, 단 원격 DB 테이블 0개 → Task 008 스키마 신규 설계 필요 | 해소됨 |
| ~~`database.types.ts`와 원격 DB 불일치~~ | ✅ 해소됨(2026-08-03). Task 008에서 `departments`/`profiles`/`weekly_logs` 신규 생성 후 타입 재생성 완료 | 해소됨 |
| ~~RLS 정책 재귀~~ | ✅ 해소됨(2026-08-03). `is_admin()`/`current_department_id()` `SECURITY DEFINER` 헬퍼 함수로 우회 적용 완료 | 해소됨 |
| ~~`profile-form.tsx` 타입 에러~~ | ✅ 해소됨(2026-08-03). Task 006에서 부서 선택 폼으로 재작성, `tsc --noEmit`/`lint` 무오류 확인 | 해소됨 |
| 부서 정보 조회 방식 | proxy에서 매 요청 DB 조회 vs Custom Access Token Hook 커스텀 클레임 | Task 010 |
| PDF 한글 폰트 | TTF base64 임베딩 필요, 번들 용량 증가 → 동적 로딩 여부 | Task 013 |
| `cacheComponents` | 사용자별 데이터에 `"use cache"` 적용 금지, Suspense 경계로 처리 | Task 011 |
