// Radix Select은 빈 문자열을 값으로 허용하지 않는다("" 은 선택 해제 표시로 예약됨). 폼에서
// "선택 안 함"(부서 없음, 장 미지정 등)을 표현할 때 공용으로 쓰는 sentinel — 서버 액션에서
// null로 변환한다.
export const NONE_SELECT_VALUE = "none";
