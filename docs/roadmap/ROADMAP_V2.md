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

- **Task 044: 정기 작성 리마인더 — `pg_cron` 도입 및 스케줄 알림 생성 (F041) ✅**
  - [x] **⚠️ 이 프로젝트 최초의 `pg_cron` 도입 — 착수 전 확인 3종** — 미설치 재확인 후 사용자에게 "이 Supabase 프로젝트가 다른 ERP 도메인과 공유 중"임을 명시해 승인 요청, **금요일 15:00 KST 발송(마감 독려)으로 확정 승인받음**. `cron.job` 사전 조회 결과 기존 등록 잡 0건(다른 도메인도 아직 미사용) 확인 후 진행
  - [x] **알림 생성 함수 신규** — `create_weekly_log_reminders(target_week_start date default null)` 생성 완료(`SECURITY DEFINER`, `set search_path = ''`). `information_schema.routine_privileges` 실측 확인 결과 EXECUTE 권한은 `postgres`/`service_role`뿐, `anon`/`authenticated` 없음
  - [x] **"이번 주" 기준 결정** — `date_trunc('week', (now() at time zone 'Asia/Seoul')::date)::date`로 확정, 함수 본문에 타임존 근거 주석 포함(`pg_get_functiondef`로 실측 확인)
  - [x] **"미작성" 정의 결정** — "기간이 겹치는 항목"(v1 Task 029) 관례 그대로 채택, 함수 본문에 반영
  - [x] **수신자 필터 및 `is_active` 결정** — `department_id is not null AND notify_on_reminder = true AND is_active = true`로 확정. **판단 근거**: `is_active` 컬럼 코멘트를 실측한 결과 "ERP 로그인 허용 여부. false면 인증은 성공해도 ERP 진입이 차단된다"(다른 도메인이 추가한 계정 잠금 플래그, `add_profiles_is_active` 마이그레이션)로 확인되어, 로그인 자체가 막힌 사실상 비활성 계정에 작성 독려 알림을 보내는 것은 무의미하다고 판단해 보수적으로 제외
  - [x] **중복 방지** — `period_start`(이번 주 시작일) + `on conflict (recipient_id, period_start) where type='reminder' do nothing`
  - [x] **컬럼 보호 트리거 우회** — 확인 결과 `notifications_protect_columns`는 `BEFORE UPDATE`에만 걸려 있어(`BEFORE INSERT` 없음) 이 INSERT 경로엔 `set_config` 우회가 애초에 불필요함을 함수 주석에 명시(기존 notify 함수 2종과 달리 우회 코드 없음 — 로드맵의 "필요 시" 조건부 문구가 실제로는 "불필요"로 판명된 경우)
  - [x] **스케줄 등록** — `cron.schedule('weekly_log_reminder', '0 6 * * 5', $$select public.create_weekly_log_reminders()$$)`. 사용자 승인대로 금요일 15:00 KST(=06:00 UTC) 확정
  - [x] **⚠️ 마이그레이션 추적성** — `docs/guides/deployment-ops.md`에 9절("`pg_cron` 잡 운영") 신규 추가: 등록된 잡 표, 조회·점검 SQL, 재등록/중단 SQL, 알림 보존 정책(7절)과의 관계. CLAUDE.md 반영은 Task 050에서 예정대로 진행
  - [x] **알림 UI 대응 확인** — `notificationHref()`는 Task 042에서 이미 대응돼 추가 작업 없음(실측 확인). `formatNotificationMessage()`(`lib/format.ts`)에 `reminder` 케이스 추가("이번 주 주간업무일지를 아직 작성하지 않았습니다"), `notification-bell.tsx`에 리마인더 전용 아이콘(`CalendarClock`, 시스템 표시로 아바타 대체) 추가
  - [x] **(선택) 알림 보존 정책 자동화** — **채택하지 않음(범위 밖 유지)**. 로드맵 권장은 "함께 등록"이었으나, Task 044 자체가 이미 최초의 `pg_cron`·최초의 스케줄 알림 생성 경로라는 두 가지 새 위험을 동시에 다루고 있어 여기에 별도 정리 잡까지 얹으면 검증 범위가 필요 이상으로 커진다고 판단. 9절에 "필요해지면 이 패턴을 따라 추가"로 경로만 남겨둠
  - **관련 파일**: DB 마이그레이션(`enable_pg_cron`, `add_weekly_log_reminder_function`, `schedule_weekly_log_reminder`), `components/notification-bell.tsx`, `lib/format.ts`, `docs/guides/deployment-ops.md`(9절 신규 + 7절 갱신)
  - **수락 기준**: 지정한 요일·시각에 리마인더가 자동 생성되고, **이번 주 로그를 이미 작성한 사용자와 리마인더를 끈 사용자에게는 생성되지 않으며**, 같은 주에 함수를 여러 번 실행해도 사용자당 알림이 1건을 넘지 않고, 알림 클릭 시 작성 화면으로 이동한다. 클라이언트는 이 함수를 호출할 수 없다 — **전부 충족 확인**
  - **로드맵과 다르게 처리한 부분(중요)**: 이 Task는 진행 중 한 차례 중단(사용자 요청) 후 재개됐다. 중단 시점에 DB 쪽(확장 설치·함수·cron 잡 등록)은 이미 완료돼 있었고, 검증 과정에서 과거 날짜(`1999-01-04`)로 3회 임시 실행한 이력이 `cron.job_run_details`에 남아 있으나 **`notifications`에는 어떤 흔적도 남지 않음을 확인**(해당 시점 데이터로는 대상자가 없었기 때문). 재개 후 아래 항목을 원 계획과 다르게 수행:
    - 개별 체크리스트 항목을 하나씩 실행하는 대신, **실제 65 프로필 데이터에 대해 "기대 수신자 집합(직접 계산) vs 함수가 실제로 생성한 수신자 집합"의 대칭차집합이 0건"**임을 한 번에 검증(트랜잭션 내 임시 테이블 사용, 전부 ROLLBACK) — `department_id`/`notify_on_reminder`/`is_active`/"미작성" 정의 4개 조건을 개별 테스트하는 것보다 실데이터 기준으로 더 강한 증거이며, 결과는 기대 58명 = 실제 생성 58명(대칭차집합 0)으로 정확히 일치
    - 연속 2회 호출 시 1차 58건 삽입 후 2차 0건 삽입(전체 58건 유지)으로 중복 방지 확인
    - `authenticated` impersonation 호출 → 실제로 `42501 permission denied` 발생 확인
    - `get_advisors`(security/performance) 재확인 → 이 Task로 인한 신규 경고 없음(기존 경고만 잔존)
    - **벨 UI 렌더링 확인 중 실측 이슈 발견**: 기존에 떠 있던 `next start`(프로덕션 빌드) 서버로 QA를 시도했더니 Task 042~044에서 바뀐 코드가 전혀 반영되지 않은 상태였다(빌드 시점이 코드 변경보다 앞섬 — 프로덕션 서버는 파일 변경을 감지하지 않으므로 당연한 동작이었으나 처음엔 회귀로 오인할 뻔했다). **원인 파악 후 임시로 별도 포트(3001)에 `next dev`를 새로 띄워 검증**하고 종료 시 정리했다 — 기존 3000번 프로덕션 서버는 건드리지 않음. 3001에서 실계정(QA 신규 가입 후 `notifications`에 리마인더 행 1건 직접 INSERT)으로 벨 배지 "1"·아이콘·문구("이번 주 주간업무일지를 아직 작성하지 않았습니다")·클릭 시 `/protected/weekly-logs/new` 이동을 모두 확인, 이후 QA 계정·알림 행 전부 삭제해 65 profiles 기준선 복원 확인
    - `markNotificationReadAction`/Realtime 폴백 회귀, 경계값(주 시작/종료일에 걸친 로그)·타임존 세션 변경 재실행은 이번 재개 범위에서 별도로 반복 검증하지 않음 — 함수가 세션 타임존과 무관하게 `at time zone 'Asia/Seoul'`을 명시적으로 계산하도록 작성되어 있어 구조적으로 세션 타임존에 의존하지 않는다는 점(코드 실측)과, Task 043에서 이미 동일한 알림 파이프라인(Realtime·읽음 처리)의 회귀를 검증했다는 점에 근거해 낮은 리스크로 판단
  - **범위 밖 유지**: 이메일·슬랙 등 앱 외부 채널 발송, 사용자별 리마인더 요일/시각 커스터마이징, 미작성자 목록을 관리자에게 리포트하는 기능, 리마인더 발송 이력 테이블, 알림 보존 정책 자동화(위 참고)

---

### Phase 3: 변경 이력 (F043)

> 목표: 상세 페이지에서 **즉시 저장되는 3개 속성**의 변경을 누가 언제 했는지 되짚을 수 있는 상태. **최소 버전** — 풀 감사로그 시스템이 아니다.
> **선행 조건**: 없음. Phase 2와 병렬 진행 가능(수정 파일이 겹치지 않음).

- **Task 045: 상태·업무타입·중요도 변경 이력 구현 (F043)** ✅
  - [x] **추적 대상 컬럼 결정 (착수 첫 단계)** — 권장안 `status`/`work_type`/`importance` 3개로 확정, 근거를 마이그레이션 주석(`create_weekly_log_change_history`)에 남김.
  - [x] **DB 마이그레이션 — `weekly_log_change_history` 테이블 신규** — 계획한 컬럼 구성 그대로 적용(`changed_by` nullable, `work_type`은 `array_to_string(..., ', ')` 문자열 저장, `(weekly_log_id, created_at desc)` + `changed_by` 커버링 인덱스 2종).
  - [x] **기록 방식: DB 트리거** — `record_weekly_log_change_history()`(`AFTER UPDATE OF status, work_type, importance`, `SECURITY DEFINER`, `set search_path = ''`), `IS DISTINCT FROM`으로 실제 변경분만 기록.
  - [x] **RLS 정책 — `notifications` 관례 적용** — SELECT는 `to authenticated using (true)`(`weekly_logs_select_all_authenticated`와 동일 패턴), INSERT/UPDATE/DELETE 정책은 의도적으로 생성하지 않음.
  - [x] `mcp__supabase__generate_typescript_types` 재생성 → `lib/types/index.ts`에 `WeeklyLogChangeHistoryField`/`WeeklyLogChangeHistory`/`WeeklyLogChangeHistoryItem` 추가.
  - [x] `lib/queries/weekly-log-history.ts` 신규 — `get_profile_identities` RPC로 변경자 배치 조회, `changed_by` NULL은 이름/이메일도 NULL로 통과시켜 컴포넌트가 "시스템"으로 렌더링.
  - [x] **UI — 상세 페이지 접이식 섹션** — `npx shadcn@latest add collapsible` 설치 후 `components/weekly-log-change-history.tsx` 신규, 기본 접힘 상태로 댓글 섹션 바로 위에 배치.
  - [x] **표시 라벨은 렌더링 시점에 한글로 매핑** — `lib/format.ts`의 `getChangeHistoryFieldLabel()`/`formatChangeHistoryValue()`(status→`getStatusLabel`, importance→`formatImportanceLabel`, work_type은 저장된 문자열 그대로).
  - [x] **성능·증가량 고려** — 조회는 `weekly_log_id` 인덱스로 좁혀지고 최근 50건 상한(`HISTORY_PAGE_SIZE`) + 접이식 섹션 내부 `max-h-80 overflow-y-auto`로 대응(최소 버전이라 "더보기" 페이지네이션은 채택하지 않음, 근거를 쿼리 파일 주석에 명시).
  - **⚠️ 계획과 다르게 처리한 부분 1 — 한글 조사(을/를) 처리**: 계획에 없던 문제를 실측 중 발견 — "OOO님이 업무타입를 …"처럼 받침 있는 라벨에 "를"이 잘못 붙는 문법 오류가 Playwright 스냅샷으로 드러났다(업무타입 ㅂ받침, 진행상태·업무 중요도는 우연히 받침이 없어 정상으로 보였음). `lib/utils.ts`에 `getObjectParticle()`(한글 완성형 유니코드 범위에서 받침 유무로 을/를을 고르는 범용 헬퍼, 완성형 밖 문자는 "를"로 폴백)를 신규 추가해 해결 — 향후 다른 화면에서 라벨을 동적으로 문장에 조합할 때도 재사용 가능.
  - **⚠️ 계획과 다르게 처리한 부분 2 — 트리거 함수 EXECUTE 권한 회수 2단계**: `get_advisors`(security)가 `record_weekly_log_change_history()`를 anon/authenticated가 직접 RPC로 호출 가능한 `SECURITY DEFINER` 함수로 경고했다. `revoke ... from public`만으로는 `proacl` 실측 결과 anon/authenticated 개별 grant가 남아 있어(Supabase가 함수 생성 시 PUBLIC과 별개로 두 역할에 직접 grant하는 것으로 실측 확인) 경고가 사라지지 않았고, `notify_on_new_comment()`의 `proacl`(postgres/service_role만)과 대조해 anon/authenticated에서 각각 명시적으로 재차 `revoke`하는 후속 마이그레이션(`revoke_execute_record_weekly_log_change_history_v2`)을 추가로 적용해서야 동일한 ACL로 맞춰졌다. 트리거는 이 회수 이후에도 정상 발화함을 재확인(같은 세션에서 impersonation 재테스트).
  - **관련 파일**: DB 마이그레이션(`create_weekly_log_change_history`, `revoke_execute_record_weekly_log_change_history`, `revoke_execute_record_weekly_log_change_history_v2`), `lib/queries/weekly-log-history.ts`(신규), `lib/types/index.ts`, `lib/format.ts`(라벨 포맷터 2종), `lib/utils.ts`(`getObjectParticle` 신규), `components/weekly-log-change-history.tsx`(신규), `components/ui/collapsible.tsx`(신규, shadcn), `app/protected/weekly-logs/[id]/page.tsx`, `components/weekly-log-detail-view.tsx`(섹션 배치), `lib/supabase/database.types.ts`
  - **수락 기준**: 진행상태·업무타입·중요도를 상세 인라인 경로로 바꾸면 이력이 1건 기록되고, 상세 페이지에서 변경자·변경 내용·시각을 확인할 수 있으며, 클라이언트가 어떤 경로로도 이력을 위조·수정·삭제할 수 없다 — **전부 실측 확인 완료.**
  - **테스트 체크리스트** (Supabase MCP `execute_sql`(`BEGIN`/`ROLLBACK`, impersonation) 중심 + Playwright MCP 실브라우저 QA 계정 1개, 종료 후 완전 삭제 및 65 profiles/325 logs/이력 0건 기준선 원복 확인)
    - [x] 상세 페이지에서 진행상태 변경 → 이력 1건 기록, 변경자·이전값·새값 정확 확인 — Playwright로 실측(예정→진행중, `qa-task045@example.com`)
    - [x] 업무 타입 체크박스 다중 변경 → 배열이 `', '` 결합 문자열로 정확히 기록되는지 확인 — `시스템 개발` → `시스템 개발, 네트워크`로 정확히 기록
    - [x] **전체 수정 폼** 경로도 동일 트리거로 커버되는지 확인 — 별도 UI 재현 대신 `toWeeklyLogPayload()`가 work_type/importance를 매번 SET 절에 포함시켜 보내는 코드 경로를 확인하고, 동일 트리거(`AFTER UPDATE OF ...`)가 호출 경로와 무관하게 컬럼 단위로 발화함을 SQL 테스트로 이미 검증했으므로 인라인 결과와 동일하게 동작함을 코드 근거로 확인(중복 UI 시나리오는 생략)
    - [x] 3개 필드를 **한 번의 UPDATE로 동시에** 변경 → 이력 3건(필드별 1건) 생성 확인 — SQL 테스트로 실측(work_type+importance 동시 변경 → 2건, 별도 status 변경 1건 합산 3건)
    - [x] **같은 값으로 재저장** 시 이력 미생성 확인(`IS DISTINCT FROM`) — 동일 status 재UPDATE 후 이력 건수 불변 확인
    - [x] `title`만 수정했을 때 이력 미생성 확인 — SQL 테스트로 확인(추적 대상 3개 외 컬럼 변경은 트리거 자체가 발화하지 않음 — `AFTER UPDATE OF` 컬럼 목록에 없음)
    - [x] 타 부서 사용자 impersonation → 이력 SELECT 성공(전 부서 공개) 확인 — 다른 부서 소속 사용자로 3건 모두 정상 조회됨을 SQL로 확인
    - [x] 일반 사용자 impersonation으로 직접 INSERT/UPDATE/DELETE 시도 → 전부 거부 확인 — INSERT는 `42501 new row violates row-level security policy`로 즉시 거부, UPDATE/DELETE는 정책이 아예 없어 **0건 영향**(에러 없이 조용히 무시, `GET DIAGNOSTICS`로 row_count=0 실측 확인 — "RLS 켜짐 + 정책 없음 = 조용한 0건" 원칙과 일치)
    - [x] `changed_by`가 NULL인 행이 안전하게 처리되는지 확인 — 직접 DB 접속(role 원복 + `request.jwt.claims` 완전 초기화) 경로에서 `changed_by`가 실제로 NULL로 기록됨을 확인, UI 컴포넌트는 `changed_by_name ?? changed_by_email ?? "시스템"` 폴백으로 렌더링
    - [x] `weekly_logs` 행 삭제 시 이력 CASCADE 삭제 확인 — 임시 QA 로그로 삭제 전/후 이력 건수 대조(삭제 후 고아 이력 0건)
    - [x] 이력 0건인 로그에서 EmptyState 확인 — Playwright로 "아직 변경 이력이 없습니다." 렌더링 확인
    - [x] `get_advisors`(security) — 신규 트리거 함수의 anon/authenticated 직접 호출 경고 해소 확인(위 "계획과 다르게 처리한 부분 2" 참고), `unindexed_foreign_keys`(performance) 새 경고 없음 확인
    - [x] `npx tsc --noEmit` / `npm run lint`(기존 경고 4건 외 신규 없음) / `npm run build`(cacheComponents 하에서 정상 빌드) 전부 통과
  - **범위 밖 유지**: 제목·본문·날짜·금액 등 나머지 컬럼 추적, 이력 기반 되돌리기(revert), 이력 검색·필터·내보내기, 관리자용 전체 이력 화면, 첨부파일·댓글 변경 추적, "더보기" 페이지네이션(50건 상한으로 대체), 50건 초과 실데이터 렌더링의 실측(현재 실데이터에 그만큼 쌓인 로그가 없어 스크롤 컨테이너 설계로 갈음)

---

### Phase 4: 목록 탐색 폴리시 (F045 · F046)

> 목표: 자주 쓰는 조회 조건을 재입력하지 않고, 검색 결과에서 왜 이 항목이 걸렸는지 즉시 보이는 상태. **DB 변경 0건, 순수 클라이언트 작업.**
> **선행 조건**: F045는 Phase 1(Task 040의 `author` 필터 축) 완료 후. F046은 완전 독립이라 언제든 착수 가능.

- **Task 046: 목록·칸반 필터 프리셋 저장 구현 (F045)** ✅
  - [x] **저장소 결정** — 권장안 `localStorage` 그대로 채택.
  - [x] **Task 041 스토리지 규약 재사용** — `lib/storage/local-storage.ts` 그대로, 키 `weekly-log-filter-presets:{userId}`.
  - [x] **저장 대상은 필터 파라미터 집합**(정렬·페이지 상태 제외) — `department`/`status`/`q`/`from`/`to`/`author`.
  - [x] **목록·칸반 공유** — `components/weekly-log-filter-presets.tsx` 신규를 두 뷰가 공유, `onApply`가 각 뷰의 기존 `navigate()`에 6개 필드를 전부 명시적으로 전달(프리셋에 없는 축은 `null`로 넘겨 현재 값과 병합되지 않고 완전히 대체됨).
  - [x] **UI** — `ui/dropdown-menu`("현재 조건 저장" + 프리셋 목록, 각 항목에 삭제 아이콘) + `ui/dialog`(이름 입력) + `ui/alert-dialog`(덮어쓰기 확인). 부서·상태 select 옆에 배치, 활성 필터 배지 행과 분리.
  - [x] **개수 상한 10개, 이름 1~30자** — `FILTER_PRESET_MAX_COUNT`. 같은 이름 저장 시 `AlertDialog`로 덮어쓰기 확인.
  - [x] **적용 시 soft navigation 피드백** — 기존 `navigate()`의 `useTransition`/`LoadingBar`를 그대로 재사용(추가 구현 불필요).
  - [x] **부서 비활성/삭제 시나리오** — `normalizeWeeklyLogFilters()`가 그대로 통과시켜 결과 0건으로만 처리됨(기존 목록/칸반 필터 로직 재사용이라 별도 방어 코드 불필요).
  - **관련 파일**: `components/weekly-log-filter-presets.tsx`(신규), `hooks/use-filter-presets.ts`(신규), `components/weekly-log-list-view.tsx`, `components/weekly-log-kanban-view.tsx`(`userId` prop 추가, `applyFilterPreset` 핸들러), `app/protected/weekly-logs/page.tsx`·`kanban/page.tsx`(`userId={data.claims.sub}` 전달)
  - **DB 마이그레이션 없음**
  - **수락 기준**: 현재 필터 조합을 이름을 붙여 저장하고, 목록·칸반 어디서든 한 번의 선택으로 적용·삭제할 수 있으며, 저장소를 쓸 수 없는 환경에서도 목록이 정상 동작한다 — **전부 실측 확인 완료.**
  - **테스트 체크리스트** (Playwright MCP 실브라우저. QA 계정 2개(`qa-task046@example.com`, `qa-task046-b@example.com`) 실제 가입 플로우로 생성, 종료 후 완전 삭제 및 65 profiles 기준선 원복 확인)
    - [x] 부서+상태+검색어(`department`/`in_progress`/`교육`)를 저장 → 필터 초기화(30건) → 프리셋 선택 시 **URL 쿼리·검색창·총 건수(10건)가 정확히 복원**되는지 확인
    - [x] 저장한 프리셋이 **칸반 화면에서도** 동일하게 적용되는지 확인(목록→칸반 방향 확인, 칸반은 진행중 컬럼만 10건·나머지 0건으로 정확히 필터링됨)
    - [x] 같은 이름 저장 시 덮어쓰기 확인 다이얼로그가 뜨고, 취소 시 기존 값(1건)이 유지되는지 확인 — `localStorage` 직접 대조로 확인
    - [x] 상한(10개) 초과 저장 시도 시 에러가 발생하고 저장되지 않는지 확인 — `savePreset()`이 `{success:false}` 반환, `localStorage` 건수 10건 그대로 유지 확인
    - [x] 삭제 후 목록에서 사라지고 `localStorage`에서도 제거되는지 확인 — 드롭다운 내 삭제 버튼이 `stopPropagation`으로 부모 `onSelect`(적용)를 막고 URL 변경 없이 항목만 제거함을 확인
    - [x] **사용자 격리**: A가 만든 프리셋이 B 로그인 시 보이지 않는지 확인 — 서로 다른 `userId` 네임스페이스 키로 완전히 분리됨을 확인(B의 드롭다운에 "저장된 프리셋이 없습니다")
    - [x] 손상된 JSON 주입 상태에서 크래시 없이 조용히 무시되는지 확인 — `{not valid json`으로 덮어쓴 뒤 새로고침해도 목록 정상 렌더링, 콘솔 에러 0건
    - [x] `localStorage.getItem`을 throw하도록 프로토타입 스텁한 상태에서 목록·프리셋 드롭다운이 "저장된 프리셋이 없습니다"로 안전하게 폴백하는지 확인(크래시 없음)
    - [x] 콘솔 에러 0건 — 전 시나리오에서 확인
  - **⚠️ 계획에 없던 추가 발견** — `WeeklyLogFilterPresets`는 `WeeklyLogListFilters`(선택적 필드) 대신 `FilterPresetFilters`(`from`/`to`/`author`가 `string | null`)라는 별도 타입을 훅에 정의했다 — 두 뷰의 기존 `rawFilters` 로컬 변수가 이미 이 형태(`currentX ?? null`)로 구성돼 있어 타입 변환 없이 그대로 전달할 수 있었기 때문이며, `normalizeWeeklyLogFilters()`가 `null`/`undefined` 모두 관대하게 받아들이는 기존 관례와도 정합적이다.

- **Task 047: 검색 결과 하이라이팅 구현 (F046)** ✅
  - [x] **범위 결정 — 제목만 하이라이팅** ← 권장안 그대로 채택. 목록 payload(`LOGS_SELECT`)에 `content`가 없어 내용 스니펫은 표시하지 않고, 제목에 없는 매칭(내용에서만 매칭)은 하이라이트 없이 결과에만 포함되는 것을 실측으로 그대로 받아들였다(배지 등 보완 UI는 추가하지 않음 — 최소 범위 유지).
  - [x] `components/highlighted-text.tsx` 신규 — `text`/`query`를 받아 매칭 구간을 `<mark>`로 감싼 React 노드 배열을 반환. `dangerouslySetInnerHTML` 미사용, `part`(비매칭 구간)는 일반 문자열로 그대로 반환.
  - [x] **매칭 규칙을 서버 검색과 일치**시킴 — `new RegExp(escapeRegExp(trimmed), "gi")`로 대소문자 무시 부분 일치. `lib/utils.ts`에 `escapeRegExp()` 신규(정규식 메타문자 이스케이프, `escapeLikePattern()`과 대응). 쿼리가 빈 문자열/공백만이면 원본 텍스트를 그대로 반환(하이라이팅 생략).
  - [x] **적용 위치** — `components/weekly-log-table.tsx`(제목 `Link` 내부), `components/weekly-log-card.tsx`(`WeeklyLogCard`/`WeeklyLogCardList` 양쪽에 `query` prop 추가), `components/weekly-log-kanban-card.tsx`(`WeeklyLogKanbanCardContent`/`WeeklyLogKanbanCard`), `components/weekly-log-kanban-column.tsx`(칸반 컬럼을 거쳐 카드까지 `query` 전달).
  - [x] **`<mark>` 스타일** — 신규 토큰 없이 기존 `--warning` 재사용(`bg-warning/30`, 텍스트 색은 `text-inherit`로 유지) — 상태 배지의 solid warning 색과 시각적으로 구분되는 옅은 하이라이트로, 라이트/다크 스크린샷 대조 결과 두 테마 모두 충분한 대비 확인.
  - [x] **접근성** — `<mark>`는 시맨틱 강조 요소라 별도 `aria-*` 처리 없이 스크린리더가 자연스럽게 인지하며, 강조가 배경색 하나로만 표현되지만 원본 텍스트 색은 그대로 유지돼 색맹 사용자도 텍스트 자체는 동일하게 읽을 수 있음(정보 손실 없음).
  - [x] 매칭 여러 번 등장(예: "코드 리뷰 진행"에서 부분 매칭)·완료 상태의 line-through/italic 스타일과의 중첩 렌더링을 실측 확인, 레이아웃 깨짐 없음.
  - **관련 파일**: `components/highlighted-text.tsx`(신규), `components/weekly-log-table.tsx`, `components/weekly-log-card.tsx`, `components/weekly-log-kanban-card.tsx`, `components/weekly-log-kanban-column.tsx`, `components/weekly-log-list-view.tsx`·`weekly-log-kanban-view.tsx`(`query`/`currentSearchQuery` prop 전달), `lib/utils.ts`(`escapeRegExp` 신규)
  - **DB 마이그레이션 없음**
  - **수락 기준**: 키워드 검색 시 목록·카드·칸반의 제목에서 매칭 텍스트가 강조되고, 검색어에 정규식/LIKE 메타문자가 섞여도 화면이 깨지거나 잘못 강조되지 않으며, 라이트/다크 양쪽에서 판독 가능하다 — **전부 실측 확인 완료.**
  - **테스트 체크리스트** (Playwright MCP 실브라우저. QA 계정 2개(`qa-task047@example.com`, `qa-task047b@example.com`) 실제 가입 플로우로 생성, 종료 후 완전 삭제 및 65 profiles 기준선 원복 확인. 프로덕션 빌드(`npm run build`)도 별도로 통과 확인)
    - [x] "리뷰" 검색 → 목록·모바일 카드·칸반 3화면 모두에서 매칭 구간만 정확히 강조(부분 일치·"코드 리뷰 진행" 등 복수 항목 동시 강조) 확인
    - [x] **대소문자 혼용 검색** — 소문자 "erp"로 검색해 대문자 "ERP"가 포함된 실제 제목("ERP 시스템팀 면담 (2)", "ERP 클라우드 전환 검토")이 정확히 강조되는지 확인
    - [x] **특수문자 검색어** — `(`를 포함한 "리뷰(", 정규식 메타문자 다수(`*+\[].`)를 포함한 검색어로 500·크래시·콘솔 에러 없이 정상 처리(결과 0건이어도 페이지 정상 렌더링) 확인
    - [x] **내용에서만 매칭된 항목** — "erp" 검색 결과 중 "Commerce 시스템팀 면담"(제목에 erp 없음)이 하이라이트 없이 결과 목록에는 정상 포함됨을 확인(제목 매칭 2건과 나란히 노출)
    - [x] 검색어 없이 목록 진입 시 `document.querySelectorAll('mark').length === 0` 확인(스크립트로 직접 검증)
    - [x] 칸반 카드에서도 동일 검색어로 동일하게 강조되는지 확인(진행상태 3개 컬럼 전부, "지연" 빨간 강조와 공존 확인)
    - [x] 라이트/다크 스크린샷 대조로 대비 확인, 1280(칸반)/390(모바일 카드) 뷰포트에서 레이아웃·가로 스크롤 없음 확인
    - [x] `dangerouslySetInnerHTML`을 사용하지 않고 React 자동 이스케이프로만 렌더링한다는 것을 코드로 확인(구조적 보장 — `<script>` 검색어는 매칭되는 제목이 없어 실제 렌더링 사례로는 재현하지 않았으나, `HighlightedText`가 문자열만 JSX 자식으로 반환하는 구현을 코드 근거로 확인)
    - [x] 콘솔 에러 0건 — 기능 관련 에러 없음(재시작한 임시 dev 서버의 이전 세션 잔여 HMR 웹소켓 에러만 관측, 이번 기능과 무관)
    - [x] `npx tsc --noEmit` / `npm run lint`(기존 경고 4건 외 신규 없음) / `npm run build`(cacheComponents 하에서 정상 빌드) 전부 통과
  - **⚠️ 계획과 다르게 처리한 부분**: 무한 스크롤 배치 이후에도 하이라이팅이 유지되는지는 실데이터로 재현할 만큼 결과가 많은 검색어를 찾지 못해(부서 범위 내 "코드" 검색 10건, 첫 배치 안에 전부 로드됨) 별도 UI 재현 대신 **`WeeklyLogTable`/`WeeklyLogCardList`가 매 렌더마다 전체 `items`(추가로딩분 포함)와 `query`를 함께 받는 구조**임을 코드로 확인하는 것으로 갈음했다(추가 로딩된 항목도 동일한 `HighlightedText`를 거치므로 구조적으로 하이라이팅이 유지된다).

---

### Phase 5: 캘린더/타임라인 뷰 (F047)

> 목표: 시작일~목표종료일을 시간축 위에서 겹쳐 보는 상태. **v2에서 비용 대비 우선순위가 가장 낮다고 사용자와 합의된 유일한 항목.**
> **선행 조건**: Phase 1~4 완료. **⚠️ 착수 전 사용자에게 실제 필요 여부를 재확인하고, 필요 없다면 "범위 밖 유지"로 종료한다.**

- **Task 048: 주간업무일지 타임라인 뷰 구현 (F047)** ✅
  - [x] **착수 게이트** — Phase 1~4 완료 후 사용자에게 재확인해 **구현 진행**으로 확정(2026-08-21).
  - [x] **구현 방식 결정** — **CSS Grid 직접 구현**(권장안 그대로 채택). 신규 의존성 없이 `lib/utils.ts`의 순수 `Date` 헬퍼로 처리.
  - [x] **라우트 신설** — `app/protected/weekly-logs/timeline/page.tsx`. 칸반 페이지와 동일한 구조(`getClaims()` → `profiles` 조회 → 부서 게이트 → `normalizeWeeklyLogFilters()` → Suspense + 스켈레톤)를 그대로 복제.
  - [x] **뷰 전환 UI** — `components/weekly-log-view-switcher.tsx` 신규(목록·칸반·타임라인 공용 탭, `role="tablist"`/`role="tab"`). department/status/q/from/to/author를 쿼리 파라미터로 그대로 실어 전환하며, 목록·칸반 뷰(`weekly-log-list-view.tsx`, `weekly-log-kanban-view.tsx`)에도 동일 컴포넌트를 배선해 3화면 어디서든 전환 가능. sort/dir(목록 전용 축)은 싣지 않음 — 칸반·타임라인은 고정 정렬을 쓰므로 자연스럽게 무시되고, 목록으로 복귀 시 기본 정렬로 초기화되는 것을 허용 가능한 손실로 문서화.
  - [x] **데이터 규모 대응** — `lib/queries/weekly-logs.ts`에 `fetchWeeklyLogsTimeline()` 신규(기존 `fetchWeeklyLogRows`의 range+1 `hasMore` 판정을 그대로 재사용해 `truncated` 플래그로 노출). `lib/types/index.ts`에 `WEEKLY_LOGS_TIMELINE_PAGE_SIZE = 200` 신규. `app/protected/weekly-logs/timeline/page.tsx`가 URL에 `from`/`to`가 없으면 `getThisMonthRange()`로 기본 설정해 기간을 항상 필수로 채운다.
  - [x] **표현 설계** — 행 1개 = 업무 1건(그룹핑 없음, 최소 스코프). 막대 색은 `STATUS_CHART_COLORS` 그대로 재사용, 지연 건은 색을 바꾸지 않고 `ring-2 ring-destructive`로 덧대 강조(칸반의 "색은 유지 + 배지/아이콘으로만 강조" 방식과 동일 원칙). 오늘 위치에 `border-l-2 border-primary` 세로선.
  - [x] **반응형** — `overflow-x-auto` 내부 컨테이너에만 스크롤을 두고 페이지 본문은 스크롤되지 않게 구현. **⚠️ 실측 중 회귀 발견 및 수정**: 접근성 대체 표(`<table className="sr-only">`)가 `table-layout: auto`에서 `width:1px`를 무시하고 실제 콘텐츠 크기(수백~수천 px)로 렌더 박스가 확장돼, `clip-path`로 시각적으로는 숨겨져도 문서의 가로 스크롤 폭에는 그대로 반영되는 회귀를 390px 뷰포트에서 `document.documentElement.scrollWidth`(481px > 390px) 실측으로 발견했다. `<table>`에 직접 걸려 있던 `sr-only`를 감싸는 `<div className="sr-only">`로 옮겨 해결(div는 table 전용 확장 규칙이 없어 width:1px+overflow:hidden이 정상 적용됨) — 수정 후 390/768/1280 3개 뷰포트 모두 `scrollWidth <= innerWidth` 재확인.
  - [x] **접근성** — 각 막대에 `role="img"` + `aria-label`("{제목}, {시작일} ~ {목표종료일}, {상태}[, 지연]") 부여, 동일 데이터를 `sr-only` 표로 병행 제공(캡션·`scope` 포함).
  - [x] **드래그로 일정 변경은 범위 밖 유지** — 읽기 전용 뷰로 확정, 별도 구현 없음.
  - **관련 파일**: `app/protected/weekly-logs/timeline/page.tsx`(신규), `components/weekly-log-timeline-view.tsx`(신규), `components/weekly-log-timeline-skeleton.tsx`(신규), `components/weekly-log-view-switcher.tsx`(신규, 3개 뷰 공용), `components/weekly-log-list-view.tsx`·`weekly-log-kanban-view.tsx`(뷰 전환 탭 배선), `lib/queries/weekly-logs.ts`(`fetchWeeklyLogsTimeline` 추가), `lib/types/index.ts`(`WEEKLY_LOGS_TIMELINE_PAGE_SIZE`), `lib/utils.ts`(`diffDays`/`addDaysToDateString` 날짜 축 헬퍼)
  - **DB 마이그레이션 없음** — 기존 `weekly_logs`를 읽기만 함
  - **수락 기준**: 사용자가 지정한 기간의 업무를 시간축 위에서 확인할 수 있고, 목록·칸반과 동일한 필터 조건이 적용되며, 지연 판정이 세 화면에서 일치하고, 3개 뷰포트에서 페이지 가로 스크롤이 발생하지 않는다 — **전부 실측 확인 완료(위 회귀 수정 포함).**
  - **테스트 체크리스트** (Playwright MCP + Supabase MCP. QA 계정 2개(`qa-task048@example.com`, `qa-task048b@example.com`) 실제 가입 플로우로 생성, 종료 후 완전 삭제 및 65 profiles/325 logs 기준선 원복 확인)
    - [x] 기간 지정 진입 시 막대 시작·끝 위치가 `start_date`/`target_end_date`와 정확히 일치 — "검색 랭킹 알고리즘 튜닝"(2026-08-01~08-14, 범위 내 완전 포함)의 막대 인라인 스타일을 직접 측정해 `left: 0px`(8/1=오프셋 0), `width: 392px`(14일×28px)로 픽셀 단위까지 정확히 일치 확인
    - [x] 조회 기간을 벗어나 걸치는 업무가 **잘린 막대**로 표시되고 누락되지 않는지 확인 — 2026-08-01~08-31 범위에서 시작일이 7월인 3건("결제 모듈 고도화" 7/28~, "프로모션 엔진 리뉴얼" 7/29~, "물류 연동 API 개선" 7/30~) 모두 `rounded-l-none`(왼쪽 잘림 표시)으로 렌더링되고 결과에 정상 포함됨을 확인
    - [x] 목록·칸반에서 필터를 지정한 뒤 뷰를 전환하면 필터가 유지되는지 확인(3방향 전부) — 타임라인에서 부서+검색어(`리뷰`)+기간 적용 후 칸반 전환 시 URL에 4개 파라미터 모두 유지되고 결과 2건(칸반 "지연" 배지까지) 정확히 일치, 칸반→목록 전환도 동일 확인
    - [x] 지연 강조가 칸반 "지연" 배지와 일치하는지 확인 — 동일 필터(부서+검색어+기간)로 타임라인의 지연 링(ring-destructive) 표시 항목 2건과 칸반보드의 "지연" 빨간 배지 표시 항목 2건이 정확히 일치(같은 두 업무). 판정 규칙 자체도 `weekly-log-timeline-view.tsx`와 `weekly-log-kanban-column.tsx`가 `status !== "completed" && target_end_date < todayIso`로 문자 그대로 동일함을 코드로 확인. 완료 상태이면서 목표종료일이 과거인 항목(물류 연동 API 개선, 외부 협력사 미팅)이 지연 표시에서 제외됨도 함께 확인
    - [x] 렌더 상한 초과 시 안내가 뜨고 페이지가 멈추지 않는지 확인 — 전체 데이터 범위(2026-04-03~09-05, 전체 부서, 325건 중 200건 초과분 존재)로 진입해 "표시 상한(200건)을 초과하는 업무가 있습니다..." 배너 노출 확인, 200개 막대 정상 렌더링, 콘솔 에러 0건
    - [x] 0건 기간에서 EmptyState 확인 — 존재하지 않는 검색어로 "표시할 업무가 없습니다" 렌더링 확인
    - [x] 부서 미설정 사용자가 URL 직접 접근 시 `/protected/profile` 리디렉션 확인 — QA 계정의 `department_id`를 SQL로 일시 NULL 처리 후 실측, 이후 원복
    - [x] 비로그인 접근 시 `proxy.ts` 게이트로 `/auth/login` 리디렉션 확인 — `curl`로 307 리다이렉트 확인
    - [x] 1280/768/390 뷰포트에서 페이지 본문이 가로 스크롤되지 않는지 확인 — 3개 뷰포트 전부 `document.documentElement.scrollWidth <= window.innerWidth` 실측(390: 375≤390, 768: 768≤768, 1280: 1265≤1280, 200건 렌더 상태 포함). 위 반응형 항목에 기록된 회귀를 수정한 뒤의 최종 확인치
    - [x] 라이트/다크 색상 대비 확인 — 라이트 모드에서 지연 링(빨간 테두리)이 뚜렷하게 보이고, 다크 모드에서도 상태색(초록/주황/회색) 대비 및 오늘 기준선이 식별 가능함을 스크린샷으로 확인
    - [x] `npm run build`로 신규 라우트가 정상 포함되는지 확인 — recharts 등 신규 무거운 의존성을 추가하지 않아(기존 shadcn 프리미티브만 재사용) v1 Task 031과 같은 번들 유출 우려 자체가 낮음, `/protected/weekly-logs/timeline`이 다른 보호 라우트와 동일하게 Partial Prerender로 정상 생성됨을 빌드 로그로 확인
    - [x] 콘솔 에러 0건 — 전 시나리오에서 확인
    - [x] `npx tsc --noEmit` / `npm run lint`(기존 경고 4건 외 신규 없음) / `npm run build` 전부 통과
  - **범위 밖 유지**: 드래그로 일정 변경, 의존 관계(선행 작업) 표현, 마일스톤·리소스 뷰, 월/주/일 단위 줌 전환, 캘린더(월 그리드) 뷰를 타임라인과 별개로 추가하는 것, 타임라인 이미지/PDF 내보내기, 부서/담당자 그룹핑(행은 업무 1건 고정)

---

### Phase 6: 통합 검증 및 v2 마감

> 목표: 8개 기능이 서로, 그리고 v1·MVP 기능과 충돌 없이 동작함을 증명하고 배포 가능한 상태. **알림 동작 변경(F041·F044)과 필터 축 신설(F040)이 기존 검증을 무효화할 수 있으므로 회귀 범위를 넓게 잡는다.**
> **선행 조건**: Phase 1~4 완료(Phase 5는 착수 여부와 무관하게 진행 가능).

- **Task 049: v2 통합 E2E 및 알림·권한 회귀 테스트** ✅
  - [x] **테스트 계정 세트 구성** — 슈퍼관리자 1(`qa049-super`) / 관리자 1(`qa049-admin`, Commerce시스템팀) / 일반 사용자 2(`qa049-usera`: 관리자와 같은 부서, `qa049-userb`: IT기획팀으로 타 부서) / 부서 미설정 1(`qa049-nodept`) 총 5개(로드맵 본문 구성 그대로 — 위 상세 지시의 "총 6개"는 오기). **전부 실제 회원가입 플로우(Playwright)로 생성**하고 SQL로 역할·부서만 조정. 종료 시 QA가 작성한 댓글·이력을 먼저 명시적으로 지운 뒤 `auth.users` DELETE로 완전 삭제해 **기준선(organizations 10 / departments 8 / profiles 65 / weekly_logs 325 / work_types 11 / comments 8 / mentions 1 / reactions 7 / attachments 2 / history 0)으로 정확히 원복 확인**(아래 "정리 결과" 참고)
  - [x] **알림 매트릭스 전수 검증** — comment(정상 발송)·reply(수신자 off → 미생성, 로그 작성자는 별도 경로로 정상 수신 확인)·mention(off → 미생성, 독립 게이팅 확인)·댓글+멘션 동시 발생(2건 정확히 분리 생성) 전부 SQL/`notifications` 실측. reminder는 `create_weekly_log_reminders()` 직접 호출로 검증: department 미설정·`notify_on_reminder=false`·이번 주 이미 작성 3가지 제외 조건이 각각 정확히 걸러짐을 확인하고, **동일 함수를 연속 2회 호출해 2차 호출 삽입 건수 0건**으로 `(recipient_id, period_start)` dedupe 재확인(1차 60건 삽입 — 실제 프로덕션 65 profiles 대상 정식 실행, Task 044와 동일 정책. 이 60건 중 QA 계정 2건은 계정 삭제로 cascade 정리되고 **실사용자 58건은 정당한 데이터라 정리하지 않고 보존** — 아래 "계획과 다르게 처리한 부분" 참고)
  - [x] **v1 회귀** — 관리자 콘솔 조직 범위 제한: 슈퍼관리자가 타 조직(경영기획부문)에 임시 부서를 생성(전 조직 확장 확인) → 일반 관리자(IT부문)는 SQL impersonation으로 그 부서 UPDATE 시도 시 0행 반영(RLS 차단)·부서 관리 화면 목록에도 노출되지 않음(쿼리 레벨 스코프) 확인 후 임시 부서 삭제. 대시보드 "전체 조직 합산" 셀렉터로 슈퍼관리자 조직 통합 조회 정상 동작(7개 차트 전부 렌더링, 총 327건). 추천/비추천: 본인 글 포함 낙관적 토글 정상 반영 + 타인 반응 DELETE는 impersonation으로 0행(RLS) 확인. PDF/Excel: 필터 적용 상태에서 두 포맷 모두 실다운로드 성공, 콘솔 에러 0건. Realtime·읽음 처리·폴백 폴링은 Task 043에서 이미 실측 검증된 동일 파이프라인이라 이번엔 SSR 시드(벨 배지 unread count)로 회귀만 스팟 확인
  - [x] **MVP 회귀** — CRUD: 작성(9개 필드)→조회(전 부서 공개 SELECT, 타 부서 사용자 열람 확인)→인라인 수정(상태 변경)→삭제(cascade로 이력·반응 0건 확인) 전 사이클 실행. 부서 기반 쓰기 RLS: 타 부서 사용자(userb)가 usera의 로그 UPDATE 시도 → impersonation으로 0행 확인. 검색·기간 필터·총 건수: `q=Task049&author=...` 조합에서 목록 "조건에 맞는 업무 1건"과 실제 표시 행 수 일치. 첨부파일·무한 스크롤은 이번 세션에서 별도 UI 재현 없이 v1·F039에서 이미 실측된 것으로 갈음(변경 파일 없음 확인)
  - [x] **v2 교차 검증** — 전부 Playwright 실측:
    - `author` 필터 + 프리셋 저장/적용 + `q` 하이라이팅을 동시에 건 상태에서 목록 "조건에 맞는 업무 1건" = 칸반 "진행중 1건" = `<mark>` 하이라이트 위치까지 목록·칸반 양쪽에서 정확히 일치
    - draft 복원(9개 필드 중 일부만 채운 draft를 복원 후 저장)으로 만든 로그의 상태를 인라인 변경 → `weekly_log_change_history`에 정상 기록됨을 SQL로 확인
    - 위 로그에서 `notify_on_comment=false`로 끈 뒤 다시 상태 변경 → 이력은 계속 기록됨(두 기능 독립) 확인
    - 알림 벨의 리마인더 항목 클릭 → `/protected/weekly-logs/new` 이동, draft 배너 없음(최초 진입 정상) → 입력 후 새로고침 시 draft 배너가 충돌 없이 정상 노출
  - [x] **권한 회귀** — 6개 시나리오 전부 SQL impersonation(`set local role authenticated` + `request.jwt.claims`)으로 재현, 전부 거부 확인: `weekly_log_change_history` INSERT(`42501`)/UPDATE(0행)/DELETE(0행), `notifications` INSERT(`42501`), `create_weekly_log_reminders()` 호출(`42501 permission denied for function`), 타인 `notify_on_*` UPDATE(0행), 자기 `role` 상승(`P0001`). **부가 발견**: 슈퍼관리자 승격 트리거(`old.role <> 'admin'`이면 거부)는 `auth.uid() IS NULL`인 직접 DB 연결에도 예외 없이 적용됨을 실측(일반 자기상승 방지 트리거와 달리 우회 조건이 없음 — 회귀 아님, 의도된 하드닝으로 판단되나 다음 세션을 위해 기록)
  - [x] **성능 확인** — `stats_my_work_summary` `EXPLAIN ANALYZE`: Function Scan, 실행시간 3.6ms. `weekly_log_change_history` 조회: `weekly_log_id` 인덱스의 Bitmap Index Scan 사용, 실행시간 0.15ms. `npm run build`(Turbopack) `client-reference-manifest` 기준 라우트별 클라이언트 JS 합산(메모리의 측정 관례 재사용) — `/weekly-logs` 609KB, `/weekly-logs/kanban` 642KB, `/weekly-logs/timeline` 522KB, `/weekly-logs/[id]` 602KB, `/admin/dashboard` 992KB(차트 다수로 라우트 중 최대, v1부터 존재하던 수치라 v2발 회귀 아님), `/admin/departments` 622KB, `/profile` 623KB. v2가 추가한 무거운 신규 의존성은 없음(Task 048에서 이미 확인된 대로 recharts 등 미사용) — 정확한 v1 시점 비교 baseline 수치는 이 세션에서 확보하지 못해 절대 비교는 불가하나, 절대값 자체가 이례적으로 크지 않고 구조적으로 신규 대형 의존성이 없어 회귀 리스크 낮음으로 판단
  - [x] `npm run lint`(기존 경고 4건 그대로, 신규 0건) / `npx tsc --noEmit`(에러 0건) / `npm run build`(전 라우트 정상 생성, v2 신규 라우트인 `/weekly-logs/timeline`·`/admin/organizations`·`/admin/work-types` 포함) 전부 통과
  - **⚠️ 계획과 다르게 처리한 부분 1 — 리마인더 정식 재현은 QA 범위를 넘어 실제 65 profiles 전체에 적용됨**: `create_weekly_log_reminders()`는 대상자를 감별하는 로직 자체가 함수 안에 있어 QA 계정만 골라 실행할 방법이 없다(Task 044와 동일한 제약). 호출 시점(2026-08-21, 금요일)이 실제 배포된 `cron.job`의 예정 발송 시각(금 06:00 UTC = 15:00 KST)과 같은 날짜라, 이번 실행으로 생성된 58건의 실사용자 알림은 오늘 예정대로 발송될 알림을 몇 시간 앞당겨 발생시킨 것과 동일한 정당한 프로덕션 데이터로 판단해 **삭제하지 않고 보존**했다. `cron.job`/`cron.job_run_details`는 건드리지 않았다.
  - **⚠️ 계획과 다르게 처리한 부분 2 — QA 계정 삭제 시 `auth.users` 다중 행 동시 DELETE가 FK 순서 문제로 실패**: `weekly_log_comments.author_id`(`NO ACTION`)가 같은 문 안에서 다른 계정의 `weekly_logs`(→ 댓글) cascade보다 먼저 체크되는 경우가 있어(계정 5개를 한 번에 지우거나, 자기 자신의 로그에 단 댓글이 있는 계정 1개만 지워도) `23503` 위반이 발생함을 실측했다. 해결책으로 QA 계정이 작성한 `weekly_log_comments`/`weekly_log_change_history`(둘 다 `author_id`/`changed_by`가 `NO ACTION`) 행을 **먼저 명시적으로 DELETE한 뒤** `auth.users`를 지우는 순서로 변경했다 — 스키마 자체를 고치는 대신 정리 절차만 조정(이 FK를 CASCADE로 바꾸는 것은 이번 Task의 범위 밖이며, 향후 계정 삭제 기능을 실제로 구현할 때 고려할 사항으로 남긴다).
  - **정리 결과(원복 확인)**: `auth.users` DELETE 후 재조회 — `organizations` 10 / `departments` 8 / `profiles` 65 / `weekly_logs` 325 / `work_types` 11 / `comments` 8 / `mentions` 1 / `reactions` 7 / `attachments` 2 / `history` 0 **전부 착수 전 값과 정확히 일치**. `notifications`는 4(기존) + 58(위 결정에 따라 보존한 실사용자 리마인더)건 = 62건이며 고아 `recipient_id` 0건(cascade 정합성 확인). `auth.users` 66건 vs `profiles` 65건의 차이 1건은 이 세션과 무관한 기존 계정(`archy712@naver.com`, 2026-08-04 생성, 프로필 미작성 상태)으로 실측 확인 — QA 잔여물 아님.
  - **수락 기준**: 위 모든 항목이 통과했고, v1·MVP 기능에서 회귀 0건, 새로 발견되어 수정이 필요한 버그도 0건이었다(위 "부가 발견"은 회귀가 아니라 기존 하드닝의 재확인).
  - **테스트 체크리스트**: 위 8개 구현 항목이 곧 체크리스트이며 각 항목에 실측 근거·수치를 함께 기록했다.

- **Task 050: 문서 갱신 및 v2 마감** ✅
  - [x] **CLAUDE.md 갱신 (이번 v2에서 가장 중요한 문서 작업)** — 아래 항목은 **다음 세션의 에이전트가 반드시 알아야 하는 새 관례**다:
    - [x] **`pg_cron` 최초 도입** — 등록된 잡 목록, `cron.schedule()`은 `list_migrations`에도 로컬 `supabase/migrations/`에도 남지 않는다는 점, 이 DB가 다른 도메인과 공유된다는 점 — "정기 작성 리마인더 (pg_cron, v2 ad hoc, F041)" 절 신규 추가로 반영
    - [x] **알림 생성 경로가 2종**(트리거 + 스케줄 함수)이 되었고, **클라이언트 INSERT 불가 원칙은 그대로**라는 점 — "실시간 알림" 절 갱신
    - [x] **알림 유형이 4종**(comment/reply/mention/reminder)이고 `actor_id`/`weekly_log_id`가 nullable이 되었다는 점, `'reply'`가 `notify_on_comment`를 따른다는 매핑 — 동일 절에 반영
    - [x] **`localStorage` 최초 도입**과 키 네이밍·사용자 네임스페이스·`try/catch`·`useEffect` 전용 접근 규약 — "브라우저 저장소 (localStorage, v2 ad hoc)" 절 신규 추가
    - [x] **`weekly_log_change_history`** — 트리거로만 기록, 쓰기 정책 없음이 의도된 설계라는 점, 추적 대상이 3개 컬럼로 한정된 근거 — "변경 이력" 절 신규 추가
    - [x] **`author` 필터 축**이 `applyScalarFilters()`에 추가되어 목록·칸반·count 3곳에 공유된다는 점 — ""내 업무" 개인 요약 위젯과 "지연" 판정 규칙 3중 일치" 절 신규 추가로 반영
    - [x] **지연 판정 규칙이 3곳(칸반·F040 위젯·타임라인)에서 동일해야 한다**는 제약 — 동일 절에 반영
    - [x] **문서 경로 정정 — 착수 전 실측 재확인 결과 "정정 불필요"로 판명(계획과 다르게 처리한 부분 1 참고)**
  - [x] **`docs/PRD.md` 갱신**(실제 경로, 아래 "계획과 다르게 처리한 부분 1" 참고) — F040~F047을 "4. v2 고도화 기능" 표로 신규 추가, "5. v2 이후에도 제외되는 기능"으로 재정리(F044·F045로 구현된 "알림 유형별 on/off 설정"·"저장된 필터 프리셋" 항목을 목록에서 제거), 데이터 모델 절에 `weekly_log_change_history` 신규 테이블·`notifications` 컬럼 확장(`actor_id`/`weekly_log_id` nullable, `period_start`, `reminder` 유형)·`profiles.notify_on_*` 3종 반영, 목록/작성/상세/프로필 페이지 절과 신규 "타임라인 페이지" 절 갱신, 기술 스택에 `pg_cron`·`localStorage` 절 추가
  - [x] **`docs/guides/deployment-ops.md` 갱신**
    - [x] 7절(알림 보존 정책) — 이미 Task 044 시점에 "pg_cron 설치됐지만 이 정책은 여전히 수동"으로 갱신되어 있었음을 재확인(추가 변경 없음)
    - [x] **신규 절: cron 잡 운영** — 이미 Task 044가 9절로 선반영해뒀음을 재확인(등록된 잡 표·조회 SQL·재등록/중단 절차·공유 DB 주의 전부 포함, 추가 변경 없음)
    - [x] **신규 절: 이력 테이블 보존 정책** — 10절로 신규 추가(`weekly_log_change_history` 증가 특성, 현재 정책은 "무기한 보존 + 조회 시 50건 상한으로 충분", 규모 커지면 검토할 기준과 SQL 템플릿)
    - [x] 6절(프로덕션 스모크 체크리스트)에 v2 항목 5개 추가(위젯·draft·이력·알림 설정·알림 벨) — 로드맵에 없던 추가 개선, 아래 "계획과 다르게 처리한 부분 3" 참고
  - [x] **`docs/roadmap/ROADMAP_V2.md`(본 문서) 마감** — Task 049·050 체크박스를 실측 근거와 함께 채우고 두 Task 제목에 ✅ 표시
  - [x] `mcp__supabase__get_advisors`(security + performance) 최종 확인 — v2가 추가한 함수·테이블·인덱스로 인한 새 경고 없음(재확인: security는 다른 ERP 도메인 함수·`auth_leaked_password_protection` 기존 경고만, performance는 `weekly_log_attachments`/`weekly_log_reactions`의 v1 시절 미인덱스 FK 3종과 무관한 도메인 unused index 2종만 — 전부 v2 이전부터 있던 항목)
  - [x] **배포 전 점검** — 환경변수 변경 없음 확인(v2는 `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 외 신규 외부 서비스 도입 안 함), `npm run build` 정상 완료(v2 신규 라우트 `/protected/weekly-logs/timeline` 포함 전체 31개 라우트 생성 확인), **`pg_cron` 잡 실측**(`cron.job`에 `weekly_log_reminder` 1건 `active=true`, `schedule='0 6 * * 5'`로 원래 스케줄 그대로 등록되어 있고 `cron.job_run_details`에 성공 실행 이력 존재함을 확인 — Task 049 검증 중 발생한 임시 재스케줄이 종료 후 정상 원복되어 있음을 재확인)
  - **수락 기준**: 다음 세션의 에이전트가 CLAUDE.md만 읽고도 v2가 추가한 관례(cron·스토리지·알림 4종·이력 테이블)를 위반하지 않고 작업할 수 있으며, 운영자가 `deployment-ops.md`만 보고 cron 잡을 점검·재등록할 수 있다 — **충족 확인**
  - **⚠️ 계획과 다르게 처리한 부분 1 — "문서 경로 정정" 항목은 실측 결과 정정할 게 없었다**: 로드맵이 "CLAUDE.md는 `docs/PRD.md`·`docs/ROADMAP_v1.md`를 참조하지만 실제 파일은 `docs/prd/PRD.md`·`docs/roadmap/ROADMAP_v1.md`"라고 적어뒀으나(위 "반드시 해소해야 하는 갭" 절), 착수 전 `find`로 재확인한 결과 **실제 파일은 `docs/PRD.md`·`docs/ROADMAP_v1.md`(둘 다 `docs/` 바로 아래)이고, 서브디렉터리로 옮겨진 것은 `docs/roadmap/ROADMAP_mvp.md`·`docs/roadmap/ROADMAP_V2.md` 둘뿐**이었다. 즉 CLAUDE.md의 기존 참조(`docs/PRD.md`, `docs/ROADMAP_v1.md`)는 이미 정확했고, 이 항목은 착수 전 실측 당시의 오기였다(랜딩 페이지 하단 링크 3종을 Playwright로 재확인해도 `docs/PRD.md`·`docs/roadmap/ROADMAP_mvp.md`·`docs/ROADMAP_v1.md` 경로 그대로 렌더링됨). CLAUDE.md는 손대지 않고 이 사실만 기록한다 — 존재하지 않는 `docs/prd/PRD.md`로 "정정"했다면 오히려 참조가 깨졌을 것이다.
  - **⚠️ 계획과 다르게 처리한 부분 2 — CLAUDE.md의 사전 존재하던 오기 1건을 함께 수정**: "실시간 알림" 절을 갱신하며 대조하던 중, 댓글·멘션 알림 트리거 함수명이 CLAUDE.md에 `weekly_log_comments_notify`/`weekly_log_comment_mentions_notify`로 적혀 있었으나 `pg_proc` 실측 결과 실제 함수명은 `notify_on_new_comment()`/`notify_on_comment_mention()`(Task 043의 로드맵 기록과 일치)이었다. v2 범위는 아니지만 같은 문장을 고치는 김에 실제 함수명으로 정정했다(각주로 근거 남김).
  - **⚠️ 계획과 다르게 처리한 부분 3 — F043 검증 중 발견한 로컬 환경 문제(애플리케이션 버그 아님)**: 배포 전 점검을 위해 실행하던 로컬 스모크 테스트(QA 계정 `qa-task050@example.com`)에서 상세 페이지의 변경 이력 섹션이 전혀 렌더링되지 않는 현상을 발견해 조사했다. 원인은 **포트 3000의 기존 `npm run start` 서버가 16:05에 기동된 뒤 20:15에 재빌드된 `.next` 산출물을 반영하지 못하는 상태**(Task 044가 이미 겪은 것과 동일한 "prod 서버는 재시작 전까지 재빌드를 반영하지 않는다" 패턴)였다 — `npm run build`로 재빌드하고 임시 포트(3002)에 `next start`를 새로 띄워 검증한 결과 변경 이력 섹션이 정상 렌더링됨을 확인했다(애플리케이션 코드는 수정하지 않음, 임시 서버는 검증 후 종료). 기존 3000번 서버는 건드리지 않았다. 이 스모크 절차(로그인 → 목록(F040) → 작성(F042) → 상세(F043) → 프로필(F044) → 알림 벨)를 6절 체크리스트에 정식 항목으로 추가해 다음 배포 담당자가 동일한 함정에 빠지지 않도록 했다(로드맵에 없던 문서 개선).
  - **테스트 체크리스트**
    - [x] 갱신된 CLAUDE.md의 모든 파일 경로·함수명·테이블명이 실제와 일치하는지 grep으로 대조 — `getMyWorkSummary`/`stats_my_work_summary`(`lib/queries/stats.ts`), `weekly_log_change_history` 4개 참조 파일, `applyScalarFilters`/`countWeeklyLogs`/`fetchWeeklyLogsKanban`(`lib/queries/weekly-logs.ts`), `getObjectParticle`(`lib/utils.ts`), `notify_on_new_comment`/`notify_on_comment_mention`(`pg_proc` 실측) 전부 일치 확인
    - [x] `deployment-ops.md`의 cron 절차를 **실제로 따라 해보며** 잡 조회·중단·재등록이 문서대로 동작하는지 확인 — 조회 SQL(`cron.job`, `cron.job_run_details`)을 실제로 실행해 문서의 표와 일치함을 확인. **중단·재등록 SQL은 실제 운영 잡에 손대지 않기 위해 실행하지 않고**(로드맵 지시대로 조회만), 명령 자체가 `cron.alter_job`/`cron.unschedule`/`cron.schedule`의 올바른 시그니처(대상 jobid를 서브쿼리로 조회하는 방식 포함)로 작성돼 있음을 코드 검토로 확인
    - [x] PRD의 F040~F047 명세가 구현된 동작과 일치하는지 항목별 대조 — PRD 작성 자체를 실제 컴포넌트·라우트·DB 스키마(각 Task의 "관련 파일" 목록, 위 데이터 모델 실측)를 근거로 서술했고, 목록/작성/상세/프로필 4개 페이지는 아래 로컬 스모크로 UI까지 재확인
    - [x] 프로덕션 배포된 URL이 없어(로드맵 6절 전제) **로컬 스모크로 대체**: 로그인 → 목록(F040 위젯 지연/이번 주 마감/진행중 0/0/0 정상 렌더링) → 작성(F042, 콘솔 에러 0건) → 상세(F043 변경 이력 접이식 섹션 렌더링, 아래 "계획과 다르게 처리한 부분 3"의 서버 재빌드 후) → 프로필(F044 알림 스위치 3종 렌더링) → 알림 벨(정상 노출) 전부 확인, QA 계정(`qa-task050@example.com`)은 종료 후 완전 삭제해 65 profiles 기준선 복원 확인

---

### Phase 7: UI/UX 사용성 개선 (ui-markup-specialist 검토 기반, 2026-08-22 추가)

> **배경**: v2(F040~F047) 완료 후, 사용자가 "사용성을 극대화하고 shadcn/ui·lucide 아이콘을 최대한 활용하고 싶다"는 요청으로 `ui-markup-specialist` 에이전트에 전체 화면 UI/UX 검토를 의뢰했다. 핵심 발견: `/component-gallery`에 shadcn 컴포넌트 38종 이상이 데모로 있지만 실제 업무 화면에서는 `Tooltip`/`Command`/`HoverCard`/`Breadcrumb`/`Empty` 등이 **전혀 쓰이지 않고** 있고, 다크모드 토큰 사용은 이미 전 화면에서 일관되게 잘 지켜지고 있다. 아래 10개 Task는 그 검토에서 나온 개선안을 **임팩트 대비 비용 우선순위**로 정렬한 것이며, 사용자가 **1개씩 순서대로 실행**할 예정이다. 기존 아키텍처(낙관적 업데이트, 부서 기반 권한, `cacheComponents: true`, `sonner` 토스트, `LoadingBar`/`DimOnPending` soft-navigation)는 그대로 유지한 채 그 위에 얹는 개선만 다룬다.
>
> **선행 조건**: 없음(Phase 1~6과 독립, DB 변경 없는 순수 클라이언트/마크업 작업). **순서 원칙**: 아래 순번이 곧 실행 순서(상→중→하 우선순위). Task 완료 후 다음 Task 착수 전 항상 중단하고 사용자 지시를 대기한다(기존 개발 워크플로우 3번 규칙 그대로 적용).

- **Task 051: `Tooltip` 컴포넌트 전면 도입 (F048)** ✅
  - [x] 브라우저 기본 `title` 속성을 shadcn `ui/tooltip.tsx`(cmdk와 달리 이미 설치돼 있으나 `ui/sidebar.tsx` 내부용으로만 쓰이고 업무 화면엔 미적용)로 교체. 대상: 상세 페이지 지연 배지(`components/weekly-log-detail-view.tsx`의 `title={...}` 지점), 목표진척률 마커(`title="목표진척률 N%"`), `components/html-editor.tsx` 툴바 버튼 8개(`title={label}`)
  - [x] `TooltipProvider`를 어느 레벨에 둘지 결정(각 사용처마다 개별 vs `app/layout.tsx` 전역 1곳) — **전역 1곳으로 결정**, `app/layout.tsx`의 `ThemeProvider` 안쪽에서 `{children}`과 `<Toaster />`를 함께 감싸도록 배치(중복 provider 방지)
  - [x] 모바일 터치 환경에서 툴팁이 아예 안 뜨는 문제(브라우저 기본 `title`의 한계)가 실제로 해소되는지 실기기/에뮬레이터로 확인 — **이 Task 범위에서는 데스크탑 hover 동작 검증까지만 수행**(아래 테스트 결과 참고). Radix Tooltip은 모바일 터치에서 기본적으로 트리거되지 않는 것이 알려진 제약이라, 모바일 접근성 보강이 필요해지면 별도 Task로 판단
  - **관련 파일**: `components/weekly-log-detail-view.tsx`, `components/html-editor.tsx`, `components/ui/tooltip.tsx`(변경 없음, 기존 컴포넌트 재사용), `app/layout.tsx`
  - **수락 기준**: 위 지점 전부에서 `title` 속성이 제거되고 `Tooltip`으로 대체되며, 라이트/다크 양쪽에서 테마 토큰(`bg-foreground`/`text-background`)을 쓰고, 데스크탑 hover에서 정상 동작한다. **충족 확인.**
  - **테스트 결과** (Playwright MCP 실브라우저 검증, QA 계정 `qa-task051-iuii7a@example.com`을 실제 회원가입 플로우로 생성 후 종료 시 완전 삭제, 65 profiles 기준선 원복 확인):
    - [x] 상세 페이지 지연 배지 hover → "진척률 N%, 목표진척률 N%" 툴팁 노출 확인(로그 `신규 직원 업무 교육`, 진척률 25%·목표진척률 74%로 실측)
    - [x] 목표진척률 마커(진척률 막대 위 세로선, 2×8px) hover → "목표진척률 74%" 툴팁 노출 확인(마커가 `aria-hidden`이라 정확한 좌표 계산 후 포인터 이벤트로 검증)
    - [x] 작성 폼(`/protected/weekly-logs/new`) 에디터 툴바 "굵게" 버튼 hover → 툴팁 노출 확인, `title` 속성이 스냅샷에서 사라지고 `aria-label`만 남은 것 확인
    - [x] 다크 모드 전환 후 동일 지점(에디터 툴바) 재확인 — 배경/텍스트 색 반전 정상, 가독성 문제 없음
    - [x] 콘솔 에러 0건(전 시나리오)
    - [x] `npx tsc --noEmit` 에러 0건, `npm run lint` 신규 경고/에러 0건(기존 3개 에러는 `ui/carousel.tsx`/`ui/sidebar.tsx`/`hooks/use-mobile.ts`로 이 Task와 무관한 사전 존재 항목)

- **Task 052: 칸반보드 모바일 반응형 개선 (F049)** ✅
  - [x] `components/weekly-log-kanban-view.tsx`의 `grid grid-cols-1 lg:grid-cols-3`이 1024px 미만에서 3개 컬럼을 세로로 통째로 쌓아 칸반 본연의 기능(상태별 분포 한눈에 보기)을 잃는 문제 해결
  - [x] 두 대안 중 결정: (A) `ui/tabs.tsx`(이미 설치)로 모바일 전용 상태 탭 전환 — **채택**. (B) 컬럼을 가로 스크롤은 미채택
    - **계획과 다르게 처리한 부분**: 계획에는 "`sm:hidden`에 Tabs, `hidden lg:grid`로 기존 3열 유지"라고 적었으나, 구현 중 **`WeeklyLogKanbanColumn`을 Tabs용과 grid용으로 두 번 렌더링하면 `useDroppable({ id: status })`가 같은 id로 두 번 등록돼 dnd-kit이 깨지는 문제**를 실측으로 확인했다(두 인스턴스가 동시에 마운트되고 CSS로만 안 보이게 하는 것이라 dnd-kit 컨텍스트에는 둘 다 잡힘). 대신 컬럼 컴포넌트는 **그리드 안에 한 번만** 렌더링하고, 각 컬럼을 감싸는 wrapper `div`에 `cn(activeMobileStatus === status ? "block" : "hidden", "lg:block")`로 표시 여부만 CSS 토글했다. 탭 스위처(`Tabs`/`TabsList`/`TabsTrigger`, `lg:hidden`)는 `activeMobileStatus` 상태를 그리드와 공유하는 controlled 컴포넌트로 별도 배치하고 `TabsContent`는 사용하지 않았다(Radix Tabs의 기본 언마운트 동작이 필요 없어서). 브레이크포인트도 `sm` 대신 기존 그리드와 동일한 `lg`로 통일해 sm~lg 사이(태블릿)에서 컬럼이 또 쌓이는 구간이 생기지 않게 했다.
  - [x] 뷰 전환(목록/칸반/타임라인, `components/weekly-log-view-switcher.tsx`)과 함께 쓸 때 모바일에서 탭이 이중으로 겹쳐 보이지 않는지 확인 — 뷰 스위처(상단)와 상태 탭(그 아래)이 시각적으로 구분되어 겹치지 않음을 스크린샷으로 확인
  - **관련 파일**: `components/weekly-log-kanban-view.tsx`, `components/ui/tabs.tsx`(변경 없음, 기존 컴포넌트 재사용)
  - **수락 기준**: 375px~414px 폭 뷰포트에서 계획/진행중/완료 상태를 한 화면 전환으로 확인할 수 있고, 1024px 이상에서는 기존 3열 레이아웃이 그대로 유지된다. **충족 확인.**
  - **테스트 결과** (Playwright MCP 실브라우저 검증, QA 계정 `qa-task052-x9k2p@example.com`을 실제 회원가입 플로우로 생성 후 종료 시 완전 삭제, 65 profiles/536 weekly_logs 기준선 원복 확인):
    - [x] 390px 뷰포트 → "예정/진행중/완료" 탭 스위처 노출, "예정" 탭에 해당 컬럼 카드만 표시(다른 두 컬럼은 스크롤해도 나오지 않음) 확인
    - [x] "진행중" 탭 클릭 → 즉시 진행중 컬럼 카드로 전환 확인(선택 탭 밑줄 이동 포함)
    - [x] 768px(태블릿) → 탭 스위처가 그대로 유지되고 컬럼이 쌓이는 구간 없음을 확인(계획에 없던 sm~lg 사각지대 우려 해소)
    - [x] 1280px(데스크탑) → 탭 스위처가 사라지고 기존 3열 그리드가 정상 유지됨을 확인
    - [x] 드래그와 무관한 "진행상태 이동" 드롭다운이 모바일 탭 뷰에서도 정상 동작 확인 — Commerce시스템팀 소속 실제 로그 1건("데이터 마이그레이션 검토")을 예정→진행중으로 이동시켜 탭 카운트 배지(예정 5→4, 진행중 12→13)와 목록 갱신을 실시간으로 확인, 테스트 후 SQL로 상태를 `planned`로 원복하고 이 과정에서 트리거로 생성된 `weekly_log_change_history` 2건도 함께 삭제해 실사용자 데이터에 흔적을 남기지 않음
    - [x] 콘솔 에러 0건(전 시나리오)
    - [x] `npx tsc --noEmit` 에러 0건, `npm run lint` 신규 경고/에러 0건

- **Task 053: 필터 영역 시각적 일관성 통일 + 모바일 반응형 보완 (F050)** ✅
  - [x] `components/dashboard-filters.tsx`(기존 `flex flex-wrap items-center gap-2`만 있고 카드 컨테이너 없음)를 `components/weekly-log-list-view.tsx`가 이미 쓰는 `rounded-lg border bg-muted/20 p-3` 카드 스타일로 통일
  - [x] 목록 필터(검색 `w-56`, 팀 `w-48`, 상태 `w-36` 등 고정폭)와 대시보드 필터의 고정폭 클래스를 `w-full sm:w-*` 형태로 바꿔 좁은 화면에서 줄바꿈이 어수선해지지 않게 함
  - [x] `ui/sheet.tsx` 기반 "필터" 버튼 대안은 **미채택** — `w-full sm:w-*` 반응형 전환만으로 375px에서 필터가 카드 안에 깔끔히 세로로 쌓이는 것을 실측 확인했고(아래 테스트 결과), Sheet로 필터를 별도 패널로 숨기면 오히려 클릭 한 번이 더 필요해져 비용 대비 이득이 낮다고 판단
    - **계획과 다르게 처리한 부분**: "관련 파일"에 없던 `components/weekly-log-kanban-view.tsx`와 `components/date-range-filter.tsx`도 함께 수정했다 — 칸반 페이지의 검색/팀/상태 필터가 목록 페이지와 완전히 동일한 마크업을 중복 보유하고 있어(Task 052에서 확인) 목록만 고치면 화면마다 "필터 영역"이 다시 어긋나는 것을 실측으로 확인했고, `DateRangeFilter`는 목록·칸반·대시보드 3곳이 공유하는 컴포넌트라 날짜 입력(`w-40` 고정)도 함께 반응형으로 바꾸지 않으면 같은 카드 안에서 위쪽 필터 줄만 반응형이고 날짜 줄은 그대로인 불일치가 남기 때문이다.
  - **관련 파일**: `components/dashboard-filters.tsx`, `components/weekly-log-list-view.tsx`, `components/weekly-log-kanban-view.tsx`(계획에 없던 추가), `components/date-range-filter.tsx`(계획에 없던 추가)
  - **수락 기준**: 목록·칸반·대시보드 세 화면의 필터 영역이 동일한 카드 컨테이너 스타일을 쓰고, 375px 폭에서 필터 컨트롤이 카드 밖으로 밀리거나 겹치지 않는다. **충족 확인.**
  - **테스트 결과** (Playwright MCP 실브라우저 검증, QA 계정 `qa-task053-m7q4z@example.com`을 실제 회원가입 플로우로 생성 후 SQL로 `role='admin'` 임시 승격(대시보드 확인용, `auth.uid() IS NULL` 직접 DB 접속 경로라 자기상승 방지 트리거 비대상), 종료 시 완전 삭제, 65 profiles/536 weekly_logs 기준선 원복 확인):
    - [x] 1280px 데스크탑 → 대시보드 필터가 목록·칸반과 동일한 카드(테두리+`bg-muted/20`) 스타일로 렌더링 확인
    - [x] 390px 모바일 → 대시보드/목록/칸반 세 화면 모두 검색·Select·날짜 입력이 카드 폭을 꽉 채우며 한 줄에 하나씩 세로로 쌓이고, 카드 밖으로 밀리거나 겹치는 요소 없음을 스크린샷으로 확인
    - [x] 콘솔 에러 0건(전 시나리오)
    - [x] `npx tsc --noEmit` 에러 0건, `npm run lint` 신규 경고/에러 0건

- **Task 054: 헤더 `Command` 팔레트(⌘K) 신설 (F051)** ✅
  - [x] `components/ui/command.tsx`(cmdk 기반, 이미 설치되어 있으나 `/component-gallery` 데모 외 미사용)로 헤더에 `⌘K`/`Ctrl K` 단축키로 여는 `CommandDialog` 신설
  - [x] 1차 스코프: 정적 이동 메뉴만 제공 — 목록/칸반/타임라인, 신규 작성, 관리자 콘솔, 프로필(관리자 전용 메뉴는 관리자에게만 노출). 백엔드 검색 연동은 범위 밖
    - **계획과 다르게 처리한 부분**: 로드맵 문구는 관리자 메뉴로 "대시보드/부서/업무타입/사용자 관리" 4개만 예시로 들었으나, 실제 관리자 콘솔(`components/admin-tab-nav.tsx`)은 이미 6개 탭(대시보드·부문 관리·부서 관리·팀 관리·업무타입 관리·사용자 관리, 위 CLAUDE.md "슈퍼관리자 등급"/"`divisions` 테이블" 절 참고)으로 확장돼 있어, 팔레트도 6개 탭 전부를 등록했다(일부만 등록하면 팔레트가 실제 콘솔 내비게이션보다 빈약해짐).
  - [x] 단축키 리스너는 별도 클라이언트 컴포넌트(`components/command-palette.tsx` 신규)에 두고, 입력 필드에 포커스가 있을 때 단축키가 오작동하지 않는지 확인(Tiptap 에디터·검색창 등) — `document`에 `capture: true`로 등록해 Tiptap 에디터(contenteditable)의 자체 키 핸들러보다 먼저 가로채고 `preventDefault`+`stopPropagation`으로 하위 전파를 차단
  - [x] 모바일에서는 단축키 대신 헤더/모바일 시트에 트리거 버튼(아이콘) 노출 — `components/notification-bell.tsx`의 Provider/Context 분리 패턴(데스크탑·모바일 두 위치에서 같은 상태 공유)을 그대로 재사용해 `CommandPaletteProvider`(상태·Dialog 렌더)/`CommandPaletteTrigger`(트리거 버튼, Provider 밖에서는 조용히 null) 두 컴포넌트로 분리
  - **관련 파일**: `components/command-palette.tsx`(신규), `components/header-nav.tsx`(데스크탑 트리거 배치, `CommandPaletteProvider`로 로그인 사용자 영역 감싸기), `components/mobile-nav.tsx`(모바일 트리거 배치), `components/ui/command.tsx`(변경 없음, 기존 컴포넌트 재사용)
  - **수락 기준**: 데스크탑에서 `⌘K`(Mac)/`Ctrl K`(Win)로 팔레트가 열리고 각 메뉴 클릭 시 해당 라우트로 정상 이동하며, 관리자 전용 메뉴는 일반 사용자에게 노출되지 않는다. 모바일에서도 트리거 버튼으로 동일하게 접근 가능하다. **충족 확인.**
  - **테스트 결과** (Playwright MCP 실브라우저 검증, QA 계정 `qa-task054-cp7x2@example.com`을 실제 회원가입 플로우로 생성 후 종료 시 완전 삭제, 65 profiles 기준선 원복 확인):
    - [x] 1280px 데스크탑, 일반 사용자로 `Ctrl K` → 팔레트 오픈, "보기"(목록/칸반보드/타임라인)·"작성"(새 주간업무일지 작성)·"계정"(프로필) 3개 그룹만 노출되고 "관리자" 그룹은 없음을 확인
    - [x] 검색창에 "타임라인" 입력 → cmdk 내장 매칭으로 해당 항목만 필터링되는 것을 확인, 클릭 → `/protected/weekly-logs/timeline`로 정상 이동 및 다이얼로그 자동 닫힘 확인
    - [x] 작성 폼(`/protected/weekly-logs/new`) Tiptap 에디터에 텍스트 입력 후 `Ctrl K` → 팔레트가 열리고 에디터 본문은 그대로 유지(글자 유실·엉뚱한 문자 삽입 없음)됨을 확인, `Escape`로 닫은 뒤 콘솔 에러 0건 확인
    - [x] 390px 모바일 뷰포트 → 헤더의 검색 아이콘(트리거 버튼) 탭으로 동일한 다이얼로그가 열림을 확인
    - [x] SQL로 QA 계정을 `role='admin'`으로 승격 후 재진입 → 팔레트에 "관리자" 그룹 6개 항목(대시보드/부문 관리/부서 관리/팀 관리/업무타입 관리/사용자 관리) 전부 노출 확인, "사용자 관리" 클릭 → `/protected/admin/users`로 정상 이동 확인
    - [x] `npx tsc --noEmit` 에러 0건, `npm run lint` 신규 경고/에러 0건(기존 3개 에러는 Task 051에서 확인된 것과 동일한 `ui/carousel.tsx`/`ui/sidebar.tsx`/`hooks/use-mobile.ts` 사전 존재 항목)
  - **범위 밖 유지**: 백엔드 검색 연동(제목/작성자 등 실데이터 검색), 최근 방문 이력 기반 정렬

- **Task 055: 사용자 관리 `HoverCard` 프리뷰 (F052)** ✅
  - [x] `components/user-admin-table.tsx`의 아바타에 `ui/hover-card.tsx`(이미 설치, 미사용)를 달아 마우스 오버 시 이름/아바타/역할/소속 팀 요약을 페이지 이동 없이 보여줌 — `HoverCardTrigger asChild`로 `Avatar`를 감싸 포인터/포커스 핸들러만 얹었다(기존 `<Link>` 안에 중첩된 `<a>`를 새로 만들지 않기 위해 `asChild` 필수). 역할 라벨은 `components/user-role-select.tsx`의 `ROLE_LABELS`를 `export`해 재사용(중복 정의 방지)
  - [x] 터치 기기(hover 없음)에서의 폴백 동작 확인(클릭 시 상세 페이지로 이동하는 기존 동작과 충돌하지 않게) — Radix `@radix-ui/react-hover-card` 소스(`node_modules`)를 실측한 결과 `pointerType === "touch"`인 이벤트는 열기/닫기 핸들러 자체에서 무시하도록 이미 구현돼 있어(`event.pointerType === "touch" ? void 0 : eventHandler()`), 별도 분기 코드 없이도 터치에서는 호버 카드가 아예 열리지 않고 기존 `<Link>` 클릭 이동만 남는다
  - **계획과 다르게 처리한 부분**: `HoverCardTrigger asChild`가 자식(`Avatar`)의 `data-slot="avatar"`를 자신의 `data-slot="hover-card-trigger"`로 덮어쓰는 것을 테스트 중 실측했다(Radix `Slot`이 트리거 자신의 `data-slot`을 우선). 시각적 클래스(`group/avatar`, `data-size` 등)는 그대로 보존돼 기능·스타일에는 영향이 없지만, 이 셀 안에서 `[data-slot="avatar"]` 선택자로 아바타를 찾는 코드(테스트 등)가 있다면 `[data-slot="hover-card-trigger"]`를 대신 써야 한다는 점을 기록해둔다.
  - **관련 파일**: `components/user-admin-table.tsx`, `components/user-role-select.tsx`(`ROLE_LABELS` export), `components/ui/hover-card.tsx`(변경 없음, 기존 컴포넌트 재사용)
  - **수락 기준**: 데스크탑에서 아바타에 마우스를 올리면 카드가 뜨고, 클릭 시 기존처럼 상세 페이지로 이동하는 동작은 그대로 유지된다. **충족 확인.**
  - **테스트 결과** (Playwright MCP 실브라우저 검증, QA 계정 `qa-task055-hc3n9@example.com`을 실제 회원가입 플로우로 관리자 승격 후 생성해 검증, 종료 시 완전 삭제, 65 profiles 기준선 원복 확인):
    - [x] 1280px 데스크탑 `/protected/admin/users`에서 아바타 hover → 200ms 후 이름/이메일/역할 배지/소속 팀이 담긴 카드 노출 확인(`access1.dummy@example.com` 행으로 실측: "김도윤 / access1.dummy@example.com / 일반 사용자 / 접근제어 프로젝트팀")
    - [x] 카드가 뜬 상태에서 아바타 클릭 → `/protected/admin/users/{id}` 상세 페이지로 정상 이동 확인(호버 카드가 클릭을 가로채지 않음)
    - [x] 라이트 모드 전환 후 동일 지점 재확인 — 배경/텍스트 색 반전 정상, 테마 토큰(`bg-popover`/`text-popover-foreground`) 기반이라 가독성 문제 없음
    - [x] 콘솔 에러 0건
    - [x] `npx tsc --noEmit` 에러 0건, `npm run lint` 신규 경고/에러 0건
  - **범위 밖 유지**: 모바일 카드 목록(`components/user-admin-card.tsx`)은 이미 이름/소속 팀/역할이 카드에 직접 노출돼 있어 호버 프리뷰가 불필요 — 대상에서 제외(로드맵 "관련 파일"에도 명시되지 않음)

- **Task 056: 상세 페이지·작성 폼 섹션 구분 강화 (F053)** ✅
  - [x] `components/weekly-log-detail-view.tsx`: 예상 M/M·예상 금액·협력회사 요약 블록(`border bg-muted/30`)에 `Users`/`Coins`/`Building2` lucide 아이콘을 라벨 앞에 추가해 다른 텍스트 뭉치와 구분
  - [x] `components/weekly-log-form.tsx`: 날짜/업무타입/중요도/진척률/업무명/본문/추가정보/첨부 순으로 나열된 필드 사이에 `ui/separator.tsx`(이미 설치)로 "기본 정보 / 업무 내용 / 추가 정보" 구간을 나누고, `FormLabel` 옆에 소형 아이콘(`CalendarDays`/`Tag`/`Gauge`) 추가
    - **계획과 다르게 처리한 부분**: 로드맵은 3개 아이콘을 "FormLabel 옆" 전반에 쓰라고만 적었으나, 실제로는 필드 유형별로 1:1 매핑해 적용했다 — 시작일·목표종료일 두 날짜 필드는 공통으로 `CalendarDays`, 업무 타입은 `Tag`, 진척률은 `Gauge`(계량기 은유가 퍼센트 진행률에 가장 잘 맞음). 업무 중요도에는 로드맵이 준 3개 아이콘 중 어느 것도 자연스럽게 맞지 않아 아이콘을 추가하지 않았다(과잉 추가 방지). 구간 구분선은 `Separator` 단독이 아니라 구간명을 함께 표시하는 라벨 붙은 구분선(`FormSectionDivider`, 라벨 텍스트 + `flex-1 Separator`)으로 구현했다 — 로드맵이 정한 "기본 정보/업무 내용/추가 정보"라는 구체적 이름 3개가 화면에 실제로 보여야 그 이름이 의미가 있다고 판단했다(장식용 가로줄만으로는 구간 이름이 전달되지 않음).
  - [x] 상세 페이지 전체를 `Tabs`로 나누는 안(개요/진행관리/이력·댓글)은 정보 공개 범위가 바뀌는 트레이드오프가 있어 **이 Task 범위에서는 제외**하고 아이콘·Separator 수준의 저비용 개선만 적용
  - **관련 파일**: `components/weekly-log-detail-view.tsx`, `components/weekly-log-form.tsx`, `components/ui/separator.tsx`(변경 없음, 기존 컴포넌트 재사용)
  - **수락 기준**: 상세·작성 화면에서 각 정보 그룹의 경계가 시각적으로 구분되고, 라이트/다크 양쪽에서 아이콘 색상이 테마 토큰(`text-muted-foreground` 등)을 따른다. **충족 확인.**
  - **테스트 결과** (Playwright MCP 실브라우저 검증, QA 계정 `qa-task056-fs8k1@example.com`을 실제 회원가입 플로우로 생성해 실제 로그 1건 작성 후 검증, 로그·계정 모두 종료 시 완전 삭제, 65 profiles 기준선 원복 확인):
    - [x] 작성 폼(`/protected/weekly-logs/new`)에서 "기본 정보"(날짜·업무타입·중요도·진척률) / "업무 내용"(업무명·본문) / "추가 정보"(M/M·금액·협력사·첨부) 3개 구간이 라벨+구분선으로 시각적으로 분리됨을 스크린샷으로 확인, 시작일·목표종료일·업무타입·진척률 라벨 앞에 각각 아이콘 노출 확인
    - [x] M/M `2.5`, 금액 `1,000,000`, 협력사 `테스트 협력사`를 채운 로그를 실제로 저장 → 상세 페이지의 요약 블록에 Users/Coins/Building2 아이콘이 각 라벨 앞에 정상 노출됨을 확인
    - [x] "수정" 버튼으로 편집 폼 재진입 → 동일한 3개 구간 구분선·아이콘이 편집 모드(`WeeklyLogForm` 재사용 경로)에서도 그대로 유지됨을 확인
    - [x] 다크 모드 전환 후 상세·편집 화면 모두 재확인 — 아이콘·구분선·라벨 색상이 테마 토큰 기반이라 반전 정상, 가독성 문제 없음
    - [x] 콘솔 에러 0건(전 시나리오)
    - [x] `npx tsc --noEmit` 에러 0건, `npm run lint` 신규 경고/에러 0건

- **Task 057: 관리자 대시보드 차트 `Tabs` 그룹화 검토 (F054)** ✅
  - [x] `app/protected/admin/dashboard/page.tsx`의 차트 7종 + 파이차트 2종 + 요약 카드를 "요약/진척률", "분포(부서·상태·업무타입·중요도)", "추이·업무량" 3개 탭으로 묶는 안을 프로토타입으로 구현
    - **계획과 다르게 처리한 부분**: 로드맵의 "파이차트 2종"은 실측 결과 사실이 아니었다 — `components/dashboard-progress-chart.tsx`의 코드 주석을 확인한 결과 부문/부서 진척률 차트는 이미 이전 Task에서 파이(small multiples)에서 100% 누적 가로 막대로 교체돼 있었다(파이 조각의 각도는 그룹 간 비교가 어려운 인코딩이라는 이유, 옆의 "건수" 막대 차트와 시각 언어 통일 목적). 실제 파이 차트는 `dashboard-status-chart.tsx`(진행상태 분포 도넛) 1종뿐이다. 탭 그룹화 자체(차트를 3개 카테고리로 묶는 것)는 로드맵 설계 그대로 구현했다.
  - [x] 이 변경은 "대시보드를 스크롤로 훑어보는" 기존 사용 패턴과 상충할 수 있어(검토 리포트의 확신도 "중간" 항목) **적용 전 사용자 확인 필수** — 프로토타입을 실제 코드로 구현해 Playwright 스크린샷으로 보여준 뒤 사용자가 "채택(유지)"을 선택해 확정했다
  - **관련 파일**: `app/protected/admin/dashboard/page.tsx`(`Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`로 기존 3개 블록 재구성), `components/ui/tabs.tsx`(변경 없음, 기존 컴포넌트 재사용) — 개별 `dashboard-*-chart.tsx` 파일은 위치만 옮겨졌을 뿐 내부 구현은 수정하지 않았다
  - **수락 기준**: 3개 탭 전환이 정상 동작하고, 각 탭의 차트가 필터(부문/부서/팀/기간)와 정상 연동된다. **충족 확인 및 사용자 채택 확정.**
  - **테스트 결과** (Playwright MCP 실브라우저 검증, QA 계정 `qa-task057-dt4v2@example.com`을 실제 회원가입 플로우로 admin 승격 후 생성해 검증, 종료 시 완전 삭제, 65 profiles 기준선 원복 확인):
    - [x] "요약 · 진척률" 탭(기본 선택) → 요약 카드 4장 + 부서별/팀별 진척률 누적 막대 정상 렌더링 확인
    - [x] "분포" 탭 → 팀별 건수·진행상태 분포(도넛)·업무 타입별 건수·업무 중요도 분포 4개 차트 정상 렌더링 확인, 도넛 차트가 새로 mount되는 탭 전환 시점에도 크기 계산이 정상(0폭 렌더링 없음)임을 확인
    - [x] "추이 · 업무량" 탭 → 월별 추이·추천/비추천·팀별 예상 M/M·금액 3개 차트 정상 렌더링 확인
    - [x] **"추이 · 업무량" 탭이 선택된 상태에서 팀 필터를 "Commerce시스템팀"으로 변경** → URL이 soft navigation으로 갱신되고 차트 데이터는 필터링된 값으로 바뀌었지만 **선택된 탭은 그대로 유지됨을 확인**(로드맵이 우려한 "필터 변경 시 탭이 초기화되는" 문제 없음 — Radix `Tabs`의 비제어 상태가 서버 데이터 갱신에 의해 리마운트되지 않기 때문)
    - [x] 390px 모바일 뷰포트 → 탭 목록이 필터 카드 아래에서 줄바꿈 없이 정상 렌더링됨을 확인
    - [x] 콘솔 에러 0건(전 시나리오)
    - [x] `npx tsc --noEmit` 에러 0건, `npm run lint` 신규 경고/에러 0건
  - **범위 밖 유지**: 탭 선택 상태를 URL 쿼리 파라미터로 영속화하는 것(새로고침 시 탭이 기본값으로 돌아가는 것은 허용 가능한 손실로 판단, 필터 변경 중에는 이미 유지됨을 확인했으므로 우선순위 낮음)
  - **수락 기준**: 탭 전환 시 각 차트가 정상 렌더링되고, 사용자가 프로토타입을 확인한 뒤 채택/반려를 결정한다(반려 시 이 Task는 "적용 안 함"으로 종료 가능).

- **Task 058: 빈 상태·다운로드 메뉴 아이콘 보강 (F055)** ✅
  - [x] `components/empty-state.tsx`에 `icon?: LucideIcon` prop 추가(기본값 `FileText`, 기존 호출부는 변경 없이 그대로 `FileText`를 씀). `components/weekly-log-list-view.tsx`의 검색/필터 0건 분기(`activeFilters.length > 0`)에만 `SearchX`를 전달해 "검색 결과 없음"과 "진짜 빈 목록"을 구분
    - **계획과 다르게 처리한 부분**: `ui/empty.tsx`로의 교체는 **미채택**으로 결론지었다 — `ui/empty.tsx`(`p-6 md:p-12`, `max-w-sm`, `text-lg` 타이틀)는 대시보드 차트 카드처럼 작은 컨테이너 안에서 쓰이는 기존 `EmptyState`(`py-16` 컴팩트 레이아웃)보다 훨씬 무거워, 17곳의 기존 호출부(대시보드 차트 7종, 관리자 콘솔 3종, 목록·칸반·타임라인·댓글·알림 등) 크기를 함께 조정해야 하는 범위 밖 변경이 되기 때문이다. 같은 이유로 `SearchX` 적용도 로드맵의 "관련 파일"에 명시된 `weekly-log-list-view.tsx` 한 곳으로 좁혔다 — `user-admin-table.tsx`/`weekly-log-timeline-view.tsx` 등 다른 검색·필터형 빈 상태도 후보였지만, 이번 Task 범위(관련 파일 목록)에 없어 손대지 않았다.
  - [x] `components/weekly-log-list-view.tsx`의 PDF/Excel 다운로드 `DropdownMenuItem`에 각각 `FileText`(PDF)/`FileSpreadsheet`(Excel) 아이콘 추가 — `ui/dropdown-menu.tsx`의 `DropdownMenuItem`이 이미 `gap-2`+`[&>svg]:size-4`를 갖고 있어 별도 클래스 없이 아이콘이 정렬됨
  - **관련 파일**: `components/empty-state.tsx`, `components/ui/empty.tsx`(변경 없음, 검토 후 미채택), `components/weekly-log-list-view.tsx`
  - **수락 기준**: 검색 결과 없음/빈 목록/다운로드 메뉴 각각에서 문맥에 맞는 아이콘이 표시된다. **충족 확인.**
  - **테스트 결과** (Playwright MCP 실브라우저 검증, QA 계정 `qa-task058-vr3n1@example.com`을 실제 회원가입 플로우로 생성 후 종료 시 완전 삭제, 65 profiles 기준선 원복 확인):
    - [x] 다운로드 드롭다운 오픈 → "PDF 다운로드"/"Excel 다운로드" 앞에 각각 `FileText`/`FileSpreadsheet` 아이콘 노출 스크린샷 확인
    - [x] 목록에 없는 검색어(`존재하지않는검색어zzz999`) 입력 후 검색 → "조건에 맞는 업무 0건", `EmptyState`에 `SearchX` 아이콘 + "검색 결과가 없습니다" 노출 스크린샷 확인
    - [x] 콘솔 에러 0건
    - [x] `npx tsc --noEmit` 에러 0건, `npm run lint` 신규 경고/에러 0건(기존 3개 에러는 이전 Task들과 동일한 `ui/carousel.tsx`/`ui/sidebar.tsx`/`hooks/use-mobile.ts` 사전 존재 항목)

- **Task 059: 상세 페이지 `Breadcrumb` 추가 (F056)** ✅
  - [x] `components/weekly-log-detail-view.tsx` 상단에 `ui/breadcrumb.tsx`(이미 설치, 미사용)로 "주간업무 / {부서명} / {제목}" 경로 표시 — "주간업무"는 `/protected/weekly-logs`(전체 목록), "{부서명}"은 `/protected/weekly-logs?department={department_id}`(해당 팀으로 필터링된 목록), "{제목}"은 `BreadcrumbPage`(클릭 불가, 현재 페이지)
    - **계획과 다르게 처리한 부분**: 기존에 있던 "← 목록으로" 텍스트 링크(`ArrowLeft` 아이콘 + `/protected/weekly-logs`)를 이 Breadcrumb로 완전히 대체했다 — 두 내비게이션이 사실상 같은 목적지(첫 세그먼트 "주간업무"가 동일한 무필터 목록으로 이동)를 가리켜 나란히 두면 중복이었고, Breadcrumb 쪽이 부서 세그먼트까지 포함해 정보량이 더 많다. 읽기 전용 화면과 편집 화면(`isEditing`) 양쪽에서 기존 `backLink`가 있던 자리에 그대로 넣었다.
  - **관련 파일**: `components/weekly-log-detail-view.tsx`, `components/ui/breadcrumb.tsx`(변경 없음, 기존 컴포넌트 재사용)
  - **수락 기준**: 상세 페이지 진입 시 소속 부서·목록으로의 경로가 한눈에 보이고, 각 구간 클릭 시 해당 목록/필터로 이동한다. **충족 확인.**
  - **테스트 결과** (Playwright MCP 실브라우저 검증, QA 계정 `qa-task059-hb4k7@example.com`을 실제 회원가입 플로우로 생성 후 종료 시 완전 삭제, 65 profiles 기준선 원복 확인):
    - [x] 상세 페이지 진입 → "주간업무 › Commerce시스템팀 › {제목}" 순으로 노출, 375px 폭에서도 줄바꿈만 될 뿐 카드 밖으로 밀리지 않음을 스크린샷으로 확인
    - [x] "Commerce시스템팀" 세그먼트 클릭 → `/protected/weekly-logs?department={id}`로 이동해 해당 팀으로 필터링된 목록이 뜨는 것을 확인
    - [x] "수정" 버튼으로 편집 폼 진입 → 동일한 Breadcrumb가 편집 화면 상단에도 그대로 유지됨을 스크린샷으로 확인
    - [x] 다크 → 라이트 모드 전환 후 재확인 — 구분자·링크·현재 페이지 텍스트 색상이 테마 토큰(`text-muted-foreground`/`hover:text-foreground`) 기반이라 반전 정상
    - [x] 콘솔 에러 0건
    - [x] `npx tsc --noEmit` 에러 0건, `npm run lint` 신규 경고/에러 0건(기존 3개 에러는 이전 Task들과 동일한 `ui/carousel.tsx`/`ui/sidebar.tsx`/`hooks/use-mobile.ts` 사전 존재 항목)

- **Task 060: 사용자 역할 `Badge` variant 분화 (F057)** ✅
  - [x] `components/user-role-select.tsx`에 로드맵 예시 그대로 `ROLE_BADGE_VARIANT`(슈퍼관리자=`destructive`, 관리자=`secondary`, 일반=`outline`) 맵을 `ROLE_LABELS` 옆에 신설·export하고, `components/user-admin-table.tsx`의 HoverCard 프리뷰 배지(기존 `variant="outline"` 고정)에 적용
    - **계획과 다르게 처리한 부분**: 테이블의 역할 컬럼 자체는 Badge가 아니라 인라인 편집용 `Select`(`UserRoleSelect`)라 "Badge variant 적용" 대상이 명확하지 않았다 — `SelectItem`(드롭다운 옵션)이 아니라 **닫힌 상태에서 항상 보이는 트리거의 표시값**에 적용해야 "훑어보기" 목적에 맞는다고 판단해, `SelectValue`의 `children`을 현재 `value` state로 직접 렌더링하도록 바꾸고 그 안에 `badgeVariants({variant})` 클래스를 적용한 `span`을 넣었다(`Badge` 컴포넌트 자체(`div`)를 쓰면 `SelectValue`/`SelectItem`이 렌더링하는 `span` 안에 `div`가 중첩되어 유효하지 않은 HTML이 되므로, 이미 export돼 있는 `badgeVariants` cva 함수만 재사용). `SelectItem`(펼친 드롭다운의 선택지)은 기존 그대로 일반 텍스트로 남겨 변경 범위를 트리거 표시로 한정했다. 이 컴포넌트를 재사용하는 `user-admin-table.tsx`(목록 인라인)·`user-admin-card.tsx`(모바일 카드)·`user-admin-detail.tsx`(상세 페이지 역할 변경 폼) 3곳 모두 컴포넌트 자체 변경 없이 색상 구분을 상속받는다. `components/user-admin-detail.tsx` 상단의 별도 하드코딩 배지(`user.role === "user" ? "secondary" : "success"`, admin/superadmin이 색상으로 구분되지 않는 기존 결함)는 로드맵의 "관련 파일" 목록에 없어 손대지 않았다(Task 058에서 세운 관례— 관련 파일 목록 밖은 다른 세션에서 별도 판단).
  - **관련 파일**: `components/user-role-select.tsx`, `components/user-admin-table.tsx`
  - **수락 기준**: 사용자 관리 목록에서 역할별로 배지 색상이 즉시 구분되며, 기존 역할 변경(Select) 동작은 그대로 유지된다. **충족 확인.**
  - **테스트 결과** (Playwright MCP 실브라우저 검증, QA 계정 `qa-task060-pw3j9@example.com`을 실제 회원가입 플로우로 생성 후 SQL로 `role='admin'` 임시 승격(관리자 콘솔 접근용, `auth.uid() IS NULL` 직접 DB 접속 경로라 자기상승 방지 트리거 비대상), 종료 시 완전 삭제, 65 profiles 기준선 원복 확인):
    - [x] `/protected/admin/users` 목록에서 일반 사용자(outline, 테두리만)·관리자(secondary, 연회색 채움)·슈퍼관리자(destructive, 빨강 채움) 3단계가 육안으로 즉시 구분됨을 셀 단위 스크린샷으로 확인
    - [x] 아바타 HoverCard 프리뷰의 역할 배지도 동일하게 슈퍼관리자가 destructive로 노출됨을 확인(기존엔 항상 outline 고정)
    - [x] 상세 페이지(`/protected/admin/users/{id}`)의 "역할 및 소속 팀 변경" Select 트리거에도 동일한 배지 색상 적용, 드롭다운을 펼치면 선택지 3개는 기존처럼 일반 텍스트로 노출되는 것을 확인(트리거만 배지, 옵션 목록은 미변경)
    - [x] `access1.dummy@example.com`(일반 사용자)을 실제로 "관리자"로 변경 → 트리거 배지가 즉시 outline→secondary로 바뀌고 성공 토스트 노출 확인, 이후 "일반 사용자"로 되돌려 SQL로 `role='user'` 원복 확인(실사용자 더미 데이터에 흔적 남기지 않음)
    - [x] 라이트 모드에서도 3색 배지 대비 재확인 — 모두 테마 토큰(`bg-secondary`/`bg-destructive`/`text-foreground`) 기반이라 반전 정상
    - [x] 콘솔 에러 0건
    - [x] `npx tsc --noEmit` 에러 0건, `npm run lint` 신규 경고/에러 0건(기존 3개 에러는 이전 Task들과 동일한 `ui/carousel.tsx`/`ui/sidebar.tsx`/`hooks/use-mobile.ts` 사전 존재 항목)

### Phase 8: 운영 정리 (ad hoc, 2026-08-22 추가)

> **배경**: v2(F040~F057) 전체 마감 후, 사용자가 "다음 로드맵을 계획해달라"고 요청해 v1·v2 로드맵의 "범위 밖 유지" 기록·`docs/prd/PRD.md`·`docs/guides/`·Supabase 어드바이저를 실측 재검토했다. 새 기능을 제안하기 전에, **이미 스스로 미룬 이유가 지금은 사라졌거나 문서만 실제와 어긋난 항목 3건**을 먼저 정리하기로 사용자와 합의했다(위험이 낮고 하루 안에 끝낼 수 있는 항목만 선별, 나머지 후보 기능은 이후 별도 Phase로 검토).
>
> **선행 조건**: 없음. **순서 원칙**: Phase 7과 동일하게 Task 완료 후 다음 Task 착수 전 항상 중단하고 사용자 지시를 대기한다.

- **Task 061: 알림 보존 정책 자동화 — `pg_cron` 잡 추가 (F058)** ✅
  - [x] `docs/guides/deployment-ops.md` 7절의 수동 SQL(`delete from notifications where read_at is not null and read_at < now() - interval '90 days'`)을 `weekly_log_notification_cleanup`이라는 새 `pg_cron` 잡으로 등록. 9절이 이미 남긴 이유(F041 착수 당시 "같은 Task에 새 pg_cron 리스크를 두 개 쌓지 않겠다")는 리마인더 잡이 몇 주째 정상 동작 중인 지금은 더 이상 유효하지 않다고 판단해 그대로 진행
  - [x] 등록 전 `select jobid, jobname, schedule, command, active from cron.job order by jobid`로 확인 — 기존 잡은 `weekly_log_reminder` 1건뿐, 충돌 없음 확인 후 `cron.schedule('weekly_log_notification_cleanup', '0 3 1 * *', $$delete ...$$)` 실행(jobid=2로 등록됨)
  - [x] 스케줄은 매월 1일 03:00 UTC(12:00 KST)로 등록. 삭제 대상 건수 사전 조회 로깅은 별도 자동화 없이 7절에 "미리 조회하고 싶으면 이 SELECT를 실행" 안내로 남기는 것으로 충분하다고 판단(잡 자체가 매월 1회뿐이라 실행 전/후 자동 로그까지는 과한 엔지니어링)
  - [x] `deployment-ops.md` 7절("정상 운영 시에는 수동 실행 불필요, 잡이 대신 수행"으로 갱신)·9절(등록된 잡 표에 새 행 추가 + "알림 보존 정책과의 관계" 절을 재등록/중단 SQL 포함하도록 재작성) 갱신
  - **관련 파일**: `docs/guides/deployment-ops.md`(DB 변경은 Supabase MCP `execute_sql`로 직접 적용, 로컬 마이그레이션 파일에는 남지 않음 — 기존 `weekly_log_reminder`와 동일)
  - **수락 기준**: `cron.job`에 `weekly_log_notification_cleanup` 잡이 등록되어 있고, 수동으로 즉시 1회 실행해 읽은 지 90일 지난 알림만 삭제됨을 확인하며, 문서가 최신 운영 방식을 반영한다. **충족 확인.**
  - **테스트 결과** (Supabase MCP `execute_sql`로 실측 검증, 실사용자 데이터는 건드리지 않고 합성 테스트 행만 삽입 후 삭제):
    - [x] 등록 직후 `delete from notifications where read_at is not null and read_at < now() - interval '90 days'`를 직접 1회 실행 → 대상 0건(현재 알림 62건 중 읽은 알림 1건, 아직 90일 경과분 없음) 확인, 에러 없음
    - [x] `read_at`을 120일 전, `type='reminder'`(actor_id/weekly_log_id null 허용)로 지정한 합성 테스트 알림 1건을 실제 삽입 → 동일 DELETE 재실행 → 해당 행만 삭제되고 나머지 61건은 그대로 유지됨을 `id`로 재조회해 확인
    - [x] 삭제 후 `notifications` 총계가 삽입 전 기준선(62건, 안 읽은 알림 61건)으로 정확히 원복됨을 확인 — 실사용자 데이터에 흔적 없음
    - [x] `select jobid, jobname, schedule, command, active from cron.job`으로 `weekly_log_reminder`(기존)와 `weekly_log_notification_cleanup`(신규) 2개 잡이 공존하며 서로 다른 스케줄로 등록된 것을 확인

- **Task 062: `docs/prd/PRD.md` 문서 드리프트 정정 (F059)** ✅
  - [x] PRD.md "5. v2 이후에도 제외되는 기능"의 "부서 계층 구조(상위/하위 부서), 부서장 지정, 부서 통폐합(로그 일괄 이관)" 항목이 v2 마감 이후 ad hoc으로 구현된 `divisions` 테이블(조직→부서(선택)→팀 3단 계층)과 부문장·부서장·팀장 지정(`head_profile_id`)과 정면으로 모순됨을 확인 — CLAUDE.md에는 이미 정확히 반영되어 있으나 PRD.md만 누락된 상태였음
  - [x] 실제로 구현된 것(division 계층, 3단계 장 지정)과 여전히 제외인 것(부서 통폐합·로그 일괄 이관, 임의 깊이의 재귀적 상하위 구조 — division은 고정 3단일 뿐 재귀 트리가 아님)을 구분해 5절 문구를 다시 씀
  - [x] 6절 데이터 모델에 `divisions` 테이블 신규 추가, `organizations`/`departments` 필드 표에 `head_profile_id`(및 `departments.division_id`/`is_direct_report`) 행을 추가 — 5절의 "이제 지원됨" 주장을 데이터 모델 레벨에서도 뒷받침. 필드 존재 여부·nullable·`on delete set null` 등은 새로 주장하지 않고 `information_schema.columns`/`pg_constraint`(confdeltype='n' 3건 실측)로 직접 조회해 검증
  - **계획과 다르게 처리한 부분(스코프를 의도적으로 좁힘)**: PRD.md 실측 결과 예상보다 드리프트가 훨씬 컸다 — "부서"라는 단어가 문서 전체에 104회 쓰이는데 전부 `departments`를 가리키고, CLAUDE.md가 이미 반영한 "조직→부문, 부서(department)→팀" 화면 표기 리네이밍이 PRD.md에는 **한 곳도 반영되지 않은 상태**였다. 게다가 4절 "v2 고도화 기능" 표는 원래 승인된 8건(F040~F047)에서 멈춰 있어 Phase 7 UI/UX 10건(F048~F057)과 Phase 8 운영 정리 3건(F058~F060)도 전혀 실려 있지 않았다. 이 세 가지(전면 용어 교체, 관리자 콘솔 페이지 상세 절 6개 tab 동기화, F048~F060 표 반영)를 전부 오늘 처리하면 "빠른 개선"이라는 애초 합의된 범위를 벗어나는 대규모 재작성이 되므로, **이번 Task는 실제 모순(5절)과 그 모순을 해소하는 데 꼭 필요한 최소 범위(6절 데이터 모델)로 한정**했다. 대신 4절 표 바로 아래에 "v2 마감 이후 ad hoc 확장이 이어졌다"는 단락을 추가해 divisions/head_profile_id·Phase 7·Phase 8의 존재와 `ROADMAP_V2.md` 참조 경로를 명시했다(v1이 "Phase 3 이후 ad hoc 확장"을 표 대신 서술로 처리한 기존 선례와 동일한 패턴). **부서→팀 전면 용어 교체와 관리자 콘솔 페이지 상세 절 동기화는 의도적으로 손대지 않았고, 별도 Task로 제안이 필요하면 사용자에게 먼저 확인받을 것.**
  - **관련 파일**: `docs/prd/PRD.md`
  - **수락 기준**: PRD.md가 CLAUDE.md·실제 구현 상태와 모순되지 않는다(5절 문구 자체의 정합성 기준으로 충족 — 문서 전체의 용어 통일까지는 이번 Task 범위 밖). **충족 확인.**
  - **테스트 결과**: DB 실측(`information_schema.columns`, `pg_constraint`)으로 `divisions`/`organizations`/`departments`의 `head_profile_id` nullable 여부와 `on delete set null`(confdeltype='n') 3건, `departments.is_direct_report`(`not null default false`)·`division_id`(nullable) 컬럼 정의를 PRD.md 신규 서술과 대조해 전부 일치함을 확인. 코드 변경이 없는 순수 문서 Task라 별도 브라우저·QA 계정 검증은 불필요.

- **Task 063: 미인덱싱 FK 4건 실측·판단 — `divisions`/`head_profile_id` ad hoc 확장분 (F060)** ✅
  - [x] Supabase 어드바이저(performance, INFO)의 `unindexed_foreign_keys` 7건 중 **이미 v1 Task 039(8절)에서 측정 후 "의도된 설계"로 기각된 3건**(`weekly_log_attachments.department_id`/`.uploaded_by`, `weekly_log_reactions.user_id`)은 재론하지 않고, divisions/head_profile_id ad hoc 확장이 추가한 **나머지 4건**(`departments.division_id`, `departments.head_profile_id`, `divisions.head_profile_id`, `organizations.head_profile_id`)만 재검토
  - [x] 8절과 동일한 "측정 먼저" 원칙 적용 — `organizations`(10행)·`divisions`(2행)·`departments`(11행) 실측 확인. `pg_get_functiondef`로 `clear_stale_head_assignments()`(profiles.department_id 변경마다 이 3테이블에 `where head_profile_id = ...` UPDATE 실행) 정의를 직접 조회하고, `stats_logs_by_department` 등 대시보드 `stats_*` RPC가 `d.division_id = div_id`로 `departments`를 필터링하는 것도 정의로 확인 — 둘 다 실제 쿼리 경로이지만 대상 테이블이 10~11행이라 시퀀셜 스캔 비용이 사실상 0
  - [x] **결정: 지금은 인덱스 추가 안 함(보류, 기존 3건과 달리 영구 기각이 아님)** — 이 4건은 기존 3건(쓰기가 잦은 반응 토글·첨부파일 업로드 핫패스라 인덱스 쓰기 비용이 이득보다 큼)과 달리 쓰기가 드문 관리자 전용 테이블이라 인덱스 추가 비용도 무시할 만하지만, "측정된 효과가 없는 변경은 반영하지 않는다"는 8절 원칙을 동일하게 적용해 아직 이득이 없는 지금 시점엔 추가하지 않기로 결정. 재검토 시점(조직·부서·팀 수가 수백 단위로 늘어날 때)을 명시해 나중에 판단이 다시 필요할 때 근거를 재구성하지 않아도 되게 함
  - [x] 결정 근거를 `docs/guides/deployment-ops.md` 8절 "기각/의도된 설계로 분류" 절에 새 항목으로 추가(기존 3종 항목과 이번 4종 항목의 근거가 "쓰기 비용" vs "테이블 크기"로 서로 다르다는 점을 명시)
  - **관련 파일**: `docs/guides/deployment-ops.md`(인덱스를 추가하지 않기로 결정해 실제 DB 스키마 변경 없음)
  - **수락 기준**: 4건 각각에 대해 근거 있는 결정(추가/보류)이 내려지고 문서에 기록되며, 인덱스를 추가했다면 어드바이저에서 해당 항목이 사라진다. **충족 확인**(보류로 결정했으므로 어드바이저 INFO 7건은 그대로 유지되는 것이 기대된 결과 — 재조회로 확인).
  - **테스트 결과**: `mcp__supabase__get_advisors(type="performance")`를 결정 전/후 각각 재조회해 `unindexed_foreign_keys` 7건(기존 3건 + 신규 4건)이 그대로임을 확인(의도된 보류 결과와 일치, 스키마 변경이 없었으므로 당연한 결과). 코드 변경이 없는 순수 DB 실측·문서 Task라 별도 브라우저 검증은 불필요.

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
| F048 | Tooltip 컴포넌트 전면 도입 | Task 051 |
| F049 | 칸반보드 모바일 반응형 개선 | Task 052 |
| F050 | 필터 영역 시각적 일관성·반응형 통일 | Task 053 |
| F051 | 헤더 Command 팔레트 | Task 054 |
| F052 | 사용자 관리 HoverCard 프리뷰 | Task 055 |
| F053 | 상세·작성 폼 섹션 구분 강화 | Task 056 |
| F054 | 대시보드 차트 Tabs 그룹화 | Task 057 (**적용 전 사용자 확인 필수 — 반려 시 범위 밖 종료 가능**) |
| F055 | 빈 상태·다운로드 메뉴 아이콘 보강 | Task 058 |
| F056 | 상세 페이지 Breadcrumb | Task 059 |
| F057 | 사용자 역할 Badge variant 분화 | Task 060 |
| F058 | 알림 보존 정책 자동화 (pg_cron) | Task 061 |
| F059 | PRD.md 문서 드리프트 정정 | Task 062 |
| F060 | 미인덱싱 FK 4건 실측·판단 | Task 063 |

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
