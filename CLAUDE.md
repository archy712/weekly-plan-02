# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Next.js 16 (App Router) + Supabase Auth 스타터 킷입니다. `@supabase/ssr`로 쿠키 기반 세션을 Client Component, Server Component, Route Handler, `proxy.ts` 전반에서 공유합니다.

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

### DB 타입

`lib/supabase/database.types.ts`는 Supabase에서 생성된 타입입니다(`mcp__supabase__generate_typescript_types`로 재생성). 컴포넌트에서는 `Tables<"테이블명">` 헬퍼로 필요한 컬럼만 `Pick`해서 씁니다(`components/profile-form.tsx` 참고). 스키마를 변경했다면 이 파일을 재생성해야 합니다.

### 부서 기반 권한 모델

- `weekly_logs`의 RLS는 **SELECT는 전 부서에 공개**되어 있고, **INSERT/UPDATE/DELETE만 작성자의 소속 부서 또는 `role='admin'`으로 제한**됩니다. 목록/상세 조회 쿼리에서 부서로 필터링하지 않아도 되며(관리자 여부와 무관하게 모든 로그인 사용자가 부서 필터를 쓸 수 있음), 쓰기 액션 UI만 서버에서 계산한 `canWrite` 같은 값으로 노출 여부를 제어해야 합니다(`app/protected/weekly-logs/[id]/page.tsx` 참고).
- 목록 페이지의 부서 필터 **기본값**은 `department` 쿼리 파라미터가 없을 때만 role로 분기합니다(관리자는 전체, 일반 사용자는 소속 부서). 파라미터가 있으면 role과 무관하게 그대로 사용합니다.

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

## Claude Code 커스텀 설정

- `.claude/agents/`에 이 저장소 전용 서브에이전트가 정의되어 있습니다: `dev/nextjs-supabase-developer`(Next.js+Supabase 기능 구현), `dev/ui-markup-specialist`(정적 마크업/스타일링), `dev/nextjs-app-developer`(라우팅/레이아웃 구조), `dev/code-reviewer`, `dev/development-planner`(ROADMAP.md), `docs/prd-generator`, `docs/prd-validator` 등.
- `.claude/commands/git/`에 `commit`, `pr`, `merge`, `branch`, `update-roadmap` 슬래시 커맨드가 정의되어 있습니다.
