// 이 파일은 관리자 인증을 위한 유틸리티 함수들입니다.

// 관리자 비밀번호 확인
export function verifyAdminPassword(password: string): boolean {
  // 한국어 주석: 반드시 환경변수 ADMIN_PASSWORD만 사용하며, 없으면 인증 실패
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return password === adminPassword;
}

// 관리자 세션 키
export const ADMIN_SESSION_KEY = 'admin_authenticated'

// 관리자 인증 상태 확인 (쿠키 기반)
export function isAdminAuthenticated(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some(cookie => cookie.trim().startsWith('admin_session=1'));
}

// 관리자 인증 설정 (쿠키 삭제만 담당)
export function setAdminAuthenticated(authenticated: boolean): void {
  if (typeof document === 'undefined') return;
  if (!authenticated) {
    // 로그아웃 시 쿠키 삭제
    document.cookie = 'admin_session=; Max-Age=0; path=/;';
  }
  // 인증 상태 변경 이벤트 발생 (로그아웃 시에만)
  window.dispatchEvent(new CustomEvent('adminAuthChanged', { 
    detail: { isAuthenticated: authenticated } 
  }))
}

// 관리자 인증 상태 변경 이벤트 리스너 등록 (이벤트는 유지)
export function onAdminAuthChange(callback: (isAuthenticated: boolean) => void): () => void {
  const handleAuthChange = (event: CustomEvent) => {
    callback(event.detail.isAuthenticated)
  }
  window.addEventListener('adminAuthChanged', handleAuthChange as EventListener)
  return () => {
    window.removeEventListener('adminAuthChanged', handleAuthChange as EventListener)
  }
} 