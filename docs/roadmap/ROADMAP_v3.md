# 부서별 진행업무 관리 v3 고도화 로드맵

v2(F040~F057) 마감과 뒤이은 운영 정리(F058~F060, `docs/roadmap/ROADMAP_V2.md` Phase 8)까지 끝낸 뒤, 사용자가 제품의 화면 표기 자체를 바꾸기로 결정하면서 시작된 로드맵이다.

> **배경**: v2 전체 마감 후 사용자에게 "다음 로드맵을 계획해달라"는 요청을 받아 v1·v2의 "범위 밖 유지" 기록·PRD·`docs/guides/`·Supabase 어드바이저를 실측 재검토해 3건(pg_cron 알림 보존 자동화·PRD 드리프트 정정·미인덱싱 FK 판단)을 제안했고, 사용자가 이를 승인해 `ROADMAP_V2.md` Phase 8(Task 061~063, F058~F060)로 완료했다. 이어서 사용자가 **"주간업무"/"주간업무 일지"라는 화면 표기를 "진행업무"로 바꿔달라**고 요청했고, 조사 결과 접두사 없이 쓰이던 "업무일지" 단독 표현도 같은 개념을 가리켜 함께 리네임하기로 확인받았다(Task 064). 이 리네임이 코드베이스 전반에 걸친 첫 "제품명 변경"이라 v2와는 성격이 달라 별도 문서(v3)로 분리했다.

> **이후 확장**: v3는 리네임·문서 동기화(Task 064~065)로 시작했지만, 그 뒤 사용자 요청 기능 3건(Task 066~068, F063~F065)이 이어지며 기능 개발 로드맵으로 성격이 확장됐다. 특히 **담당자 이관(F063)**은 신규 테이블(`weekly_log_transfers`)·신규 컬럼(`weekly_logs.transfer_count`/`last_transferred_at`)·신규 알림 유형(`transfer`)을 도입해 데이터 모델을 바꾸므로 `docs/prd/PRD.md`에도 반영했다(v2 마감 이후의 F048~F060이 로드맵에만 기록된 것과 다른 처리 — 판단 기준은 "데이터 모델이나 화면 동작이 실제로 바뀌는가"다).

## Phase 8과의 관계

`ROADMAP_V2.md` Phase 8(Task 061~063, F058~F060)은 v2 마감 이후 첫 ad hoc 확장이지만 문서상으로는 `ROADMAP_V2.md`에 그대로 남아 있다(운영 정리 3건은 v2가 구축한 알림·성능 인프라의 연장이라 v2 문서에 두는 것이 문맥상 자연스럽다는 판단). v3는 **F061부터** 새 문서로 시작하며, F058~F060은 여기서 다시 다루지 않고 `ROADMAP_V2.md`를 참고한다.

## 개발 워크플로우

1. **작업 계획** — 기존 코드베이스를 학습하고 현재 상태를 파악, 새 작업을 포함하도록 이 문서를 갱신
2. **작업 생성** — 고수준 명세서, 관련 파일, 수락 기준 포함
3. **작업 구현** — 명세서를 따라 구현, 화면 텍스트 변경 등 사용자 확인이 필요한 지점은 AskUserQuestion으로 먼저 확인. 각 Task 완료 후 중단하고 추가 지시를 대기
4. **로드맵 업데이트** — 완료된 항목의 체크박스를 채우고 Task 제목에 ✅ 표시

---

## 개발 단계

- **Task 064: 화면 표기 리네임 — "주간업무(일지)" → "진행업무" (F061)** ✅
  - [x] 코드베이스 전수 조사 — `app/`·`components/`·`lib/`·`hooks/`에서 "주간업무"(56곳)와 접두사 없는 "업무일지"(45곳, 같은 개념을 가리키는 것을 사용자 확인 후 포함 확정)를 모두 찾아 목록화. 코드 주석(18곳, `//` 전용 라인)은 화면에 노출되지 않으므로 범위에서 제외
  - [x] 두 단계 치환 규칙 적용 — `주간업무일지`/`업무일지` → `진행업무`, `주간업무`/`주간 업무`(띄어쓰기 포함) → `진행업무`. 코드 식별자(`weekly_logs` 테이블, `/protected/weekly-logs` 라우트, `WeeklyLog*` 타입, `weekly-log-*.tsx` 파일명)는 전혀 변경하지 않음 — CLAUDE.md가 이미 문서화한 "조직→부문, 부서→팀" 화면 표기 리네임과 동일한 원칙(코드 식별자 불변, 화면 텍스트만 변경)
  - [x] 페이지 타이틀·헤더·랜딩 히어로·검색창/탭 aria-label·빈 상태 문구·삭제 확인 다이얼로그·토스트·에러 메시지·대시보드 차트 설명/caption/aria-label·관리자 콘솔 테이블 컬럼("진행업무 수")·PDF/Excel 다운로드 파일명·문서 제목·워크시트 이름·알림 설정 문구·`/tech-stack` 설명까지 전부 적용
  - **관련 파일**: `app/layout.tsx`, `app/page.tsx`, `app/protected/admin/{dashboard,departments,work-types}/page.tsx`, `app/protected/weekly-logs/**`(error·not-found·loading·new/page), `components/{command-palette,dashboard-*-chart,department-*,work-type-*,hero-cta,notification-preferences-field,site-header,site-header-title,user-admin-detail,weekly-log-*}.tsx`, `lib/actions/{weekly-log,weekly-log-reaction,work-type}.ts`, `lib/{format,constants/tech-stack}.ts`, `lib/{pdf/weekly-log-pdf,excel/weekly-log-excel}.ts` — 총 43개 파일
  - **수락 기준**: 화면에 보이는 모든 텍스트(다운로드 파일 내용 포함)가 "진행업무"로 통일되고, 코드 식별자·라우트·DB 스키마는 전혀 바뀌지 않으며, 기존 기능이 회귀 없이 동작한다. **충족 확인.**
  - **테스트 결과** (Playwright MCP 실브라우저 검증, QA 계정 `qa-rename-v3n2k@example.com`을 실제 회원가입 플로우로 생성해 관리자 승격 후 검증, 종료 시 완전 삭제, 65 profiles 기준선 원복 확인):
    - [x] 랜딩 페이지 — 브라우저 탭 타이틀("팀별 진행업무 관리"), 헤더 로고, 히어로 헤드라인, CTA 버튼("진행업무 보러가기"), 기능 카드 15개 전부 "진행업무"로 노출 확인
    - [x] 목록 페이지 — 검색창 aria-label("진행업무 검색"), 뷰 전환 탭 aria-label("진행업무 보기 전환"), 헤더("IT부문 진행업무") 확인
    - [x] 상세 페이지 — Breadcrumb 첫 세그먼트("진행업무"), 삭제 확인 다이얼로그("진행업무를 삭제하시겠습니까?") 확인
    - [x] 관리자 콘솔 — 대시보드 헤더, 팀/업무타입 관리 테이블의 "진행업무 수" 컬럼 확인
    - [x] `/tech-stack` — ExcelJS·jsPDF 설명 문구("진행업무 Excel/PDF 다운로드") 확인
    - [x] PDF 다운로드 실제 생성·파일 열람 — 파일명 `진행업무_전체 팀_20260822.pdf`, 문서 헤더 "진행업무 - 전체 팀", 한글 폰트 정상 렌더링 확인
    - [x] Excel 다운로드 실제 생성·xlsx 내부 XML 검사 — 워크시트 이름 "진행업무", 제목 행 "진행업무 - 전체 팀" 확인
    - [x] 콘솔 에러 0건, `npx tsc --noEmit` 에러 0건, `npm run lint` 신규 경고/에러 0건(기존 3개 에러는 이전부터 있던 `ui/carousel.tsx`/`ui/sidebar.tsx`/`hooks/use-mobile.ts` 사전 존재 항목)
  - **범위 밖 유지(이번 Task 시점)**: `CLAUDE.md`·`README.md`·프로젝트 문서(`docs/` 전반) — "화면에 보이는 텍스트"가 아니라서 제외했으나, Task 065에서 이어서 처리

- **Task 065: 문서 동기화 — CLAUDE.md/README.md 진행업무 리네임 반영 및 v3 로드맵 연결 (F062)** ✅
  - [x] `CLAUDE.md`의 "주간업무(일지)" 서술 10곳을 "진행업무"로 리네임(코드 식별자·백틱으로 감싼 참조는 그대로 유지) — 프로젝트 개요 문단에 v2 Phase 7·8과 v3(F061 리네임)의 존재, 그리고 "화면 텍스트만 바뀌고 코드 식별자는 그대로"라는 원칙을 명시하는 문장 추가
  - [x] `CLAUDE.md`에서 실제 파일 경로와 어긋나 있던 링크 3곳(`docs/ROADMAP_v1.md`→`docs/roadmap/ROADMAP_v1.md` ×2, `docs/PRD.md`→`docs/prd/PRD.md` ×1)을 함께 정정 — 이번 Task로 CLAUDE.md의 같은 문장들을 다시 여는 김에 실측(`ls`)으로 확인한 명백한 오류라 함께 고침
  - [x] `README.md`의 타이틀·부제·기능 목록 10여 곳을 "진행업무"로 리네임, 마감 문단에 v2 Phase 7·8·v3(F061) 요약과 `ROADMAP_v3.md` 링크 추가, "문서" 섹션에 v3 로드맵 링크 신설
  - [x] `README.md`에서도 동일한 경로 오류(`docs/PRD.md`, `docs/ROADMAP_v1.md`) 2곳을 정정
  - [x] `components/site-footer.tsx`에 "고도화 3차 과제" 링크(`docs/roadmap/ROADMAP_v3.md`)를 "고도화 2차 과제" 다음에 신설, 같은 컴포넌트의 기존 경로 오류(`docs/PRD.md`, `docs/ROADMAP_v1.md`) 2곳도 함께 정정 — 실제 GitHub에 존재하지 않는 경로로 연결되던 링크였음
  - **계획과 다르게 처리한 부분**: 이번 Task에서 "고도화 3차 과제" 링크가 가리킬 문서가 아직 없다는 점이 드러나, 이 문서(`ROADMAP_v3.md`) 자체를 신설하는 것으로 사용자에게 먼저 확인받았다(Phase 8을 v2 문서에 남긴 채 v3는 F061부터 새로 시작). 또한 CLAUDE.md·README.md·site-footer.tsx 세 파일 모두에서 `docs/PRD.md`·`docs/ROADMAP_v1.md` 실제 경로 불일치를 추가로 발견해(v2 Task 050이 CLAUDE.md 일부만 고치고 README·footer는 놓쳤던 것으로 보임) 이번 Task 범위에서 함께 정정했다
  - **관련 파일**: `CLAUDE.md`, `README.md`, `components/site-footer.tsx`, `docs/roadmap/ROADMAP_v3.md`(신규)
  - **수락 기준**: CLAUDE.md·README.md가 실제 화면 표기·실제 파일 경로와 모순되지 않고, 푸터의 "고도화 3차 과제" 링크가 유효한 문서로 연결된다. **충족 확인.**
  - **테스트 결과**: `npx tsc --noEmit`/`npm run lint` 클린(코드 변경은 `site-footer.tsx` 링크 3개뿐이라 회귀 위험 낮음), Playwright MCP로 랜딩 페이지 푸터에서 "고도화 3차 과제" 링크가 렌더링되고 `docs/roadmap/ROADMAP_v3.md`(GitHub raw 경로)로 정상 연결됨을 확인. 문서 파일(`CLAUDE.md`/`README.md`) 자체는 실행 코드가 아니므로 별도 브라우저 검증 대상이 아님.

- **Task 066: 진행업무 오너십 이관 (F063)** ✅
  - **배경**: 사용자가 "관리자가 등록한 진행업무를 다른 사람에게 이관하고 싶다"며, (a) 등록 시점에 담당자를 지정하는 방식과 (b) 우선 등록한 뒤 상세 화면에서 이관하는 방식 중 어느 쪽이 나은지 검토를 요청했다. **(b) 상세 화면 이관을 권고하고 채택**했다 — ① 이관은 등록 시점 1회성 이벤트가 아니라 업무 수명 동안 반복되는 사건이라 "한 번 이상 이관 가능"이라는 요구를 만족하려면 어차피 상세 화면 경로가 필요하고, 그게 있으면 "등록 직후 이관"은 2클릭으로 커버되지만 반대는 성립하지 않는다, ② `weekly_logs` INSERT RLS가 `(department_id = current_department_id() AND author_id = auth.uid()) OR is_admin()`이라 등록 폼에 담당자 필드를 넣으면 일반 사용자도 쓰는 폼이 role별로 갈라진다, ③ 상세 화면은 이미 인라인 편집 + 접이식 변경 이력 패턴이 확립돼 있어 이관 이력·알림을 붙이기 자연스럽다.
  - [x] **DB — 이관 이력 테이블 신설**(`weekly_log_transfers`): 이전/새 담당자, 이전/새 팀, 이관 수행자, 사유(선택 200자), 시각. RLS는 `weekly_log_change_history`와 동일하게 **SELECT 정책만** 두고 쓰기 정책은 만들지 않음(트리거 전용 기록 = 위조 불가)
  - [x] **DB — 이관여부 속성**: `weekly_logs.transfer_count`(int not null default 0)·`last_transferred_at`. 댓글수·반응수와 달리 2차 조회가 아니라 비정규화 컬럼으로 둔 이유는 목록 배지를 추가 쿼리 없이 그릴 수 있고, 아래 BEFORE 트리거가 값을 강제 동기화해 클라이언트가 위조할 수 없기 때문
  - [x] **DB — 트리거 2종**: `sync_weekly_log_transfer_columns()`(BEFORE UPDATE, `SECURITY INVOKER`) — 카운터 동기화 + "관리자만 이관" 최종 방어선(`auth.uid()`가 NULL이 아닌데 `is_admin()`이 아니면 예외, `prevent_unauthorized_role_change()`와 동일 관례) + 담당자 미변경 UPDATE에서 두 컬럼을 이전 값으로 강제 복원. `record_weekly_log_transfer()`(AFTER UPDATE OF author_id, `SECURITY DEFINER`) — 이력 행과 새 담당자 알림 생성
  - [x] **DB — 이관 진입점 RPC** `transfer_weekly_log(target_log_id, new_author_id, transfer_note)`: `SECURITY INVOKER`(UPDATE는 기존 RLS가 판정), 관리자 여부·대상 실존·대상 팀 보유·중복 이관·조직 범위(일반 관리자는 자기 부문, 슈퍼관리자는 전 부문)를 SQL에서 전부 검증. **검증을 서버 액션이 아니라 RPC에 둔 이유**는 PostgREST로 직접 호출될 수 있어 SQL이 최종 방어선이어야 하기 때문
  - [x] **DB — 알림 유형 `transfer` 추가**(총 5종). 유형별 on/off 게이트를 두지 않은 유일한 유형(업무 배정은 "직접 전달"이라 놓치면 안 된다는 판단, 프로필 알림 설정 캡션에 명시)
  - [x] **이관 시 `department_id`도 함께 이동** — 이 앱의 쓰기 RLS가 전부 팀 기준이라 담당자만 바꾸면 새 담당자가 자기 업무를 수정조차 못 하기 때문. 이 설계 결정이 이번 Task의 핵심
  - [x] **이관 사유 전달 방식** — 이력을 "트리거 전용 기록"으로 유지하면서 사유까지 담기 위해, RPC 본문에서 `set_config(..., true)`로 트랜잭션 로컬 GUC에 넣고 AFTER 트리거가 `current_setting(..., true)`로 읽는다. supabase-js에서 `set_config`를 따로 호출하는 방식은 PostgREST 호출마다 트랜잭션이 달라 동작하지 않는다(설계 시 배제)
  - [x] **앱 — 서버 액션·조회**: `lib/actions/weekly-log-transfer.ts`, `lib/queries/weekly-log-transfers.ts`(사람 신원은 `get_profile_identities` RPC 배치 조회, 팀 이름은 FK 힌트 embed)
  - [x] **앱 — UI**: 상세 페이지 담당자 줄(아바타 + 이름)과 관리자 전용 "이관" 버튼, 검색형 이관 다이얼로그(`ProfileSearchPicker` 재사용 — 부문장/부서장 지정과 동일한 `search_mentionable_profiles` + 200ms debounce), 제목 옆 "이관 N회" 배지, 접이식 "이관 이력" 섹션, 목록 테이블·카드의 "이관 N" 배지
  - [x] **상세 페이지 담당자 표시 정정** — 기존에는 `profiles:profiles(email)` embed로 작성자 이메일을 가져왔는데 `profiles_select_own_or_admin` RLS 때문에 일반 사용자에게는 **항상 null**이라 담당자 줄이 통째로 사라지고 있었다. 목록 화면과 동일하게 `get_profile_identities` RPC로 교체해 이름·아바타까지 정상 노출
  - **관련 파일**: `lib/actions/weekly-log-transfer.ts`(신규), `lib/queries/weekly-log-transfers.ts`(신규), `components/weekly-log-transfer-{dialog,history,badge}.tsx`(신규), `components/weekly-log-detail-view.tsx`, `components/weekly-log-{table,card}.tsx`, `components/notification-preferences-field.tsx`, `app/protected/weekly-logs/[id]/page.tsx`, `lib/queries/weekly-logs.ts`, `lib/types/index.ts`, `lib/format.ts`, `lib/supabase/database.types.ts`, `CLAUDE.md`
  - **마이그레이션**: `add_weekly_log_transfer`, `fix_weekly_log_transfer_function_grants`, `fix_weekly_log_transfer_feature_id_comments`(전부 Supabase MCP `apply_migration` 적용이라 로컬 `supabase/migrations/`에는 없음)
  - **수락 기준**: 관리자 이상만 이관할 수 있고, 대상자를 검색해 선택할 수 있으며, 이관이 여러 번 가능하고, 모든 이관 기록이 남아 화면에 표시된다. **충족 확인.**
  - **테스트 결과** (Supabase MCP로 실 DB에서 트랜잭션 후 전량 롤백하는 방식으로 권한 분기 검증 — 이 프로젝트에는 일반 관리자·일반 사용자 계정이 없어(팀이 배정된 프로필 5개가 모두 superadmin) 역할·소속을 트랜잭션 안에서 임시 변경해 시나리오를 구성):
    - [x] 관리자 이관 — `transfer_count` 0→1, 이력 1건(사유 공백 trim 적용), 새 담당자 알림 1건, `weekly_logs.department_id`가 새 담당자의 팀과 일치
    - [x] 반복 이관 — 2회 연속 이관 시 `transfer_count`가 2로 누적
    - [x] 같은 담당자에게 재이관 — "이미 이 사용자가 담당자입니다."로 차단
    - [x] 일반 사용자 RPC 호출 — "권한이 없습니다: 진행업무 이관은 관리자만 할 수 있습니다."로 차단
    - [x] 일반 사용자가 RPC를 우회해 같은 팀 업무의 `author_id`를 직접 UPDATE — BEFORE 트리거가 동일 메시지로 차단
    - [x] 일반 사용자의 `transfer_count` 위조 UPDATE — 트리거가 이전 값(0)으로 되돌림
    - [x] 일반 사용자의 `weekly_log_transfers` 직접 INSERT — RLS 위반으로 차단
    - [x] 일반 관리자가 타 부문 대상에게 이관 — "권한이 없습니다: 소속 부문 밖의 진행업무 또는 담당자입니다."로 차단 / 같은 상황에서 슈퍼관리자는 허용
    - [x] `get_advisors`(security)로 함수 권한 확인 — `revoke ... from anon/authenticated`만으로는 PUBLIC(`=X`) grant가 남아 `anon`이 여전히 호출 가능함을 `proacl` 실측으로 발견해 `from public` 회수를 추가(후속 마이그레이션). 최종 `proacl`이 기존 `record_weekly_log_change_history()`(postgres/service_role만)와 동일함을 확인
    - [x] `npx tsc --noEmit` 에러 0건, `npm run lint` 신규 경고/에러 0건(기존 3개 에러는 `ui/carousel.tsx`/`ui/sidebar.tsx`/`hooks/use-mobile.ts` 사전 존재 항목), `npm run build` 성공
  - **범위 밖 유지**: ① **첨부파일 이동** — 스토리지 경로가 `{department_id}/...` 고정이고 파일 이동이 원자적이지 않아 이관을 단일 UPDATE로 유지하는 쪽을 택했다. 스토리지 SELECT는 버킷 전체 공개라 다운로드는 정상이고, 이관 전 첨부의 **삭제만** 이전 팀 구성원·관리자로 제한된다. ② **등록 시점 담당자 지정** — 위 배경의 판단에 따라 도입하지 않음. ③ **인증 계정 E2E 검증** — 실 로그인 세션이 필요한 브라우저 검증은 사용자 작업으로 남김(권한 분기는 위와 같이 DB 레벨에서 전량 검증)

- **Task 067: 변경 이력에 진척률 추가 및 추적 대상 표기 (F064)** ✅
  - **배경**: 사용자가 상세 페이지의 "변경 이력" 섹션이 어떤 기능인지 물었고, 설명 과정에서 **진척률이 추적 대상이 아니라는 점**과 **화면만 봐서는 무엇이 기록되는지 알 수 없다는 점**이 드러나 두 가지를 함께 요청했다.
  - [x] **DB — 진척률 추적 추가**: `weekly_log_change_history_field_check` CHECK 제약에 `'progress'` 추가, `record_weekly_log_change_history()`에 `progress` 분기 추가, **트리거의 `UPDATE OF` 컬럼 목록에도 `progress` 추가**(함수만 고치면 발화하지 않아 트리거를 `drop`/재생성). 값은 status·importance와 동일하게 원시값(0~100 정수)으로 저장하고 "%" 표기는 렌더링 시점에 입힌다
  - [x] **앱 — 타입/포맷**: `WeeklyLogChangeHistoryField` 유니온에 `progress` 추가, `CHANGE_HISTORY_FIELD_LABELS`에 "진척률" 라벨 추가, `formatChangeHistoryValue()`에 `progress` → `"45%"` 분기 추가
  - [x] **앱 — 추적 대상 표기**: 섹션 제목 옆에 "진행상태 · 업무타입 · 업무 중요도 · 진척률"을 작은 회색 문구로 노출. 문구는 새 상수 `CHANGE_HISTORY_TRACKED_FIELDS`를 라벨 맵으로 매핑해 만들므로 추적 대상이 바뀌면 자동으로 따라온다(하드코딩 아님)
  - [x] 제목 줄이 좁은 화면에서 2줄이 될 수 있어 트리거 버튼에 `h-auto`를 추가 — shadcn `Button`의 기본 size가 `h-9` 고정이라 그대로 두면 내용이 버튼 밖으로 넘친다
  - **관련 파일**: `lib/types/index.ts`, `lib/format.ts`, `components/weekly-log-change-history.tsx`, `CLAUDE.md`
  - **마이그레이션**: `add_progress_to_weekly_log_change_history`(Supabase MCP `apply_migration` 적용, 로컬 `supabase/migrations/`에는 없음)
  - **수락 기준**: 진척률을 바꾸면 변경 이력에 "진척률을 20% → 45%(으)로 변경"으로 남고, 섹션 제목만 봐도 어떤 항목이 기록되는지 알 수 있다. **충족 확인.**
  - **테스트 결과** (실 DB 트랜잭션 후 전량 롤백):
    - [x] 진척률 변경 시 `field='progress'` 이력 1건 기록(0 → 55)
    - [x] 같은 값으로 다시 저장하면 추가 기록 없음(`IS DISTINCT FROM` 가드 정상)
    - [x] `create or replace function`이 기존 ACL을 유지함을 `proacl` 실측 확인(`postgres`/`service_role`만 — `anon`/`authenticated` 회수 상태 그대로)
    - [x] `npx tsc --noEmit` 에러 0건, `npm run lint` 신규 경고/에러 0건
  - **범위 밖 유지**: 제목·본문·날짜 등 나머지 컬럼과 되돌리기(revert)는 기존 판단(F043)대로 계속 제외

- **Task 068: 목록 "작성자" 표기를 "담당자"로 변경 (F065)** ✅
  - **배경**: 이관(F063) 도입으로 업무의 현재 책임자와 최초 작성자가 달라질 수 있게 되면서, 목록 컬럼명 "작성자"가 실제로 표시하는 값(현재 담당자)과 어긋나게 됐다는 사용자 지적. 표시되는 값 자체(`author_id` 기준 아바타 + 이름)는 이관 시 함께 갱신되므로 이미 "현재 담당자"였고, 라벨만 실제 의미를 따라가지 못하던 상태였다
  - [x] 목록 테이블 정렬 헤더 `label="작성자"` → `"담당자"`
  - [x] 활성 필터 배지 `"작성자: 나"` → `"담당자: 나"` 3곳(목록·칸반·타임라인) — 세 화면이 같은 필터 축(`author`)을 공유해 한 곳만 바꾸면 화면마다 다른 말이 된다
  - [x] 타임라인 뷰의 스크린리더용 대체 테이블 헤더와 막대 `aria-label`의 "작성자" 표기도 함께 변경 — 시각 정보와 보조기술 정보가 어긋나지 않게
  - [x] **코드 식별자는 전혀 변경하지 않음** — 정렬 키 `author_name`, PostgREST 계산 필드 `author_sort_name`, prop `showAuthor`, 컬럼 `author_id`, 필터 파라미터 `author` 모두 그대로. F061(주간업무→진행업무)에서 확립한 "화면 텍스트만 바꾸고 코드 식별자·DB 스키마는 불변" 원칙을 그대로 따랐고, 그 의도를 `weekly-log-table.tsx` 주석에 남겼다
  - **관련 파일**: `components/weekly-log-{table,list-view,kanban-view,timeline-view}.tsx`, `CLAUDE.md`
  - **수락 기준**: 목록·칸반·타임라인 어디서도 "작성자" 표기가 남아있지 않고, 정렬·필터 동작은 회귀 없이 그대로다. **충족 확인.**
  - **테스트 결과**: 사용자 노출 문자열 전수 grep으로 잔존 "작성자" 표기 0건 확인(코드 주석 중 `author_sort_name` 등 코드 용어를 설명하는 것은 F061과 동일하게 범위 제외), `npx tsc --noEmit` 에러 0건, `npm run lint` 신규 경고/에러 0건, `npm run build` 성공. DB·쿼리 변경이 없어 정렬/필터 회귀 위험은 라벨 문자열에 한정된다
  - **범위 밖 유지**: PDF/Excel 다운로드는 애초에 작성자 컬럼이 없어 대상이 아니고(실측 확인), 상세 페이지는 이미 F063에서 "담당자"로 표기 중

- **Task 069: 문서 2차 동기화 — F063~F065 반영 및 PRD 화면 표기 리네임 (F062 후속)** ✅
  - **배경**: Task 066~068로 기능이 3건 추가된 뒤 사용자가 "CLAUDE.md·README·PRD·ROADMAP에 추가되어야 할 사항을 업데이트해달라"고 요청했다. 점검 결과 **PRD가 가장 많이 비어 있었고**(신규 테이블·컬럼·알림 유형이 전혀 반영되지 않음), 이어서 사용자 요청으로 **PRD 전체 화면 표기 리네임**까지 진행했다 — Task 064가 "`docs/` 전반은 Task 065에서 처리"로 넘겼으나 Task 065는 CLAUDE.md·README.md·푸터만 다뤄 PRD가 남아 있던 것을 이번에 마무리한 것이다
  - [x] `docs/prd/PRD.md`에 **`### 5. v3 기능` 절 신설**(F063~F065, 기존 v1·v2 표와 동일 형식). F061·F062는 표기·문서 작업이라 표에서 제외(F048~F060과 동일한 처리 기준), 기존 5절(제외 기능)은 6절로 번호 이동
  - [x] PRD **데이터 모델**에 `weekly_log_transfers` 테이블 절 신설, `weekly_logs`에 `transfer_count`/`last_transferred_at`과 이관 규칙 주석, `notifications.type`에 `transfer`(게이트 없는 유일한 유형 근거 포함), `weekly_log_change_history.field`에 `progress` 반영
  - [x] PRD **페이지별 상세**에 상세 페이지의 이관 버튼·이관 이력 섹션·변경 이력 4속성, 목록 페이지의 담당자 표기·이관 배지 반영. **제외 기능**에 첨부파일 경로 이동·등록 시점 담당자 지정·이관 요청/수락 절차 추가
  - [x] `README.md`에 담당자 이관 기능 항목 신설, 알림 2개 항목(이관 알림은 끌 수 없음)·변경 이력 4속성·필터 프리셋·목록 컬럼 표기 갱신, 마감 문단에 v3 요약 추가
  - [x] `CLAUDE.md` 프로젝트 개요에 v3 3건 요약 추가(나머지 절은 Task 066~068에서 이미 반영)
  - [x] **README 드리프트 2건 정정**(요청 범위 밖이지만 실측으로 발견): "내 업무" 위젯이 3분할로 적혀 있었으나 실제로는 예정·진행중·완료·지연 **4분할**(커밋 `1efa979`), 정보/쇼케이스 3종 설명이 옛 구현(카탈로그+외부링크, npm 버전 비교)으로 남아 있어 현재 구현(라이브 데모 10탭, 큐레이션 정적 목록)으로 정정
  - [x] **PRD 전체 화면 표기 리네임** — "주간업무일지"(103) → "진행업무", 접두사 없는 "업무일지"(13) → "진행업무", "주간업무"(2) → "진행업무". 문서 제목·페이지명·메뉴 구조 다이어그램·데이터 모델 설명까지 전부 적용해 잔존 0건. **DB 테이블(`weekly_logs`)·라우트·코드 식별자는 그대로**(F061 원칙)
  - [x] 일괄 치환 전에 **옛 표기를 의도적으로 쓰던 문장 3곳을 개별 처리** — ① F041의 도입 이유 `"주간"업무일지인데...`(제품명에 기댄 말장난이라 리네임 후 성립하지 않음) → "주 단위로 기록하는 업무인데...", ② 핵심 정보의 "주간 업무 진행 상황"(띄어쓰기 변형) → "업무 진행 상황", ③ 이번 Task에서 직접 추가했던 "나머지 서술은 리네임 이전 표기를 쓴다"는 안내 문구(리네임 완료로 거짓이 됨) → 삭제 후 "DB·라우트·식별자는 그대로"라는 설명으로 교체
  - **관련 파일**: `docs/prd/PRD.md`, `README.md`, `CLAUDE.md`, `docs/roadmap/ROADMAP_v3.md`
  - **수락 기준**: 네 문서 어디에도 F063~F065가 누락되지 않고, PRD에 "주간업무"/"업무일지" 표기가 남지 않는다. **충족 확인.**
  - **테스트 결과**: 치환 전후 카운트 실측(주간업무일지 103·업무일지 13·주간업무 2 → 잔존 0, "진행업무" 120건), 헤딩 구조·표 형식·`### 5.`/`### 6.` 번호 이동 결과를 grep으로 확인. 코드 변경이 없어 빌드·타입체크 영향 없음
  - [x] **`docs/guides/` 리네임(사용자 추가 요청)** — 전수 조사 결과 실제 대상은 `deployment-ops.md`의 스모크 테스트 항목 **1곳뿐**이었다(나머지 5개 가이드는 제품 표기를 쓰지 않고 아키텍처·코드 식별자만 다뤄 해당 없음). 같은 체크리스트가 v2에서 멈춰 있어 v3 기능 2건(이관·진척률 이력)의 스모크 항목도 함께 추가했다
  - **범위 밖 유지**: `docs/roadmap/ROADMAP_mvp.md`·`ROADMAP_v1.md`·`ROADMAP_V2.md` — **과거 시점의 개발 이력 기록**이라 당시 표기를 그대로 두는 편이 이력으로서 정확하다(PRD·가이드는 "현재 상태의 명세·운영 절차"라 최신 표기를 따라야 한다는 점에서 성격이 다름)

---

## 기능 ID 커버리지 매핑

| 기능 ID | 기능명 | 담당 Task |
|---------|--------|-----------|
| F061 | 화면 표기 리네임 (주간업무→진행업무) | Task 064 |
| F062 | 문서 동기화 (CLAUDE.md/README.md/푸터) | Task 065 |
| F063 | 진행업무 오너십 이관 | Task 066 |
| F064 | 변경 이력 진척률 추가·추적 대상 표기 | Task 067 |
| F065 | 목록 "작성자" 표기를 "담당자"로 변경 | Task 068 |
| F062(후속) | 문서 2차 동기화 · PRD 화면 표기 리네임 | Task 069 |

이전 F-번호(F001~F039는 MVP·v1, F040~F057은 v2, F058~F060은 v2 Phase 8)는 각각 `docs/roadmap/ROADMAP_mvp.md`, `docs/roadmap/ROADMAP_v1.md`, `docs/roadmap/ROADMAP_V2.md`를 참고.
