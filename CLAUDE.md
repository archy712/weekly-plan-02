# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Next.js 16 (App Router) + Supabase Auth 스타터 킷입니다. `@supabase/ssr`로 쿠키 기반 세션을 Client Component, Server Component, Route Handler, `proxy.ts` 전반에서 공유합니다.

MVP(부서별 주간업무일지 CRUD·조회·PDF·검색, `docs/roadmap/ROADMAP_mvp.md`)는 구현이 완료된 상태입니다. v1 고도화(`docs/ROADMAP_v1.md`)는 관리자 콘솔(부서 관리 UI·사용자 관리 UI, Phase 1)까지 구현이 완료되었고, 기간 범위 검색·댓글·멘션·실시간 알림·통계 대시보드는 아직 구현 전입니다. 전체 기능 명세는 `docs/PRD.md`(MVP + v1 계획 포함)를 참고하세요.

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
- **`profiles.role`에는 자기 상승을 막는 `BEFORE UPDATE` 트리거(`prevent_unauthorized_role_change()`, `SECURITY DEFINER`)가 이미 적용되어 있습니다.** `profiles_update_own` 정책이 행 단위 제한만 걸려 있어(컬럼 제한 없음) 원래는 로그인한 누구나 자신의 `role`을 `admin`으로 바꿀 수 있었던 결함을 막은 것입니다 — `NEW.role`이 `OLD.role`과 다르고 **`(select auth.uid())`가 NULL이 아닌데(=PostgREST를 통한 인증된 앱 요청)** 호출자가 `is_admin()`이 아니면 예외를 던집니다. `auth.uid()`가 NULL인 연결(SQL Editor, `mcp__supabase__execute_sql` 등 직접 DB 접속)은 검사 대상이 아니므로 `docs/guides/deployment-ops.md` 4절의 수동 관리자 지정 절차는 그대로 동작합니다 — 처음 이 트리거를 `auth.uid()` 조건 없이(호출자가 `is_admin()`이 아니면 무조건 차단) 작성했다가 그 절차 자체가 막히는 회귀를 실측으로 발견해 수정한 이력이 있으니, 이 트리거를 다시 손볼 때 `auth.uid() IS NOT NULL` 조건을 빠뜨리지 말 것. 이 트리거는 마이그레이션 파일이 아니라 Supabase MCP(`apply_migration`)로 직접 적용되어 있어 로컬 `supabase/migrations/` 디렉터리에는 보이지 않으니, 스키마 확인 시 `mcp__supabase__list_migrations`나 `execute_sql`로 실측할 것. v1 고도화(`docs/ROADMAP_v1.md` Task 026~028)에서 `profiles`의 UPDATE 정책을 `own_or_admin`으로 넓히더라도 **이 트리거는 그대로 유지**해야 관리자 지정 UI가 생긴 뒤에도 자기 상승 경로가 막힌 채 유지됩니다.

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

### 폼 처리

React Hook Form + Zod 조합이 표준입니다. 상세 패턴(스키마 정의, 에러 표시, 서버 에러 매핑 등)은 `docs/guides/forms-react-hook-form.md`를 참고하세요.

### PDF 생성

`lib/pdf/weekly-log-pdf.ts`가 jsPDF + jspdf-autotable로 **클라이언트 사이드**에서 PDF를 생성합니다. jsPDF 기본 폰트가 한글을 지원하지 않아 `/public/fonts/NotoSansKR-Regular.ttf`를 런타임에 fetch해 base64로 임베딩하며, 폰트 용량(~2.5MB) 때문에 `String.fromCharCode`를 청크 단위로 호출해 콜스택 초과를 피합니다. 이 변환 로직은 그대로 유지할 것.

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

### 프로필 상세 정보 (이름·전화번호·아바타·자기소개)

- `profiles`에 `name`(text, `CHECK (name IS NULL OR (char_length(trim(name)) BETWEEN 1 AND 50))`, nullable)·`phone_number`(text, `^\d{3}-\d{4}-\d{4}$` CHECK 제약, nullable)·`avatar_key`(text, 24개 프리셋 키 CHECK 제약, 기본값 `'fox'`)·`bio`(text, 500자 CHECK 제약, nullable) 컬럼이 있습니다. `name`은 나머지 세 필드와 동일하게 선택 입력이며(가입 시 비워도 서비스 이용에 지장 없음, 나중에 프로필 화면에서 채울 수 있음), 관리자 사용자 관리 화면(목록/상세)에도 함께 노출됩니다(`components/user-admin-table.tsx`, `components/user-admin-detail.tsx`). 아바타는 이미지 업로드가 아니라 `lib/constants/avatars.ts`의 `AVATAR_PRESETS`(fox/bear/cat/panda/rabbit/owl/penguin/tiger/dog/lion/koala/cow/pig/frog/monkey/unicorn/wolf/raccoon/hamster/hedgehog/chicken/duck/butterfly/turtle 24종, 이모지 + 배경색 조합) 중 하나를 선택하는 방식이라 별도 Storage 버킷이 필요 없습니다.
- **프리셋 목록은 두 곳에서 반드시 동기화**해야 합니다: (1) `lib/constants/avatars.ts`의 `AVATAR_PRESETS`(런타임 선택지), (2) DB의 `profiles_avatar_key_check` CHECK 제약. 프리셋을 추가/제거하면 마이그레이션도 함께 적용할 것.
- **아바타 선택 UI는 `components/avatar-picker-dialog.tsx`(`AvatarPickerDialog`)로 공통화**되어 있습니다 — 현재 아바타를 보여주는 트리거 버튼(`ui/dialog`의 `DialogTrigger`)을 누르면 24개 프리셋을 그리드로 보여주는 `Dialog`가 열리고, 하나를 클릭하면 즉시 값이 반영되며 다이얼로그가 자동으로 닫힙니다. `value`/`onChange` prop만 받는 순수 컴포넌트라 `components/profile-form.tsx`(RHF `FormField`)와 `components/sign-up-form.tsx`(일반 `useState`) 양쪽에서 동일하게 재사용됩니다.
- 전화번호 자동 하이픈 포맷은 `lib/utils.ts`의 `formatPhoneNumberInput()`이 담당합니다 — 숫자만 남기고 3-4-4자리로 잘라 `-`를 삽입합니다. `components/profile-form.tsx`/`components/sign-up-form.tsx`의 전화번호 입력 모두 `onChange`에서 이 함수를 거쳐 값을 저장하므로 사용자는 숫자만 입력해도 자동으로 하이픈이 붙습니다.
- `components/profile-form.tsx`는 처음 이 필드들(전화번호·아바타·자기소개 3종, 이후 이름 추가로 4종)이 도입되며 기존 수동 `useState` 기반 폼에서 **React Hook Form + Zod**(`lib/schemas/profile.ts`)로 전환되었습니다 — `weekly-log-form.tsx`와 동일한 `useForm` + `zodResolver` + shadcn `Form`/`FormField`/`FormMessage` 패턴을 따릅니다.
- **`components/sign-up-form.tsx`에도 동일한 네 필드(모두 선택 입력)가 있습니다** — 단 이 폼은 다른 인증 폼들과 마찬가지로 RHF를 쓰지 않고 기존 수동 `useState` 패턴을 유지하며, 전화번호 유효성만 `profileSchema.shape.phone_number.safeParse()`로 재사용해 검증 로직을 이중으로 작성하지 않습니다. `supabase.auth.signUp()` 성공 후 `handle_new_user` 트리거가 이미 만들어 둔 `profiles` row에 이 값들을 곧바로 `update()`하며, 이 2차 업데이트가 실패해도 계정 생성 자체(및 페이지 이동)는 막지 않습니다 — 선택 입력이라 나중에 `/protected/profile`에서 채울 수 있기 때문입니다.
- **헤더에도 아바타가 노출**됩니다 — `components/header-nav.tsx`(데스크탑)와 `components/mobile-nav.tsx`(모바일 시트)가 `profiles.avatar_key`를 함께 조회해 이메일 앞에 `ui/avatar`(`AvatarFallback`)로 렌더링합니다. 이 헤더는 `components/site-header.tsx`를 통해 전 페이지에서 공유되므로, 별도 처리 없이 모든 보호된 페이지에 자동 반영됩니다.
- `app/auth/login/page.tsx`/`app/auth/sign-up/page.tsx`의 카드 폭은 사용자 요청으로 반응형 확장을 시도했다가(`max-w-sm sm:max-w-md md:max-w-lg` → `max-w-5xl`) 다시 원래의 고정 `max-w-sm`으로 되돌렸습니다 — 이 두 페이지는 프로필 화면과 달리 좁고 짧은 로그인/회원가입 폼이라는 피드백에 따른 결정이므로, 임의로 다시 넓히지 말 것.

### 관리자 콘솔 (부서 관리·사용자 관리)

- `/protected/admin/*`는 `app/protected/admin/layout.tsx`가 `lib/auth/require-admin.ts`의 `requireAdmin()`으로 가드합니다(부서 게이트 → `profiles.role === 'admin'` 확인 순서). `proxy.ts`가 아니라 **레이아웃 레벨**에서 처리하는 이유는 요청당 `profiles` 조회가 이미 있어 proxy에서 중복 조회할 필요가 없기 때문입니다. `cacheComponents: true` 하에서 `requireAdmin()`을 Suspense 밖에서 직접 `await`하면 콘솔 에러가 나므로, `AdminLayout`은 얇은 동기 컴포넌트로 두고 내부의 `<Suspense>`로 감싼 비동기 가드 컴포넌트에서 호출합니다.
- **부서 관리**(`app/protected/admin/departments/page.tsx`, `lib/actions/department.ts`) — 기본 동작은 **비활성화(소프트 삭제)**이며, `departments.archived_at`(nullable)로 표현합니다. 하드 삭제는 부서원(`profiles`) 또는 `weekly_logs` 참조가 0건일 때만 UI에서 허용되고, `deleteDepartmentAction`이 경합으로 `23503`(FK 위반)을 받으면 그 시점에 다시 참조 수를 세어 `lib/format.ts`의 `formatDepartmentDeleteBlockedMessage()`로 사전 안내와 동일한 문구를 만들어 폴백합니다(사전 체크·경합 폴백이 항상 같은 문구를 쓰도록 함수를 공유). `23505`(이름 중복)는 "이미 존재하는 부서명입니다."로 변환. 비활성 부서는 신규 선택 목록(프로필/회원가입)에서는 제외하되 이미 그 부서인 사용자에게는 "(비활성)" 라벨로 계속 노출하고, 목록 필터에서는 과거 데이터 조회를 위해 항상 노출합니다.
- **사용자 관리**(`app/protected/admin/users/page.tsx`, `app/protected/admin/users/[id]/page.tsx`, `lib/actions/user-admin.ts`) — `updateUserRoleAction`/`updateUserDepartmentAction` 모두 클라이언트가 보낸 값을 신뢰하지 않고 **호출자의 `profiles.role`을 서버에서 재조회**해 관리자인지 확인합니다. 자기 자신의 역할 변경은 관리자 수와 무관하게 **항상** 서버 액션에서 차단합니다 — `prevent_unauthorized_role_change()` 트리거는 "마지막 관리자"의 강등만 막고 관리자가 2명 이상이면 자기 강등을 허용하므로, 로드맵이 요구하는 "자기 강등은 항상 금지"를 만족하려면 트리거보다 넓은 조건을 서버 액션에 추가해야 합니다. 소속 부서 변경 시에는 대상 사용자가 이전 부서 로그의 쓰기 권한(RLS)을 잃는다는 경고(`formatDepartmentChangeWarning()`)를 확인 다이얼로그에 표시합니다. 역할 변경 UI(목록 인라인 + 상세 폼, `components/user-role-select.tsx`로 공유)는 `weekly-log-detail-view.tsx`의 진행상태 변경과 동일한 낙관적 업데이트(즉시 반영 → 실패 시 롤백 + 토스트) 패턴을 재사용합니다.

## Claude Code 커스텀 설정

- `.claude/agents/`에 이 저장소 전용 서브에이전트가 정의되어 있습니다(Agent 도구의 `subagent_type`으로 지정하는 이름은 파일명이 아니라 frontmatter의 `name:` 값입니다):
  - `nextjs-supabase-expert`(`dev/nextjs-supabase-developer.md`) — Next.js+Supabase 기능 구현
  - `ui-markup-specialist`(`dev/ui-markup-specialist.md`) — 정적 마크업/스타일링
  - `nextjs-app-developer`(`dev/nextjs-app-developer.md`) — 라우팅/레이아웃 구조
  - `code-reviewer`(`dev/code-reviewer.md`), `development-planner`(`dev/development-planner.md`, `docs/roadmap/ROADMAP_mvp.md`·`docs/ROADMAP_v1.md` 관리), `starter-cleaner`(`dev/starter-cleaner.md`), `notion-api-database-expert`(`dev/notion-api-database-expert.md`)
  - `prd-generator`, `prd-validator`(`docs/`)
- `.claude/commands/git/`에 `commit`, `pr`, `merge`, `branch`, `update-roadmap` 슬래시 커맨드가 정의되어 있습니다.
