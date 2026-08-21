# 부서별 주간업무일지 관리 v2 고도화 로드맵

기록·협업 플랫폼으로 완성된 v1을 **"쓰는 사람이 덜 힘들고, 놓치지 않고, 되짚을 수 있는"** 운영 도구로 다듬는다.

> **배경**: 이 로드맵은 사용자의 "현재 코드베이스를 살펴보고 개선/추가하면 좋을 기능을 제안해달라"는 요청에서 출발했습니다. 코드베이스와 원격 DB를 실측 검토해 8건을 제안했고 사용자가 **8건 모두 구현**을 승인해 v2 범위로 확정했습니다.

## 개요

v2는 v1(`docs/roadmap/ROADMAP_v1.md`, F019~F039 전부 구현 완료)과 달리 PRD에 미리 적혀 있던 "MVP 이후 기능"이 아니라, **완성된 제품을 실제로 써보며 드러난 빈틈**에서 도출된 8건입니다. 세 갈래로 나뉩니다 — (1) 개인 사용자가 잃어버린 것을 되찾기, (2) 알림 인프라를 트리거 밖으로 확장, (3) 목록 탐색 폴리시.

### 우선순위 높음

- **[F040] "내 업무" 개인 요약 위젯**: 주간업무일지 목록 상단에 본인 담당 업무의 **지연 / 이번 주 마감 / 진행중** 건수를 보여주는 미니 요약. F024 대시보드가 ad hoc 전환으로 관리자 전용(`/protected/admin/dashboard`)이 되면서 **일반 사용자는 자기 현황을 한눈에 볼 곳이 완전히 사라진** 상태를 메운다.
- **[F041] 정기 작성 리마인더**: "**주간**"업무일지인데 정기 제출을 유도하는 장치가 전혀 없다. 이번 주 로그를 작성하지 않은 사용자에게 알림을 보낸다. **이 프로젝트 최초의 `pg_cron` 도입**이며, 동시에 "알림은 오직 DB 트리거로만 생성된다"는 v1의 원칙에 **스케줄 기반이라는 두 번째 경로**를 추가하는 작업이다.
- **[F042] 작성 중 임시저장(draft)**: Tiptap 리치텍스트 + 첨부파일이 결합된 긴 작성 폼인데 새로고침·실수 이탈 시 복구 수단이 0이다. `localStorage`에 debounce 자동 저장 + 재진입 시 복원 배너. **첨부파일(File 객체)은 직렬화 불가라 명시적으로 범위 밖.**

### 중간 우선순위

- **[F043] 상태·업무타입·중요도 변경 이력**: 상세 페이지에서 이 3개 속성을 전부 **낙관적 업데이트로 즉시 인라인 저장**하는데(`components/weekly-log-detail-view.tsx`) 누가 언제 무엇을 바꿨는지 흔적이 전혀 남지 않는다. **간단 이력 테이블 1개 + 상세 페이지 접이식 섹션**으로 스코프를 좁힌 최소 버전(풀 감사로그 시스템 아님).
- **[F044] 알림 구독 설정**: 현재 댓글·멘션은 발생하면 **무조건** 알림이다. 조직 규모가 커질수록 피로도가 쌓인다. `profiles`에 유형별 on/off 컬럼을 두고 트리거가 이를 확인하게 한다. F041과 함께 설계해 알림 유형이 3종(댓글·멘션·리마인더)이 되는 것을 **스키마 한 번에** 반영한다.

### 낮은 우선순위 / 폴리시

- **[F045] 필터 프리셋 저장**: 목록·칸반 모두 필터가 URL 쿼리로 남지만 자주 쓰는 조합("내 부서 + 진행중")을 저장해두는 수단이 없다. `localStorage` 기반 사용자별 프리셋.
- **[F046] 검색 결과 하이라이팅**: 제목/내용 키워드 검색 시 매칭 텍스트를 목록·카드에서 `<mark>`로 강조.
- **[F047] 캘린더/타임라인 뷰**: 방금 완성된 칸반보드에 이은 자연스러운 다음 확장(시작일~목표종료일 기반 타임라인). **비용 대비 우선순위가 가장 낮아 마지막 Phase로 배치하며, 착수 전 사용자 확인을 거쳐 "범위 밖 유지"로 종료할 수 있는 유일한 Task다.**

---

## 현재 코드베이스 상태 (착수 전 실측)

이 로드맵은 **2026-08-21 기준**으로 원격 Supabase(`ybhluyzkmpjmrxyhkolt`)와 로컬 소스를 직접 조회해 작성했습니다. 아래 항목은 **계획 수립의 전제**이므로 착수 전 반드시 재확인하세요.

### 이미 구현되어 재사용 가능한 것

| 항목 | 위치 | v2에서의 활용 |
|------|------|--------------|
| 알림 인프라 일체 (테이블·RLS·Realtime publication·구독 훅·헤더 벨) | `notifications`, `hooks/use-notifications.ts`, `components/notification-bell.tsx`, `lib/queries/notifications.ts` | F041 리마인더는 **새 알림 유형 1종만 추가**하면 배달·읽음처리·실시간 갱신이 전부 공짜. F044는 이 파이프라인 앞단에 게이트만 끼움 |
| `stats_*` 집계 RPC 7종 (`SECURITY INVOKER` + `org_id uuid DEFAULT NULL` 관례) | `stats_logs_by_department/status/work_type/importance`, `stats_logs_monthly_trend`, `stats_workload_summary`, `stats_reactions_summary` | F040 요약 RPC를 **동일 컨벤션**(`language sql stable security invoker set search_path=''`, `anon` EXECUTE 회수)으로 1종 추가 |
| 필터 정규화·적용 공용 헬퍼 | `lib/queries/weekly-logs.ts`의 `normalizeWeeklyLogFilters()` / `applyScalarFilters()` / `countWeeklyLogs()` | 목록·칸반이 **이미 같은 함수를 공유**. F040의 `author` 파라미터, F045 프리셋이 두 화면에 자동 반영됨 |
| 낙관적 업데이트 패턴 (즉시 반영 → 실패 시 롤백 + `sonner` 토스트) | `weekly-log-detail-view.tsx`, `user-role-select.tsx`, `weekly-log-reaction-buttons.tsx` | F044 설정 토글에 그대로 재사용 |
| React Hook Form + Zod 프로필 폼 | `components/profile-form.tsx`, `lib/schemas/profile.ts` | F044 알림 설정 3종을 **기존 프로필 폼의 필드로** 추가(신규 화면 불필요) |
| `get_profile_identities(uuid[])` RPC | DB `SECURITY DEFINER` 함수 | F043 이력의 "변경자" 표시에 필수 — `profiles_select_own_or_admin` 때문에 embed로는 타인 신원을 못 가져옴 |
| `SortableTableHead` / 무한 스크롤 / 총 건수(count) 구조 | `components/weekly-log-list-view.tsx`, `components/sortable-table-head.tsx` | F040 위젯을 목록 상단에 얹고, F046 하이라이팅을 테이블·카드 양쪽에 적용하는 지점 |
| 칸반 "지연" 계산 로직 | `components/weekly-log-kanban-column.tsx:71` — `status !== "completed" && item.target_end_date < todayIso` | **F040의 "지연" 정의를 이것과 반드시 동일하게** 맞춘다(아래 갭 절의 타임존 주의 참고) |
| `escapeLikePattern()` + 컬럼별 `ilike` 병합 검색 | `lib/utils.ts`, `lib/queries/weekly-logs.ts` | F046 하이라이팅이 **같은 매칭 규칙**을 클라이언트에서 재현해야 하는 근거 |
| 컬럼 보호 `BEFORE UPDATE` 트리거 패턴 | `prevent_unauthorized_role_change()`, `prevent_unauthorized_notification_update()` | F043 이력 테이블의 "트리거로만 기록" 설계에 동일 컨벤션 적용 |
| shadcn/ui 프리미티브 22종 | `components/ui/` | `dialog`·`select`·`form`·`slider`·`progress`·`sheet` 등 대부분 확보 |

### 반드시 해소해야 하는 갭 (실측으로 확인됨)

- **🚨 `pg_cron`이 설치되어 있지 않음 (F041 최대 리스크)**: `list_extensions` 결과 `pg_cron`은 `default_version: 1.6.4`로 **사용 가능하지만 `installed_version: null`** — 즉 아직 설치 전입니다. `docs/guides/deployment-ops.md` 7절도 "이 프로젝트는 아직 정기 실행 인프라(pg_cron 등)를 도입하지 않았으므로 자동 정리는 구현하지 않는다"고 명시합니다. **v1의 "Realtime 최초 도입"과 동일한 성격의 인프라 리스크**이므로 아래 리스크 표에서 별도로 다룹니다.
- **🚨 `notifications` 스키마가 리마인더를 담을 수 없음 (F041 선행 차단 항목)**: 실측한 컬럼 제약이 전부 "댓글 알림 전용"으로 굳어 있습니다.

  | 제약 | 현재 값 | 리마인더에서의 문제 |
  |------|---------|---------------------|
  | `actor_id uuid` | **NOT NULL** → `profiles(id)` | 스케줄 알림에는 "행위자"가 없음 |
  | `weekly_log_id uuid` | **NOT NULL** → `weekly_logs(id)` | 리마인더는 "아직 없는 로그"에 대한 알림이라 대상 로그가 없음 |
  | `notifications_type_check` | `type IN ('mention','comment','reply')` | `'reminder'` 추가 필요 |
  | `notifications_recipient_comment_unique` | `UNIQUE (recipient_id, comment_id)` | **`comment_id`가 NULL이면 Postgres는 NULL을 서로 구별하므로 중복 억제가 전혀 동작하지 않음.** 댓글 알림의 중복 방지를 그대로 물려받을 수 없고 **별도 dedupe 키가 필요** |

  또한 `enrichNotifications()`(`lib/queries/notifications.ts`)의 `RawNotificationRow`가 `weekly_log_id: string`(non-null)로 타입되어 있고 `notificationHref()`(`components/notification-bell.tsx:63`)가 항상 `/protected/weekly-logs/{weekly_log_id}`를 만들므로, **nullable로 바꾸는 즉시 두 곳이 컴파일 에러로 드러납니다**(의도된 안전장치 — 타입 재생성 후 반드시 함께 수정).
- **알림 수신 설정 컬럼이 전무**: `profiles` 실측 컬럼은 `id, email, department_id, role, created_at, updated_at, phone_number, avatar_key, bio, name, is_active` — 알림 관련 컬럼이 **0개**. F044는 컬럼 추가부터 시작합니다.
- **`profiles.is_active`가 소스 어디에서도 참조되지 않음**: DB에는 `boolean NOT NULL DEFAULT true`로 존재하지만 `app/`·`components/`·`lib/` 전체 grep 결과 **사용처 0건**입니다(이 Supabase 프로젝트를 공유하는 다른 도메인이 추가한 것으로 보임 — 아래 항목 참고). F041이 리마인더 수신자를 고를 때 이 컬럼을 존중할지 여부는 **결정 항목**입니다.
- **⚠️ 이 Supabase 프로젝트는 다른 애플리케이션과 공유 중**: `list_tables` 결과 주간업무일지 도메인(`departments`/`profiles`/`weekly_logs`/`weekly_log_*`/`organizations`/`work_types`/`notifications`) 외에 **ERP 성격의 테이블 19종**(`menus`, `user_menu_permissions`, `companies`, `brands`, `products`, `org_*` 등)이 함께 있고, 테이블 주석이 이 저장소에 없는 `docs/roadmap/ROADMAP_MASTER.md`를 가리킵니다. → **신규 마이그레이션 이름·함수명·`cron.job` 이름이 다른 도메인과 충돌하지 않도록** 접두사를 신중히 고를 것(예: `weekly_log_` / `create_weekly_log_reminders`). 특히 `pg_cron`은 데이터베이스 전역 자원이라 **다른 도메인이 이미 쓰고 있는지 `cron.job`을 먼저 확인**해야 합니다.
- **`localStorage`/`sessionStorage` 사용처 0건**: `app/`·`components/`·`lib/`·`hooks/` 전체 grep 결과 **단 한 건도 없습니다.** F042(임시저장)가 이 프로젝트 최초의 브라우저 스토리지 도입이고 F045(프리셋)가 두 번째이므로, **Task 041에서 정하는 키 네이밍·직렬화·`try/catch`·SSR 접근 금지 규약이 이후 모든 스토리지 사용의 표준**이 됩니다.
- **변경 이력을 담을 테이블이 없음**: `weekly_logs`에는 `updated_at`만 있고, 이 값은 상태 변경이 아닌 다른 필드 수정에도 갱신되어 **어느 속성이 언제 바뀌었는지 복원 불가능**합니다(v1 Task 030이 `completed_count` 산정 시 이미 겪은 문제 — 그래서 `target_end_date`를 근사치로 썼음). F043은 신규 테이블부터 시작합니다.
- **`stats_*` RPC 7종에 `author_id` 파라미터가 없음**: 전부 `(from_date, to_date, [dept_id,] org_id)` 시그니처로 **조직/부서 축만** 지원합니다(대시보드가 관리자용이라 개인 축이 필요 없었음). F040은 개인 축 집계를 새로 만들어야 합니다.
- **목록 필터에 "내 업무" 축이 없음**: `WeeklyLogsSearchParams`는 `department/q/status/from/to/sort/dir` 7종뿐이고 `normalizeWeeklyLogFilters()`도 동일합니다. F040 위젯의 숫자를 클릭해 목록으로 넘어가려면 **`author` 축을 필터에 추가**해야 하며, 이때 **`applyScalarFilters()`가 목록 조회와 `countWeeklyLogs()` 양쪽에 공유되고 있으므로 한쪽만 고치면 "총 N건"이 어긋납니다**(F039에서 이미 겪은 함정).
- **목록 payload에 `content`가 없음**: `LOGS_SELECT`는 `id, title, start_date, target_end_date, status, department_id, author_id, created_at, departments(name)`뿐입니다. → **F046은 제목만 하이라이팅 가능**하고, 내용 스니펫을 보여주려면 payload를 키워야 하는데 이는 F032(성능 개선)와 정면으로 상충합니다(결정 항목).
- **`switch`·`collapsible` 프리미티브 미설치**: `components/ui/`에 22개가 있지만 F044 설정 토글용 `switch`와 F043 접이식 이력 섹션용 `collapsible`은 없습니다 → `npx shadcn@latest add`로 추가 필요(또는 기존 프리미티브 조합).
- **CLAUDE.md의 문서 경로가 실제와 불일치**: CLAUDE.md는 `docs/PRD.md`·`docs/ROADMAP_v1.md`를 참조하지만 실제 파일은 `docs/prd/PRD.md`·`docs/roadmap/ROADMAP_v1.md`입니다(v1 이후 디렉터리 재편). → Task 050 문서 갱신에서 함께 정정.
- **현재 데이터 규모 (2026-08-21 실측, v1 착수 시점 대비 약 2배)**: `organizations` 10건, `departments` 8건, `profiles` 65건, `weekly_logs` **325건**, `work_types` 11건, `weekly_log_comments` 8건, `weekly_log_comment_mentions` 1건, `notifications` 4건, `weekly_log_reactions` 7건, `weekly_log_attachments` 2건. → F040 요약 RPC와 F043 이력 테이블은 이 규모에서 인덱스 없이도 동작하지만, **이력은 인라인 편집마다 행이 쌓이는 유일한 테이블**이라 증가 속도를 별도로 봐야 합니다.

### 계획 수립 시 지켜야 할 아키텍처 제약 (CLAUDE.md 준수)

1. **DB 마이그레이션 → `mcp__supabase__generate_typescript_types`로 `lib/supabase/database.types.ts` 재생성 → 기능 구현** 순서 엄수. F040(RPC)·F041(알림 스키마+cron)·F043(이력 테이블)·F044(`profiles` 컬럼) 4건 전부 해당.
2. **RLS 정책은 테이블 생성 마이그레이션과 같은 Task에서 함께 처리.** RLS가 켜진 채 정책이 없으면 **에러가 아니라 조용한 0건 처리**입니다(v1 Task 026에서 `departments`로 실측). F043 이력 테이블은 "SELECT 정책은 반드시 만들고, 쓰기 정책은 의도적으로 만들지 않는다"(= `notifications` 관례)를 **명시적 설계로** 기록할 것.
3. **Supabase 클라이언트 3종 혼용 금지**: Client Component는 `lib/supabase/client.ts`, Server Component/Route Handler는 `await createClient()`(전역 저장 금지), proxy는 `lib/supabase/proxy.ts`. Realtime 구독은 브라우저 클라이언트만 가능.
4. **세션 확인은 `getUser()`가 아니라 `getClaims()`**(`data?.claims`). 단 역할·부서 같은 권한 판단은 항상 `profiles`를 DB에서 재조회.
5. **`lib/supabase/proxy.ts`의 쿠키 처리 로직 변경 금지.** v2에는 신규 공개 라우트가 없으므로 proxy를 건드릴 이유가 없습니다(F047이 신규 라우트를 추가하지만 보호 라우트라 예외 등록 불필요).
6. **`cacheComponents: true`** 활성. 사용자별 데이터에 `"use cache"`를 붙이지 말고 Suspense 경계로 처리하며, `searchParams`/`cookies()`를 Suspense 밖에서 `await`하지 말 것. **F040 위젯은 목록과 별도의 Suspense 경계**로 감싸 위젯 집계가 목록 스트리밍을 막지 않게 합니다.
7. **`middleware.ts`가 아니라 `proxy.ts`** (Next.js 16 명칭), request-time API(`cookies()`/`headers()`/`params`/`searchParams`)는 전부 `await`.
8. **`localStorage`는 오직 `useEffect` 안에서만 접근.** 렌더 중 접근하면 SSR 하이드레이션 불일치가 발생하며, 프라이빗 모드·스토리지 차단 브라우저에서는 접근 자체가 throw하므로 **모든 읽기/쓰기를 `try/catch`로 감쌉니다**(F042·F045 공통).
9. **HTML 본문은 저장·렌더링 양쪽에서 sanitize**(`lib/sanitize-html.ts`). F042가 `localStorage`에서 복원하는 `content`는 **브라우저 저장소에서 온 신뢰할 수 없는 입력**이므로 에디터에 주입하기 전 `sanitizeWeeklyLogContent()`를 한 번 더 통과시킵니다. F046 하이라이팅은 `dangerouslySetInnerHTML`을 쓰지 않고 **React 노드(`<mark>`)로 조립**합니다.
10. **알림은 클라이언트가 INSERT할 수 없다는 원칙 유지**(v1 Task 034). F041이 추가하는 것은 "스케줄 실행되는 `SECURITY DEFINER` 함수"라는 **서버 측 경로**이지 클라이언트 권한 완화가 아닙니다. `notifications`에 INSERT 정책을 추가하지 마세요.
11. **색상 토큰 추가 시** `app/globals.css`의 `:root`/`.dark`와 `tailwind.config.ts`의 `theme.extend.colors`를 **함께** 수정(v3 방식 HSL 하이브리드 유지). F040 위젯의 "지연" 강조색은 기존 `--destructive`, F046 `<mark>` 배경은 기존 `--warning` 계열 재사용을 우선 검토해 신규 토큰을 만들지 않는다.

---

## 개발 워크플로우

1. **작업 계획**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - 새로운 작업을 포함하도록 `ROADMAP_V2.md` 업데이트
   - 우선순위 작업은 마지막 완료된 작업 다음에 삽입

2. **작업 생성**
   - 고수준 명세서, 관련 파일, 수락 기준, 구현 단계 포함
   - API/비즈니스 로직 작업에는 "테스트 체크리스트" 섹션 필수 (Playwright MCP + Supabase MCP 시나리오)

3. **작업 구현**
   - 작업 파일의 명세서를 따라 구현
   - **DB 변경이 있는 Task는 반드시 `apply_migration` → `generate_typescript_types` → 애플리케이션 코드 순서**
   - API 연동 및 비즈니스 로직 구현 시 Playwright MCP로 실브라우저 테스트 수행
   - 각 단계 후 진행 상황 업데이트, 테스트 통과 확인 후 다음 단계 진행
   - 각 Task 완료 후 중단하고 추가 지시를 대기

4. **로드맵 업데이트**
   - 완료된 항목의 체크박스를 채우고 Task/Phase 제목에 ✅ 표시

### Phase 순서를 이렇게 정한 이유

| 순서 | 이유 |
|------|------|
| Phase 1(개인 생산성)이 먼저 | F040·F042는 **기존 RLS·권한 모델·알림 파이프라인을 전혀 건드리지 않는** 유일한 묶음이라 실패 리스크가 가장 낮고, 사용자가 가장 먼저 체감하는 두 건이다. F040이 추가하는 `author` 필터 축은 F045(프리셋)가 저장할 대상이므로 **Phase 4보다 반드시 앞서야** 프리셋을 두 번 손대지 않는다 |
| Phase 2(알림 확장)를 그다음 | F041·F044는 **같은 테이블(`notifications`)과 같은 트리거 2종을 동시에 건드린다.** 따로 진행하면 마이그레이션을 두 번 쓰고 트리거를 두 번 고쳐야 하므로, 스키마 확장을 **하나의 Task(042)로 합쳐** 유형 3종화와 수신 설정 컬럼을 한 번에 반영한 뒤 UI(043) → cron(044) 순서로 쌓는다. 가장 위험한 `pg_cron` 도입을 스키마가 확정된 뒤로 미루는 효과도 있다 |
| Phase 3(변경 이력)을 그다음 | F043은 신규 테이블 1개로 완결되어 다른 Phase와 **의존성이 전혀 없다.** Phase 2와 병렬 진행 가능하지만, 두 Phase 모두 `weekly-log-detail-view.tsx`를 수정하지 않는지 확인 후 병렬 여부를 결정한다(F043은 상세 페이지에 섹션을 추가하므로 F044와는 파일이 겹치지 않음) |
| Phase 4(목록 탐색 폴리시)를 뒤로 | F045·F046은 **DB 변경이 0건이고 순수 클라이언트 작업**이라 언제든 착수 가능하지만, F045는 Phase 1의 `author` 필터 축이 확정된 뒤여야 프리셋이 저장할 파라미터 집합이 최종형이 된다. F046은 완전히 독립이라 급하면 Phase 1과 병렬로 당겨도 된다 |
| Phase 5(타임라인 뷰)를 마지막 | F047은 v2에서 **비용 대비 우선순위가 가장 낮다고 사용자와 합의된 유일한 항목**이다. Phase 1~4가 끝난 시점에 실제 필요 여부를 재확인하고, 필요 없다면 **"범위 밖 유지"로 종료**한다 |
| Phase 6(통합 검증·마감)을 최후 | F041·F044가 알림 동작을 바꾸고 F040이 필터 축을 늘리므로, **v1까지 검증된 동작이 깨지지 않았음**을 증명해야 마감 가능하다. 특히 pg_cron은 배포 환경에서만 실제로 도는 유일한 코드라 마감 단계에서 별도 확인이 필요하다 |

**병렬 가능**: Phase 1 ↔ Phase 3, Phase 3 ↔ Phase 4(F046). **반드시 순차**: Phase 2 내부(042 → 043 → 044), Phase 1 → Phase 4(F045).

---

## 개발 단계

### Phase 1: 개인 생산성 회복 (F040 · F042)

> 목표: 일반 사용자가 **자기 업무 현황을 목록 진입 즉시 파악**하고, **작성하던 내용을 잃지 않는** 상태.
> **선행 조건**: 없음 (즉시 착수 가능). Phase 3와 병렬 진행 가능.

- **Task 040: "내 업무" 개인 요약 위젯 구현 (F040)** ✅
  - [x] **집계 방식 결정 (착수 첫 단계)** — 권장안 (A) 신규 RPC 1종 `stats_my_work_summary(...)`를 그대로 채택. 근거는 마이그레이션 `add_my_work_summary_stats_function`의 코드 주석에 남김(왕복 1회, 기존 `stats_*` 7종과 컨벤션 일치).
    - (A) **신규 RPC 1종 `stats_my_work_summary(...)`** ← **권장**. 왕복 1회로 3개 숫자를 모두 얻고, 기존 `stats_*` 7종과 컨벤션이 완전히 일치한다
    - (B) 기존 7종에 `author_id` 파라미터 추가 — 시그니처 7개 변경 + 타입 재생성 + 모든 호출부 수정이 필요한데 대시보드는 개인 축을 쓰지 않으므로 **비용만 크고 이득이 없음**
    - (C) RPC 없이 서버 컴포넌트에서 `count: "exact", head: true` 3회 병렬 조회 — 마이그레이션이 없어 가장 가볍지만 왕복 3회이고 F032(성능 개선) 방향과 반대
  - [x] **DB 마이그레이션** — `stats_my_work_summary(author_id_param uuid, today_param date)` 신규. 기존 7종과 **동일한 컨벤션**: `language sql stable security invoker set search_path = ''`, 생성 직후 **`revoke execute ... from anon` 명시적 회수**(v1 Task 030에서 `revoke from public`만으로는 부족함을 실측한 전례 — Supabase 기본 권한이 `anon`에게 개별 부여함). 단일 행으로 `overdue_count` / `due_this_week_count` / `in_progress_count`(필요 시 `total_count`)를 반환
  - [x] **"지연" 정의를 칸반과 동일하게 고정** — `status <> 'completed' and target_end_date < today_param`. `components/weekly-log-kanban-column.tsx:71`의 `status !== "completed" && item.target_end_date < todayIso`와 **문자 그대로 같은 조건**이어야 하며, 이 사실을 마이그레이션 주석과 RPC 호출부 주석 양쪽에 남긴다
  - [x] **⚠️ 타임존 결정 (놓치기 쉬운 지점)** — 칸반은 `todayIso`를 **서버 렌더링 시점의 Node `new Date()`**(`formatDate(new Date())`, `app/protected/weekly-logs/kanban/page.tsx:84`)로 계산해 내려줍니다. RPC 안에서 `current_date`를 쓰면 **Postgres 세션 타임존(Supabase 기본 UTC)** 기준이 되어 두 화면이 하루 어긋날 수 있습니다. → **`today_param`을 파라미터로 받아 호출부에서 칸반과 동일한 값을 넘기는 방식**을 채택하고, RPC 내부에서 `current_date`를 직접 참조하지 않는다
  - [x] **"이번 주 마감" 정의** — 월요일 시작 기준의 이번 주(`date_trunc('week', today_param)::date` ~ `+6일`)에 `target_end_date`가 속하고 `status <> 'completed'`인 건. **"지연"과 상호 배타적으로 결정**(`target_end_date >= today_param` 조건 추가) — 이미 지난 마감은 "지연"으로만 집계되고 "이번 주 마감"에는 중복되지 않음. 근거는 마이그레이션 주석에 명시.
  - [x] `lib/queries/stats.ts`에 `getMyWorkSummary()` 추가 — 기존 7개 래퍼와 동일하게 `await createClient()`(전역 저장 금지) → `.rpc(...)` → **실패 시 예외를 던지지 않고 0 폴백 + 콘솔 로그**(위젯 하나가 목록 페이지 전체를 죽이지 않게)
  - [x] `lib/types/stats.ts`에 `MyWorkSummary` 타입 추가 — `Database["public"]["Functions"]` 반환 타입 재노출 관례 유지
  - [x] **`author` 필터 축 신설** — `WeeklyLogsSearchParams`/`WeeklyLogKanbanSearchParams`에 `author?: string` 추가, `normalizeWeeklyLogFilters()`에 정규화 추가, **`applyScalarFilters()`에 `.eq("author_id", ...)` 추가**. 이 헬퍼는 목록 조회와 `countWeeklyLogs()`가 **공유**하므로 한쪽만 고치면 "총 N건"이 화면과 어긋난다(F039의 교훈). 칸반(`fetchWeeklyLogsKanban`)도 같은 헬퍼를 쓰므로 자동 반영됨 — 실제로 `WeeklyLogKanbanView`/kanban `page.tsx`에도 `author` 축(네비게이션·활성 필터 배지 포함)을 함께 배선해 목록과 대칭을 맞췄다.
  - [x] `components/my-work-summary-widget.tsx` 신규 — `ui/card` 1장 안의 3분할. 각 숫자를 **클릭 가능한 링크**로 만들어 대응 필터가 적용된 화면으로 이동. 0건일 때는 링크를 비활성화하고 회색 처리.
    - **⚠️ 계획과 다르게 처리한 부분**: 로드맵이 예시로 든 `?author={me}&status=in_progress` 링크를 "지연"에 그대로 쓰면 부정확함을 구현 중 실측으로 확인했다 — 이 프로젝트 시드 데이터 기준 지연 203건 중 69건(34%)이 `status='planned'`라 `status=in_progress` 단일값 필터로는 표현할 수 없다(기존 `applyScalarFilters`는 단일 상태 equality만 지원, "완료 아님"을 표현할 방법이 없음). 그래서 **"지연" 숫자는 목록이 아니라 칸반보드(`?department=all&author={id}`)로 링크**한다 — 칸반 카드의 빨간 "지연" 표시가 RPC와 동일한 조건이라 정확히 일치하며, Playwright로 3자 일치(위젯 숫자=칸반 지연 배지 개수=RPC)를 직접 검증했다. "진행중"은 `?author={id}&status=in_progress`로 목록에 링크해 **정확히 일치**함을 검증했다. "이번 주 마감"은 `?author={id}&status=in_progress&from={todayIso}`로 목표종료일 하한(오늘 이후)만 정확히 표현 가능하고 상한(이번 주 종료일)은 기존 필터로 표현할 수 없어 **근사치**(이번 주보다 늦게 마감인 진행중 업무도 함께 보일 수 있음)임을 위젯 컴포넌트 주석과 아래 수락 기준 메모에 남겼다. 이 상한 필터 신설은 author 축 신설만 명시된 Task 040 범위 밖으로 남겨둔다.
  - [x] `app/protected/weekly-logs/page.tsx`에 위젯 배치 — **목록과 별도의 `<Suspense>` 경계**로 감싼다(`cacheComponents: true` 하에서 위젯 집계가 목록 스트리밍을 지연시키지 않도록). 스켈레톤은 `components/my-work-summary-skeleton.tsx` 신규. 위젯 섹션은 목록과 별개로 자체 `getClaims()`를 호출해 독립적으로 스트리밍된다(공통 상위 컴포넌트의 인증 결과를 재사용할 수 없음 — Suspense 경계가 각자 필요).
  - [x] 반응형 — 데스크탑 가로 3분할(`sm:grid-cols-3`), 모바일 세로 1열(`grid-cols-1`). 필터 행 위에 낮게 배치.
  - [x] 접근성 — 각 항목에 `aria-label`("지연인 내 업무 3건" 형식)을 부여, Playwright 스냅샷으로 실제 렌더링 확인.
  - **관련 파일**: DB 마이그레이션(`add_my_work_summary_stats_function`), `lib/queries/stats.ts`, `lib/types/stats.ts`, `lib/types/index.ts`(`WeeklyLogListFilters.author`), `lib/queries/weekly-logs.ts`(필터 축 추가), `lib/actions/weekly-log-list.ts`(`RawFilters.author`), `app/protected/weekly-logs/page.tsx`, `app/protected/weekly-logs/kanban/page.tsx`, `components/my-work-summary-widget.tsx`(신규), `components/my-work-summary-skeleton.tsx`(신규), `components/weekly-log-list-view.tsx`(활성 필터 배지·`navigate`·`rawFilters`에 `author` 추가), `components/weekly-log-kanban-view.tsx`(동일), `lib/supabase/database.types.ts`
  - **수락 기준**: 일반 사용자가 `/protected/weekly-logs` 진입 즉시 본인의 지연·이번 주 마감·진행중 건수를 확인할 수 있고, 위젯 집계가 실패해도 목록은 정상 렌더링된다. **"지연"/"진행중"은 칸반보드·목록의 대응 숫자와 정확히 일치를 Playwright로 실측 확인했다.** "이번 주 마감"은 위 결정 메모대로 목록 필터 아키텍처(단일 상태값·overlap 기반 기간 필터)의 한계로 목록 링크가 상한 없는 근사치임을 감안해야 한다(실측: 위젯 2건 vs 근사 링크 목록 3건, RPC 자체 숫자는 정확).
  - **테스트 체크리스트** (Playwright MCP + Supabase MCP. 임시 QA 계정을 실제 회원가입 플로우로 생성하고 소유 로그를 조작해 검증, 종료 후 `auth.users` DELETE로 완전 삭제해 65 profiles / 325 logs 기준선으로 원복 확인 — 실제로 `qa-f040-test@example.com` 계정으로 수행 후 원복 완료)
    - [x] RPC를 `execute_sql`로 직접 호출한 값이 **동일 조건의 수동 `count` 쿼리와 일치**하는지 3개 지표 각각 대조 — 일치 확인(overdue 25/25, due_this_week 0/0, in_progress 10/10)
    - [x] 위젯 숫자 ↔ `?author={me}&status=...` 목록의 "총 N건" ↔ 칸반보드의 "지연" 배지 개수 **3자 일치** 확인 — "지연"(2=2, 칸반)·"진행중"(4=4, 목록) 정확히 일치, "이번 주 마감"은 위 결정 메모대로 근사(2 vs 3)임을 실측 확인
    - [x] 경계값: `target_end_date = 오늘`인 로그가 지연에 **포함되지 않고** 이번 주 마감에 **포함**되는지, `target_end_date = 어제`가 지연에만 잡히는지 확인 — QA 로그로 실측(오늘마감→이번 주 마감만, 어제마감→지연만)
    - [x] 타임존 회귀: DB 세션 타임존을 UTC/`Asia/Seoul`로 각각 바꿔 RPC를 호출해도 **`today_param`을 넘기는 한 결과가 동일**한지 확인(내부 `current_date` 의존이 남아 있지 않다는 증거) — 동일 결과 확인
    - [x] 로그 0건 사용자(신규 가입 계정)에서 위젯이 0/0/0으로 오류 없이 렌더링되고 링크가 비활성화되는지 확인 — 확인(disabled 상태, 링크 아님)
    - [x] 완료 처리된 로그가 세 지표 어디에도 잡히지 않는지 확인 — QA 로그(`QA-완료-과거마감`, 과거 마감·completed)로 실측, 지연·이번주마감·칸반 지연 배지 모두 미포함
    - [x] 일반 사용자를 impersonate(`set local role authenticated` + `request.jwt.claims`)해 **타인의 `author_id`를 넘겨 RPC 호출** → `weekly_logs` SELECT가 전 부서 공개이므로 결과가 나오는 것이 정상임을 확인하되, **위젯 UI가 항상 본인 id만 넘기는지**(클라이언트가 임의 id를 주입할 경로가 없는지) 서버 컴포넌트 코드로 확인 — impersonation으로 타인 id 조회 성공 확인(설계대로), `app/protected/weekly-logs/page.tsx`의 `MyWorkSummarySection`이 `data.claims.sub`만 넘기는 것 코드 확인
    - [x] `anon` 역할로 RPC 호출 시 `42501 permission denied`로 명시적 거부되는지 확인(EXECUTE 권한 회수 검증) — 확인
    - [x] Playwright로 RPC 실패를 강제(네트워크 가로채기 또는 잘못된 파라미터)했을 때 목록이 정상 렌더링되고 콘솔 에러만 남는지 확인 — 브라우저 `page.route` 가로채기는 서버 사이드 RPC 호출(Server Component → Supabase)에는 적용되지 않아, 대신 `authenticated` 권한을 일시 회수해 강제 실패시킨 뒤 위젯 0/0/0 폴백 + 목록 정상 렌더링 + 콘솔에 `[lib/queries/stats] stats_my_work_summary 조회 실패` 로그만 남는 것을 확인, 이후 권한 즉시 원복
  - **범위 밖 유지**: 부서 단위 요약(관리자 대시보드가 이미 담당), 위젯 커스터마이징(표시 지표 선택), 위젯을 다른 페이지로 확산하는 것, "이번 주 마감"의 정확한 목록 필터를 위한 신규 상한 날짜 필터 축(위 결정 메모 참고 — Task 040 범위 밖)

- **Task 041: 주간업무일지 작성 중 임시저장 구현 (F042)** ✅
  - [x] **스코프 확정 (착수 첫 단계)** — 저장 대상은 `WeeklyLogFormData`(`lib/schemas/weekly-log.ts`)의 **9개 필드 전부**(`title`, `work_type`, `importance`, `content`, `start_date`, `target_end_date`, `estimated_mm`, `estimated_cost`, `partner_company`). 이 타입은 전부 문자열·숫자·문자열 배열이라 **JSON 직렬화가 온전히 가능**하다. **첨부파일은 `File` 객체라 직렬화 불가 → 명시적으로 제외**하고, 복원 배너에 "첨부파일은 복원되지 않습니다" 문구를 노출한다
  - [x] **적용 범위 결정: 신규 작성 폼만 (`components/weekly-log-new-form.tsx`)** ← 권장. 수정 폼을 제외하는 근거를 주석에 남긴다:
    - 수정 대상에는 **이미 서버에 저장된 원본**이 있어 데이터 유실 위험 자체가 낮다
    - `weekly_logs`에 낙관적 잠금(버전 컬럼)이 없어, 오래된 draft를 복원해 저장하면 **그 사이의 타인 변경을 조용히 덮어쓴다**
    - 상세 페이지의 진행상태·업무타입·중요도는 이미 **인라인 즉시 저장**이라 draft와 이중으로 어긋난다
  - [x] **스토리지 키 규약 확정 (이 프로젝트 최초의 브라우저 스토리지 — 이후 표준이 됨)** — `weekly-log-draft:new:{userId}` 형식. **반드시 사용자 id로 네임스페이스**할 것(공용 PC에서 A의 초안이 B에게 보이면 안 됨). `userId`는 클라이언트에서 세션을 다시 읽지 말고 **서버 컴포넌트(`app/protected/weekly-logs/new/page.tsx`)가 이미 확보한 값을 prop으로 내려준다**
  - [x] **자동 저장 구현** — `react-hook-form`의 `watch()` 구독 + **debounce 약 1초**. 값이 초기값과 동일하면(사용자가 아무것도 입력하지 않았으면) 저장하지 않는다. 저장 시각(`savedAt`)을 함께 기록해 배너에 "N분 전 저장됨"을 표시
  - [x] **복원은 자동이 아니라 명시적 동의로** — 재진입 시 draft가 있으면 폼 상단에 `ui/card` 배너로 "임시 저장된 내용이 있습니다 (N분 전)" + [복원] / [삭제] 두 버튼. **자동 복원 금지**(사용자가 의도적으로 새로 쓰려는 경우를 방해하고, 무엇이 복원됐는지 인지하지 못함)
  - [x] **복원 시 `content` 재sanitize** — `localStorage`는 사용자·확장프로그램이 임의로 쓸 수 있는 저장소이므로, Tiptap 에디터에 주입하기 전 `lib/sanitize-html.ts`의 `sanitizeWeeklyLogContent()`를 한 번 더 통과시킨다(프로젝트의 "저장·렌더링 양쪽 sanitize" 관례를 저장소 경로까지 확장)
  - [x] **삭제 시점** — (1) 저장 성공 시(`createWeeklyLogAction` 성공 직후, 첨부 업로드 실패로 재제출되는 경로에서도 **`createdRef`가 채워진 뒤에는 draft를 지운다**), (2) 배너에서 [삭제]를 누를 때, (3) 파싱 실패(스키마 불일치·손상된 JSON) 시 조용히 폐기
  - [x] **SSR·예외 안전** — `localStorage` 접근은 전부 `useEffect` 안에서만, 모든 읽기/쓰기를 `try/catch`로 감싼다(프라이빗 모드·스토리지 차단·용량 초과 시 접근 자체가 throw). 실패해도 **에러 토스트로 사용자를 방해하지 않고** 조용히 기능만 비활성화한다(v1 Task 035의 Realtime 폴백 판단과 동일한 원칙 — 보조 기능은 조용히 실패)
  - [x] **용량 가드** — `content`는 최대 5000자 제한이 있어 일반적으로 문제없지만, 직렬화 결과가 비정상적으로 크면(예: 1MB 초과) 저장을 건너뛴다
  - [x] `hooks/use-weekly-log-draft.ts` 신규 — 저장/복원/삭제/`hasDraft`/`savedAt`을 캡슐화. **F045(프리셋)가 같은 규약을 재사용할 수 있도록** 순수 스토리지 유틸을 `lib/storage/local-storage.ts`(안전 접근 래퍼: `safeLocalStorageGet`/`Set`/`Remove`, draft 도메인 지식 없음)로 분리하고, draft 전용 스키마·직렬화·debounce·복원 로직은 훅 안에 남겼다
  - **관련 파일**: `hooks/use-weekly-log-draft.ts`(신규), `lib/storage/local-storage.ts`(신규, 안전 접근 래퍼), `components/weekly-log-new-form.tsx`, `components/weekly-log-draft-banner.tsx`(신규), `app/protected/weekly-logs/new/page.tsx`(`userId` prop 전달), `components/weekly-log-form.tsx`(`onFormReady` prop 추가 — 아래 결정 참고)
  - **DB 마이그레이션 불필요** — 전적으로 클라이언트 기능
  - **⚠️ 계획과 다르게 처리한 부분 1 — 복원 경로는 `form.reset()`이 아니라 `WeeklyLogForm` 리마운트**: `components/html-editor.tsx`의 Tiptap 에디터는 `useEditor({ content: value, ... })`의 `content`를 **생성 시점의 초기값으로만** 쓰고, 이후 `value` prop이 바뀌어도 `editor.commands.setContent()`를 호출하는 동기화 로직이 없다(실측 확인 — 기존 코드에 그런 `useEffect`가 없음). 그래서 `form.reset(restoredValues)`만으로는 나머지 8개 필드는 반영되지만 본문만 비어 있는 상태가 된다. `WeeklyLogForm`을 손대지 않고 우회하는 대신, `components/weekly-log-new-form.tsx`가 `key={formInstanceKey}` + `defaultValues={restoredValues}`로 **[복원] 클릭 시 폼 전체를 새 초기값으로 리마운트**하는 방식을 택했다 — 이미 검증된 "신규 마운트 시 defaultValues 반영" 경로(수정 폼과 동일)를 재사용해 Tiptap 동기화 문제를 원천적으로 피한다. `WeeklyLogForm`에는 자동 저장 구독을 걸기 위한 `onFormReady?: (form) => void` prop만 추가했다(수정 폼 경로는 이 prop을 넘기지 않아 영향 없음).
  - **⚠️ 계획과 다르게 처리한 부분 2 — 자동 저장 게이트는 `formState.isDirty`가 아니라 `getValues()` 스냅샷 비교**: 처음엔 계획대로 `watch()` 콜백 안에서 `form.formState.isDirty`로 "아직 아무것도 안 바뀜"을 걸렀으나, Playwright로 실측한 결과 **디바운스 타이머는 정상 발화하는데 `isDirty`가 항상 `false`라 저장이 전혀 되지 않는 버그**를 발견했다. 원인은 react-hook-form의 `formState`가 렌더 중에 실제로 "읽힌" 필드만 내부적으로 추적을 갱신하는 지연 구독(proxy) 방식인데, `WeeklyLogForm`이 렌더에서 `isDirty`를 한 번도 읽지 않아 `setTimeout` 콜백(렌더 바깥) 안에서 읽는 값이 계속 초기값(`false`)에 고정된 것이었다. RHF 내부 구현에 의존하지 않는 방식으로 바꿔, `watchForm(form)` 구독 시작 시점에 `form.getValues()`를 스냅샷해두고 이후 `watch()` 콜백 값과 `JSON.stringify` 비교하는 방식으로 대체했다.
  - **⚠️ 계획과 다르게 처리한 부분 3 — 배너용 `hasDraft`/`savedAt`은 `useEffect`+`setState`가 아니라 `useSyncExternalStore`**: 마운트 시 localStorage에 기존 draft가 있는지 확인하는 로직을 처음엔 `useEffect` 안에서 `setState`로 구현했는데, `react-hooks/set-state-in-effect` ESLint 규칙이 에러로 막았다(`npm run lint` 실패). 이 프로젝트가 `lib/dummy-log-overrides.ts` 도입 당시 동일한 문제(브라우저 전용 값을 초기 렌더에서 그대로 읽으면 SSR 결과와 달라져 하이드레이션 불일치 발생)를 겪고 `useSyncExternalStore`로 해결한 전례(`docs/roadmap/ROADMAP_mvp.md` 참고)가 있어 동일 패턴을 재사용했다 — `subscribe`는 리스너를 절대 호출하지 않는 영구 no-op이고(배너는 "재진입 시 1회 확인"이 의도이지 타이핑 중 자동 저장이 발생할 때마다 배너가 튀어나오면 안 되므로 의도적으로 비반응형), `getServerSnapshot`은 항상 `null`을 반환해 SSR·최초 하이드레이션 결과와 일치시키고, React의 하이드레이션 보정 메커니즘이 마운트 직후 클라이언트의 실제 값으로 딱 한 번 재동기화한다. [복원]/[삭제] 클릭에 따른 배너 숨김은 별도의 평범한 `useState`(이벤트 핸들러에서만 호출되므로 lint 문제 없음)로 처리했다.
  - **수락 기준**: 작성 중 새로고침·뒤로가기·탭 종료 후 재진입하면 복원 배너가 뜨고, [복원]을 누르면 첨부파일을 제외한 모든 입력값이 그대로 돌아오며, 저장에 성공한 뒤에는 draft가 남지 않는다. 스토리지를 쓸 수 없는 환경에서도 작성 폼이 정상 동작한다. **Playwright MCP로 실제 브라우저(계정 2개 생성 후 테스트 완료·정리)에서 전부 실측 확인함.**
  - **테스트 체크리스트** (Playwright MCP로 실브라우저 검증. `browser_evaluate`로 `localStorage`를 직접 읽어 저장 내용까지 대조 — 전 항목 실행·통과)
    - [x] 9개 필드를 모두 채운 뒤 새로고침 → 배너 노출 → [복원] → **모든 값이 정확히 일치**하는지 필드별 확인(특히 `work_type` 배열 다중 선택과 `importance` 슬라이더) — `work_type: ["네트워크","시스템 개발"]`, `importance: 5` 포함 9개 필드 전부 정확히 일치 확인
    - [x] Tiptap 본문의 서식(굵게·목록 등)이 복원 후에도 유지되는지, 복원 경로의 sanitize가 정상 서식을 제거하지 않는지 확인 — `<strong>` 굵게 서식이 복원 후에도 유지되고 툴바 "굵게" 버튼도 pressed 상태로 정확히 반영됨을 확인
    - [x] `localStorage`에 `<script>`나 `onerror` 속성이 섞인 `content`를 **직접 주입**한 뒤 복원 → 스크립트가 실행되지 않고 태그가 제거되는지 확인(sanitize 이중 방어 검증) — `<script>`·`onerror` 주입 후 복원 시 `window.__xss` 플래그가 설정되지 않았고 에디터에는 텍스트만 남음을 확인
    - [x] 저장 성공 후 목록으로 이동 → 작성 페이지 재진입 시 **배너가 뜨지 않는지**(draft 삭제) 확인 — 확인 완료
    - [x] 첨부파일을 첨부한 상태에서 새로고침 → 텍스트만 복원되고 첨부는 비어 있으며 배너에 안내 문구가 있는지 확인 — 확인 완료
    - [x] **첨부 업로드 실패 → 재제출** 경로에서 `weekly_logs` 행이 중복 생성되지 않고(`createdRef` 가드 유지) draft도 정상 정리되는지 확인 — 이 Task가 건드리는 폼의 가장 취약한 기존 로직 — Playwright `page.route()`로 스토리지 업로드 URL을 강제로 실패시킨 뒤 저장(행 1건 생성 확인, `mcp__supabase__execute_sql`로 실측) → draft 정리 확인 → route 해제 후 "다시 시도" → 업로드 성공 → 재차 "저장" 클릭까지 해도 행이 계속 1건임을 SQL로 재확인
    - [x] 아무것도 입력하지 않고 페이지를 떠난 경우 draft가 생성되지 않는지 확인 — 확인 완료
    - [x] [삭제] 버튼 → 배너가 사라지고 `localStorage` 키가 실제로 제거되는지 `browser_evaluate`로 확인 — 확인 완료
    - [x] **사용자 격리**: A 계정으로 draft를 만든 뒤 로그아웃 → B 계정 로그인 → 작성 페이지에서 배너가 뜨지 않는지 확인 — 실제 계정 2개(e2e-draft-a/b)를 생성해 양방향(A→B 안 보임, B→A 다시 로그인 시 A 배너 그대로 유지) 확인 후 테스트 데이터 정리
    - [x] 손상된 JSON(`browser_evaluate`로 임의 문자열 주입) 상태에서 페이지가 크래시하지 않고 조용히 무시하는지 확인 — 확인 완료, 손상된 키도 자동으로 정리됨
    - [x] `localStorage`를 throw하도록 스텁(`browser_evaluate`로 setter 덮어쓰기)한 상태에서 작성·저장이 **끝까지 정상 동작**하는지 확인 — `Object.getPrototypeOf(localStorage).setItem`을 throw하도록 교체한 상태에서 입력·저장까지 정상 동작 확인
    - [x] 콘솔 에러 0건 유지 — 전 시나리오에서 확인(의도적으로 네트워크를 차단한 첨부 업로드 실패 테스트의 예상된 `Failed to fetch` 로그 제외)
  - **범위 밖 유지**: 수정 폼 draft(위 결정 근거 참고), 서버 측 draft 저장(DB 테이블), 첨부파일 임시 보관, 여러 개의 draft 슬롯, 다른 기기 간 동기화

---

### Phase 2: 알림 시스템 확장 (F044 · F041)

> 목표: 알림이 **유형별로 켜고 끌 수 있고**, 댓글이라는 사건 없이도 **스케줄에 의해** 발송되는 상태. v1 Task 034가 세운 "알림은 DB 트리거로만 생성된다"는 원칙에 **두 번째 생성 경로**가 추가되는, v2에서 가장 인프라 부담이 큰 묶음.
> **선행 조건**: 없음(Phase 1과 독립). **단 Phase 2 내부는 042 → 043 → 044 순차 필수.**

- **Task 042: 알림 스키마 확장 — 유형 3종화 및 수신 설정 컬럼 (F044·F041 공통 백엔드)** ✅
  - [x] **`notifications` 제약 완화 마이그레이션** — 위 "반드시 해소해야 하는 갭"의 4개 항목을 한 번에 처리한다.
    - `actor_id`를 **nullable로 변경** — 스케줄 알림에는 행위자가 없다. (대안: 수신자 자신을 actor로 넣기 → 알림 문구가 "OOO님이 나에게"로 어색해지고 `get_profile_identities` 조회가 낭비되므로 **nullable 채택 권장**)
    - `weekly_log_id`를 **nullable로 변경** — 리마인더는 "아직 존재하지 않는 로그"에 대한 알림이다
    - `notifications_type_check`를 `('mention','comment','reply','reminder')`로 확장
    - **`period_start date null` 컬럼 신규 + 부분 유니크 인덱스** `unique (recipient_id, period_start) where type = 'reminder'` — 기존 `notifications_recipient_comment_unique`는 `comment_id`가 NULL이면 **Postgres가 NULL을 서로 구별해 중복 억제가 동작하지 않으므로**(실측 확인) 리마인더 전용 dedupe 키가 반드시 별도로 필요하다. 이 결정 근거를 마이그레이션 주석에 명시 — 인덱스명 `notifications_recipient_period_start_unique`로 적용
  - [x] **`prevent_unauthorized_notification_update()` 트리거 영향 확인** — 이 트리거는 `app.bypass_notification_column_guard` 세션 설정으로 우회하도록 되어 있고 기존 notify 함수 2종이 `set_config`로 이를 켠다. **신규 컬럼(`period_start`)이 사용자 UPDATE로 변경 불가능한 보호 대상에 포함되는지** 확인하고, 필요하면 트리거 본문에 추가한다(사용자는 여전히 `read_at`만 바꿀 수 있어야 함) — 실측 결과 원래 정의에 `period_start` 비교가 빠져 있어(신규 컬럼이라 당연히 없었음) 트리거 본문에 `new.period_start is distinct from old.period_start` 조건을 추가
  - [x] **`profiles` 알림 수신 설정 컬럼 3종 추가** — `notify_on_comment boolean not null default true`, `notify_on_mention boolean not null default true`, `notify_on_reminder boolean not null default true`.
    - **결정: 단일 `jsonb`가 아니라 개별 boolean 컬럼** ← 권장. 트리거·RLS에서 직접 참조하기 쉽고, `profiles`의 기존 스타일(평평한 컬럼 + CHECK)과 일치하며, 타입 재생성 시 필드가 그대로 드러난다
    - `DEFAULT true` + `NOT NULL`이므로 **기존 65건 프로필에 백필 불필요**(전원 기존과 동일하게 전부 수신)
    - **`'reply'` 유형은 별도 컬럼을 두지 않고 `notify_on_comment`를 따른다** — 사용자에게 "댓글/멘션/리마인더" 3종으로 보이는 편이 이해하기 쉽고, 대댓글은 댓글의 하위 개념이다. 이 매핑을 트리거 주석과 UI 캡션 양쪽에 명시(컬럼 주석에 명시, 트리거 본문 수정은 Task 043 범위)
  - [x] **RLS 확인(변경 불필요 예상, 반드시 실측)** — `profiles_update_own_or_admin`은 행 단위 제한만 있고 컬럼 제한이 없으므로 **사용자가 자기 설정 컬럼을 수정하는 데 정책 변경이 필요 없다.** `prevent_unauthorized_role_change()` 트리거는 `role` 변경만 검사하므로 신규 컬럼 UPDATE를 막지 않는다. → **impersonation SQL로 "일반 사용자가 자기 `notify_on_*`은 바꿀 수 있고, 타인 것은 못 바꾸며, 이 김에 `role`을 끼워 넣으면 여전히 거부된다"를 실측 확인** — 예상대로 RLS 변경 불필요임을 확인(아래 테스트 체크리스트 참고)
  - [x] `mcp__supabase__generate_typescript_types`로 `lib/supabase/database.types.ts` 재생성
  - [x] **타입 재생성으로 드러나는 컴파일 에러 정리 (의도된 안전장치)**
    - `lib/types/index.ts`의 `NotificationType = "mention" | "comment" | "reply"` → **`"reminder"` 추가**
    - `lib/queries/notifications.ts`의 `RawNotificationRow.weekly_log_id: string` → `string | null`, `actor_id: string` → `string | null`(`period_start: string | null` 필드도 추가). `enrichNotifications()`의 `actorIds`/`weeklyLogIds` 배치 조회에서 **null을 걸러낸 뒤** RPC/쿼리에 넘길 것 — 반영 완료, 두 배열 모두 0건이면 RPC/쿼리 자체를 스킵하도록 처리
    - `components/notification-bell.tsx`의 `notificationHref()` — `weekly_log_id`가 null이면 `/protected/weekly-logs/new`로 보낸다(리마인더의 목적지는 "작성 화면"). 발신자 아바타 자리에는 시스템 표시로 폴백 — `enrichNotifications()`가 이미 `actor_avatar_key`를 `actor?.avatar_key ?? "fox"`로 폴백하고 있어 actor가 null이어도 자동으로 "fox" 아바타가 표시됨(추가 코드 불필요, 기존 폴백 로직 재사용)
    - (계획에 없던 추가 수정) `hooks/use-notifications.ts`의 Realtime INSERT 페이로드 타입(`payload.new as {...}`)도 `actor_id`/`weekly_log_id`를 nullable로, `period_start`를 필드로 추가해야 `enrichNotifications()` 호출부가 컴파일됨 — 타입 재생성 시점엔 로드맵에 명시되지 않았던 3번째 지점이라 기록
  - [x] `mcp__supabase__get_advisors`(security/performance) 확인 — 신규 인덱스·nullable 변경으로 인한 새 경고 유무 확인 — 확인 결과 신규 경고 없음(기존 ERP 도메인 함수·인덱스 관련 INFO/WARN만 존재, 이번 변경과 무관)
  - **관련 파일**: DB 마이그레이션(`extend_notifications_for_reminder`, `guard_notifications_period_start_column`, `add_profiles_notification_preferences`), `lib/supabase/database.types.ts`, `lib/types/index.ts`, `lib/queries/notifications.ts`, `components/notification-bell.tsx`, `hooks/use-notifications.ts`
  - **⚠️ 계획과 다르게 처리한 부분**: 관련 파일 목록엔 마이그레이션 2건만 명시돼 있었으나, `prevent_unauthorized_notification_update()` 트리거 수정을 `extend_notifications_for_reminder`에 합치지 않고 `guard_notifications_period_start_column`이라는 별도 마이그레이션으로 분리해 적용했다(스키마 변경과 트리거 함수 교체를 분리해 각각의 의도를 마이그레이션 이름에서 명확히 드러내기 위함, 두 마이그레이션 모두 순서대로 정상 적용됨).
  - **수락 기준**: `notifications`에 `type='reminder'`이고 `actor_id`/`weekly_log_id`/`comment_id`가 모두 NULL인 행을 삽입할 수 있고, 같은 `(recipient_id, period_start)`로 두 번째 삽입은 유니크 위반으로 거부되며, **기존 댓글·멘션 알림 흐름은 어떤 회귀도 없다** — 전부 실측 확인 완료
  - **테스트 체크리스트** (UI 변경이 거의 없는 단계이므로 `execute_sql` 중심. 모든 데이터 조작은 `BEGIN`/`ROLLBACK`)
    - [x] `type='reminder'` + `actor_id`/`weekly_log_id` NULL 행 INSERT 성공 확인
    - [x] **동일 `(recipient_id, period_start)` 재삽입 → 유니크 위반으로 거부** 확인(부분 인덱스가 실제로 동작하는지 — 이번 Task의 핵심 검증) — `23505 duplicate key value violates unique constraint "notifications_recipient_period_start_unique"`로 거부 확인
    - [x] **다른 `period_start`로는 정상 삽입**되고, `type<>'reminder'` 행은 `period_start`가 NULL이어도 부분 인덱스에 걸리지 않는지 확인 — 서로 다른 `period_start` 2건 + `comment`/`mention` 각 1건(모두 `period_start` NULL) 동시 삽입 성공 확인
    - [x] 기존 댓글·멘션 알림 회귀: 실제 댓글 1건·멘션 1건을 삽입해 `notify_on_new_comment`/`notify_on_comment_mention` 트리거가 **v1과 동일하게** 알림을 만드는지 확인(중복 억제 `on conflict` 동작 포함) — 댓글 1건에서 로그 작성자에게 `comment` 알림, 멘션 1건에서 멘션 대상에게 `mention` 알림 생성 확인(둘 다 `actor_id`/`weekly_log_id`/`comment_id` 정상 채워짐)
    - [x] 일반 사용자 impersonation으로 자기 `notify_on_comment`를 `false`로 UPDATE → 성공 확인
    - [x] 같은 사용자가 **타인의** `notify_on_*` UPDATE 시도 → 0건 거부 확인 — 첫 시도에서 우연히 `role='admin'`인 프로필을 대상 사용자로 골라 `is_admin()` 예외 조건 때문에 64건이 수정되는 것을 발견(RLS가 관리자에게는 전 사용자 UPDATE를 의도적으로 허용하기 때문 — 정상 동작), `role='user'`인 일반 사용자로 다시 테스트해 0건 거부를 확인
    - [x] 같은 UPDATE 문에 `role='admin'`을 끼워 넣어 시도 → `P0001` 거부 확인(**하드닝 회귀 없음**) — `prevent_unauthorized_role_change()`가 "권한이 없습니다: role은 관리자만 변경할 수 있습니다."로 거부
    - [x] 일반 사용자가 `notifications`에 직접 INSERT 시도 → 여전히 거부되는지 확인(**INSERT 정책을 추가하지 않았다는 증거**) — `42501 new row violates row-level security policy`로 거부
    - [x] `npx tsc --noEmit` 통과 — 위 3개 파일(및 `hooks/use-notifications.ts`)의 nullable 대응이 빠짐없이 반영됐다는 증거 — 통과 확인, `npm run lint`도 기존 경고 4건 외 신규 에러/경고 없이 통과

- **Task 043: 알림 구독 설정 UI 및 트리거 게이트 적용 (F044)** ✅
  - [x] **`notify_on_new_comment()` 트리거 수정** — 두 개의 INSERT 분기 각각에서 **해당 수신자의** `profiles.notify_on_comment`를 조회해 `false`면 알림을 만들지 않는다. `'reply'` 분기도 같은 컬럼을 본다(Task 042의 매핑 결정). 트리거는 `SECURITY DEFINER`라 RLS 없이 `profiles`를 읽을 수 있다
  - [x] **`notify_on_comment_mention()` 트리거 수정** — 멘션 대상의 `notify_on_mention`이 `false`면 알림을 만들지 않는다
  - [x] **⚠️ 게이트는 "알림 행 생성"만 막고 댓글·멘션 자체는 절대 막지 않을 것** — 두 함수는 `AFTER INSERT` 트리거이므로 `return new`를 유지해 **댓글/멘션 행 저장은 항상 성공**해야 한다. 여기서 예외를 던지면 알림 설정이 댓글 기능을 망가뜨린다 — SQL로 4개 시나리오(댓글 게이트/대댓글 게이트/멘션 게이트/독립 게이팅) 모두 `return new` 유지 하에 행 저장은 성공, 알림 행만 억제됨을 impersonation 테스트로 확인
  - [x] **설정 저장 방식 결정** — **폼 방식 채택**(저장 버튼, 계획대로). 프로필 폼(`components/profile-form.tsx`, 기존 RHF+Zod)에 필드로 편입
  - [x] `npx shadcn@latest add switch` — `components/ui/switch.tsx` 설치 완료. 라이트/다크 양쪽 대비 확인(아래 테스트 체크리스트)
  - [x] `lib/schemas/profile.ts`에 boolean 3종 추가, `app/protected/profile/page.tsx`의 select에 컬럼 3종 추가
  - [x] `components/notification-preferences-field.tsx` 신규 — 3개 스위치 + 각 항목 설명 캡션. **"대댓글 알림도 이 설정을 따릅니다"를 댓글 알림 캡션에 명시**(Task 042의 매핑을 사용자에게 드러냄)
  - [x] **리마인더 스위치는 이 Task에서 함께 노출하되 "아직 동작하지 않음"이 아니라 그냥 저장만 되게 둔다** — Task 044가 이 값을 읽기 시작하면 추가 UI 작업 없이 활성화된다
  - **관련 파일**: DB 마이그레이션(`apply_notification_preferences_to_triggers`), `components/profile-form.tsx`, `components/notification-preferences-field.tsx`(신규), `components/ui/switch.tsx`(신규, shadcn), `lib/schemas/profile.ts`, `app/protected/profile/page.tsx`
  - **수락 기준**: 사용자가 프로필 화면에서 댓글·멘션·리마인더 알림을 각각 끌 수 있고, 끈 유형의 알림은 **DB에 행 자체가 생성되지 않으며**(읽음 처리로 숨기는 방식이 아님), 알림을 꺼도 댓글 작성·멘션 자체는 정상 동작한다 — 전부 실측 확인 완료
  - **⚠️ 계획과 다르게 처리한 부분**: (1) 테스트 체크리스트가 "QA 계정 2개(작성자·수신자)"로 되어 있었으나, "멘션 알림만 끄고 댓글 알림은 켠 상태에서 댓글+멘션 동시 발생" 시나리오를 깨끗하게 격리하려면 멘션 수신자가 댓글 수신자(로그 작성자)와 달라야 했다(같으면 `notifications_recipient_comment_unique (recipient_id, comment_id)`가 type과 무관하게 동일 행을 `on conflict do update`로 덮어써 두 알림을 분리해서 관찰할 수 없음). QA 계정을 3개(A=댓글 작성자, B=로그 작성자/댓글 수신자, C=멘션 대상)로 늘려 진행. (2) "설정 저장 실패(네트워크 가로채기) 시 토스트가 뜨고 값이 롤백되는지" 체크리스트 문구는 실제로는 이 폼의 기존 관례(나머지 프로필 필드와 동일하게 `setError`로 인라인 빨간 문구 표시, 토스트 아님)를 그대로 따랐다 — 토스트+즉시 롤백은 로드맵이 대안으로 언급한 "즉시 저장(낙관적 업데이트)" 경로에 해당하는 동작이며, 이번엔 권장안인 폼 방식을 택했으므로 적용 대상이 아니다. 값 자체는 실패한 요청이 커밋되지 않으므로 DB 기준으로는 "롤백"과 동일한 결과(재조회 시 이전 값 유지)이고, 새로고침 시 서버의 실제 값으로 정상 복원됨을 확인
  - **테스트 체크리스트** (Playwright MCP + Supabase MCP. 임시 QA 계정 3개(작성자 A·수신자 B·멘션대상 C, `qa-task043-{a,b,c}@example.com`, Commerce시스템팀 소속)를 실제 가입 플로우로 생성해 실브라우저 검증, 종료 후 3개 계정과 시딩한 로그 1건·댓글 4건·멘션 1건·알림 전부 `auth.users`/`weekly_logs` DELETE로 완전 삭제해 65 profiles 기준선으로 원복 확인)
    - [x] 수신자가 댓글 알림을 끈 상태에서 타인이 그의 업무일지에 댓글 → **`notifications` 행이 생성되지 않고** 헤더 벨 배지도 증가하지 않음 확인 — B가 `notify_on_comment=false`로 저장 후 A가 실브라우저로 댓글 작성, SQL로 B 수신 알림 0건 확인
    - [x] 같은 상황에서 **댓글 자체는 정상 저장되고 상세 페이지에 즉시 표시**되는지 확인(게이트가 기능을 막지 않는다는 증거) — A의 댓글이 새로고침 없이 목록에 즉시 렌더링됨을 스냅샷으로 확인
    - [x] 멘션 알림만 끄고 댓글 알림은 켠 상태에서 **댓글 + 멘션이 동시에 발생**하는 케이스 → 댓글 알림만 생성되는지 확인(두 트리거가 독립적으로 게이트되는지) — B(댓글 on)/C(멘션 off)로 분리해 A가 B의 로그에 C를 멘션하는 댓글 작성(SQL impersonation, `authenticated` role) → B는 `comment` 알림 1건 생성, C는 `mention` 알림 0건으로 두 트리거의 독립적 게이팅 확인
    - [x] 대댓글 알림이 `notify_on_comment`(댓글 설정)를 따르는지 확인 — 댓글 알림을 끄면 대댓글 알림도 생성되지 않음 — B가 알림을 끈 상태에서 A가 B의 원댓글에 실브라우저로 답글 작성 → `reply` 알림 0건 확인
    - [x] 설정을 다시 켠 뒤 새 댓글 → 알림이 정상 생성되는지 확인(되돌릴 수 있음) — B가 댓글 알림을 다시 켠 뒤 위 멘션 동시발생 시나리오에서 `comment` 알림 1건이 정상 생성됨을 확인(되돌리기 검증 겸용)
    - [x] 이미 생성된 과거 알림은 설정을 꺼도 **사라지지 않는지** 확인(설정은 미래 알림에만 적용) — B가 댓글 알림을 다시 끈 뒤에도 직전에 생성된 알림이 벨 배지·드롭다운에 그대로 남아있음을 확인
    - [x] Realtime 회귀: 알림이 켜진 수신자 화면에서 **새로고침 없이** 벨 배지가 증가하는지 확인(v1 Task 035 동작 회귀 없음) — B의 브라우저 탭을 열어둔 채 A의 댓글 작성을 SQL `authenticated` role impersonation(v1 Task 035와 동일 컨벤션)으로 실행 → 새로고침 없이 배지가 "1"로 즉시 증가함을 확인
    - [x] 설정 저장 실패(네트워크 가로채기) 시 토스트가 뜨고 값이 롤백되는지 확인 — `window.fetch`를 `/rest/v1/profiles` 요청만 실패하도록 패치 후 저장 시도 → 기존 프로필 폼 관례대로 인라인 에러 문구("프로필 저장 중 오류가 발생했습니다.") 노출, DB 값 불변 확인, 새로고침 시 서버 값으로 정상 표시(위 "계획과 다르게 처리한 부분" 참고)
    - [x] 라이트/다크 + 1280/768/390 뷰포트에서 스위치 레이아웃·대비 확인 — 6개 조합 스크린샷 대조, on/off 상태 모두 라이트·다크 양쪽에서 충분한 대비 확인
    - [x] 콘솔 에러 0건 — 최근 네비게이션 기준 0건(세션 전체 기록에는 Task 043과 무관한 이전 세션 잔여 항목 2종이 섞여 있었으나 — HMR 웹소켓 연결 실패는 프로덕션 빌드(`npm run start`)로 QA를 진행해 애초에 해당 없는 경로이고, 첨부파일 업로드 실패 로그는 다른 조직의 로그에 대한 것으로 이번 QA 계정·로그와 무관 — 실제 이번 세션의 액션에서 발생한 에러 아님)

- **Task 044: 정기 작성 리마인더 — `pg_cron` 도입 및 스케줄 알림 생성 (F041)**
  - [ ] **⚠️ 이 프로젝트 최초의 `pg_cron` 도입 — 착수 전 확인 3종**
    - `list_extensions`로 `pg_cron`이 여전히 `installed_version: null`인지 재확인(2026-08-21 실측 기준 미설치, `default_version 1.6.4`)
    - **`cron.job` 테이블을 먼저 조회해 다른 도메인이 이미 잡을 등록했는지 확인** — 이 Supabase 프로젝트는 ERP 성격의 다른 애플리케이션과 공유 중이므로(위 갭 절), 잡 이름·실행 시각이 충돌하지 않게 `weekly_log_` 접두사를 쓴다
    - `pg_cron`은 데이터베이스 전역 확장이라 **한 번 켜면 다른 도메인에도 영향**을 준다는 점을 사용자에게 알리고 승인받은 뒤 진행
  - [ ] **알림 생성 함수 신규** — `create_weekly_log_reminders(target_week_start date default null)`, `SECURITY DEFINER` + `set search_path = ''`(기존 notify 함수 2종과 동일 컨벤션). 클라이언트에는 **EXECUTE를 부여하지 않는다**(`anon`·`authenticated` 모두 회수) — 사용자가 임의로 리마인더를 발송할 수 있으면 알림 스팸 경로가 열린다
  - [ ] **"이번 주" 기준 결정** — 월요일 시작. **⚠️ `current_date`는 Supabase 기본 세션 타임존(UTC) 기준이라 KST와 최대 9시간 어긋난다** → `date_trunc('week', (now() at time zone 'Asia/Seoul')::date)::date`로 계산하고 근거를 함수 주석에 남긴다(Task 040의 타임존 판단과 동일한 문제)
  - [ ] **"미작성" 정의 결정** — 프로젝트의 기존 기간 필터 관례("기간이 겹치는 항목", v1 Task 029)를 재사용해 **이번 주와 기간이 겹치는 로그(`start_date <= 주 종료일 AND target_end_date >= 주 시작일`)가 1건도 없는 사용자**를 대상으로 한다. (대안: `created_at`이 이번 주에 속하는지 → "지난주에 미리 등록한 이번 주 업무"를 미작성으로 오판하므로 부적절)
  - [ ] **수신자 필터** — `department_id is not null`(온보딩 미완료자 제외) **AND** `notify_on_reminder = true`(Task 042 컬럼). **`is_active = false` 사용자 제외 여부는 결정 항목** — 이 컬럼은 현재 앱 소스 어디에서도 쓰이지 않으므로(실측), 다른 도메인의 의미를 확인한 뒤 결정한다
  - [ ] **중복 방지** — `period_start`에 이번 주 시작일을 넣고 `on conflict do nothing`(Task 042의 부분 유니크 인덱스가 강제). 같은 주에 함수가 여러 번 실행돼도(수동 재실행·cron 재시도) **사용자당 1건만** 남는다
  - [ ] **컬럼 보호 트리거 우회** — 기존 notify 함수 2종처럼 필요 시 `set_config('app.bypass_notification_column_guard', 'true', true)`를 호출한다(Task 042에서 확인한 트리거 범위에 따라 필요 여부 판단)
  - [ ] **스케줄 등록** — `cron.schedule('weekly_log_reminder', '<crontab>', $$select public.create_weekly_log_reminders()$$)`. **실행 시각 결정 항목**: 예) 금요일 오후 KST → cron은 UTC 기준이므로 `0 6 * * 5`(금 15:00 KST). 주 초 독려(월요일)인지 주 마감 독려(금요일)인지 **사용자 확인 후 확정**
  - [ ] **⚠️ 마이그레이션 추적성** — `cron.schedule()` 호출은 로컬 `supabase/migrations/`에도, `list_migrations` 결과에도 **코드로 남지 않는다**(v1의 다른 DB 변경들이 이미 MCP `apply_migration`으로만 적용돼 로컬에 없는 것과 같은 문제가 한 단계 더 심해짐). → **`docs/guides/deployment-ops.md`에 등록된 잡 목록·crontab·재등록 절차를 반드시 문서화**하고, Task 050에서 CLAUDE.md에도 명시한다
  - [ ] **알림 UI 대응 확인** — Task 042에서 `notificationHref()`가 `weekly_log_id` NULL을 `/protected/weekly-logs/new`로 보내도록 이미 수정됐으므로 추가 작업은 없어야 한다. 리마인더 문구("이번 주 주간업무일지를 아직 작성하지 않았습니다")와 아이콘을 벨 목록에 추가
  - [ ] **(선택) 알림 보존 정책 자동화** — `docs/guides/deployment-ops.md` 7절이 "읽은 알림 90일 경과분 수동 DELETE"를 절차로만 남겨둔 이유가 **정기 실행 인프라 부재**였다. 이 Task로 그 전제가 해소되므로, 같은 `pg_cron`으로 정리 잡을 함께 등록할지 결정한다(권장: 함께 등록하고 문서 갱신)
  - **관련 파일**: DB 마이그레이션(`enable_pg_cron`, `add_weekly_log_reminder_function`, `schedule_weekly_log_reminder`), `components/notification-bell.tsx`(리마인더 문구·아이콘), `lib/queries/notifications.ts`(리마인더 행 조립 확인), `docs/guides/deployment-ops.md`(신규 절: cron 잡 운영)
  - **수락 기준**: 지정한 요일·시각에 리마인더가 자동 생성되고, **이번 주 로그를 이미 작성한 사용자와 리마인더를 끈 사용자에게는 생성되지 않으며**, 같은 주에 함수를 여러 번 실행해도 사용자당 알림이 1건을 넘지 않고, 알림 클릭 시 작성 화면으로 이동한다. 클라이언트는 이 함수를 호출할 수 없다
  - **테스트 체크리스트** (Supabase MCP + Playwright MCP. **cron 스케줄을 실제로 기다릴 수 없으므로 함수를 직접 호출해 로직을 검증하고, 스케줄러 자체는 등록 상태·실행 이력으로 검증**. 데이터 조작은 `BEGIN`/`ROLLBACK` 우선, 실계정 검증분은 종료 후 정리)
    - [ ] `create extension` 후 `list_extensions`에서 `pg_cron`의 `installed_version`이 채워졌는지 확인
    - [ ] `cron.job` 조회로 잡이 **1건만** 등록됐고 crontab·명령이 의도대로인지 확인, 다른 도메인 잡과 이름이 충돌하지 않는지 확인
    - [ ] 함수를 `execute_sql`로 직접 호출 → **이번 주 로그가 없는 사용자에게만** 알림 생성 확인(수동 `select`로 대상자 목록을 미리 계산해 대조)
    - [ ] **연속 2회 호출 → 알림 수가 늘지 않음** 확인(부분 유니크 인덱스 + `on conflict do nothing`의 실제 동작 — 이번 Task의 핵심 검증)
    - [ ] `notify_on_reminder = false`인 사용자에게는 생성되지 않음 확인
    - [ ] `department_id is null`(온보딩 미완료)인 사용자에게는 생성되지 않음 확인
    - [ ] **경계값**: 이번 주와 하루만 겹치는 로그(주 시작일에 끝나는 로그 / 주 종료일에 시작하는 로그)를 가진 사용자가 **미작성으로 잡히지 않는지** 확인
    - [ ] **타임존 경계**: KST 기준 월요일 새벽(UTC로는 일요일)에 함수를 호출해도 주 시작일이 KST 기준 월요일로 계산되는지 확인(세션 타임존을 바꿔가며 반복)
    - [ ] `target_week_start`를 명시적으로 넘겨 **과거 주**를 대상으로 호출해도 정상 동작하는지 확인(수동 보정 실행 경로)
    - [ ] `authenticated` 역할을 impersonate해 함수 호출 시도 → **`42501 permission denied`로 거부** 확인(사용자가 임의 발송할 수 없다는 증거)
    - [ ] Playwright로 리마인더 수신자 계정 로그인 → 헤더 벨에 리마인더가 렌더링되고, **발신자 아바타 자리가 시스템 표시로 폴백**되며, 클릭 시 `/protected/weekly-logs/new`로 이동하는지 확인
    - [ ] 리마인더 읽음 처리·전체 읽음 처리가 기존 알림과 동일하게 동작하는지 확인(`markNotificationReadAction` 회귀)
    - [ ] 리마인더가 섞인 상태에서 Realtime 구독·폴백 폴링이 정상인지 확인(v1 Task 035 회귀)
    - [ ] `cron.job_run_details`에서 **최소 1회 이상 성공 실행 이력**을 확인(잡을 임시로 매분 실행으로 바꿔 관찰한 뒤 원복하는 방법 허용)
    - [ ] `get_advisors` 재확인 — `SECURITY DEFINER` 함수 추가로 인한 새 경고 유무
  - **범위 밖 유지**: 이메일·슬랙 등 앱 외부 채널 발송, 사용자별 리마인더 요일/시각 커스터마이징, 미작성자 목록을 관리자에게 리포트하는 기능, 리마인더 발송 이력 테이블

---

### Phase 3: 변경 이력 (F043)

> 목표: 상세 페이지에서 **즉시 저장되는 3개 속성**의 변경을 누가 언제 했는지 되짚을 수 있는 상태. **최소 버전** — 풀 감사로그 시스템이 아니다.
> **선행 조건**: 없음. Phase 2와 병렬 진행 가능(수정 파일이 겹치지 않음).

- **Task 045: 상태·업무타입·중요도 변경 이력 구현 (F043)**
  - [ ] **추적 대상 컬럼 결정 (착수 첫 단계)** — **`status` / `work_type` / `importance` 3개로 한정** ← 권장. 근거를 마이그레이션 주석에 남긴다:
    - 이 3개만 상세 페이지에서 **별도 저장 버튼 없이 낙관적 업데이트로 즉시 반영**되어(`weekly-log-detail-view.tsx`) 사용자가 "언제 바뀌었지?"를 되짚을 수단이 전혀 없다
    - `title`/`content`는 명시적 "수정" 폼을 거치고 `updated_at`이 갱신되며, 본문은 HTML이라 diff 저장이 곧 **풀 감사로그 시스템**으로 번진다 → 범위 밖
    - 확장이 필요해지면 트리거의 `OF <컬럼>` 목록에 추가하는 것만으로 늘릴 수 있는 구조로 만든다
  - [ ] **DB 마이그레이션 — `weekly_log_change_history` 테이블 신규**
    - `id uuid pk default gen_random_uuid()`, `weekly_log_id uuid not null → weekly_logs(id) on delete cascade`, `changed_by uuid null → profiles(id)`, `field text not null check (field in ('status','work_type','importance'))`, `old_value text null`, `new_value text not null`, `created_at timestamptz not null default now()`
    - **`changed_by`를 nullable로** — `auth.uid()`가 NULL인 직접 DB 접속(SQL Editor·MCP)에서의 변경도 기록되어야 하고, 이때 변경자를 위조하지 않기 위함(v1의 `prevent_unauthorized_role_change()`가 `auth.uid() IS NOT NULL`을 분기 조건으로 쓰는 것과 같은 사고방식)
    - **`work_type text[]`은 `array_to_string(..., ', ')`로 문자열 저장** — 이력은 **표시 전용**이라 구조를 보존할 이유가 없고, 단일 `text` 컬럼 한 쌍으로 3개 필드를 모두 담을 수 있어 스키마가 단순해진다
    - 인덱스: `(weekly_log_id, created_at desc)`. **`changed_by` FK 커버링 인덱스도 함께** — v1 Task 032에서 `unindexed_foreign_keys` 어드바이저 경고를 받았던 전례 반영
  - [ ] **기록 방식 결정: DB 트리거** ← 권장 — `AFTER UPDATE OF status, work_type, importance ON weekly_logs`, `SECURITY DEFINER`. 근거:
    - 각 속성마다 **쓰기 경로가 2개**(상세 인라인 액션 + 전체 수정 폼)라 서버 액션에 흩어 넣으면 6곳을 중복 작성하고 하나만 빠져도 이력에 구멍이 생긴다
    - 프로젝트에 이미 트리거 선례가 충분하다(`notify_on_*`, `validate_weekly_log_work_type`, `prevent_*`)
    - `IS DISTINCT FROM`으로 **실제로 값이 바뀐 필드만** 기록(같은 값 재저장은 이력을 만들지 않음)
  - [ ] **RLS 정책 — `notifications` 관례를 그대로 적용**
    - SELECT: 전 인증 사용자 공개(`weekly_logs`가 이미 전 부서 SELECT 공개이므로 이력만 막으면 "보이는 글의 안 보이는 이력"이라는 모순)
    - **INSERT/UPDATE/DELETE 정책은 의도적으로 만들지 않는다** → 클라이언트는 이력을 위조·삭제할 수 없고, 오직 `SECURITY DEFINER` 트리거만 기록한다. **"RLS 켜짐 + 정책 없음 = 조용한 0건"이 여기서는 의도된 설계**임을 마이그레이션 주석에 명시(v1 Task 026이 `departments`에서 겪은 함정과 정반대 방향의 활용)
  - [ ] `mcp__supabase__generate_typescript_types` 재생성 → `lib/types/index.ts`에 `WeeklyLogChangeHistory` 타입(`field`를 유니온으로 좁힘, `WeeklyLog`가 `status`를 좁히는 기존 패턴과 동일)
  - [ ] `lib/queries/weekly-log-history.ts` 신규 — 로그 1건의 이력 조회. **변경자 신원은 `get_profile_identities` RPC로 배치 조회**(`profiles_select_own_or_admin` 때문에 embed 불가 — v1 Task 033·F035에서 확립된 필수 경로). `changed_by`가 NULL인 행은 "시스템"으로 표시
  - [ ] **UI — 상세 페이지의 접이식 섹션** — 기본 접힘 상태로 댓글 섹션 근처에 배치. `npx shadcn@latest add collapsible`(**현재 미설치**, 실측 확인) 또는 기존 프리미티브 조합 중 선택. 각 행은 "OOO님이 진행상태를 예정 → 진행중으로 변경 · 3시간 전" 형식
  - [ ] **표시 라벨은 화면과 동일한 한글로** — `status`는 예정/진행중/완료, `importance`는 `lib/constants/importance.ts`의 `IMPORTANCE_LABELS`("보통 (3)"), `work_type`은 저장된 이름 그대로. **DB에는 원시값을 저장하고 라벨링은 렌더링 시점**에 한다(라벨이 바뀌어도 과거 이력이 깨지지 않게)
  - [ ] **성능·증가량 고려** — 이력은 인라인 편집마다 행이 쌓이는 유일한 테이블이다. 상세 페이지 조회는 `weekly_log_id` 인덱스로 항상 좁혀지므로 문제없지만, **보존 정책 필요 여부를 `docs/guides/deployment-ops.md`에 알림 보존 정책(7절)과 나란히 기록**할 것
  - **관련 파일**: DB 마이그레이션(`create_weekly_log_change_history`, `add_weekly_log_change_history_trigger`), `lib/queries/weekly-log-history.ts`(신규), `lib/types/index.ts`, `components/weekly-log-change-history.tsx`(신규), `components/ui/collapsible.tsx`(신규, shadcn), `app/protected/weekly-logs/[id]/page.tsx`, `components/weekly-log-detail-view.tsx`(섹션 배치), `lib/supabase/database.types.ts`, `docs/guides/deployment-ops.md`
  - **수락 기준**: 진행상태·업무타입·중요도를 어떤 경로(상세 인라인 / 전체 수정 폼)로 바꾸든 이력이 1건 기록되고, 상세 페이지에서 변경자·변경 내용·시각을 확인할 수 있으며, **클라이언트가 어떤 경로로도 이력을 위조·수정·삭제할 수 없다**
  - **테스트 체크리스트** (Playwright MCP + Supabase MCP. 임시 QA 계정으로 실브라우저 검증, 종료 후 완전 삭제 및 기준선 원복)
    - [ ] 상세 페이지에서 진행상태 변경 → 이력 1건 기록, 변경자·이전값·새값이 정확한지 확인
    - [ ] 업무 타입 체크박스 다중 변경(2개 → 3개) → 배열이 `', '` 결합 문자열로 정확히 기록되는지 확인
    - [ ] 중요도 슬라이더 변경 → **드래그 중이 아니라 `onValueCommit` 시점에만 1건**이 기록되는지 확인(드래그마다 이력이 쌓이면 안 됨 — 기존 구현이 `onValueChange`에서 서버 호출을 하지 않는다는 전제 재확인)
    - [ ] **전체 수정 폼**으로 같은 3개 필드를 바꿨을 때도 동일하게 기록되는지 확인(두 쓰기 경로 모두 커버 — 트리거 채택의 핵심 근거 검증)
    - [ ] 3개 필드를 **한 번의 UPDATE로 동시에** 바꾸면 이력이 **3건**(필드별 1건) 생기는지 확인
    - [ ] **같은 값으로 재저장** 시 이력이 생기지 않는지 확인(`IS DISTINCT FROM` 동작)
    - [ ] `title`/`content`만 수정했을 때 이력이 생기지 않는지 확인(추적 대상 한정 검증)
    - [ ] 타 부서 사용자로 상세 페이지 진입 → **이력은 읽히지만**(전 부서 공개) 편집 컨트롤은 여전히 숨겨지는지 확인
    - [ ] 일반 사용자 impersonation으로 `weekly_log_change_history`에 INSERT/UPDATE/DELETE 시도 → **전부 거부**(정책 없음) 확인
    - [ ] 변경자가 삭제된 사용자이거나 `changed_by`가 NULL인 행이 "시스템"으로 안전하게 렌더링되는지 확인
    - [ ] `weekly_logs` 행 삭제 시 이력이 CASCADE로 함께 삭제되는지 확인
    - [ ] 이력이 0건인 로그에서 섹션이 EmptyState로 안전하게 표시되는지 확인
    - [ ] 이력 50건 이상인 로그에서 렌더링·스크롤이 무너지지 않는지 확인(표시 건수 제한 또는 더보기 필요 여부 판단)
    - [ ] `get_advisors` — `unindexed_foreign_keys` 경고가 새로 생기지 않았는지 확인
  - **범위 밖 유지**: 제목·본문·날짜·금액 등 나머지 컬럼 추적, 이력 기반 되돌리기(revert), 이력 검색·필터·내보내기, 관리자용 전체 이력 화면, 첨부파일·댓글 변경 추적

---

### Phase 4: 목록 탐색 폴리시 (F045 · F046)

> 목표: 자주 쓰는 조회 조건을 재입력하지 않고, 검색 결과에서 왜 이 항목이 걸렸는지 즉시 보이는 상태. **DB 변경 0건, 순수 클라이언트 작업.**
> **선행 조건**: F045는 Phase 1(Task 040의 `author` 필터 축) 완료 후. F046은 완전 독립이라 언제든 착수 가능.

- **Task 046: 목록·칸반 필터 프리셋 저장 구현 (F045)**
  - [ ] **저장소 결정** — **`localStorage`** ← 권장(사용자 요청 범위와 일치). 마이그레이션이 없고 즉시 구현 가능하며, 프리셋은 개인 편의 설정이라 기기 간 동기화가 필수가 아니다. **한계를 캡션에 명시**: 브라우저·기기마다 별도 저장, 브라우저 데이터 삭제 시 사라짐. (DB 테이블로 승격하는 것은 향후 확장 경로로만 언급)
  - [ ] **Task 041이 세운 스토리지 규약을 재사용** — `lib/storage/local-storage.ts`의 안전 접근 래퍼, `useEffect` 안에서만 접근, 전 경로 `try/catch`, 사용자 id 네임스페이스. 키: `weekly-log-filter-presets:{userId}`
  - [ ] **저장 대상은 "필터 파라미터 집합"** — `department`/`status`/`q`/`from`/`to`/**`author`(Task 040 신설)**. **정렬(`sort`/`dir`)과 페이지 상태는 제외**할지 결정(권장: 제외 — 프리셋은 "무엇을 볼지"이지 "어떻게 정렬할지"가 아니며, 정렬은 클릭 한 번으로 바뀐다)
  - [ ] **목록·칸반이 프리셋을 공유** — 두 화면이 이미 `normalizeWeeklyLogFilters()`로 **동일한 파라미터 집합**을 쓰므로, 저장된 프리셋은 어느 화면에서 만들었든 양쪽에서 적용 가능하다. `components/weekly-log-filter-presets.tsx` 신규를 두 뷰(`weekly-log-list-view.tsx`, `weekly-log-kanban-view.tsx`)가 공유
  - [ ] **UI** — 필터 행에 `ui/dropdown-menu` 또는 `ui/select`로 "프리셋" 진입점. [현재 조건 저장](이름 입력 `ui/dialog`) / 목록에서 선택 시 `router.push`로 해당 쿼리 적용 / 개별 삭제. **기존 활성 필터 배지 행과 시각적으로 충돌하지 않게** 배치
  - [ ] **개수 상한과 이름 규칙** — 최대 N개(예: 10). 같은 이름 저장 시 덮어쓰기 확인(`ui/alert-dialog`). 이름 1~30자 트림
  - [ ] **적용 시 soft navigation 피드백** — 기존 필터 변경과 동일하게 `useTransition` + `isPending`으로 "멈춘 화면"을 방지(프로젝트의 로딩 피드백 컨벤션 준수)
  - [ ] **저장 시점의 부서가 이후 비활성/삭제된 경우** — 프리셋 적용 결과가 0건이 되는 것을 자연스럽게 허용하되, 존재하지 않는 부서 id면 필터를 조용히 무시(`normalizeWeeklyLogFilters`가 이미 department를 그대로 통과시키므로 **결과가 0건일 뿐 크래시하지 않음**을 실측 확인할 것)
  - **관련 파일**: `components/weekly-log-filter-presets.tsx`(신규), `hooks/use-filter-presets.ts`(신규), `lib/storage/local-storage.ts`(Task 041 산출물 재사용), `components/weekly-log-list-view.tsx`, `components/weekly-log-kanban-view.tsx`, `app/protected/weekly-logs/page.tsx`·`kanban/page.tsx`(`userId` prop 전달)
  - **DB 마이그레이션 불필요**
  - **수락 기준**: 현재 필터 조합을 이름을 붙여 저장하고, 목록·칸반 어디서든 한 번의 선택으로 적용·삭제할 수 있으며, 저장소를 쓸 수 없는 환경에서도 목록이 정상 동작한다
  - **테스트 체크리스트** (Playwright MCP. `browser_evaluate`로 `localStorage` 내용 대조)
    - [ ] 부서+상태+기간+검색어+`author`를 모두 지정해 저장 → 필터 초기화 → 프리셋 선택 시 **URL 쿼리와 화면 결과가 정확히 복원**되는지 확인
    - [ ] 저장한 프리셋이 **칸반 화면에서도** 그대로 적용되는지 확인(양방향)
    - [ ] 같은 이름 저장 시 덮어쓰기 확인 다이얼로그가 뜨고, 취소 시 기존 값이 유지되는지 확인
    - [ ] 상한 초과 저장 시도 시 안내가 뜨고 저장되지 않는지 확인
    - [ ] 삭제 후 목록에서 사라지고 `localStorage`에서도 제거되는지 확인
    - [ ] **사용자 격리**: A가 만든 프리셋이 B 로그인 시 보이지 않는지 확인
    - [ ] 손상된 JSON 주입 상태에서 크래시 없이 조용히 무시되는지 확인
    - [ ] `localStorage`를 throw하도록 스텁한 상태에서 목록·칸반이 정상 동작하고 프리셋 UI만 비활성화되는지 확인
    - [ ] 프리셋 적용 시 로딩 피드백이 뜨고, 총 건수("조건에 맞는 업무 N건")가 함께 갱신되는지 확인
    - [ ] 비활성/삭제된 부서를 가리키는 프리셋 적용 시 500 없이 빈 목록 + EmptyState가 뜨는지 확인
    - [ ] 콘솔 에러 0건

- **Task 047: 검색 결과 하이라이팅 구현 (F046)**
  - [ ] **범위 결정 — 제목만 하이라이팅** ← 권장. 근거를 주석에 명시: 목록 payload(`LOGS_SELECT`)에 **`content`가 아예 포함돼 있지 않다**(실측). 내용 스니펫을 보여주려면 325건×본문을 목록마다 내려받아야 하는데, 이는 **F032(성능 개선 이니셔티브)와 정면 충돌**한다. 검색이 제목/내용 OR로 동작하므로 **"내용에서만 매칭된 항목은 제목에 하이라이트가 없는" 상황**이 생기며, 이를 배지 등으로 보완할지는 이 Task에서 결정
  - [ ] `components/highlighted-text.tsx` 신규 — `text`와 `query`를 받아 매칭 구간을 `<mark>`로 감싼 **React 노드 배열**을 반환하는 순수 컴포넌트. **`dangerouslySetInnerHTML` 절대 사용 금지**(프로젝트의 sanitize 관례와 XSS 방어 원칙)
  - [ ] **매칭 규칙을 서버 검색과 일치시킬 것** — 서버는 `escapeLikePattern()` + `ilike '%...%'`로 **대소문자 무시 부분 일치**를 한다. 클라이언트도 동일하게 대소문자 무시로 매칭하되, **정규식 메타문자를 반드시 이스케이프**한다(`escapeLikePattern`이 `%`/`_`를 다루는 것과 같은 문제가 정규식 쪽에서 반복됨). 빈 문자열·공백만인 쿼리는 하이라이팅하지 않는다
  - [ ] **적용 위치** — `components/weekly-log-table.tsx`(제목 `Link` 내부, `comment_count` 배지는 건드리지 않음), `components/weekly-log-card.tsx`(모바일 카드), **`components/weekly-log-kanban-card.tsx`(칸반도 같은 `q` 필터를 쓰므로 함께 적용)**
  - [ ] **`<mark>` 스타일** — 기존 색상 토큰 재사용(`--warning` 계열 등)으로 **신규 토큰을 만들지 않는다**. 라이트/다크 양쪽에서 텍스트 대비가 충분한지 확인하고, 링크 텍스트 위에 얹히므로 밑줄·색상과 겹쳐 읽기 어려워지지 않는지 확인
  - [ ] **접근성** — `<mark>`는 의미 있는 강조 요소이므로 스크린리더가 과도하게 읽지 않도록 확인하고, 색상만으로 정보를 전달하지 않는지 점검
  - [ ] 매칭이 여러 번 등장하는 제목, 제목 전체가 매칭인 경우, 매우 긴 제목(100자 상한)에서 레이아웃이 깨지지 않는지 확인
  - **관련 파일**: `components/highlighted-text.tsx`(신규), `components/weekly-log-table.tsx`, `components/weekly-log-card.tsx`, `components/weekly-log-kanban-card.tsx`, `components/weekly-log-list-view.tsx`·`weekly-log-kanban-view.tsx`(`query` prop 전달), `lib/utils.ts`(정규식 이스케이프 헬퍼)
  - **DB 마이그레이션 불필요**
  - **수락 기준**: 키워드 검색 시 목록·카드·칸반의 제목에서 매칭 텍스트가 강조되고, 검색어에 정규식/LIKE 메타문자가 섞여도 화면이 깨지거나 잘못 강조되지 않으며, 라이트/다크 양쪽에서 판독 가능하다
  - **테스트 체크리스트** (Playwright MCP + 실데이터 325건 기준)
    - [ ] 일반 키워드 검색 → 매칭 구간만 정확히 강조되는지 확인(부분 일치·복수 매칭 포함)
    - [ ] **대소문자를 섞어 검색**해도 서버 결과와 하이라이트가 일치하는지 확인(영문 제목 대상)
    - [ ] **특수문자 검색어** — `%`, `_`, `(`, `)`, `[`, `.`, `*`, `+`, `\`, 콤마를 각각 포함한 검색어로 500·크래시·오강조가 없는지 확인(`.or()` 미사용 관례와 `escapeLikePattern`이 지키는 것과 같은 지점)
    - [ ] **내용에서만 매칭된 항목**(제목에 키워드 없음)에서 하이라이트가 없고, 그럼에도 결과 목록에 정상 포함되는지 확인
    - [ ] 검색어가 없을 때 `<mark>`가 전혀 렌더링되지 않는지 확인
    - [ ] 무한 스크롤로 다음 배치를 불러온 뒤에도 하이라이팅이 유지되는지 확인
    - [ ] 칸반 카드에서도 동일하게 동작하는지 확인
    - [ ] 라이트/다크 스크린샷 대조로 대비 확인, 1280/768/390 뷰포트에서 레이아웃 확인
    - [ ] `<script>`가 포함된 검색어를 입력해도 **텍스트로만 렌더링**되는지 확인(React 이스케이프 + `dangerouslySetInnerHTML` 미사용 증거)
    - [ ] 콘솔 에러 0건

---

### Phase 5: 캘린더/타임라인 뷰 (F047)

> 목표: 시작일~목표종료일을 시간축 위에서 겹쳐 보는 상태. **v2에서 비용 대비 우선순위가 가장 낮다고 사용자와 합의된 유일한 항목.**
> **선행 조건**: Phase 1~4 완료. **⚠️ 착수 전 사용자에게 실제 필요 여부를 재확인하고, 필요 없다면 "범위 밖 유지"로 종료한다.**

- **Task 048: 주간업무일지 타임라인 뷰 구현 (F047)**
  - [ ] **착수 게이트** — Phase 1~4 결과를 사용해본 뒤 "칸반으로 충분한지" 사용자에게 확인. **구현하지 않기로 결정되면 이 Task를 "범위 밖 유지"로 닫고 v2를 Phase 6으로 마감한다.** 이 게이트 자체가 Task의 첫 단계다
  - [ ] **구현 방식 결정** — **CSS Grid 직접 구현** ← 권장. 근거:
    - `recharts`가 이미 설치돼 있지만 **시계열 차트용이지 간트/타임라인용이 아니다**(막대의 시작 오프셋을 표현하는 데 부적합)
    - 전용 간트 라이브러리는 번들 증가 + 다크모드/CSS 변수 테마 통합 비용이 크고, **F032(성능 개선)와 상충**한다
    - 날짜는 이미 `date` 문자열이고 프로젝트에 날짜 라이브러리가 없다(v1 Task 029에서 `lib/utils.ts`의 순수 `Date` 헬퍼 3종으로 해결한 전례) — **동일한 방식으로 신규 의존성 없이** 구현
  - [ ] **라우트 신설** — `app/protected/weekly-logs/timeline/page.tsx`. **칸반 페이지와 동일한 구조를 복제**: `getClaims()` → `profiles` 조회 → **부서 게이트 리디렉션**(새 보호 페이지마다 반복되는 필수 체크, CLAUDE.md 명시) → `normalizeWeeklyLogFilters()` 재사용 → Suspense + 신규 스켈레톤
  - [ ] **뷰 전환 UI** — 목록·칸반·타임라인 3개를 오가는 탭/토글을 공통화. **현재 쿼리 파라미터를 유지한 채** 전환되어야 한다(필터를 다시 입력하게 만들지 말 것)
  - [ ] **⚠️ 데이터 규모 대응** — `weekly_logs`가 이미 325건이고 계속 증가한다. 목록은 무한 스크롤, 칸반은 컬럼별 페이징인데 **타임라인은 한 화면에 기간 전체를 그리는 구조**라 그대로 두면 가장 무거운 화면이 된다. → **기본 조회 기간을 제한**(예: 이번 달)하고 기간 필터를 필수로 노출하며, 렌더 상한(예: 200건) 초과 시 안내와 함께 절단한다
  - [ ] **표현 설계** — 행 = 업무 1건(또는 부서/담당자 그룹), 가로축 = 날짜. 막대 색은 **진행상태 색상(`STATUS_CHART_COLORS`)을 재사용**하고, 목표종료일이 지난 미완료 건은 **Task 040·칸반과 동일한 "지연" 규칙**으로 강조한다(세 화면의 지연 정의가 반드시 일치해야 함). 오늘 위치에 기준선 표시
  - [ ] **반응형** — 모바일에서는 가로 스크롤 컨테이너로 처리하되 **페이지 본문 자체가 가로 스크롤되지 않게** 한다(칸반 컬럼 반응형 수정에서 이미 겪은 문제 — 최근 커밋 `🐛 fix: 칸반보드 컬럼 반응형 레이아웃 수정` 참고)
  - [ ] **접근성** — 시각적 막대만으로는 정보 전달이 불가하므로 각 막대에 `aria-label`(업무명·기간·상태)을 부여하고, **`sr-only` 표 대체 콘텐츠**를 함께 제공한다(v1 Task 031이 차트에 적용한 것과 동일한 해법)
  - [ ] **드래그로 일정 변경은 범위 밖** — `@dnd-kit`이 이미 설치돼 있어 기술적으로 가능하지만, 날짜 변경은 `weekly_logs` UPDATE라 **부서 기반 쓰기 RLS·권한 분기**를 타임라인에서 다시 구현해야 한다. **읽기 전용 뷰로 확정**
  - **관련 파일**: `app/protected/weekly-logs/timeline/page.tsx`(신규), `components/weekly-log-timeline-view.tsx`(신규), `components/weekly-log-timeline-skeleton.tsx`(신규), `components/weekly-log-view-switcher.tsx`(신규, 3개 뷰 공용), `lib/queries/weekly-logs.ts`(타임라인용 조회 함수 추가), `lib/utils.ts`(날짜 축 계산 헬퍼)
  - **DB 마이그레이션 불필요** — 기존 `weekly_logs`를 읽기만 한다
  - **수락 기준**: 사용자가 지정한 기간의 업무를 시간축 위에서 확인할 수 있고, 목록·칸반과 **동일한 필터 조건**이 적용되며, 지연 판정이 세 화면에서 일치하고, 3개 뷰포트에서 페이지 가로 스크롤이 발생하지 않는다
  - **테스트 체크리스트** (Playwright MCP + Supabase MCP)
    - [ ] 기간을 지정해 진입 시 막대의 시작·끝 위치가 실제 `start_date`/`target_end_date`와 일치하는지 확인(경계 날짜 포함 여부 검증)
    - [ ] 조회 기간을 벗어나 걸치는 장기 과제가 **잘린 막대로 표시**되고 누락되지 않는지 확인(v1 Task 029의 "기간이 겹치는 항목" 원칙과 동일)
    - [ ] 목록·칸반에서 필터를 지정한 뒤 뷰를 전환하면 **필터가 유지**되는지 확인(3방향 전부)
    - [ ] 지연 강조가 칸반 "지연" 배지 및 F040 위젯 숫자와 **일치**하는지 확인
    - [ ] 렌더 상한 초과 시 안내가 뜨고 페이지가 멈추지 않는지 확인(기간을 넓혀 실측)
    - [ ] 0건 기간에서 EmptyState가 뜨는지 확인
    - [ ] 부서 미설정 사용자가 URL 직접 접근 시 `/protected/profile`로 리디렉션되는지 확인(부서 게이트 누락 방지)
    - [ ] 비로그인 접근 시 `proxy.ts` 게이트로 `/auth/login`으로 가는지 확인
    - [ ] 1280/768/390 뷰포트에서 **페이지 본문이 가로 스크롤되지 않고** 타임라인 컨테이너 내부만 스크롤되는지 확인
    - [ ] 라이트/다크 색상 대비, `sr-only` 표 대체 콘텐츠 내용 확인
    - [ ] `npm run build`로 신규 라우트의 청크가 다른 라우트에 새지 않는지 확인(v1 Task 031의 recharts 검증 방식 재사용)
    - [ ] 콘솔 에러 0건
  - **범위 밖 유지**: 드래그로 일정 변경, 의존 관계(선행 작업) 표현, 마일스톤·리소스 뷰, 월/주/일 단위 줌 전환, 캘린더(월 그리드) 뷰를 타임라인과 별개로 추가하는 것, 타임라인 이미지/PDF 내보내기

---

### Phase 6: 통합 검증 및 v2 마감

> 목표: 8개 기능이 서로, 그리고 v1·MVP 기능과 충돌 없이 동작함을 증명하고 배포 가능한 상태. **알림 동작 변경(F041·F044)과 필터 축 신설(F040)이 기존 검증을 무효화할 수 있으므로 회귀 범위를 넓게 잡는다.**
> **선행 조건**: Phase 1~4 완료(Phase 5는 착수 여부와 무관하게 진행 가능).

- **Task 049: v2 통합 E2E 및 알림·권한 회귀 테스트**
  - [ ] **테스트 계정 세트 구성** — 슈퍼관리자 1 / 관리자 1 / 일반 사용자 2(같은 부서 1, 타 부서 1) / 부서 미설정 1. **실제 회원가입 플로우로 생성**하고 SQL로 역할·부서만 조정, 종료 후 `auth.users` DELETE로 완전 삭제해 **기준선(65 profiles / 325 logs / 8 departments)으로 원복 확인**
  - [ ] **알림 매트릭스 전수 검증** — 유형 4종(comment / reply / mention / reminder) × 설정 on·off 조합. 특히 **댓글+멘션 동시 발생**, **설정 off 상태의 리마인더**, **같은 주 중복 실행**을 포함
  - [ ] **v1 회귀** — 댓글·멘션·Realtime 즉시 갱신·읽음 처리·폴백 폴링, 관리자 콘솔 5개 탭의 조직 범위 제한, 슈퍼관리자 전 조직 확장, 추천/비추천 토글, PDF/Excel 다운로드가 화면 필터와 일치, 대시보드 7개 차트 수치
  - [ ] **MVP 회귀** — CRUD, 부서 기반 쓰기 RLS(타 부서 수정 불가), 첨부파일 업로드/다운로드, 검색·기간 필터, 무한 스크롤, 총 건수
  - [ ] **v2 교차 검증 (신규 기능 간 상호작용)**
    - F040 `author` 필터 + F045 프리셋 + F046 하이라이팅을 **동시에** 적용했을 때 목록·총 건수·칸반이 모두 일관된지
    - F042 draft를 복원해 저장한 로그가 F043 이력에 정상 기록되는지
    - F043 이력이 쌓인 로그에서 F044 알림 설정을 꺼도 이력은 계속 기록되는지(두 기능이 독립인지)
    - F041 리마인더를 받고 작성 화면으로 이동 → F042 draft 복원 배너와 충돌하지 않는지
  - [ ] **권한 회귀 (UI 은닉에만 의존하지 않음)** — 일반 사용자를 impersonate해 v2가 추가한 모든 쓰기 경로를 SQL로 직접 시도: `weekly_log_change_history` INSERT/UPDATE/DELETE, `notifications` INSERT, `create_weekly_log_reminders()` 호출, 타인의 `notify_on_*` UPDATE, 타인 `role` 상승. **전부 거부되어야 함**
  - [ ] **성능 확인** — F040 위젯 RPC·F043 이력 조회의 `EXPLAIN ANALYZE`, 목록/상세 진입 시 늘어난 왕복 횟수, `npm run build` 번들 크기 비교(v1 Task 039 F032 측정 방식 재사용)
  - [ ] `npm run lint` / `npx tsc --noEmit` / `npm run build` 전부 통과
  - **수락 기준**: 위 모든 항목이 통과하고, v1·MVP 기능에서 회귀가 0건이며, 발견된 문제는 해당 Task로 되돌려 수정 후 재검증된다
  - **테스트 체크리스트**: 위 구현 항목이 곧 체크리스트 (각 항목 완료 시 실측 근거·수치를 함께 기록)

- **Task 050: 문서 갱신 및 v2 마감**
  - [ ] **CLAUDE.md 갱신 (이번 v2에서 가장 중요한 문서 작업)** — 아래 항목은 **다음 세션의 에이전트가 반드시 알아야 하는 새 관례**다:
    - **`pg_cron` 최초 도입** — 등록된 잡 목록, `cron.schedule()`은 `list_migrations`에도 로컬 `supabase/migrations/`에도 남지 않는다는 점, 이 DB가 다른 도메인과 공유된다는 점
    - **알림 생성 경로가 2종**(트리거 + 스케줄 함수)이 되었고, **클라이언트 INSERT 불가 원칙은 그대로**라는 점
    - **알림 유형이 4종**(comment/reply/mention/reminder)이고 `actor_id`/`weekly_log_id`가 nullable이 되었다는 점, `'reply'`가 `notify_on_comment`를 따른다는 매핑
    - **`localStorage` 최초 도입**과 키 네이밍·사용자 네임스페이스·`try/catch`·`useEffect` 전용 접근 규약
    - **`weekly_log_change_history`** — 트리거로만 기록, 쓰기 정책 없음이 의도된 설계라는 점, 추적 대상이 3개 컬럼로 한정된 근거
    - **`author` 필터 축**이 `applyScalarFilters()`에 추가되어 목록·칸반·count 3곳에 공유된다는 점
    - **지연 판정 규칙이 3곳(칸반·F040 위젯·타임라인)에서 동일해야 한다**는 제약
    - **문서 경로 정정** — CLAUDE.md가 참조하는 `docs/PRD.md`·`docs/ROADMAP_v1.md`를 실제 경로 `docs/prd/PRD.md`·`docs/roadmap/ROADMAP_v1.md`로 수정(v1 이후 디렉터리 재편으로 생긴 불일치, 이번 실측에서 발견)
  - [ ] **`docs/prd/PRD.md` 갱신** — F040~F047을 기능 명세에 추가, 데이터 모델 절에 `weekly_log_change_history`·`notifications` 확장·`profiles` 알림 설정 컬럼 반영
  - [ ] **`docs/guides/deployment-ops.md` 갱신**
    - 7절(알림 보존 정책) — `pg_cron` 도입으로 전제가 바뀌었으므로 수동 절차를 스케줄 잡으로 대체할지 결정하고 반영
    - **신규 절: cron 잡 운영** — 등록된 잡 목록, crontab과 UTC↔KST 환산, 실패 확인 방법(`cron.job_run_details`), 잡 재등록·중단 절차, 다른 도메인과 공유되는 확장이라는 주의
    - **신규 절 또는 7절 확장: 이력 테이블 보존 정책** — `weekly_log_change_history` 증가 특성과 정리 기준
  - [ ] **`docs/roadmap/ROADMAP_V2.md`(본 문서) 마감** — 완료 Task에 ✅, 구현 중 실측으로 계획과 달라진 부분을 각 Task의 "로드맵과 다르게 처리한 부분"으로 기록(v1의 관례)
  - [ ] `mcp__supabase__get_advisors`(security + performance) 최종 확인 — v2가 추가한 함수·테이블·인덱스로 인한 새 경고 정리, 남는 경고는 근거와 함께 문서화
  - [ ] **배포 전 점검** — 환경변수 변경 없음 확인(v2는 신규 외부 서비스를 도입하지 않음), 빌드 산출물 확인, **프로덕션에서 `pg_cron` 잡이 실제로 등록·실행되는지 확인**(로컬/개발에서는 검증 불가능한 유일한 항목)
  - **수락 기준**: 다음 세션의 에이전트가 CLAUDE.md만 읽고도 v2가 추가한 관례(cron·스토리지·알림 4종·이력 테이블)를 위반하지 않고 작업할 수 있으며, 운영자가 `deployment-ops.md`만 보고 cron 잡을 점검·재등록할 수 있다
  - **테스트 체크리스트**
    - [ ] 갱신된 CLAUDE.md의 모든 파일 경로·함수명·테이블명이 실제와 일치하는지 grep으로 대조
    - [ ] `deployment-ops.md`의 cron 절차를 **실제로 따라 해보며** 잡 조회·중단·재등록이 문서대로 동작하는지 확인
    - [ ] PRD의 F040~F047 명세가 구현된 동작과 일치하는지 항목별 대조
    - [ ] 프로덕션 배포 후 스모크: 로그인 → 목록(F040 위젯) → 작성(F042) → 상세(F043) → 프로필(F044) → 알림 벨 확인

---

## 기능 ID 커버리지 매핑

| 기능 ID | 기능명 | 담당 Task |
|---------|--------|-----------|
| F040 | "내 업무" 개인 요약 위젯 | Task 040 |
| F041 | 정기 작성 리마인더 (pg_cron) | Task 042(스키마), Task 044(함수·스케줄) |
| F042 | 작성 중 임시저장(draft) | Task 041 |
| F043 | 상태·업무타입·중요도 변경 이력 | Task 045 |
| F044 | 알림 구독 설정 | Task 042(스키마), Task 043(UI·트리거 게이트) |
| F045 | 필터 프리셋 저장 | Task 046 |
| F046 | 검색 결과 하이라이팅 | Task 047 |
| F047 | 캘린더/타임라인 뷰 | Task 048 (**착수 게이트 있음 — 범위 밖 종료 가능**) |
| — | 통합 검증·마감 | Task 049, Task 050 |

## 데이터 모델 변경 요약 (v1 대비)

| 테이블/객체 | 변경 | Task |
|--------------|------|------|
| `stats_my_work_summary(...)` | **신규 RPC** (`SECURITY INVOKER`, `anon` EXECUTE 회수, `today_param`을 받아 `current_date` 미참조) | 040 |
| `weekly_logs` | **스키마 변경 없음** — `author_id` 필터는 애플리케이션 쿼리 레벨 추가일 뿐 | 040 |
| `notifications` | `actor_id`·`weekly_log_id`를 **nullable로 완화**, `type` CHECK에 `'reminder'` 추가, **`period_start date` 컬럼 신규** + `unique (recipient_id, period_start) where type='reminder'` 부분 인덱스 | 042 |
| `profiles` | `notify_on_comment` / `notify_on_mention` / `notify_on_reminder` **boolean NOT NULL DEFAULT true 3종 추가**(백필 불필요). RLS·`role` 보호 트리거는 **변경 없음** | 042 |
| `notify_on_new_comment()` / `notify_on_comment_mention()` | 수신자의 알림 설정을 확인하는 게이트 추가. **댓글·멘션 저장 자체는 절대 막지 않음** | 043 |
| `pg_cron` 확장 | **신규 설치** (프로젝트 최초). `cron.job`에 `weekly_log_reminder` 잡 등록 — **마이그레이션 이력에 코드로 남지 않으므로 문서화 필수** | 044 |
| `create_weekly_log_reminders(date)` | **신규 함수** (`SECURITY DEFINER`, `authenticated`/`anon` EXECUTE 미부여) | 044 |
| `weekly_log_change_history` | **신규 테이블** (트리거 전용 기록, SELECT 정책만 존재하고 쓰기 정책 없음 = 의도된 설계) | 045 |
| `weekly_logs` 이력 트리거 | `AFTER UPDATE OF status, work_type, importance` `SECURITY DEFINER` 트리거 신규 | 045 |
| — (F045·F046·F047) | **DB 변경 없음** — 클라이언트/조회 전용 | 046, 047, 048 |

## 주요 리스크 및 결정 필요 사항

| 항목 | 내용 | 결정 시점 |
|------|------|-----------|
| **🚨 `pg_cron` 최초 도입** | 확장 미설치 상태(`installed_version: null`)에서 시작. **DB 전역 확장이라 이 Supabase를 공유하는 다른 도메인(ERP)에도 영향**을 주고, `cron.schedule()`은 마이그레이션 이력·로컬 파일 어디에도 코드로 남지 않아 **추적성이 가장 떨어지는 변경**이다. v1의 "Realtime 최초 도입"과 동일한 성격의 인프라 리스크 — 착수 전 `cron.job` 충돌 확인과 사용자 승인, 완료 후 운영 문서화가 필수 | Task 044 |
| **🚨 리마인더 중복 방지 키** | 기존 `UNIQUE (recipient_id, comment_id)`는 `comment_id`가 NULL이면 **Postgres가 NULL을 서로 구별해 중복 억제가 전혀 동작하지 않는다**(실측 확인). 별도 `period_start` + 부분 유니크 인덱스를 반드시 만들어야 하며, 이를 빠뜨리면 **cron 재시도 때마다 같은 사용자에게 알림이 쌓인다** | Task 042 |
| `notifications` NOT NULL 완화의 파급 | `actor_id`·`weekly_log_id`를 nullable로 바꾸면 `enrichNotifications()`와 `notificationHref()`가 컴파일 에러로 드러난다(의도된 안전장치). **타입 재생성 직후 두 곳을 반드시 함께 수정**해야 하며, 놓치면 리마인더 알림에서 런타임 크래시 | Task 042 |
| "이번 주" / "지연"의 타임존 | Postgres `current_date`는 Supabase 기본 세션 타임존(UTC) 기준이고, 칸반은 Node의 `new Date()`(서버 로컬)로 계산한다 → **KST 사용자 기준으로 최대 하루 어긋날 수 있다.** F040은 `today_param`을 파라미터로 받고, F041은 `now() at time zone 'Asia/Seoul'`로 계산한다는 방침을 확정 | Task 040·044 |
| "지연" 정의의 3중 일치 | 칸반(`weekly-log-kanban-column.tsx:71`) · F040 위젯 · F047 타임라인이 **동일한 규칙**을 써야 한다. 한 곳만 바뀌면 사용자가 화면마다 다른 숫자를 본다 | Task 040·048 |
| "미작성" 판정 기준 | `created_at` 기준으로 하면 "지난주에 미리 등록한 이번 주 업무"를 미작성으로 오판한다 → 프로젝트 관례("기간이 겹치는 항목", v1 Task 029)를 재사용할지 확정 | Task 044 |
| 리마인더 발송 요일·시각 | 주 초 독려(월)인지 주 마감 독려(금)인지, 몇 시인지. cron은 UTC 기준이라 KST 환산 필요 | Task 044 |
| `profiles.is_active` 존중 여부 | DB에는 있으나 **이 앱 소스에서 사용처 0건**(다른 도메인이 추가한 것으로 추정). 리마인더 수신자에서 제외할지 결정하려면 컬럼의 실제 의미 확인이 선행 | Task 044 |
| `'reply'` 알림의 설정 매핑 | 별도 컬럼 없이 `notify_on_comment`를 따르게 할지, 4번째 컬럼을 둘지. 사용자 인지 부담과 스키마 단순성의 트레이드오프 | Task 042 |
| 알림 게이트가 기능을 막지 않을 것 | `notify_on_*` 확인 로직을 `AFTER INSERT` 트리거에서 잘못 처리(예외 throw)하면 **댓글 작성 자체가 실패**한다. 게이트는 "알림 행을 만들지 않는다"까지만 | Task 043 |
| **`localStorage` 최초 도입 규약** | 프로젝트 전체에 사용처 0건. Task 041이 정하는 키 네이밍·사용자 네임스페이스·`try/catch`·`useEffect` 전용 접근이 **이후 모든 스토리지 사용의 표준**이 되므로 신중히 확정 | Task 041 |
| draft 복원 콘텐츠의 신뢰성 | `localStorage`는 사용자·확장프로그램이 임의로 쓸 수 있다 → 복원한 `content`를 에디터에 주입하기 전 `sanitizeWeeklyLogContent()` 재통과 여부 확정 | Task 041 |
| draft 적용 범위(수정 폼 포함 여부) | `weekly_logs`에 낙관적 잠금이 없어 오래된 draft 복원이 **타인 변경을 조용히 덮어쓸 수 있다** → 신규 작성 폼으로 한정할지 확정 | Task 041 |
| F043 추적 대상 컬럼 | 3개(status/work_type/importance)로 한정할지, 제목·본문까지 넓힐지. 본문은 HTML이라 **diff 저장이 곧 풀 감사로그**로 번진다 | Task 045 |
| F043 기록 방식 | DB 트리거 vs 서버 액션 — 각 속성마다 쓰기 경로가 2개(인라인 + 수정 폼)라 액션 방식은 6곳 중복 작성이 필요하고 누락 위험이 크다 | Task 045 |
| 이력·알림 데이터 증가 | 이력은 인라인 편집마다, 알림은 활동마다 쌓인다. 보존 정책을 정하지 않으면 **v2가 이 프로젝트에서 가장 빨리 커지는 두 테이블을 만든다** | Task 045·050 |
| **`applyScalarFilters()` 공유 함정** | `author` 필터를 목록 빌더에만 추가하고 `countWeeklyLogs()`에 빠뜨리면 **화면 목록과 "총 N건"이 어긋난다**(F039에서 이미 겪은 지점). 칸반도 같은 헬퍼를 쓰므로 3곳 동시 반영 확인 필요 | Task 040 |
| F046 하이라이팅 범위 | 목록 payload에 `content`가 없어 **제목만 강조 가능**하다. 내용 스니펫을 넣으려면 payload를 키워야 하는데 F032(성능 개선)와 상충 → 제목 한정 + "내용에서만 매칭된 항목"의 표현 방식 확정 | Task 047 |
| F046 정규식 이스케이프 | 서버는 `escapeLikePattern()`으로 LIKE 메타문자를 다루지만, 클라이언트 하이라이팅은 **정규식 메타문자**라는 별개의 문제를 만난다. 이스케이프를 빠뜨리면 특수문자 검색 시 오강조·예외 발생 | Task 047 |
| **F047 착수 여부 자체** | v2에서 **유일하게 "범위 밖 유지"로 종료 가능한 Task.** Phase 1~4를 써본 뒤 칸반으로 충분한지 재확인하는 게이트를 Task의 첫 단계로 둔다 | Task 048 |
| F047 렌더 규모 | 한 화면에 기간 전체를 그리는 구조라 325건(계속 증가)에서 가장 무거운 화면이 된다 → 기본 기간 제한과 렌더 상한 필요 | Task 048 |
| 공유 DB에서의 이름 충돌 | 이 Supabase 프로젝트에 ERP 성격의 테이블 19종이 함께 있다 → 신규 테이블·함수·cron 잡 이름에 `weekly_log_` 접두사를 일관되게 적용 | Task 042·044·045 |
| 신규 shadcn 프리미티브 2종 | `switch`(F044)·`collapsible`(F043)가 미설치 → 설치 후 라이트/다크 대비 확인, 번들 영향 확인 | Task 043·045 |
