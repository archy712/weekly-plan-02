// 랜딩 히어로 뒤에 깔리는 장식 배경 — 격자 패턴 + 은은한 컬러 글로우.
// 순수 장식이므로 aria-hidden으로 접근성 트리에서 제외하고, 포인터 이벤트도 받지 않는다.
//
// 배치 규칙: 부모(히어로 section)는 반드시 `relative`여야 하며, 이 컴포넌트는
// max-w-6xl 본문 컨테이너를 넘어 화면 끝까지 번지도록 `left-1/2 -translate-x-1/2 w-screen`
// 으로 full-bleed 처리한다(overflow-x 스크롤을 막기 위해 부모 쪽에서 overflow-hidden 필요).
//
// 색은 새 토큰을 만들지 않고 기존 --chart-* / --primary 변수만 사용한다
// (CLAUDE.md "스타일링" 절: 새 색상 토큰은 globals.css와 tailwind.config.ts를 함께
// 고쳐야 하므로, 장식 목적이라면 기존 토큰 재사용을 우선한다).
export function LandingHeroBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[820px] w-screen -translate-x-1/2 overflow-hidden"
    >
      {/* 격자 패턴: 1px 라인을 56px 간격으로 반복하고, 위쪽 중앙에서 퍼지는 타원 마스크로
          가장자리를 자연스럽게 사라지게 한다(마스크가 없으면 화면 전체가 모눈종이처럼 보임). */}
      <div
        className="absolute inset-0 opacity-70 dark:opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 65% 55% at 50% 0%, #000 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 65% 55% at 50% 0%, #000 30%, transparent 75%)",
        }}
      />
      {/* 컬러 블롭 2개: 큰 blur로 뭉갠 원. 테마가 무채색(primary=검정/흰색)이라
          색은 차트 토큰에서 아주 낮은 불투명도로만 빌려 쓴다. */}
      <div
        className="absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-[70%] rounded-full opacity-[0.18] blur-3xl dark:opacity-25"
        style={{ backgroundColor: "hsl(var(--chart-2))" }}
      />
      <div
        className="absolute -top-56 left-1/2 h-[520px] w-[680px] -translate-x-[10%] rounded-full opacity-[0.16] blur-3xl dark:opacity-20"
        style={{ backgroundColor: "hsl(var(--chart-1))" }}
      />
      {/* 하단 페이드: 배경이 본문 영역으로 그대로 이어지지 않도록 배경색으로 덮어 끝낸다. */}
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
