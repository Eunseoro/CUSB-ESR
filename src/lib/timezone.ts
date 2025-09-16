// 한국 시간대(Asia/Seoul) 관련 유틸리티 함수들

/**
 * 현재 한국 시간을 반환합니다.
 * @returns 한국 시간대의 현재 Date 객체
 */
export function getKoreanTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
}

/**
 * 한국 시간대 기준으로 오늘 날짜(15:00:00 기준)를 반환합니다.
 * 15시 이전이면 전날, 15시 이후면 당일로 집계합니다.
 * @returns 한국 시간대 기준 오늘 날짜 (15시 기준)
 */
export function getKoreanTodayDate(): Date {
  const koreanTime = getKoreanTime()
  const hour = koreanTime.getHours()
  
  // 15시 이전이면 전날로 집계
  if (hour < 15) {
    const yesterday = new Date(koreanTime)
    yesterday.setDate(yesterday.getDate() - 1)
    return new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
  }
  
  // 15시 이후면 당일로 집계
  return new Date(koreanTime.getFullYear(), koreanTime.getMonth(), koreanTime.getDate())
}

/**
 * 한국 시간대 기준으로 이번 주 시작 날짜(일요일 15:00:00 기준)를 반환합니다.
 * @returns 한국 시간대 기준 이번 주 시작 날짜
 */
export function getKoreanWeekStartDate(): Date {
  const today = getKoreanTodayDate() // 15시 기준 오늘 날짜 사용
  const day = today.getDay()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - day)
}

/**
 * 한국 시간대 기준으로 이번 달 시작 날짜(1일 15:00:00 기준)를 반환합니다.
 * @returns 한국 시간대 기준 이번 달 시작 날짜
 */
export function getKoreanMonthStartDate(): Date {
  const today = getKoreanTodayDate() // 15시 기준 오늘 날짜 사용
  return new Date(today.getFullYear(), today.getMonth(), 1)
}

/**
 * 한국 시간대 기준으로 날짜를 포맷팅합니다.
 * @param date 포맷팅할 날짜
 * @param options 포맷팅 옵션
 * @returns 포맷팅된 날짜 문자열
 */
export function formatKoreanDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    ...options
  })
}

/**
 * 한국 시간대 기준으로 현재 시간을 포맷팅합니다.
 * @param options 포맷팅 옵션
 * @returns 포맷팅된 시간 문자열
 */
export function formatKoreanTime(options?: Intl.DateTimeFormatOptions): string {
  return new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    ...options
  })
}

