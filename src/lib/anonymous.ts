// 이 파일은 익명 사용자 ID 관리를 위한 유틸리티 함수들입니다.

const ANONYMOUS_ID_KEY = 'anonymous_user_id'


export function generateAnonymousId(): string {
  return 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36)
}


export function getAnonymousId(): string {
  if (typeof window === 'undefined') return ''
  
  let anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY)
  
  if (!anonymousId) {
    anonymousId = generateAnonymousId()
    localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId)
  }
  
  return anonymousId
}


export function clearAnonymousId(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ANONYMOUS_ID_KEY)
} 