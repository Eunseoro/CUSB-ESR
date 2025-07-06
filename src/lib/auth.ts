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


export function isAdminAuthenticated(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some(cookie => cookie.trim().startsWith('admin_session=1'));
}


export function setAdminAuthenticated(authenticated: boolean): void {
  if (typeof document === 'undefined') return;
  if (!authenticated) {

    document.cookie = 'admin_session=; Max-Age=0; path=/;';
  }

  window.dispatchEvent(new CustomEvent('adminAuthChanged', { 
    detail: { isAuthenticated: authenticated } 
  }))
}


export function onAdminAuthChange(callback: (isAuthenticated: boolean) => void): () => void {
  const handleAuthChange = (event: CustomEvent) => {
    callback(event.detail.isAuthenticated)
  }
  window.addEventListener('adminAuthChanged', handleAuthChange as EventListener)
  return () => {
    window.removeEventListener('adminAuthChanged', handleAuthChange as EventListener)
  }
} 