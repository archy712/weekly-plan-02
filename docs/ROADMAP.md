# 부서별 주간업무일지 관리 개발 로드맵

부서원은 주간 업무를 기록·추적하고, 관리자는 전체 부서의 업무 현황을 한 곳에서 파악하는 웹 애플리케이션.

## 개요

부서별 주간업무일지 관리는 여러 부서로 구성된 조직의 실무자와 관리자를 위한 주간 업무 기록·추적 서비스로 다음 기능을 제공합니다:

- **주간업무일지 CRUD**: 시작일/목표종료일/제목/본문으로 주간 업무를 기록하고 수정·삭제 (F001~F005)
- **진행상태 추적**: 업무를 예정/진행중/완료 3단계로 전환하며 진행 상황을 관리 (F006)
- **부서 기반 접근 제어**: 조회(SELECT)는 전 부서 공개, 쓰기(작성/수정/삭제/진행상태변경)는 자기 부서 또는 관리자로 제한 (F007, F012)
- **PDF 리포팅**: 현재 조회 중인 부서의 리스트를 표 형태 PDF로 다운로드 (F008)
- **검색·페이지네이션**: 제목/내용 키워드 검색과 20건 단위 페이지네이션으로 목록 탐색 (F016)

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
  - **버그 수정 (2026-08-03, Task 009 구글 로그인 실사용 테스트 중 발견)**: `app/protected/layout.tsx`의 컨텐츠 wrapper(`max-w-5xl p-5`)에 `w-full`이 빠져 있어, 폭이 좁은 콘텐츠(예: 프로필 폼)에서는 컨테이너 자체가 내용물 크기로 줄어들어(shrink-to-fit) 헤더보다 눈에 띄게 좁고 여백이 비대칭으로 보이는 문제 확인(모바일에서 특히 두드러짐). `w-full` 추가로 헤더와 동일하게 항상 `max-w-5xl`까지 폭을 채우도록 수정. Playwright로 모바일(390px)·데스크탑(1280px) 양쪽에서 헤더와 동일한 폭으로 정렬됨을 확인

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
  - **후속 수정 (2026-08-03, Task 009 구글 로그인 실사용 테스트 중 발견)**: 로그인된 상태로 랜딩(`/`)에 재방문하면 헤더는 로그인 상태를 반영하면서도 히어로 섹션엔 여전히 [로그인]/[회원가입] 버튼이 남아있어 어색하다는 피드백 확인. `components/hero-cta.tsx`(신규, 서버 컴포넌트)를 추가해 `getClaims()`로 로그인 여부를 확인 후 로그인 상태면 **[주간업무일지 보러가기]**(`/protected`로 이동, 부서 설정 여부에 따라 자동 분기) 버튼 하나로, 비로그인 상태면 기존 [로그인]/[회원가입] 두 버튼을 보여주도록 분기. `cacheComponents` 규칙에 따라 `Suspense`(버튼 크기의 `Skeleton` fallback)로 감쌈. Playwright로 로그인/비로그인 양쪽 상태와 다크모드에서 정상 분기 확인, 콘솔 에러 0건

- **Task 006: 인증 및 프로필 온보딩 UI 구현 (F010·F011·F012 마크업)** ✅ (2026-08-03)
  - [x] `components/login-form.tsx` 한국어화 + [구글로 계속하기] 버튼 UI 추가 (동작 연결은 Task 009로 TODO 주석 남김)
  - [x] `components/sign-up-form.tsx` 한국어화, 가입 후 이메일 인증 안내 문구 정비 (`app/auth/sign-up-success/page.tsx`도 함께 한국어화)
  - [x] `components/profile-form.tsx` **재작성** — 아바타/사용자명 편집 폼을 폐기하고 부서 선택 드롭다운(`ui/select`, 신규 설치) + 이메일 표시(disabled)로 교체
  - [x] 부서 미설정 상태일 때 "부서를 선택해야 서비스 이용이 가능합니다" 온보딩 안내 문구 분기 표시
  - [x] ~~더미 부서 목록으로~~ **실제 `departments` 테이블 조회**로 셀렉트 렌더링, [저장] 버튼 로딩/에러/성공 상태 UI — Task 008이 먼저 완료되어 실제 부서 테이블(RLS: 인증 사용자 전체 SELECT)이 이미 존재하므로, 더미 데이터를 만들었다가 Task 010에서 다시 실 데이터로 교체하는 이중 작업을 피하기 위해 `app/protected/profile/page.tsx`에서 서버 컴포넌트로 직접 조회하도록 변경 (계획 대비 의도적 편차)
  - **검증**: `npx tsc --noEmit` / `npm run lint` 무오류 확인. Playwright로 `/auth/login`, `/auth/sign-up` 렌더링 및 콘솔 에러 0건 확인. ~~`/protected/profile`의 부서 선택 동작은 실제 인증 계정이 필요해 미검증~~ → ✅ **해소됨(2026-08-03)**: Task 009 이후 여러 임시 QA 계정으로 부서 선택·저장 동작을 반복 재확인 완료(아래 후속 개선 항목들 참고)
  - **후속 개선 (2026-08-03, 사용자 피드백)**: 부서 저장 시 사용자가 다음 행동을 알기 어렵다는 피드백에 따라 `sonner` 토스트("OO팀으로 설정/변경되었습니다")를 보여준 뒤(900ms) `/protected/weekly-logs`로 자동 이동하도록 통일(기존엔 최초 설정만 즉시 이동, 변경은 같은 화면에 텍스트만 표시했음 — **최초 설정/기존 변경 모두 이제 자동 이동으로 동일하게 동작**). `components/ui/sonner.tsx`의 `Toaster`를 `app/layout.tsx`에 전역 마운트(이번에 처음 사용됨 — Task 012에서 계획했던 sonner 토스트 인프라가 선반영됨)

- **Task 007: 주간업무일지 3개 페이지 UI 구현 (더미 데이터)** ✅ (2026-08-03)
  - [x] 목록 페이지(`app/protected/weekly-logs/page.tsx`) — `components/weekly-log-list-view.tsx`(신규, 클라이언트)에서 `WeeklyLogTable`/`WeeklyLogCardList`로 데스크탑·모바일 전환
  - [x] 목록 페이지 — `?admin=1` 쿼리 파라미터로 관리자 뷰 진입(더미 role 분기, Task011에서 실제 `profiles.role`/`searchParams` 기반 권한 로직으로 교체 예정), 부서 필터 `ui/select`로 클라이언트 필터링, [신규 작성] 링크·[PDF 다운로드](비활성 placeholder, Task013 대상) 버튼 배치
  - [x] 작성 페이지(`app/protected/weekly-logs/new/page.tsx`) — `components/weekly-log-form.tsx`(신규, 작성/수정 겸용) + `components/weekly-log-new-form.tsx`(신규 작성 전용 래퍼)로 폼 레이아웃 구현, [저장]/[취소] 모두 목록으로 이동(실 저장은 Task012)
  - [x] 상세 페이지(`app/protected/weekly-logs/[id]/page.tsx`) — `components/weekly-log-detail-view.tsx`(신규)에서 조회/수정 모드 전환(동일 `WeeklyLogForm` 재사용), `ui/checkbox` 기반 완료 토글(배지 즉시 반영), id가 더미 데이터에 없으면 `notFound()`
  - [x] 삭제 확인 `alert-dialog` — 상세 페이지에 확인 다이얼로그 연결, 확인 시 목록으로 이동(실 삭제는 Task012)
  - **계획 대비 편차 (버그 수정)**: 목록 페이지에서 `searchParams`를 Suspense 경계 밖에서 직접 `await`하자 `cacheComponents: true` 하에서 "Uncached data ... accessed outside of `<Suspense>`" 런타임 에러 발생 확인(Playwright 콘솔에서 실측). `app/protected/profile/page.tsx`의 기존 패턴(외부는 동기 컴포넌트, 내부 비동기 `*Content` 컴포넌트를 `Suspense`로 감싸는 구조)을 3개 페이지 전부에 동일하게 적용해 해소 — CLAUDE.md 규칙 #6과 Task011에 이미 명시된 주의사항이 실제로 이번 Task에서 선제적으로 나타난 사례. 목록/상세 페이지는 Task004에서 만든 `WeeklyLogListSkeleton`/`WeeklyLogDetailSkeleton`을 `Suspense` fallback으로 재사용
  - **검증**: `npx tsc --noEmit`/`npm run lint` 무오류. 실제 회원가입(자동 이메일 확인 활성 확인)으로 임시 QA 계정을 만들어 Playwright로 로그인 → 목록(데스크탑 테이블 16건/모바일 카드 전환) → `?admin=1` 부서 필터(디자인팀 필터링 결과 3건 확인) → 신규 작성(입력 후 저장 → 목록 복귀) → 상세(완료 토글 즉시 반영 → 수정 모드 기존값 프리필 → 취소 → 삭제 확인 다이얼로그 → 삭제 후 목록 복귀) 전 구간 콘솔 에러 0건으로 확인 후 QA 계정은 삭제하여 정리
  - **범위 밖 유지**: 실제 DB 연동(Task011)·React Hook Form+Zod 연결과 실 저장/삭제(Task012)·PDF 생성(Task013)은 이번 Task에서 다루지 않음
  - **후속 개선 (2026-08-03, 사용자 피드백 3건)**:
    1. 완료 항목 가독성 — `weekly-log-table.tsx`/`weekly-log-card.tsx` 제목에 완료 시 `italic line-through text-muted-foreground` 조건부 클래스 추가(이탤릭+취소선+회색)
    2. 상세 페이지 이탈 동선 — `weekly-log-detail-view.tsx` 조회/수정 모드 상단에 `ArrowLeft` 아이콘 포함 "목록으로" 링크(`/protected/weekly-logs`) 추가
    3. 목록 화면 소속 표시 — 어느 부서 목록인지 알 수 없다는 피드백에 따라 `weekly-log-list-view.tsx`에 스코프 라벨 추가. 일반 사용자는 `app/protected/weekly-logs/page.tsx`에서 `profiles.department_id`+`departments(name)` **실제 DB 조인 조회**로 본인 소속 부서명을 표시(더미 부서 목록과 ID 체계가 달라 실제 조회가 필요했음), 관리자는 부서 필터 선택값과 연동해 "전체" 또는 선택한 부서명을 동일 라벨에 표시. Playwright로 일반 사용자(디자인팀)·관리자 기본값("전체")·관리자 필터 변경(영업팀) 3가지 모두 라벨·필터·표 데이터 일치 확인, 콘솔 에러 0건
    4. 완료 토글이 목록에 반영 안 됨 — 상세에서 완료 처리해도 더미 데이터가 서버 모듈 상수라 목록으로 돌아가면 원래 상태로 보이던 문제. `lib/dummy-log-overrides.ts`(신규) 추가해 완료 토글을 브라우저 `localStorage`에 임시 저장하고, 상세 페이지는 토글 시 `sonner` 토스트("완료/미완료 처리되었습니다")를 띄우도록 `weekly-log-detail-view.tsx` 수정, 목록은 `weekly-log-list-view.tsx`에서 저장된 오버라이드를 반영해 렌더링(실 DB 저장은 Task012 대상, 그 전까지의 임시 계층). **버그 수정**: 최초 구현 시 `useEffect`에서 `setState`를 호출해 `react-hooks/set-state-in-effect` lint 에러 발생 → `useSyncExternalStore`로 교체하는 과정에서, 오버라이드 값 자체가 아니라 "버전 카운터"만 그 훅으로 감싸고 실제 localStorage 읽기는 별도 `useMemo`에 둔 1차 수정이 하이드레이션 첫 렌더에서 곧바로 실제 저장값을 읽어버려 서버 렌더 결과와 달라지는 hydration mismatch를 Playwright 콘솔에서 실측 — `getServerSnapshot`이 오버라이드 없는 값을 반환하도록 조회 로직 자체를 `useSyncExternalStore`의 스냅샷 함수 안으로 옮겨 완전히 해소. 완료 토글 → 토스트 → 목록 복귀 시 반영 → 상세 재방문 시에도 유지, 하드 리로드 시 하이드레이션 에러 없음까지 확인 후 테스트용 오버라이드는 정리

---

### Phase 3: 데이터베이스 및 핵심 기능 구현 ✅

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

- **Task 009: 구글 OAuth 로그인 구현 (F011)** ✅ (2026-08-03)
  - [x] Supabase 대시보드에서 Google provider 활성화 및 Client ID/Secret 등록 — 사용자가 직접 완료. Playwright로 재검증: [구글로 계속하기] 클릭 시 실제 Google 로그인 화면(`accounts.google.com`)까지 정상 도달
  - [x] Google Cloud Console 승인된 리디렉션 URI 등록 (로컬 + Supabase 콜백) — 사용자가 직접 완료. 재검증한 Google 로그인 화면에서 `client_id`·`redirect_uri=https://ybhluyzkmpjmrxyhkolt.supabase.co/auth/v1/callback`·`scope=email+profile`이 올바르게 설정되어 있음을 확인
  - [x] `app/auth/callback/route.ts` **신규 작성** — `exchangeCodeForSession`으로 OAuth code 처리, `code` 없음/실패 시 `error_description`을 담아 `/auth/error`로 폴백
  - [x] `components/login-form.tsx`에 `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: ".../auth/callback" } })` 연결, 별도 `isGoogleLoading` 상태로 버튼 로딩 처리
  - [x] 로그인 성공 후 리디렉션 대상을 `/protected`에서 **부서 설정 여부 분기**로 변경 — `app/protected/page.tsx`를 `profiles.department_id` 조회 후 미설정 시 `/protected/profile`, 설정됨 시 `/protected/weekly-logs`로 분기하는 단일 허브로 재작성(이메일 로그인·구글 로그인·직접 `/protected` 접근 모두 동일 로직 재사용)
  - [x] `lib/supabase/proxy.ts`의 공개 경로 허용 목록 확인 — 기존 `startsWith("/auth")` 조건에 `/auth/callback`이 이미 포함되어 있어 코드 변경 불필요
  - **계획 대비 편차 (버그 수정)**: `app/protected/page.tsx`에 DB 조회를 추가하며 테스트하던 중, 이메일 로그인 성공 후 `router.push("/protected")`(클라이언트 라우터 캐시 사용)가 **이전 방문 시점의 리다이렉트 결과를 재사용**해 부서를 새로 저장한 뒤에도 다시 `/protected/profile`로 튕기는 문제를 Playwright로 실측(동일 URL을 하드 네비게이션으로 재방문하면 정상 동작하는 것으로 원인 특정). `components/login-form.tsx`의 로그인 성공 처리를 `window.location.href = "/protected"` 하드 네비게이션으로 변경해 해소 — 구글 로그인은 콜백 라우트가 `NextResponse.redirect`(항상 하드 네비게이션)를 쓰므로 원래 이 문제에서 자유로웠음
  - **테스트 체크리스트**
    - [x] Playwright MCP로 [구글로 계속하기] 클릭 → OAuth 리디렉션 발생 확인 — Provider 활성화 전에는 `400 Unsupported provider`로 코드 경로만 확인했고, 사용자가 Google Cloud Console·Supabase 설정을 완료한 후 재검증하여 실제 Google 로그인 화면까지 정상 도달함을 확인
    - [ ] 콜백 처리 후 세션 쿠키가 설정되고 보호 페이지 접근이 가능한지 확인 — **부분 검증**. Claude Code는 실제 Google 계정 자격 증명이 없어 동의 화면 이후 단계(로그인 완료 → `exchangeCodeForSession` → 세션 쿠키)는 직접 실행할 수 없음. 콜백 라우트 코드는 Supabase 공식 패턴을 그대로 따르고, PKCE `code_challenge`·`redirect_uri`가 정확히 전달되는 것까지 확인했으므로 사용자가 실제 계정으로 한 번 로그인해 최종 확인 필요
    - [x] OAuth 취소/거부 시 에러 페이지로 안전하게 폴백하는지 확인 — `code` 파라미터 없이 `/auth/callback` 직접 접근 시 `/auth/error?error=...`로 정상 폴백(콘솔 에러 0건)
    - [x] 기존 이메일/비밀번호 로그인이 회귀 없이 동작하는지 확인 — 임시 QA 계정으로 회원가입(자동 이메일 확인 활성)·로그인·부서 미설정→`/protected/profile` 분기·부서 저장 후 재로그인→`/protected/weekly-logs` 분기·로그아웃·비로그인 접근 차단까지 전 구간 확인 후 QA 계정 삭제
  - **남은 확인 사항 (사용자)**: 실제 Google 계정으로 [구글로 계속하기] → 로그인까지 완료해 보호 페이지 진입과 세션 유지가 정상인지 최종 확인 권장(코드 경로상 문제될 부분은 없으나 실사용자 계정 기준 검증은 못함)

- **Task 010: 부서 선택 온보딩 게이트 구현 (F012)** ✅ (2026-08-03)
  - [x] `lib/supabase/proxy.ts`의 `updateSession()` 확장 — 세션은 있으나 부서가 없으면 `/protected/profile`로 리디렉션. `createServerClient`→`getClaims()` 사이 구간은 수정하지 않고, `getClaims()` 이후에 리디렉션 분기만 추가
  - [x] 부서 정보 조회 방식 결정: **(A) proxy에서 `profiles` 매 요청 조회**로 확정. 부서 변경이 다음 요청에 즉시 반영되어야 하고(온보딩 직후 접근 허용 요구), Custom Access Token Hook(B) 대비 추가 대시보드 설정이 없어 단순함. `profiles` 테이블은 이미 `id`(PK)로 인덱싱되어 있어 요청당 조회 비용 우려는 낮다고 판단
  - [x] 리디렉션 루프 방지 — 게이트 조건을 `pathname.startsWith("/protected") && pathname !== "/protected/profile"`로 한정해 `/protected/profile` 자신은 제외(기존 미인증 리디렉션 분기가 이미 `/`, `/auth/*`는 별도 처리 중이므로 그대로 유지)
  - [x] `components/profile-form.tsx`에 실제 `departments` 조회 및 `profiles.department_id` 저장 연결 — Task 006에서 이미 완료(`app/protected/profile/page.tsx`에서 서버 조회)
  - [x] 저장 성공 시 `/protected/weekly-logs`로 이동 — Task 009/006에서 이미 완료(토스트 후 900ms 자동 이동)
  - [x] 각 보호 페이지 서버 컴포넌트에서 `getClaims()` + 부서 재확인 이중 방어 패턴 적용 — `app/protected/weekly-logs/page.tsx`, `new/page.tsx`, `[id]/page.tsx` 3곳에 `profiles.department_id` 조회 후 미설정 시 `redirect("/protected/profile")` 추가(`app/protected/page.tsx`는 Task 009에서 이미 동일 패턴으로 구현되어 있어 변경 없음)
  - **검증**: `npx tsc --noEmit`/`npm run lint` 무오류. 실제 회원가입으로 임시 QA 계정을 만들어 Playwright로 부서 미설정 상태에서 `/protected/weekly-logs`·`/protected/weekly-logs/new` 직접 접근 시 `/protected/profile`로 리디렉션되는 것을 확인, `/protected/profile` 자체 재방문 시 루프 없이 정상 렌더링됨을 확인. 부서(디자인팀) 선택·저장 직후 `/protected/weekly-logs`로 자동 이동해 목록이 즉시 노출됨을 확인. 이후 `/protected/weekly-logs/new`·상세(`/protected/weekly-logs/[id]`)·`/protected`(허브) 재방문 시 부서가 설정된 계정이 프로필로 튕기지 않고 각 페이지가 정상 렌더링됨을 확인. 전 구간 콘솔 에러 0건. 테스트 후 QA 계정은 `auth.users` DELETE로 정리(FK로 `profiles` 행도 함께 제거됨)
  - **테스트 체크리스트**
    - [x] 부서 미설정 계정으로 `/protected/weekly-logs` 직접 접근 시 프로필로 리디렉션되는지 확인
    - [x] 리디렉션 무한 루프가 발생하지 않는지 확인 (프로필 페이지 자체 접근 정상)
    - [x] 부서 저장 직후 목록 페이지 접근이 즉시 허용되는지 확인
    - [x] 부서 설정 완료 계정이 불필요하게 프로필로 튕기지 않는지 확인

- **Task 011: 주간업무일지 목록·상세 조회 구현 (F001, F002, F007)** ✅ (2026-08-03)
  - [x] 목록 페이지 Server Component에서 `await createClient()`로 `weekly_logs` 조회, 더미 데이터 제거 — `lib/dummy-data.ts`는 참조하는 곳이 완전히 사라져 파일 자체를 삭제
  - [x] **`cacheComponents: true` 주의** — 목록/상세 모두 기존 Suspense 경계(`WeeklyLogListSkeleton`/`WeeklyLogDetailSkeleton` fallback) 구조를 그대로 유지한 채 내부 쿼리만 실 DB 호출로 교체, `"use cache"`는 사용하지 않음
  - [x] 관리자 부서 필터를 `searchParams` 기반으로 구현 — 기존 `?admin=1` 더미 플래그를 제거하고 실제 `profiles.role`로 관리자 여부 판별, `?department=<uuid>` 파라미터로 필터. `components/weekly-log-list-view.tsx`의 부서 `Select`도 클라이언트 `useState` 필터에서 `router.push`로 URL을 갱신하는 방식으로 전환(서버 컴포넌트가 재실행되어 Suspense fallback과 함께 다시 조회)
  - [x] `role !== 'admin'`이면 부서 필터 UI 미노출 + 서버에서도 파라미터 무시 — `WeeklyLogsContent`에서 `isAdmin`이 아니면 `searchParams.department` 값을 아예 읽지 않고 항상 `ALL_DEPARTMENTS_FILTER`로 처리(UI 은닉만으로 방어하지 않음, RLS로도 이중 방어됨)
  - [x] 상세 페이지에서 `await params`로 id 추출 후 단건 조회, 미존재/권한 없음은 `notFound()` 처리 — RLS가 타 부서 행을 이미 걸러내므로 `maybeSingle()`이 null을 반환하는 두 경우(미존재/권한없음) 모두 동일하게 404로 귀결
  - [x] 목록 정렬 기준 확정 — `start_date` 내림차순, 동일 시작일은 `created_at` 내림차순(tie-breaker)으로 확정
  - [x] 빈 목록 EmptyState 연결 — 기존 `EmptyState` 컴포넌트/문구 그대로 유지, 실 데이터 0건 조건에서 정상 동작 확인
  - **계획 대비 편차**: `lib/types/index.ts`에 상세 조회 전용 `WeeklyLogDetail` 타입 신규 추가(더미 `DummyWeeklyLog`의 `author_name`을 대체) — 실제 `profiles` 테이블에는 이름 컬럼이 없고 `email`만 있어, 상세 화면의 작성자 표시를 이메일 기준으로 변경(`components/weekly-log-detail-view.tsx`). 완료 토글의 `localStorage` 오버라이드 레이어(`lib/dummy-log-overrides.ts`, Task007에서 도입)는 `{id, is_completed}` 형태에만 의존하는 범용 코드라 실 데이터에도 그대로 호환되므로 변경 없이 유지(Task012에서 실 저장 연결 시 제거 예정 — 안내 주석만 dummy-data.ts 삭제에 맞춰 갱신)
  - **검증**: `npx tsc --noEmit`/`npm run lint` 무오류. 실제 회원가입으로 일반 사용자(디자인팀)·관리자(개발팀, SQL로 `role='admin'` 수동 승격) 2개 QA 계정을 만들고, `weekly_logs`에 디자인팀 3건·마케팅팀 2건을 SQL로 직접 시딩해 Playwright로 검증: 일반 사용자는 자기 부서(디자인팀) 3건만 시작일 내림차순으로 확인, `?department=<마케팅팀id>` URL 조작 시도해도 부서 필터 UI 자체가 없고 여전히 디자인팀 3건만 노출됨을 확인, 상세 조회(제목·부서·작성자 이메일·기간·본문) 정상 표시 확인, 마케팅팀 항목 id로 직접 접근 시 404 확인. 관리자는 부서 필터 드롭다운이 노출되고 기본값 "전체"에서 5건 전체가 정렬되어 보임을 확인, 필터를 디자인팀으로 변경 시 URL이 `?department=<id>`로 갱신되며 3건만 남는 것을 확인, 관리자가 타 부서(마케팅팀) 상세로 직접 진입해도 정상 조회됨을 확인(관리자 RLS 정책). 데이터 0건 상태(QA 계정 부서 설정 직후, 시딩 전)에서 EmptyState 노출도 별도로 확인. 전 구간 콘솔 에러 0건. 테스트 후 시딩한 `weekly_logs` 5건과 QA 계정 2개는 SQL로 정리
  - **테스트 체크리스트**
    - [x] 일반 사용자 로그인 시 자기 부서 항목만 목록에 표시되는지 확인
    - [x] 관리자 부서 필터 변경 시 해당 부서 데이터로 갱신되는지 확인
    - [x] 일반 사용자가 URL로 `?department=` 파라미터를 조작해도 타 부서가 노출되지 않는지 확인
    - [x] 타 부서 상세 id로 직접 접근 시 404 처리되는지 확인
    - [x] 데이터 0건일 때 EmptyState가 표시되는지 확인

- **Task 012: 주간업무일지 작성·수정·삭제·완료 처리 구현 (F003~F006)** ✅ (2026-08-03)
  - [x] 작성 폼에 React Hook Form + Zod resolver 연결 (`lib/schemas/weekly-log.ts` 재사용) — `components/weekly-log-form.tsx`를 `useForm` + `zodResolver(weeklyLogSchema)` + shadcn `Form`/`FormField`/`FormMessage`로 재작성, 기존 `useState` 기반 수동 폼을 대체
  - [x] `department_id`는 폼 입력이 아니라 **작성자 프로필 기준으로 서버에서 자동 지정**, `author_id`는 세션 사용자로 고정 — `lib/actions/weekly-log.ts`에 신규 Server Action(`createWeeklyLogAction` 등) 도입. 이 저장소에 기존 Server Action 사례가 없었지만, "department_id는 서버에서 지정"이라는 요구를 클라이언트 신뢰 없이 충족하려면 서버 실행 컨텍스트가 필요해 이번 Task에서 처음 도입(로그인/프로필 폼의 "Client Component에서 `supabase.*` 직접 호출" 관례는 유지하되, DB 쓰기 중 서버 측 값 결정이 필요한 이 케이스만 예외로 분리). `getClaims()`로 세션 확인 후 `profiles.department_id`를 서버에서 조회해 삽입값에 사용 — RLS의 `weekly_logs_insert_own_department_or_admin` 정책(`department_id = current_department_id() AND author_id = auth.uid()`)과 이중으로 일치하도록 보장
  - [x] 수정 저장 — 상세 페이지 수정 모드에서 UPDATE 후 동일 페이지 갱신 — `updateWeeklyLogAction` 호출 후 `router.refresh()`로 현재 라우트 재조회, `is_completed`는 건드리지 않고 title/content/날짜만 갱신
  - [x] 완료/미완료 토글 — `is_completed` 전환 및 즉시 상태 반영 — `toggleWeeklyLogCompletionAction` 호출, 로컬 state로 낙관적 업데이트 후 실패 시 롤백. Task007에서 도입했던 `lib/dummy-log-overrides.ts`(localStorage 임시 계층)는 실 저장 연결로 목적을 다해 삭제
  - [x] 삭제 — `alert-dialog` 확인 절차 후 DELETE, 성공 시 목록으로 복귀 — `deleteWeeklyLogAction` 호출 성공 시 `router.push("/protected/weekly-logs")`
  - [x] 변경 후 캐시 무효화 처리(`router.refresh()` 또는 `revalidatePath`)로 목록 최신화 — 각 Server Action 내부에서 `revalidatePath("/protected/weekly-logs")`(+ 수정/토글은 상세 경로도) 호출, 페이지 이동 없이 머무는 수정/토글 플로우는 클라이언트에서 `router.refresh()`도 함께 호출해 이중으로 최신화
  - [x] 서버 오류/검증 실패 시 사용자에게 한국어 메시지 노출 (`sonner` 토스트) — 모든 액션이 `{success: true} | {success: false, error: string}` 형태로 반환, 실패 시 `toast.error(result.error)`로 노출. Zod `safeParse` 실패 메시지도 동일 경로로 전달(클라이언트 RHF 검증을 우회해도 서버에서 한 번 더 차단)
  - **계획 대비 편차**: `lib/dummy-log-overrides.ts`가 목적을 다해 삭제되면서 `components/weekly-log-list-view.tsx`의 `useResolvedItems` 참조도 함께 제거(서버에서 이미 최신 `is_completed`를 조회하므로 클라이언트 오버라이드 레이어가 불필요해짐)
  - **검증**: `npx tsc --noEmit`/`npm run lint` 무오류. 실제 회원가입으로 QA 계정(개발팀) 1개를 만들어 Playwright로 전 구간 확인: (1) 빈 값 저장 시도 → 4개 필드 모두 필수 검증 메시지 노출·페이지 이동 없음, (2) `start_date > target_end_date` 입력 시 "시작일은 목표종료일보다 늦을 수 없습니다" 메시지로 차단, (3) 제목 입력창은 HTML `maxLength=100`이 100자 초과 입력 자체를 막아 길이 제한이 정상 동작함을 확인(zod `max(100)`과 이중 방어), (4) 정상 값으로 작성 → 목록으로 이동 및 토스트·신규 항목 노출 확인, (5) 상세에서 완료 토글 → 배지·토스트 즉시 반영, 목록 재방문 시에도 "완료"로 유지되는 실제 영속성 확인(이전 Task007의 localStorage 흉내가 아닌 진짜 DB 반영), (6) 수정 모드에서 제목 변경 후 저장 → 동일 페이지에 즉시 반영, `is_completed`는 그대로 유지됨을 확인, (7) 삭제 다이얼로그에서 취소 시 삭제되지 않음을 목록 재방문으로 확인, (8) 삭제 확인 시 목록으로 이동 + EmptyState 노출. RLS 거부 확인은 UI로 도달 불가능한 시나리오라(Task011에서 타 부서 상세 접근 자체가 404) SQL에서 `set local role authenticated`+`request.jwt.claims`로 QA 계정을 impersonate해 직접 검증: 타 부서 행 UPDATE/DELETE 시도 0건 처리(반환 행 없음, `ROLLBACK`으로 부작용 없이 확인)되고, 동일한 방식으로 본인 부서 행에 대해서는 1건 처리됨을 대조군으로 확인해 impersonation 자체가 유효했음을 검증. 전 구간 콘솔 에러 0건. 테스트 후 QA 계정과 SQL로 삽입한 대조군 행은 정리
  - **테스트 체크리스트**
    - [x] Playwright MCP로 작성 → 목록 복귀 → 신규 항목 노출까지 전체 흐름 확인
    - [x] `start_date > target_end_date` 입력 시 저장이 차단되고 검증 메시지가 표시되는지 확인
    - [x] 필수값 누락, 초과 길이 입력 등 유효성 검사 동작 확인
    - [x] 완료 토글 후 목록의 상태 배지가 함께 변경되는지 확인
    - [x] 삭제 확인 다이얼로그에서 취소 시 삭제되지 않는지 확인
    - [x] 타 부서 항목에 대한 수정/삭제 요청이 RLS에서 거부되는지 확인

- **Task 013: 부서별 리스트 PDF 다운로드 구현 (F008)** ✅ (2026-08-03)
  - [x] `lib/pdf/weekly-log-pdf.ts` 신규 작성 — `downloadWeeklyLogListPdf()`가 `jspdf`/`jspdf-autotable`을 `await import()`로 동적 로드해 코드 스플리팅(초기 번들에 미포함, 버튼 클릭 시에만 로드)한 뒤 `autoTable`로 표 생성
  - [x] **한글 폰트 임베딩** — `public/fonts/NotoSansKR-Regular.ttf`(서브셋, 2.4MB)를 정적 자산으로 두고, PDF 생성 시 `fetch()`로 받아 청크 단위 `arrayBufferToBase64()` 변환 후 `addFileToVFS`+`addFont`로 등록. 원본 Noto Sans KR 가변 폰트(10.4MB, OFL 라이선스)를 `fontTools.varLib.instancer`로 정적 Regular 인스턴스화한 뒤, `fontTools.subset`으로 한자(CJK 통합 한자) 영역을 제외하고 한글 완성형 11,172자 전체(U+AC00-D7A3)·라틴·문장부호만 남겨 2.4MB로 축소(원본 대비 약 1/4). 폰트를 JS 번들에 base64 리터럴로 심지 않고 정적 파일 `fetch`로 분리해 번들 크기 영향 자체를 없앰(로드맵이 우려했던 "번들 크기 영향"에 대한 실제 대응)
  - [x] PDF 헤더에 `부서명·출력일시`(`toLocaleString("ko-KR")`) 표기, 컬럼 구성 제목/시작일/목표종료일/완료상태(`lib/format.ts`의 `formatDate`/`getCompletionLabel` 재사용)
  - [x] 파일명 규칙 `주간업무일지_{부서명}_{YYYYMMDD}.pdf` 구현(`buildFileName`), 부서명에 파일명 금지 문자(`\/:*?"<>|`) 포함 시 `_`로 치환
  - [x] `components/weekly-log-list-view.tsx`의 기존 비활성 PDF 버튼을 `onClick={handleDownloadPdf}`로 교체, 현재 렌더링 중인 `items`(관리자 부서 필터 적용된 목록)와 `scopeLabel`(관리자는 필터 부서명 또는 "전체", 일반 사용자는 본인 부서명)을 그대로 전달해 화면에 보이는 목록과 PDF 내용이 항상 일치하도록 함. 생성 중 로딩 상태("생성 중...", 버튼 비활성화), 실패 시 `sonner` 토스트 에러 처리 추가
  - [x] 0건일 때 처리 — `autoTable` body를 4열 병합 셀 `표시할 데이터가 없습니다`로 대체해 헤더만 있는 빈 표 대신 안내 문구가 보이는 PDF를 오류 없이 생성
  - **버그 수정 (구현 중 발견)**: `jspdf-autotable`은 헤더 행에 기본적으로 `fontStyle: "bold"`를 적용하는데, 임베딩한 한글 폰트는 `normal` 스타일로만 등록해 헤더 렌더링 시 `Unable to look up font label for font 'NotoSansKR', 'bold'` 경고와 함께 기본 폰트(Helvetica)로 폴백되어 헤더의 한글("제목/시작일/목표종료일/완료상태")이 깨진 글자로 출력되는 문제를 Playwright 콘솔 경고 + `pdftotext` 추출로 실측. `styles`/`headStyles`에 `fontStyle: "normal"`을 명시해 헤더도 등록된 한글 폰트를 그대로 쓰도록 해소(별도 bold 폰트 파일은 추가하지 않음)
  - **검증**: `npx tsc --noEmit`/`npm run lint` 무오류. 실제 회원가입으로 QA 계정(개발팀) 1개를 만들어 SQL로 개발팀 2건·디자인팀 1건 `weekly_logs`를 시딩하고 Playwright로 확인: (1) 관리자 역할(SQL로 승격)에서 필터 "전체" 상태로 PDF 다운로드 → `주간업무일지_전체_20260803.pdf` 생성, `pdftotext`로 헤더·3건 본문 모두 정상 한글 렌더링 확인, (2) 부서 필터를 데이터 없는 마케팅팀으로 변경 후 다운로드 → `주간업무일지_마케팅팀_20260803.pdf`가 오류 없이 "표시할 데이터가 없습니다" 안내로 생성됨을 확인, (3) 계정을 일반 사용자로 되돌려 재로그인 → 본인 부서(개발팀) 2건만 담긴 `주간업무일지_개발팀_20260803.pdf` 생성 확인. 세 경우 모두 다운로드 후 목록 페이지 URL·렌더링 유지, 콘솔 에러 0건(단, 세션 시작 이후 누적된 Task012 이전 `dummy-log-overrides` 관련 stale 콘솔 이력이 `all:true` 조회 시 섞여 나왔으나 현재 소스에 해당 파일/참조가 전혀 없음을 grep으로 확인 — 이번 변경과 무관한 개발 서버 HMR 잔여 로그). 테스트 후 QA 계정과 시딩 데이터는 삭제
  - **테스트 체크리스트**
    - [x] Playwright MCP로 [PDF 다운로드] 클릭 시 파일 다운로드가 트리거되는지 확인
    - [x] 다운로드 후에도 목록 페이지가 유지되는지 확인
    - [x] 한글 제목·부서명이 깨지지 않고 렌더링되는지 확인(헤더 폰트 버그 수정 후 재확인)
    - [x] 관리자가 부서 필터를 변경한 뒤 받은 PDF의 내용이 해당 부서와 일치하는지 확인
    - [x] 데이터 0건일 때 오류 없이 처리되는지 확인

- **Task 014: 핵심 기능 통합 E2E 테스트** ✅ (2026-08-03)
  - [x] Playwright MCP로 전체 사용자 여정 검증: 랜딩 → 회원가입 → 로그인 → 부서 온보딩 → 목록 → 작성 → 상세(수정/완료/삭제) → PDF — 실제 회원가입으로 만든 QA 계정(개발팀)으로 전 구간 실행, 날짜 역전 검증 차단까지 재확인
  - [x] 일반 사용자 / 관리자 2개 역할 시나리오 각각 수행 — QA 계정 2개(개발팀 일반 사용자, 디자인팀→관리자 승격) + 마케팅팀 SQL 시딩으로 부서 3곳 데이터 구성. 관리자는 부서 필터 전환, 전체/특정 부서 조회, 타 부서(개발팀) 항목 상세 접근 및 완료 토글까지 확인
  - [x] 권한 격리 시나리오: 타 부서 데이터 조회·수정·삭제 차단, 부서 필터 파라미터 조작 방어 — 디자인팀 사용자가 개발팀 상세 id 직접 접근 시 404, `?department=<개발팀id>` URL 조작 시 무시(UI 필터 자체 미노출), SQL로 디자인팀 사용자를 impersonate해 개발팀 행 UPDATE/DELETE 시도 0건 처리 확인(동일 방식으로 본인 부서 행은 1건 처리되는 대조군으로 impersonation 유효성도 함께 검증)
  - [x] 세션 만료·로그아웃 후 보호 페이지 접근 차단 확인 — 로그아웃 후 `/protected`, `/protected/profile`, `/protected/weekly-logs`, `/protected/weekly-logs/new`, `/protected/weekly-logs/[id]` 5개 라우트 모두 `/auth/login`으로 리디렉션 확인
  - [x] 네트워크 오류, 존재하지 않는 id, 중복 제출 등 엣지 케이스 처리 확인 — 아래 "발견 및 수정한 버그" 3건 참고. 유효 형식이지만 존재하지 않는 UUID는 이미 정상적으로 404 처리됨을 재확인
  - [x] 콘솔 에러 및 하이드레이션 경고 0건 확인 — 랜딩/로그인/회원가입/목록/작성/상세/프로필 7개 라우트 재방문 후 콘솔 경고·에러 0건. `npm run build`로 프로덕션 빌드 성공 및 `next start`로 별도 포트에서 재검증
  - **발견 및 수정한 버그 (E2E 중 실측)**
    1. **잘못된 형식의 id로 상세 페이지 접근 시 500 크래시** — `/protected/weekly-logs/not-a-valid-uuid`처럼 uuid 형식이 아닌 id를 그대로 `.eq("id", id)` 쿼리에 넘기면 Postgres가 `22P02`(invalid input syntax) 오류를 던지고 코드가 이를 재throw해 Next.js 런타임 에러 화면으로 이어짐. `app/protected/weekly-logs/[id]/page.tsx`에서 쿼리 전에 `z.string().uuid().safeParse(id)`로 형식을 검증해 실패 시 존재하지 않는 id와 동일하게 `notFound()` 처리하도록 수정
    2. **네트워크 오류 시 UI가 영구적으로 깨진 상태로 멈춤, 사용자 피드백 없음** — `window.fetch`를 강제로 실패시켜 재현: 완료 토글은 낙관적 업데이트만 하고 롤백/에러 토스트가 없어 체크박스가 `checked+disabled` 상태로 영구 고정, 삭제는 `isDeleting`이 영원히 `true`로 남아 버튼이 다시는 활성화되지 않음, 콘솔에는 처리되지 않은 `TypeError: Failed to fetch`만 남음. `components/weekly-log-detail-view.tsx`(완료 토글·삭제·수정)와 `components/weekly-log-new-form.tsx`(신규 작성)의 서버 액션 호출부에 `try/catch/finally`를 추가해 네트워크 실패 시 상태를 롤백하고 "네트워크 오류가 발생했습니다. 다시 시도해주세요." 토스트를 노출하도록 수정
    3. **저장/삭제 버튼 연타(더블클릭) 시 중복 제출** — `isSubmitting`/`isDeleting`은 리렌더 이후에야 버튼을 비활성화하므로, 리렌더 전에 도착하는 두 번째 클릭이 막히지 않음. 실제로 신규 작성 폼에서 동일 내용의 행이 2건 생성되는 것을 실측(동일 제목으로 별도 id 2개 생성, 저장 완료 토스트도 2번). `components/weekly-log-form.tsx`(작성/수정 공용)와 `components/weekly-log-detail-view.tsx`의 삭제 버튼에 `useRef` 기반 동기 가드를 추가 — ref는 리렌더를 기다리지 않고 즉시 갱신되므로 연속 클릭의 두 번째 호출을 확실히 차단. 수정 후 동일한 더블클릭 재현으로 신규 작성 1건만 생성됨과 삭제 연타 시 에러 토스트 없이 1회만 처리됨을 확인
  - **참고 (버그 아님)**: 개발 서버(Turbopack dev)에서만 `notFound()` 경로 진입 시 `Failed to execute 'measure' on 'Performance': ... negative time stamp` 콘솔 에러가 발생하는데, 이는 Task011에서 이미 정상 동작이 검증된 기존 404 경로에서도 동일하게 재현되고(이번 변경과 무관) `npm run build` + `next start` 프로덕션 빌드에서는 발생하지 않음을 확인 — Next.js 16.2.12 Turbopack dev 서버의 RSC 성능 계측 관련 dev-only 노이즈로 판단, 코드 수정 대상 아님
  - **검증**: `npx tsc --noEmit`/`npm run lint` 무오류(수정 파일 4개: `app/protected/weekly-logs/[id]/page.tsx`, `components/weekly-log-detail-view.tsx`, `components/weekly-log-form.tsx`, `components/weekly-log-new-form.tsx`). `npm run build` 프로덕션 빌드 성공. 테스트 후 QA 계정 2개와 생성한 `weekly_logs`(정상 항목 + 중복 제출 재현용 항목 전부)는 SQL로 정리
  - **참고 (Task017 대상, 이번 범위 아님)**: `get_advisors(security)` 재확인 결과 Task008에서 이미 의도된 설계로 확인한 2건(SECURITY DEFINER 함수 RPC 노출) 외에 `auth_leaked_password_protection`(유출된 비밀번호 차단 비활성) 경고가 있음 — Supabase 대시보드 Auth 설정 토글이라 코드 변경 대상이 아니며 배포 전 최종 점검(Task017)에서 처리 권장

---

### Phase 4: 마감 및 배포 ✅

- **Task 015: 반응형 및 접근성 마감 (F014)** ✅ (2026-08-04)
  - [x] 데스크탑(1280)/태블릿(768)/모바일(390) 3개 뷰포트에서 7개 페이지 전수 점검 (Playwright MCP `browser_resize`) — 랜딩, 로그인, 회원가입, 프로필(온보딩), 주간업무일지 목록/작성/상세(조회·수정)
  - [x] 라이트/다크 양쪽 테마에서 대비(contrast) 및 배지 가독성 확인 — `완료`(녹색 배경/흰 텍스트)·`진행중`(secondary) 배지 라이트·다크 모두 판독 가능, 완료 항목의 취소선+이탤릭 스타일도 정상 렌더링 확인
  - [x] 폼 라벨-입력 연결, 키보드 내비게이션, 포커스 링, 다이얼로그 포커스 트랩 확인 — 로그인/회원가입/프로필/작성 폼 전 필드가 `label htmlFor`로 연결되어 접근성 이름 노출됨을 스냅샷으로 확인. 삭제 확인 `alert-dialog`와 모바일 햄버거 `sheet` 모두 Tab 포커스가 다이얼로그 내부(취소⇄삭제, 메뉴 링크들)에서만 순환하고 Escape 시 트리거 버튼으로 포커스가 정확히 복귀함을 실측(Radix 기본 동작)
  - [x] 모바일 헤더 메뉴 및 테이블→카드 전환 동작 확인 — 390px에서 `WeeklyLogCardList`(카드), 768px 이상에서 `WeeklyLogTable`(표) 전환이 `md:` 브레이크포인트 경계에서 정확히 일치함을 확인. 모바일 햄버거 메뉴(`components/mobile-nav.tsx`)는 로그인/비로그인 양쪽 상태에서 정상 오픈·포커스 이동·Escape 복귀 확인
  - **발견 및 수정한 접근성 이슈 (Playwright 접근성 스냅샷으로 실측)**
    1. `components/theme-switcher.tsx`의 테마 토글 트리거가 아이콘만 있는 `Button`이라 접근성 이름이 전혀 없었음(`button` 요소만 노출, 스크린리더로 용도 파악 불가) — `aria-label="테마 변경"` 추가로 해소
    2. `components/weekly-log-list-view.tsx`의 관리자 전용 부서 필터 `Select`도 동일하게 접근성 이름이 없었음(라벨 요소 없이 `SelectTrigger`만 존재) — 프로필 폼의 부서 선택(`Label htmlFor`로 연결됨)과 달리 목록 페이지 필터는 시각적 라벨이 없는 UI라 `aria-label="부서 필터"`를 직접 추가해 해소
  - **검증**: `npx tsc --noEmit`/`npm run lint` 무오류. 실제 회원가입으로 QA 계정(개발팀, 이후 SQL로 관리자 승격)을 만들어 Playwright로 3개 뷰포트 × 라이트/다크 조합을 스크린샷 대조하며 전 페이지 확인, 접근성 스냅샷(`browser_snapshot`)으로 두 이슈를 발견해 수정 후 재확인. 전 구간 콘솔 에러 0건(로그아웃 시 이미 SQL로 삭제한 계정의 세션을 종료하며 발생한 403은 테스트 정리 과정에서 발생한 것으로 실제 사용 흐름과 무관). 테스트 후 QA 계정과 생성한 `weekly_logs` 2건은 SQL로 정리

- **Task 016: 에러·로딩 처리 및 성능 최적화** ✅ (2026-08-04)
  - [x] 라우트별 `loading.tsx` / `error.tsx` / `not-found.tsx` 배치 — `app/error.tsx`(전역, `homeHref="/"`), `app/global-error.tsx`(루트 레이아웃 자체 크래시 대비), `app/not-found.tsx`(전역 404, 헤더 의존 없이 중앙 정렬), `app/protected/{profile,weekly-logs,weekly-logs/new,weekly-logs/[id]}` 4개 세그먼트에 각각 `loading.tsx`/`error.tsx` 배치, `weekly-logs/[id]`에는 `not-found.tsx` 추가(`notFound()` 호출 지점과 동일 세그먼트라 `protected/layout.tsx`의 헤더·푸터를 유지한 채 렌더링됨). 반복되는 에러 UI는 `components/error-state.tsx`(재시도·홈 버튼)로 공통화, 프로필 로딩은 `components/profile-skeleton.tsx` 신규 작성(기존엔 프로필 페이지 `Suspense`에 fallback이 아예 없어 로딩 중 빈 화면이었음 — 이번에 해소)
  - [x] Suspense 경계 정리 및 `cacheComponents` 동작 하에서 스트리밍 확인 — 기존 4개 페이지의 Suspense 구조(정적 shell은 즉시 렌더, 동적 조회부만 fallback과 함께 스트리밍)를 그대로 유지하며 재확인. 추가로 `components/site-header.tsx`의 `HeaderNav` Suspense에 fallback이 없어(빈 화면 후 팝인) 레이아웃 시프트 가능성이 있던 것을 발견 — `HeroCta`(app/page.tsx)와 동일한 패턴으로 버튼 크기의 `Skeleton` fallback 추가
  - [x] 조회 쿼리 인덱스 검토 (`weekly_logs.department_id`, `start_date`) — `pg_indexes` 조회 결과 두 컬럼 모두 Task 008에서 이미 단일 컬럼 인덱스(`weekly_logs_department_id_idx`, `weekly_logs_start_date_idx`) 생성 완료, `author_id`/`id`(PK)도 포함 확인. 현재/예상 데이터 규모(부서당 수십~수백 건)에서는 복합 인덱스 없이도 충분하다고 판단해 추가 마이그레이션은 하지 않음(과도한 사전 최적화 지양). `get_advisors(performance)`는 트래픽 부재로 인한 `unused_index` INFO 1건만 확인(정상), `get_advisors(security)`는 Task008/014에서 이미 검토된 항목 외 신규 이슈 없음
  - [x] `npm run build` 성공, 번들 크기 점검(특히 PDF 폰트), `npx tsc --noEmit` 및 `npm run lint` 무오류 — `next build` 정상 완료(`app/not-found.tsx`가 `/_not-found`로 정상 포함됨을 빌드 로그에서 확인). `next start`(3100 포트)로 프로덕션 서버를 띄우고 Playwright 네트워크 요청을 실측: 목록 페이지 최초 로드 시 jsPDF/autoTable 청크(`0xpgrjn-qx5it.js` 412K, `39k4ojqlk3yys.js` 32K)는 전혀 요청되지 않고, [PDF 다운로드] 클릭 시점에만 두 청크와 `public/fonts/NotoSansKR-Regular.ttf`(2.4MB, 별도 정적 자산 fetch)가 로드됨을 확인 — Task013에서 의도한 코드 스플리팅이 프로덕션 빌드에서도 정상 동작
  - **검증**: `npx tsc --noEmit`/`npm run lint` 무오류. QA 계정으로 `not-found.tsx`(유효 형식이지만 존재하지 않는 UUID·형식이 아예 다른 id) 2가지 경로와 전역 404(로그인 상태에서 존재하지 않는 임의 경로 접근, 비로그인 상태는 `proxy.ts` 게이트가 먼저 `/auth/login`으로 보내므로 도달하지 않음 — 기존 설계 그대로) 모두 헤더·푸터 유지 여부에 맞게 정상 렌더링 확인. `error.tsx` 동작은 목록 페이지 서버 컴포넌트에 임시로 `throw`를 넣어 실제로 에러 화면(제목·설명·다시 시도·홈으로 버튼)이 뜨는지, [다시 시도] 클릭 시 `reset()`이 정상 재실행되는지 확인한 뒤 즉시 원복(`git status`로 되돌림 확인). 전 구간 콘솔 에러는 Task014에서 이미 무해하다고 확인된 dev-only Turbopack 성능 계측 노이즈 1건 외 없음. 테스트 후 QA 계정 2개와 생성 데이터는 SQL로 정리

- **Task 017: 배포 및 운영 준비** ✅ (2026-08-04, 프로덕션 https://weekly-plan-02.vercel.app/ )
  - [x] Vercel 프로젝트 환경변수 등록 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) — 사용자가 `docs/guides/deployment-ops.md` 1절에 따라 직접 등록·배포 완료. 랜딩 페이지에서 `EnvVarWarning`이 뜨지 않음을 확인해 정상 등록을 재확인
  - [x] 프로덕션 도메인 기준 Supabase Auth Redirect URL 및 Google OAuth 승인 URI 추가 — 사용자가 직접 설정 완료. 이메일/비밀번호 로그인과 [구글로 계속하기] 클릭 시 `redirect_to=https://weekly-plan-02.vercel.app/auth/callback`로 정확히 설정된 실제 Google 로그인 화면까지 도달함을 Playwright로 확인(Task 009와 동일한 방식 — 실제 Google 계정 자격 증명이 없어 동의 화면 이후 단계는 검증 불가하나 리디렉션 파라미터 자체는 정상)
  - [x] `mcp__supabase__get_advisors` 최종 보안 점검 (RLS 누락 테이블 0건 확인) — `list_tables(verbose)`로 `departments`/`profiles`/`weekly_logs` 3개 테이블 모두 `rls_enabled: true` 확인. 보안 어드바이저는 Task008/014에서 이미 검토된 경고 3건(`is_admin`/`current_department_id` RPC 노출 2건은 의도된 설계, `auth_leaked_password_protection`은 대시보드 토글) 외 신규 이슈 없음
  - [x] 관리자 계정 지정 절차 문서화 (`profiles.role`을 Supabase에서 수동으로 `admin` 변경 — 관리자 지정 UI는 MVP 범위 외) — `docs/guides/deployment-ops.md` 4절에 SQL과 함께 정리(권한은 `profiles.role`을 매 요청 조회하는 구조라 재로그인 없이 즉시 반영됨을 명시, 프로덕션 스모크 테스트에서 실제로 재로그인 없이 즉시 반영됨을 재확인)
  - [x] 부서 seed 데이터 운영 반영 절차 문서화 (부서 관리 UI는 MVP 범위 외) — `docs/guides/deployment-ops.md` 5절에 정리. 부서 삭제는 `weekly_logs`/`profiles`의 FK 제약으로 실패하므로 삭제 대신 이름에 "(사용중지)" 표기하는 방식을 권장 문구로 추가
  - [x] 프로덕션 스모크 테스트 (로그인, 작성, PDF 다운로드) — 사용자가 Vercel 배포를 완료한 뒤 프로덕션 도메인(https://weekly-plan-02.vercel.app/)에서 Playwright MCP로 전체 흐름 실행: 랜딩(경고 배너 없음) → 이메일 회원가입(자동 인증 활성, 즉시 로그인 가능) → 로그인 → 부서 온보딩(개발팀) → 신규 작성 → 목록 반영 → 상세에서 완료 토글 즉시 반영 → PDF 다운로드(`pdftotext`로 한글 헤더·본문 깨짐 없이 렌더링 확인) → 로그아웃 → 보호 페이지(`/protected/weekly-logs`) 접근 시 로그인으로 정상 차단 → 구글 로그인 리디렉션 정상 → SQL로 관리자 승격 후 재로그인 시 "관리자" 배지와 부서 필터(`aria-label="부서 필터"`, Task015 접근성 수정 반영 확인)가 정상 노출. 전 구간 콘솔 에러 0건. 테스트 후 QA 계정과 생성 데이터는 SQL로 정리

---

### Phase 5: 배포 후 운영 개선 (사용자 피드백 기반)

> 목표: Task 017 프로덕션 배포 이후 실사용 피드백을 반영한 점진적 개선. Phase 1~4처럼 사전 계획된 단위가 아니라 배포 후 요청 단위로 진행되어, 아래 항목은 하나의 완결된 사전 계획 Task가 아니라 같은 기간(2026-08-04)에 이루어진 개별 커밋들을 사후에 하나의 Task로 묶어 기록한 것이다.

- **Task 018: 목록 화면 UX 개선 및 부서 접근 권한 확장** ✅ (2026-08-04)
  - [x] **부서 접근 권한 확장** — `weekly_logs` RLS의 SELECT 정책을 전 부서 공개로 완화(기존엔 관리자만 타 부서 조회 가능했음). 쓰기(수정/삭제/완료토글)는 여전히 자기 부서 또는 admin으로 제한하며, 상세 페이지는 서버에서 계산한 `canWrite`(admin 또는 `log.department_id === profile.department_id`)로 수정/삭제/완료토글 UI 노출 여부를 결정
  - [x] 목록 페이지 부서 필터 기본값 조정 — `department` 파라미터가 없는 최초 진입 시 admin은 전체, 일반 사용자는 소속 부서를 기본값으로 노출(필터 자체는 이제 모두에게 열려 있으므로 원하면 타 부서로 전환 가능)
  - [x] **작성/수정 폼에 예상 M/M·예상 금액·협력사 속성 추가** — `weekly_logs`에 `estimated_mm`(numeric, nullable)·`estimated_cost`(integer, nullable)·`partner_company`(text, nullable) 컬럼 추가, 폼 라벨을 업무명/업무 상세 내용으로 정리하고 세 필드는 모두 선택 입력으로 구현. `lib/schemas/weekly-log.ts`·`lib/actions/weekly-log.ts`·작성/상세 폼·`database.types.ts` 전체에 반영
  - [x] **목록 화면 검색 기능(F016)** — 제목/내용 키워드 검색 추가. `.or()`로 raw PostgREST 필터 문자열을 직접 조합하면 검색어에 콤마·괄호가 섞였을 때 필터 구조가 깨질 수 있어, 대신 title/content 각각을 안전한 파라미터 바인딩(`ilike`)으로 조회한 뒤 서버에서 병합·정렬하는 방식으로 구현(`lib/utils.ts`의 `escapeLikePattern`으로 `%`/`_` 리터럴 이스케이프까지 처리)
  - [x] **목록 화면 페이지네이션** — 20건 단위 클라이언트 사이드 페이지네이션(`npx shadcn add pagination`으로 `components/ui/pagination.tsx` 신규 설치). 부서 필터·검색어가 바뀌면 1페이지로 리셋. PDF 다운로드는 페이지네이션과 무관하게 현재 필터 기준 전체 목록을 대상으로 유지
  - [x] 모바일 카드 뷰 간격 축소 — 카드 간 간격(`gap-3`→`gap-2`)과 카드 내부 패딩(`p-6`→`p-4`) 축소
  - [x] 목록 화면 중복 텍스트 제거 — 상단에 페이지 타이틀("주간업무일지")이 이미 있어 본문의 부서명(스코프 라벨) 및 중복 `<h1>` 타이틀 표시를 제거
  - [x] **로그인 폼 브라우저 자동완성 지원** — 이메일/비밀번호 `input`에 `name`/`autoComplete`(`username`/`current-password`) 속성 추가, `<form autoComplete="on">` 명시. 앱이 직접 비밀번호를 저장하는 방식(localStorage 등)은 XSS 노출 위험이 있어 채택하지 않고, 브라우저 내장 비밀번호 관리자가 폼을 정상 인식하도록 하는 표준적인 방식으로 구현
  - [x] **로그아웃 하드 네비게이션으로 전환** — `components/logout-button.tsx`가 `router.push`(클라이언트 라우터 캐시 경유) 대신 로그인 폼과 동일하게 `window.location.href`를 쓰도록 수정 — 완전한 페이지 탐색이어야 브라우저 비밀번호 자동완성이 로그인 폼을 안정적으로 재인식함
  - [x] 로그인 폼 Tab 이동 순서 수정(이메일→비밀번호 직행), 회원가입 완료 흐름을 이메일 인증 대기에서 자동 로그인 + 랜딩 자동 이동(1.5초)으로 변경(Supabase Confirm Email 옵션 비활성화에 맞춤)
  - [x] UI 스타일 다수 개선 — 헤더 로고에 아이콘 배지 추가 및 타이틀 강조, 상단 타이틀을 "IT부문 주간업무"로 변경, 목록 테이블 헤더 스타일링·부서명 배지화·행 호버 개선, 보호 레이아웃의 헤더-본문 간격 축소(`gap-20`→`gap-8`), 푸터 문구를 "Developed by archy712@gmail.com"으로 변경
  - [x] `package.json`에 `"type": "module"` 추가 — Node ESM 재파싱 경고 제거(기능 변화 없음)
  - **검증**: 검색·페이지네이션·모바일 카드 간격·로그인 자동완성 DOM 속성은 이번 문서화 작업과 같은 세션에서 Playwright MCP로 직접 확인(임시 미리보기 라우트에 20/45건 더미 데이터를 넣어 페이지네이션 동작, 검색 필터링 결과, 빈 검색 결과 문구, 데스크탑/모바일 레이아웃을 스크린샷으로 대조한 뒤 라우트는 정리; 로그인 폼은 실제 `/auth/login`에서 `name`/`autocomplete` 속성이 DOM에 정확히 반영됨을 확인). 브라우저 비밀번호 관리자의 실제 저장·자동입력 동작 자체는 격리된 자동화 브라우저 프로필로는 검증 불가능해 사용자가 실제 브라우저로 최종 확인해야 하는 항목으로 남김. `npx tsc --noEmit`/`npm run lint`/`npm run build` 매 변경마다 무오류 확인. 부서 접근 권한 확장·필터 기본값·작성 폼 필드 추가·UI 스타일 항목들은 각 커밋 시점에 이미 반영·확인된 변경으로, 이번 로드맵 갱신 작업에서는 커밋 diff 검토로 내용만 재확인함(재검증 테스트는 다시 수행하지 않음)
  - **범위 밖 유지**: 부서 관리 UI, 관리자 지정 UI, 기간 범위 검색/필터는 PRD상 여전히 MVP 이후 범위로 제외

- **Task 019: 진행상태 3단계(예정/진행중/완료) 확장 (F006)** ✅ (2026-08-04)
  - [x] **DB 마이그레이션** — `weekly_logs.is_completed`(boolean) 컬럼을 제거하고 `status`(text, `planned`/`in_progress`/`completed` CHECK 제약, 기본값 `in_progress`) 컬럼으로 교체. 기존 값은 `true`→`completed`, `false`→`in_progress`로 결정론적 백필 후 컬럼 삭제(마이그레이션 1건). `weekly_logs` RLS 정책은 `is_completed`/`status`를 조건절에서 참조하지 않아(SELECT `true`, 쓰기는 `department_id`/`author_id` 기준) 정책 변경 없이 그대로 유효함을 `pg_policies` 조회로 사전 확인
  - [x] **기존 데이터 표본 갱신** — 사용자 요청에 따라 기존 165건 중 무작위 10%(`order by random() limit round(0.1 * count(*))`)를 `planned`(예정)으로 변경(17건, 나머지는 `in_progress` 77건·`completed` 71건으로 유지)
  - [x] `mcp__supabase__generate_typescript_types`로 `lib/supabase/database.types.ts` 재생성
  - [x] `lib/types/index.ts`에 `WeeklyLogStatus = "planned" | "in_progress" | "completed"` 타입 추가, `WeeklyLogListItem`/`WeeklyLogDetail`의 `is_completed` 필드를 `status`로 교체
  - [x] `lib/format.ts`의 `getCompletionLabel(boolean)`을 `getStatusLabel(WeeklyLogStatus)`(예정/진행중/완료 라벨 매핑)로 교체
  - [x] `components/status-badge.tsx` — `isCompleted: boolean` prop을 `status: WeeklyLogStatus` prop으로 교체, 배지 색상은 예정=outline·진행중=secondary·완료=success(`Badge` 기존 variant 재사용, 신규 variant 추가 없음)
  - [x] `components/weekly-log-card.tsx`/`weekly-log-table.tsx` — 완료 시 취소선 스타일 조건을 `item.status === "completed"`로 변경, 목록 테이블 헤더 라벨 "완료상태" → "진행상태"
  - [x] `components/weekly-log-detail-view.tsx` — 완료 처리 `ui/checkbox`를 예정/진행중/완료 3개 옵션의 `ui/select`로 교체(`components/weekly-log-list-view.tsx`의 부서 필터와 동일한 shadcn Select 패턴 재사용), 상태 변경 시 낙관적 업데이트 + 실패 시 롤백은 기존 완료 토글 로직 그대로 유지
  - [x] `lib/actions/weekly-log.ts` — `toggleWeeklyLogCompletionAction(id, boolean)`을 `updateWeeklyLogStatusAction(id, WeeklyLogStatus)`로 교체(`update({ status })`)
  - [x] `app/protected/weekly-logs/page.tsx`, `app/protected/weekly-logs/[id]/page.tsx` — Supabase 조회 컬럼 목록을 `is_completed` → `status`로 변경, DB의 `status: string` 결과를 `WeeklyLogStatus`로 캐스팅해 목록/상세 아이템에 매핑
  - [x] `lib/pdf/weekly-log-pdf.ts` — PDF 표 값·헤더 라벨을 `getStatusLabel(item.status)`/"진행상태"로 교체
  - **검증**: `npx tsc --noEmit`/`npm run lint` 무오류. `mcp__supabase__execute_sql`로 상태별 건수(예정 17·진행중 77·완료 71 = 총 165건) 재확인. 임시 QA 계정으로 회원가입 → 부서 선택(Commerce시스템팀) → 목록 페이지에서 예정/진행중/완료 배지가 각각 올바른 스타일로 렌더링됨을 스크린샷으로 확인, 상세 페이지에서 예정 항목의 상태를 진행중으로 변경 → 토스트("진행중 상태로 변경되었습니다") 및 배지 즉시 반영 확인 후 원래 값(예정)으로 되돌림. 전 구간 콘솔 에러 0건. 테스트 후 QA 계정은 `auth.users` DELETE로 정리(FK로 `profiles` 행도 함께 제거됨)
  - **범위 밖 유지**: 작성 폼에는 진행상태 입력 필드를 추가하지 않음 — 신규 작성 시 DB 기본값(`in_progress`)을 그대로 사용하고, 예정으로 등록하고 싶다면 저장 후 상세 페이지에서 상태를 변경하는 기존 흐름을 그대로 따름(요청 범위가 기존 2단계 상태에 "예정"을 추가하는 것이었고, 작성 폼 UX 변경은 별도 요청 없었음)

---

## 기능 ID 커버리지 매핑

| 기능 ID | 기능명 | 담당 Task |
|---------|--------|-----------|
| F001 | 주간업무일지 목록 조회 | Task 007(UI), Task 011 |
| F002 | 주간업무일지 상세 조회 | Task 007(UI), Task 011 |
| F003 | 주간업무일지 신규 작성 | Task 007(UI), Task 012 |
| F004 | 주간업무일지 수정 | Task 007(UI), Task 012 |
| F005 | 주간업무일지 삭제 | Task 007(UI), Task 012 |
| F006 | 진행상태 관리 | Task 007(UI), Task 012, Task 019(3단계 확장) |
| F007 | 전체 부서 조회 | Task 008(RLS), Task 011, Task 018(전체 사용자로 SELECT 개방) |
| F008 | 부서별 리스트 PDF 다운로드 | Task 013 |
| F010 | 기본 인증 | 기존 구현 + Task 006(한국어화) |
| F011 | 구글 소셜 로그인 | Task 006(UI), Task 009 |
| F012 | 부서 선택 온보딩 | Task 006(UI), Task 008(스키마), Task 010 |
| F013 | 다크모드 토글 | 기존 구현 + Task 002(헤더 이동) |
| F014 | 반응형 레이아웃 | Task 004~007, Task 015 |
| F015 | 랜딩 기능 소개 카드 | Task 005 |
| F016 | 제목/내용 키워드 검색 | Task 018 |

## 주요 리스크 및 결정 필요 사항

| 항목 | 내용 | 결정 시점 |
|------|------|-----------|
| ~~Supabase 연결~~ | ✅ 해소됨(2026-08-03). MCP 정상 연결 확인, 단 원격 DB 테이블 0개 → Task 008 스키마 신규 설계 필요 | 해소됨 |
| ~~`database.types.ts`와 원격 DB 불일치~~ | ✅ 해소됨(2026-08-03). Task 008에서 `departments`/`profiles`/`weekly_logs` 신규 생성 후 타입 재생성 완료 | 해소됨 |
| ~~RLS 정책 재귀~~ | ✅ 해소됨(2026-08-03). `is_admin()`/`current_department_id()` `SECURITY DEFINER` 헬퍼 함수로 우회 적용 완료 | 해소됨 |
| ~~`profile-form.tsx` 타입 에러~~ | ✅ 해소됨(2026-08-03). Task 006에서 부서 선택 폼으로 재작성, `tsc --noEmit`/`lint` 무오류 확인 | 해소됨 |
| ~~부서 정보 조회 방식~~ | ✅ 해소됨(2026-08-03). Task 010에서 (A) proxy 매 요청 `profiles` 조회로 결정 — 부서 변경 즉시 반영 요구 우선, 추가 대시보드 설정 불필요 | 해소됨 |
| PDF 한글 폰트 | TTF base64 임베딩 필요, 번들 용량 증가 → 동적 로딩 여부 | Task 013 |
| ~~`cacheComponents`~~ | ✅ 해소됨(2026-08-03). Task 011에서 목록/상세 페이지 모두 기존 Suspense 경계 구조를 유지한 채 실 DB 조회로 교체, `"use cache"` 미사용 확인 | 해소됨 |
