<h1 align="center">부서별 주간업무일지 관리</h1>

<p align="center">
  부서원은 주간 업무를 기록·추적하고, 관리자는 전체 부서의 업무 현황을 한 곳에서 파악하는 웹 애플리케이션
</p>

<p align="center">
  <a href="#주요-기능"><strong>주요 기능</strong></a> ·
  <a href="#기술-스택"><strong>기술 스택</strong></a> ·
  <a href="#프로덕션"><strong>프로덕션</strong></a> ·
  <a href="#로컬-개발-환경-설정"><strong>로컬 개발 환경 설정</strong></a> ·
  <a href="#문서"><strong>문서</strong></a>
</p>
<br/>

## 주요 기능

- **주간업무일지 CRUD** — 시작일/목표종료일/업무명/업무 상세 내용(리치 텍스트 에디터, +예상 M/M·예상 금액·협력사, 모두 선택 입력)으로 업무를 기록·수정·삭제
- **첨부파일 업로드** — 작성/수정 화면에서 파일당 최대 5MB 첨부파일을 업로드(파일별 진행률 표시, 5MB 초과 시 즉시 거부), 상세 페이지에서 다운로드·삭제
- **진행상태 추적** — 예정/진행중/완료 3단계 상태 전환
- **부서 기반 접근 제어** — 조회는 로그인한 모든 사용자에게 부서 무관하게 공개, 쓰기(작성/수정/삭제/진행상태변경)는 작성자의 소속 부서 또는 관리자로 제한
- **검색·필터·페이지네이션** — 제목/내용 키워드 검색, 부서 필터(기본값은 일반 사용자는 자기 부서·관리자는 전체), 20건 단위 페이지네이션
- **PDF 리포팅** — 현재 조회 중인 목록을 표 형태 PDF로 다운로드(한글 폰트 임베딩)
- **인증** — 이메일/비밀번호 회원가입·로그인(가입 즉시 로그인) + 구글 OAuth 소셜 로그인
- **부서 선택 온보딩** — 로그인 직후 부서 미설정 시 다른 모든 보호 페이지 접근을 프로필 페이지로 유도
- **프로필 상세 정보** — 전화번호(숫자만 입력해도 `010-1234-5678` 형식으로 하이픈 자동 삽입)·프리셋 아바타(이모지 24종을 팝업 다이얼로그에서 택1)·자기소개(최대 500자) 입력을 프로필 화면과 회원가입 화면에서 지원, 선택한 아바타는 공통 헤더의 이메일 앞에도 표시
- **다크모드 토글 · 반응형 레이아웃**(데스크탑/태블릿/모바일)

기능별 상세 명세는 [`docs/PRD.md`](docs/PRD.md)를 참고하세요. 다음 단계로 계획 중인 고도화(v1) 기능 — 부서 관리·사용자 관리 UI, 주간업무일지 기간 범위 검색, 댓글·멘션, 실시간 알림, 통계 대시보드 — 는 아직 구현 전이며 [`docs/ROADMAP_v1.md`](docs/ROADMAP_v1.md)에서 계획을 확인할 수 있습니다.

## 기술 스택

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Supabase** — Auth(이메일/비밀번호 + 구글 OAuth), PostgreSQL(Row Level Security), Storage(첨부파일, 서명 URL 기반 업로드/다운로드), `@supabase/ssr` 쿠키 기반 세션
- **Tailwind CSS v4** + **shadcn/ui**(`new-york` 스타일), **next-themes** 다크모드
- **React Hook Form** + **Zod** 폼 검증
- **Tiptap** — 업무 상세 내용용 WYSIWYG 리치 텍스트 에디터, **DOMPurify**(`isomorphic-dompurify`)로 저장·렌더링 이중 sanitize
- **jsPDF** + **jspdf-autotable** — 클라이언트 사이드 PDF 생성

아키텍처와 관례에 대한 상세 가이드는 [`CLAUDE.md`](CLAUDE.md)와 [`docs/guides/`](docs/guides/)를 참고하세요.

## 프로덕션

<https://weekly-plan-02.vercel.app/>

## 로컬 개발 환경 설정

1. 이 저장소를 클론합니다.

   ```bash
   git clone <repository-url>
   cd weekly-plan-02
   npm install
   ```

2. [Supabase 프로젝트](https://database.new)를 생성하고 프로젝트 루트에 `.env.local`을 만들어 아래 두 값을 채웁니다.

   ```env
   NEXT_PUBLIC_SUPABASE_URL=[프로젝트 URL]
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[프로젝트 API publishable/anon 키]
   ```

   두 값은 [Supabase 프로젝트의 API 설정](https://supabase.com/dashboard/project/_?showConnect=true)에서 확인할 수 있습니다. 값이 없으면 `hasEnvVars`가 `false`가 되어 UI가 경고 모드로 폴백합니다.

3. 개발 서버를 실행합니다.

   ```bash
   npm run dev     # http://localhost:3000
   ```

### 자주 쓰는 명령어

```bash
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드
npm run start   # 프로덕션 서버 실행
npm run lint    # ESLint 검사
npx tsc --noEmit  # 타입 체크(별도 스크립트 없음)
```

DB 스키마 마이그레이션, RLS 정책, 관리자 계정 지정, 부서 seed 데이터 등 운영 관련 절차는 [`docs/guides/deployment-ops.md`](docs/guides/deployment-ops.md)에 정리되어 있습니다.

## 문서

- [`docs/PRD.md`](docs/PRD.md) — 기능 명세, 사용자 여정, 데이터 모델(MVP + v1 고도화 계획 포함)
- [`docs/roadmap/ROADMAP_mvp.md`](docs/roadmap/ROADMAP_mvp.md) — MVP 개발 이력과 진행 상황(완료)
- [`docs/ROADMAP_v1.md`](docs/ROADMAP_v1.md) — v1 고도화 개발 계획(진행 예정)
- [`docs/guides/`](docs/guides/) — 아키텍처·스타일·폼 처리·배포 운영 상세 가이드
- [`CLAUDE.md`](CLAUDE.md) — Claude Code로 이 저장소를 다룰 때의 아키텍처 관례
