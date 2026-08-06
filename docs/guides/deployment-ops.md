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

관리자 지정 UI는 MVP 범위 밖이므로, Supabase 대시보드의 **SQL Editor**(또는 `mcp__supabase__execute_sql`)에서 수동으로 `role`을 변경합니다. v1 고도화에서 UI로 대체될 예정이나(`docs/ROADMAP_v1.md`의 F020·Task 028 참고) 아직 구현 전이므로 이 수동 절차가 현재 유일한 방법입니다.

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

## 5. 부서 seed 데이터 운영 반영 절차

부서 관리 UI도 MVP 범위 밖입니다(v1에서 F019·Task 027로 대체될 예정, `docs/ROADMAP_v1.md` 참고). Task 008 마이그레이션으로 초기 부서를 시드했고 현재 운영 중인 부서는 3개(Commerce시스템팀/ERP시스템팀/IT기획팀, 2026-08-05 기준)이며, 이후 조직 개편으로 부서를 추가·변경해야 하면 SQL Editor에서 직접 처리합니다.

```sql
-- 부서 추가
insert into departments (name) values ('신규부서명');

-- 부서명 변경 (기존 weekly_logs·profiles의 department_id 참조는 유지됨)
update departments set name = '변경할이름' where id = '<department-id>';
```

- 부서 삭제는 권장하지 않습니다 — `weekly_logs.department_id`/`profiles.department_id`가 `references departments(id)`로 걸려 있어 참조 중인 부서를 지우면 FK 제약 위반으로 실패합니다. 더 이상 쓰지 않는 부서는 이름 뒤에 `(사용중지)` 등을 붙여 구분하는 방식을 권장합니다.
- 부서 목록은 `departments` 테이블을 RLS 정책상 인증된 사용자 전체가 SELECT할 수 있으므로, 추가 즉시 프로필 온보딩·관리자 필터 드롭다운에 반영됩니다(재배포 불필요).

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
