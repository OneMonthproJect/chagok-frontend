// S-02 문구 (09 S-02·5장, 디자인 v3.0 Home-Core-TodayList). 화면 없이 테스트하도록 순수 함수.

/** 카드 제목: 오늘이면 "오늘 예약", 다른 날은 "예약 목록" */
export function listTitle(date: string, today: string): string {
  return date === today ? '오늘 예약' : '예약 목록'
}

/** 빈 목록 문구 (09 5장) */
export function emptyDayMessage(date: string, today: string): string {
  return date === today ? '오늘 예약이 없습니다.' : '이 날 예약이 없습니다.'
}
