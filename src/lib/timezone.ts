// 한국 시간대(Asia/Seoul) 관련 유틸리티 함수들

/**
 * 현재 한국 시간을 반환합니다.
 * @returns 한국 시간대의 현재 Date 객체
 */
export function getKoreanTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
}

/**
 * 한국 시간대 기준으로 오늘 날짜(00:00:00)를 반환합니다.
 * @returns 한국 시간대 기준 오늘 날짜
 */
export function getKoreanTodayDate(): Date {
  const koreanTime = getKoreanTime()
  return new Date(koreanTime.getFullYear(), koreanTime.getMonth(), koreanTime.getDate())
}

/**
 * 한국 시간대 기준으로 이번 주 시작 날짜(일요일 00:00:00)를 반환합니다.
 * @returns 한국 시간대 기준 이번 주 시작 날짜
 */
export function getKoreanWeekStartDate(): Date {
  const koreanTime = getKoreanTime()
  const day = koreanTime.getDay()
  return new Date(koreanTime.getFullYear(), koreanTime.getMonth(), koreanTime.getDate() - day)
}

/**
 * 한국 시간대 기준으로 이번 달 시작 날짜(1일 00:00:00)를 반환합니다.
 * @returns 한국 시간대 기준 이번 달 시작 날짜
 */
export function getKoreanMonthStartDate(): Date {
  const koreanTime = getKoreanTime()
  return new Date(koreanTime.getFullYear(), koreanTime.getMonth(), 1)
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

