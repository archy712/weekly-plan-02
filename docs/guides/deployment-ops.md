# 배포 및 운영 가이드

이 문서는 로컬 개발이 끝난 뒤 프로덕션에 배포하고, 배포 이후 반복적으로 필요한 운영 작업(관리자 지정, 부서 관리)을 수행하는 절차를 정리합니다. Vercel 대시보드, Supabase 대시보드, Google Cloud Console 접근 권한이 있는 사람이 직접 수행해야 하는 단계이므로, Claude Code가 자동으로 실행하지 않습니다.

## 1. Vercel 배포

1. [Vercel 대시보드](https://vercel.com/new)에서 이 GitHub 저장소(`archy712/weekly-plan-02`)를 Import합니다. 프레임워크는 Next.js가 자동 감지되며, 빌드 명령(`next build`)·설치 명령(`npm install`)은 `package.json` 기본값을 그대로 사용하면 됩니다.
2. **Project Settings → Environment Variables**에 아래 두 값을 등록합니다. `.env.local`에 있는 값과 동일하며, Production/Preview/Development 세 환경 모두에 등록하는 것을 권장합니다(프리뷰 배포에서도 로그인 흐름을 테스트할 수 있도록).
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

   값이 없으면 `lib/utils.ts`의 `hasEnvVars`가 `false`가 되어 앱이 튜토리얼/경고 모드로 폴백합니다(CLAUDE.md 참고).
3. 배포 후 발급된 도메인(`*.vercel.app` 또는 연결한 커스텀 도메인)을 다음 단계에서 사용합니다.

## 2. Supabase Auth 프로덕션 도메인 등록

Supabase 대시보드 → **Authentication → URL Configuration** (프로젝트: `ybhluyzkmpjmrxyhkolt`, https://ybhluyzkmpjmrxyhkolt.supabase.co)에서:

1. **Site URL**을 프로덕션 도메인(예: `https://weekly-plan-02.vercel.app`)으로 설정합니다.
2. **Redirect URLs**에 아래를 추가합니다(기존 `http://localhost:3000/**`은 로컬 개발용으로 유지):
   - `https://<프로덕션 도메인>/auth/callback` (구글 OAuth 콜백, `app/auth/callback/route.ts`)
   - `https://<프로덕션 도메인>/auth/confirm` (이메일 OTP 확인, `app/auth/confirm/route.ts`)
   - `https://<프로덕션 도메인>/auth/update-password` (비밀번호 재설정 흐름)
   - Vercel 프리뷰 배포도 테스트하려면 `https://*.vercel.app/**` 와일드카드 추가를 고려하세요.

## 3. Google OAuth 리다이렉트 설정

[Google Cloud Console](https://console.cloud.google.com/apis/credentials) → 해당 OAuth 2.0 클라이언트 ID에서:

- **승인된 JavaScript 원본**에 프로덕션 도메인(`https://<프로덕션 도메인>`)을 추가합니다.
- **승인된 리디렉션 URI**는 Supabase 콜백(`https://ybhluyzkmpjmrxyhkolt.supabase.co/auth/v1/callback`) 하나만 있으면 됩니다 — Task 009에서 이미 등록했으므로 도메인이 바뀌어도 추가 작업이 필요 없습니다(리다이렉트가 Supabase를 거쳐 앱으로 오기 때문).

## 4. 관리자 계정 지정 절차

**일상적인 관리자 지정은 이제 UI로 처리합니다** — v1 고도화(`docs/ROADMAP_v1.md`의 F020·Task 028)에서 사용자 관리 화면(`/protected/admin/users`)이 구현되어, 관리자가 목록/상세의 역할 Select로 다른 사용자를 `admin`으로 승격·강등할 수 있습니다(재로그인 없이 즉시 반영). 아래 수동 SQL 절차는 이제 **시스템에 관리자가 한 명도 없는 최초 부트스트랩 상황**에서만 필요합니다 — 사용자 관리 화면은 관리자 계정으로 로그인해야 접근할 수 있고 본인 역할은 UI로 변경할 수 없어(자기 강등 방지), 첫 관리자는 직접 DB 접속으로 지정해야 하기 때문입니다.

Supabase 대시보드의 **SQL Editor**(또는 `mcp__supabase__execute_sql`)에서 수동으로 `role`을 변경합니다.

> `profiles.role`에는 앱(PostgREST) 경로로 들어오는 **인증된 일반 사용자의 자기 role 상승만** 차단하는 `BEFORE UPDATE` 트리거(`prevent_unauthorized_role_change()`)가 적용되어 있습니다. `auth.uid()`가 없는 연결(SQL Editor, `mcp__supabase__execute_sql` 등 직접 DB 접속)은 이 트리거의 검사 대상이 아니므로 아래 절차는 그대로 동작합니다 — 앱의 로그인 세션으로 같은 SQL을 실행하려 하면(예: 브라우저 콘솔에서 `supabase-js` 호출) 관리자가 아닌 한 차단됩니다.

```sql
update profiles
set role = 'admin'
where email = '관리자로_지정할_이메일@example.com'
returning id, email, role;
```

- 대상 사용자가 먼저 회원가입 후 부서를 선택해 `profiles` 행이 생성되어 있어야 합니다(`handle_new_user` 트리거가 가입 시 자동 생성).
- 관리자 권한은 다음 요청부터 즉시 반영됩니다(`profiles.role`을 매 요청 조회하는 구조, Task 010 참고). 별도 로그아웃/로그인이 필요 없습니다.
- 해제할 때는 `role = 'user'`로 되돌리면 됩니다.

### 4-1. 최초 슈퍼관리자 부트스트랩

`role`을 `superadmin`으로 지정하는 UI(사용자 관리 화면의 역할 Select, `docs/ROADMAP_v1.md` F033)는 이미 있지만, **자기 자신의 역할은 앱에서 절대 변경할 수 없도록 서버 액션에 명시적으로 차단**되어 있어(`lib/actions/user-admin.ts`의 `userId === auth.callerId` 체크, 관리자 수와 무관하게 항상 적용) 시스템에 슈퍼관리자가 한 명도 없는 최초 상태에서는 **어떤 관리자도 UI로 자기 자신을 슈퍼관리자로 승격할 수 없습니다**(다른 관리자를 승격시키는 것은 UI로 가능). 이 경우 위 4절과 동일하게 직접 DB 접속으로 부트스트랩합니다:

```sql
update profiles
set role = 'superadmin'
where email = '슈퍼관리자로_지정할_이메일@example.com'
returning id, email, role;
```

- 대상은 **이미 `role = 'admin'`이어야** 합니다 — `prevent_unauthorized_role_change()` 트리거가 `user → superadmin` 직접 승격은 직접 DB 접속에서도 차단합니다(`auth.uid()` 유무와 무관한 검사).
- 이후 두 번째 이상의 슈퍼관리자·관리자 지정은 이 수동 절차 없이 사용자 관리 화면에서 처리하면 됩니다(이미 슈퍼관리자가 된 계정, 또는 다른 관리자가 대상을 승격).

## 5. 부서 관리 절차

**부서 관리도 이제 UI로 처리합니다** — v1 고도화(`docs/ROADMAP_v1.md`의 F019·Task 027)에서 관리자 콘솔의 부서 관리 화면(`/protected/admin/departments`)이 구현되어, 관리자가 자기 소속 조직의 부서를 추가·이름 변경·비활성화(소프트 삭제, `archived_at`)할 수 있습니다. 참조(부서원 또는 `weekly_logs`)가 있는 부서는 하드 삭제 버튼이 자동으로 비활성화되고 비활성화만 허용되며, 비활성 부서는 신규 선택 목록(프로필/회원가입)에서만 제외되고 과거 데이터 조회·목록 필터에는 계속 노출됩니다. 슈퍼관리자는 전 조직의 부서를 관리할 수 있습니다.

따라서 아래 수동 SQL 절차는 이제 **일상 운영에서는 필요하지 않고**, 초기 부트스트랩이나 UI로 다루기 어려운 예외 상황에서만 참고합니다. 조직 계층(F027)이 도입되며 `departments.organization_id`가 **NOT NULL FK**가 되었으므로, 부서를 직접 INSERT할 때는 반드시 소속 조직 id를 함께 지정해야 합니다(생략하면 제약 위반으로 실패).

```sql
-- 부서 추가 (organization_id 필수)
insert into departments (name, organization_id)
values ('신규부서명', '<organization-id>');

-- 부서명 변경 (기존 weekly_logs·profiles의 department_id 참조는 유지됨)
update departments set name = '변경할이름' where id = '<department-id>';

-- 비활성화(소프트 삭제) / 다시 활성화 — UI 동작과 동일
update departments set archived_at = now() where id = '<department-id>';
update departments set archived_at = null where id = '<department-id>';
```

- 하드 삭제(`delete from departments ...`)는 `weekly_logs.department_id`/`profiles.department_id`가 `references departments(id)`로 걸려 있어 참조 중이면 FK 제약 위반으로 실패합니다 — 소프트 삭제(`archived_at`)를 기본으로 사용하세요.
- 부서 목록은 RLS상 인증된 사용자 전체가 SELECT할 수 있으므로, 추가/변경 즉시 프로필 온보딩·관리자 필터 드롭다운에 반영됩니다(재배포 불필요).

## 6. 프로덕션 스모크 테스트 체크리스트

배포 직후(1~2절 완료 후) 아래 흐름을 실제 프로덕션 도메인에서 한 번씩 확인합니다.

- [ ] 랜딩 페이지가 정상 렌더링되고 `EnvVarWarning`이 뜨지 않는지 (env 변수 정상 등록 확인)
- [ ] 이메일 회원가입 → 인증 메일 수신 → 인증 링크 클릭 → 로그인
- [ ] 구글 로그인(`/auth/callback`으로 정상 리다이렉트되는지)
- [ ] 부서 선택 온보딩 → 목록 페이지 진입
- [ ] 주간업무일지 작성 → 목록에 노출
- [ ] 상세 페이지에서 완료 토글·수정·삭제
- [ ] PDF 다운로드(한글 깨짐 없는지)
- [ ] 관리자 계정으로 부서 필터 전환
- [ ] 로그아웃 → 보호 페이지 접근 시 로그인으로 리다이렉트

이 체크리스트는 실제 배포된 URL이 있어야 실행할 수 있습니다. 배포 후 도메인을 알려주시면 Playwright MCP로 함께 확인할 수 있습니다.

## 7. 알림(notifications) 보존 정책

멘션·댓글·대댓글 발생 시 `notifications` 테이블에 알림이 자동 생성됩니다(`docs/ROADMAP_v1.md` Task 034, DB 트리거로만 생성되고 클라이언트 직접 INSERT는 불가능). 활동량에 비례해 무한히 쌓이는 테이블이라 보존 정책이 필요합니다. 이 프로젝트는 v2 Task 044(F041)에서 `pg_cron`을 최초로 도입했으므로(9절 참고) 아래 절차를 잡으로 자동화하는 것도 가능하지만, **현재는 여전히 수동/주기적 실행**으로만 정책을 확정해둔 상태입니다(9절 "알림 보존 정책과의 관계" 참고).

**정책**: `read_at`이 채워진(읽은) 알림 중 **90일이 지난 것만** 삭제합니다. **읽지 않은 알림은 아무리 오래돼도 삭제하지 않습니다** — 사용자가 아직 확인하지 못한 알림을 시간 경과만으로 지우면 알림 시스템의 목적(놓친 멘션·댓글을 알려주는 것) 자체가 훼손되기 때문입니다.

```sql
delete from notifications
where read_at is not null
  and read_at < now() - interval '90 days';
```

- 이 SQL은 Supabase 대시보드 SQL Editor 또는 `mcp__supabase__execute_sql`로 직접 실행합니다. `read_at`/`recipient_id`만 변경 가능한 컬럼 보호 트리거(`prevent_unauthorized_notification_update()`)는 UPDATE만 검사하고 DELETE는 막지 않으므로, 직접 DB 접속(`auth.uid()`가 없는 연결)에서는 별도 우회 없이 그대로 동작합니다.
- 실행 주기는 매월 1회 정도를 권장합니다(트래픽이 많지 않은 초기 단계 기준, 필요시 조정). 향후 실행 빈도가 잦아지거나 수동 실행을 잊는 문제가 생기면 Supabase의 `pg_cron` 확장(`mcp__supabase__list_extensions`로 설치 여부 확인 가능)으로 이 DELETE 문을 스케줄링하는 것을 검토하세요 — 이번 Task 034 범위에서는 구현하지 않고 절차 문서화까지만 수행했습니다.
- 삭제 대상 건수를 먼저 확인하고 싶다면 `delete` 대신 `select count(*) from notifications where read_at is not null and read_at < now() - interval '90 days';`로 미리 조회한 뒤 실행하세요.

## 8. 성능 점검 절차 및 결과 (Task 039, F032)

MVP 이후 누적된 애플리케이션 전반의 성능을 **실측 기반**으로 점검한 결과입니다. 원칙은 "측정 먼저, 최적화는 그다음, 효과가 측정된 변경만 반영"입니다. 재점검 시 아래 방법을 그대로 재현하세요.

### 측정 방법 (재현용)

- **DB 쿼리**: `mcp__supabase__execute_sql`로 `explain (analyze, buffers) <쿼리>` 실행. 어드바이저는 `mcp__supabase__get_advisors`(`performance`/`security`).
- **라우트별 client JS**: Turbopack 빌드는 라우트별 First Load JS 표를 출력하지 않으므로, `.next/server/app/<route>/page_client-reference-manifest.js`에서 참조하는 `static/chunks/*.js` 파일 크기를 합산해 비교한다(청크 집합 diff로 특정 라이브러리 편입 여부 판별).
- **정적 자산 헤더**: `npm run start` 후 `curl -sI <url>`로 응답 헤더 실측.

### 적용한 개선 (측정된 것만)

1. **서버 컴포넌트 DB 왕복 병렬화** — 목록(`app/protected/weekly-logs/page.tsx`)의 댓글수·추천비추천·작성자 신원·부서 목록 4개 독립 2차 조회와, 상세(`weekly-logs/[id]/page.tsx`)의 첨부·댓글·추천비추천·업무타입 4개 조회를 각각 순차 `await`에서 `Promise.all` 1배치로 전환. 쿼리 자체는 현재 규모(weekly_logs 318건, 전체 목록 `EXPLAIN` 0.94ms)에서 이미 sub-ms라 병목은 실행시간이 아니라 **순차 왕복 횟수**였음.
2. **`getCurrentProfile` 요청 단위 메모이즈** — `lib/auth/require-admin.ts`를 React `cache()`로 감싸 관리자 콘솔에서 레이아웃 가드와 각 페이지가 각각 호출하던 `profiles` 조회(요청당 2회)를 1회로 축소. `cache()`는 요청 스코프라 교차 사용자 누수 없음.
3. **상세 라우트 편집 폼 지연 로딩** — `weekly-log-detail-view.tsx`의 `WeeklyLogForm`(→ Tiptap 에디터)을 `next/dynamic(ssr:false)`로 전환해 "수정" 클릭 시점에만 로드. 상세 라우트 client JS **1090KB → 611KB(-479KB, ~44%)**, 목록 라우트(550KB) 수준으로 하락.
4. **PDF 한글 폰트 정적 자산 최적화** — (a) `lib/pdf/weekly-log-pdf.ts`에서 폰트 base64를 모듈 레벨로 메모이즈(세션 내 반복 다운로드 시 2.5MB 재fetch·재변환 제거), (b) `next.config.ts` `headers()`로 `/fonts/*`에 `public, max-age=31536000, immutable` 부여, (c) `proxy.ts` matcher에 `ttf|woff|woff2|otf` 추가해 폰트가 `updateSession`을 거치지 않고 정적 서빙되게 함. 실측: 폰트 응답이 `307`(proxy 리다이렉트) → `200 OK` + immutable 캐시.

### 확인만 하고 변경 없음 (누수 없음)

- **jsPDF·exceljs**: `await import(...)` 동적 로딩이라 초기 번들 미포함.
- **recharts**: `dashboard-*-chart` → `components/ui/chart.tsx`에서만 참조되어 대시보드 라우트로 코드 스플릿(목록/상세 미포함).
- **Tiptap**: 작성(new)·상세(detail) 라우트에만 존재. 읽기 전용 렌더러 `html-content.tsx`는 Tiptap을 import하지 않음(목록 라우트에 에디터 미편입).

### 기각/의도된 설계로 분류 (근거 기록 — 반복 방지)

- **목록 서버사이드 페이지네이션**: 현재 목록은 `LIMIT` 없이 필터 결과 전체를 로드하고 클라이언트가 정렬·슬라이스(`PAGE_SIZE=20`)한다. 318건 0.94ms라 현재 무해하나, 10배(3천)·100배(3만)에서는 페이로드와 2차 조회가 함께 커진다. 서버 페이지네이션은 정렬·검색(title/content 병합)·페이지네이션 의미를 전부 서버로 옮기는 아키텍처 변경이라 회귀 위험이 크고 Task 039 범위 밖("아키텍처 재작성 수준 리팩터링" 제외). **weekly_logs가 수천 건대에 진입하면 그때 별도 Task로 착수**를 권장. PDF/Excel 다운로드가 필터 결과 전체를 한 번에 불러오는 구조도 동일 시점에 재검토.
- **미인덱스 FK 3종**(`weekly_log_attachments.department_id`·`.uploaded_by`, `weekly_log_reactions.user_id`): 조회 핫패스는 `weekly_log_id` 선두 인덱스/`unique(weekly_log_id, user_id)`가 이미 커버한다. 단독 인덱스는 부서/프로필 삭제 시 CASCADE 스캔(희소한 관리 작업)에만 이득이고, 특히 reactions는 토글이 잦은 쓰기 핫패스라 인덱스 쓰기 오버헤드 > 이득. **인덱스 추가 안 함(의도된 설계)** — 어드바이저 performance INFO는 baseline 유지.
- **`departments_organization_id_idx` 미사용**: 향후 조직 필터링 대비 유지(무해).
- **관리자 부서 페이지의 부서별 N×2 count 쿼리**: 부서 8건 규모에서 이미 `Promise.all` 병렬. 사내 도구 규모에서 허용.

### 회귀 검증

- `npm run build` green, `npx tsc --noEmit` 0오류. 미인증 보호 경로 → `/auth/login` 307 리다이렉트 유지(proxy matcher 변경이 인증을 깨지 않음 실측).
- **인증 계정이 필요한 전 플로우 Playwright E2E 회귀와 2계정 교차 사용자 누수 확인은 6절 프로덕션 스모크와 동일하게 사용자 작업으로 대기** — 배포 도메인 또는 테스트 로그인을 제공하면 Playwright MCP로 함께 수행 가능.

## 9. `pg_cron` 잡 운영 (Task 044, F041)

이 프로젝트 최초로 `pg_cron` 확장을 사용하는 기능(정기 작성 리마인더)이 도입됐습니다. `cron.schedule()` 호출은 테이블·함수 마이그레이션과 달리 로컬 `supabase/migrations/`나 `mcp__supabase__list_migrations` 이력에 코드로 남지 않고 **DB 내부 `cron.job` 테이블에만 존재**하므로, 이 문서가 사실상 유일한 기록입니다.

**⚠️ 이 Supabase 프로젝트는 ERP 성격의 다른 애플리케이션과 공유 중입니다.** `pg_cron`은 데이터베이스 전역 확장이므로, 새 잡을 등록/수정/삭제하기 전에는 항상 아래 조회로 기존 잡과 이름·시각이 충돌하지 않는지 먼저 확인하세요.

### 등록된 잡

| jobname | schedule (UTC) | KST 환산 | 명령 | 목적 |
|---|---|---|---|---|
| `weekly_log_reminder` | `0 6 * * 5` (매주 금요일 06:00) | 매주 금요일 15:00 | `select public.create_weekly_log_reminders()` | 이번 주(월~일)와 기간이 겹치는 로그가 하나도 없는 사용자에게 `notifications`(`type='reminder'`) 생성. 수신자는 `department_id`가 있고 `notify_on_reminder=true`이며 `is_active=true`(ERP 로그인 허용 계정)인 사람으로 한정 |

### 조회·점검

```sql
-- 등록된 잡 목록(다른 도메인 잡과의 충돌 확인용으로도 사용)
select jobid, jobname, schedule, command, active from cron.job order by jobid;

-- 최근 실행 이력(성공/실패, 반환 메시지)
select jobid, runid, status, return_message, start_time, end_time
from cron.job_run_details
order by start_time desc
limit 20;
```

- `status`가 `failed`인 행이 있으면 `return_message`로 원인을 확인합니다. `create_weekly_log_reminders()`는 `SECURITY DEFINER`이고 `anon`/`authenticated`에는 EXECUTE 권한이 없으므로, 실패는 대개 권한 문제가 아니라 제약 위반입니다.
- 정상 동작이면 매주 금요일 06:00 UTC 직후 `runid`가 증가하는 `succeeded` 행이 쌓입니다.

### 재등록·중단 절차

```sql
-- 잡을 삭제하지 않고 일시 중단
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'weekly_log_reminder'),
  active := false
);

-- 재개
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'weekly_log_reminder'),
  active := true
);

-- 완전 삭제
select cron.unschedule('weekly_log_reminder');

-- 재등록(발송 요일·시각을 바꿀 때도 동일 — 같은 jobname으로 다시 호출하면 기존 잡을 대체)
select cron.schedule(
  'weekly_log_reminder',
  '0 6 * * 5',
  $$select public.create_weekly_log_reminders()$$
);
```

- **수동으로 즉시 실행**하려면 `select public.create_weekly_log_reminders();`을 직접 호출하세요. 과거/특정 주를 대상으로 하려면 `select public.create_weekly_log_reminders('2026-08-10'::date);`처럼 그 주의 월요일 날짜를 `target_week_start`로 명시적으로 넘기면 됩니다. `anon`/`authenticated`에는 EXECUTE 권한이 없으므로 반드시 `mcp__supabase__execute_sql`(또는 Supabase 대시보드 SQL Editor)로 실행해야 합니다.
- 같은 주에 여러 번 실행해도 `notifications_recipient_period_start_unique` 부분 유니크 인덱스(`(recipient_id, period_start) where type='reminder'`)와 `on conflict do nothing`이 사용자당 1건으로 막아주므로 안전합니다.

### 알림 보존 정책(7절)과의 관계

7절의 "읽은 알림 90일 경과분 삭제"는 여전히 **수동 실행**입니다. `pg_cron`이 이제 설치되어 있으므로 이 DELETE 문도 별도 잡(예: `weekly_log_notification_cleanup`이라는 다른 jobname)으로 등록해 자동화할 수 있지만, Task 044 범위에서는 리마인더 잡만 등록했습니다. 자동화가 필요해지면 위 "등록된 잡" 절의 패턴을 그대로 따라 새 잡을 추가하세요(잡 이름 접두사 `weekly_log_`를 유지해 공유 DB의 다른 도메인 잡과 구분할 것).
